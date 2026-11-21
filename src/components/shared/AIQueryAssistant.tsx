import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  ArrowUp,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { askAIQuery } from '../../services/aiQueryService';
import type { AIQueryCell, AIQueryResult } from '../../utils/aiQueryResult';

interface ConversationEntry {
  id: number;
  question: string;
  pending?: boolean;
  result?: AIQueryResult;
  error?: string;
}

const SUGGESTED_QUESTIONS = [
  'Berapa kompetisi yang sedang aktif?',
  'Tampilkan tugas yang belum selesai',
  'Kompetisi mana yang deadline-nya paling dekat?',
];

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const numberFormatter = new Intl.NumberFormat('id-ID');

function formatCell(value: AIQueryCell): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return numberFormatter.format(value);
  return String(value);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function AnswerMeta({ state = 'answer' }: { state?: 'answer' | 'pending' | 'error' }) {
  const isError = state === 'error';
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      <span
        className={`h-1.5 w-1.5 rounded-sm ${
          isError ? 'bg-rose-500' : 'bg-blue-600 dark:bg-blue-400'
        }`}
      />
      <span className="font-mono text-[9px] font-medium tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
        TEMAN AI
      </span>
      <span
        className={`h-px flex-1 ${
          isError ? 'bg-rose-100 dark:bg-rose-950' : 'bg-slate-100 dark:bg-slate-800'
        }`}
      />
      <span
        className={`font-mono text-[9px] tracking-[0.12em] uppercase ${
          isError ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'
        }`}
      >
        {state === 'pending' ? 'membaca' : state === 'error' ? 'gagal' : 'jawaban'}
      </span>
    </div>
  );
}

function PendingAnswer() {
  return (
    <div role="status" aria-live="polite">
      <AnswerMeta state="pending" />
      <div className="mt-2 flex items-center gap-2.5">
        <span className="flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="teman-ai-dot h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400"
              style={{ animationDelay: `${index * 140}ms` }}
            />
          ))}
        </span>
        <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
          Membaca data workspace…
        </span>
      </div>
    </div>
  );
}

function ResultTable({ result }: { result: AIQueryResult }) {
  if (result.rows.length === 0) return null;

  const numericColumns = new Set(
    result.columns.filter((column) =>
      result.rows.every((row) => {
        const value = row[column];
        return (
          value === null ||
          value === undefined ||
          value === '' ||
          typeof value === 'number'
        );
      })
    )
  );

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[9px] tracking-[0.14em] text-slate-400 uppercase dark:text-slate-500">
          Data
        </span>
        <span className="font-mono text-[9px] tabular-nums text-slate-400 dark:text-slate-500">
          {result.rows.length} baris
        </span>
      </div>

      <div
        role="region"
        aria-label="Tabel hasil analisis"
        tabIndex={0}
        className="mt-1.5 overflow-x-auto border-y border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none dark:border-slate-800"
      >
        <table className="min-w-full border-collapse text-left text-[11.5px]">
          <caption className="sr-only">Hasil analisis data workspace</caption>
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/40">
              {result.columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className={`whitespace-nowrap px-3 py-2 text-[9px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400 ${
                    numericColumns.has(column) ? 'text-right' : 'text-left'
                  }`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {result.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
              >
                {result.columns.map((column, columnIndex) => (
                  <td
                    key={column}
                    className={`max-w-60 px-3 py-2 align-top ${
                      columnIndex === 0
                        ? 'font-medium text-slate-800 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-300'
                    } ${numericColumns.has(column) ? 'text-right tabular-nums' : ''}`}
                  >
                    {formatCell(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AIQueryAssistant() {
  const { session } = useAuth();
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(0);
  const wasOpen = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const node = scrollRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (wasOpen.current) {
        wasOpen.current = false;
        triggerRef.current?.focus();
      }
      return;
    }

    wasOpen.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => questionRef.current?.focus(), 80);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    scrollToBottom(prefersReducedMotion() ? 'auto' : 'smooth');
  }, [conversation, isLoading, isOpen, scrollToBottom]);

  useEffect(() => {
    const node = questionRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 112)}px`;
  }, [question, isOpen]);

  // Global Chat already exposes @ai in its composer. Hiding the floating
  // analytics assistant there also prevents it from covering the composer.
  useEffect(() => {
    if (pathname.startsWith('/chat')) setIsOpen(false);
  }, [pathname]);

  if (!session || pathname.startsWith('/chat')) return null;

  const runQuestion = async (id: number, submittedQuestion: string) => {
    setIsLoading(true);
    try {
      const result = await askAIQuery(submittedQuestion);
      setConversation((current) =>
        current.map((entry) =>
          entry.id === id ? { ...entry, pending: false, result, error: undefined } : entry
        )
      );
    } catch (error) {
      setConversation((current) =>
        current.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                pending: false,
                error:
                  error instanceof Error
                    ? error.message
                    : 'Terjadi kesalahan saat memproses pertanyaan.',
              }
            : entry
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const ask = (rawQuestion: string) => {
    const submittedQuestion = rawQuestion.trim();
    if (!submittedQuestion || isLoading) return;

    const id = nextId.current++;
    setConversation((current) => [
      ...current,
      { id, question: submittedQuestion, pending: true },
    ]);
    void runQuestion(id, submittedQuestion);
  };

  const submitQuestion = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!question.trim() || isLoading) return;
    const submittedQuestion = question.trim();
    setQuestion('');
    ask(submittedQuestion);
  };

  const retryEntry = (entry: ConversationEntry) => {
    if (isLoading) return;
    setConversation((current) =>
      current.map((item) =>
        item.id === entry.id
          ? { id: item.id, question: item.question, pending: true }
          : item
      )
    );
    void runQuestion(entry.id, entry.question);
  };

  const clearConversation = () => {
    if (isLoading) return;
    setConversation([]);
    setQuestion('');
    questionRef.current?.focus();
  };

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      return;
    }
    if (event.key !== 'Tab') return;

    const panel = panelRef.current;
    if (!panel) return;
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Buka asisten AI TEMAN"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="teman-ai-panel"
        title="Tanya data TEMAN dengan AI"
        onClick={() => setIsOpen((open) => !open)}
        className="group fixed right-4 bottom-24 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-[linear-gradient(145deg,#59c9fb_0%,#4c68f5_55%,#a948f5_100%)] text-white shadow-lg shadow-blue-950/25 transition-transform duration-150 hover:scale-105 focus-visible:ring-4 focus-visible:ring-blue-400/40 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 dark:border-slate-800 sm:right-8 sm:bottom-8"
      >
        <Sparkles className="h-6 w-6" strokeWidth={2.2} />
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-800"
        />
        <span className="pointer-events-none absolute top-1/2 right-full mr-3 hidden -translate-y-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 font-mono text-[10px] tracking-wide whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 dark:bg-slate-100 dark:text-slate-900 lg:block">
          TANYA DATA
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex sm:items-stretch sm:justify-end sm:p-4">
          <div
            className="teman-ai-backdrop absolute inset-0 bg-slate-950/45 sm:bg-slate-950/20"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <p id="teman-ai-description" className="sr-only">
            Asisten analitik untuk menanyakan ringkasan kompetisi, tugas, progres,
            dan biaya pendaftaran di workspace TEMAN.
          </p>

          <div
            ref={panelRef}
            id="teman-ai-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teman-ai-title"
            aria-describedby="teman-ai-description"
            onKeyDown={handlePanelKeyDown}
            className="teman-ai-panel relative z-10 flex h-dvh w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 sm:h-[min(44rem,calc(100dvh-2rem))] sm:w-[26.5rem] sm:rounded-2xl sm:border sm:border-slate-200 sm:dark:border-slate-800"
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3.5 dark:border-slate-800 dark:bg-slate-900 sm:pt-3.5">
              <div
                aria-hidden="true"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-white dark:bg-blue-600"
              >
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2
                    id="teman-ai-title"
                    className="font-display text-[13px] font-bold tracking-tight text-slate-900 dark:text-slate-100"
                  >
                    TEMAN AI
                  </h2>
                  <span className="font-mono text-[9px] tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
                    Analis data
                  </span>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  />
                  Siap membaca workspace
                </p>
              </div>
              {conversation.length > 0 && (
                <button
                  type="button"
                  onClick={clearConversation}
                  disabled={isLoading}
                  aria-label="Bersihkan percakapan"
                  title="Bersihkan percakapan"
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup asisten AI"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto overscroll-contain bg-slate-50/60 px-4 py-4 dark:bg-slate-950/30"
            >
              {conversation.length === 0 ? (
                <div className="teman-ai-empty flex min-h-full flex-col justify-center gap-7 py-2">
                  <div>
                    <p className="font-mono text-[9.5px] tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">
                      Mulai dari data
                    </p>
                    <h3 className="font-display mt-2 text-[26px] leading-[1.12] font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      Ringkasan tim,
                      <br />
                      tanpa hitung manual.
                    </h3>
                    <p className="mt-3 max-w-[30ch] text-[12.5px] leading-6 text-slate-500 dark:text-slate-400">
                      Saya membaca kompetisi, tugas, progres, dan biaya yang boleh
                      diakses akun Anda.
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-mono text-[9.5px] tracking-[0.14em] text-slate-400 uppercase dark:text-slate-500">
                        Contoh pertanyaan
                      </p>
                      <span className="font-mono text-[9.5px] text-slate-300 dark:text-slate-600">
                        03
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                      {SUGGESTED_QUESTIONS.map((suggestion, index) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => ask(suggestion)}
                          disabled={isLoading}
                          title={suggestion}
                          className="group flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800/60 dark:focus-visible:bg-slate-800/60"
                        >
                          <span className="font-mono text-[10px] tabular-nums text-slate-300 transition-colors group-hover:text-blue-500 dark:text-slate-600 dark:group-hover:text-blue-400">
                            0{index + 1}
                          </span>
                          <span className="min-w-0 flex-1 text-[12px] leading-5 font-medium text-slate-700 transition-colors group-hover:text-slate-950 dark:text-slate-300 dark:group-hover:text-white">
                            {suggestion}
                          </span>
                          <ArrowUp
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0 rotate-45 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-500 dark:text-slate-600 dark:group-hover:text-blue-400"
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="flex items-start gap-2 border-t border-slate-100 pt-3 text-[10.5px] leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <ShieldCheck
                      aria-hidden="true"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    />
                    Jawaban mengikuti izin akun. AI tidak menerima seluruh isi
                    database.
                  </p>
                </div>
              ) : (
                <div
                  role="log"
                  aria-label="Percakapan dengan TEMAN AI"
                  aria-live="polite"
                  aria-relevant="additions"
                  className="space-y-6"
                >
                  {conversation.map((entry) => (
                    <div key={entry.id} className="space-y-3">
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-xl rounded-br-sm bg-slate-900 px-3.5 py-2.5 text-[12.5px] leading-5 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900">
                          {entry.question}
                        </div>
                      </div>

                      {entry.pending && <PendingAnswer />}

                      {entry.result && (
                        <div>
                          <AnswerMeta />
                          <p className="mt-2 text-[13px] leading-6 text-slate-700 dark:text-slate-200">
                            {entry.result.answer}
                          </p>
                          <ResultTable result={entry.result} />
                        </div>
                      )}

                      {entry.error && (
                        <div>
                          <AnswerMeta state="error" />
                          <div
                            role="alert"
                            className="mt-2 border-l-2 border-rose-500 bg-rose-50/60 py-2 pr-1 pl-3 dark:bg-rose-950/20"
                          >
                            <p className="text-[12.5px] leading-5 text-rose-800 dark:text-rose-200">
                              {entry.error}
                            </p>
                            <button
                              type="button"
                              onClick={() => retryEntry(entry)}
                              disabled={isLoading}
                              className="mt-2 inline-flex items-center gap-1.5 border-b border-rose-300 pb-0.5 text-[11px] font-medium text-rose-700 transition-colors hover:border-rose-500 hover:text-rose-900 focus-visible:ring-2 focus-visible:ring-rose-500/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-800 dark:text-rose-200 dark:hover:border-rose-500 dark:hover:text-white"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Coba lagi
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900">
              <form onSubmit={submitQuestion}>
                <div
                  className={`rounded-xl border bg-white p-1.5 shadow-xs transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 dark:bg-slate-950 ${
                    isLoading
                      ? 'border-slate-200 dark:border-slate-800'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <label htmlFor="ai-query-question" className="sr-only">
                    Pertanyaan untuk TEMAN AI
                  </label>
                  <textarea
                    ref={questionRef}
                    id="ai-query-question"
                    rows={1}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    maxLength={400}
                    autoComplete="off"
                    aria-describedby="ai-query-hint"
                    placeholder="Tanya tentang kompetisi, tugas, atau deadline…"
                    className="block max-h-28 min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-[13px] leading-5 text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
                    <span
                      id="ai-query-hint"
                      className="font-mono text-[9px] tracking-[0.08em] text-slate-400 uppercase dark:text-slate-500"
                    >
                      Enter kirim · Shift+Enter baris
                    </span>
                    <div className="flex items-center gap-2">
                      {question.length > 320 && (
                        <span className="font-mono text-[9px] tabular-nums text-slate-400 dark:text-slate-500">
                          {question.length}/400
                        </span>
                      )}
                      <button
                        type="submit"
                        aria-label={
                          isLoading ? 'Pertanyaan sedang diproses' : 'Kirim pertanyaan'
                        }
                        title="Kirim pertanyaan"
                        disabled={!question.trim() || isLoading}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:bg-blue-600 dark:hover:bg-blue-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                      >
                        {isLoading ? (
                          <span
                            aria-hidden="true"
                            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                          />
                        ) : (
                          <ArrowUp className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
