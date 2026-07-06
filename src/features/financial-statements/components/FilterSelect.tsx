import {Check, ChevronDown} from 'lucide-react';
import {useEffect, useId, useRef, useState} from 'react';

export type FilterOption<T extends string | number = string | number> = {
    value: T;
    label: string;
};

export type FilterOptionGroup<T extends string | number = string | number> = {
    label: string;
    options: FilterOption<T>[];
};

type FilterSelectProps<T extends string | number = string | number> = {
    label?: string;
    value: T;
    onChange: (value: T) => void;
    options: FilterOption<T>[] | FilterOptionGroup<T>[];
    placeholder?: string;
    className?: string;
    icon?: React.ReactNode;
};

function isGrouped<T extends string | number>(
    opts: FilterOption<T>[] | FilterOptionGroup<T>[]
): opts is FilterOptionGroup<T>[] {
    return opts.length > 0 && 'options' in (opts[0] as any);
}

export default function FilterSelect<T extends string | number = string | number>({
                                                                                      label,
                                                                                      value,
                                                                                      onChange,
                                                                                      options,
                                                                                      placeholder = 'انتخاب کنید',
                                                                                      className = '',
                                                                                      icon,
                                                                                  }: FilterSelectProps<T>) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);
    const id = useId();

    const grouped = isGrouped(options);
    const flatOptions: FilterOption<T>[] = grouped
        ? (options as FilterOptionGroup<T>[]).flatMap((g) => g.options)
        : (options as FilterOption<T>[]);

    const current = flatOptions.find((o) => o.value === value);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on Escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        if (open) document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open]);

    const selectValue = (v: T) => {
        onChange(v);
        setOpen(false);
        buttonRef.current?.focus();
    };

    const displayLabel = current ? current.label : placeholder;

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            {label && (
                <div className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-medium text-muted">
                    {icon}
                    <span>{label}</span>
                </div>
            )}

            <button
                ref={buttonRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={`${id}-list`}
                onClick={() => setOpen((o) => !o)}
                className="group flex h-11 w-full min-w-[148px] items-center justify-between gap-2.5 rounded-2xl border border-border/70 bg-surface px-4 py-2 text-sm font-semibold text-text transition-all hover:border-primary/40 hover:bg-surface-2 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/15 active:scale-[0.985]"
            >
                <span className="truncate text-right">{displayLabel}</span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted transition-transform group-hover:text-text ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div
                    id={`${id}-list`}
                    ref={listRef}
                    role="listbox"
                    className="absolute z-50 mt-1.5 w-full min-w-[240px] overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-card dark:shadow-none"
                >
                    <div className="thin-scrollbar max-h-[340px] overflow-y-auto py-1">
                        {grouped ? (
                            (options as FilterOptionGroup<T>[]).map((group, gi) => (
                                <div key={gi}>
                                    <div
                                        className="px-3.5 pb-1 pt-2.5 text-[10px] font-bold tracking-[0.5px] text-primary/80">
                                        {group.label}
                                    </div>
                                    {group.options.map((opt) => {
                                        const selected = opt.value === value;
                                        return (
                                            <button
                                                key={String(opt.value)}
                                                type="button"
                                                role="option"
                                                aria-selected={selected}
                                                onClick={() => selectValue(opt.value)}
                                                className={`flex w-full items-center justify-between gap-2 px-3.5 py-[9px] text-sm transition ${
                                                    selected
                                                        ? 'bg-primary/12 text-text font-semibold'
                                                        : 'text-text hover:bg-surface-2'
                                                }`}
                                            >
                                                <span className="truncate text-right">{opt.label}</span>
                                                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary"/>}
                                            </button>
                                        );
                                    })}
                                    {gi < (options as FilterOptionGroup<T>[]).length - 1 && (
                                        <div className="mx-2 my-1 border-t border-border/40"/>
                                    )}
                                </div>
                            ))
                        ) : (
                            (options as FilterOption<T>[]).map((opt) => {
                                const selected = opt.value === value;
                                return (
                                    <button
                                        key={String(opt.value)}
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        onClick={() => selectValue(opt.value)}
                                        className={`flex w-full items-center justify-between gap-2 px-3.5 py-[9px] text-sm transition ${
                                            selected
                                                ? 'bg-primary/12 text-text font-semibold'
                                                : 'text-text hover:bg-surface-2'
                                        }`}
                                    >
                                        <span className="truncate text-right">{opt.label}</span>
                                        {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary"/>}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
