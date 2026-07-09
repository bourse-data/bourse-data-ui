export type ApiResponse<T> = {
    referenceId: string;
    timestamp: string;
    code: number;
    message: string;
    result: T;
};

export type FinancialNoticeItem = {
    tracingNumber: number;
    symbol: string;
    companyName: string;
    title: string;
    letterCode: string;
    sentDateTime: string;
    publishDateTime: string;
    letterSerial: string;
    reportUrl: string;
    isConsolidated: boolean;
    isRestated: boolean;
    fiscalYear: number | null;
    periodEndDate: string;
    hasExcel: boolean;
    hasPdf: boolean;
    hasAttachment: boolean;
};

export type FinancialNoticeListResult = {
    symbol: string;
    page: number;
    size: number;
    totalCount: number;
    notices: FinancialNoticeItem[];
};

export type StatementReport = {
    title: string;
    companyName: string;
    symbol: string;
    registeredCapital: string;
    unregisteredCapital: string;
    industryCode: string;
    periodDescription: string;
    periodEndToDate: string;
    yearEndToDate: string;
    periodMonths: number;
    isConsolidated: boolean;
    isAudited: boolean;
    isRestated: boolean;
    auditedLabel: string;
    companyState: string;
    unitNote: string;
    signatureNote: string;
    tracingNumber: number;
    publishDateTime: string;
};

export type StatementColumn = {
    id: string;
    headers: string[];
    periodEndToDate: string;
    yearEndToDate: string;
};

export type StatementRow = {
    label: string;
    kind: string;
    values: Record<string, string>;
};

export type StatementTable = {
    title: string;
    unitNote: string;
    columns: StatementColumn[];
    rows: StatementRow[];
};

export type StatementSheet = {
    sheetId: number;
    title: string;
    table: StatementTable;
};

export type AvailableSheetItem = {
    sheetId: number;
    title: string;
};

export type FinancialStatementResult = {
    letterSerial: string;
    report: StatementReport;
    availableSheets: AvailableSheetItem[];
    statements: StatementSheet[];
};

export type AggregatedColumnMeta = {
    columnId: string;
    fiscalYear: number;
    periodEndDate: string;
    publishDateTime: string;
    letterSerial: string;
    reportUrl: string;
    tracingNumber: number;
    isRestated: boolean;
    isConsolidated: boolean;
};

export type AggregatedFinancialStatementResult = {
    symbol: string;
    statementType: string;
    sheetId: number;
    title: string;
    consolidation: 'consolidated' | 'non-consolidated';
    restated: 'dont-care' | 'yes' | 'no';
    periodYears: number;
    reportCount: number;
    unavailableReportCount: number;
    table: StatementTable;
    columnMeta: AggregatedColumnMeta[];
};

export type CompanySuggestion = {
    symbol: string;
    companyName: string;
    instrumentCode?: string;
    industry?: string;
};

export type MarketSymbol = {
    industry: string;
    instrumentCode: string;
    symbol: string;
    name: string;
};
