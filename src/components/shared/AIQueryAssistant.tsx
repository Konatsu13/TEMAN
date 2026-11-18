import { useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowUp,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { askAIQuery } from '../../services/aiQueryService';
import type { AIQueryResult } from '../../utils/aiQueryResult';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ConversationEntry {
  id: number;
  question: string;
  result?: AIQueryResult;
  error?: string;
}

const SUGGESTED_QUESTIONS = [
  'Berapa kompetisi yang sedang aktif?',
  'Tampilkan tugas yang belum selesai',
  'Kompetisi mana yang deadline-nya paling dekat?',
];

export function AIQueryAssistant() {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(0);

  if (!session) return null;

  const submitQuestion = async (event?: FormEvent) => {
    event?.preventDefault();
    const submittedQuestion = question.trim();
    if (!submittedQuestion || isLoading) return;

    const id = nextId.current++;
    setQuestion('');
    setConversation((current) => [...current, { id, question: submittedQuestion }]);
    setIsLoading(true);

    try {
      const result = await askAIQuery(submittedQuestion);
      setConversation((current) =>
        current.map((entry) => (entry.id === id ? { ...entry, result } : entry))
      );
    } catch (error) {
      setConversation((current) =>
        current.map((entry) =>
          entry.id === id
            ? {
                ...entry,
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

  return (
    <>
      <button
        type="button"
        aria-label="Buka asisten AI"
        title="Tanya data TEMAN dengan AI"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-[linear-gradient(145deg,#59c9fb_0%,#4c68f5_55%,#a948f5_100%)] text-white transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/40 focus-visible:ring-offset-2 dark:border-slate-800 sm:bottom-8 sm:right-8"
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-10 w-10">
          <path
            d="M21.5 7.5c2.4 10.1 5 12.7 15 15-10 2.3-12.6 4.9-15 15-2.4-10.1-5-12.7-15-15 10-2.3 12.6-4.9 15-15Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <path
            d="M36 5.5c.8 3.3 1.7 4.2 5 5-3.3.8-4.2 1.7-5 5-.8-3.3-1.7-4.2-5-5 3.3-.8 4.2-1.7 5-5Z"
            fill="currentColor"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Asisten Data TEMAN"
        description="Ringkas informasi kompetisi dan tugas dari workspace Anda."
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {conversation.length === 0 ? (
            <div className="space-y-5">
              <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50/70 p-4 dark:border-blue-900/50 dark:from-blue-950/40 dark:to-indigo-950/30 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-blue-100 dark:bg-slate-900 dark:text-blue-300 dark:ring-blue-900/60">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Tanyakan dengan bahasa sehari-hari
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Cari ringkasan jumlah kompetisi, progres tugas, biaya, atau
                      tenggat tanpa menyusun filter sendiri.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-2 border-t border-blue-100/80 pt-3 text-xs leading-5 text-slate-600 dark:border-blue-900/50 dark:text-slate-300">
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  <p>
                    Jawaban mengikuti akses akun Anda. Data baris database tidak
                    dikirim ke AI.
                  </p>
                </div>
              </section>

              <section aria-labelledby="ai-query-suggestions">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <h4
                    id="ai-query-suggestions"
                    className="text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Mulai dari contoh
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Pilih untuk mengisi pertanyaan
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {SUGGESTED_QUESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setQuestion(suggestion);
                        questionRef.current?.focus();
                      }}
                      className="group flex min-h-14 items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-xs leading-5 text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                    >
                      <span>{suggestion}</span>
                      <ArrowUp
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 rotate-45 text-slate-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div
              role="log"
              aria-label="Percakapan dengan Asisten Data TEMAN"
              aria-live="polite"
              aria-relevant="additions"
              className="max-h-[48vh] min-h-36 space-y-5 overflow-y-auto pr-1"
            >
              {conversation.map((entry) => (
                <div key={entry.id} className="space-y-3">
                  <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm leading-6 text-white">
                    {entry.question}
                  </div>
                  {entry.result && (
                    <div className="max-w-full space-y-3 rounded-2xl rounded-bl-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                        {entry.result.answer}
                      </p>
                      {entry.result.rows.length > 0 && (
                        <div
                          role="region"
                          aria-label="Tabel hasil analisis"
                          tabIndex={0}
                          className="overflow-x-auto rounded-xl border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 dark:border-slate-800"
                        >
                          <table className="min-w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              <tr>
                                {entry.result.columns.map((column) => (
                                  <th
                                    key={column}
                                    scope="col"
                                    className="whitespace-nowrap px-3 py-2.5 font-semibold"
                                  >
                                    {column}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {entry.result.rows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {entry.result?.columns.map((column) => (
                                    <td
                                      key={column}
                                      className="max-w-64 px-3 py-2.5 text-slate-700 dark:text-slate-300"
                                    >
                                      {row[column] === null || row[column] === undefined
                                        ? '—'
                                        : String(row[column])}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                  {entry.error && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm leading-5 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{entry.error}</span>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div
                  role="status"
                  className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300"
                >
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  Sedang menyiapkan ringkasan…
                </div>
              )}
            </div>
          )}

          <form
            onSubmit={submitQuestion}
            className="space-y-2.5 border-t border-slate-100 pt-4 dark:border-slate-800"
          >
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="ai-query-question"
                className="text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Pertanyaan
              </label>
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {question.length}/400
              </span>
            </div>
            <div
              className={`relative rounded-xl border bg-white transition-colors focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:bg-slate-950 ${
                isLoading
                  ? 'border-slate-200 dark:border-slate-800'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              <textarea
                ref={questionRef}
                id="ai-query-question"
                rows={2}
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
                disabled={isLoading}
                aria-describedby="ai-query-keyboard-hint ai-query-privacy-note"
                placeholder="Contoh: Berapa tugas yang sudah selesai?"
                className="block min-h-24 w-full resize-none bg-transparent px-3.5 py-3 pr-14 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:text-slate-500"
              />
              <Button
                type="submit"
                aria-label={isLoading ? 'Pertanyaan sedang diproses' : 'Kirim pertanyaan'}
                title="Kirim pertanyaan"
                disabled={!question.trim() || isLoading}
                isLoading={isLoading}
                className="absolute bottom-2 right-2 h-10 w-10 px-0"
                leftIcon={<ArrowUp className="h-4 w-4" />}
              />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
              <p
                id="ai-query-keyboard-hint"
                className="text-xs text-slate-500 dark:text-slate-400"
              >
                Enter untuk kirim · Shift+Enter untuk baris baru
              </p>
              <p
                id="ai-query-privacy-note"
                className="flex items-start gap-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400"
              >
                <ShieldCheck
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                Pertanyaan dikirim ke Gemini; isi data tetap di database.
              </p>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
