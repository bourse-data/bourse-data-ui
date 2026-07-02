import {appConfig} from '../config/appConfig';
import type {
    ApiResponse,
    CompaniesResult,
    FinancialNoticeListResult,
    FinancialStatementResult,
    NoticeSearchResult,
} from '../types/codal';

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

    const response = await fetch(url.toString(), {signal});
    if (!response.ok) {
        throw new Error(`خطا در دریافت اطلاعات (${response.status})`);
    }

    const payload = (await response.json()) as ApiResponse<T>;
    if (payload.code !== 200 || !payload.result) {
        throw new Error(payload.message || 'دریافت اطلاعات ناموفق بود');
    }

    return payload.result;
}

export function getCompanies() {
    return codalFetch<CompaniesResult>('/companies');
}

export function getFinancialNotices(symbol: string, page = 1, size = 20) {
    return codalFetch<FinancialNoticeListResult>('/financial-notices', {symbol, page, size});
}

export function getFinancialStatement(letterSerial: string, sheetId?: number) {
    return codalFetch<FinancialStatementResult>('/financial-notice-statements', {
        letterSerial,
        sheetId,
    });
}

export function getNotices(page = 1, length = 12, symbol?: string, signal?: AbortSignal) {
    return codalFetch<NoticeSearchResult>(
        '/notices',
        {
            page,
            length,
            symbol: symbol || undefined,
            searchMode: symbol ? true : false,
        },
        signal
    );
}
