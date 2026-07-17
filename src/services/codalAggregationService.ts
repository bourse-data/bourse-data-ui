import {getAggregatedFinancialStatements} from '../lib/api';
import type {AggregatedColumnMeta, StatementTable} from '../types/codal';

export type ConsolidationFilter = 'consolidated' | 'non-consolidated';
export type RestatedFilter = 'yes' | 'no';
export type PeriodFilter = 1 | 2 | 5 | 10 | 20 | 30;

export interface AggregationOptions {
    symbol: string;
    periodYears: PeriodFilter;
    consolidation: ConsolidationFilter;
    restated: RestatedFilter;
    sheetId: number;
    sheetTitle: string;
}

export interface AggregatedData {
    symbol: string;
    statementType: string;
    sheetId: number;
    title: string;
    table: StatementTable;
    reportCount: number;
    unavailableReportCount: number;
    columnMeta: AggregatedColumnMeta[];
}

export function fetchAndAggregateStatements(options: AggregationOptions): Promise<AggregatedData | null> {
    const statementType = statementTypeForSheet(options.sheetId);
    return getAggregatedFinancialStatements(options.symbol, {
        statementType,
        consolidation: options.consolidation,
        restated: options.restated,
        periodYears: options.periodYears,
        reportType: 'annual',
        sheetId: options.sheetId,
    }).then((result) => ({
        symbol: result.symbol,
        statementType: result.statementType,
        sheetId: result.sheetId,
        title: result.title,
        table: result.table,
        reportCount: result.reportCount,
        unavailableReportCount: result.unavailableReportCount,
        columnMeta: result.columnMeta,
    }));
}

function statementTypeForSheet(sheetId: number): string {
    switch (sheetId) {
        case 13:
        case 1:
            return 'income-statement';
        case 15:
        case 9:
            return 'cash-flow';
        case 1097:
        case 1058:
            return 'comprehensive-income';
        case 1099:
        case 1060:
            return 'changes-in-equity';
        case 19:
            return 'auditor-opinion';
        case 20:
            return 'mda-page-1';
        case 21:
            return 'mda-page-2';
        case 22:
            return 'mda-page-3';
        case 23:
            return 'mda-page-4';
        case 24:
            return 'mda-page-5';
        case 30:
            return 'board-members';
        case 51:
            return 'subsidiaries';
        case 52:
            return 'associated-companies';
        default:
            return 'balance-sheet';
    }
}
