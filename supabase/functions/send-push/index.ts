import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  task_id: string | null;
  competition_id: string | null;
  pushed_at: string | null;
};

class RequestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

function isAllowedOrigin(origin: string): boolean {
  const configuredOrigin = Deno.env.get('APP_URL');
  if (configuredOrigin && origin === configuredOrigin.replace(/\/$/, '')) return true;

  try {
    const url = new URL(origin);
    return (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

function response(request: Request, body: Record<string, unknown>, status = 200) {
  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', 'application/json');
  const origin = request.headers.get('Origin');
  if (origin && isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function sendToSubscriptions(
  admin: ReturnType<typeof createClient>,
  subscriptions: PushSubscriptionRow[],
  payload: Record<string, unknown>,
) {
  let sent = 0;
  const expiredIds: string[] = [];
  const failures: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
          { TTL: 60 },
        );
        sent += 1;
      } catch (error: unknown) {
        const statusCode =
          typeof error === 'object' &&
          error !== null &&
          'statusCode' in error &&
          typeof error.statusCode === 'number'
            ? error.statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(subscription.id);
        } else {
          const message = error instanceof Error ? error.message : 'Kesalahan Web Push';
          failures.push(message);
        }
      }
    }),
  );

  if (expiredIds.length > 0) {
    const { error } = await admin.from('push_subscriptions').delete().in('id', expiredIds);
    if (error) {
      console.error('Gagal menghapus subscription Web Push yang kedaluwarsa:', error.message);
    }
  }

  return { sent, total: subscriptions.length, failures };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return response(request, { ok: true });
  }
  if (request.method !== 'POST') {
    return response(request, { error: 'Metode tidak diizinkan.' }, 405);
  }

  try {
    const origin = request.headers.get('Origin');
    if (origin && !isAllowedOrigin(origin)) {
      throw new RequestError('Asal permintaan tidak diizinkan.', 403);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Konfigurasi server Supabase belum lengkap.');
    }
    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      throw new Error('Konfigurasi VAPID server belum lengkap.');
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const authorization = request.headers.get('Authorization') ?? '';
    const token = authorization.replace(/^Bearer\s+/i, '');
    const isInternalRequest = token === serviceRoleKey;
    let userId: string | null = null;

    if (!isInternalRequest) {
      if (!token) throw new RequestError('Sesi pengguna tidak ditemukan.', 401);
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const {
        data: { user },
        error: authError,
      } = await userClient.auth.getUser(token);

      if (authError || !user) {
        throw new RequestError('Sesi pengguna tidak valid.', 401);
      }
      userId = user.id;
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      throw new RequestError('Body permintaan harus berupa JSON.');
    }

    const isTestRequest = body.type === 'test' && !isInternalRequest;
    const notificationId =
      typeof body.notification_id === 'string' ? body.notification_id : null;

    if (!isTestRequest && !notificationId) {
      throw new RequestError('Jenis permintaan Web Push tidak valid.');
    }
    if (isInternalRequest && !notificationId) {
      throw new RequestError('Permintaan internal harus menyertakan notification_id.');
    }

    let notification: NotificationRow | null = null;
    let targetUserId = userId;
    if (notificationId) {
      let query = admin
        .from('notifications')
        .select('id, user_id, type, title, body, task_id, competition_id, pushed_at')
        .eq('id', notificationId);
      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(`Gagal memuat notifikasi: ${error.message}`);
      if (!data) throw new RequestError('Notifikasi tidak ditemukan atau akses ditolak.', 404);
      notification = data as NotificationRow;
      targetUserId = notification.user_id;
    }

    if (!targetUserId) {
      throw new RequestError('Penerima notifikasi tidak ditemukan.', 400);
    }

    const { data: subscriptions, error: subscriptionsError } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', targetUserId);
    if (subscriptionsError) {
      throw new Error(`Gagal memuat perangkat Web Push: ${subscriptionsError.message}`);
    }

    const deviceSubscriptions = (subscriptions ?? []) as PushSubscriptionRow[];
    if (deviceSubscriptions.length === 0) {
      return response(request, { sent: 0, total: 0 });
    }

    if (notification) {
      if (notification.pushed_at) {
        return response(request, { sent: 0, total: deviceSubscriptions.length, already_sent: true });
      }

      const { data: claimed, error: claimError } = await admin
        .from('notifications')
        .update({ pushed_at: new Date().toISOString() })
        .eq('id', notification.id)
        .is('pushed_at', null)
        .select('id')
        .maybeSingle();
      if (claimError) {
        throw new Error(`Gagal mengklaim notifikasi untuk dikirim: ${claimError.message}`);
      }
      if (!claimed) {
        return response(request, { sent: 0, total: deviceSubscriptions.length, already_sent: true });
      }
    }

    const payload = isTestRequest
      ? {
          title: 'Uji Coba Notifikasi TEMAN',
          body: 'Web Push berhasil dikirim ke perangkat akun TEMAN Anda.',
          url: '/notifications',
          tag: `teman-test-${crypto.randomUUID()}`,
        }
      : {
          title: notification?.title ?? 'TEMAN — Notifikasi Baru',
          body: notification?.body ?? 'Ada aktivitas baru di workspace Anda.',
          url:
            notification?.type === 'mention' && !notification.task_id
              ? '/chat'
              : notification?.task_id
                ? '/tasks'
                : notification?.competition_id
                  ? '/calendar'
                  : '/notifications',
          tag: `teman-notification-${notification?.id}`,
        };

    const result = await sendToSubscriptions(admin, deviceSubscriptions, payload);
    if (result.sent === 0) {
      if (notification) {
        const { error: releaseError } = await admin
          .from('notifications')
          .update({ pushed_at: null })
          .eq('id', notification.id);
        if (releaseError) {
          console.error('Gagal melepas klaim notifikasi untuk dicoba ulang:', releaseError.message);
        }
      }
      throw new RequestError(
        result.failures[0] ?? 'Push tidak berhasil dikirim ke perangkat mana pun.',
        502,
      );
    }

    if (result.failures.length > 0) {
      console.warn('Beberapa perangkat gagal menerima Web Push:', result.failures);
    }
    return response(request, { sent: result.sent, total: result.total });
  } catch (error: unknown) {
    if (error instanceof RequestError) {
      return response(request, { error: error.message }, error.status);
    }
    const message = error instanceof Error ? error.message : 'Kesalahan internal Web Push.';
    console.error('Pengiriman Web Push gagal:', message);
    return response(request, { error: message }, 500);
  }
});
