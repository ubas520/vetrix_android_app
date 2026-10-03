import { createContext, useContext, useMemo } from 'react';

import { useClientData } from './ClientDataContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const {
    markAllNotificationsRead,
    markNotificationRead,
    notifications,
  } = useClientData();

  const value = useMemo(() => {
    const unreadCount = notifications.filter((item) => item.status === 'Unread').length;

    return {
      notifications,
      unreadCount,
      markAsRead: markNotificationRead,
      markAllAsRead: markAllNotificationsRead,
    };
  }, [markAllNotificationsRead, markNotificationRead, notifications]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }

  return context;
}
