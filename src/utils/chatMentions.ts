export const AI_MENTION_HANDLES = ['ai', 'teman'] as const;

export type AiMentionHandle = (typeof AI_MENTION_HANDLES)[number];

export interface MentionQuery {
  query: string;
  start: number;
  end: number;
}

export type ChatContentToken =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string; handle: string }
  | { type: 'link'; value: string; href: string };

const MENTION_HANDLE = /^[a-zA-Z0-9_.]+$/;
const AI_MENTION_PATTERN =
  /(^|[^a-zA-Z0-9_@/])@(ai|teman)(?!\.?[a-zA-Z0-9_-])/i;
const MENTION_TOKEN_PATTERN = /@[a-zA-Z0-9_](?:[a-zA-Z0-9_.]*[a-zA-Z0-9_])?/;

export function isAiMentionHandle(handle: string): boolean {
  return AI_MENTION_HANDLES.includes(handle.toLowerCase() as AiMentionHandle);
}

/**
 * Returns true when a message asks the assistant to answer. Handles `@ai` and
 * the friendlier `@teman` alias, but only at the start of a word so email
 * addresses and ordinary text do not trigger the assistant.
 */
export function hasAiMention(value: string): boolean {
  return AI_MENTION_PATTERN.test(value);
}

/**
 * Finds the `@handle` token currently being typed at the caret. Returns null
 * when the caret is outside a mention token.
 */
export function getMentionQuery(value: string, caret: number): MentionQuery | null {
  const safeCaret = Math.max(0, Math.min(caret, value.length));
  const beforeCaret = value.slice(0, safeCaret);
  const match = /(^|[^a-zA-Z0-9_@/])@([a-zA-Z0-9_.]*)$/.exec(beforeCaret);
  if (!match) return null;

  const query = match[2];
  if (query.length > 30) return null;

  return {
    query,
    start: safeCaret - query.length - 1,
    end: safeCaret,
  };
}

/**
 * Replaces the active mention token with a complete handle and a trailing
 * space, returning the next caret position.
 */
export function applyMention(
  value: string,
  mention: MentionQuery,
  handle: string
): { value: string; caret: number } {
  const normalized = handle.replace(/^@/, '');
  if (!MENTION_HANDLE.test(normalized)) {
    return { value, caret: mention.end };
  }

  const nextCharacter = value.slice(mention.end, mention.end + 1);
  const needsSpace = !nextCharacter || !/[\s.,!?;:)\]}]/.test(nextCharacter);
  const insertion = `@${normalized}${needsSpace ? ' ' : ''}`;

  return {
    value: `${value.slice(0, mention.start)}${insertion}${value.slice(mention.end)}`,
    caret: mention.start + insertion.length,
  };
}

/**
 * Extracts unique usernames mentioned in a message, excluding assistant
 * handles. Used to create in-app mention notifications.
 */
export function extractMentionedUsernames(value: string): string[] {
  const usernames = new Set<string>();
  const matcher = new RegExp(MENTION_TOKEN_PATTERN.source, 'g');

  for (const match of value.matchAll(matcher)) {
    const index = match.index ?? 0;
    const previous = value.slice(Math.max(0, index - 1), index);
    if (/[a-zA-Z0-9_@/]/.test(previous)) continue;

    const username = match[0].slice(1).toLowerCase();
    if (!isAiMentionHandle(username)) {
      usernames.add(username);
    }
  }

  return [...usernames];
}

/**
 * Splits message content into plain text, mention, and link tokens so the UI
 * can render mentions and safe external links without dangerouslySetInnerHTML.
 */
export function tokenizeChatContent(value: string): ChatContentToken[] {
  if (!value) return [];

  const tokens: ChatContentToken[] = [];
  const matcher =
    /((?:https?:\/\/|www\.)[^\s<]+|@[a-zA-Z0-9_](?:[a-zA-Z0-9_.]*[a-zA-Z0-9_])?)/gi;
  let lastIndex = 0;

  for (const match of value.matchAll(matcher)) {
    const index = match.index ?? 0;
    const raw = match[0];
    const previous = value.slice(Math.max(0, index - 1), index);

    if (raw.startsWith('@') && /[a-zA-Z0-9_@]/.test(previous)) {
      // Part of an email address or an already-running word, not a mention.
      continue;
    }

    if (index > lastIndex) {
      tokens.push({ type: 'text', value: value.slice(lastIndex, index) });
    }

    if (raw.startsWith('@')) {
      tokens.push({
        type: 'mention',
        value: raw,
        handle: raw.slice(1).toLowerCase(),
      });
    } else {
      let url = raw;
      let trailing = '';
      while (/[.,!?;:)\]}]+$/.test(url)) {
        trailing = `${url.slice(-1)}${trailing}`;
        url = url.slice(0, -1);
      }

      tokens.push({
        type: 'link',
        value: url,
        href: url.startsWith('www.') ? `https://${url}` : url,
      });

      if (trailing) {
        tokens.push({ type: 'text', value: trailing });
      }
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < value.length) {
    tokens.push({ type: 'text', value: value.slice(lastIndex) });
  }

  return tokens;
}
