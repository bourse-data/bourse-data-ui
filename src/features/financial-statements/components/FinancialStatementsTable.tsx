import {useMemo} from 'react';
import {ExternalLink, Link as LinkIcon} from 'lucide-react';
import type {StatementTable} from '../../../types/codal';
import type {AggregatedData} from '../../../services/codalAggregationService';
import {ltrNumericClassName} from '../../../utils/normalize';
import {filterTableRows, isNegativeValue, isSubtotalRow} from '../../../utils/statementRows';

type FinancialStatementsTableProps = {
    data: AggregatedData;
    table: StatementTable;
    rowSearch: string;
};

function formatCellDisplay(value: string | undefined): string {
    if (value === undefined || value.trim() === '') return '—';
    if (value.includes('%') || value.includes('٪')) return value;
    const normalized = value.trim().replace(/,/g, '');
    if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
        const number = Number(normalized);
        if (Number.isFinite(number)) {
            return new Intl.NumberFormat('fa-IR', {maximumFractionDigits: 2}).format(number);
        }
    }
    return value;
}

function formatHeaderDate(value: string): string {
    if (!value) return '';
    return value.replace(/-/g, '/');
}

export default function FinancialStatementsTable({data, table, rowSearch}: FinancialStatementsTableProps) {
    const filteredRows = useMemo(() => {
        return filterTableRows(table.rows, table.columns, {rowSearch, hideEmptyRows: false});
    }, [table.rows, table.columns, rowSearch]);

    if (table.columns.length === 0) {
        return (
            <div className="rounded-xl border border-border/70 bg-surface-2 px-4 py-8 text-center text-sm text-muted">
                جدولی برای نمایش وجود ندارد.
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-surface">
            <div className="thin-scrollbar relative max-h-[72vh] overflow-auto">
                <table
                    className="w-full table-fixed border-separate border-spacing-0 text-sm"
                    style={{minWidth: `${300 + table.columns.length * 154}px`}}
                >
                    <colgroup>
                        <col className="w-[270px]"/>
                        {table.columns.map((column) => (
                            <col key={column.id} className="w-[154px]"/>
                        ))}
                    </colgroup>
                    <thead className="sticky top-0 z-20">
                    <tr className="bg-[#e6f3ff] dark:bg-[#172943]">
                        <th className="sticky right-0 z-30 border-b-2 border-l border-border/60 bg-[#e6f3ff] px-3 py-2 text-center text-xs font-bold text-primary dark:bg-[#172943]">
                            {table.title || 'شرح'}
                        </th>
                        {table.columns.map((column) => {
                            const meta = data.columnMeta.find((item) => item.columnId === column.id);
                            return (
                                <th
                                    key={column.id}
                                    className="border-b-2 border-l border-border/60 bg-[#e6f3ff] px-2 py-2 text-center text-xs font-medium text-primary dark:bg-[#172943]"
                                >
                                    <div className="space-y-1">
                                        <div className="font-bold">
                                            ۱۲ ماهه منتهی
                                            به {formatHeaderDate(column.periodEndToDate || meta?.periodEndDate || '')}
                                        </div>
                                        <div className={`text-[11px] opacity-80 ${ltrNumericClassName}`}>
                                            {meta?.publishDateTime || column.yearEndToDate || '—'}
                                        </div>
                                        {meta ? (
                                            <div className="flex items-center justify-center gap-2 text-primary/80">
                                                {meta.reportUrl ? (
                                                    <a href={meta.reportUrl} target="_blank" rel="noreferrer"
                                                       title="مشاهده گزارش کدال">
                                                        <ExternalLink className="h-3.5 w-3.5"/>
                                                    </a>
                                                ) : null}
                                                {meta.letterSerial ? (
                                                    <span title={meta.letterSerial}>
                                                        <LinkIcon className="h-3.5 w-3.5"/>
                                                    </span>
                                                ) : null}
                                                {meta.isRestated ? <span className="text-[10px]">تجدید</span> : null}
                                            </div>
                                        ) : null}
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                    </thead>
                    <tbody>
                    {filteredRows.length === 0 ? (
                        <tr>
                            <td colSpan={table.columns.length + 1} className="px-4 py-8 text-center text-sm text-muted">
                                داده‌ای یافت نشد.
                            </td>
                        </tr>
                    ) : (
                        filteredRows.map((row, rowIndex) => {
                            const isSection = row.kind === 'section';
                            const isTextRow = row.kind === 'text';
                            const isSubtotal = isSubtotalRow(row.label);
                            const rowClass = isSection
                                ? 'bg-[#d7eefc]/70 dark:bg-surface-2/80 font-bold text-primary'
                                : isSubtotal
                                    ? 'bg-surface font-bold border-t-2 border-border/50'
                                    : rowIndex % 2 === 0
                                        ? 'bg-surface'
                                        : 'bg-surface-2/30';
                            const stickyBackground = isSection
                                ? 'bg-[#e6f3ff] dark:bg-[#182235]'
                                : rowIndex % 2 === 0
                                    ? 'bg-surface'
                                    : 'bg-[#fafbfc] dark:bg-[#151c2a]';

                            return (
                                <tr key={`${row.label}-${rowIndex}`}
                                    className={`${rowClass} group transition-colors hover:bg-surface-2`}>
                                    <td
                                        className={`sticky right-0 z-20 border-b border-l border-border/40 px-3 py-2 text-right text-sm shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.8)] ${stickyBackground} ${
                                            isSection ? 'font-bold text-primary' : isSubtotal ? 'font-bold text-text' : 'text-text'
                                        }`}
                                    >
                                        <span
                                            className="block whitespace-normal break-words leading-6">{row.label}</span>
                                    </td>
                                    {table.columns.map((column) => {
                                        const rawValue = row.values[column.id];
                                        const isNegative = !isSection && isNegativeValue(rawValue);
                                        return (
                                            <td
                                                key={`${row.label}-${column.id}`}
                                                className={`max-w-[154px] border-b border-l border-border/30 px-2 py-2 text-center text-sm ${
                                                    isTextRow ? 'whitespace-normal break-words leading-7' : `overflow-hidden text-ellipsis whitespace-nowrap tabular-nums ${ltrNumericClassName}`
                                                } ${isNegative ? 'text-negative' : 'text-text'}`}
                                                dir={isTextRow ? 'rtl' : undefined}
                                            >
                                                <span
                                                    title={rawValue}>{isSection ? '' : formatCellDisplay(rawValue)}</span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
