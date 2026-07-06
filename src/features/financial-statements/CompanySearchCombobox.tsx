import {Loader2, Search, X} from 'lucide-react';
import {type KeyboardEvent, useEffect, useId, useMemo, useRef, useState} from 'react';
import type {CompanySuggestion} from '../../types/codal';
import {normalizePersian} from '../../utils/normalize';
import {useCompanySearch} from './useCompanySearch';

const RECENT_SYMBOLS_STORAGE_KEY = 'codal-ui-recent-symbols';
const MAX_RECENT_ITEMS = 6;

type CompanySearchComboboxProps = {
    selectedCompany: CompanySuggestion | null;
    onSelectCompany: (company: CompanySuggestion) => void;
    placeholder?: string;
};

const loadRecentItems = (): CompanySuggestion[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(RECENT_SYMBOLS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as CompanySuggestion[];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (item) =>
                item &&
                typeof item === 'object' &&
                typeof item.symbol === 'string' &&
                typeof item.companyName === 'string'
        );
    } catch {
        return [];
    }
};

const saveRecentItems = (items: CompanySuggestion[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(RECENT_SYMBOLS_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT_ITEMS)));
};

const mergeRecentItems = (current: CompanySuggestion[], target: CompanySuggestion) => {
    const filtered = current.filter((item) => item.symbol !== target.symbol);
    return [target, ...filtered].slice(0, MAX_RECENT_ITEMS);
};

const HighlightedText = ({text, query}: { text: string; query: string }) => {
    const normalizedText = normalizePersian(text);
    const normalizedQuery = normalizePersian(query).trim();
    if (normalizedQuery === '') return <>{text}</>;

    const matchIndex = normalizedText.indexOf(normalizedQuery);
    if (matchIndex === -1) return <>{text}</>;

    const endIndex = matchIndex + normalizedQuery.length;
    return (
        <>
            {text.slice(0, matchIndex)}
            <mark className="rounded bg-primary/15 px-0.5 text-text">{text.slice(matchIndex, endIndex)}</mark>
            {text.slice(endIndex)}
        </>
    );
};

export default function CompanySearchCombobox({
                                                  selectedCompany,
                                                  onSelectCompany,
                                                  placeholder = 'جستجوی نماد یا نام شرکت',
                                              }: CompanySearchComboboxProps) {
    const listboxId = useId();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(selectedCompany?.symbol ?? '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [recentItems, setRecentItems] = useState<CompanySuggestion[]>(() => loadRecentItems());

    const query = inputValue.trim();
    const {loading, error, results, retry} = useCompanySearch(query, open);

    const visibleItems = useMemo(() => (query === '' ? recentItems : results), [query, recentItems, results]);
    const sectionLabel = query === '' ? 'جستجوهای اخیر' : 'نتایج جستجو';

    useEffect(() => {
        if (open) return;
        setInputValue(selectedCompany?.symbol ?? '');
    }, [open, selectedCompany]);

    useEffect(() => {
        if (!open) {
            setHighlightedIndex(-1);
            return;
        }
        setHighlightedIndex(visibleItems.length > 0 ? 0 : -1);
    }, [open, visibleItems]);

    useEffect(() => {
        if (highlightedIndex < 0) return;
        optionRefs.current[highlightedIndex]?.scrollIntoView({block: 'nearest'});
    }, [highlightedIndex]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectCompany = (company: CompanySuggestion) => {
        const nextRecent = mergeRecentItems(recentItems, company);
        setRecentItems(nextRecent);
        saveRecentItems(nextRecent);
        onSelectCompany(company);
        setInputValue(company.symbol);
        setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!open) setOpen(true);
            setHighlightedIndex((index) => Math.min(index + 1, visibleItems.length - 1));
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((index) => Math.max(index - 1, 0));
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            if (highlightedIndex >= 0 && visibleItems[highlightedIndex]) {
                selectCompany(visibleItems[highlightedIndex]);
            }
            return;
        }
        if (event.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div ref={rootRef} className="relative w-full max-w-xl">
            <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"/>
                <input
                    aria-autocomplete="list"
                    aria-controls={listboxId}
                    aria-expanded={open}
                    className="w-full rounded-xl border border-border/70 bg-surface-2 py-2.5 pl-10 pr-10 text-sm text-text placeholder:text-muted focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                    onChange={(event) => {
                        setInputValue(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    role="combobox"
                    type="search"
                    value={inputValue}
                />
                {inputValue && (
                    <button
                        aria-label="پاک کردن"
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:bg-surface hover:text-text"
                        onClick={() => {
                            setInputValue('');
                            setOpen(true);
                        }}
                        type="button"
                    >
                        <X className="h-4 w-4"/>
                    </button>
                )}
            </div>

            {open && (
                <div
                    className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-card dark:shadow-none"
                    id={listboxId}
                    role="listbox"
                >
                    <div className="border-b border-border/60 px-3 py-2 text-xs text-muted">{sectionLabel}</div>
                    <div className="thin-scrollbar max-h-72 overflow-y-auto p-1">
                        {loading && (
                            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted">
                                <Loader2 className="h-4 w-4 animate-spin"/>
                                در حال جستجو...
                            </div>
                        )}
                        {!loading && error && (
                            <div className="px-3 py-4 text-sm text-negative">
                                {error}
                                <button className="mr-2 text-primary underline" onClick={() => void retry()}
                                        type="button">
                                    تلاش مجدد
                                </button>
                            </div>
                        )}
                        {!loading && !error && visibleItems.length === 0 && (
                            <div className="px-3 py-4 text-sm text-muted">
                                {query ? 'نتیجه‌ای یافت نشد' : 'نمادی برای نمایش وجود ندارد'}
                            </div>
                        )}
                        {!loading &&
                            !error &&
                            visibleItems.map((company, index) => (
                                <button
                                    key={company.symbol}
                                    ref={(element) => {
                                        optionRefs.current[index] = element;
                                    }}
                                    className={`flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-right transition ${
                                        highlightedIndex === index
                                            ? 'bg-primary/10 text-text'
                                            : 'text-text hover:bg-surface-2'
                                    }`}
                                    onClick={() => selectCompany(company)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    role="option"
                                    type="button"
                                >
                                    <span className="text-sm font-medium">
                                        <HighlightedText query={query} text={company.symbol}/>
                                    </span>
                                    <span className="text-xs text-muted">
                                        <HighlightedText query={query} text={company.companyName}/>
                                    </span>
                                </button>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}
