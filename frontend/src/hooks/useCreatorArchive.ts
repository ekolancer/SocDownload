import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMedia, fetchMediaCount, type MediaQueryArgs } from "@/lib/vault-api";

export const CREATOR_PAGE_SIZE = 90;
const CREATOR_POLL_MS = 10_000;

export type CreatorArchiveFilters = {
  creator: string | null;
  platform?: string | null;
  media_type?: string | null;
  q?: string | null;
};

export type CreatorArchive<T> = {
  items: T[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  removeItem: (id: number) => void;
  patchItem: (id: number, changes: Partial<T>) => void;
};

/**
 * Server-side paginated archive for one creator. Owns the first page, the
 * scroll-more append, a 10s refresh and the request/offset bookkeeping so the
 * page only renders the result.
 */
export function useCreatorArchive<T extends { id: number }>(
  filters: CreatorArchiveFilters,
): CreatorArchive<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const offsetRef = useRef(0);
  const requestRef = useRef(0);

  const { creator, platform = null, media_type = null, q = null } = filters;

  const buildArgs = useCallback(
    (offset: number): MediaQueryArgs => ({
      creator,
      platform,
      media_type,
      q: q && q.trim() ? q.trim() : null,
      limit: CREATOR_PAGE_SIZE,
      offset,
    }),
    [creator, platform, media_type, q],
  );

  const fetchFirstPage = useCallback(async () => {
    if (!creator) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const args = buildArgs(0);
      const [data, count] = await Promise.all([
        fetchMedia(args).catch(() => null),
        fetchMediaCount({ ...args, limit: undefined, offset: undefined }).catch(() => null),
      ]);
      if (requestId !== requestRef.current) return;
      if (data) {
        setItems(data as T[]);
        offsetRef.current = data.length;
        setHasMore(data.length >= CREATOR_PAGE_SIZE);
      }
      if (count !== null) setTotal(count);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [creator, buildArgs]);

  const loadMore = useCallback(() => {
    if (!creator || loading || loadingMore || !hasMore) return;
    const requestId = requestRef.current;
    setLoadingMore(true);
    void fetchMedia(buildArgs(offsetRef.current))
      .then((data) => {
        if (requestId !== requestRef.current) return;
        if (data.length === 0) {
          setHasMore(false);
          return;
        }
        setItems((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...(data as T[]).filter((m) => !seen.has(m.id))];
        });
        offsetRef.current += data.length;
        setHasMore(data.length >= CREATOR_PAGE_SIZE);
      })
      .catch(() => undefined)
      .finally(() => {
        if (requestId === requestRef.current) setLoadingMore(false);
      });
  }, [creator, loading, loadingMore, hasMore, buildArgs]);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((m) => m.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

  const patchItem = useCallback((id: number, changes: Partial<T>) => {
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes } : m)));
  }, []);

  // Reset & reload whenever the creator or its filters change.
  useEffect(() => {
    if (!creator) {
      requestRef.current += 1;
      offsetRef.current = 0;
      setItems([]);
      setTotal(0);
      setHasMore(false);
      return;
    }
    offsetRef.current = 0;
    void fetchFirstPage();
  }, [creator, platform, media_type, q, fetchFirstPage]);

  // Keep the first page fresh on a slow poll.
  useEffect(() => {
    if (!creator) return;
    const interval = setInterval(() => void fetchFirstPage(), CREATOR_POLL_MS);
    return () => clearInterval(interval);
  }, [creator, fetchFirstPage]);

  return { items, total, loading, loadingMore, hasMore, loadMore, refresh: fetchFirstPage, removeItem, patchItem };
}
