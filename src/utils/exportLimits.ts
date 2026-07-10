export type ExportFormat = 'csv' | 'xlsx';

/** Excel (.xlsx) hard limits per worksheet */
export const EXCEL_MAX_ROWS = 1_048_576;
export const EXCEL_MAX_COLUMNS = 16_384;

export type ExportDimensions = {
    dataRowCount: number;
    columnCount: number;
};

export function getExportTotalRows({dataRowCount}: Pick<ExportDimensions, 'dataRowCount'>): number {
    return dataRowCount + 1;
}

export function validateExportDimensions(
    dimensions: ExportDimensions,
    format: ExportFormat
): string | null {
    const {dataRowCount, columnCount} = dimensions;

    if (dataRowCount === 0) {
        return 'داده‌ای برای خروجی وجود ندارد.';
    }
    if (columnCount === 0) {
        return 'ستونی برای خروجی وجود ندارد.';
    }

    const totalRows = getExportTotalRows({dataRowCount});

    if (format === 'xlsx') {
        if (totalRows > EXCEL_MAX_ROWS) {
            return `خروجی اکسل حداکثر ${EXCEL_MAX_ROWS.toLocaleString('fa-IR')} ردیف را پشتیبانی می‌کند. این جدول ${totalRows.toLocaleString('fa-IR')} ردیف دارد؛ لطفاً خروجی CSV بگیرید.`;
        }
        if (columnCount > EXCEL_MAX_COLUMNS) {
            return `خروجی اکسل حداکثر ${EXCEL_MAX_COLUMNS.toLocaleString('fa-IR')} ستون را پشتیبانی می‌کند. لطفاً خروجی CSV بگیرید.`;
        }
    }

    return null;
}
