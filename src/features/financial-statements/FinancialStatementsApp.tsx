import {useCallback, useEffect, useRef, useState} from 'react';
import {
    AlertCircle,
    Database,
    Loader2,
    Search,
    X
} from 'lucide-react';
import type {CompanySuggestion} from '../../types/codal';
import {searchMarketSymbols} from '../../lib/api';
import {appConfig} from '../../config/appConfig';
import CompanySearchCombobox from './CompanySearchCombobox';
import SymbolHeader from './components/SymbolHeader';
import FinancialStatementsTable from './components/FinancialStatementsTable';
import NarrativeReportView from './components/NarrativeReportView';
import {getReportSheet, REPORT_SHEETS} from './components/FinancialNav';
import {
    type AggregatedData,
    type ConsolidationFilter,
    fetchAndAggregateStatements,
    type PeriodFilter,
    type RestatedFilter
} from '../../services/codalAggregationService';
import FinancialStatementsFilterBar from './components/FinancialStatementsFilterBar';
import {
    type ColumnOrder,
    type DetailMode,
    type DisplayMode,
    transformStatementTable,
    type TrendMode
} from '../../utils/statementTransforms';

function readQueryParam(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get(key);
}

function updateQueryParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
    }
    const next = params.toString();
    const nextUrl = next ? `${window.location.pathname}?${next}` : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
}

export default function FinancialStatementsApp() {
    const [selectedCompany, setSelectedCompany] = useState<CompanySuggestion | null>(null);

    // Aggregation State
    const [selectedSheetId, setSelectedSheetId] = useState(3);
    const [consolidation, setConsolidation] = useState<ConsolidationFilter>('non-consolidated');
    const [restated, setRestated] = useState<RestatedFilter>('dont-care');
    const [periodYears, setPeriodYears] = useState<PeriodFilter>(5);
    const [detailMode, setDetailMode] = useState<DetailMode>('details');
    const [displayMode, setDisplayMode] = useState<DisplayMode>('normal');
    const [trendMode, setTrendMode] = useState<TrendMode>('none');
    const [columnOrder, setColumnOrder] = useState<ColumnOrder>('desc');

    // Data State
    const [aggregatedData, setAggregatedData] = useState<AggregatedData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [rowSearch, setRowSearch] = useState('');
    const requestVersionRef = useRef(0);

    const selectedSheet = getReportSheet(selectedSheetId);
    const displayTable = aggregatedData
        ? transformStatementTable(aggregatedData.table, {detailMode, displayMode, trendMode, columnOrder})
        : null;

    const loadAggregatedData = useCallback(async (silent = false): Promise<boolean> => {
        if (!selectedCompany) return false;

        if (!silent) {
            setLoading(true);
            setError(null);
        }
        const requestVersion = ++requestVersionRef.current;

        try {
            const selectedSheet = getReportSheet(selectedSheetId);
            const data = await fetchAndAggregateStatements({
                symbol: selectedCompany.symbol,
                periodYears,
                consolidation,
                restated,
                sheetId: selectedSheet.value,
                sheetTitle: selectedSheet.fa,
            });
            if (requestVersionRef.current === requestVersion) {
                setAggregatedData(data);
                setError(null);
            }
            return true;
        } catch (err) {
            if (!silent && requestVersionRef.current === requestVersion) {
                setAggregatedData(null);
                setError(err instanceof Error ? err.message : 'خطا در دریافت داده‌ها');
            }
            return false;
        } finally {
            if (!silent && requestVersionRef.current === requestVersion) setLoading(false);
        }
    }, [selectedCompany, selectedSheetId, consolidation, restated, periodYears]);

    useEffect(() => {
        setSelectedSheetId((current) => sheetIdForConsolidation(current, consolidation));
    }, [consolidation]);

    useEffect(() => {
        const symbol = readQueryParam('symbol');
        if (!symbol) return;

        const controller = new AbortController();
        void searchMarketSymbols(symbol, controller.signal)
            .then((items) => {
                const exact = items.find((item) => item.symbol.trim() === symbol.trim());
                setSelectedCompany(exact ? {
                    symbol: exact.symbol.trim(),
                    companyName: exact.name.trim(),
                    instrumentCode: exact.instrumentCode.trim(),
                    industry: exact.industry.trim(),
                } : {symbol, companyName: symbol});
            })
            .catch(() => {
                if (!controller.signal.aborted) setSelectedCompany({symbol, companyName: symbol});
            });

        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (!selectedCompany) return;

        let retryTimer: number | undefined;
        let cancelled = false;

        const scheduleNextRequest = (lastRequestSucceeded: boolean) => {
            if (cancelled) return;
            const delay = lastRequestSucceeded
                ? appConfig.codalRefreshIntervalMs
                : appConfig.apiErrorRetryMs;
            retryTimer = window.setTimeout(async () => {
                const succeeded = await loadAggregatedData(true);
                scheduleNextRequest(succeeded);
            }, delay);
        };

        void loadAggregatedData(false).then(scheduleNextRequest);

        return () => {
            cancelled = true;
            if (retryTimer !== undefined) window.clearTimeout(retryTimer);
        };
    }, [loadAggregatedData, selectedCompany]);

    const handleSelectCompany = useCallback((company: CompanySuggestion | null) => {
        setSelectedCompany(company);
        setAggregatedData(null);
        setError(null);
        setRowSearch('');
        updateQueryParams({symbol: company?.symbol ?? null, letterSerial: null});
    }, []);

    const handleSelectSheet = useCallback((sheetId: number) => {
        const sheet = getReportSheet(sheetId);
        if (sheet.consolidation === 'consolidated' || sheet.consolidation === 'non-consolidated') {
            setConsolidation(sheet.consolidation);
        }
        setSelectedSheetId(sheetId);
        setRowSearch('');
    }, []);

    const handleExport = useCallback(() => {
        if (!displayTable) return;
        const header = ['شرح', ...displayTable.columns.map((column) => column.periodEndToDate || column.headers[0] || column.id)];
        const rows = displayTable.rows.map((row) => [
            row.label,
            ...displayTable.columns.map((column) => row.values[column.id] ?? ''),
        ]);
        const csv = [header, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([`\uFEFF${csv}`], {type: 'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${selectedCompany?.symbol ?? 'financials'}-${selectedSheet.en}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    }, [displayTable, selectedCompany?.symbol, selectedSheet.en]);

    return (
        <main className="mx-auto w-full max-w-[1720px] px-3 py-5 sm:px-5 lg:px-8">
            {!selectedCompany ? (
                <section
                    className="mx-auto mt-[8vh] max-w-2xl overflow-visible rounded-3xl border border-border/70 bg-surface p-5 shadow-card dark:shadow-none sm:p-8">
                    <div
                        className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Database className="h-7 w-7"/>
                    </div>
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-black text-text sm:text-2xl">صورت‌های مالی شرکت‌ها</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">نماد یا نام شرکت را بنویسید تا
                            گزارش‌های چندساله و مقایسه‌ای آن را ببینید.</p>
                    </div>
                    <CompanySearchCombobox
                        onSelectCompany={handleSelectCompany}
                        selectedCompany={selectedCompany}
                    />
                    <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] text-muted">
                        <span>جست‌وجوی سریع میان نمادهای بازار</span>
                        <span className="hidden h-1 w-1 self-center rounded-full bg-border sm:block"/>
                        <span>داده‌های رسمی کدال</span>
                    </div>
                </section>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="w-full sm:max-w-md">
                            <CompanySearchCombobox
                                onSelectCompany={handleSelectCompany}
                                selectedCompany={selectedCompany}
                            />
                        </div>
                        <button
                            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-border/70 bg-surface px-3 text-xs font-semibold text-muted transition hover:border-negative/40 hover:text-negative"
                            onClick={() => handleSelectCompany(null)}
                            type="button"
                        >
                            <X className="h-4 w-4"/>
                            بستن نماد
                        </button>
                    </div>

                    <SymbolHeader company={selectedCompany}/>

                    <div className="rounded-2xl border border-border/70 bg-surface p-3 shadow-card dark:shadow-none">
                        <div className="thin-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
                            {REPORT_SHEETS.filter((sheet) => sheet.group === 'financial' && sheet.consolidation === consolidation).map((sheet) => (
                                <button
                                    key={sheet.value}
                                    type="button"
                                    onClick={() => handleSelectSheet(sheet.value)}
                                    className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                                        selectedSheetId === sheet.value
                                            ? 'border-[#1a73e8] bg-[#1a73e8] text-white'
                                            : 'border-border/70 bg-surface-2 text-muted hover:text-text'
                                    }`}
                                >
                                    {sheet.fa.replace('صورت ', '')}
                                </button>
                            ))}
                        </div>
                        <FinancialStatementsFilterBar
                            consolidation={consolidation}
                            onConsolidationChange={setConsolidation}
                            restated={restated}
                            onRestatedChange={setRestated}
                            periodYears={periodYears}
                            onPeriodYearsChange={setPeriodYears}
                            detailMode={detailMode}
                            onDetailModeChange={setDetailMode}
                            displayMode={displayMode}
                            onDisplayModeChange={setDisplayMode}
                            trendMode={trendMode}
                            onTrendModeChange={setTrendMode}
                            columnOrder={columnOrder}
                            onColumnOrderChange={setColumnOrder}
                            onRefresh={() => void loadAggregatedData(false)}
                            onExport={handleExport}
                        />
                    </div>

                    <section
                        className="rounded-2xl border border-border/70 bg-surface p-3 shadow-card dark:shadow-none sm:p-4">

                        {loading ? (
                            <div
                                className="flex min-h-72 flex-col items-center justify-center gap-3 py-20 text-sm text-muted">
                                <Loader2 className="h-7 w-7 animate-spin text-primary"/>
                                در حال دریافت و تجمیع اطلاعات...
                            </div>
                        ) : error ? (
                            <div
                                className="my-8 flex flex-col items-center gap-3 rounded-xl border border-negative/30 bg-negative/5 px-4 py-8 text-center text-sm text-negative">
                                <AlertCircle className="h-6 w-6 shrink-0"/>
                                <div>{error}</div>
                                <button className="rounded-xl bg-negative px-4 py-2 text-xs font-bold text-white"
                                        onClick={() => void loadAggregatedData(false)} type="button">تلاش مجدد
                                </button>
                            </div>
                        ) : aggregatedData ? (
                            <div className="mt-4">
                                <div
                                    className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-xs text-muted">
                                        {selectedSheet.group === 'financial'
                                            ? `${aggregatedData.reportCount.toLocaleString('fa-IR')} دوره مقایسه‌ای${
                                                aggregatedData.unavailableReportCount > 0
                                                    ? ` از ${(aggregatedData.reportCount + aggregatedData.unavailableReportCount).toLocaleString('fa-IR')} دوره درخواستی`
                                                    : ''
                                            }`
                                            : 'آخرین گزارش موجود'}
                                        {aggregatedData.table.unitNote ? ` • ${aggregatedData.table.unitNote}` : ''}
                                    </div>
                                    <label className="relative w-full sm:max-w-sm">
                                        <Search
                                            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"/>
                                        <input
                                            className="w-full rounded-xl border border-border/70 bg-surface-2 py-2.5 pl-4 pr-10 text-sm text-text outline-none placeholder:text-muted focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                                            onChange={(event) => setRowSearch(event.target.value)}
                                            placeholder="جستجو در ردیف‌ها..."
                                            type="search"
                                            value={rowSearch}
                                        />
                                    </label>
                                </div>
                                {selectedSheetId === 19 ? (
                                    <NarrativeReportView data={aggregatedData} rowSearch={rowSearch}/>
                                ) : displayTable ? (
                                    <FinancialStatementsTable data={aggregatedData} table={displayTable} rowSearch={rowSearch}/>
                                ) : (
                                    null
                                )}
                            </div>
                        ) : (
                            <div
                                className="flex min-h-60 flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted">
                                <Database className="h-8 w-8 text-border"/>
                                <strong className="text-text">گزارش قابل نمایشی پیدا نشد</strong>
                                <span>نوع گزارش یا بازه‌ی مقایسه را تغییر دهید.</span>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </main>
    );
}

function sheetIdForConsolidation(sheetId: number, consolidation: ConsolidationFilter): number {
    const pairs: Record<number, { consolidated: number; nonConsolidated: number }> = {
        14: {consolidated: 14, nonConsolidated: 3},
        3: {consolidated: 14, nonConsolidated: 3},
        13: {consolidated: 13, nonConsolidated: 1},
        1: {consolidated: 13, nonConsolidated: 1},
        15: {consolidated: 15, nonConsolidated: 9},
        9: {consolidated: 15, nonConsolidated: 9},
        1097: {consolidated: 1097, nonConsolidated: 1058},
        1058: {consolidated: 1097, nonConsolidated: 1058},
        1099: {consolidated: 1099, nonConsolidated: 1060},
        1060: {consolidated: 1099, nonConsolidated: 1060},
    };
    const pair = pairs[sheetId];
    if (!pair) {
        return sheetId;
    }
    return consolidation === 'consolidated' ? pair.consolidated : pair.nonConsolidated;
}
