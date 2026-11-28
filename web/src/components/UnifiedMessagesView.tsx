import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  Smartphone,
} from 'lucide-react';
import { api, ApiStoreChatMessage } from '../api/client';
import { formatSdg } from '../i18n/translations';
import { usePrototype } from '../store/PrototypeContext';

export interface UnifiedChatThread {
  thread_key: string;
  store_id: number;
  store_name?: string;
  store_phone?: string;
  customer_name: string;
  customer_phone: string;
  listing_id?: number | null;
  listing_title?: string;
  listing_price_sdg?: number;
  unread_count: number;
  last_message_at: string;
  last_message_text: string;
  messages: ApiStoreChatMessage[];
}

function formatTime(iso: string, lang: 'ar' | 'en'): string {
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

function getInitial(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return '؟';
  return cleaned[0].toUpperCase();
}

export function UnifiedMessagesView({
  mode,
  initialThreadKey,
  onInitialThreadConsumed,
  onUnreadCountChange,
  onNotificationsChanged,
  embeddedInCustomerApp = false,
}: {
  mode: 'merchant' | 'buyer';
  initialThreadKey?: string | null;
  onInitialThreadConsumed?: () => void;
  onUnreadCountChange?: (totalUnread: number) => void;
  onNotificationsChanged?: () => void;
  embeddedInCustomerApp?: boolean;
}) {
  const { lang, pushToast } = usePrototype();
  const [threads, setThreads] = useState<UnifiedChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const onUnreadCountChangeRef = useRef(onUnreadCountChange);
  onUnreadCountChangeRef.current = onUnreadCountChange;
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const totalUnread = threads.reduce((acc, t) => acc + (t.unread_count || 0), 0);
    onUnreadCountChangeRef.current?.(totalUnread);
  }, [threads]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      const res =
        mode === 'merchant' ? await api.getMyStoreChats() : await api.getMyBuyerChats();
      const list = res.data || [];
      hasLoadedRef.current = true;
      setThreads(list);
    } catch {
      // Keep existing threads if transient error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, [mode]);

  // If opened directly from a notification, open that exact person's thread
  useEffect(() => {
    if (!initialThreadKey) return;
    if (threads.some((t) => t.thread_key === initialThreadKey)) {
      handleOpenThread(initialThreadKey);
      onInitialThreadConsumed?.();
    } else if (!loading) {
      // Try refreshing once in case a brand-new message arrived
      loadThreads().then(() => {
        setActiveKey(initialThreadKey);
        onInitialThreadConsumed?.();
      });
    }
  }, [initialThreadKey, threads.length, loading]);

  const activeThread = activeKey
    ? threads.find((t) => t.thread_key === activeKey) || null
    : null;

  useEffect(() => {
    if (activeThread) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThread?.messages.length, activeKey]);

  const handleOpenThread = async (threadKey: string) => {
    setActiveKey(threadKey);
    if (mode === 'merchant') {
      const target = threads.find((t) => t.thread_key === threadKey);
      if (target && target.unread_count > 0) {
        setThreads((prev) =>
          prev.map((t) =>
            t.thread_key === threadKey ? { ...t, unread_count: 0 } : t
          )
        );
        try {
          await api.markStoreChatRead(threadKey);
          onNotificationsChanged?.();
        } catch {
          // ignore
        }
      }
    }
  };

  const quickReplies =
    mode === 'merchant'
      ? lang === 'ar'
        ? [
            'أهلاً بك! الجهاز متوفر حالياً في الفرع ويمكنك المعاينة اليوم.',
            'نعم نقبل الاستبدال بعد فحص جهازك في المتجر.',
            'السعر نهائي ويشمل الضمان المعلن والفاتورة.',
          ]
        : [
            'Hello! This phone is currently in stock and ready for inspection.',
            'Yes, we accept trade-ins after inspecting your current device.',
            'The price includes our stated warranty and store receipt.',
          ]
      : [];

  const handleSend = async (overrideText?: string) => {
    if (!activeThread || sending) return;
    const text = (overrideText ?? replyDraft).trim();
    if (!text) return;
    setSending(true);
    if (!overrideText) setReplyDraft('');
    try {
      let updatedMsgs: ApiStoreChatMessage[] = [];
      if (mode === 'merchant') {
        const res = await api.replyToStoreChat(activeThread.thread_key, text);
        updatedMsgs = res.data?.messages || [];
      } else {
        const res = await api.sendStoreMessage(
          activeThread.store_id,
          {
            text,
            listing_id: activeThread.listing_id ?? undefined,
            listing_title: activeThread.listing_title,
            listing_price_sdg: activeThread.listing_price_sdg,
          },
          lang
        );
        updatedMsgs = res.data?.messages || [];
      }

      setThreads((prev) =>
        prev.map((t) =>
          t.thread_key === activeThread.thread_key
            ? {
                ...t,
                unread_count: 0,
                last_message_text: text,
                last_message_at: new Date().toISOString(),
                messages: updatedMsgs.length > 0 ? updatedMsgs : t.messages,
              }
            : t
        )
      );
      onNotificationsChanged?.();
    } catch (err: any) {
      pushToast('error', {
        ar: err?.message || 'تعذر إرسال الرسالة.',
        en: err?.message || 'Failed to send message.',
      });
    } finally {
      setSending(false);
    }
  };

  // =========================================================================
  // PAGE 2: FULL-SCREEN FOCUSED CHAT VIEW (ONLY THE CLICKED PERSON'S MESSAGES)
  // =========================================================================
  if (activeThread) {
    const peerName =
      mode === 'merchant'
        ? activeThread.customer_name
        : activeThread.store_name || activeThread.customer_name;
    const peerPhone =
      mode === 'merchant'
        ? activeThread.customer_phone
        : activeThread.store_phone || activeThread.customer_phone;

    return (
      <div
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-50 bg-[#EEF3F0] flex flex-col"
        role="region"
        aria-label={peerName}
      >
        <div className="w-full max-w-3xl mx-auto h-full flex flex-col bg-white sm:shadow-xl sm:border-x sm:border-slate-200 overflow-hidden">
          {/* Chat Header: Back button + Clicked Person ONLY */}
          <header className="shrink-0 bg-white border-b border-slate-200 px-3 py-2.5 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  setActiveKey(null);
                  setReplyDraft('');
                }}
                aria-label={lang === 'ar' ? 'العودة إلى الرسائل' : 'Back to messages'}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
              >
                {lang === 'ar' ? (
                  <ArrowRight className="w-5 h-5" />
                ) : (
                  <ArrowLeft className="w-5 h-5" />
                )}
              </button>
              <div className="w-10 h-10 rounded-full bg-[#0F6B5D]/12 text-[#0F6B5D] font-bold text-sm flex items-center justify-center shrink-0">
                {getInitial(peerName)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-slate-900 truncate leading-tight">
                  {peerName}
                </h2>
                {peerPhone && (
                  <p className="text-[11px] text-slate-500 tabular-nums truncate mt-0.5" dir="ltr">
                    {peerPhone}
                  </p>
                )}
              </div>
            </div>
            {peerPhone && (
              <a
                href={`tel:${peerPhone.replace(/\s+/g, '')}`}
                aria-label={lang === 'ar' ? 'اتصال مباشر' : 'Call'}
                className="h-9 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Phone className="w-3.5 h-3.5 text-[#0F6B5D]" />
                <span className="hidden sm:inline">
                  {lang === 'ar' ? 'اتصال' : 'Call'}
                </span>
              </a>
            )}
          </header>

          {/* Compact Listing Reference Strip (if tied to a phone listing) */}
          {activeThread.listing_title && (
            <div className="shrink-0 px-4 py-2 bg-[#F4F8F6] border-b border-slate-200/80 flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-slate-800 min-w-0 truncate">
                <Smartphone className="w-3.5 h-3.5 text-[#0F6B5D] shrink-0" />
                <span className="truncate">{activeThread.listing_title}</span>
              </span>
              {activeThread.listing_price_sdg ? (
                <span className="font-bold text-[#0F6B5D] tabular-nums whitespace-nowrap shrink-0">
                  {formatSdg(activeThread.listing_price_sdg, lang)}
                </span>
              ) : null}
            </div>
          )}

          {/* Scrollable Messages Area — ONLY this person's conversation */}
          <div className="flex-1 min-h-0 overflow-y-auto thin-scroll px-4 py-4 space-y-3 bg-[#F3F6F4]">
            {activeThread.messages.map((m) => {
              const isMine =
                mode === 'merchant' ? m.sender_role === 'store' : m.sender_role === 'customer';
              return (
                <div
                  key={m.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 space-y-1 text-[13px] leading-relaxed shadow-xs ${
                      isMine
                        ? 'bg-[#0F6B5D] text-white rounded-be-sm'
                        : 'bg-white border border-slate-200/80 text-slate-900 rounded-bs-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <div
                      className={`flex items-center justify-end gap-1.5 text-[10px] tabular-nums ${
                        isMine ? 'text-teal-100' : 'text-slate-400'
                      }`}
                    >
                      {m.is_auto_reply && (
                        <span>{lang === 'ar' ? 'رد تلقائي ·' : 'Auto-reply ·'}</span>
                      )}
                      <span>{formatTime(m.created_at, lang)}</span>
                      {isMine && <CheckCheck className="w-3 h-3 shrink-0" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {/* Fixed Bottom Composer (Properly constrained with min-w-0 so Send is NEVER clipped) */}
          <div className="shrink-0 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
            {quickReplies.length > 0 && (
              <div className="px-3 pt-2.5 pb-1 flex items-center gap-2 overflow-x-auto thin-scroll">
                {quickReplies.map((qr) => (
                  <button
                    key={qr}
                    type="button"
                    onClick={() => handleSend(qr)}
                    disabled={sending}
                    className="h-8 px-3 rounded-lg border border-slate-200 hover:border-[#0F6B5D] bg-slate-50 text-[11px] font-medium text-slate-700 whitespace-nowrap shrink-0"
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 flex items-center gap-2 w-full"
            >
              <input
                type="text"
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder={
                  mode === 'merchant'
                    ? lang === 'ar'
                      ? 'اكتب ردك للعميل...'
                      : 'Write your reply...'
                    : lang === 'ar'
                      ? 'اكتب رسالتك للمتجر...'
                      : 'Write a message...'
                }
                className="flex-1 min-w-0 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0F6B5D]"
              />
              <button
                type="submit"
                disabled={sending || !replyDraft.trim()}
                aria-label={lang === 'ar' ? 'إرسال' : 'Send'}
                className="h-11 px-4 rounded-xl bg-[#0F6B5D] hover:bg-[#0B5348] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-45 shrink-0 transition-colors"
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>{lang === 'ar' ? 'إرسال' : 'Send'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PAGE 1: CONVERSATIONS / PEOPLE LIST ONLY (NO CHAT BOX BELOW IT)
  // =========================================================================
  return (
    <div className={embeddedInCustomerApp ? 'space-y-3' : 'space-y-4 max-w-3xl mx-auto'}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#172B20]">
            {mode === 'merchant'
              ? lang === 'ar'
                ? 'رسائل العملاء'
                : 'Customer Messages'
              : lang === 'ar'
                ? 'الرسائل'
                : 'Messages'}
          </h2>
          <p className="text-xs text-[#5E7669] mt-0.5">
            {mode === 'merchant'
              ? lang === 'ar'
                ? 'اضغط على أي عميل لفتح محادثته والرد عليه.'
                : 'Tap any customer to open their conversation and reply.'
              : lang === 'ar'
                ? 'محادثاتك المباشرة مع المتاجر الموثّقة.'
                : 'Your direct conversations with verified stores.'}
          </p>
        </div>
        <button
          type="button"
          onClick={loadThreads}
          disabled={loading}
          aria-label={lang === 'ar' ? 'تحديث الرسائل' : 'Refresh messages'}
          className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      {loading && threads.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center text-xs text-slate-500">
          {lang === 'ar' ? 'جاري تحميل الرسائل...' : 'Loading messages...'}
        </div>
      ) : threads.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#0F6B5D]/10 text-[#0F6B5D] flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-900">
            {lang === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}
          </p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            {mode === 'merchant'
              ? lang === 'ar'
                ? 'عندما يراسل أحد العملاء متجرك سيظهر اسمه هنا ويصلك إشعار فوري.'
                : 'When a buyer messages your store, they will appear here with an instant notification.'
              : lang === 'ar'
                ? 'تواصل مع أي متجر من صفحة الهاتف أو المتجر وستظهر جميع محادثاتك هنا.'
                : 'Message any store from a phone listing or store page and your conversations will appear here.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-xs">
          {threads.map((t) => {
            const peerName =
              mode === 'merchant' ? t.customer_name : t.store_name || t.customer_name;
            const hasUnread = t.unread_count > 0;
            return (
              <button
                key={t.thread_key}
                type="button"
                onClick={() => handleOpenThread(t.thread_key)}
                className={`w-full px-4 py-3.5 text-start transition-colors flex items-center gap-3 hover:bg-slate-50 active:bg-slate-100/80 ${
                  hasUnread ? 'bg-[#0F6B5D]/[0.04]' : ''
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-[#0F6B5D]/12 text-[#0F6B5D] font-bold text-sm flex items-center justify-center shrink-0">
                  {getInitial(peerName)}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-bold text-slate-900 truncate">
                      {peerName}
                    </span>
                    <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                      {formatTime(t.last_message_at, lang)}
                    </span>
                  </div>
                  {t.listing_title && (
                    <p className="text-[11.5px] font-medium text-[#0F6B5D] truncate">
                      {t.listing_title}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <p
                      className={`text-xs truncate ${
                        hasUnread ? 'font-semibold text-slate-800' : 'text-slate-500'
                      }`}
                    >
                      {t.last_message_text}
                    </p>
                    {hasUnread ? (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#0F6B5D] text-white text-[10px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {t.unread_count}
                      </span>
                    ) : lang === 'ar' ? (
                      <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
