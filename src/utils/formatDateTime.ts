const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

const JALALI_DATETIME_PATTERN =
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:[,\u060c\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;

export const toEnglishDigits = (value: string): string =>
    value
        .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));

const pad2 = (value: number | string) => String(value).padStart(2, '0');

const formatJalaliParts = (
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number
) =>
    `${year}/${pad2(month)}/${pad2(day)} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;

const formatGregorianToJalali = (date: Date): string => {
    const formatter = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Tehran',
    });

    const parts = formatter.formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? '00';

    return formatJalaliParts(
        Number(get('year')),
        Number(get('month')),
        Number(get('day')),
        Number(get('hour')),
        Number(get('minute')),
        Number(get('second'))
    );
};

const tryParseJalaliString = (value: string): string | null => {
    const normalized = toEnglishDigits(value).trim();
    const match = normalized.match(JALALI_DATETIME_PATTERN);
    if (!match) return null;

    const [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
    return formatJalaliParts(
        Number(year),
        Number(month),
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
    );
};

export const formatDateTimeFa = (value: string | Date | null | undefined): string => {
    if (value === null || value === undefined) return 'ناموجود';

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return 'ناموجود';
        return formatGregorianToJalali(value);
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed === 'ناموجود') return 'ناموجود';

    const jalali = tryParseJalaliString(trimmed);
    if (jalali) return jalali;

    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) {
        return formatGregorianToJalali(date);
    }

    return trimmed;
};
