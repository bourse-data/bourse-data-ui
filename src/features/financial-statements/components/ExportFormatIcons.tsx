type IconProps = {
    className?: string;
};

export function ExcelFormatIcon({className = 'h-5 w-5'}: IconProps) {
    return (
        <svg
            aria-hidden="true"
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
                fill="#217346"
            />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" fill="#1B5C38"/>
            <path d="M7.5 9h9M7.5 12h9M7.5 15h9" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.9"/>
            <path d="M10 9v6M13.5 9v6M7 12h9" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.9"/>
            <text
                x="12"
                y="13.2"
                textAnchor="middle"
                fill="#fff"
                fontSize="5.2"
                fontWeight="700"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
                XLS
            </text>
        </svg>
    );
}

export function CsvFormatIcon({className = 'h-5 w-5'}: IconProps) {
    return (
        <svg
            aria-hidden="true"
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
                fill="#2563EB"
            />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" fill="#1D4ED8"/>
            <path d="M7.5 9.5h9M7.5 12h9M7.5 14.5h9" stroke="#fff" strokeOpacity="0.9" strokeWidth="0.85"/>
            <circle cx="9.2" cy="9.5" r="0.55" fill="#BFDBFE"/>
            <circle cx="12" cy="12" r="0.55" fill="#BFDBFE"/>
            <circle cx="14.8" cy="14.5" r="0.55" fill="#BFDBFE"/>
            <text
                x="12"
                y="18.2"
                textAnchor="middle"
                fill="#fff"
                fontSize="4.4"
                fontWeight="700"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
                CSV
            </text>
        </svg>
    );
}
