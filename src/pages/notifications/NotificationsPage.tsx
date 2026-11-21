import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AtSign,
  Bell,
  BellOff,
  BellRing,
  CheckCheck,
  CheckSquare,
  Clock,
  Download,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Send,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import {
  checkPushSubscriptionInDb,
  registerPushSubscription,
  playNotificationSound,
  sendTestPushNotification,
  unregisterPushSubscription,
  type NotificationItem,
} from '../../services/notificationService';
import { formatDateTimeWIB } from '../../utils/formatters';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';

type TabFilter = 'all' | 'unread' | 'read';
type TypeFilter = 'all' | 'mention' | 'assignment' | 'comment' | 'deadline';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function getVapidApplicationServerKey(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw new Error('VITE_VAPID_PUBLIC_KEY bukan public key VAPID yang valid.');
  }

  const binary = window.atob(normalized);
  if (binary.length !== 65) {
    throw new Error('VITE_VAPID_PUBLIC_KEY harus berisi public key VAPID P-256.');
  }
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return buffer;
}

function sameApplicationServerKey(
  currentKey: ArrayBuffer | null,
  expectedKey: ArrayBuffer
): boolean {
  if (!currentKey || currentKey.byteLength !== expectedKey.byteLength) return false;
  const currentBytes = new Uint8Array(currentKey);
  const expectedBytes = new Uint8Array(expectedKey);
  return currentBytes.every((value, index) => value === expectedBytes[index]);
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Filters
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Push notification state
  const [pushSupported, setPushSupported] = useState<boolean>(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);

  // PWA install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  // Check PWA and Push support on mount
  useEffect(() => {
    // PWA Standalone check
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Push notification check
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setPushSupported(true);
      setPushPermission(Notification.permission);

      // Check active subscription
      void navigator.serviceWorker.ready
        .then(async (reg) => {
          const sub = await reg.pushManager.getSubscription();
          if (!sub || !user) {
            setPushSubscribed(false);
            return;
          }
          setPushSubscribed(await checkPushSubscriptionInDb(user.id, sub.endpoint));
        })
        .catch((err: unknown) => {
          setPushFeedback(
            err instanceof Error
              ? err.message
              : 'Gagal memeriksa langganan Web Push.'
          );
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [user]);

  // Handle push notification toggle
  const handleTogglePush = async () => {
    if (!pushSupported || !user) return;
    setPushLoading(true);
    setPushFeedback(null);

    try {
      if (pushSubscribed) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await unregisterPushSubscription(user.id, sub.endpoint);
        }
        setPushSubscribed(false);
        setPushFeedback('Notifikasi push berhasil dinonaktifkan di browser ini.');
      } else {
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
        if (!vapidPublicKey) {
          throw new Error(
            'Atur VITE_VAPID_PUBLIC_KEY sebelum mengaktifkan Web Push pada perangkat ini.'
          );
        }
        const applicationServerKey = getVapidApplicationServerKey(vapidPublicKey);

        // Request permission
        const permission = await Notification.requestPermission();
        setPushPermission(permission);

        if (permission !== 'granted') {
          setPushFeedback('Izin notifikasi tidak diberikan oleh peramban.');
          setPushLoading(false);
          return;
        }

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        if (sub && !sameApplicationServerKey(sub.options.applicationServerKey, applicationServerKey)) {
          await sub.unsubscribe();
          await unregisterPushSubscription(user.id, sub.endpoint);
          sub = null;
        }

        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        }

        if (sub) {
          await registerPushSubscription(user.id, sub);
          setPushSubscribed(true);
          setPushFeedback(
            'Web Push aktif pada browser ini. Perangkat lain pada akun yang sama juga dapat menerima notifikasi.'
          );
        } else {
          setPushSubscribed(false);
          setPushFeedback(
            'Langganan Web Push belum berhasil dibuat. Periksa dukungan browser dan konfigurasi VAPID.'
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah pengaturan push';
      setPushFeedback(msg);
    } finally {
      setPushLoading(false);
    }
  };

  // Send a server-side push to every subscribed device on this account.
  const handleTestNotification = async () => {
    setPushLoading(true);
    setPushFeedback(null);
    try {
      const result = await sendTestPushNotification();
      if (result.sent > 0) {
        playNotificationSound();
        setPushFeedback(
          `Notifikasi uji coba dikirim ke ${result.sent} dari ${result.total} perangkat yang terdaftar.`
        );
      } else {
        setPushFeedback(
          'Belum ada perangkat Web Push terdaftar. Aktifkan Web Push pada HP atau browser tujuan terlebih dahulu.'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim notifikasi';
      setPushFeedback(msg);
    } finally {
      setPushLoading(false);
    }
  };

  // Handle PWA installation
  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Tab filter
      if (tabFilter === 'unread' && item.read_at) return false;
      if (tabFilter === 'read' && !item.read_at) return false;

      // Type filter
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      return true;
    });
  }, [notifications, tabFilter, typeFilter]);

  // Click notification to navigate
  const handleItemClick = (item: NotificationItem) => {
    if (!item.read_at) {
      void markAsRead(item.id);
    }
    if (item.task_id && item.competition_id) {
      navigate(`/competitions/${item.competition_id}?tab=board`);
    } else if (item.competition_id) {
      navigate(`/competitions/${item.competition_id}`);
    } else if (item.task_id) {
      navigate('/tasks');
    } else if (item.type === 'mention') {
      navigate('/chat');
    }
  };

  const getIconForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'mention':
        return <AtSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'assignment':
        return <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case 'deadline':
        return <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Bell className="h-4 w-4 text-slate-500" />;
    }
  };

  const getTypeBadgeLabel = (type: NotificationItem['type']) => {
    switch (type) {
      case 'mention':
        return 'Mention';
      case 'assignment':
        return 'Penugasan';
      case 'comment':
        return 'Komentar';
      case 'deadline':
        return 'Deadline';
      default:
        return 'Sistem';
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              Pusat Notifikasi
            </h2>
            {unreadCount > 0 ? (
              <Badge variant="primary" size="sm">
                {unreadCount} Belum Dibaca
              </Badge>
            ) : (
              <Badge variant="default" size="sm">
                Semua Terbaca
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Aktivitas penugasan tugas, mention tim, komentar kolaborasi, dan tenggat waktu WIB.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
            aria-label="Segarkan notifikasi"
            leftIcon={
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            }
            className="shrink-0"
          >
            Segarkan
          </Button>

          {unreadCount > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void markAllAsRead()}
              leftIcon={<CheckCheck className="h-4 w-4 shrink-0" aria-hidden="true" />}
              className="min-w-0 flex-1 justify-center sm:flex-none"
            >
              Tandai Semua Dibaca
            </Button>
          )}
        </div>
      </div>

      {/* Web Push & PWA Control Center Card */}
      <Card variant="default" className="overflow-hidden border-blue-200/60 bg-blue-50/30 dark:border-blue-900/40 dark:bg-blue-950/20">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                {pushSubscribed ? (
                  <BellRing className="h-5 w-5" />
                ) : (
                  <BellOff className="h-5 w-5 text-blue-100" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                    Web Push & Pemberitahuan Perangkat
                  </h3>
                  {pushSubscribed ? (
                    <Badge variant="success" size="sm">
                      Aktif
                    </Badge>
                  ) : pushPermission === 'denied' ? (
                    <Badge variant="danger" size="sm">
                      Izin Ditolak
                    </Badge>
                  ) : pushPermission === 'granted' ? (
                    <Badge variant="warning" size="sm">
                      Izin diberikan
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">
                      Belum Aktif
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Dapatkan notifikasi mention, deadline lomba/tugas, dan jadwal dekat di komputer atau smartphone.
                </p>
              </div>
            </div>

            <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-nowrap sm:items-center">
              {pushSupported && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant={pushSubscribed ? 'outline' : 'primary'}
                    onClick={handleTogglePush}
                    disabled={pushLoading}
                    className="w-full justify-center px-2 sm:w-auto sm:px-2.5"
                  >
                    <span className="sm:hidden">
                      {pushSubscribed ? 'Matikan Push' : 'Aktifkan Push'}
                    </span>
                    <span className="hidden sm:inline">
                      {pushSubscribed ? 'Nonaktifkan Push' : 'Aktifkan Web Push'}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleTestNotification}
                    disabled={pushLoading}
                    leftIcon={<Send className="h-3.5 w-3.5" aria-hidden="true" />}
                    className="w-full justify-center sm:w-auto"
                  >
                    Uji Coba
                  </Button>
                </>
              )}

              {deferredPrompt && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleInstallApp}
                  leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
                  className="col-span-2 w-full justify-center sm:col-auto sm:w-auto"
                >
                  Pasang Aplikasi (PWA)
                </Button>
              )}

              {isStandalone && (
                <Badge variant="primary" size="sm" className="hidden sm:inline-flex">
                  PWA Standalone
                </Badge>
              )}
            </div>
          </div>

          {pushFeedback && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-white/90 p-2.5 text-xs text-blue-900 dark:border-blue-900 dark:bg-slate-900/90 dark:text-blue-300">
              {pushFeedback}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter Tabs & Filter Types */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Tab Group */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-100/70 p-1 dark:border-slate-800 dark:bg-slate-900">
          {(
            [
              { id: 'all', label: 'Semua' },
              { id: 'unread', label: `Belum Dibaca (${unreadCount})` },
              { id: 'read', label: 'Sudah Dibaca' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                tabFilter === tab.id
                  ? 'bg-white text-blue-600 shadow-2xs dark:bg-slate-800 dark:text-blue-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Type Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 dark:text-slate-500 mr-1">Tipe:</span>
          {(
            [
              { id: 'all', label: 'Semua' },
              { id: 'mention', label: 'Mention' },
              { id: 'assignment', label: 'Penugasan' },
              { id: 'comment', label: 'Komentar' },
              { id: 'deadline', label: 'Deadline' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                typeFilter === t.id
                  ? 'bg-blue-600 text-white font-medium shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {loading && notifications.length === 0 ? (
          <div className="space-y-3 py-6">
            <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60" />
            <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60" />
            <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60" />
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((item) => {
            const isUnread = !item.read_at;
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => handleItemClick(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleItemClick(item);
                  }
                }}
                className={`group relative flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-150 cursor-pointer ${
                  isUnread
                    ? 'border-blue-300 bg-blue-50/40 shadow-xs hover:border-blue-400 hover:bg-blue-50/70 dark:border-blue-800/70 dark:bg-blue-950/20 dark:hover:border-blue-700'
                    : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800/90 dark:bg-slate-900/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Type Icon */}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isUnread
                      ? 'bg-blue-100 dark:bg-blue-900/50'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {getIconForType(item.type)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xs font-bold text-slate-900 sm:text-sm dark:text-slate-100">
                      {item.title}
                    </span>
                    <Badge variant={isUnread ? 'primary' : 'default'} size="sm">
                      {getTypeBadgeLabel(item.type)}
                    </Badge>
                    {isUnread && (
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                    )}
                  </div>

                  {item.body && (
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2 dark:text-slate-300">
                      {item.body}
                    </p>
                  )}

                  {/* Context chips */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                    {item.actor_name && (
                      <span>
                        Oleh:{' '}
                        <strong className="font-semibold text-slate-600 dark:text-slate-300">
                          {item.actor_name}
                        </strong>
                      </span>
                    )}

                    {item.competition_name && (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        🏆 {item.competition_name}
                      </span>
                    )}

                    {item.task_title && (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        ✓ {item.task_title}
                      </span>
                    )}

                    <span className="ml-auto flex items-center gap-1 tabular-nums">
                      <Clock className="h-3 w-3" />
                      {formatDateTimeWIB(item.created_at)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 self-center shrink-0">
                  {isUnread && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void markAsRead(item.id);
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                      title="Tandai sudah dibaca"
                      aria-label="Tandai sudah dibaca"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <ExternalLink className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600" />
                </div>
              </div>
            );
          })
        ) : (
          <Card variant="default">
            <CardContent className="pt-6">
              <EmptyState
                icon={<Bell className="h-6 w-6" />}
                title={
                  tabFilter === 'unread'
                    ? 'Tidak Ada Notifikasi Baru'
                    : 'Belum Ada Notifikasi'
                }
                description={
                  tabFilter === 'unread'
                    ? 'Semua notifikasi Anda sudah dibaca. Notifikasi baru tentang mention, tugas, dan deadline akan muncul di sini.'
                    : 'Belum ada aktivitas notifikasi yang tercatat untuk akun Anda.'
                }
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
