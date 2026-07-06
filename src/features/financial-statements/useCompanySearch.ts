import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {appConfig} from '../../config/appConfig';
import {searchMarketSymbols} from '../../lib/api';
import type {CompanySuggestion} from '../../types/codal';
import {normalizePersian} from '../../utils/normalize';

const resultCache = new Map<string, CompanySuggestion[]>();

function useDebouncedValue(value: string, delayMs: number) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delayMs);
        return () => window.clearTimeout(timer);
    }, [delayMs, value]);
    return debounced;
}

export function useCompanySearch(query: string, enabled: boolean) {
    const normalizedQuery = useMemo(() => normalizePersian(query).trim(), [query]);
    const debouncedQuery = useDebouncedValue(normalizedQuery, appConfig.symbolSearchDebounceMs);
    const requestVersion = useRef(0);
    const [results, setResults] = useState<CompanySuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reloadToken, setReloadToken] = useState(0);

    const fetchCompanies = useCallback(async () => {
        resultCache.delete(debouncedQuery);
        setReloadToken((value) => value + 1);
    }, [debouncedQuery]);

    useEffect(() => {
        if (!enabled || debouncedQuery === '') {
            setLoading(false);
            setError(null);
            setResults([]);
            return;
        }

        const cached = resultCache.get(debouncedQuery);
        if (cached) {
            setLoading(false);
            setError(null);
            setResults(cached);
            return;
        }

        const controller = new AbortController();
        const version = ++requestVersion.current;
        setLoading(true);
        setError(null);

        void searchMarketSymbols(debouncedQuery, controller.signal)
            .then((items) => items.map((item) => ({
                symbol: item.symbol.trim(),
                companyName: item.name.trim(),
                instrumentCode: item.instrumentCode.trim(),
                industry: item.industry.trim(),
            })))
            .then((items) => {
                resultCache.set(debouncedQuery, items);
                if (requestVersion.current === version) setResults(items);
            })
            .catch((fetchError: unknown) => {
                if (controller.signal.aborted || requestVersion.current !== version) return;
                setResults([]);
                setError(fetchError instanceof Error ? fetchError.message : 'جستجوی نماد ناموفق بود');
            })
            .finally(() => {
                if (requestVersion.current === version) setLoading(false);
            });

        return () => controller.abort();
    }, [debouncedQuery, enabled, reloadToken]);

    return {loading, error, results, retry: fetchCompanies};
}
