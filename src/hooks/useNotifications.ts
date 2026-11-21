import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import {
  fetchUserNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead as markAsReadService,
  markAllNotificationsAsRead as markAllAsReadService,
  playNotificationSound,
  type NotificationItem,
} from '../services/notificationService';

export function useNotifications() {
  const { user } = useAuth();
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Use a ref so the realtime callback always calls the latest version
  // without causing the subscription effect to re-run
  const loadRef = useRef<() => Promise<void>>(async () => undefined);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [items, unread] = await Promise.all([
        fetchUserNotifications(user.id),
        fetchUnreadNotificationCount(user.id),
      ]);
      setNotifications(items);
      setUnreadCount(unread);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat notifikasi';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Keep the ref up to date so the channel callback doesn't go stale
  useEffect(() => {
    loadRef.current = loadNotifications;
  }, [loadNotifications]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Realtime subscription — only depends on user.id to avoid re-subscribing
  // on every loadNotifications re-creation. Uses loadRef to call latest version.
  useEffect(() => {
    if (!user || !supabase) return;
    const client = supabase;
    const userId = user.id;

    const channel = client
      .channel(`notif-${userId}-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as Partial<NotificationItem>;
            if (inserted.id && (inserted.type === 'mention' || inserted.type === 'deadline')) {
              playNotificationSound(inserted.id);
            }
          }
          void loadRef.current();
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [user, instanceId]);

  const markAsRead = async (id: string) => {
    try {
      await markAsReadService(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menandai notifikasi';
      setError(msg);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await markAllAsReadService(user.id);
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
      setUnreadCount(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menandai semua notifikasi';
      setError(msg);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: loadNotifications,
    markAsRead,
    markAllAsRead,
  };
}
