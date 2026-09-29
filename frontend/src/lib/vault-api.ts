import { apiError, apiFetch } from "./api";
import type { BatchDeleteResult, CreatorStats, MediaCountResult, MediaItem, ToggleFavoriteResult } from "./types";

const API = "/api";

export type MediaQueryArgs = {
  platform?: string | null;
  creator?: string | null;
  is_favorite?: boolean | null;
  media_type?: string | null;
  q?: string | null;
  limit?: number;
  offset?: number;
};

function queryString(args: MediaQueryArgs = {}): string {
  const params = new URLSearchParams();
  if (args.platform && args.platform !== "all") params.set("platform", args.platform);
  if (args.creator) params.set("creator", args.creator);
  if (args.is_favorite != null) params.set("is_favorite", String(args.is_favorite));
  if (args.media_type && args.media_type !== "all") params.set("media_type", args.media_type);
  if (args.q) params.set("q", args.q);
  if (args.limit != null) params.set("limit", String(args.limit));
  if (args.offset != null) params.set("offset", String(args.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchMedia(args: MediaQueryArgs = {}): Promise<MediaItem[]> {
  const res = await apiFetch(`${API}/media${queryString(args)}`);
  if (!res.ok) throw new Error(await apiError(res, "Failed to load media"));
  return res.json();
}

export async function fetchMediaCount(args: MediaQueryArgs = {}): Promise<number> {
  const res = await apiFetch(`${API}/media/count${queryString(args)}`);
  if (!res.ok) throw new Error(await apiError(res, "Failed to load media count"));
  const data: MediaCountResult = await res.json();
  return typeof data.count === "number" ? data.count : 0;
}

export async function fetchCreators(): Promise<CreatorStats[]> {
  const res = await apiFetch(`${API}/media/creators`);
  if (!res.ok) throw new Error(await apiError(res, "Failed to load creators"));
  return res.json();
}

export async function batchDeleteMedia(mediaIds: number[]): Promise<number> {
  const res = await apiFetch(`${API}/media/batch-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_ids: mediaIds }),
  });
  if (!res.ok) throw new Error(await apiError(res, "Batch delete failed"));
  const data: BatchDeleteResult = await res.json();
  return typeof data.deleted_count === "number" ? data.deleted_count : mediaIds.length;
}

export async function batchDownloadZip(mediaIds: number[]): Promise<Blob> {
  const res = await apiFetch(`${API}/media/batch-zip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_ids: mediaIds }),
  });
  if (!res.ok) throw new Error(await apiError(res, "Batch download failed"));
  return res.blob();
}

export async function toggleFavorite(itemId: number, isFavorite?: boolean): Promise<ToggleFavoriteResult> {
  const init: RequestInit = { method: "PATCH" };
  if (isFavorite !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify({ is_favorite: isFavorite });
  }
  const res = await apiFetch(`${API}/media/${itemId}/favorite`, init);
  if (!res.ok) throw new Error(await apiError(res, "Failed to toggle favorite"));
  return res.json();
}

export async function deleteMedia(itemId: number): Promise<void> {
  const res = await apiFetch(`${API}/media/${itemId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await apiError(res, "Failed to delete media"));
}
