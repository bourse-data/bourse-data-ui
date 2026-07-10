import * as XLSX from 'xlsx';
import type {StatementColumn, StatementRow} from '../types/codal';

export type StatementExportTable = {
    columns: StatementColumn[];
    rows: StatementRow[];
};

function buildSheetData(table: StatementExportTable): string[][] {
    const header = [
        'شرح',
        ...table.columns.map((column) => column.periodEndToDate || column.headers[0] || column.id),
    ];
    const rows = table.rows.map((row) => [
        row.label,
        ...table.columns.map((column) => row.values[column.id] ?? ''),
    ]);
    return [header, ...rows];
}

function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function exportStatementCsv(table: StatementExportTable, filenameBase: string) {
    const sheetData = buildSheetData(table);
    const csv = sheetData
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], {type: 'text/csv;charset=utf-8;'});
    triggerDownload(blob, `${filenameBase}.csv`);
}

export function exportStatementXlsx(table: StatementExportTable, filenameBase: string) {
    const sheetData = buildSheetData(table);
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'صورت مالی');
    const buffer = XLSX.write(workbook, {bookType: 'xlsx', type: 'array'});
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    triggerDownload(blob, `${filenameBase}.xlsx`);
}
