import type {Ref} from 'react';

export const InfiniteScrollSentinel = ({sentinelRef}: {sentinelRef: Ref<HTMLDivElement | null>}) => (
    <div
        ref={sentinelRef as Ref<HTMLDivElement>}
        className="pointer-events-none h-px w-full shrink-0 opacity-0"
        aria-hidden="true"
    />
);
