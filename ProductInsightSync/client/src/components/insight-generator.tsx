import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dataset, Analysis, Insight } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Brain, Database, FileBarChart, LineChart, RefreshCw, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface InsightGeneratorProps {
  dataset: Dataset;
  analyses: Analysis[] | undefined;
  insights: Insight[] | undefined;
}

export default function InsightGenerator({
  dataset,
  analyses,
  insights
}: InsightGeneratorProps) {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Get unique categories from insights
  const categories = insights 
    ? Array.from(new Set(insights.map(i => i.category).filter(Boolean) as string[]))
    : [];
  
  // Get filtered insights based on active category
  const filteredInsights = insights
    ? activeCategory
      ? insights.filter(i => i.category === activeCategory)
      : insights
    : [];
  
  // Sort insights by importance (descending)
  const sortedInsights = [...filteredInsights].sort((a, b) => b.importance - a.importance);
  
  // Function to get badge variant based on importance
  const getBadgeVariant = (importance: number) => {
    if (importance >= 3) return "default";
    if (importance >= 2) return "secondary";
    return "outline";
  };
  
  // Mutation for generating a new insight
  const generateInsightMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      setGenerationProgress(10);
      
      // Simulate insight generation progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
      
      // Create a new segmentation analysis
      const response = await apiRequest("POST", "/api/analyses", {
        datasetId: dataset.id,
        name: `AI Insights Generation`,
        type: "segmentation",
        parameters: {
          segments: 3,
          method: "kmeans"
        },
        status: "pending"
      });
      
      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh the analyses and insights
      queryClient.invalidateQueries({ queryKey: [`/api/datasets/${dataset.id}/analyses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/datasets/${dataset.id}/insights`] });
      
      toast({
        title: "Insights generated",
        description: "New AI-powered insights have been discovered",
      });
      
      // Reset progress after a delay
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
      }, 1000);
    },
    onError: (error) => {
      setIsGenerating(false);
      setGenerationProgress(0);
      
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  });
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Insights</CardTitle>
          <CardDescription>
            Discover actionable insights from your data through AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium">Available Insights</h3>
              <p className="text-sm text-muted-foreground">
                {insights?.length || 0} insights discovered from your dataset
              </p>
            </div>
            
            <Button 
              onClick={() => generateInsightMutation.mutate()}
              disabled={generateInsightMutation.isPending || isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating Insights...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Generate New Insights
                </>
              )}
            </Button>
          </div>
          
          {isGenerating && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Analyzing your data...</span>
                <span className="text-sm">{generationProgress}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
            </div>
          )}
          
          {categories.length > 0 && (
            <Tabs defaultValue="all" className="mb-6">
              <TabsList className="mb-4">
                <TabsTrigger 
                  value="all" 
                  onClick={() => setActiveCategory(null)}
                  className="flex items-center gap-1"
                >
                  <Zap className="h-4 w-4" />
                  All Insights
                </TabsTrigger>
                
                {categories.map(category => (
                  <TabsTrigger 
                    key={category}
                    value={category}
                    onClick={() => setActiveCategory(category)}
                    className="flex items-center gap-1"
                  >
                    {category === "correlation" && <FileBarChart className="h-4 w-4" />}
                    {category === "trend" && <LineChart className="h-4 w-4" />}
                    {category === "segmentation" && <Database className="h-4 w-4" />}
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          
          {sortedInsights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border rounded-md bg-muted/20">
              <Brain className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No insights yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Generate AI-powered insights to discover patterns, trends, and opportunities in your data
              </p>
              <Button 
                onClick={() => generateInsightMutation.mutate()}
                disabled={generateInsightMutation.isPending || isGenerating}
              >
                Generate Insights
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedInsights.map((insight) => (
                <Card key={insight.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {insight.category === "correlation" && <FileBarChart className="h-5 w-5 text-blue-500" />}
                        {insight.category === "trend" && <LineChart className="h-5 w-5 text-green-500" />}
                        {insight.category === "segmentation" && <Database className="h-5 w-5 text-violet-500" />}
                        {!insight.category && <Zap className="h-5 w-5 text-yellow-500" />}
                        <h3 className="text-lg font-medium">
                          {insight.category 
                            ? `${insight.category.charAt(0).toUpperCase() + insight.category.slice(1)} Insight` 
                            : "General Insight"}
                        </h3>
                      </div>
                      <Badge variant={getBadgeVariant(insight.importance)}>
                        {insight.importance >= 3 ? "High Impact" : 
                         insight.importance >= 2 ? "Moderate Impact" : "Information"}
                      </Badge>
                    </div>
                    
                    <p className="my-2">{insight.content}</p>
                    
                    <div className="flex items-center text-xs text-muted-foreground mt-4">
                      <span>Created {new Date(insight.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
