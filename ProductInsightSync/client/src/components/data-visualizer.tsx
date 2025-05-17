import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ChartComponent } from "@/components/ui/chart-component";
import { createColumnHelper } from "@tanstack/react-table";
import { Dataset } from "@shared/schema";
import { BarChart, LineChart, PieChart, ChartScatter } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface DataVisualizerProps {
  dataset: Dataset;
  columns: string[];
  data: any[];
}

export default function DataVisualizer({ dataset, columns, data }: DataVisualizerProps) {
  const [visualizationType, setVisualizationType] = useState("table");
  const [xAxis, setXAxis] = useState(columns[0] || "");
  const [yAxis, setYAxis] = useState(columns[1] || "");
  const [chartType, setChartType] = useState<"line" | "bar" | "pie" | "scatter">("line");
  
  // Create table columns
  const columnHelper = createColumnHelper<any>();
  const tableColumns = useMemo(() => {
    return columns.map((col) => {
      return columnHelper.accessor(col, {
        header: col,
        cell: (info) => {
          const value = info.getValue();
          if (value === null || value === undefined) return "-";
          if (typeof value === "object") return JSON.stringify(value);
          return String(value);
        },
      });
    });
  }, [columns, columnHelper]);
  
  // Prepare data for different chart types
  const chartData = useMemo(() => {
    if (!data || !data.length) return [];
    
    // Filter out data with missing values for the selected axes
    return data.filter(item => 
      item[xAxis] !== undefined && 
      item[xAxis] !== null && 
      (chartType === 'pie' || (item[yAxis] !== undefined && item[yAxis] !== null))
    );
  }, [data, xAxis, yAxis, chartType]);
  
  // For pie chart, we need to aggregate the data
  const pieChartData = useMemo(() => {
    if (chartType !== 'pie' || !chartData.length) return [];
    
    // Count occurrences of each unique value in xAxis
    const counts: Record<string, number> = {};
    chartData.forEach(item => {
      const key = String(item[xAxis]);
      counts[key] = (counts[key] || 0) + 1;
    });
    
    // Convert to array format for pie chart
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value
    }));
  }, [chartType, chartData, xAxis]);
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold">Dataset Explorer</h2>
          
          <Tabs 
            defaultValue="table" 
            value={visualizationType} 
            onValueChange={setVisualizationType}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
              <TabsTrigger value="table" className="flex items-center gap-1">
                Table
              </TabsTrigger>
              <TabsTrigger value="chart" className="flex items-center gap-1">
                Chart
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {visualizationType === "chart" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium block mb-2">Chart Type</label>
              <div className="flex space-x-2">
                <Button
                  variant={chartType === "line" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setChartType("line")}
                  title="Line Chart"
                >
                  <LineChart className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === "bar" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setChartType("bar")}
                  title="Bar Chart"
                >
                  <BarChart className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === "pie" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setChartType("pie")}
                  title="Pie Chart"
                >
                  <PieChart className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === "scatter" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setChartType("scatter")}
                  title="Scatter Plot"
                >
                  <ChartScatter className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-2">X Axis</label>
              <Select value={xAxis} onValueChange={setXAxis}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {chartType !== "pie" && (
              <div>
                <label className="text-sm font-medium block mb-2">Y Axis</label>
                <Select value={yAxis} onValueChange={setYAxis}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
        
        <Separator className="mb-6" />
        
        {visualizationType === "table" ? (
          <DataTable
            columns={tableColumns}
            data={data}
            searchColumn={columns[0]}
            searchPlaceholder={`Search by ${columns[0]}...`}
          />
        ) : (
          <div className="mt-4">
            {chartType === "pie" ? (
              <ChartComponent
                type="pie"
                data={pieChartData}
                xAxis="name"
                dataKeys={["value"]}
                title={`Distribution of ${xAxis}`}
                height={400}
              />
            ) : (
              <ChartComponent
                type={chartType}
                data={chartData}
                xAxis={xAxis}
                yAxis={yAxis}
                dataKeys={[yAxis]}
                title={`${yAxis} by ${xAxis}`}
                height={400}
              />
            )}
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {chartData.length} data points displayed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
