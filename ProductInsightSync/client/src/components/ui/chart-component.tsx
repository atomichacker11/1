import React, { useEffect, useRef } from 'react';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ScatterChart as RechartsScatterChart,
  Scatter,
  ZAxis
} from 'recharts';

interface ChartProps {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  data: any[];
  xAxis?: string;
  yAxis?: string;
  secondaryAxis?: string;
  dataKeys: string[];
  colors?: string[];
  title?: string;
  height?: number;
}

// Default color palette
const DEFAULT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

export function ChartComponent({
  type,
  data,
  xAxis,
  yAxis,
  secondaryAxis,
  dataKeys,
  colors = DEFAULT_COLORS,
  title,
  height = 400
}: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Add tooltip customization
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border p-2 rounded-md shadow-md">
          <p className="text-sm font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Handle data keys for different chart types
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center border rounded-md" style={{ height }}>
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }
  
  return (
    <div ref={chartContainerRef} className="w-full">
      {title && <h3 className="text-md font-medium mb-4">{title}</h3>}
      
      <ResponsiveContainer width="100%" height={height}>
        {type === 'line' && (
          <RechartsLineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey={xAxis}
              tick={{ fontSize: 12 }}
              tickMargin={10}
            />
            <YAxis tick={{ fontSize: 12 }} tickMargin={10} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                activeDot={{ r: 6 }}
                strokeWidth={2}
              />
            ))}
          </RechartsLineChart>
        )}
        
        {type === 'bar' && (
          <RechartsBarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey={xAxis}
              tick={{ fontSize: 12 }}
              tickMargin={10}
            />
            <YAxis tick={{ fontSize: 12 }} tickMargin={10} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </RechartsBarChart>
        )}
        
        {type === 'pie' && (
          <RechartsPieChart>
            <Pie
              data={data}
              dataKey={dataKeys[0]}
              nameKey={xAxis}
              cx="50%"
              cy="50%"
              outerRadius={120}
              innerRadius={60}
              label={(entry) => entry.name}
              labelLine={true}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} />
          </RechartsPieChart>
        )}
        
        {type === 'scatter' && (
          <RechartsScatterChart
            margin={{ top: 20, right: 20, bottom: 30, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              type="number"
              dataKey={xAxis}
              name={xAxis}
              tick={{ fontSize: 12 }}
              tickMargin={10}
              label={{ value: xAxis, position: 'insideBottomRight', offset: -10 }}
            />
            <YAxis
              type="number"
              dataKey={yAxis}
              name={yAxis}
              tick={{ fontSize: 12 }}
              tickMargin={10}
              label={{ value: yAxis, angle: -90, position: 'insideLeft' }}
            />
            {secondaryAxis && (
              <ZAxis
                type="number"
                dataKey={secondaryAxis}
                range={[50, 500]}
                name={secondaryAxis}
              />
            )}
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Legend verticalAlign="top" height={36} />
            <Scatter
              name={`${xAxis} vs ${yAxis}`}
              data={data}
              fill={colors[0]}
            />
          </RechartsScatterChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
