import { useRef, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowUp } from 'lucide-react';
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
        maxWidth="xl"
      >
        <div className="space-y-4">
          {conversation.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Tanyakan ringkasan kompetisi, tugas, progres, atau biaya yang dapat
                Anda akses.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setQuestion(suggestion);
                      questionRef.current?.focus();
                    }}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              role="log"
              aria-label="Percakapan dengan Asisten Data TEMAN"
              aria-live="polite"
              aria-relevant="additions"
              className="max-h-[48vh] min-h-28 space-y-4 overflow-y-auto pr-1"
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

          <form onSubmit={submitQuestion} className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div
              className={`relative rounded-xl border bg-white transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 dark:bg-slate-950 ${
                isLoading
                  ? 'border-slate-200 dark:border-slate-800'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
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
                disabled={isLoading}
                aria-label="Pertanyaan"
                placeholder="Contoh: Berapa tugas yang sudah selesai?"
                className="block min-h-14 w-full resize-none bg-transparent px-3.5 py-3 pr-14 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:text-slate-500"
              />
              <Button
                type="submit"
                aria-label={isLoading ? 'Pertanyaan sedang diproses' : 'Kirim pertanyaan'}
                title="Kirim pertanyaan"
                disabled={!question.trim() || isLoading}
                isLoading={isLoading}
                className="absolute bottom-1.5 right-1.5 h-10 w-10 px-0"
                leftIcon={<ArrowUp className="h-4 w-4" />}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pertanyaan dikirim ke Gemini; isi data tetap di database. Enter untuk
              kirim, Shift+Enter untuk baris baru.
            </p>
          </form>
        </div>
      </Modal>
    </>
  );
}
