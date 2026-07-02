import {useMemo} from 'react';
import type {StatementTable} from '../../types/codal';
import {ltrNumericClassName} from '../../utils/normalize';
import {
    filterTableRows,
    isNegativeValue,
    isSubtotalRow,
} from '../../utils/statementRows';

type StatementTableViewProps = {
    table: StatementTable;
    rowSearch: string;
    hideEmptyRows?: boolean;
};

function formatCellDisplay(value: string | undefined): string {
    if (value === undefined || value.trim() === '') return '—';
    return value;
}

export default function StatementTableView({
    table,
    rowSearch,
    hideEmptyRows = true,
}: StatementTableViewProps) {
    const filteredRows = useMemo(
        () =>
            filterTableRows(table.rows, table.columns, {
                rowSearch,
                hideEmptyRows,
            }),
        [hideEmptyRows, rowSearch, table.columns, table.rows]
    );

    const effectiveHiddenCount = useMemo(() => {
        if (!hideEmptyRows) return 0;
        return (
            table.rows.length -
            filterTableRows(table.rows, table.columns, {hideEmptyRows: true, rowSearch: ''}).length
        );
    }, [hideEmptyRows, table.columns, table.rows]);

    if (table.columns.length === 0) {
        return (
            <div className="rounded-xl border border-border/70 bg-surface-2 px-4 py-8 text-center text-sm text-muted">
                جدولی برای نمایش وجود ندارد.
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
            {(table.title || table.unitNote) && (
                <div className="border-b border-border/60 bg-primary/5 px-4 py-3">
                    {table.title && (
                        <h3 className="text-sm font-semibold text-primary">{table.title}</h3>
                    )}
                    {table.unitNote && <p className="mt-1 text-xs text-muted">{table.unitNote}</p>}
                </div>
            )}

            <div className="thin-scrollbar overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-primary text-white">
                            <th className="sticky right-0 z-10 min-w-[240px] border-b border-l border-primary/30 bg-primary px-4 py-3 text-right text-xs font-semibold">
                                شرح
                            </th>
                            {table.columns.map((column) => (
                                <th
                                    key={column.id}
                                    className="min-w-[140px] border-b border-l border-primary/30 px-3 py-3 text-center text-xs font-semibold"
                                >
                                    <div className="space-y-1">
                                        {column.headers.map((header, index) => (
                                            <div key={`${column.id}-${index}`}>{header}</div>
                                        ))}
                                        {(column.periodEndToDate || column.yearEndToDate) && (
                                            <div
                                                className={`text-[11px] font-normal opacity-90 ${ltrNumericClassName}`}
                                            >
                                                {column.periodEndToDate || column.yearEndToDate}
                                            </div>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td
                                    className="px-4 py-8 text-center text-sm text-muted"
                                    colSpan={table.columns.length + 1}
                                >
                                    ردیفی با این عبارت یافت نشد.
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((row, rowIndex) => {
                                const isSection = row.kind === 'section';
                                const isSubtotal = isSubtotalRow(row.label);
                                const rowClass = isSection
                                    ? 'bg-surface-2/80 font-semibold'
                                    : isSubtotal
                                      ? 'bg-warning/10 font-medium'
                                      : rowIndex % 2 === 0
                                        ? 'bg-surface'
                                        : 'bg-surface-2/30';

                                return (
                                    <tr key={`${row.label}-${rowIndex}`} className={rowClass}>
                                        <td
                                            className={`sticky right-0 z-10 border-b border-l border-border/50 bg-inherit px-4 py-2.5 text-right text-sm ${
                                                isSection ? 'text-text' : 'text-text'
                                            }`}
                                        >
                                            {row.label}
                                        </td>
                                        {table.columns.map((column) => {
                                            const rawValue = row.values[column.id];
                                            const displayValue = isSection
                                                ? '—'
                                                : formatCellDisplay(rawValue);
                                            const isNegative = !isSection && isNegativeValue(rawValue);

                                            return (
                                                <td
                                                    key={`${row.label}-${column.id}`}
                                                    className={`border-b border-l border-border/50 px-3 py-2.5 text-center text-sm ${ltrNumericClassName} ${
                                                        isNegative ? 'text-negative' : 'text-text'
                                                    }`}
                                                >
                                                    {displayValue}
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

            {(rowSearch || effectiveHiddenCount > 0) && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-4 py-2 text-xs text-muted">
                    {rowSearch && (
                        <span>
                            {filteredRows.length.toLocaleString('fa-IR')} ردیف از{' '}
                            {table.rows.length.toLocaleString('fa-IR')} ردیف
                        </span>
                    )}
                    {effectiveHiddenCount > 0 && (
                        <span>
                            {effectiveHiddenCount.toLocaleString('fa-IR')} ردیف خالی مخفی شده
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
