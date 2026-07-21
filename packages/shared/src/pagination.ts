export type PagePaginationQuery = {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
};

export type PagePaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CursorPaginationQuery = {
  cursor?: string;
  limit?: number;
};

export type CursorPaginationMeta = {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function normalizePageLimit(
  page?: number,
  limit?: number,
  maxLimit = MAX_LIMIT,
): { page: number; limit: number; skip: number } {
  const safePage = Math.max(Number(page ?? DEFAULT_PAGE) || DEFAULT_PAGE, 1);
  const safeLimit = Math.min(
    Math.max(Number(limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1),
    maxLimit,
  );
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

export function pageMeta(
  page: number,
  limit: number,
  total: number,
): PagePaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

export function normalizeCursorLimit(
  limit?: number,
  maxLimit = MAX_LIMIT,
): number {
  return Math.min(
    Math.max(Number(limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1),
    maxLimit,
  );
}

/** Fetch limit+1 rows; if extra exists, nextCursor is last item's cursor value. */
export function cursorMeta<T>(
  rows: T[],
  limit: number,
  getCursor: (row: T) => string,
): { data: T[]; meta: CursorPaginationMeta } {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const last = data[data.length - 1];
  return {
    data,
    meta: {
      limit,
      nextCursor: hasMore && last ? getCursor(last) : null,
      hasMore,
    },
  };
}
