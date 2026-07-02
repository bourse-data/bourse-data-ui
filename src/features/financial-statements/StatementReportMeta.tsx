import type {StatementReport} from '../../types/codal';
import {formatDateTimeFa} from '../../utils/formatDateTime';
import {ltrNumericClassName} from '../../utils/normalize';

type StatementReportMetaProps = {
    report: StatementReport;
};

const MetaItem = ({label, value}: {label: string; value: string | number | boolean}) => {
    const displayValue =
        typeof value === 'boolean' ? (value ? 'بله' : 'خیر') : value === '' ? '—' : String(value);

    return (
        <div className="rounded-xl border border-border/60 bg-surface-2 px-3 py-2.5">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className={`mt-1 text-sm font-medium text-text ${typeof value === 'number' ? ltrNumericClassName : ''}`}>
                {displayValue}
            </dd>
        </div>
    );
};

export default function StatementReportMeta({report}: StatementReportMetaProps) {
    return (
        <section className="rounded-2xl border border-border/70 bg-surface p-4 shadow-card dark:shadow-none">
            <div className="mb-4">
                <h2 className="text-base font-semibold text-text">{report.title}</h2>
                <p className="mt-1 text-sm text-muted">
                    {report.companyName} ({report.symbol})
                </p>
            </div>

            <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <MetaItem label="دوره گزارش" value={report.periodDescription}/>
                <MetaItem label="پایان دوره" value={report.periodEndToDate}/>
                <MetaItem label="پایان سال مالی" value={report.yearEndToDate}/>
                <MetaItem label="ماه‌های دوره" value={report.periodMonths}/>
                <MetaItem label="تلفیقی" value={report.isConsolidated}/>
                <MetaItem label="حسابرسی شده" value={report.isAudited}/>
                <MetaItem label="وضعیت حسابرسی" value={report.auditedLabel}/>
                <MetaItem label="وضعیت شرکت" value={report.companyState}/>
                <MetaItem label="سرمایه ثبت‌شده" value={report.registeredCapital}/>
                <MetaItem label="سرمایه ثبت‌نشده" value={report.unregisteredCapital}/>
                <MetaItem label="کد صنعت" value={report.industryCode}/>
                <MetaItem label="شماره رهگیری" value={report.tracingNumber}/>
                <MetaItem label="تاریخ انتشار" value={formatDateTimeFa(report.publishDateTime)}/>
                {report.unitNote && <MetaItem label="واحد گزارش" value={report.unitNote}/>}
            </dl>

            {report.signatureNote && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-positive/30 bg-positive/5 px-3 py-2.5 text-xs leading-6 text-positive">
                    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                        i
                    </span>
                    <p className="text-text/90">{report.signatureNote}</p>
                </div>
            )}
        </section>
    );
}
