const parsePositiveInt = (raw: string | undefined, fallback: number) => {
    if (!raw?.trim()) return fallback;
    const parsed = Number(raw.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

export const codalApiBaseUrl =
    // Default uses double 'codal' segment so that after nginx/vite proxy rewrite
    // (which maps /api/codal/* -> /codal/api/v1/*) the Spring context-path=/codal + controller
    // /api/v1/codal is reached as /codal/api/v1/codal/...
    import.meta.env.VITE_CODAL_API_BASE_URL ?? '/api/codal/codal';

export const bourseDataApiBaseUrl =
    import.meta.env.VITE_BOURSE_DATA_API_BASE_URL ?? '/api/data';

export const appConfig = Object.freeze({
    codalApiBaseUrl,
    bourseDataApiBaseUrl,
    symbolSearchDebounceMs: parsePositiveInt(
        import.meta.env.VITE_SYMBOL_SEARCH_DEBOUNCE_MS,
        180
    ),
    financialNoticesRefreshMs: parsePositiveInt(
        import.meta.env.VITE_CODAL_NOTICES_REFRESH_MS,
        300_000
    ),
    apiErrorRetryMs: parsePositiveInt(import.meta.env.VITE_API_ERROR_RETRY_MS, 10_000),
});
