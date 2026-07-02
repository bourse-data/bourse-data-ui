import {useCallback, useEffect, useState} from 'react';
import {useFinancialNotices} from '../../hooks/useFinancialNotices';
import {getFinancialStatement} from '../../lib/api';
import type {CompanySuggestion, FinancialNoticeItem, FinancialStatementResult} from '../../types/codal';
import CompanySearchCombobox from './CompanySearchCombobox';
import FinancialNoticesPanel from './FinancialNoticesPanel';
import StatementDetailView from './StatementDetailView';

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
    const [selectedLetterSerial, setSelectedLetterSerial] = useState<string | null>(null);
    const [statement, setStatement] = useState<FinancialStatementResult | null>(null);
    const [statementLoading, setStatementLoading] = useState(false);
    const [statementError, setStatementError] = useState<string | null>(null);

    const {
        notices,
        totalCount,
        loading: noticesLoading,
        loadingMore: noticesLoadingMore,
        refreshing: noticesRefreshing,
        error: noticesError,
        hasMore: hasMoreNotices,
        loadMore,
        refresh,
    } = useFinancialNotices({
        symbol: selectedCompany?.symbol ?? null,
        enabled: true,
        autoRefresh: true,
    });

    const fetchStatement = useCallback(async (letterSerial: string) => {
        setStatementLoading(true);
        setStatementError(null);
        setStatement(null);

        try {
            const result = await getFinancialStatement(letterSerial);
            setStatement(result);
        } catch (fetchError) {
            setStatementError(fetchError instanceof Error ? fetchError.message : 'دریافت صورت مالی ناموفق بود');
        } finally {
            setStatementLoading(false);
        }
    }, []);

    const handleSelectCompany = useCallback((company: CompanySuggestion | null) => {
        setSelectedCompany(company);
        setSelectedLetterSerial(null);
        setStatement(null);
        setStatementError(null);
        updateQueryParams({symbol: company?.symbol ?? null, letterSerial: null});
    }, []);

    const handleSelectNotice = useCallback(
        (notice: FinancialNoticeItem) => {
            setSelectedLetterSerial(notice.letterSerial);
            if (!selectedCompany || selectedCompany.symbol !== notice.symbol) {
                const company: CompanySuggestion = {
                    symbol: notice.symbol,
                    companyName: notice.companyName,
                };
                setSelectedCompany(company);
                updateQueryParams({symbol: notice.symbol, letterSerial: notice.letterSerial});
            } else {
                updateQueryParams({letterSerial: notice.letterSerial});
            }
            void fetchStatement(notice.letterSerial);
        },
        [fetchStatement, selectedCompany]
    );

    useEffect(() => {
        const symbol = readQueryParam('symbol');
        const letterSerial = readQueryParam('letterSerial');

        if (symbol) {
            setSelectedCompany({symbol, companyName: symbol});
        }

        if (letterSerial) {
            setSelectedLetterSerial(letterSerial);
            void fetchStatement(letterSerial);
        }
    }, [fetchStatement]);

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
            <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[420px]">
                <section className="rounded-2xl border border-border/70 bg-surface p-4 shadow-card dark:shadow-none">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-text">جستجوی شرکت</h2>
                        {selectedCompany ? (
                            <button
                                className="text-xs text-primary transition hover:underline"
                                onClick={() => handleSelectCompany(null)}
                                type="button"
                            >
                                نمایش همه
                            </button>
                        ) : null}
                    </div>
                    <CompanySearchCombobox
                        onSelectCompany={handleSelectCompany}
                        selectedCompany={selectedCompany}
                    />
                    <p className="mt-3 text-xs leading-6 text-muted">
                        {selectedCompany
                            ? `فیلتر فعال: ${selectedCompany.companyName} (${selectedCompany.symbol})`
                            : 'همه اطلاعیه‌های مالی بازار نمایش داده می‌شوند. برای فیلتر، شرکت را جستجو کنید.'}
                    </p>
                </section>

                <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border/70 bg-surface p-4 shadow-card dark:shadow-none">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-text">اطلاعیه‌های مالی</h2>
                        <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] tabular-nums text-muted">
                            {notices.length.toLocaleString('fa-IR')}
                        </span>
                    </div>
                    <FinancialNoticesPanel
                        error={noticesError}
                        hasMore={hasMoreNotices}
                        loading={noticesLoading}
                        loadingMore={noticesLoadingMore}
                        notices={notices}
                        onLoadMore={loadMore}
                        onRefresh={refresh}
                        onSelectNotice={handleSelectNotice}
                        refreshing={noticesRefreshing}
                        selectedLetterSerial={selectedLetterSerial}
                        showSymbol={!selectedCompany}
                        totalCount={totalCount}
                    />
                </section>
            </aside>

            <main className="min-w-0 flex-1">
                <StatementDetailView error={statementError} loading={statementLoading} statement={statement}/>
            </main>
        </div>
    );
}
