/**
 * Shared API types.
 *
 * Component-owned interfaces stay defined next to their components (they are
 * the components' props contract); this module is the single import point for
 * API code so the network layer never reaches into a component folder.
 */
export type { MediaItem, MediaFile } from "@/components/modals/MediaLightboxModal";
export type { CreatorStats } from "@/components/vault/CreatorsHub";
export type { AlbumSummary } from "@/components/vault/VaultSidebar";
export type { JobRow, JobStats } from "@/components/studio/JobPipeline";
export type { CompletedJobNotice } from "@/components/studio/JobNotificationToast";

export type ToggleFavoriteResult = {
  id: number;
  is_favorite: boolean;
};

export type BatchDeleteResult = {
  deleted_count: number;
};

export type MediaCountResult = {
  count: number;
};
