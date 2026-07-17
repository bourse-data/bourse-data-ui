import {appConfig} from '../config/appConfig';
import type {ExportFormat} from '../utils/exportLimits';
import type {
    AggregatedFinancialStatementResult,
    ApiResponse,
    FinancialNoticeListResult,
    FinancialStatementResult,
    MarketSymbol,
} from '../types/codal';

async function apiFetch<T>(url: URL, signal?: AbortSignal): Promise<T> {
    const response = await fetch(url.toString(), {signal, headers: {accept: 'application/json'}});
    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('کدال درخواست‌ها را محدود کرده است. چند لحظه صبر کنید و دوباره «بازنشانی» را بزنید.');
        }
        if (response.status === 502 || response.status === 503 || response.status === 504) {
            throw new Error('سامانه کدال در حال حاضر پاسخ‌گو نیست؛ چند لحظه دیگر دوباره تلاش کنید.');
        }
        let serverMessage = '';
        try {
            const errorPayload = (await response.json()) as Partial<ApiResponse<unknown>>;
            serverMessage = typeof errorPayload.message === 'string' ? errorPayload.message.trim() : '';
        } catch {
            // A non-JSON error page has no usable message.
        }
        throw new Error(serverMessage || `خطا در دریافت اطلاعات (${response.status})`);
    }

    const payload = (await response.json()) as ApiResponse<T>;
    if (payload.code !== 200 || payload.result === undefined || payload.result === null) {
        throw new Error(payload.message || 'دریافت اطلاعات ناموفق بود');
    }
    return payload.result;
}

async function codalFetch<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    signal?: AbortSignal
): Promise<T> {
    const url = new URL(`${appConfig.codalApiBaseUrl}${path}`, window.location.origin);
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== '') {
                url.searchParams.set(key, String(value));
            }
        }
    }

    return apiFetch<T>(url, signal);
}

export function searchMarketSymbols(query: string, signal?: AbortSignal) {
    const url = new URL(`${appConfig.bourseDataApiBaseUrl}/api/v1/market-search/symbols`, window.location.origin);
    url.searchParams.set('query', query);
    return apiFetch<MarketSymbol[]>(url, signal);
}

export function getFinancialNotices(symbol: string, page = 1, size = 20) {
    return codalFetch<FinancialNoticeListResult>('/financial-notices', {symbol, page, size});
}

export function getFinancialStatement(letterSerial: string, sheetId?: number, sheetTitle?: string) {
    return codalFetch<FinancialStatementResult>('/financial-notice-statements', {
        letterSerial,
        sheetId,
        sheetTitle,
    });
}

export function getAggregatedFinancialStatements(
    symbol: string,
    params: {
        statementType: string;
        consolidation: 'consolidated' | 'non-consolidated';
        restated: 'yes' | 'no';
        periodYears: number;
        reportType?: 'annual';
        sheetId?: number;
    },
    signal?: AbortSignal
) {
    return codalFetch<AggregatedFinancialStatementResult>(
        `/symbols/${encodeURIComponent(symbol)}/financial-statements/${encodeURIComponent(params.statementType)}`,
        {
            consolidation: params.consolidation,
            restated: params.restated,
            periodYears: params.periodYears,
            reportType: params.reportType ?? 'annual',
            sheetId: params.sheetId,
        },
        signal
    );
}

export function validateFinancialStatementExport(
    params: {
        format: ExportFormat;
        dataRowCount: number;
        columnCount: number;
    },
    signal?: AbortSignal
) {
    return codalFetch<{ allowed: boolean }>(
        '/financial-statements/export/validate',
        {
            format: params.format,
            dataRowCount: params.dataRowCount,
            columnCount: params.columnCount,
        },
        signal
    );
}
