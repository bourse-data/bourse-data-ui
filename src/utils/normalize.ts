export const normalizePersian = (value: string) =>
    value
        .replace(/ي/g, 'ی')
        .replace(/ك/g, 'ک')
        .toLowerCase()
        .trim();

export const ltrNumericClassName = 'tabular-nums [direction:ltr] [unicode-bidi:plaintext]';
