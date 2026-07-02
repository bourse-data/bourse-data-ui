import {useCallback, useEffect, useMemo, useState} from 'react';
import {getCompanies} from '../../lib/api';
import type {CompanySuggestion} from '../../types/codal';
import {normalizePersian} from '../../utils/normalize';

let companiesCache: CompanySuggestion[] | null = null;
let companiesPromise: Promise<CompanySuggestion[]> | null = null;

async function loadCompanies(): Promise<CompanySuggestion[]> {
    if (companiesCache) return companiesCache;
    if (!companiesPromise) {
        companiesPromise = getCompanies().then((result) => {
            companiesCache = result.companies.map((company) => ({
                symbol: company.symbol.trim(),
                companyName: company.companyName.trim(),
            }));
            return companiesCache;
        });
    }
    return companiesPromise;
}

export function useCompanySearch(query: string, enabled: boolean) {
    const [companies, setCompanies] = useState<CompanySuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCompanies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const items = await loadCompanies();
            setCompanies(items);
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : 'دریافت لیست شرکت‌ها ناموفق بود');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        void fetchCompanies();
    }, [enabled, fetchCompanies]);

    const results = useMemo(() => {
        const normalizedQuery = normalizePersian(query);
        if (!normalizedQuery) return [];

        const matched = companies.filter((company) => {
            const symbol = normalizePersian(company.symbol);
            const name = normalizePersian(company.companyName);
            return symbol.includes(normalizedQuery) || name.includes(normalizedQuery);
        });

        return matched
            .sort((left, right) => {
                const leftSymbol = normalizePersian(left.symbol);
                const rightSymbol = normalizePersian(right.symbol);
                const leftName = normalizePersian(left.companyName);
                const rightName = normalizePersian(right.companyName);

                const score = (symbol: string, name: string) => {
                    if (symbol === normalizedQuery) return 0;
                    if (symbol.startsWith(normalizedQuery)) return 1;
                    if (name.startsWith(normalizedQuery)) return 2;
                    if (symbol.includes(normalizedQuery)) return 3;
                    return 4;
                };

                const leftScore = score(leftSymbol, leftName);
                const rightScore = score(rightSymbol, rightName);
                if (leftScore !== rightScore) return leftScore - rightScore;
                return leftSymbol.localeCompare(rightSymbol, 'fa');
            })
            .slice(0, 20);
    }, [companies, query]);

    return {loading, error, results, retry: fetchCompanies};
}
