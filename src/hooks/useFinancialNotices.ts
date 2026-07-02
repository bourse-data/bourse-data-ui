import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {appConfig} from '../config/appConfig';
import {getFinancialNotices, getNotices} from '../lib/api';
import type {FinancialNoticeItem} from '../types/codal';
import {mapNoticeToFinancialNotice, mergeUniqueNotices} from '../utils/noticeUtils';

const CODAL_MAX_PAGE_LENGTH = 12;

type UseFinancialNoticesOptions = {
    symbol?: string | null;
    enabled?: boolean;
    autoRefresh?: boolean;
};

type FinancialNoticesState = {
    notices: FinancialNoticeItem[];
    totalCount: number;
    page: number;
    loading: boolean;
    loadingMore: boolean;
    refreshing: boolean;
    hasMore: boolean;
    error: string | null;
};

export function useFinancialNotices({
    symbol = null,
    enabled = true,
    autoRefresh = true,
}: UseFinancialNoticesOptions) {
    const [state, setState] = useState<FinancialNoticesState>({
        notices: [],
        totalCount: 0,
        page: 1,
        loading: true,
        loadingMore: false,
        refreshing: false,
        hasMore: true,
        error: null,
    });

    const [pageToLoad, setPageToLoad] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    const requestInFlightRef = useRef(false);
    const loadedPageRef = useRef(0);
    const didInitRef = useRef(false);

    const querySignature = useMemo(() => symbol ?? '', [symbol]);

    useEffect(() => {
        if (!enabled) {
            setState({
                notices: [],
                totalCount: 0,
                page: 1,
                loading: false,
                loadingMore: false,
                refreshing: false,
                hasMore: false,
                error: null,
            });
            loadedPageRef.current = 0;
            setPageToLoad(1);
            return;
        }

        if (!didInitRef.current) {
            didInitRef.current = true;
            return;
        }

        setState((prev) => ({
            ...prev,
            notices: [],
            totalCount: 0,
            page: 1,
            loading: true,
            loadingMore: false,
            refreshing: false,
            hasMore: true,
            error: null,
        }));
        loadedPageRef.current = 0;
        setPageToLoad(1);
        setReloadKey((prev) => prev + 1);
    }, [enabled, querySignature]);

    useEffect(() => {
        if (!enabled) return;

        let active = true;
        const controller = new AbortController();
        const isFirstPage = pageToLoad === 1;
        requestInFlightRef.current = true;

        setState((prev) => ({
            ...prev,
            loading: isFirstPage && prev.notices.length === 0,
            refreshing: isFirstPage && prev.notices.length > 0,
            loadingMore: !isFirstPage,
            error: null,
        }));

        const fetchNotices = async () => {
            try {
                let mergedNotices: FinancialNoticeItem[] = [];
                let totalCount = 0;
                let lastLoadedPage = isFirstPage ? 0 : pageToLoad - 1;
                let hasMore = true;

                if (symbol) {
                    const result = await getFinancialNotices(
                        symbol,
                        pageToLoad,
                        appConfig.noticesPageSize
                    );
                    if (!active) return;

                    mergedNotices = result.notices;
                    totalCount = result.totalCount;
                    lastLoadedPage = result.page;
                    hasMore = mergedNotices.length < totalCount;
                } else {
                    const result = await getNotices(
                        pageToLoad,
                        CODAL_MAX_PAGE_LENGTH,
                        undefined,
                        controller.signal
                    );
                    if (!active) return;

                    const financialNotices = result.notices
                        .map(mapNoticeToFinancialNotice)
                        .filter((notice): notice is FinancialNoticeItem => notice !== null);

                    mergedNotices = financialNotices;
                    totalCount = result.totalCount;
                    lastLoadedPage = result.page;
                    hasMore = result.notices.length >= CODAL_MAX_PAGE_LENGTH;
                }

                setState((prev) => {
                    const notices = isFirstPage
                        ? mergedNotices
                        : mergeUniqueNotices(prev.notices, mergedNotices);
                    const resolvedTotalCount = symbol ? totalCount : Math.max(totalCount, notices.length);

                    loadedPageRef.current = lastLoadedPage;

                    return {
                        notices,
                        totalCount: resolvedTotalCount,
                        page: lastLoadedPage,
                        loading: false,
                        loadingMore: false,
                        refreshing: false,
                        hasMore: symbol ? notices.length < resolvedTotalCount : hasMore,
                        error: null,
                    };
                });
            } catch {
                if (!active || controller.signal.aborted) return;
                setState((prev) => ({
                    ...prev,
                    loading: false,
                    loadingMore: false,
                    refreshing: false,
                    error: 'دریافت اطلاعیه‌ها ناموفق بود',
                }));
            } finally {
                requestInFlightRef.current = false;
            }
        };

        void fetchNotices();

        return () => {
            active = false;
            requestInFlightRef.current = false;
            controller.abort();
        };
    }, [enabled, pageToLoad, reloadKey, symbol]);

    const loadMore = useCallback(() => {
        if (requestInFlightRef.current) return;
        if (state.loading || state.loadingMore || state.refreshing || !state.hasMore) return;
        setPageToLoad(loadedPageRef.current + 1);
    }, [state.hasMore, state.loading, state.loadingMore, state.refreshing]);

    const refresh = useCallback(() => {
        setPageToLoad(1);
        setReloadKey((prev) => prev + 1);
    }, []);

    useEffect(() => {
        if (!enabled || !autoRefresh) return;

        let timer: number;
        let active = true;

        const tick = () => {
            if (!active) return;
            if (requestInFlightRef.current) {
                timer = window.setTimeout(tick, 1000);
                return;
            }
            setPageToLoad(1);
            setReloadKey((prev) => prev + 1);
            timer = window.setTimeout(
                tick,
                state.error ? appConfig.apiErrorRetryMs : appConfig.financialNoticesRefreshMs
            );
        };

        timer = window.setTimeout(
            tick,
            state.error ? appConfig.apiErrorRetryMs : appConfig.financialNoticesRefreshMs
        );

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [autoRefresh, enabled, querySignature, state.error]);

    return {
        ...state,
        loadMore,
        refresh,
    };
}
