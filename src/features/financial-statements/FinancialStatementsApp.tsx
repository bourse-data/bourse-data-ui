import {useCallback, useEffect, useRef, useState} from 'react';
import {AlertCircle, Database, Loader2, RefreshCw, Search, X} from 'lucide-react';
import type {CompanySuggestion} from '../../types/codal';
import {searchMarketSymbols} from '../../lib/api';
import {appConfig} from '../../config/appConfig';
import CompanySearchCombobox from './CompanySearchCombobox';
import SymbolHeader from './components/SymbolHeader';
import AggregatedTableView from './components/AggregatedTableView';
import {getReportSheet, REPORT_SHEETS} from './components/FinancialNav';
import {
    type AggregatedData,
    type ConsolidationFilter,
    fetchAndAggregateStatements,
    type PeriodFilter,
    type RestatedFilter
} from '../../services/codalAggregationService';

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
    const [consolidation, setConsolidation] = useState<ConsolidationFilter>('any');
    const [restated, setRestated] = useState<RestatedFilter>('dont-care');
    const [periodYears, setPeriodYears] = useState<PeriodFilter>(5);

    // Data State
    const [aggregatedData, setAggregatedData] = useState<AggregatedData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [rowSearch, setRowSearch] = useState('');
    const requestVersionRef = useRef(0);

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
                ? appConfig.financialNoticesRefreshMs
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

                    {/* Row 1: Main filters + refresh */}
                    <div className="rounded-2xl border border-border/70 bg-surface p-3 shadow-card dark:shadow-none">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                            {/* Consolidation */}
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-muted">تلفیقی / غیرتلفیقی</span>
                                <div
                                    className="inline-flex rounded-xl border border-border/70 bg-surface-2 p-0.5 text-xs font-semibold">
                                    {(['any', 'consolidated', 'non-consolidated'] as const).map((c) => {
                                        const label = c === 'any' ? 'همه' : c === 'consolidated' ? 'تلفیقی' : 'غیرتلفیقی';
                                        const active = consolidation === c;
                                        return (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setConsolidation(c)}
                                                className={`px-3 py-1.5 rounded-[10px] transition-colors ${active ? 'bg-primary text-white shadow-sm' : 'hover:bg-surface text-muted hover:text-text'}`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Period */}
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-muted">بازه مقایسه</span>
                                <div
                                    className="inline-flex rounded-xl border border-border/70 bg-surface-2 p-0.5 text-xs font-semibold">
                                    {[1, 2, 5, 10, 20].map((p) => {
                                        const active = periodYears === p;
                                        return (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setPeriodYears(p as PeriodFilter)}
                                                className={`px-3 py-1.5 rounded-[10px] transition-colors ${active ? 'bg-primary text-white shadow-sm' : 'hover:bg-surface text-muted hover:text-text'}`}
                                            >
                                                {p} سال
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Restated */}
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-muted">تجدید ارائه</span>
                                <div
                                    className="inline-flex rounded-xl border border-border/70 bg-surface-2 p-0.5 text-xs font-semibold">
                                    {([
                                        {v: 'dont-care', l: 'همه'},
                                        {v: 'actual', l: 'بدون تجدید'},
                                        {v: 'restated', l: 'فقط تجدید'},
                                    ] as const).map(({v, l}) => {
                                        const active = restated === v;
                                        return (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => setRestated(v)}
                                                className={`px-3 py-1.5 rounded-[10px] transition-colors ${active ? 'bg-primary text-white shadow-sm' : 'hover:bg-surface text-muted hover:text-text'}`}
                                            >
                                                {l}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Refresh */}
                            <button
                                type="button"
                                onClick={() => void loadAggregatedData(false)}
                                className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border/70 bg-surface px-4 py-2 text-xs font-semibold text-muted transition hover:border-primary/50 hover:text-text active:bg-surface-2"
                            >
                                <RefreshCw className="h-3.5 w-3.5"/>
                                بازنسانی
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Statement type buttons (horizontal scroll) */}
                    <div className="rounded-2xl border border-border/70 bg-surface p-2 shadow-card dark:shadow-none">
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 thin-scrollbar snap-x">
                            {REPORT_SHEETS.map((sheet) => {
                                const active = selectedSheetId === sheet.value;
                                return (
                                    <button
                                        key={sheet.value}
                                        type="button"
                                        onClick={() => setSelectedSheetId(sheet.value)}
                                        className={`snap-start whitespace-nowrap rounded-2xl border px-4 py-2 text-sm font-medium transition active:scale-[0.985] ${active
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-border/60 bg-surface hover:border-primary/40 hover:bg-surface-2 text-text'
                                        }`}
                                    >
                                        {sheet.fa}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted px-1">برای دیدن همه انواع به چپ اسکرول کنید</div>
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
                                        {aggregatedData.reportCount.toLocaleString('fa-IR')} دوره مقایسه‌ای
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
                                <AggregatedTableView
                                    data={aggregatedData}
                                    rowSearch={rowSearch}
                                />
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
