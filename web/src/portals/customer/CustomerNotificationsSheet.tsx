import React, { useState } from 'react';
import { Bell, CheckCheck, MessageSquare, Tag, Trash2, X } from 'lucide-react';
import { CustomerNotification, PriceAlert } from '../../types';
import { formatSdg } from '../../i18n/translations';
import { usePrototype } from '../../store/PrototypeContext';

export function CustomerNotificationsSheet({
  open,
  notifications,
  alerts,
  onClose,
  onMarkAllRead,
  onDeleteAlert,
  onOpenListing,
  onOpenStore,
  onOpenMessageThread,
}: {
  open: boolean;
  notifications: CustomerNotification[];
  alerts: PriceAlert[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onDeleteAlert: (alertId: string) => void;
  onOpenListing: (listingId: string) => void;
  onOpenStore: (storeId: string) => void;
  onOpenMessageThread?: (threadKey?: string | null) => void;
}) {
  const { lang } = usePrototype();
  const [tab, setTab] = useState<'notifications' | 'alerts'>('notifications');

  if (!open) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="absolute inset-0 z-50 bg-[#102018]/45 backdrop-blur-[3px] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'ar' ? 'الإشعارات وتنبيهات الأسعار' : 'Notifications and price alerts'}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="store-clay clay-sheet rounded-t-[30px] max-h-[85%] flex flex-col overflow-hidden text-[#172B20]"
      >
        <div className="px-5 pt-3.5 pb-3 shrink-0 space-y-3 border-b border-[#172B20]/[0.07]">
          <div className="w-10 h-1 rounded-full bg-[#172B20]/15 mx-auto" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0F6B5D]" />
              <h3 className="text-sm font-bold">
                {lang === 'ar' ? 'الإشعارات وتنبيهات الأسعار' : 'Notifications & Price Alerts'}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && tab === 'notifications' && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="h-8 px-2.5 rounded-full clay-pill text-[11px] font-bold text-[#0F6B5D] inline-flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'قراءة الكل' : 'Mark read'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                className="clay-pill w-9 h-9 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 clay-inset rounded-full text-xs">
            <button
              type="button"
              onClick={() => setTab('notifications')}
              className={`h-9 rounded-full font-bold transition-all ${
                tab === 'notifications' ? 'clay-pill text-[#172B20]' : 'text-[#5E7669]'
              }`}
            >
              {lang === 'ar'
                ? `الإشعارات (${notifications.length})`
                : `Notifications (${notifications.length})`}
            </button>
            <button
              type="button"
              onClick={() => setTab('alerts')}
              className={`h-9 rounded-full font-bold transition-all ${
                tab === 'alerts' ? 'clay-pill text-[#172B20]' : 'text-[#5E7669]'
              }`}
            >
              {lang === 'ar'
                ? `تنبيهات الأسعار (${alerts.length})`
                : `Price Alerts (${alerts.length})`}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto thin-scroll p-4 space-y-2.5">
          {tab === 'notifications' ? (
            notifications.length === 0 ? (
              <p className="py-10 text-center text-xs text-[#5E7669]">
                {lang === 'ar'
                  ? 'لا توجد إشعارات جديدة حالياً.'
                  : 'No notifications yet.'}
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    if ((n.type === 'new_message' || n.type === 'chat_reply') && onOpenMessageThread) {
                      onOpenMessageThread(n.threadKey);
                    } else if (n.listingId) {
                      onOpenListing(n.listingId);
                    } else if (n.storeId) {
                      onOpenStore(n.storeId);
                    }
                  }}
                  className={`w-full p-3.5 rounded-[20px] text-start transition-colors flex items-start gap-3 ${
                    n.read ? 'clay-card opacity-80' : 'clay-card-tint border border-[#0F6B5D]/20'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#0F6B5D] shrink-0">
                    {n.type === 'chat_reply' || n.type === 'new_message' ? (
                      <MessageSquare className="w-4 h-4" />
                    ) : (
                      <Tag className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs font-bold text-[#172B20]">
                      {lang === 'ar' ? n.titleAr : n.titleEn}
                    </p>
                    <p className="text-[11px] text-[#4E6659] leading-relaxed">
                      {lang === 'ar' ? n.bodyAr : n.bodyEn}
                    </p>
                  </div>
                </button>
              ))
            )
          ) : alerts.length === 0 ? (
            <p className="py-10 text-center text-xs text-[#5E7669]">
              {lang === 'ar'
                ? 'اضغط على زر "تنبيه السعر" داخل أي هاتف ليصلك إشعار فور انخفاض سعره.'
                : 'Tap "Price Alert" on any phone to get notified whenever its price drops.'}
            </p>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className="clay-card rounded-[20px] p-3.5 flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenListing(a.listingId);
                  }}
                  className="text-start min-w-0 flex-1"
                >
                  <p className="text-xs font-bold text-[#172B20] truncate" dir="ltr">
                    {a.model}
                  </p>
                  <p className="text-[11px] text-[#5E7669] mt-0.5 tabular-nums">
                    {lang === 'ar' ? 'السعر عند الاشتراك: ' : 'Tracked at: '}
                    {formatSdg(a.initialPriceSdg, lang)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteAlert(a.id)}
                  aria-label={`Remove alert for ${a.model}`}
                  className="w-9 h-9 rounded-full clay-pill flex items-center justify-center text-[#5E7669] hover:text-red-600 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
