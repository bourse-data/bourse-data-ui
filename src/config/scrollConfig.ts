const DEFAULT_INFINITE_SCROLL_PREFETCH_PERCENT = 120;
const DEFAULT_INFINITE_SCROLL_MIN_PREFETCH_PX = 320;
const DEFAULT_INFINITE_SCROLL_PREFETCH_ITEMS_FROM_END = 15;

const parseOptionalPercent = (raw: string | undefined, fallbackPercent: number) => {
    if (!raw?.trim()) return fallbackPercent / 100;
    const normalized = raw.trim().replace(/%$/, '');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallbackPercent / 100;
    return Math.min(parsed, 200) / 100;
};

const parseOptionalPositiveInt = (raw: string | undefined, fallback: number) => {
    if (!raw?.trim()) return fallback;
    const parsed = Number(raw.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

export const INFINITE_SCROLL_PAGE_SIZE = 20;

export const scrollConfig = Object.freeze({
    infiniteScrollPrefetchRatio: parseOptionalPercent(
        import.meta.env.VITE_INFINITE_SCROLL_PREFETCH_RATIO,
        DEFAULT_INFINITE_SCROLL_PREFETCH_PERCENT
    ),
    infiniteScrollMinPrefetchPx: parseOptionalPositiveInt(
        import.meta.env.VITE_INFINITE_SCROLL_MIN_PREFETCH_PX,
        DEFAULT_INFINITE_SCROLL_MIN_PREFETCH_PX
    ),
    infiniteScrollPrefetchItemsFromEnd: parseOptionalPositiveInt(
        import.meta.env.VITE_INFINITE_SCROLL_PREFETCH_ITEMS_FROM_END,
        DEFAULT_INFINITE_SCROLL_PREFETCH_ITEMS_FROM_END
    ),
});

export const getInfiniteScrollTriggerIndex = (itemCount: number) => {
    if (itemCount <= 0) return -1;
    return Math.max(0, itemCount - scrollConfig.infiniteScrollPrefetchItemsFromEnd);
};
