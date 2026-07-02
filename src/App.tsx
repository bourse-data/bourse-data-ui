import {FileBarChart, Moon, Sun} from 'lucide-react';
import type {MouseEvent} from 'react';
import {useTheme} from './hooks/useTheme';
import FinancialStatementsApp from './features/financial-statements/FinancialStatementsApp';

export default function App() {
    const {theme, toggleTheme} = useTheme();

    const handleThemeToggle = (event: MouseEvent<HTMLButtonElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        toggleTheme({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        });
    };

    return (
        <div className="min-h-full bg-bg" dir="rtl">
            <header className="sticky top-0 z-20 border-b border-border/70 bg-surface/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
                            <FileBarChart className="h-5 w-5"/>
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-text">صورت‌های مالی کدال</h1>
                            <p className="text-xs text-muted">
                                اطلاعیه‌های مالی، صورت‌های تلفیقی و میان‌دوره‌ای
                            </p>
                        </div>
                    </div>

                    <button
                        aria-label={theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
                        className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-surface-2 px-3 py-2 text-sm text-muted transition hover:border-primary/40 hover:text-text"
                        onClick={handleThemeToggle}
                        type="button"
                    >
                        {theme === 'dark' ? (
                            <>
                                <Sun className="h-4 w-4"/>
                                <span className="hidden sm:inline">روشن</span>
                            </>
                        ) : (
                            <>
                                <Moon className="h-4 w-4"/>
                                <span className="hidden sm:inline">تاریک</span>
                            </>
                        )}
                    </button>
                </div>
            </header>

            <FinancialStatementsApp/>
        </div>
    );
}
