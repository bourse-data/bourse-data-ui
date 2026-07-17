import {useCallback, useEffect, useRef, useState} from 'react';
import {AlertCircle, Database, ExternalLink, Loader2, Search, X} from 'lucide-react';
import type {CompanySuggestion, FinancialNoticeItem} from '../../types/codal';
import {getFinancialNotices, searchMarketSymbols, validateFinancialStatementExport} from '../../lib/api';
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
    fetchStatementForNotice,
    type PeriodFilter,
    type RestatedFilter
} from '../../services/codalAggregationService';
import FinancialStatementsFilterBar from './components/FinancialStatementsFilterBar';
import {transformStatementTable} from '../../utils/statementTransforms';
import {type ExportFormat, validateExportDimensions} from '../../utils/exportLimits';
import {exportStatementCsv, exportStatementXlsx} from '../../utils/statementExport';

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
    const [selectedSheetId, setSelectedSheetId] = useState(0);
    const [consolidation, setConsolidation] = useState<ConsolidationFilter>('non-consolidated');
    const [restated, setRestated] = useState<RestatedFilter>('no');
    const [periodYears, setPeriodYears] = useState<PeriodFilter>(5);
    const [snapshotNotices, setSnapshotNotices] = useState<FinancialNoticeItem[]>([]);
    const [selectedSnapshotSerial, setSelectedSnapshotSerial] = useState('');

    // Data State
    const [aggregatedData, setAggregatedData] = useState<AggregatedData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [rowSearch, setRowSearch] = useState('');
    const [exportError, setExportError] = useState<string | null>(null);
    const requestVersionRef = useRef(0);
    const aggregateAbortRef = useRef<AbortController | null>(null);

    const selectedSheet = getReportSheet(selectedSheetId);
    const isSnapshotSheet = selectedSheet.group !== 'financial'
        || selectedSheetId === 1060
        || selectedSheetId === 1099;
    const selectedSnapshotNotice = snapshotNotices.find((notice) => notice.letterSerial === selectedSnapshotSerial);
    const displayTable = aggregatedData
        ? transformStatementTable(aggregatedData.table, {
            detailMode: 'details',
            displayMode: 'normal',
            trendMode: 'none',
            columnOrder: 'desc',
        })
        : null;

    const loadAggregatedData = useCallback(async (silent = false): Promise<boolean> => {
        if (!selectedCompany) return false;

        if (!silent) {
            setLoading(true);
            setError(null);
        }
        const requestVersion = ++requestVersionRef.current;
        aggregateAbortRef.current?.abort();
        const controller = new AbortController();
        aggregateAbortRef.current = controller;

        try {
            const selectedSheet = getReportSheet(selectedSheetId);
            const data = isSnapshotSheet && selectedSnapshotNotice
                ? await fetchStatementForNotice({
                    symbol: selectedCompany.symbol,
                    consolidation,
                    sheetId: selectedSheet.value,
                    sheetTitle: selectedSheet.fa,
                    notice: selectedSnapshotNotice,
                })
                : await fetchAndAggregateStatements({
                    symbol: selectedCompany.symbol,
                    periodYears,
                    consolidation,
                    restated,
                    sheetId: selectedSheet.value,
                    sheetTitle: selectedSheet.fa,
                }, controller.signal);
            if (requestVersionRef.current === requestVersion) {
                setAggregatedData(data);
                setError(null);
            }
            return true;
        } catch (err) {
            if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
                return false;
            }
            if (!silent && requestVersionRef.current === requestVersion) {
                setAggregatedData(null);
                setError(err instanceof Error ? err.message : 'خطا در دریافت داده‌ها');
            }
            return false;
        } finally {
            if (aggregateAbortRef.current === controller) {
                aggregateAbortRef.current = null;
            }
            if (!silent && requestVersionRef.current === requestVersion) setLoading(false);
        }
    }, [selectedCompany, selectedSheetId, consolidation, restated, periodYears, isSnapshotSheet, selectedSnapshotNotice]);

    useEffect(() => {
        setSelectedSheetId((current) => sheetIdForConsolidation(current, consolidation));
    }, [consolidation]);

    useEffect(() => {
        setSelectedSnapshotSerial('');
        if (!selectedCompany || !isSnapshotSheet) {
            setSnapshotNotices([]);
            return;
        }
        let cancelled = false;
        void getFinancialNotices(selectedCompany.symbol, 1, 50)
            .then((result) => {
                if (cancelled) return;
                setSnapshotNotices(result.notices.filter((notice) =>
                    notice.fiscalYear !== null
                    && notice.isConsolidated === (consolidation === 'consolidated')
                    && notice.isRestated === (restated === 'yes')
                ));
            })
            .catch(() => {
                if (!cancelled) setSnapshotNotices([]);
            });
        return () => {
            cancelled = true;
        };
    }, [selectedCompany, consolidation, restated, isSnapshotSheet]);

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
            aggregateAbortRef.current?.abort();
            aggregateAbortRef.current = null;
            if (retryTimer !== undefined) window.clearTimeout(retryTimer);
        };
    }, [loadAggregatedData, selectedCompany]);

    useEffect(() => {
        setExportError(null);
    }, [displayTable, periodYears, consolidation, restated, selectedSheetId]);

    const handleSelectCompany = useCallback((company: CompanySuggestion | null) => {
        aggregateAbortRef.current?.abort();
        aggregateAbortRef.current = null;
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

    const handleExport = useCallback(async (format: ExportFormat) => {
        if (!displayTable) {
            setExportError('داده‌ای برای خروجی وجود ندارد.');
            return;
        }

        const dimensions = {
            dataRowCount: displayTable.rows.length,
            columnCount: displayTable.columns.length + 1,
        };
        const localError = validateExportDimensions(dimensions, format);
        if (localError) {
            setExportError(localError);
            return;
        }

        try {
            await validateFinancialStatementExport({
                format,
                dataRowCount: dimensions.dataRowCount,
                columnCount: dimensions.columnCount,
            });
        } catch (err) {
            setExportError(err instanceof Error ? err.message : 'اعتبارسنجی خروجی ناموفق بود.');
            return;
        }

        const filenameBase = `${selectedCompany?.symbol ?? 'financials'}-${selectedSheet.en}`;
        if (format === 'csv') {
            exportStatementCsv(displayTable, filenameBase);
        } else {
            exportStatementXlsx(displayTable, filenameBase);
        }
        setExportError(null);
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
                            {REPORT_SHEETS.filter((sheet) => sheet.group !== 'financial' || sheet.consolidation === consolidation).map((sheet) => (
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
                                    {sheet.fa.replace(/^صورت\s+/, '').replace(/^خلاصه اطلاعات گزارش تفسیری - /, 'تفسیری ')}
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
                            onRefresh={() => void loadAggregatedData(false)}
                            onExport={(format) => void handleExport(format)}
                            exportDisabled={!displayTable || loading}
                            exportError={exportError}
                        />
                        {isSnapshotSheet && snapshotNotices.length > 0 ? (
                            <label className="mt-3 flex flex-col gap-1.5 text-xs font-medium text-muted sm:max-w-xl">
                                گزارش منبع
                                <select
                                    className="h-10 rounded-xl border border-border/70 bg-surface px-3 text-sm font-semibold text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                                    onChange={(event) => setSelectedSnapshotSerial(event.target.value)}
                                    value={selectedSnapshotSerial}
                                >
                                    <option value="">جدیدترین گزارش موجود</option>
                                    {snapshotNotices.map((notice) => (
                                        <option key={notice.letterSerial} value={notice.letterSerial}>
                                            {notice.title} — انتشار {notice.publishDateTime}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : null}
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
                                {isSnapshotSheet && aggregatedData.columnMeta[0] ? (
                                    <div
                                        className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-6 text-muted">
                                        <span>
                                            {selectedSnapshotNotice ? 'گزارش انتخاب‌شده:' : 'این جدول مقایسه‌ای نیست و از جدیدترین گزارش موجود نمایش داده می‌شود:'}
                                            {' '}دوره منتهی به {aggregatedData.columnMeta[0].periodEndDate.replace(/-/g, '/')}
                                            {' '}— انتشار {aggregatedData.columnMeta[0].publishDateTime}.
                                        </span>
                                        {aggregatedData.columnMeta[0].reportUrl ? (
                                            <a
                                                className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                                                href={aggregatedData.columnMeta[0].reportUrl}
                                                rel="noreferrer"
                                                target="_blank"
                                            >
                                                گزارش منبع کدال
                                                <ExternalLink className="h-3.5 w-3.5"/>
                                            </a>
                                        ) : null}
                                    </div>
                                ) : null}
                                {aggregatedData.unavailableReportCount > 0 ? (
                                    <div
                                        className="mb-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs leading-6 text-warning">
                                        {aggregatedData.reportCount} گزارش نمایش داده شد؛
                                        برای {aggregatedData.unavailableReportCount.toLocaleString('fa-IR')} سال دیگر،
                                        شیت انتخابی وجود نداشت یا جدول آن قابل استخراج نبود.
                                    </div>
                                ) : null}
                                {aggregatedData.table.unitNote ? (
                                    <div className="mb-3 text-xs text-muted">{aggregatedData.table.unitNote}</div>
                                ) : null}
                                <div className="mb-3 flex justify-end">
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
                                ) : displayTable && displayTable.columns.length > 0 ? (
                                    <FinancialStatementsTable data={aggregatedData} table={displayTable}
                                                              rowSearch={rowSearch}/>
                                ) : null}
                            </div>
                        ) : null}
                    </section>
                </div>
            )}
        </main>
    );
}

function sheetIdForConsolidation(sheetId: number, consolidation: ConsolidationFilter): number {
    const pairs: Record<number, { consolidated: number; nonConsolidated: number }> = {
        14: {consolidated: 14, nonConsolidated: 0},
        0: {consolidated: 14, nonConsolidated: 0},
        3: {consolidated: 14, nonConsolidated: 0},
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
