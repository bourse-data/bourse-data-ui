import type {StatementColumn, StatementRow, StatementTable} from '../types/codal';
import {isSubtotalRow} from './statementRows';

export type DetailMode = 'summary' | 'details';
export type DisplayMode = 'normal' | 'vertical';
export type TrendMode = 'none' | 'yoy';
export type ColumnOrder = 'desc' | 'asc';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function transformStatementTable(
    table: StatementTable,
    options: {
        detailMode: DetailMode;
        displayMode: DisplayMode;
        trendMode: TrendMode;
        columnOrder: ColumnOrder;
    }
): StatementTable {
    let rows = applySummaryFilter(table.rows, options.detailMode);
    let columns = table.columns;

    if (options.displayMode === 'vertical') {
        rows = applyVerticalMode(rows, columns);
    }
    if (options.trendMode === 'yoy') {
        rows = applyTrendMode(rows, columns);
    }
    ({columns, rows} = sortColumns(columns, rows, options.columnOrder));

    return {...table, columns, rows};
}

export function applySummaryFilter(rows: StatementRow[], mode: DetailMode): StatementRow[] {
    if (mode === 'details') {
        return rows;
    }
    return rows.filter((row) => row.kind === 'section' || isSubtotalRow(row.label));
}

export function applyVerticalMode(rows: StatementRow[], columns: StatementColumn[]): StatementRow[] {
    const denominators = new Map<string, number>();
    for (const column of columns) {
        const baseRow = rows.find((row) =>
            /جمع\s+دارایی|فروش|درآمدهای عملیاتی|درآمد عملیاتی/.test(row.label)
            && parseNumber(row.values[column.id]) !== null
        );
        const base = baseRow ? parseNumber(baseRow.values[column.id]) : null;
        if (base && base !== 0) {
            denominators.set(column.id, Math.abs(base));
        }
    }

    return rows.map((row) => {
        if (row.kind === 'section') {
            return row;
        }
        const values: Record<string, string> = {};
        for (const column of columns) {
            const number = parseNumber(row.values[column.id]);
            const denominator = denominators.get(column.id);
            values[column.id] = number === null || !denominator ? '' : `${formatPercent((number / denominator) * 100)}%`;
        }
        return {...row, values};
    });
}

export function applyTrendMode(rows: StatementRow[], columns: StatementColumn[]): StatementRow[] {
    return rows.map((row) => {
        if (row.kind === 'section') {
            return row;
        }
        const values: Record<string, string> = {};
        for (let index = 0; index < columns.length; index += 1) {
            const current = parseNumber(row.values[columns[index]!.id]);
            const previous = parseNumber(row.values[columns[index + 1]?.id ?? '']);
            if (current === null || previous === null || previous === 0) {
                values[columns[index]!.id] = '';
            } else {
                values[columns[index]!.id] = `${formatPercent(((current - previous) / Math.abs(previous)) * 100)}%`;
            }
        }
        return {...row, values};
    });
}

export function sortColumns(
    columns: StatementColumn[],
    rows: StatementRow[],
    order: ColumnOrder
): { columns: StatementColumn[]; rows: StatementRow[] } {
    // col1/col2/... are source-order columns from CODAL (MDA, board members,
    // subsidiaries, changes in equity, etc.). Only aggregated yearly columns
    // use col_<year> and may be sorted chronologically.
    if (!columns.every((column) => /^col_\d{4}$/.test(column.id))) {
        return {columns: [...columns], rows: [...rows]};
    }
    const sortedColumns = [...columns].sort((left, right) => {
        const leftYear = Number(left.id.replace(/\D/g, ''));
        const rightYear = Number(right.id.replace(/\D/g, ''));
        return order === 'desc' ? rightYear - leftYear : leftYear - rightYear;
    });

    const sortedRows = rows.map((row) => {
        const values: Record<string, string> = {};
        for (const column of sortedColumns) {
            values[column.id] = row.values[column.id] ?? '';
        }
        return {...row, values};
    });

    return {columns: sortedColumns, rows: sortedRows};
}

export function parseNumber(value: string | undefined): number | null {
    if (!value) {
        return null;
    }
    let normalized = value.trim();
    for (let index = 0; index < 10; index += 1) {
        normalized = normalized
            .replace(new RegExp(PERSIAN_DIGITS[index]!, 'g'), String(index))
            .replace(new RegExp(ARABIC_DIGITS[index]!, 'g'), String(index));
    }
    normalized = normalized
        .replace(/,/g, '')
        .replace(/٪|%/g, '')
        .replace(/\s+/g, '');
    const negative = normalized.startsWith('(') && normalized.endsWith(')');
    normalized = normalized.replace(/[()]/g, '');
    if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
        return null;
    }
    const number = Number(normalized);
    return Number.isFinite(number) ? (negative ? -number : number) : null;
}

function formatPercent(value: number): string {
    return new Intl.NumberFormat('fa-IR', {maximumFractionDigits: 1}).format(value);
}
