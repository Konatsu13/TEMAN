import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { AlertCircle, AtSign, Reply, Send, Sparkles, X } from 'lucide-react';
import type { ChatMessage, ChatParticipant } from '../../services/chatService';
import { getInitials } from '../../utils/formatters';
import {
  applyMention,
  getMentionQuery,
  hasAiMention,
  type MentionQuery,
} from '../../utils/chatMentions';
import { Badge } from '../ui/Badge';

interface ChatComposerProps {
  value: string;
  onValueChange: (value: string) => void;
  onSend: (content: string) => Promise<void>;
  participants: ChatParticipant[];
  currentUserId: string;
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
  sending: boolean;
  error: string | null;
  onClearError: () => void;
  disabled?: boolean;
}

interface MentionOption {
  key: string;
  type: 'ai' | 'member';
  handle: string;
  label: string;
  description: string;
  role?: ChatParticipant['role'];
}

export function ChatComposer({
  value,
  onValueChange,
  onSend,
  participants,
  currentUserId,
  replyTo = null,
  onCancelReply,
  sending,
  error,
  onClearError,
  disabled = false,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const [mention, setMention] = useState<MentionQuery | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;

    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    if (!value) {
      setMention(null);
      setActiveIndex(0);
    }
  }, [value]);

  useEffect(() => {
    if (!mention) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!composerRef.current?.contains(event.target as Node)) {
        setMention(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [mention]);

  const suggestions = useMemo<MentionOption[]>(() => {
    if (!mention) return [];

    const query = mention.query.toLowerCase();
    const options: MentionOption[] = [];

    if (!query || 'ai'.startsWith(query) || 'teman'.startsWith(query)) {
      const aiHandle =
        query && 'teman'.startsWith(query) && !'ai'.startsWith(query)
          ? 'teman'
          : 'ai';

      options.push({
        key: 'ai',
        type: 'ai',
        handle: aiHandle,
        label: 'TEMAN AI',
        description: 'Jawab dengan konteks workspace yang boleh Anda akses',
      });
    }

    const members = participants
      .filter((participant) => participant.id !== currentUserId)
      .filter(
        (participant) =>
          !query ||
          participant.username.toLowerCase().includes(query) ||
          participant.full_name.toLowerCase().includes(query)
      )
      .slice(0, 6)
      .map<MentionOption>((participant) => ({
        key: `member-${participant.id}`,
        type: 'member',
        handle: participant.username,
        label: participant.full_name,
        description: `@${participant.username}`,
        role: participant.role,
      }));

    return [...options, ...members];
  }, [mention, participants, currentUserId]);

  const showSuggestions =
    Boolean(mention && suggestions.length > 0) && !disabled;

  const focusWithCaret = (caret: number) => {
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  };

  const selectSuggestion = (option: MentionOption) => {
    if (!mention) return;

    const result = applyMention(value, mention, option.handle);
    onValueChange(result.value);
    setMention(null);
    setActiveIndex(0);
    focusWithCaret(result.caret);
  };

  const insertText = (text: string): number => {
    const node = textareaRef.current;
    const start = node?.selectionStart ?? value.length;
    const end = node?.selectionEnd ?? value.length;
    const needsLeadingSpace =
      start > 0 && !/\s/.test(value.slice(start - 1, start)) && text.startsWith('@');
    const prefix = needsLeadingSpace ? ' ' : '';
    const next = `${value.slice(0, start)}${prefix}${text}${value.slice(end)}`;
    const caret = start + prefix.length + text.length;

    onValueChange(next);
    onClearError();
    focusWithCaret(caret);
    return caret;
  };

  const insertMentionTrigger = () => {
    const caret = insertText('@');
    setMention({ query: '', start: caret - 1, end: caret });
    setActiveIndex(0);
  };

  const insertAiMention = () => {
    insertText('@ai ');
    setMention(null);
  };

  const submit = async () => {
    const content = value.trim();
    if (!content || sending || disabled) return;

    try {
      await onSend(content);
    } catch {
      // The hook exposes a friendly error and the draft is intentionally kept.
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % suggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex(
          (current) => (current - 1 + suggestions.length) % suggestions.length
        );
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        const option = suggestions[activeIndex] ?? suggestions[0];
        if (option) selectSuggestion(option);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setMention(null);
        return;
      }
    }

    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void submit();
    }
  };

  const aiMentionActive = hasAiMention(value);
  const replyAuthorName = replyTo?.is_ai
    ? 'TEMAN AI'
    : replyTo?.author?.full_name ?? 'Anggota';

  return (
    <div
      ref={composerRef}
      className="relative shrink-0 border-t border-slate-200 bg-white px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900"
    >
      {showSuggestions && (
        <div
          id="chat-mention-list"
          role="listbox"
          aria-label="Saran mention"
          className="absolute inset-x-3 bottom-full z-20 mb-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="px-2 py-1.5 font-mono text-[9px] tracking-[0.12em] text-slate-400 uppercase dark:text-slate-500">
            Sebut anggota atau AI
          </div>
          {suggestions.map((option, index) => (
            <button
              key={option.key}
              type="button"
              role="option"
              id={`chat-mention-option-${index}`}
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(option)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
                index === activeIndex
                  ? 'bg-blue-50 dark:bg-blue-950/40'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold text-white ${
                  option.type === 'ai'
                    ? 'bg-slate-900 dark:bg-blue-600'
                    : 'bg-blue-600'
                }`}
              >
                {option.type === 'ai' ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  getInitials(option.label)
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {option.label}
                  </span>
                  {option.type === 'ai' ? (
                    <Badge variant="info" size="sm">
                      Asisten
                    </Badge>
                  ) : option.role ? (
                    <Badge
                      variant={option.role === 'owner' ? 'primary' : 'default'}
                      size="sm"
                    >
                      {option.role === 'owner' ? 'Owner' : 'Member'}
                    </Badge>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-[10.5px] text-slate-500 dark:text-slate-400">
                  {option.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] leading-5 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {replyTo && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-2 dark:border-blue-900/60 dark:bg-blue-950/30">
          <Reply
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-[0.08em] text-blue-700 uppercase dark:text-blue-300">
              Membalas {replyAuthorName}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-5 whitespace-pre-wrap text-slate-600 dark:text-slate-300">
              {replyTo.content}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClearError();
              onCancelReply?.();
            }}
            aria-label="Batalkan balasan"
            title="Batalkan balasan"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-blue-600 transition-colors hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none dark:text-blue-400 dark:hover:bg-blue-950/60"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-slate-300 bg-white shadow-xs transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-950">
          <label htmlFor="global-chat-message" className="sr-only">
            Tulis pesan Global Chat
          </label>
          <textarea
            ref={textareaRef}
            id="global-chat-message"
            rows={1}
            value={value}
            onChange={(event) => {
              const next = event.target.value;
              onValueChange(next);
              onClearError();
              setMention(
                getMentionQuery(next, event.target.selectionStart ?? next.length)
              );
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            onSelect={(event) => {
              const node = event.currentTarget;
              setMention(getMentionQuery(node.value, node.selectionStart));
            }}
            maxLength={2000}
            autoComplete="off"
            disabled={disabled}
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls={showSuggestions ? 'chat-mention-list' : undefined}
            aria-activedescendant={
              showSuggestions
                ? `chat-mention-option-${activeIndex}`
                : undefined
            }
            aria-describedby="global-chat-composer-hint"
            placeholder={
              replyTo
                ? `Balas ${replyAuthorName}… gunakan @ untuk mention atau @ai untuk bertanya ke AI`
                : 'Tulis pesan untuk tim… gunakan @ untuk mention atau @ai untuk bertanya ke AI'
            }
            className="block max-h-40 min-h-10 w-full resize-none bg-transparent px-3 py-2.5 text-[13px] leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-1 pb-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={insertMentionTrigger}
                disabled={disabled}
                aria-label="Sisipkan mention anggota"
                title="Mention anggota"
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10.5px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <AtSign className="h-3.5 w-3.5" aria-hidden="true" />
                Mention
              </button>
              <button
                type="button"
                onClick={insertAiMention}
                disabled={disabled}
                aria-label="Sisipkan mention AI"
                title="Tanya TEMAN AI"
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10.5px] font-medium text-blue-600 transition-colors hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Tanya AI
              </button>

              {aiMentionActive && (
                <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9.5px] font-medium text-blue-700 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-300">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  @ai akan membalas
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span
                id="global-chat-composer-hint"
                className="hidden font-mono text-[9px] tracking-[0.06em] text-slate-400 uppercase sm:inline dark:text-slate-500"
              >
                Enter kirim · Shift+Enter baris
              </span>
              {value.length > 1600 && (
                <span className="font-mono text-[9px] tabular-nums text-slate-400 dark:text-slate-500">
                  {value.length}/2000
                </span>
              )}
              <button
                type="submit"
                aria-label={sending ? 'Mengirim pesan' : 'Kirim pesan'}
                title="Kirim pesan"
                disabled={!value.trim() || sending || disabled}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:focus-visible:ring-offset-slate-950 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
              >
                {sending ? (
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
