import { requireSupabaseClient } from '../lib/supabase';
import type { Database, NotificationType } from '../types/database.types';
import notificationSoundUrl from '../../assets/notification.mp3';

export interface NotificationItem {
  id: string;
  user_id: string;
  actor_id: string | null;
  actor_name?: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  competition_id: string | null;
  competition_name?: string | null;
  task_id: string | null;
  task_title?: string | null;
  read_at: string | null;
  pushed_at?: string | null;
  created_at: string;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
}

export interface PushDispatchResult {
  sent: number;
  total: number;
}

const playedNotificationIds = new Set<string>();

export function playNotificationSound(notificationId?: string): void {
  if (notificationId) {
    if (playedNotificationIds.has(notificationId)) return;
    playedNotificationIds.add(notificationId);
    if (playedNotificationIds.size > 100) {
      const oldest = playedNotificationIds.values().next().value;
      if (oldest) playedNotificationIds.delete(oldest);
    }
  }

  const audio = new Audio(notificationSoundUrl);
  audio.volume = 0.8;
  void audio.play().catch((error: unknown) => {
    console.warn('Tidak dapat memutar suara notifikasi:', error);
  });
}

function isPushDispatchResult(value: unknown): value is PushDispatchResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.sent === 'number' &&
    Number.isInteger(result.sent) &&
    result.sent >= 0 &&
    typeof result.total === 'number' &&
    Number.isInteger(result.total) &&
    result.total >= result.sent
  );
}

async function invokePushFunction(
  body: { type: 'test' } | { notification_id: string },
): Promise<PushDispatchResult> {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<unknown>('send-push', {
    body,
  });

  if (error) {
    let message = error.message || 'Gagal mengirim Web Push.';
    const context = (error as { context?: unknown }).context;
    if (typeof Response !== 'undefined' && context instanceof Response) {
      try {
        const payload = (await context.clone().json()) as { error?: unknown };
        if (typeof payload.error === 'string') message = payload.error;
      } catch {
        // Keep the invoke error when the Edge Function did not return JSON.
      }
    }
    throw new Error(message);
  }

  if (!isPushDispatchResult(data)) {
    throw new Error('Layanan Web Push mengembalikan respons yang tidak valid.');
  }
  return data;
}

export function sendTestPushNotification(): Promise<PushDispatchResult> {
  return invokePushFunction({ type: 'test' });
}

export function dispatchPushNotification(
  notificationId: string,
): Promise<PushDispatchResult> {
  return invokePushFunction({ notification_id: notificationId });
}

/**
 * Fetch all notifications for the given user, newest first.
 */
export async function fetchUserNotifications(
  userId: string
): Promise<NotificationItem[]> {
  const client = requireSupabaseClient();

  const { data, error } = await client
    .from('notifications')
    .select(`
      id,
      user_id,
      actor_id,
      type,
      title,
      body,
      competition_id,
      task_id,
      read_at,
      created_at
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    // If table doesn't have records or query fails, return empty array gracefully
    console.warn('Failed to fetch notifications:', error.message);
    return [];
  }

  const items = (data || []) as NotificationItem[];

  // Collect actor_ids, competition_ids, task_ids for enrichments
  const actorIds = Array.from(new Set(items.map((i) => i.actor_id).filter(Boolean))) as string[];
  const compIds = Array.from(new Set(items.map((i) => i.competition_id).filter(Boolean))) as string[];
  const taskIds = Array.from(new Set(items.map((i) => i.task_id).filter(Boolean))) as string[];

  const [actorsRes, compsRes, tasksRes] = await Promise.all([
    actorIds.length > 0
      ? client.from('profiles').select('id, full_name').in('id', actorIds)
      : Promise.resolve({ data: [] }),
    compIds.length > 0
      ? client.from('competitions').select('id, name').in('id', compIds)
      : Promise.resolve({ data: [] }),
    taskIds.length > 0
      ? client.from('tasks').select('id, title').in('id', taskIds)
      : Promise.resolve({ data: [] }),
  ]);

  const actorMap = new Map((actorsRes.data || []).map((a) => [a.id, a.full_name]));
  const compMap = new Map((compsRes.data || []).map((c) => [c.id, c.name]));
  const taskMap = new Map((tasksRes.data || []).map((t) => [t.id, t.title]));

  return items.map((item) => ({
    ...item,
    actor_name: item.actor_id ? actorMap.get(item.actor_id) ?? null : null,
    competition_name: item.competition_id ? compMap.get(item.competition_id) ?? null : null,
    task_title: item.task_id ? taskMap.get(item.task_id) ?? null : null,
  }));
}

/**
 * Fetch count of unread notifications for a user.
 */
export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  const client = requireSupabaseClient();
  const { count, error } = await client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    return 0;
  }
  return count || 0;
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(`Gagal menandai notifikasi dibaca: ${error.message}`);
  }
}

/**
 * Mark all notifications of a user as read.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    throw new Error(`Gagal menandai semua notifikasi: ${error.message}`);
  }
}

/**
 * Register a Web Push subscription to the database.
 */
export async function registerPushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<PushSubscriptionRecord> {
  const client = requireSupabaseClient();

  const json = subscription.toJSON();
  const endpoint = subscription.endpoint;
  const p256dh = json.keys?.p256dh || '';
  const auth = json.keys?.auth || '';
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

  // Check if this endpoint already registered
  const { data: existing } = await client
    .from('push_subscriptions')
    .select('*')
    .eq('endpoint', endpoint)
    .maybeSingle();

  if (existing) {
    const { data, error } = await client
      .from('push_subscriptions')
      .update({
        user_id: userId,
        p256dh,
        auth,
        user_agent: userAgent,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(`Gagal memperbarui langganan push: ${error.message}`);
    return data as PushSubscriptionRecord;
  }

  const { data, error } = await client
    .from('push_subscriptions')
    .insert({
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Gagal menyimpan langganan push: ${error.message}`);
  }

  return data as PushSubscriptionRecord;
}

/**
 * Remove a Web Push subscription.
 */
export async function unregisterPushSubscription(
  userId: string,
  endpoint: string
): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) {
    throw new Error(`Gagal menghapus langganan push: ${error.message}`);
  }
}

/**
 * Check if the current browser endpoint is registered in DB.
 */
export async function checkPushSubscriptionInDb(
  userId: string,
  endpoint: string
): Promise<boolean> {
  const client = requireSupabaseClient();
  const { data } = await client
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .maybeSingle();

  return Boolean(data);
}
