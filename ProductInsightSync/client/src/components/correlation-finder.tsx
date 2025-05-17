import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartComponent } from "@/components/ui/chart-component";
import { Dataset, Analysis, Insight } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, FileBarChart, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { calculateCorrelation } from "@/lib/analyze-utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CorrelationFinderProps {
  dataset: Dataset;
  columns: string[];
  data: any[];
  analyses: Analysis[] | undefined;
  insights: Insight[] | undefined;
}

export default function CorrelationFinder({ 
  dataset, 
  columns, 
  data, 
  analyses, 
  insights 
}: CorrelationFinderProps) {
  const { toast } = useToast();
  const [variable1, setVariable1] = useState(columns[0] || "");
  const [variable2, setVariable2] = useState(columns.length > 1 ? columns[1] : "");
  const [correlationResult, setCorrelationResult] = useState<{coefficient: number, strength: string} | null>(null);
  
  // Filter for numeric columns only
  const numericColumns = columns.filter((column) => {
    // Check the first few data points to determine if column is numeric
    const numericData = data.slice(0, 5).filter(
      (item) => item[column] !== undefined && !isNaN(Number(item[column]))
    );
    return numericData.length >= 3; // If at least 3 of 5 are numeric, consider it a numeric column
  });
  
  // Mutation for running a correlation analysis
  const runCorrelationMutation = useMutation({
    mutationFn: async () => {
      // Create an analysis record
      const response = await apiRequest("POST", "/api/analyses", {
        datasetId: dataset.id,
        name: `Correlation: ${variable1} & ${variable2}`,
        type: "correlation",
        parameters: {
          variable1,
          variable2
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
        description: "Your correlation analysis is being processed",
      });
      
      // Also calculate correlation on the client side for immediate feedback
      if (variable1 && variable2 && data.length > 0) {
        const result = calculateCorrelation(data, variable1, variable2);
        setCorrelationResult(result);
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
  const correlationAnalyses = analyses?.filter(a => a.type === "correlation") || [];
  const correlationInsights = insights?.filter(
    i => i.analysisId && correlationAnalyses.some(a => a.id === i.analysisId)
  ) || [];
  
  // Check if data is valid for correlation
  const isDataValid = data && data.length > 5 && numericColumns.length >= 2;
  
  // Prepare scatter plot data
  const scatterData = data
    .filter(item => 
      item[variable1] !== undefined && 
      item[variable1] !== null && 
      item[variable2] !== undefined && 
      item[variable2] !== null &&
      !isNaN(Number(item[variable1])) &&
      !isNaN(Number(item[variable2]))
    )
    .map(item => ({
      ...item,
      [variable1]: Number(item[variable1]),
      [variable2]: Number(item[variable2])
    }));
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Find Correlations</CardTitle>
            <CardDescription>
              Discover relationships between variables in your dataset
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isDataValid ? (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Insufficient data</AlertTitle>
                <AlertDescription>
                  To find correlations, you need at least 5 data points and 2 numeric variables.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-sm font-medium block mb-2">Variable 1</label>
                    <Select value={variable1} onValueChange={setVariable1}>
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
                    <label className="text-sm font-medium block mb-2">Variable 2</label>
                    <Select value={variable2} onValueChange={setVariable2}>
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
                </div>
                
                {variable1 && variable2 && scatterData.length > 0 ? (
                  <div className="mb-4">
                    <ChartComponent
                      type="scatter"
                      data={scatterData}
                      xAxis={variable1}
                      yAxis={variable2}
                      dataKeys={[variable2]}
                      title={`${variable1} vs ${variable2}`}
                      height={300}
                    />
                    
                    {correlationResult && (
                      <div className="mt-4 p-4 border rounded-md bg-background">
                        <h3 className="text-lg font-medium mb-2">Correlation Analysis</h3>
                        <p>Correlation coefficient: <span className="font-mono font-bold">{correlationResult.coefficient.toFixed(2)}</span></p>
                        <p>Strength: <span className="font-medium">{correlationResult.strength}</span></p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Values close to 1 or -1 indicate a strong correlation.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 border rounded-md bg-muted/50">
                    <p className="text-muted-foreground">
                      Select two variables to visualize their relationship
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full gap-2"
              onClick={() => runCorrelationMutation.mutate()}
              disabled={!variable1 || !variable2 || !isDataValid || runCorrelationMutation.isPending}
            >
              {runCorrelationMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running Analysis...
                </>
              ) : (
                <>
                  <FileBarChart className="h-4 w-4" />
                  Run Correlation Analysis
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Recent Findings</CardTitle>
            <CardDescription>
              Correlation insights from your analyses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {correlationInsights.length > 0 ? (
              <div className="space-y-4">
                {correlationInsights.slice(0, 5).map((insight) => (
                  <div key={insight.id} className="p-3 border rounded-md">
                    <p className="text-sm">{insight.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(insight.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              runCorrelationMutation.isPending ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="py-8 text-center">
                  <FileBarChart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No correlation insights yet.
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
