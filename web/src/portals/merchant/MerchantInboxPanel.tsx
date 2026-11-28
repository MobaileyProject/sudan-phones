import React from 'react';
import { UnifiedMessagesView } from '../../components/UnifiedMessagesView';

export function MerchantInboxPanel({
  onUnreadCountChange,
}: {
  onUnreadCountChange?: (totalUnread: number) => void;
}) {
  return (
    <UnifiedMessagesView
      mode="merchant"
      onUnreadCountChange={onUnreadCountChange}
    />
  );
}
