import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaItem } from "@/lib/types";
import { CREATOR_PAGE_SIZE, useCreatorArchive } from "./useCreatorArchive";

function makeItem(id: number, extra: Partial<MediaItem> = {}): MediaItem {
  return {
    id,
    platform: "instagram",
    source_url: `https://x/${id}`,
    username: "creator",
    caption: null,
    is_favorite: false,
    posted_at: null,
    created_at: null,
    files: [],
    ...extra,
  };
}

function stubFetch(handler: (url: string) => { ok?: boolean; json?: unknown }) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const { ok = true, json = {} } = handler(url) || {};
    return { ok, status: ok ? 200 : 500, json: async () => json, blob: async () => new Blob() } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useCreatorArchive", () => {
  it("loads the first page and total for a creator", async () => {
    stubFetch((url) => {
      if (url.includes("/media/count")) return { json: { count: 120 } };
      return { json: Array.from({ length: CREATOR_PAGE_SIZE }, (_, i) => makeItem(i + 1)) };
    });
    const { result } = renderHook(() => useCreatorArchive<MediaItem>({ creator: "rhmfskw" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(CREATOR_PAGE_SIZE);
    expect(result.current.total).toBe(120);
    expect(result.current.hasMore).toBe(true);
  });

  it("does nothing without a creator and clears state", async () => {
    const fetchMock = stubFetch(() => ({ json: [] }));
    const { result } = renderHook(() => useCreatorArchive<MediaItem>({ creator: null }));
    await act(async () => {});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it("appends the next page and dedupes", async () => {
    stubFetch((url) => {
      if (url.includes("/media/count")) return { json: { count: CREATOR_PAGE_SIZE + 1 } };
      if (url.includes("offset=0")) {
        return { json: Array.from({ length: CREATOR_PAGE_SIZE }, (_, i) => makeItem(i + 1)) };
      }
      return { json: [makeItem(CREATOR_PAGE_SIZE), makeItem(CREATOR_PAGE_SIZE + 1)] };
    });
    const { result } = renderHook(() => useCreatorArchive<MediaItem>({ creator: "c" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.loadingMore).toBe(false));
    const ids = result.current.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(CREATOR_PAGE_SIZE + 1);
  });

  it("removeItem drops the row and decrements total", async () => {
    stubFetch((url) => {
      if (url.includes("/media/count")) return { json: { count: 2 } };
      return { json: [makeItem(1), makeItem(2)] };
    });
    const { result } = renderHook(() => useCreatorArchive<MediaItem>({ creator: "c" }));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    act(() => result.current.removeItem(1));
    expect(result.current.items.map((i) => i.id)).toEqual([2]);
    expect(result.current.total).toBe(1);
  });

  it("patchItem merges changes into the row", async () => {
    stubFetch((url) => {
      if (url.includes("/media/count")) return { json: { count: 1 } };
      return { json: [makeItem(1, { is_favorite: false })] };
    });
    const { result } = renderHook(() => useCreatorArchive<MediaItem>({ creator: "c" }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    act(() => result.current.patchItem(1, { is_favorite: true }));
    expect(result.current.items[0].is_favorite).toBe(true);
  });

  it("switching creator resends with the new filter", async () => {
    const fetchMock = stubFetch((url) => {
      if (url.includes("/media/count")) return { json: { count: 0 } };
      return { json: [] };
    });
    const { rerender } = renderHook(({ creator }) => useCreatorArchive<MediaItem>({ creator }), {
      initialProps: { creator: "alpha" },
    });
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes("creator=alpha"))).toBe(true));
    rerender({ creator: "beta" });
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes("creator=beta"))).toBe(true));
  });
});
