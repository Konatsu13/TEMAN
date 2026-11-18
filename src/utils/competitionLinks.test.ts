import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCompetitionLinkPayload,
  getCompetitionLinks,
} from './competitionLinks';

test('getCompetitionLinks combines legacy link columns and additional links', () => {
  const links = getCompetitionLinks({
    guidebook_url: 'https://example.com/guide',
    figma_url: null,
    github_url: null,
    instagram_url: null,
    other_links: [{ label: 'Aturan lomba', url: 'https://example.com/rules' }],
  });

  assert.deepEqual(links, [
    { label: 'Guidebook', url: 'https://example.com/guide' },
    { label: 'Aturan lomba', url: 'https://example.com/rules' },
  ]);
});

test('buildCompetitionLinkPayload keeps known links in legacy columns and saves others as JSON', () => {
  const payload = buildCompetitionLinkPayload([
    { label: 'Guidebook', url: 'https://example.com/guide' },
    { label: 'Formulir', url: 'https://example.com/form' },
  ]);

  assert.deepEqual(payload, {
    guidebook_url: 'https://example.com/guide',
    figma_url: null,
    github_url: null,
    instagram_url: null,
    other_links: [{ label: 'Formulir', url: 'https://example.com/form' }],
  });
});
