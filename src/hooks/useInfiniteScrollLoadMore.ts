import {type RefObject, useEffect, useRef} from 'react';
import {scrollConfig} from '../config/scrollConfig';

type UseInfiniteScrollLoadMoreOptions = {
    rootRef: RefObject<HTMLElement | null>;
    sentinelRef: RefObject<HTMLElement | null>;
    enabled: boolean;
    onLoadMore: () => void;
    isFetching?: boolean;
    itemCount: number;
    prefetchRatio?: number;
    minPrefetchPx?: number;
};

const resolvePrefetchMargin = (containerHeight: number, prefetchRatio: number, minPrefetchPx: number) => {
    const bottomPx = Math.max(minPrefetchPx, Math.round(containerHeight * prefetchRatio));
    return `0px 0px ${bottomPx}px 0px`;
};

export function useInfiniteScrollLoadMore({
    rootRef,
    sentinelRef,
    enabled,
    onLoadMore,
    isFetching = false,
    itemCount,
    prefetchRatio = scrollConfig.infiniteScrollPrefetchRatio,
    minPrefetchPx = scrollConfig.infiniteScrollMinPrefetchPx,
}: UseInfiniteScrollLoadMoreOptions) {
    const onLoadMoreRef = useRef(onLoadMore);
    const isFetchingRef = useRef(isFetching);

    useEffect(() => {
        onLoadMoreRef.current = onLoadMore;
    }, [onLoadMore]);

    useEffect(() => {
        isFetchingRef.current = isFetching;
    }, [isFetching]);

    useEffect(() => {
        const root = rootRef.current;
        const sentinel = sentinelRef.current;
        if (!root || !sentinel || !enabled) return;

        let observer: IntersectionObserver | null = null;

        const observe = () => {
            observer?.disconnect();
            observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting || isFetchingRef.current) return;
                        onLoadMoreRef.current();
                    });
                },
                {
                    root,
                    rootMargin: resolvePrefetchMargin(root.clientHeight, prefetchRatio, minPrefetchPx),
                    threshold: 0,
                }
            );
            observer.observe(sentinel);
        };

        observe();

        const resizeObserver = new ResizeObserver(() => observe());
        resizeObserver.observe(root);

        return () => {
            observer?.disconnect();
            resizeObserver.disconnect();
        };
    }, [enabled, isFetching, itemCount, minPrefetchPx, prefetchRatio, rootRef, sentinelRef]);
}
