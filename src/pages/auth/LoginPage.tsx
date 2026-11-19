import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Columns3,
  Download,
  Eye,
  EyeOff,
  Info,
  Lock,
  Smartphone,
  Trophy,
  User,
} from 'lucide-react';
import { BrandLogo } from '../../components/shared/BrandLogo';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { supabaseEnv } from '../../lib/supabase';
import { validateLoginInput } from '../../utils/authValidation';

type PreviewTab = 'board' | 'competition' | 'calendar';

const PREVIEW_TABS: { id: PreviewTab; label: string }[] = [
  { id: 'board', label: 'Alur Tugas' },
  { id: 'competition', label: 'Kompetisi' },
  { id: 'calendar', label: 'Kalender WIB' },
];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function LoginPage() {
  const { session, isLoading, isConfigured, authError, signIn, clearAuthError } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<PreviewTab>('board');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setInstallFeedback('Aplikasi TEMAN berhasil ditambahkan ke perangkat Anda.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    setInstallFeedback(null);

    if (!deferredPrompt) {
      setInstallFeedback(
        isIosDevice()
          ? 'Di iPhone/iPad: buka tombol Bagikan di Safari, lalu pilih "Tambah ke Layar Utama".'
          : 'Buka menu browser (⋮), lalu pilih "Instal aplikasi" atau "Tambahkan ke layar utama".'
      );
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setInstallFeedback('Aplikasi TEMAN berhasil ditambahkan ke perangkat Anda.');
    } else {
      setInstallFeedback('Pemasangan dibatalkan. Anda bisa mencoba lagi kapan saja.');
    }
  };

  if (!isLoading && session) {
    const redirectTo =
      (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
      '/overview';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    clearAuthError();

    const validation = validateLoginInput(username, password);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      await signIn(validation.normalizedUsername, password);
      const redirectTo =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
        '/overview';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Gagal masuk ke workspace TEMAN.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const activeError = submitError ?? authError;

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 text-slate-900 transition-colors duration-150 lg:grid-cols-12 dark:bg-slate-950 dark:text-slate-100">
      {/* Left Architectural Showcase Canvas (Desktop) */}
      <aside
        aria-label="Pengenalan workspace TEMAN"
        className="relative hidden flex-col justify-between overflow-hidden border-r border-slate-200/90 bg-slate-100/70 px-10 py-9 transition-colors duration-150 lg:col-span-7 lg:flex xl:px-14 xl:py-11 dark:border-slate-800/90 dark:bg-slate-950"
      >
        <div
          aria-hidden="true"
          className="teman-grid-pattern pointer-events-none absolute inset-0 opacity-40 dark:opacity-20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.12),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.18),transparent_60%)]"
        />

        {/* Top Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showWordmark={false} />
            <div className="flex items-center gap-2.5">
              <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">
                TEMAN
              </span>
              <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">
                ·
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Team Management
              </span>
            </div>
          </div>
          <Badge variant="primary" size="sm">
            Standar WIB (UTC+7)
          </Badge>
        </div>

        {/* Center Editorial Headline + Interactive Product Window */}
        <div className="relative z-10 my-auto py-8">
          <div className="max-w-xl">
            <h1 className="font-display text-3xl font-bold leading-[1.2] tracking-tight text-slate-900 [text-wrap:balance] xl:text-4xl dark:text-white">
              Satu ruang kerja tenang untuk mengelola tim kompetisi.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-600 xl:text-base dark:text-slate-300">
              Satukan alur kerja kompetisi, pembagian tugas, diskusi tim, dan tenggat waktu WIB dalam satu antarmuka yang terstruktur dan berfokus.
            </p>
          </div>

          {/* Interactive Workspace Preview */}
          <div
            aria-label="Pratinjau alur kerja TEMAN"
            className="mt-8 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-xl backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-2xl"
          >
            {/* Window Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/90 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Columns3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>Pratinjau Alur Kerja</span>
              </div>

              <div
                role="tablist"
                aria-label="Pilih tampilan pratinjau"
                className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                {PREVIEW_TABS.map((tab) => {
                  const selected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveTab(tab.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
                        selected
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview Content Body */}
            <div className="p-5">
              {activeTab === 'board' && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800/90 dark:bg-slate-950/60">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <span>To Do</span>
                      <Badge variant="default" size="sm">2</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90">
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                          Riset kebutuhan juri & rubrik
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>GEMASTIK</span>
                          <span className="font-mono text-slate-400 dark:text-slate-500">@nadia</span>
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90">
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                          Susun wireframe alur utama
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400">20 Nov WIB</span>
                          <span className="font-mono text-slate-400 dark:text-slate-500">@dimas</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-900/40 dark:bg-slate-950/60">
                    <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-400">
                      <span>In Progress</span>
                      <Badge variant="primary" size="sm">1</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="rounded-lg border border-blue-200 bg-white p-2.5 shadow-2xs dark:border-blue-500/40 dark:bg-slate-900/90">
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                          Finalisasi prototipe interaktif
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-mono tabular-nums text-blue-600 dark:text-blue-300">19 Nov WIB</span>
                          <span className="font-mono text-slate-400 dark:text-slate-500">@raka</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-900/40 dark:bg-slate-950/60">
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <span>Done</span>
                      <Badge variant="success" size="sm">2</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                          <CheckCircle2
                            className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                            aria-hidden="true"
                          />
                          <span className="truncate">Registrasi tim & berkas</span>
                        </div>
                        <div className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                          Selesai · @owner
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                          <CheckCircle2
                            className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                            aria-hidden="true"
                          />
                          <span className="truncate">Tinjau guidebook lomba</span>
                        </div>
                        <div className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                          Selesai · @nadia
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'competition' && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200/90 pb-4 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="primary" size="sm" dot>
                          Active
                        </Badge>
                        <Badge variant="info" size="sm">
                          Online
                        </Badge>
                      </div>
                      <div className="mt-2 font-display text-base font-semibold text-slate-900 dark:text-white">
                        GEMASTIK XVIII — Divisi Pengalaman Pengguna (UX)
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Tim Nusantara · Penyelenggara: Kemendikbudristek · Biaya: Gratis
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Progres Kerja</div>
                      <div className="mt-0.5 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                        68%
                      </div>
                    </div>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full w-[68%] rounded-full bg-blue-600 dark:bg-blue-500" />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <span>Tautan: Guidebook · Figma · GitHub</span>
                    <span className="font-mono font-medium tabular-nums text-slate-700 dark:text-slate-300">
                      Deadline: 24 Nov 2026, 23:59 WIB
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'calendar' && (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
                    <div className="flex items-center gap-3">
                      <CalendarDays
                        className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                        aria-hidden="true"
                      />
                      <div>
                        <div className="text-xs font-medium text-slate-900 dark:text-white">
                          Sinkronisasi Mingguan Tim Nusantara
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Rapat Internal · Google Meet
                        </div>
                      </div>
                    </div>
                    <div className="font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                      18 Nov · 19:30 WIB
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <CalendarDays
                        className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                        aria-hidden="true"
                      />
                      <div>
                        <div className="text-xs font-medium text-slate-900 dark:text-white">
                          Tenggat: Finalisasi prototipe interaktif
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Deadline Tugas · GEMASTIK XVIII
                        </div>
                      </div>
                    </div>
                    <div className="font-mono text-xs tabular-nums text-amber-700 dark:text-amber-300">
                      19 Nov · 21:00 WIB
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-2.5 last:pb-0">
                    <div className="flex items-center gap-3">
                      <CalendarDays
                        className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
                        aria-hidden="true"
                      />
                      <div>
                        <div className="text-xs font-medium text-slate-900 dark:text-white">
                          Batas Akhir Pengumpulan Proposal
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Deadline Kompetisi · GEMASTIK XVIII
                        </div>
                      </div>
                    </div>
                    <div className="font-mono text-xs tabular-nums font-semibold text-rose-600 dark:text-rose-300">
                      24 Nov · 23:59 WIB
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quiet Footer */}
        <div className="relative z-10 flex items-center justify-between border-t border-slate-200 pt-5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>Workspace Kolaborasi Tim Kompetisi</span>
          <span className="font-mono tabular-nums">Standar Waktu: WIB (UTC+7)</span>
        </div>
      </aside>

      {/* Right Sign-In Form Surface */}
      <div className="flex min-h-screen flex-col justify-between bg-white px-6 py-6 sm:px-10 lg:col-span-5 lg:border-l lg:border-slate-200/90 lg:px-12 lg:py-9 dark:bg-slate-900/90 dark:lg:border-slate-800/90">
        <header className="flex items-center justify-between">
          <div className="lg:hidden">
            <BrandLogo size="sm" showWordmark showSubtitle={false} />
          </div>
          <div className="hidden lg:block" />
          <ThemeToggle showLabel />
        </header>

        <main className="mx-auto my-auto w-full max-w-[380px] py-8">
          <div className="mb-7">
            <div className="mb-5 hidden lg:block">
              <BrandLogo size="md" showWordmark={false} />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Masuk ke TEMAN
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Masukkan username dan kata sandi akun tim Anda untuk membuka workspace.
            </p>
          </div>

          {activeError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs leading-relaxed text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
                  aria-hidden="true"
                />
                <span>{activeError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="Nama Akun"
              name="username"
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              spellCheck={false}
              placeholder="contoh: Fathan"
              leftIcon={<User className="h-4 w-4" aria-hidden="true" />}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) {
                  setFieldErrors((prev) => ({ ...prev, username: undefined }));
                }
              }}
              error={fieldErrors.username}
              hint="Masukkan nama akun terdaftar Anda."
            />

            <Input
              label="Kata Sandi"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Masukkan kata sandi"
              leftIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              error={fieldErrors.password}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              }
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={submitting}
                className="w-full"
                rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
              >
                Masuk ke Workspace
              </Button>
            </div>
          </form>

          <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <div className="flex items-start gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span>
                Akses privat tanpa pendaftaran publik. Akun dibuat dan dikelola langsung oleh Owner workspace.
              </span>
            </div>

            {!isStandalone && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-start gap-2.5">
                  <Smartphone
                    className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      Pasang TEMAN di layar utama
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      Tambahkan ikon aplikasi ke HP Anda untuk akses yang lebih cepat.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleInstallApp()}
                  leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
                  className="mt-2.5 w-full justify-center"
                >
                  Download Aplikasi (PWA)
                </Button>
                {installFeedback && (
                  <p
                    role="status"
                    className="mt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300"
                  >
                    {installFeedback}
                  </p>
                )}
              </div>
            )}

            {!isConfigured && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300"
              >
                <Info
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400"
                  aria-hidden="true"
                />
                <span>
                  Supabase belum terhubung. Lengkapi{' '}
                  <code className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                    {supabaseEnv.missingVars.join(', ')}
                  </code>{' '}
                  di <code className="font-mono text-[11px]">.env</code>.
                </span>
              </div>
            )}
          </div>
        </main>

        <footer className="text-center text-xs text-slate-400 lg:text-left dark:text-slate-500">
          TEMAN · Team Management System
        </footer>
      </div>
    </div>
  );
}
