import {Download, RefreshCw} from 'lucide-react';
import type {ColumnOrder, DetailMode, DisplayMode, TrendMode} from '../../../utils/statementTransforms';
import FilterSelect, {type FilterOption} from './FilterSelect';
import type {ConsolidationFilter, PeriodFilter, RestatedFilter} from '../../../services/codalAggregationService';

type FinancialStatementsFilterBarProps = {
    consolidation: ConsolidationFilter;
    onConsolidationChange: (value: ConsolidationFilter) => void;
    restated: RestatedFilter;
    onRestatedChange: (value: RestatedFilter) => void;
    periodYears: PeriodFilter;
    onPeriodYearsChange: (value: PeriodFilter) => void;
    detailMode: DetailMode;
    onDetailModeChange: (value: DetailMode) => void;
    displayMode: DisplayMode;
    onDisplayModeChange: (value: DisplayMode) => void;
    trendMode: TrendMode;
    onTrendModeChange: (value: TrendMode) => void;
    columnOrder: ColumnOrder;
    onColumnOrderChange: (value: ColumnOrder) => void;
    onRefresh: () => void;
    onExport: () => void;
};

const consolidationOptions: FilterOption<ConsolidationFilter>[] = [
    {value: 'consolidated', label: 'تلفیقی'},
    {value: 'non-consolidated', label: 'غیرتلفیقی'},
];

const restatedOptions: FilterOption<RestatedFilter>[] = [
    {value: 'dont-care', label: 'مهم نیست'},
    {value: 'yes', label: 'آری'},
    {value: 'no', label: 'خیر'},
];

const periodOptions: FilterOption<PeriodFilter>[] = [1, 2, 5, 10, 20].map((value) => ({
    value: value as PeriodFilter,
    label: value.toLocaleString('fa-IR'),
}));

const detailOptions: FilterOption<DetailMode>[] = [
    {value: 'details', label: 'جزئیات'},
    {value: 'summary', label: 'خلاصه'},
];
const displayOptions: FilterOption<DisplayMode>[] = [
    {value: 'normal', label: 'عادی'},
    {value: 'vertical', label: 'عمودی'},
];
const trendOptions: FilterOption<TrendMode>[] = [
    {value: 'none', label: 'بدون روند'},
    {value: 'yoy', label: 'نسبت به سال قبل'},
];
const orderOptions: FilterOption<ColumnOrder>[] = [
    {value: 'desc', label: 'نزولی'},
    {value: 'asc', label: 'صعودی'},
];

export default function FinancialStatementsFilterBar({
                                                          consolidation,
                                                          onConsolidationChange,
                                                          restated,
                                                          onRestatedChange,
                                                          periodYears,
                                                          onPeriodYearsChange,
                                                          detailMode,
                                                          onDetailModeChange,
                                                          displayMode,
                                                          onDisplayModeChange,
                                                          trendMode,
                                                          onTrendModeChange,
                                                          columnOrder,
                                                          onColumnOrderChange,
                                                          onRefresh,
                                                          onExport,
                                                      }: FinancialStatementsFilterBarProps) {
    return (
        <div className="rounded-xl border border-border/70 bg-surface-2/50 p-3">
            <div className="thin-scrollbar flex min-w-max flex-row-reverse items-end gap-3 overflow-x-auto pb-1">
                <FilterSelect label="تلفیقی" value={consolidation} onChange={onConsolidationChange}
                              options={consolidationOptions}/>
                <FilterSelect label="تجدید ارائه" value={restated} onChange={onRestatedChange}
                              options={restatedOptions}/>
                <StaticFilterField label="نوع" value="سالانه"/>
                <FilterSelect label="دوره" value={periodYears} onChange={onPeriodYearsChange}
                              options={periodOptions}/>
                <FilterSelect label="خلاصه/جزئیات" value={detailMode} onChange={onDetailModeChange}
                              options={detailOptions}/>
                <FilterSelect label="حالت" value={displayMode} onChange={onDisplayModeChange} options={displayOptions}/>
                <FilterSelect label="روند" value={trendMode} onChange={onTrendModeChange} options={trendOptions}/>
                <StaticFilterField label="واحد پولی" value="ریال"/>
                <FilterSelect label="ترتیب نمایش" value={columnOrder} onChange={onColumnOrderChange}
                              options={orderOptions}/>
                <button
                    type="button"
                    onClick={onExport}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600"
                >
                    <Download className="h-3.5 w-3.5"/>
                    خروجی
                </button>
                <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-surface px-3 text-xs font-semibold text-muted transition hover:border-primary/50 hover:text-text"
                >
                    <RefreshCw className="h-3.5 w-3.5"/>
                    بازنشانی
                </button>
            </div>
        </div>
    );
}

function StaticFilterField({label, value}: { label: string; value: string }) {
    return (
        <div className="shrink-0">
            <div className="mb-1.5 px-0.5 text-[11px] font-medium text-muted">{label}</div>
            <div
                className="flex h-9 min-w-[112px] items-center justify-center rounded-lg border border-border/50 bg-surface-2/80 px-3 text-xs font-semibold text-muted">
                {value}
            </div>
        </div>
    );
}
