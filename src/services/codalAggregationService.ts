import {getFinancialNotices, getFinancialStatement} from '../lib/api';
import type {
    FinancialNoticeItem,
    FinancialStatementResult,
    StatementColumn,
    StatementRow,
    StatementTable
} from '../types/codal';
import {appConfig} from '../config/appConfig';

export type ConsolidationFilter = 'consolidated' | 'non-consolidated' | 'any';
export type RestatedFilter = 'dont-care' | 'actual' | 'restated';
export type PeriodFilter = 1 | 2 | 5 | 10 | 20;

const NON_COMPARATIVE_SHEET_IDS = new Set([19, 20, 21, 22, 23, 24, 30, 51, 52]);
const aggregationCache = new Map<string, { expiresAt: number; value: Promise<AggregatedData | null> }>();

export interface AggregationOptions {
    symbol: string;
    periodYears: PeriodFilter;
    consolidation: ConsolidationFilter;
    restated: RestatedFilter;
    sheetId: number;
    sheetTitle: string;
}

export interface AggregatedData {
    symbol: string;
    sheetId: number;
    title: string;
    table: StatementTable;
    reportCount: number;
    unavailableReportCount: number;
}

export function isConsolidatedReport(title: string): boolean {
    return title.includes('تلفیقی');
}

export function isRestatedReport(title: string): boolean {
    return title.includes('تجدید ارائه') || title.includes('اصلاحیه');
}

export function extractFiscalYear(title: string): number | null {
    const normalized = toWesternDigits(title);
    const match = normalized.match(/(?:منتهی\s+به\s+)?(1[34]\d{2})[\/-]\d{1,2}[\/-]\d{1,2}/);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return null;
}

function toWesternDigits(value: string): string {
    const persian = '۰۱۲۳۴۵۶۷۸۹';
    const arabic = '٠١٢٣٤٥٦٧٨٩';
    return Array.from(value).map((character) => {
        const persianIndex = persian.indexOf(character);
        if (persianIndex >= 0) return String(persianIndex);
        const arabicIndex = arabic.indexOf(character);
        return arabicIndex >= 0 ? String(arabicIndex) : character;
    }).join('');
}

function normalizeSheetTitle(value: string): string {
    return value
        .replace(/ي/g, 'ی')
        .replace(/ك/g, 'ک')
        .replace(/[\s\u200c\u200f\u202a-\u202e]+/g, '')
        .trim();
}

function normalizeRowLabel(value: string): string {
    return value
        .replace(/ي/g, 'ی')
        .replace(/ك/g, 'ک')
        .replace(/[‐‑‒–—ـ]/g, '-')
        .replace(/\s+/g, ' ')
        .replace(/\s*([():])\s*/g, '$1')
        .trim();
}

type ReportPeriod = {
    year: number;
    month: number;
    day: number;
    months: number;
};

function extractReportPeriod(title: string): ReportPeriod | null {
    const normalized = toWesternDigits(title);
    const date = normalized.match(/(?:منتهی\s+به\s+)?(1[34]\d{2})[\/-](\d{1,2})[\/-](\d{1,2})/);
    if (!date?.[1] || !date[2] || !date[3]) return null;

    const period = normalized.match(/دوره\s+(\d{1,2})\s*ماهه/);
    const months = period?.[1]
        ? Number(period[1])
        : normalized.includes('سال مالی') ? 12 : 0;

    return {
        year: Number(date[1]),
        month: Number(date[2]),
        day: Number(date[3]),
        months,
    };
}

async function mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T) => Promise<R>
): Promise<R[]> {
    const results = new Array<R>(items.length);
    let nextIndex = 0;

    const worker = async () => {
        while (nextIndex < items.length) {
            const index = nextIndex++;
            results[index] = await mapper(items[index]!);
        }
    };

    await Promise.all(Array.from({length: Math.min(concurrency, items.length)}, worker));
    return results;
}

export function fetchAndAggregateStatements(options: AggregationOptions): Promise<AggregatedData | null> {
    const cacheKey = JSON.stringify(options);
    const now = Date.now();
    const cached = aggregationCache.get(cacheKey);
    if (cached && cached.expiresAt > now) return cached.value;

    const request = aggregateStatements(options).catch((error) => {
        aggregationCache.delete(cacheKey);
        throw error;
    });
    aggregationCache.set(cacheKey, {
        expiresAt: now + appConfig.codalRefreshIntervalMs,
        value: request,
    });
    return request;
}

async function aggregateStatements(options: AggregationOptions): Promise<AggregatedData | null> {
    const {symbol, periodYears, consolidation, restated, sheetId, sheetTitle} = options;

    // 1. Fetch notices (fetch up to 100 to get enough history)
    const noticesList = await getFinancialNotices(symbol, 1, 200);
    let notices = noticesList.notices;

    // 2. Filter notices by consolidated and restated criteria
    notices = notices.filter(notice => {
        const isCons = isConsolidatedReport(notice.title);
        if (consolidation === 'consolidated' && !isCons) return false;
        if (consolidation === 'non-consolidated' && isCons) return false;

        const isRest = isRestatedReport(notice.title);
        if (restated === 'actual' && isRest) return false;
        if (restated === 'restated' && !isRest) return false;

        // Ensure it's an annual report or similar. Usually 12-month reports
        if (!notice.title.includes('12 ماهه') && !notice.title.includes('سال مالی')) {
            // Depending on data, this might be too strict. We will keep it loose for now.
        }

        return true;
    });

    // Compare like with like: anchor on the newest report's duration and end month/day.
    // This prevents mixing (for example) a 6-month September report with an annual March report.
    const anchorPeriod = notices.map((notice) => extractReportPeriod(notice.title)).find(Boolean) ?? null;
    const comparableNotices = anchorPeriod
        ? notices.filter((notice) => {
            const period = extractReportPeriod(notice.title);
            return period !== null
                && period.month === anchorPeriod.month
                && period.day === anchorPeriod.day
                && period.months === anchorPeriod.months;
        })
        : notices;

    // Keep all candidates in each year so an unavailable/legacy sheet can fall back to the next
    // corrected or original notice for the same comparable period.
    const noticesByYear = new Map<number, FinancialNoticeItem[]>();
    for (const notice of comparableNotices) {
        const period = extractReportPeriod(notice.title);
        const year = period?.year ?? extractFiscalYear(notice.title);
        if (!year) continue;
        const candidates = noticesByYear.get(year) ?? [];
        candidates.push(notice);
        noticesByYear.set(year, candidates);
    }

    const sortedYears = Array.from(noticesByYear.keys()).sort((a, b) => b - a).slice(0, periodYears);
    if (sortedYears.length === 0) {
        return null;
    }

    // Keep outbound pressure low. The API also throttles and caches requests, but limiting browser
    // concurrency avoids a burst of 20 simultaneous calls on a cold cache.
    const fetchYear = async (year: number) => {
        for (const notice of noticesByYear.get(year) ?? []) {
            try {
                const statement = await getFinancialStatement(notice.letterSerial, sheetId, sheetTitle);
                const reportPeriod = extractReportPeriod(
                    `${statement.report.periodDescription} منتهی به ${statement.report.periodEndToDate}`
                );
                const isComparableReport = !anchorPeriod || !reportPeriod || (
                    reportPeriod.year === year
                    && reportPeriod.month === anchorPeriod.month
                    && reportPeriod.day === anchorPeriod.day
                    && (!reportPeriod.months || reportPeriod.months === anchorPeriod.months)
                );
                if (isComparableReport && statement.statements.some((sheet) =>
                    normalizeSheetTitle(sheet.title) === normalizeSheetTitle(sheetTitle))) {
                    return {year, statement};
                }
            } catch {
                // Try another corrected/original notice for this exact fiscal period.
            }
        }
        return {year, statement: null};
    };

    if (NON_COMPARATIVE_SHEET_IDS.has(sheetId)) {
        // Auditor/management/company reports are snapshots, not year-by-year financial series.
        // Stop at the newest letter that actually contains the requested sheet.
        for (const year of sortedYears) {
            const latest = await fetchYear(year);
            if (!latest.statement) continue;
            const latestSheet = latest.statement.statements.find((sheet) =>
                normalizeSheetTitle(sheet.title) === normalizeSheetTitle(sheetTitle));
            if (!latestSheet) continue;
            return {
                symbol,
                sheetId,
                title: latestSheet.title,
                reportCount: 1,
                unavailableReportCount: 0,
                table: latestSheet.table,
            };
        }
        return null;
    }

    // Each CODAL statement normally includes the officially reported comparison column for the
    // preceding year. Fetch alternating years first, then request only genuinely uncovered years.
    // This nearly halves cold-cache upstream traffic without inventing or calculating any values.
    const primaryYears = sortedYears.filter((_, index) => index % 2 === 0);
    const primaryStatements = await mapWithConcurrency(primaryYears, 2, fetchYear);
    const coveredYears = new Set<number>();
    for (const {year, statement} of primaryStatements) {
        if (!statement) continue;
        coveredYears.add(year);
        const sheet = statement.statements.find((candidate) =>
            normalizeSheetTitle(candidate.title) === normalizeSheetTitle(sheetTitle));
        for (const column of sheet?.table.columns ?? []) {
            const period = extractReportPeriod(column.periodEndToDate);
            if (period && sortedYears.includes(period.year)
                && (!anchorPeriod || (period.month === anchorPeriod.month && period.day === anchorPeriod.day))) {
                coveredYears.add(period.year);
            }
        }
    }
    const fallbackYears = sortedYears.filter((year) => !coveredYears.has(year));
    const fallbackStatements = await mapWithConcurrency(fallbackYears, 2, fetchYear);
    const statements = [...primaryStatements, ...fallbackStatements]
        .sort((left, right) => sortedYears.indexOf(left.year) - sortedYears.indexOf(right.year));

    const validStatements = statements.filter(
        (item): item is { year: number; statement: FinancialStatementResult } => item.statement !== null
    );

    if (validStatements.length === 0) {
        return null;
    }

    // 6. Merge columns and rows.
    let mergedTitle = '';
    const mergedColumns: StatementColumn[] = [];
    const rowMap = new Map<string, StatementRow>();
    const rowOrder: string[] = [];

    const addColumn = (year: number, stmt: FinancialStatementResult, targetSheet: FinancialStatementResult['statements'][number], sourceColumn: StatementColumn) => {
        const yearColId = `col_${year}`;
        if (mergedColumns.some((column) => column.id === yearColId)) return;

        mergedColumns.push({
            ...sourceColumn,
            id: yearColId,
            headers: [`سال مالی ${year}`, ...sourceColumn.headers.slice(1)],
            periodEndToDate: sourceColumn.periodEndToDate || stmt.report.periodEndToDate,
            yearEndToDate: sourceColumn.yearEndToDate || stmt.report.yearEndToDate,
        });

        targetSheet.table.rows.forEach((row) => {
            const rowKey = normalizeRowLabel(row.label);
            if (!rowMap.has(rowKey)) {
                rowMap.set(rowKey, {label: row.label, kind: row.kind, values: {}});
                rowOrder.push(rowKey);
            }
            const value = row.values[sourceColumn.id];
            if (value !== undefined && value.trim() !== '') {
                rowMap.get(rowKey)!.values[yearColId] = value;
            }
        });
    };

    validStatements.forEach(({year, statement: stmt}) => {
        const targetSheet = stmt.statements.find((sheet) =>
            normalizeSheetTitle(sheet.title) === normalizeSheetTitle(sheetTitle));
        if (!targetSheet) return;

        if (!mergedTitle) {
            mergedTitle = targetSheet.title;
        }

        // Only the current-period column belongs to this year's report. Comparative annual and
        // percentage columns must never leak into a six/nine-month comparison.
        const exactColumn = targetSheet.table.columns.find((column) => {
            const period = extractReportPeriod(column.periodEndToDate);
            return period?.year === year
                && (!anchorPeriod || (period.month === anchorPeriod.month && period.day === anchorPeriod.day));
        }) ?? targetSheet.table.columns[0];
        if (exactColumn) addColumn(year, stmt, targetSheet, exactColumn);
    });

    // A newer report may contain an official restated comparison for a year whose own legacy page
    // is unavailable. Use it only when its full date matches the requested comparison period.
    for (const missingYear of sortedYears.filter((year) => !mergedColumns.some((column) => column.id === `col_${year}`))) {
        for (const {statement: stmt} of validStatements) {
            const targetSheet = stmt.statements.find((sheet) =>
                normalizeSheetTitle(sheet.title) === normalizeSheetTitle(sheetTitle));
            if (!targetSheet) continue;
            const comparative = targetSheet.table.columns.find((column) => {
                const period = extractReportPeriod(column.periodEndToDate);
                return period?.year === missingYear
                    && (!anchorPeriod || (period.month === anchorPeriod.month && period.day === anchorPeriod.day));
            });
            if (comparative) {
                addColumn(missingYear, stmt, targetSheet, comparative);
                break;
            }
        }
    }

    mergedColumns.sort((left, right) => {
        const leftYear = Number(left.id.replace('col_', ''));
        const rightYear = Number(right.id.replace('col_', ''));
        return rightYear - leftYear;
    });

    const mergedRows = rowOrder.map(rowKey => rowMap.get(rowKey)!);

    return {
        symbol,
        sheetId,
        title: mergedTitle,
        reportCount: mergedColumns.length,
        unavailableReportCount: Math.max(0, periodYears - mergedColumns.length),
        table: {
            title: mergedTitle,
            unitNote: validStatements[0].statement.report.unitNote || validStatements[0].statement.statements[0]?.table.unitNote || 'مبالغ مطابق گزارش کدال',
            columns: mergedColumns,
            rows: mergedRows
        }
    };
}
