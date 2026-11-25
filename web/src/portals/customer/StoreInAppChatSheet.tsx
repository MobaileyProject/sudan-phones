import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  CheckCheck,
  Clock,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Smartphone,
  UserRound,
  X,
} from 'lucide-react';
import { Listing, Store } from '../../types';
import {
  formatCity,
  formatCondition,
  formatListingTitle,
  formatSdg,
  tText,
} from '../../i18n/translations';
import { api, ApiStoreChatMessage } from '../../api/client';
import { usePrototype } from '../../store/PrototypeContext';
import { SafeImage } from '../../components/DesignSystem';

const LOCAL_THREAD_PREFIX = 'sp_store_chat_v1_';

function readLocalThread(storeId: string): ApiStoreChatMessage[] {
  try {
    const raw = window.localStorage.getItem(`${LOCAL_THREAD_PREFIX}${storeId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalThread(storeId: string, messages: ApiStoreChatMessage[]) {
  try {
    window.localStorage.setItem(`${LOCAL_THREAD_PREFIX}${storeId}`, JSON.stringify(messages.slice(-50)));
  } catch {
    // ignore storage quota errors
  }
}

function formatMessageTime(iso: string, lang: 'ar' | 'en'): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(lang === 'ar' ? 'ar-SD' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * In-App Direct Store Chat Bottom Sheet
 * Lets customers message a verified store directly inside Sudan Phones,
 * with optional listing context when opened from a product page.
 */
export function StoreInAppChatSheet({
  listing,
  store,
  onClose,
  onSwitchToExternalContact,
}: {
  listing: Listing | null;
  store: Store | null;
  onClose: () => void;
  onSwitchToExternalContact?: (listing: Listing | null, store: Store) => void;
}) {
  const { lang, me, session, recordContactClick, pushToast } = usePrototype();
  const [messages, setMessages] = useState<ApiStoreChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [showContactFields, setShowContactFields] = useState(false);
  const [attachedListing, setAttachedListing] = useState<Listing | null>(listing);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const hasCountedLeadRef = useRef(false);

  useEffect(() => {
    setAttachedListing(listing);
    hasCountedLeadRef.current = false;
  }, [listing, store?.id]);

  useEffect(() => {
    if (me) {
      setSenderName(me.name || '');
      setSenderPhone(me.phone || '');
    }
  }, [me]);

  useEffect(() => {
    if (!store) return;
    let active = true;
    const cached = readLocalThread(store.id);
    setMessages(cached);
    setLoading(true);
    api
      .getStoreMessages(store.id)
      .then((res) => {
        if (!active) return;
        const remote = res.data || [];
        if (remote.length > 0 || cached.length === 0) {
          setMessages(remote);
          writeLocalThread(store.id, remote);
        }
      })
      .catch(() => {
        // Keep local cache when offline
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [store?.id]);

  useEffect(() => {
    if (!store) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store, onClose]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  if (!store) return null;

  const listingTitle = attachedListing
    ? `${formatListingTitle(attachedListing.arabicBrandPrefix, attachedListing.model, lang)} · ${attachedListing.storageGb} GB`
    : '';

  const quickPrompts = attachedListing
    ? lang === 'ar'
      ? [
          'السلام عليكم، هل هذا الجهاز متوفر حالياً؟',
          'هل السعر قابل للتفاوض عند المعاينة؟',
          ...(attachedListing.acceptsTradeIn || store.acceptsTradeIn
            ? ['هل تقبلون الاستبدال (Trade-In) لهذا الجهاز؟']
            : []),
          'ما هي تفاصيل الضمان وساعات عمل المتجر؟',
        ]
      : [
          'Hello, is this phone still available?',
          'Is the price negotiable upon inspection?',
          ...(attachedListing.acceptsTradeIn || store.acceptsTradeIn
            ? ['Do you accept trade-in for this phone?']
            : []),
          'What warranty details and store hours apply?',
        ]
    : lang === 'ar'
      ? [
          'السلام عليكم، ما هي الهواتف المتوفرة لديكم حالياً؟',
          'هل يتوفر لديكم أجهزة جديدة مختومة بضمان؟',
          ...(store.acceptsTradeIn ? ['هل يقبل المتجر استبدال الهواتف المستعملة؟'] : []),
          'أين يقع المتجر بالتحديد وما ساعات العمل؟',
        ]
      : [
          'Hello, what phones do you currently have in stock?',
          'Do you carry factory-sealed phones with warranty?',
          ...(store.acceptsTradeIn ? ['Do you accept phone trade-ins?'] : []),
          'Where is the store located and what are your hours?',
        ];

  const handleSend = async (overrideText?: string) => {
    const content = (overrideText ?? draft).trim();
    if (!content || sending) return;

    setSending(true);
    if (!overrideText) setDraft('');

    const optimistic: ApiStoreChatMessage = {
      id: `local-${Date.now()}`,
      store_id: Number(store.id) || 0,
      sender_role: 'customer',
      sender_name: senderName.trim() || undefined,
      sender_phone: senderPhone.trim() || undefined,
      text: content,
      listing_id: attachedListing ? Number(attachedListing.id) : null,
      listing_title: attachedListing ? listingTitle : undefined,
      listing_price_sdg: attachedListing ? attachedListing.priceSdg : undefined,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => {
      const next = [...prev, optimistic];
      writeLocalThread(store.id, next);
      return next;
    });

    if (attachedListing && !hasCountedLeadRef.current) {
      recordContactClick(attachedListing.id, store.id);
      hasCountedLeadRef.current = true;
    }

    try {
      const res = await api.sendStoreMessage(
        store.id,
        {
          text: content,
          sender_name: senderName.trim() || undefined,
          sender_phone: senderPhone.trim() || undefined,
          listing_id: attachedListing ? Number(attachedListing.id) : null,
          listing_title: attachedListing ? listingTitle : undefined,
          listing_price_sdg: attachedListing ? attachedListing.priceSdg : undefined,
        },
        lang
      );
      const updated = res.data?.messages || [];
      if (updated.length > 0) {
        setMessages(updated);
        writeLocalThread(store.id, updated);
      }
      setAttachedListing(null);
    } catch {
      pushToast('info', {
        ar: 'تم حفظ رسالتك محلياً وسيتم إرسالها للمتجر عند توفر الاتصال.',
        en: 'Message saved locally — will sync with the store once connected.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-[#15281E]/40 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'ar' ? 'المراسلة داخل التطبيق مع المتجر' : 'In-app chat with store'}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0.75 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="store-clay clay-sheet text-[#172B20] rounded-t-[32px] h-[90%] flex flex-col overflow-hidden"
      >
        <div className="w-10 h-1.5 bg-[#C5D5CC] rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Chat Header */}
        <div className="flex items-start justify-between gap-2.5 px-4 py-3 border-b border-[#172B20]/[0.06] shrink-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-[15px] clay-primary-btn flex items-center justify-center shrink-0">
              <MessageSquare className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#172B20] truncate">
                  {tText(store.name, lang)}
                </h3>
                <ShieldCheck className="w-4 h-4 text-[#2D6145] shrink-0" />
              </div>
              <p className="text-[11px] text-[#5D7568] truncate mt-0.5 flex items-center gap-1.5">
                <span>{formatCity(store.city, lang)}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#245A3D] font-semibold">
                  {lang === 'ar' ? 'تواصل مباشر داخل التطبيق' : 'Direct in-app messaging'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onSwitchToExternalContact && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToExternalContact(listing, store);
                }}
                aria-label={lang === 'ar' ? 'واتساب أو اتصال' : 'WhatsApp or Call'}
                title={lang === 'ar' ? 'واتساب أو اتصال' : 'WhatsApp or Call'}
                className="clay-pill clay-focus-ring w-9 h-9 rounded-full flex items-center justify-center text-[#245A3D]"
              >
                <Phone className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
              className="clay-pill clay-focus-ring w-9 h-9 rounded-full flex items-center justify-center text-[#3D574A]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Attached Listing Context Banner (when opened from a product page) */}
        {attachedListing && (
          <div className="px-4 pt-2.5 pb-1 shrink-0">
            <div className="clay-card-tint rounded-[20px] p-2.5 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 rounded-[13px] overflow-hidden shrink-0">
                  <SafeImage
                    clay
                    src={attachedListing.photos[0]?.url}
                    alt={attachedListing.model}
                    aspectClass="w-full h-full"
                    label={attachedListing.model}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-bold text-[#163926] truncate">
                    {listingTitle}
                  </p>
                  <p className="text-[11px] text-[#2D543E] font-mono-num font-bold mt-0.5">
                    {formatSdg(attachedListing.priceSdg, lang)} ·{' '}
                    <span className="font-sans font-semibold">
                      {formatCondition(attachedListing.condition, lang)}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedListing(null)}
                aria-label={lang === 'ar' ? 'إزالة الإعلان المرفق' : 'Remove attached phone'}
                className="w-7 h-7 rounded-full clay-pill flex items-center justify-center text-[#4E6659] shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Optional Guest Callback Info Strip */}
        {!session.authenticated && (
          <div className="px-4 pt-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowContactFields((v) => !v)}
              className="w-full clay-inset rounded-[16px] px-3 py-2 flex items-center justify-between text-[11px] text-[#4E6659]"
            >
              <span className="inline-flex items-center gap-1.5 font-semibold truncate">
                <UserRound className="w-3.5 h-3.5 text-[#2D6145] shrink-0" />
                {senderName || senderPhone
                  ? `${senderName || (lang === 'ar' ? 'ضيف' : 'Guest')}${senderPhone ? ` · ${senderPhone}` : ''}`
                  : lang === 'ar'
                    ? 'إضافة اسمك أو رقمك ليرد عليك المتجر (اختياري)'
                    : 'Add your name or phone for store follow-up (optional)'}
              </span>
              <span className="text-[#245A3D] font-bold shrink-0 ms-2">
                {showContactFields
                  ? lang === 'ar'
                    ? 'إخفاء'
                    : 'Hide'
                  : lang === 'ar'
                    ? 'تعديل'
                    : 'Add'}
              </span>
            </button>
            {showContactFields && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder={lang === 'ar' ? 'اسمك (اختياري)' : 'Your name'}
                  className="h-9 px-3 rounded-[14px] clay-inset text-xs text-[#172B20] placeholder:text-[#7A9084] focus:outline-none"
                />
                <input
                  type="tel"
                  dir="ltr"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="+249 9..."
                  className="h-9 px-3 rounded-[14px] clay-inset text-xs font-mono-num text-[#172B20] placeholder:text-[#7A9084] focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Messages Timeline */}
        <div className="flex-1 overflow-y-auto thin-scroll px-4 py-3.5 space-y-3">
          {/* Store Opening Info Pill */}
          <div className="flex justify-center">
            <div className="clay-inset rounded-full px-3 py-1 text-[10.5px] text-[#5D7568] inline-flex items-center gap-1.5 max-w-full">
              <Clock className="w-3 h-3 text-[#2D6145] shrink-0" />
              <span className="truncate">{tText(store.openingHours, lang)}</span>
            </div>
          </div>

          {messages.length === 0 && !loading && (
            <div className="clay-card rounded-[24px] p-4 text-center space-y-2 my-2">
              <div className="w-11 h-11 rounded-[16px] clay-pill-active text-[#1F5337] flex items-center justify-center mx-auto">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-[#172B20]">
                {lang === 'ar'
                  ? `ابدأ محادثة مباشرة مع ${tText(store.name, 'ar')}`
                  : `Start a direct chat with ${tText(store.name, 'en')}`}
              </p>
              <p className="text-[11px] text-[#5E7669] leading-relaxed">
                {lang === 'ar'
                  ? 'اسأل عن التوفر أو الضمان أو الاستبدال داخل التطبيق دون الحاجة لمغادرة سودان فونز.'
                  : 'Ask about availability, warranty, or trade-in right inside Sudan Phones.'}
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isCustomer = msg.sender_role === 'customer';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-[22px] px-3.5 py-2.5 space-y-1.5 ${
                    isCustomer
                      ? 'bg-[#23573A] text-white rounded-ee-[8px] shadow-[0_8px_18px_-8px_rgba(23,59,39,0.45)]'
                      : 'clay-card text-[#172B20] rounded-es-[8px]'
                  }`}
                >
                  {msg.listing_title && (
                    <div
                      className={`rounded-[14px] px-2.5 py-1.5 text-[10.5px] flex items-center gap-2 ${
                        isCustomer
                          ? 'bg-white/14 text-white/95'
                          : 'clay-inset text-[#245A3D]'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold truncate">{msg.listing_title}</p>
                        {msg.listing_price_sdg != null && (
                          <p className="font-mono-num opacity-90">
                            {formatSdg(msg.listing_price_sdg, lang)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>

                  <div
                    className={`flex items-center justify-end gap-1 text-[10px] ${
                      isCustomer ? 'text-white/75' : 'text-[#6A8275]'
                    }`}
                  >
                    {msg.is_auto_reply && (
                      <span className="me-auto font-semibold text-[#245A3D]">
                        {lang === 'ar' ? 'رد تلقائي من المتجر' : 'Store auto-reply'}
                      </span>
                    )}
                    <span dir="ltr" className="font-mono-num">
                      {formatMessageTime(msg.created_at, lang)}
                    </span>
                    {isCustomer &&
                      (msg.id.startsWith('local-') ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <CheckCheck className="w-3 h-3" />
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollEndRef} />
        </div>

        {/* Quick Inquiry Suggestion Chips */}
        <div className="px-4 pt-1 pb-2 flex items-center gap-2 overflow-x-auto thin-scroll shrink-0">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={sending}
              onClick={() => handleSend(prompt)}
              className="clay-pill clay-focus-ring h-8 px-3 rounded-full text-[11px] font-semibold text-[#1E4A32] whitespace-nowrap shrink-0 hover:text-[#143724] disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Composer Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="px-3.5 py-3 border-t border-[#172B20]/[0.06] bg-[#EDF3EF]/95 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'اكتب رسالتك للمتجر هنا...'
                : 'Type your message to the store...'
            }
            className="flex-1 h-11 px-4 rounded-full clay-inset text-xs text-[#172B20] placeholder:text-[#7A9084] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label={lang === 'ar' ? 'إرسال الرسالة' : 'Send message'}
            className="clay-primary-btn clay-focus-ring w-11 h-11 rounded-full flex items-center justify-center shrink-0 disabled:opacity-45"
          >
            <Send className={`w-4 h-4 ${lang === 'ar' ? '-scale-x-100' : ''}`} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
