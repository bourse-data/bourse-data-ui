import {ChevronDown, Download, RefreshCw} from 'lucide-react';
import {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import FilterSelect, {type FilterOption} from './FilterSelect';
import type {ConsolidationFilter, PeriodFilter, RestatedFilter} from '../../../services/codalAggregationService';
import type {ExportFormat} from '../../../utils/exportLimits';
import {CsvFormatIcon, ExcelFormatIcon} from './ExportFormatIcons';

type FinancialStatementsFilterBarProps = {
    consolidation: ConsolidationFilter;
    onConsolidationChange: (value: ConsolidationFilter) => void;
    restated: RestatedFilter;
    onRestatedChange: (value: RestatedFilter) => void;
    periodYears: PeriodFilter;
    onPeriodYearsChange: (value: PeriodFilter) => void;
    onRefresh: () => void;
    onExport: (format: ExportFormat) => void;
    exportDisabled?: boolean;
    exportError?: string | null;
};

const consolidationOptions: FilterOption<ConsolidationFilter>[] = [
    {value: 'consolidated', label: 'تلفیقی'},
    {value: 'non-consolidated', label: 'غیرتلفیقی'},
];

const restatedOptions: FilterOption<RestatedFilter>[] = [
    {value: 'dont-care', label: 'همه'},
    {value: 'yes', label: 'فقط تجدید ارائه'},
    {value: 'no', label: 'بدون تجدید ارائه'},
];

const periodLabels: Record<PeriodFilter, string> = {
    1: 'یکساله',
    2: 'دوساله',
    5: 'پنج ساله',
    10: 'ده ساله',
    20: 'بیست ساله',
};

const periodOptions: FilterOption<PeriodFilter>[] = ([1, 2, 5, 10, 20] as PeriodFilter[]).map((value) => ({
    value,
    label: periodLabels[value],
}));

export default function FinancialStatementsFilterBar({
                                                         consolidation,
                                                         onConsolidationChange,
                                                         restated,
                                                         onRestatedChange,
                                                         periodYears,
                                                         onPeriodYearsChange,
                                                         onRefresh,
                                                         onExport,
                                                         exportDisabled = false,
                                                         exportError = null,
                                                     }: FinancialStatementsFilterBarProps) {
    return (
        <div className="rounded-xl border border-border/70 bg-surface-2/50 p-3" dir="rtl">
            <div className="thin-scrollbar flex min-w-max items-end justify-start gap-3 overflow-x-auto pb-1">
                <FilterSelect label="تلفیقی" value={consolidation} onChange={onConsolidationChange}
                              options={consolidationOptions} menuAlign="end"/>
                <FilterSelect label="تجدید ارائه شده" value={restated} onChange={onRestatedChange}
                              options={restatedOptions} menuAlign="end"/>
                <FilterSelect label="دوره" value={periodYears} onChange={onPeriodYearsChange}
                              options={periodOptions} menuAlign="end"/>
                <ExportMenu
                    disabled={exportDisabled}
                    error={exportError}
                    onExport={onExport}
                />
                <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border/70 bg-surface px-3 text-xs font-semibold text-muted transition hover:border-primary/50 hover:text-text"
                >
                    <RefreshCw className="h-3.5 w-3.5"/>
                    بازنشانی
                </button>
            </div>
        </div>
    );
}

type ExportMenuProps = {
    disabled?: boolean;
    error?: string | null;
    onExport: (format: ExportFormat) => void;
};

function ExportMenu({disabled = false, error = null, onExport}: ExportMenuProps) {
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);
    const id = useId();

    const updateMenuPosition = () => {
        const button = buttonRef.current;
        if (!button) return;
        const rect = button.getBoundingClientRect();
        const width = 220;
        setMenuStyle({
            top: rect.bottom + 6,
            left: rect.right - width,
            width,
        });
    };

    useLayoutEffect(() => {
        if (!open) {
            setMenuStyle(null);
            return;
        }
        updateMenuPosition();
        const handleReposition = () => updateMenuPosition();
        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);
        return () => {
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || listRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        if (open) document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open]);

    const selectFormat = (format: ExportFormat) => {
        onExport(format);
        setOpen(false);
    };

    return (
        <div ref={rootRef} className="relative shrink-0">
            <div className="mb-1.5 px-0.5 text-right text-[11px] font-medium text-muted">خروجی</div>
            <button
                ref={buttonRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={`${id}-export-menu`}
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Download className="h-3.5 w-3.5"/>
                <span>دریافت فایل</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}/>
            </button>

            {error && (
                <div
                    className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-2 text-[11px] leading-5 text-warning">
                    {error}
                </div>
            )}

            {open && menuStyle && typeof document !== 'undefined'
                ? createPortal(
                    <div
                        id={`${id}-export-menu`}
                        ref={listRef}
                        role="menu"
                        style={{
                            position: 'fixed',
                            top: menuStyle.top,
                            left: menuStyle.left,
                            width: menuStyle.width,
                            zIndex: 1000,
                        }}
                        className="overflow-hidden rounded-xl border border-border/70 bg-surface p-1 shadow-card dark:shadow-none"
                    >
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => selectFormat('xlsx')}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-text transition hover:bg-surface-2"
                        >
                            <span className="flex-1 text-right leading-5">خروجی Excel (.xlsx)</span>
                            <ExcelFormatIcon className="h-6 w-6 shrink-0"/>
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => selectFormat('csv')}
                            className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-text transition hover:bg-surface-2"
                        >
                            <span className="flex-1 text-right leading-5">خروجی CSV (.csv)</span>
                            <CsvFormatIcon className="h-6 w-6 shrink-0"/>
                        </button>
                    </div>,
                    document.body
                )
                : null}
        </div>
    );
}
