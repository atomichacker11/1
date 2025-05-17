import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "wouter";
import { Dataset, DataRow, Analysis, Insight } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AreaChart, ArrowLeft, ArrowRight, BarChart, Database, DownloadCloud, FileBarChart, FileText, LineChart, PieChart, RefreshCw, Zap } from "lucide-react";
import DataVisualizer from "@/components/data-visualizer";
import CorrelationFinder from "@/components/correlation-finder";
import TrendAnalyzer from "@/components/trend-analyzer";
import InsightGenerator from "@/components/insight-generator";

interface AnalyzeDataProps {
  datasetId: number;
}

export default function AnalyzeData({ datasetId }: AnalyzeDataProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("visualize");
  
  // Fetch dataset details
  const { data: dataset, isLoading: datasetLoading, error: datasetError } = useQuery<Dataset>({
    queryKey: [`/api/datasets/${datasetId}`],
  });
  
  // Fetch dataset data rows (with pagination)
  const { data: dataResponse, isLoading: dataLoading } = useQuery<{ rows: DataRow[], pagination: { total: number, limit: number, offset: number } }>({
    queryKey: [`/api/datasets/${datasetId}/data`],
  });
  
  // Fetch analyses for this dataset
  const { data: analyses, isLoading: analysesLoading } = useQuery<Analysis[]>({
    queryKey: [`/api/datasets/${datasetId}/analyses`],
  });
  
  // Fetch insights for this dataset
  const { data: insights, isLoading: insightsLoading } = useQuery<Insight[]>({
    queryKey: [`/api/datasets/${datasetId}/insights`],
  });
  
  // Error handling
  useEffect(() => {
    if (datasetError) {
      toast({
        title: "Error loading dataset",
        description: "The dataset could not be found or you don't have permission to access it.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [datasetError, navigate, toast]);
  
  // Prepare data for visualization and analysis
  const columns = dataset?.columns ? Object.keys(dataset.columns) : [];
  const dataRows = dataResponse?.rows ? dataResponse.rows.map(row => row.data) : [];
  
  if (datasetLoading || dataLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-4" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        
        <Skeleton className="h-96" />
      </div>
    );
  }
  
  if (!dataset) {
    return null; // We'll redirect via the error effect
  }
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mr-4" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{dataset.name}</h1>
            <p className="text-muted-foreground">
              {dataset.description || "No description provided"}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <DownloadCloud className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Dataset stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <div className="font-medium text-sm text-muted-foreground">Data Points</div>
                <div className="text-2xl font-bold">{dataResponse?.pagination.total || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {columns.length} columns
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-md bg-green-500/10 text-green-500">
                <FileBarChart className="h-6 w-6" />
              </div>
              <div>
                <div className="font-medium text-sm text-muted-foreground">Analyses</div>
                <div className="text-2xl font-bold">{analyses?.length || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {analyses?.filter(a => a.status === 'completed').length || 0} completed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-md bg-yellow-500/10 text-yellow-500">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <div className="font-medium text-sm text-muted-foreground">Insights</div>
                <div className="text-2xl font-bold">{insights?.length || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {insights?.filter(i => i.importance > 2).length || 0} high-priority
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main analysis tabs */}
      <Tabs defaultValue="visualize" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="visualize" className="flex items-center gap-1">
            <PieChart className="h-4 w-4" />
            Visualize
          </TabsTrigger>
          <TabsTrigger value="correlation" className="flex items-center gap-1">
            <BarChart className="h-4 w-4" />
            Find Correlations
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-1">
            <LineChart className="h-4 w-4" />
            Discover Trends
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="visualize">
          <DataVisualizer 
            dataset={dataset} 
            columns={columns} 
            data={dataRows} 
          />
        </TabsContent>
        
        <TabsContent value="correlation">
          <CorrelationFinder 
            dataset={dataset} 
            columns={columns} 
            data={dataRows} 
            analyses={analyses} 
            insights={insights}
          />
        </TabsContent>
        
        <TabsContent value="trends">
          <TrendAnalyzer 
            dataset={dataset} 
            columns={columns} 
            data={dataRows} 
            analyses={analyses} 
            insights={insights}
          />
        </TabsContent>
        
        <TabsContent value="insights">
          <InsightGenerator 
            dataset={dataset} 
            analyses={analyses} 
            insights={insights}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
