import {useMemo} from 'react';
import type {AggregatedData} from '../../../services/codalAggregationService';
import {ltrNumericClassName} from '../../../utils/normalize';
import {filterTableRows, isNegativeValue, isSubtotalRow} from '../../../utils/statementRows';

interface AggregatedTableViewProps {
    data: AggregatedData;
    rowSearch: string;
}

function formatCellDisplay(value: string | undefined): string {
    if (value === undefined || value.trim() === '') return '۰';
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
            <div className="thin-scrollbar max-h-[70vh] overflow-auto">
                <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-20">
                    <tr className="bg-[#e6f3ff] dark:bg-primary/20">
                        <th className="sticky right-0 z-30 min-w-[260px] max-w-[360px] border-b-2 border-l border-border/60 bg-[#e6f3ff] px-4 py-3 text-right text-xs font-bold text-primary dark:bg-[#172943] sm:min-w-[340px]">
                            {table.title || 'شرح سرفصل'}
                        </th>
                        {table.columns.map((column, idx) => {
                            const yearHeader = column.headers[0] || 'دوره';
                            const dateHeader = column.periodEndToDate || column.yearEndToDate;
                            return (
                                <th
                                    key={column.id}
                                    className={`min-w-[170px] border-b-2 border-l border-border/60 bg-[#e6f3ff] px-4 py-3 text-center text-xs font-medium text-primary dark:bg-[#172943] ${idx > 0 ? '' : ''}`}
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

                            return (
                                <tr key={`${row.label}-${rowIndex}`}
                                    className={`${rowClass} group hover:bg-surface-2 transition-colors`}>
                                    <td
                                        className={`sticky right-0 z-10 max-w-[360px] border-b border-l border-border/40 bg-inherit px-4 py-3 text-right text-sm ${
                                            isSection ? 'font-bold text-primary' : isSubtotal ? 'font-bold text-text' : 'text-text'
                                        }`}
                                    >
                                        <span className="block whitespace-normal leading-6">{row.label}</span>
                                    </td>
                                    {table.columns.map((column) => {
                                        const rawValue = row.values[column.id];
                                        const displayValue = isSection ? '' : formatCellDisplay(rawValue);
                                        const isNegative = !isSection && isNegativeValue(rawValue);

                                        return (
                                            <td
                                                key={`${row.label}-${column.id}`}
                                                className={`border-b border-l border-border/30 px-4 py-3 text-sm ${
                                                    isTextRow ? 'min-w-[420px] whitespace-normal text-right leading-7' : `text-center ${ltrNumericClassName}`
                                                } ${
                                                    isNegative ? 'text-negative' : 'text-text'
                                                }`}
                                                dir={isTextRow ? 'rtl' : undefined}
                                            >
                                                <span>{displayValue}</span>
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
