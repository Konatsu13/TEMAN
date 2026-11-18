import type { Json } from '../types/database.types';

export interface SupportingLink {
  label: string;
  url: string;
}

export interface CompetitionLinkSource {
  guidebook_url: string | null;
  figma_url: string | null;
  github_url: string | null;
  instagram_url: string | null;
  other_links: Json;
}

export function getCompetitionLinks(
  competition: CompetitionLinkSource
): SupportingLink[] {
  const links: SupportingLink[] = [
    { label: 'Guidebook', url: competition.guidebook_url || '' },
    { label: 'Figma', url: competition.figma_url || '' },
    { label: 'GitHub', url: competition.github_url || '' },
    { label: 'Instagram', url: competition.instagram_url || '' },
  ].filter((link) => link.url);

  if (Array.isArray(competition.other_links)) {
    for (const entry of competition.other_links) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      if (typeof entry.label !== 'string' || typeof entry.url !== 'string') continue;
      if (entry.label.trim() && entry.url.trim()) {
        links.push({ label: entry.label, url: entry.url });
      }
    }
  }

  return links;
}

export function buildCompetitionLinkPayload(links: SupportingLink[]) {
  const remaining = links
    .map(({ label, url }) => ({ label: label.trim(), url: url.trim() }))
    .filter((link) => link.label && link.url);

  const takeLegacyLink = (label: string) => {
    const index = remaining.findIndex(
      (link) => link.label.toLowerCase() === label.toLowerCase()
    );
    if (index === -1) return null;
    return remaining.splice(index, 1)[0].url;
  };

  return {
    guidebook_url: takeLegacyLink('Guidebook'),
    figma_url: takeLegacyLink('Figma'),
    github_url: takeLegacyLink('GitHub'),
    instagram_url: takeLegacyLink('Instagram'),
    other_links: remaining,
  };
}
