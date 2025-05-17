import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartComponent } from "@/components/ui/chart-component";
import { Dataset, Analysis, Insight } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, LineChart, RefreshCw, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getLinearRegression } from "@/lib/analyze-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendAnalyzerProps {
  dataset: Dataset;
  columns: string[];
  data: any[];
  analyses: Analysis[] | undefined;
  insights: Insight[] | undefined;
}

export default function TrendAnalyzer({ 
  dataset, 
  columns, 
  data, 
  analyses, 
  insights 
}: TrendAnalyzerProps) {
  const { toast } = useToast();
  const [variable, setVariable] = useState(columns[0] || "");
  const [timeVariable, setTimeVariable] = useState("");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [trendResult, setTrendResult] = useState<{slope: number, direction: string} | null>(null);

  // Filter for numeric and date columns
  const numericColumns = columns.filter((column) => {
    const numericData = data.slice(0, 5).filter(
      (item) => item[column] !== undefined && !isNaN(Number(item[column]))
    );
    return numericData.length >= 3;
  });
  
  const dateColumns = columns.filter((column) => {
    const dateData = data.slice(0, 5).filter(
      (item) => item[column] !== undefined && !isNaN(Date.parse(String(item[column])))
    );
    return dateData.length >= 3;
  });
  
  // Mutation for running a trend analysis
  const runTrendMutation = useMutation({
    mutationFn: async () => {
      // Create an analysis record
      const response = await apiRequest("POST", "/api/analyses", {
        datasetId: dataset.id,
        name: `Trend Analysis: ${variable}`,
        type: "trend",
        parameters: {
          variable,
          timeVariable: timeVariable || undefined
        },
        status: "pending"
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh the analyses and insights
      queryClient.invalidateQueries({ queryKey: [`/api/datasets/${dataset.id}/analyses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/datasets/${dataset.id}/insights`] });
      
      toast({
        title: "Analysis started",
        description: "Your trend analysis is being processed",
      });
      
      // Also calculate trend on the client side for immediate feedback
      if (variable && data.length > 0) {
        // Create sequential indices if no time variable
        const xValues = timeVariable 
          ? data.map(item => new Date(item[timeVariable]).getTime())
          : data.map((_, i) => i);
        
        const yValues = data.map(item => Number(item[variable]));
        const regression = getLinearRegression(xValues, yValues);
        
        setTrendResult({
          slope: regression.slope,
          direction: regression.slope > 0 ? "Increasing" : regression.slope < 0 ? "Decreasing" : "Stable"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Filter relevant analyses and insights
  const trendAnalyses = analyses?.filter(a => a.type === "trend") || [];
  const trendInsights = insights?.filter(
    i => i.analysisId && trendAnalyses.some(a => a.id === i.analysisId)
  ) || [];
  
  // Check if data is valid for trend analysis
  const isDataValid = data && data.length > 5 && numericColumns.length >= 1;
  
  // Prepare trend data
  const trendData = data
    .filter(item => 
      item[variable] !== undefined && 
      item[variable] !== null && 
      !isNaN(Number(item[variable])) &&
      (!timeVariable || 
        (item[timeVariable] !== undefined && 
        item[timeVariable] !== null))
    )
    .map((item, index) => ({
      index,
      ...item,
      [variable]: Number(item[variable])
    }));
    
  // Sort by time variable if present
  if (timeVariable && trendData.length > 0) {
    trendData.sort((a, b) => {
      const dateA = new Date(a[timeVariable]);
      const dateB = new Date(b[timeVariable]);
      return dateA.getTime() - dateB.getTime();
    });
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Discover Trends</CardTitle>
            <CardDescription>
              Analyze how variables change over time or sequence
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isDataValid ? (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Insufficient data</AlertTitle>
                <AlertDescription>
                  To analyze trends, you need at least 5 data points and 1 numeric variable.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-sm font-medium block mb-2">Variable to Analyze</label>
                    <Select value={variable} onValueChange={setVariable}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a variable" />
                      </SelectTrigger>
                      <SelectContent>
                        {numericColumns.map((column) => (
                          <SelectItem key={column} value={column}>
                            {column}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Time/Sequence Variable (Optional)</label>
                    <Select value={timeVariable} onValueChange={setTimeVariable}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a time variable (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Default (sequential)</SelectItem>
                        {dateColumns.map((column) => (
                          <SelectItem key={column} value={column}>
                            {column}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mb-4">
                  <Tabs value={chartType} onValueChange={(value) => setChartType(value as "line" | "bar")}>
                    <TabsList className="mb-4">
                      <TabsTrigger value="line" className="flex items-center gap-1">
                        <LineChart className="h-4 w-4" />
                        Line Chart
                      </TabsTrigger>
                      <TabsTrigger value="bar" className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        Bar Chart
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                
                  {variable && trendData.length > 0 ? (
                    <div>
                      <ChartComponent
                        type={chartType}
                        data={trendData}
                        xAxis={timeVariable || "index"}
                        yAxis={variable}
                        dataKeys={[variable]}
                        title={`${variable} Trend Analysis`}
                        height={300}
                      />
                      
                      {trendResult && (
                        <div className="mt-4 p-4 border rounded-md bg-background">
                          <h3 className="text-lg font-medium mb-2">Trend Analysis</h3>
                          <p>Direction: <span className="font-medium">{trendResult.direction}</span></p>
                          <p>Slope: <span className="font-mono font-bold">{trendResult.slope.toFixed(4)}</span></p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {trendResult.direction === "Increasing" 
                              ? "This variable shows an upward trend over time."
                              : trendResult.direction === "Decreasing"
                                ? "This variable shows a downward trend over time."
                                : "This variable remains relatively stable over time."}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 border rounded-md bg-muted/50">
                      <p className="text-muted-foreground">
                        Select a variable to analyze its trend
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full gap-2"
              onClick={() => runTrendMutation.mutate()}
              disabled={!variable || !isDataValid || runTrendMutation.isPending}
            >
              {runTrendMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running Analysis...
                </>
              ) : (
                <>
                  <LineChart className="h-4 w-4" />
                  Run Trend Analysis
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Trend Insights</CardTitle>
            <CardDescription>
              Discoveries from your trend analyses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendInsights.length > 0 ? (
              <div className="space-y-4">
                {trendInsights.slice(0, 5).map((insight) => (
                  <div key={insight.id} className="p-3 border rounded-md">
                    <p className="text-sm">{insight.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(insight.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              runTrendMutation.isPending ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="py-8 text-center">
                  <LineChart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No trend insights yet.
                    <br />
                    Run an analysis to generate insights.
                  </p>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
