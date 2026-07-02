import type {StatementColumn, StatementRow} from '../types/codal';
import {normalizePersian} from './normalize';

const EMPTY_CELL_VALUES = new Set(['', '—', '-', '--', '.', '۰', '0', '٠']);

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function toWesternDigits(value: string): string {
    let result = value;
    for (let index = 0; index < 10; index += 1) {
        result = result
            .replace(new RegExp(PERSIAN_DIGITS[index]!, 'g'), String(index))
            .replace(new RegExp(ARABIC_DIGITS[index]!, 'g'), String(index));
    }
    return result;
}

export function isEffectivelyEmptyValue(value: string | undefined): boolean {
    if (value === undefined) return true;
    const trimmed = value.trim();
    if (EMPTY_CELL_VALUES.has(trimmed)) return true;

    const normalized = toWesternDigits(trimmed)
        .replace(/[(),]/g, '')
        .replace(/\s+/g, '')
        .trim();

    if (normalized === '') return true;
    if (normalized === '0' || normalized === '0.0' || normalized === '0.00') return true;

    return false;
}

export function isEmptyDataRow(row: StatementRow, columns: StatementColumn[]): boolean {
    if (row.kind === 'section') return false;
    return columns.every((column) => isEffectivelyEmptyValue(row.values[column.id]));
}

export function isSubtotalRow(label: string): boolean {
    const normalized = label.trim();
    return (
        normalized.includes('خالص') ||
        normalized.includes('جمع') ||
        normalized.endsWith(':')
    );
}

export function isNegativeValue(value: string | undefined): boolean {
    if (!value) return false;
    const trimmed = value.trim();
    return trimmed.startsWith('(') || trimmed.startsWith('-') || trimmed.startsWith('−');
}

export function filterTableRows(
    rows: StatementRow[],
    columns: StatementColumn[],
    options: {
        rowSearch?: string;
        hideEmptyRows?: boolean;
    }
): StatementRow[] {
    const {rowSearch = '', hideEmptyRows = true} = options;

    return rows.filter((row) => {
        if (hideEmptyRows && isEmptyDataRow(row, columns)) {
            return false;
        }
        if (!rowSearch.trim()) return true;
        return normalizePersian(row.label).includes(normalizePersian(rowSearch));
    });
}
