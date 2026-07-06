import {getFinancialNotices, getFinancialStatement} from '../lib/api';
import type {
    FinancialNoticeItem,
    FinancialStatementResult,
    StatementColumn,
    StatementRow,
    StatementTable
} from '../types/codal';

export type ConsolidationFilter = 'consolidated' | 'non-consolidated' | 'any';
export type RestatedFilter = 'dont-care' | 'actual' | 'restated';
export type PeriodFilter = 1 | 2 | 5 | 10 | 20;

const NON_COMPARATIVE_SHEET_IDS = new Set([19, 20, 21, 22, 23, 24, 30, 51, 52]);

export interface AggregationOptions {
    symbol: string;
    periodYears: PeriodFilter;
    consolidation: ConsolidationFilter;
    restated: RestatedFilter;
    sheetId: number;
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
    return title.includes('تجدید ارائه');
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

export async function fetchAndAggregateStatements(options: AggregationOptions): Promise<AggregatedData | null> {
    const {symbol, periodYears, consolidation, restated, sheetId} = options;

    // 1. Fetch notices (fetch up to 100 to get enough history)
    const noticesList = await getFinancialNotices(symbol, 1, 100);
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

    // 3. Group by fiscal year and select the most relevant one per year
    const yearMap = new Map<number, FinancialNoticeItem>();
    for (const notice of notices) {
        const year = extractFiscalYear(notice.title);
        if (year) {
            // Since notices are usually sorted by publishDateTime desc, the first one we encounter is the latest.
            if (!yearMap.has(year)) {
                yearMap.set(year, notice);
            }
        }
    }

    // 4. Sort years descending and take top N (periodYears)
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => b - a).slice(0, periodYears);
    const selectedNotices = sortedYears.map(year => yearMap.get(year)!).filter(Boolean);

    if (selectedNotices.length === 0) {
        return null;
    }

    // 5. Fetch statements for selected notices
    const statementPromises = selectedNotices.map(notice => getFinancialStatement(notice.letterSerial, sheetId));

    const settledStatements = await Promise.allSettled(statementPromises);
    const statements = settledStatements.map((result) => result.status === 'fulfilled' ? result.value : null);

    const validStatements = statements.filter(Boolean) as FinancialStatementResult[];

    if (validStatements.length === 0) {
        return null;
    }

    if (NON_COMPARATIVE_SHEET_IDS.has(sheetId)) {
        const latestSheet = validStatements
            .map((statement) => statement.statements.find((sheet) => sheet.sheetId === sheetId))
            .find((sheet) => sheet !== undefined);
        if (!latestSheet) return null;

        return {
            symbol,
            sheetId,
            title: latestSheet.title,
            reportCount: 1,
            unavailableReportCount: statements.length - validStatements.length,
            table: latestSheet.table,
        };
    }

    // 6. Merge columns and rows. Pair with original selected years to avoid index skew on partial failures.
    let mergedTitle = '';
    const mergedColumns: StatementColumn[] = [];
    const rowMap = new Map<string, StatementRow>();
    const rowOrder: string[] = [];

    // Build lookup of year for each valid stmt by matching letterSerial back when possible.
    const yearBySerial = new Map<string, number>();
    selectedNotices.forEach((n, i) => {
        if (i < sortedYears.length) yearBySerial.set(n.letterSerial, sortedYears[i]);
    });

    validStatements.forEach((stmt) => {
        const targetSheet = stmt.statements.find(s => s.sheetId === sheetId);
        if (!targetSheet) return;

        if (!mergedTitle) {
            mergedTitle = targetSheet.title;
        }

        // Each statement usually has 1 or 2 columns (e.g. current year, previous year)
        // We only take the first column (current year) to avoid duplication since we fetched each year
        if (targetSheet.table.columns.length > 0) {
            const currentYearCol = targetSheet.table.columns[0];
            const year = extractFiscalYear(stmt.report.periodEndToDate)
                ?? extractFiscalYear(stmt.report.title)
                ?? yearBySerial.get(stmt.letterSerial)
                ?? 0;
            if (!year) return;
            const yearColId = `col_${year}`;

            if (mergedColumns.some((column) => column.id === yearColId)) return;

            mergedColumns.push({
                ...currentYearCol,
                id: yearColId,
                headers: [`سال مالی ${year}`, ...currentYearCol.headers.slice(1)],
                periodEndToDate: currentYearCol.periodEndToDate || stmt.report.periodEndToDate,
                yearEndToDate: currentYearCol.yearEndToDate || stmt.report.yearEndToDate,
            });

            targetSheet.table.rows.forEach(row => {
                if (!rowMap.has(row.label)) {
                    rowMap.set(row.label, {
                        label: row.label,
                        kind: row.kind,
                        values: {}
                    });
                    rowOrder.push(row.label);
                }

                // Assign value for this year
                const val = row.values[currentYearCol.id];
                if (val !== undefined) {
                    rowMap.get(row.label)!.values[yearColId] = val;
                }
            });
        }
    });

    const mergedRows = rowOrder.map(label => rowMap.get(label)!);

    return {
        symbol,
        sheetId,
        title: mergedTitle,
        reportCount: mergedColumns.length,
        unavailableReportCount: statements.length - validStatements.length,
        table: {
            title: mergedTitle,
            unitNote: validStatements[0].report.unitNote || validStatements[0].statements[0]?.table.unitNote || 'مبالغ مطابق گزارش کدال',
            columns: mergedColumns,
            rows: mergedRows
        }
    };
}
