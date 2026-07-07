import {useMemo} from 'react';
import type {AggregatedData} from '../../../services/codalAggregationService';
import {ltrNumericClassName} from '../../../utils/normalize';
import {filterTableRows, isNegativeValue, isSubtotalRow} from '../../../utils/statementRows';

interface AggregatedTableViewProps {
    data: AggregatedData;
    rowSearch: string;
}

function formatCellDisplay(value: string | undefined): string {
    // An absent comparative value is not the same thing as a reported zero.
    if (value === undefined || value.trim() === '') return '—';
    const normalized = value.trim().replace(/,/g, '');
    if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
        const number = Number(normalized);
        if (Number.isFinite(number)) {
            return new Intl.NumberFormat('fa-IR', {maximumFractionDigits: 2}).format(number);
        }
    }
    return value;
}

export default function AggregatedTableView({data, rowSearch}: AggregatedTableViewProps) {
    const table = data.table;

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
            <div className="thin-scrollbar relative max-h-[70vh] overflow-auto">
                <table
                    className="w-full table-fixed border-separate border-spacing-0 text-sm"
                    style={{minWidth: `${300 + table.columns.length * 160}px`}}
                >
                    <colgroup>
                        <col className="w-[300px]"/>
                        {table.columns.map((column) => (
                            <col key={column.id} className="w-[160px]"/>
                        ))}
                    </colgroup>
                    <thead className="sticky top-0 z-20">
                    <tr className="bg-[#e6f3ff] dark:bg-primary/20">
                        <th className="sticky right-0 z-30 w-[300px] border-b-2 border-l border-border/60 bg-[#e6f3ff] px-3 py-2.5 text-center text-xs font-bold text-primary dark:bg-[#172943]">
                            {table.title || 'شرح سرفصل'}
                        </th>
                        {table.columns.map((column, idx) => {
                            const yearHeader = column.headers[0] || 'دوره';
                            const dateHeader = column.periodEndToDate || column.yearEndToDate;
                            return (
                                <th
                                    key={column.id}
                                    className={`w-[160px] border-b-2 border-l border-border/60 bg-[#e6f3ff] px-3 py-2.5 text-center text-xs font-medium text-primary dark:bg-[#172943] ${idx > 0 ? '' : ''}`}
                                >
                                    <div className="space-y-1">
                                        <div className="font-semibold">{yearHeader}</div>
                                        {dateHeader && (
                                            <div className={`text-[11px] opacity-80 ${ltrNumericClassName}`}>
                                                {dateHeader}
                                            </div>
                                        )}
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

                            // Color logic based on Bourseview screenshot
                            const rowClass = isSection
                                ? 'bg-[#e6f3ff]/50 dark:bg-surface-2/80 font-bold text-primary'
                                : isSubtotal
                                    ? 'bg-surface font-bold border-t-2 border-border/50'
                                    : rowIndex % 2 === 0
                                        ? 'bg-surface'
                                        : 'bg-surface-2/30';
                            const stickyBackground = isSection
                                ? 'bg-[#f2f8ff] dark:bg-[#182235]'
                                : rowIndex % 2 === 0
                                    ? 'bg-surface'
                                    : 'bg-[#fafbfc] dark:bg-[#151c2a]';

                            return (
                                <tr key={`${row.label}-${rowIndex}`}
                                    className={`${rowClass} group hover:bg-surface-2 transition-colors`}>
                                    <td
                                        className={`sticky right-0 z-20 w-[300px] border-b border-l border-border/40 px-3 py-2.5 text-center text-sm shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.8)] ${stickyBackground} ${
                                            isSection ? 'font-bold text-primary' : isSubtotal ? 'font-bold text-text' : 'text-text'
                                        }`}
                                    >
                                        <span
                                            className="block whitespace-normal break-words leading-6">{row.label}</span>
                                    </td>
                                    {table.columns.map((column) => {
                                        const rawValue = row.values[column.id];
                                        const displayValue = isSection ? '' : formatCellDisplay(rawValue);
                                        const isNegative = !isSection && isNegativeValue(rawValue);

                                        return (
                                            <td
                                                key={`${row.label}-${column.id}`}
                                                className={`w-[160px] max-w-[160px] border-b border-l border-border/30 px-2 py-2.5 text-center text-sm ${
                                                    isTextRow ? 'whitespace-normal break-words leading-7' : `overflow-hidden text-ellipsis whitespace-nowrap tabular-nums ${ltrNumericClassName}`
                                                } ${
                                                    isNegative ? 'text-negative' : 'text-text'
                                                }`}
                                                dir={isTextRow ? 'rtl' : undefined}
                                            >
                                                <span title={rawValue}>{displayValue}</span>
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
