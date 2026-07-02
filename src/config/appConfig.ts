const parsePositiveInt = (raw: string | undefined, fallback: number) => {
    if (!raw?.trim()) return fallback;
    const parsed = Number(raw.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

export const codalApiBaseUrl =
    import.meta.env.VITE_CODAL_API_BASE_URL ?? '/api/codal/codal';

export const appConfig = Object.freeze({
    codalApiBaseUrl,
    financialNoticesRefreshMs: parsePositiveInt(
        import.meta.env.VITE_CODAL_NOTICES_REFRESH_MS,
        30_000
    ),
    apiErrorRetryMs: parsePositiveInt(import.meta.env.VITE_API_ERROR_RETRY_MS, 10_000),
    noticesPageSize: parsePositiveInt(import.meta.env.VITE_NOTICES_PAGE_SIZE, 20),
});
