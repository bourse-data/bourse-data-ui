import type {StatementColumn, StatementRow} from '../../../types/codal';
import {parseNumber} from '../../../utils/statementTransforms';

type RowSparklineProps = {
    row: StatementRow;
    columns: StatementColumn[];
};

export default function RowSparkline({row, columns}: RowSparklineProps) {
    const values = columns
        .map((column) => parseNumber(row.values[column.id]))
        .filter((value): value is number => value !== null);

    if (values.length < 2 || row.kind === 'section') {
        return <span className="text-[10px] text-muted">—</span>;
    }

    const maxAbs = Math.max(...values.map((value) => Math.abs(value)), 1);
    const width = 54;
    const height = 22;
    const gap = 3;
    const barWidth = Math.max(3, (width - gap * (values.length - 1)) / values.length);

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto block">
            <line x1="0" x2={width} y1={height / 2} y2={height / 2} className="stroke-border/70" strokeWidth="1"/>
            {values.map((value, index) => {
                const barHeight = Math.max(2, (Math.abs(value) / maxAbs) * (height / 2 - 2));
                const x = index * (barWidth + gap);
                const y = value >= 0 ? height / 2 - barHeight : height / 2;
                return (
                    <rect
                        key={`${value}-${index}`}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="1.5"
                        className={value >= 0 ? 'fill-primary/70' : 'fill-negative/70'}
                    />
                );
            })}
        </svg>
    );
}
