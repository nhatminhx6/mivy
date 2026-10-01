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
