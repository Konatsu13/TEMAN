import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMention,
  extractMentionedUsernames,
  getMentionQuery,
  hasAiMention,
  isAiMentionHandle,
  tokenizeChatContent,
} from './chatMentions';

test('hasAiMention detects @ai and @teman but not email addresses', () => {
  assert.equal(hasAiMention('@ai tolong ringkas deadline'), true);
  assert.equal(hasAiMention('Halo tim, @teman bantu cek progres'), true);
  assert.equal(hasAiMention('Tanyakan ke raka@teman.local'), false);
  assert.equal(hasAiMention('@ai-bukan mention'), false);
  assert.equal(hasAiMention('@ai.bukan mention'), false);
  assert.equal(hasAiMention('https://example.com/@ai'), false);
  assert.equal(hasAiMention('@ai.'), true);
  assert.equal(hasAiMention('Halo (@teman)!'), true);
  assert.equal(hasAiMention('tanpa mention'), false);
});

test('getMentionQuery finds the active token at the caret', () => {
  assert.deepEqual(getMentionQuery('Halo @ra', 8), {
    query: 'ra',
    start: 5,
    end: 8,
  });
  assert.deepEqual(getMentionQuery('@', 1), {
    query: '',
    start: 0,
    end: 1,
  });
  assert.equal(getMentionQuery('Halo raka', 9), null);
  assert.equal(getMentionQuery('Halo @raka lagi', 15), null);
});

test('applyMention replaces only the active token', () => {
  const mention = getMentionQuery('Halo @ra, cek ini', 8);
  assert.ok(mention);

  const result = applyMention('Halo @ra, cek ini', mention, 'raka');
  assert.equal(result.value, 'Halo @raka, cek ini');
  assert.equal(result.caret, 10);
});

test('extractMentionedUsernames returns unique member handles only', () => {
  assert.deepEqual(
    extractMentionedUsernames('@ai cek @Raka dan @siti, lalu @raka lagi'),
    ['raka', 'siti']
  );
  assert.deepEqual(extractMentionedUsernames('tanpa mention'), []);
});

test('isAiMentionHandle recognizes assistant aliases', () => {
  assert.equal(isAiMentionHandle('ai'), true);
  assert.equal(isAiMentionHandle('TEMAN'), true);
  assert.equal(isAiMentionHandle('raka'), false);
});

test('tokenizeChatContent separates mentions, links, and text', () => {
  assert.deepEqual(tokenizeChatContent('Halo @raka, buka https://example.com/docs.'), [
    { type: 'text', value: 'Halo ' },
    { type: 'mention', value: '@raka', handle: 'raka' },
    { type: 'text', value: ', buka ' },
    { type: 'link', value: 'https://example.com/docs', href: 'https://example.com/docs' },
    { type: 'text', value: '.' },
  ]);
  assert.deepEqual(tokenizeChatContent('@ai bantu'), [
    { type: 'mention', value: '@ai', handle: 'ai' },
    { type: 'text', value: ' bantu' },
  ]);
  assert.deepEqual(tokenizeChatContent(''), []);
});

test('tokenizeChatContent does not treat emails or trailing punctuation as mentions', () => {
  assert.deepEqual(
    tokenizeChatContent('Email raka@teman.local, halo @ai.'),
    [
      { type: 'text', value: 'Email raka@teman.local, halo ' },
      { type: 'mention', value: '@ai', handle: 'ai' },
      { type: 'text', value: '.' },
    ]
  );

  assert.deepEqual(tokenizeChatContent('Halo @raka.'), [
    { type: 'text', value: 'Halo ' },
    { type: 'mention', value: '@raka', handle: 'raka' },
    { type: 'text', value: '.' },
  ]);
});
