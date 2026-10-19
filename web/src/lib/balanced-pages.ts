import type { CopyItem, FactItem, MarketingState } from '../types';

export const VALID_CONCEPT_IDS = [
  'recruitment-announcement',
  'recruitment-team',
  'property-architecture',
  'property-brochure',
  'food-hero',
  'food-menu',
] as const;

export function balancedPages<T>(items: readonly T[], maxPerPage: number = 3): T[][] {
  if (!Number.isFinite(maxPerPage) || maxPerPage <= 0 || !Number.isInteger(maxPerPage)) {
    throw new RangeError("maxPerPage must be a positive integer.");
  }
  if (items.length === 0) {
    return [[]];
  }

  const numPages = Math.ceil(items.length / maxPerPage);
  const baseSize = Math.floor(items.length / numPages);
  let remainder = items.length % numPages;

  const pages: T[][] = [];
  let startIndex = 0;

  for (let i = 0; i < numPages; i++) {
    const pageSize = baseSize + (remainder > 0 ? 1 : 0);
    remainder--;
    pages.push(items.slice(startIndex, startIndex + pageSize));
    startIndex += pageSize;
  }

  return pages;
}

export function pageAt<T>(pages: T[][], index: number): { items: T[]; index: number; offset: number } {
  let normalizedIndex = Math.floor(index);
  if (!Number.isFinite(normalizedIndex) || Number.isNaN(normalizedIndex)) normalizedIndex = 0;
  if (normalizedIndex < 0) normalizedIndex = 0;
  if (pages.length > 0 && normalizedIndex >= pages.length) normalizedIndex = pages.length - 1;
  
  let offset = 0;
  for (let i = 0; i < normalizedIndex; i++) {
    offset += pages[i]?.length ?? 0;
  }

  return {
    items: pages[normalizedIndex] ?? [],
    index: normalizedIndex,
    offset
  };
}

export function normalizePointList(input?: readonly (string | null | undefined)[] | string | null): string[] {
  if (!input) return [];
  const rawList = typeof input === 'string' ? [input] : Array.isArray(input) ? input : [];
  const out: string[] = [];
  for (const entry of rawList) {
    if (typeof entry !== 'string') continue;
    const lines = entry.split(/\r?\n|\r/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        out.push(trimmed);
      }
    }
  }
  return out;
}

export function normalizePerPage(maxPerPage?: number | null): number {
  const n = Number(maxPerPage);
  if (Number.isInteger(n) && n > 0) return n;
  return 3;
}

export function slicePages<T>(items: readonly T[], maxPerPage: number = 3): T[][] {
  const perPage = normalizePerPage(maxPerPage);
  if (items.length === 0) {
    return [[]];
  }
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage));
  }
  return pages;
}

export function isValidIndustryConcept(
  state?: Pick<MarketingState, 'conceptId' | 'categoryId'> | null
): boolean {
  const cId = state?.conceptId;
  if (!cId || !(VALID_CONCEPT_IDS as readonly string[]).includes(cId)) {
    return false;
  }
  if (state?.categoryId && !cId.startsWith(state.categoryId + '-')) {
    return false;
  }
  return true;
}

export interface StorySourceStateLike {
  conceptId?: string;
  categoryId?: string;
  details?: string;
  facts?: readonly FactItem[] | null;
  storyPage?: number;
  storyPerPage?: number;
  copies?: {
    story?: CopyItem;
    [key: string]: CopyItem | undefined;
  };
}

export interface ResolvedStorySource {
  isConcept: boolean;
  items: string[];
  perPage: number;
  pages: string[][];
  totalPages: number;
  pageIndex: number;
  pageItems: string[];
  pageOffset: number;
}

const SNAPSHOT_ITEMS_KEY = '__resolvedStoryItems';

export function resolveStoryPoints(
  state?: StorySourceStateLike | null,
  copy?: CopyItem | null
): string[] {
  const targetCopy = copy ?? state?.copies?.story ?? null;

  if (targetCopy && Array.isArray((targetCopy as any)[SNAPSHOT_ITEMS_KEY])) {
    return [...(targetCopy as any)[SNAPSHOT_ITEMS_KEY]];
  }
  if (!copy && state && Array.isArray((state as any)[SNAPSHOT_ITEMS_KEY])) {
    return [...(state as any)[SNAPSHOT_ITEMS_KEY]];
  }

  // 1. Explicit manual points (including intentionally empty pointsEdited === true) take precedence.
  if (targetCopy?.pointsEdited === true) {
    return normalizePointList(targetCopy.points);
  }

  // 2. Industry-concept mode uses concept points without legacy details/facts fallback.
  if (isValidIndustryConcept(state)) {
    return normalizePointList(targetCopy?.points);
  }

  // 3. Unmigrated legacy drafts: nonempty copy.points -> selected facts -> nonblank details lines.
  const copyPoints = normalizePointList(targetCopy?.points);
  if (copyPoints.length > 0) {
    return copyPoints;
  }

  const selectedFacts = Array.isArray(state?.facts)
    ? normalizePointList(
        state.facts
          .filter((f): f is FactItem => Boolean(f && f.selected && typeof f.text === 'string'))
          .map((f) => f.text)
      )
    : [];
  if (selectedFacts.length > 0) {
    return selectedFacts;
  }

  return normalizePointList(state?.details);
}

export function resolveStorySource(
  state?: StorySourceStateLike | null,
  copy?: CopyItem | null
): ResolvedStorySource {
  const targetCopy = copy ?? state?.copies?.story ?? null;
  const isConcept = isValidIndustryConcept(state);
  const items = resolveStoryPoints(state, targetCopy);
  const perPage = normalizePerPage(state?.storyPerPage);
  const pages = isConcept ? balancedPages(items, perPage) : slicePages(items, perPage);
  const totalPages = pages.length;
  const current = pageAt(pages, state?.storyPage ?? 0);

  return {
    isConcept,
    items,
    perPage,
    pages,
    totalPages,
    pageIndex: current.index,
    pageItems: current.items,
    pageOffset: current.offset,
  };
}

export function clampStoryPageInState<T extends StorySourceStateLike>(state: T): T {
  if (!state || typeof state !== 'object') return state;
  const resolved = resolveStorySource(state, state.copies?.story);
  if ((state.storyPage ?? 0) === resolved.pageIndex) {
    return state;
  }
  return {
    ...state,
    storyPage: resolved.pageIndex,
  };
}

export function snapshotStoryState<T extends StorySourceStateLike>(snapshot: T): ResolvedStorySource {
  const resolved = resolveStorySource(snapshot, snapshot?.copies?.story);
  const frozenItems = Object.freeze([...resolved.items]);
  if (snapshot && typeof snapshot === 'object') {
    Object.defineProperty(snapshot, SNAPSHOT_ITEMS_KEY, {
      value: frozenItems,
      enumerable: false,
      configurable: true,
      writable: false,
    });
    if (snapshot.copies?.story) {
      const nextStoryCopy: CopyItem = {
        ...snapshot.copies.story,
        points: [...resolved.items],
      };
      Object.defineProperty(nextStoryCopy, SNAPSHOT_ITEMS_KEY, {
        value: frozenItems,
        enumerable: false,
        configurable: true,
        writable: false,
      });
      snapshot.copies = {
        ...snapshot.copies,
        story: nextStoryCopy,
      };
    }
  }
  return resolved;
}

export function createExportSnapshot<T extends StorySourceStateLike>(liveState: T): {
  snapshot: T;
  storySource: ResolvedStorySource;
} {
  const snapshot = structuredClone(liveState);
  const storySource = snapshotStoryState(snapshot);
  return {
    snapshot,
    storySource,
  };
}

export function stripLeadingEnumeration(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // 1. Labeled step prefixes: "Bước 1: ", "CHẶNG 01 - ", "Step 2. ", "Phần 1: "
  const labeledRegex = /^(?:bước|mục|phần|điều|khoản|chặng|bài|tiết|giai\s+đoạn|step|part|item|phase)\s+\d{1,2}(?:\s*[:.)\/:–—-]\s*|\s+)/i;
  const labeledMatch = trimmed.match(labeledRegex);
  if (labeledMatch) {
    const stripped = trimmed.slice(labeledMatch[0].length).trim();
    if (stripped.length > 0) return stripped;
  }

  // 2. Bracketed or parenthesized numbers: "(1) ", "[01] ", "1) ", "01) "
  // Must NOT match "(100% remote)" or "(45 - 65 triệu)"
  const bracketedRegex = /^(?:\(?\d{1,2}\)|\[\d{1,2}\])\s*/;
  const bracketedMatch = trimmed.match(bracketedRegex);
  if (bracketedMatch) {
    const stripped = trimmed.slice(bracketedMatch[0].length).trim();
    if (stripped.length > 0) return stripped;
  }

  // 3. Roman numerals or letter bullets with delimiter: "I. ", "II) ", "a. ", "B) "
  const romanOrLetterRegex = /^(?:[IVXLCDM]+|[ivxlcdm]+|[A-Za-z])[\.\):]\s+/;
  const romanMatch = trimmed.match(romanOrLetterRegex);
  if (romanMatch) {
    const stripped = trimmed.slice(romanMatch[0].length).trim();
    if (stripped.length > 0) return stripped;
  }

  // 4. Digits (1-2 digits) with delimiter:
  // - Dot: "1. ", "01. ", "10. " (must NOT match "1.5 triệu", "4.5 sao", "15.000.000")
  // - Colon: "1: ", "01: " (must NOT match "08:30")
  // - Dash: "1 - ", "01 – " (must NOT match "45 - 65 triệu", "1-2 năm")
  // - Slash: "1/ ", "01/ " (must NOT match "15/10/2026", "24/7", "1/2 chén")
  const delimitedRegex = /^\d{1,2}(?:\.(?!\d)\s*|:(?!\s*\d)\s*|\s*[-–—](?!\s*\d)\s*|\/(?!\s*\d)\s*)/;
  const delimitedMatch = trimmed.match(delimitedRegex);
  if (delimitedMatch) {
    const stripped = trimmed.slice(delimitedMatch[0].length).trim();
    if (stripped.length > 0) return stripped;
  }

  return trimmed;
}

export interface BalancedPagesFn {
  <T>(items: readonly T[], maxPerPage?: number): T[][];
  resolveStorySource: typeof resolveStorySource;
  resolveStoryPoints: typeof resolveStoryPoints;
  snapshotStory: typeof snapshotStoryState;
  clampStoryPageInState: typeof clampStoryPageInState;
  createExportSnapshot: typeof createExportSnapshot;
  stripLeadingEnumeration: typeof stripLeadingEnumeration;
}

(balancedPages as BalancedPagesFn).resolveStorySource = resolveStorySource;
(balancedPages as BalancedPagesFn).resolveStoryPoints = resolveStoryPoints;
(balancedPages as BalancedPagesFn).snapshotStory = snapshotStoryState;
(balancedPages as BalancedPagesFn).clampStoryPageInState = clampStoryPageInState;
(balancedPages as BalancedPagesFn).createExportSnapshot = createExportSnapshot;
(balancedPages as BalancedPagesFn).stripLeadingEnumeration = stripLeadingEnumeration;
