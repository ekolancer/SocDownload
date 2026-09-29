import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  batchDeleteMedia,
  batchDownloadZip,
  fetchMedia,
  fetchMediaCount,
  fetchCreators,
  toggleFavorite,
} from "./vault-api";

function mockFetch(response: Partial<Response>) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
    blob: async () => new Blob([new Uint8Array([1, 2, 3])]),
    ...response,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("vault-api URL contract", () => {
  it("fetchMedia hits /api/media with query params", async () => {
    const fetchMock = mockFetch({ json: async () => [] });
    await fetchMedia({ platform: "instagram", limit: 50, offset: 100 });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/media?");
    expect(String(url)).toContain("platform=instagram");
    expect(String(url)).toContain("limit=50");
    expect(String(url)).toContain("offset=100");
  });

  it("fetchMediaCount hits /api/media/count", async () => {
    const fetchMock = mockFetch({ json: async () => ({ count: 3 }) });
    const result = await fetchMediaCount({ q: "cat" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/media/count?");
    expect(result).toBe(3);
  });

  it("fetchCreators hits /api/media/creators", async () => {
    const fetchMock = mockFetch({ json: async () => [] });
    await fetchCreators();
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/media/creators");
  });

  it("batchDeleteMedia POSTs to /api/media/batch-delete", async () => {
    const fetchMock = mockFetch({ json: async () => ({ deleted_count: 2 }) });
    const deleted = await batchDeleteMedia([1, 2]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/media/batch-delete");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ media_ids: [1, 2] });
    expect(deleted).toBe(2);
  });

  it("batchDownloadZip POSTs to /api/media/batch-zip (bug guard)", async () => {
    const fetchMock = mockFetch({});
    await batchDownloadZip([4, 5]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/media/batch-zip");
    expect(String(url)).not.toContain("download-zip");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ media_ids: [4, 5] });
  });

  it("batchDownloadZip throws when the response is not ok", async () => {
    mockFetch({ ok: false, status: 413, json: async () => ({ detail: "Export is too large" }) });
    await expect(batchDownloadZip([4, 5])).rejects.toThrow("Export is too large");
  });

  it("toggleFavorite PATCHes /api/media/{id}/favorite", async () => {
    const fetchMock = mockFetch({ json: async () => ({ id: 7, is_favorite: true }) });
    const result = await toggleFavorite(7);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/media/7/favorite");
    expect(init?.method).toBe("PATCH");
    expect(result.is_favorite).toBe(true);
  });
});
