// Client-safe helpers shared by forms, cards and the service layer. No server imports here.
export const CONDITION_VALUES = ["LIKE_NEW", "GOOD", "USED"] as const;
export type ConditionValue = (typeof CONDITION_VALUES)[number];

export const CONDITION_LABEL: Record<ConditionValue, string> = { LIKE_NEW: "Like new", GOOD: "Good", USED: "Used" };

export const STATUS_VALUES = ["ACTIVE", "PAUSED", "SOLD", "REMOVED"] as const;
export type StatusValue = (typeof STATUS_VALUES)[number];
export const STATUS_LABEL: Record<StatusValue, string> = { ACTIVE: "Live", PAUSED: "Paused", SOLD: "Sold", REMOVED: "Removed" };

export const SORT_VALUES = ["newest", "price_asc", "price_desc"] as const;
export type SortValue = (typeof SORT_VALUES)[number];
export const SORT_LABEL: Record<SortValue, string> = { newest: "Newest first", price_asc: "Price: low to high", price_desc: "Price: high to low" };

export const MAX_IMAGES = 5;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // raw file the server will accept
export const PAGE_SIZE = 12;

export interface ListingCardData {
  id: string; title: string; description: string; categorySlug: string; categoryName: string;
  condition: ConditionValue; price: number; originalPrice: number | null; campusName: string;
  image: string | null; imageAlt: string; status: StatusValue;
}
