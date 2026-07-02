import {AlertCircle, Eye, EyeOff, Loader2, Search} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import type {FinancialStatementResult} from '../../types/codal';
import StatementReportMeta from './StatementReportMeta';
import StatementTableView from './StatementTableView';

type StatementDetailViewProps = {
    statement: FinancialStatementResult | null;
    loading: boolean;
    error: string | null;
};

export default function StatementDetailView({statement, loading, error}: StatementDetailViewProps) {
    const [activeSheetId, setActiveSheetId] = useState<number | null>(null);
    const [rowSearch, setRowSearch] = useState('');
    const [hideEmptyRows, setHideEmptyRows] = useState(true);

    const sheets = statement?.statements ?? [];
    const resolvedSheetId = activeSheetId ?? sheets[0]?.sheetId ?? null;

    const activeSheet = useMemo(
        () => sheets.find((sheet) => sheet.sheetId === resolvedSheetId) ?? null,
        [resolvedSheetId, sheets]
    );

    useEffect(() => {
        setActiveSheetId(null);
        setRowSearch('');
    }, [statement?.letterSerial]);

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-surface py-20 text-sm text-muted">
                <Loader2 className="h-5 w-5 animate-spin"/>
                در حال دریافت صورت مالی...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-start gap-3 rounded-2xl border border-negative/30 bg-negative/5 px-4 py-6 text-sm text-negative">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0"/>
                <div>{error}</div>
            </div>
        );
    }

    if (!statement) {
        return (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-surface-2/50 px-6 py-24 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Search className="h-6 w-6"/>
                </div>
                <h3 className="text-base font-semibold text-text">صورت مالی را انتخاب کنید</h3>
                <p className="mt-2 max-w-md text-sm leading-7 text-muted">
                    از لیست اطلاعیه‌های مالی یک مورد را انتخاب کنید تا جزئیات صورت‌های مالی نمایش داده شود.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <StatementReportMeta report={statement.report}/>

            <section className="rounded-2xl border border-border/70 bg-surface p-4 shadow-card dark:shadow-none">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-text">جداول صورت مالی</h3>
                        <p className="mt-1 text-xs text-muted">
                            {sheets.length.toLocaleString('fa-IR')} جدول — همه برگه‌ها بارگذاری شده‌اند
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button
                            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                                hideEmptyRows
                                    ? 'border-primary/40 bg-primary/10 text-primary'
                                    : 'border-border/70 bg-surface-2 text-muted hover:text-text'
                            }`}
                            onClick={() => setHideEmptyRows((current) => !current)}
                            type="button"
                        >
                            {hideEmptyRows ? (
                                <EyeOff className="h-3.5 w-3.5"/>
                            ) : (
                                <Eye className="h-3.5 w-3.5"/>
                            )}
                            {hideEmptyRows ? 'ردیف‌های خالی مخفی' : 'نمایش ردیف‌های خالی'}
                        </button>
                        <div className="relative w-full sm:max-w-sm">
                            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"/>
                            <input
                                className="w-full rounded-xl border border-border/70 bg-surface-2 py-2 pl-3 pr-10 text-sm text-text placeholder:text-muted focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                                onChange={(event) => setRowSearch(event.target.value)}
                                placeholder="جستجو در ردیف‌های جدول..."
                                type="search"
                                value={rowSearch}
                            />
                        </div>
                    </div>
                </div>

                {sheets.length > 1 && (
                    <div className="thin-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
                        {sheets.map((sheet) => {
                            const isActive = sheet.sheetId === resolvedSheetId;
                            return (
                                <button
                                    key={sheet.sheetId}
                                    className={`shrink-0 rounded-xl border px-3 py-2 text-sm transition ${
                                        isActive
                                            ? 'border-primary/50 bg-primary/10 text-primary'
                                            : 'border-border/70 bg-surface-2 text-text hover:border-primary/30'
                                    }`}
                                    onClick={() => {
                                        setActiveSheetId(sheet.sheetId);
                                        setRowSearch('');
                                    }}
                                    type="button"
                                >
                                    {sheet.title}
                                </button>
                            );
                        })}
                    </div>
                )}

                {activeSheet ? (
                    <StatementTableView
                        hideEmptyRows={hideEmptyRows}
                        rowSearch={rowSearch}
                        table={activeSheet.table}
                    />
                ) : (
                    <div className="rounded-xl border border-border/70 bg-surface-2 px-4 py-8 text-center text-sm text-muted">
                        جدولی برای نمایش وجود ندارد.
                    </div>
                )}
            </section>
        </div>
    );
}
