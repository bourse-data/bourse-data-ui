import {Building2, ChartNoAxesCombined, Hash} from 'lucide-react';
import type {CompanySuggestion} from '../../../types/codal';

type SymbolHeaderProps = {
    company: CompanySuggestion;
};

export default function SymbolHeader({company}: SymbolHeaderProps) {
    return (
        <section
            className="overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-card dark:shadow-none">
            <div
                className="flex flex-col gap-5 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                        <ChartNoAxesCombined className="h-7 w-7"/>
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-2xl font-black text-text">{company.symbol}</h2>
                            <span
                                className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                                صورت‌های مالی
                            </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted">{company.companyName}</p>
                    </div>
                </div>

                <div className="grid gap-2 text-xs sm:min-w-[320px] sm:grid-cols-2">
                    {company.industry ? (
                        <div
                            className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface/80 px-3 py-2.5">
                            <Building2 className="h-4 w-4 shrink-0 text-primary"/>
                            <span className="min-w-0 truncate text-muted">{company.industry}</span>
                        </div>
                    ) : null}
                    {company.instrumentCode ? (
                        <div
                            className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface/80 px-3 py-2.5"
                            dir="ltr">
                            <Hash className="h-4 w-4 shrink-0 text-primary"/>
                            <span className="min-w-0 truncate tabular-nums text-muted">{company.instrumentCode}</span>
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
