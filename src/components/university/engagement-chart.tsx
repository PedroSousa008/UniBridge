'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ChartPoint {
  label: string;
  value: number;
}

interface EngagementChartProps {
  data: ChartPoint[];
}

export function EngagementChart({ data }: EngagementChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="engagementFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(230 85% 56%)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(230 85% 56%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'hsl(240 4% 46%)' }}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'hsl(240 4% 46%)' }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid hsl(240 6% 90%)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(230 85% 56%)"
            strokeWidth={2}
            fill="url(#engagementFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
