import {useMemo} from 'react';
import type {AggregatedData} from '../../../services/codalAggregationService';
import {normalizePersian} from '../../../utils/normalize';

interface NarrativeReportViewProps {
    data: AggregatedData;
    rowSearch: string;
}

const emptyValues = new Set(['', '0', '۰', '٠', '-', '—']);

export default function NarrativeReportView({data, rowSearch}: NarrativeReportViewProps) {
    const sections = useMemo(() => {
        const seen = new Set<string>();
        const rawSections = data.table.rows.flatMap((row, index) => {
            const values = Object.values(row.values)
                .map((value) => value.trim())
                .filter((value) => !emptyValues.has(value))
                .filter((value) => {
                    const key = normalizePersian(value).replace(/\s+/g, ' ').trim();
                    if (!key || key === normalizePersian(row.label) || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            const text = values.join('\n\n');
            if (!text && row.kind !== 'section') return [];
            if (!text && /^ردیف\s+\d+$/.test(row.label)) return [];
            const haystack = normalizePersian(`${row.label} ${text}`);
            if (rowSearch.trim() && !haystack.includes(normalizePersian(rowSearch))) return [];
            return [{key: `${row.label}-${index}`, label: row.label, text}];
        });
        return rawSections.reduce<typeof rawSections>((result, section) => {
            const previous = result[result.length - 1];
            if (previous && !previous.text && section.text) {
                previous.text = section.text;
                return result;
            }
            result.push(section);
            return result;
        }, []);
    }, [data.table.rows, rowSearch]);

    if (sections.length === 0) {
        return <div
            className="rounded-xl border border-border/70 bg-surface-2 px-4 py-8 text-center text-sm text-muted">داده‌ای
            یافت نشد.</div>;
    }

    return (
        <article className="space-y-3 rounded-xl border border-border/70 bg-surface p-3 sm:p-4">
            {sections.map((section) => (
                <section key={section.key} className="rounded-xl border border-border/50 bg-surface-2/35 p-4 sm:p-5">
                    {!/^ردیف\s+\d+$/.test(section.label) && (
                        <h3 className="mb-3 text-sm font-bold text-primary">{section.label}</h3>
                    )}
                    {section.text && (
                        <div
                            className="whitespace-pre-line text-justify text-sm leading-8 text-text">{section.text}</div>
                    )}
                </section>
            ))}
        </article>
    );
}
