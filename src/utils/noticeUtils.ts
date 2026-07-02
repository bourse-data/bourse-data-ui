import type {FinancialNoticeItem, NoticeItem} from '../types/codal';

export function isFinancialNoticeTitle(title: string): boolean {
    return title.includes('صورت') && title.includes('مالی');
}

export function extractLetterSerial(reportUrl: string): string {
    if (!reportUrl) return '';
    try {
        const url = new URL(reportUrl, 'https://codal.ir');
        const serial = url.searchParams.get('LetterSerial');
        return serial ? decodeURIComponent(serial.trim()) : '';
    } catch {
        const match = reportUrl.match(/LetterSerial=([^&]+)/i);
        return match?.[1] ? decodeURIComponent(match[1].trim()) : '';
    }
}

export function mapNoticeToFinancialNotice(notice: NoticeItem): FinancialNoticeItem | null {
    const letterSerial = extractLetterSerial(notice.reportUrl);
    if (!letterSerial || !isFinancialNoticeTitle(notice.title)) {
        return null;
    }

    return {
        tracingNumber: notice.tracingNumber,
        symbol: notice.symbol,
        companyName: notice.companyName,
        title: notice.title,
        letterCode: notice.letterCode,
        sentDateTime: notice.sentDateTime,
        publishDateTime: notice.publishDateTime,
        letterSerial,
        reportUrl: notice.reportUrl,
        hasExcel: notice.hasExcel,
        hasPdf: notice.hasPdf,
        hasAttachment: notice.hasAttachment,
    };
}

export function mergeUniqueNotices(
    existing: FinancialNoticeItem[],
    incoming: FinancialNoticeItem[]
): FinancialNoticeItem[] {
    const seen = new Set(existing.map((notice) => notice.letterSerial));
    const merged = [...existing];
    for (const notice of incoming) {
        if (!notice.letterSerial || seen.has(notice.letterSerial)) continue;
        seen.add(notice.letterSerial);
        merged.push(notice);
    }
    return merged;
}
