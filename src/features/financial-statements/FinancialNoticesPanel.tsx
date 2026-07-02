import {AlertCircle, ExternalLink, FileSpreadsheet, FileText, Loader2, Paperclip, RefreshCw, Search} from 'lucide-react';
import {Fragment, useRef, useState} from 'react';
import {getInfiniteScrollTriggerIndex} from '../../config/scrollConfig';
import {InfiniteScrollSentinel} from '../../hooks/InfiniteScrollSentinel';
import {useInfiniteScrollLoadMore} from '../../hooks/useInfiniteScrollLoadMore';
import type {FinancialNoticeItem} from '../../types/codal';
import {formatDateTimeFa} from '../../utils/formatDateTime';
import {normalizePersian} from '../../utils/normalize';

type FinancialNoticesPanelProps = {
    notices: FinancialNoticeItem[];
    selectedLetterSerial: string | null;
    loading: boolean;
    loadingMore: boolean;
    refreshing: boolean;
    error: string | null;
    hasMore: boolean;
    totalCount: number;
    showSymbol?: boolean;
    onSelectNotice: (notice: FinancialNoticeItem) => void;
    onLoadMore: () => void;
    onRefresh: () => void;
};

function NoticeSkeleton() {
    return (
        <div className="animate-pulse rounded-xl border border-border/70 bg-surface-2 px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
                <div className="h-5 w-12 rounded-full bg-border/60"/>
                <div className="h-4 flex-1 rounded bg-border/60"/>
            </div>
            <div className="mb-2 h-4 w-4/5 rounded bg-border/50"/>
            <div className="h-3 w-2/5 rounded bg-border/40"/>
        </div>
    );
}

export default function FinancialNoticesPanel({
    notices,
    selectedLetterSerial,
    loading,
    loadingMore,
    refreshing,
    error,
    hasMore,
    totalCount,
    showSymbol = true,
    onSelectNotice,
    onLoadMore,
    onRefresh,
}: FinancialNoticesPanelProps) {
    const listRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const [noticeSearch, setNoticeSearch] = useState('');

    const normalizedNoticeSearch = normalizePersian(noticeSearch).trim();
    const visibleNotices = normalizedNoticeSearch
        ? notices.filter((notice) =>
              normalizePersian(`${notice.symbol} ${notice.companyName} ${notice.title}`).includes(
                  normalizedNoticeSearch
              )
          )
        : notices;

    const canPrefetchMore = hasMore && !loading && !loadingMore && !error;
    const loadTriggerIndex = getInfiniteScrollTriggerIndex(visibleNotices.length);

    useInfiniteScrollLoadMore({
        rootRef: listRef,
        sentinelRef,
        enabled: canPrefetchMore,
        onLoadMore,
        isFetching: loadingMore,
        itemCount: visibleNotices.length,
    });

    return (
        <div className="flex min-h-0 flex-col gap-3">
            <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"/>
                    <input
                        className="w-full rounded-xl border border-border/70 bg-surface-2 py-2 pl-3 pr-9 text-xs text-text placeholder:text-muted focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                        onChange={(event) => setNoticeSearch(event.target.value)}
                        placeholder="جستجو در اطلاعیه‌ها..."
                        type="search"
                        value={noticeSearch}
                    />
                </div>
                <button
                    aria-label="بروزرسانی"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-surface-2 text-muted transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
                    disabled={loading || refreshing}
                    onClick={onRefresh}
                    type="button"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}/>
                </button>
            </div>

            <div
                ref={listRef}
                className="thin-scrollbar calm-scroll max-h-[calc(100vh-16rem)] min-h-[320px] space-y-2 overflow-y-auto pr-1"
            >
                {loading && notices.length === 0 ? (
                    Array.from({length: 5}, (_, index) => <NoticeSkeleton key={`skeleton-${index}`}/>)
                ) : null}

                {error ? (
                    <div className="rounded-xl border border-negative/30 bg-negative/10 p-4 text-sm text-negative">
                        <div className="mb-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0"/>
                            {error}
                        </div>
                        <button
                            className="rounded-lg border border-negative/35 bg-negative/10 px-3 py-1.5 text-xs font-medium transition hover:bg-negative/15"
                            onClick={onRefresh}
                            type="button"
                        >
                            تلاش مجدد
                        </button>
                    </div>
                ) : null}

                {!loading && !error && visibleNotices.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 bg-surface-2 px-4 py-10 text-center text-sm text-muted">
                        {noticeSearch ? 'اطلاعیه‌ای با این عبارت یافت نشد.' : 'اطلاعیه مالی برای نمایش وجود ندارد.'}
                    </div>
                ) : null}

                {visibleNotices.map((notice, index) => {
                    const isSelected = notice.letterSerial === selectedLetterSerial;
                    return (
                        <Fragment key={notice.letterSerial}>
                            <button
                                className={`w-full rounded-xl border px-4 py-3 text-right transition ${
                                    isSelected
                                        ? 'border-primary/50 bg-primary/5 shadow-sm'
                                        : 'border-border/70 bg-surface-2 hover:border-primary/30 hover:bg-surface'
                                }`}
                                onClick={() => onSelectNotice(notice)}
                                type="button"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        {showSymbol && (
                                            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                                <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                                    {notice.symbol}
                                                </span>
                                                <span className="truncate text-[11px] text-muted">
                                                    {notice.companyName}
                                                </span>
                                            </div>
                                        )}
                                        <p className="text-sm font-medium leading-6 text-text">{notice.title}</p>
                                        <p className="mt-1 text-xs text-muted">
                                            انتشار: {formatDateTimeFa(notice.publishDateTime)}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5 text-muted">
                                        {notice.hasPdf && (
                                            <span title="PDF">
                                                <FileText className="h-3.5 w-3.5"/>
                                            </span>
                                        )}
                                        {notice.hasExcel && (
                                            <span title="Excel">
                                                <FileSpreadsheet className="h-3.5 w-3.5"/>
                                            </span>
                                        )}
                                        {notice.hasAttachment && (
                                            <span title="پیوست">
                                                <Paperclip className="h-3.5 w-3.5"/>
                                            </span>
                                        )}
                                        {notice.reportUrl && (
                                            <a
                                                className="rounded p-1 hover:bg-surface hover:text-primary"
                                                href={notice.reportUrl}
                                                onClick={(event) => event.stopPropagation()}
                                                rel="noreferrer"
                                                target="_blank"
                                                title="مشاهده در کدال"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5"/>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </button>

                            {canPrefetchMore && index === loadTriggerIndex ? (
                                <InfiniteScrollSentinel sentinelRef={sentinelRef}/>
                            ) : null}
                        </Fragment>
                    );
                })}

                {loadingMore ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted">
                        <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                        در حال بارگذاری...
                    </div>
                ) : null}

                {!hasMore && !loading && visibleNotices.length > 0 ? (
                    <div className="py-2 text-center text-[11px] text-muted">همه اطلاعیه‌ها نمایش داده شد.</div>
                ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted">
                <span>
                    نمایش: {visibleNotices.length.toLocaleString('fa-IR')}
                    {totalCount > 0 ? ` از ${totalCount.toLocaleString('fa-IR')}` : ''}
                </span>
                {refreshing ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                        <Loader2 className="h-3 w-3 animate-spin"/>
                        بروزرسانی...
                    </span>
                ) : (
                    <span>بروزرسانی خودکار فعال</span>
                )}
            </div>
        </div>
    );
}
