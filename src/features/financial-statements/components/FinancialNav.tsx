export type ReportSheet = {
    value: number;
    fa: string;
    en: string;
    group: 'financial' | 'interpretive' | 'company';
    consolidation: 'consolidated' | 'non-consolidated' | 'any';
};

export const REPORT_SHEETS: ReportSheet[] = [
    {value: 19, fa: 'نظر حسابرس', en: "Auditor's Opinion", group: 'company', consolidation: 'any'},
    {
        value: 13,
        fa: 'صورت سود و زیان تلفیقی',
        en: 'Consolidated Income Statement',
        group: 'financial',
        consolidation: 'consolidated'
    },
    {
        value: 1097,
        fa: 'صورت سود و زیان جامع تلفیقی',
        en: 'Consolidated Statement of Comprehensive Income',
        group: 'financial',
        consolidation: 'consolidated'
    },
    {
        value: 14,
        fa: 'صورت وضعیت مالی تلفیقی',
        en: 'Consolidated Statement of Financial Position (Balance Sheet)',
        group: 'financial',
        consolidation: 'consolidated'
    },
    {
        value: 1099,
        fa: 'صورت تغییرات در حقوق مالکانه تلفیقی',
        en: 'Consolidated Statement of Changes in Equity',
        group: 'financial',
        consolidation: 'consolidated'
    },
    {
        value: 15,
        fa: 'صورت جریان‌های نقدی تلفیقی',
        en: 'Consolidated Statement of Cash Flows',
        group: 'financial',
        consolidation: 'consolidated'
    },
    {value: 1, fa: 'صورت سود و زیان', en: 'Income Statement', group: 'financial', consolidation: 'non-consolidated'},
    {
        value: 1058,
        fa: 'صورت سود و زیان جامع',
        en: 'Statement of Comprehensive Income',
        group: 'financial',
        consolidation: 'non-consolidated'
    },
    {
        value: 0,
        fa: 'صورت وضعیت مالی',
        en: 'Statement of Financial Position (Balance Sheet)',
        group: 'financial',
        consolidation: 'non-consolidated'
    },
    {
        value: 1060,
        fa: 'صورت تغییرات در حقوق مالکانه',
        en: 'Statement of Changes in Equity',
        group: 'financial',
        consolidation: 'non-consolidated'
    },
    {
        value: 9,
        fa: 'صورت جریان‌های نقدی',
        en: 'Statement of Cash Flows',
        group: 'financial',
        consolidation: 'non-consolidated'
    },
    {
        value: 20,
        fa: 'خلاصه اطلاعات گزارش تفسیری - صفحه ۱',
        en: 'Management Discussion & Analysis Summary - Page 1',
        group: 'interpretive',
        consolidation: 'any'
    },
    {
        value: 21,
        fa: 'خلاصه اطلاعات گزارش تفسیری - صفحه ۲',
        en: 'Management Discussion & Analysis Summary - Page 2',
        group: 'interpretive',
        consolidation: 'any'
    },
    {
        value: 22,
        fa: 'خلاصه اطلاعات گزارش تفسیری - صفحه ۳',
        en: 'Management Discussion & Analysis Summary - Page 3',
        group: 'interpretive',
        consolidation: 'any'
    },
    {
        value: 23,
        fa: 'خلاصه اطلاعات گزارش تفسیری - صفحه ۴',
        en: 'Management Discussion & Analysis Summary - Page 4',
        group: 'interpretive',
        consolidation: 'any'
    },
    {
        value: 24,
        fa: 'خلاصه اطلاعات گزارش تفسیری - صفحه ۵',
        en: 'Management Discussion & Analysis Summary - Page 5',
        group: 'interpretive',
        consolidation: 'any'
    },
    {value: 30, fa: 'اعضای هیئت مدیره', en: 'Board of Directors', group: 'company', consolidation: 'any'},
    {value: 51, fa: 'شرکت‌های فرعی', en: 'Subsidiaries', group: 'company', consolidation: 'any'},
    {value: 52, fa: 'شرکت‌های وابسته', en: 'Associated Companies (Affiliates)', group: 'company', consolidation: 'any'},
];

const GROUP_LABELS: Record<ReportSheet['group'], string> = {
    financial: 'صورت‌های مالی',
    interpretive: 'گزارش تفسیری مدیریت',
    company: 'حسابرسی و اطلاعات شرکت',
};

type FinancialNavProps = {
    selectedSheetId: number;
    onSelectSheet: (sheetId: number) => void;
};

export function getReportSheet(sheetId: number): ReportSheet {
    return REPORT_SHEETS.find((sheet) => sheet.value === sheetId) ?? REPORT_SHEETS.find((sheet) => sheet.value === 0)!;
}

// Note: Visual component no longer used after redesign to horizontal buttons in FinancialStatementsApp.
// REPORT_SHEETS and getReportSheet are still exported for data/logic.
export default function FinancialNav({selectedSheetId, onSelectSheet}: FinancialNavProps) {
    const selectedSheet = getReportSheet(selectedSheetId);

    return (
        <div
            className="mb-4 grid gap-3 rounded-xl border border-border/60 bg-surface-2/40 p-3 lg:grid-cols-[minmax(280px,480px)_1fr] lg:items-center">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
                نوع صورت مالی یا گزارش
                <select
                    className="h-11 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm font-semibold text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    onChange={(event) => onSelectSheet(Number(event.target.value))}
                    value={selectedSheetId}
                >
                    {(['financial', 'interpretive', 'company'] as const).map((group) => (
                        <optgroup key={group} label={GROUP_LABELS[group]}>
                            {REPORT_SHEETS.filter((sheet) => sheet.group === group).map((sheet) => (
                                <option key={sheet.value} value={sheet.value}>{sheet.fa}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </label>
            <div className="min-w-0 rounded-xl border border-border/50 bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-text">{selectedSheet.fa}</strong>
                </div>
                <p className="mt-1 truncate text-xs text-muted" dir="ltr">{selectedSheet.en}</p>
            </div>
        </div>
    );
}
