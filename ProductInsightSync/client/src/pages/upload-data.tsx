import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Upload, FileType, Database, Table, Check, AlertTriangle } from "lucide-react";
import DataUploadForm from "@/components/data-upload-form";

// CSV parsing function
const parseCSV = (csvText: string) => {
  const lines = csvText.split(/\r\n|\n/);
  const headers = lines[0].split(',').map(header => header.trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',').map(val => val.trim());
    const entry: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      entry[header] = values[index] || '';
    });
    
    data.push(entry);
  }
  
  return { headers, data };
};

// Define form schema
const datasetSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  dataType: z.string().min(1, "Data type is required"),
});

export default function UploadData() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("csv");
  const [csvText, setCsvText] = useState("");
  const [pastedData, setPastedData] = useState<{ headers: string[], data: any[] } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<"idle" | "preparing" | "uploading" | "processing" | "complete" | "error">("idle");
  
  // Form for dataset metadata
  const form = useForm<z.infer<typeof datasetSchema>>({
    resolver: zodResolver(datasetSchema),
    defaultValues: {
      name: "",
      description: "",
      dataType: "csv",
    },
  });
  
  // Handle CSV paste
  const handleCSVPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCsvText(text);
    
    try {
      if (text.trim()) {
        const parsed = parseCSV(text);
        setPastedData(parsed);
      } else {
        setPastedData(null);
      }
    } catch (error) {
      setPastedData(null);
      toast({
        title: "Invalid CSV format",
        description: "Please check your data and try again",
        variant: "destructive",
      });
    }
  };
  
  // Create dataset mutation
  const createDatasetMutation = useMutation({
    mutationFn: async (data: any) => {
      setUploadStage("preparing");
      setUploadProgress(10);
      
      // First create the dataset
      const response = await apiRequest("POST", "/api/datasets", data);
      setUploadProgress(30);
      setUploadStage("uploading");
      
      const dataset = await response.json();
      
      // Then upload the data rows
      if (pastedData && pastedData.data.length > 0) {
        // Upload data in batches to show progress
        const batchSize = Math.max(1, Math.floor(pastedData.data.length / 10));
        let uploaded = 0;
        
        for (let i = 0; i < pastedData.data.length; i += batchSize) {
          const batch = pastedData.data.slice(i, i + batchSize);
          await apiRequest("POST", `/api/datasets/${dataset.id}/data`, batch);
          
          uploaded += batch.length;
          const progress = 30 + Math.floor((uploaded / pastedData.data.length) * 60);
          setUploadProgress(progress);
        }
      }
      
      setUploadProgress(90);
      setUploadStage("processing");
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUploadProgress(100);
      setUploadStage("complete");
      
      return dataset;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/datasets'] });
      toast({
        title: "Dataset uploaded successfully",
        description: `'${data.name}' is now ready for analysis`,
      });
      
      // Navigate to the analysis page after a short delay
      setTimeout(() => {
        navigate(`/analyze/${data.id}`);
      }, 1500);
    },
    onError: (error) => {
      setUploadStage("error");
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Submit handler
  const onSubmit = async (values: z.infer<typeof datasetSchema>) => {
    if (!pastedData || pastedData.data.length === 0) {
      toast({
        title: "No data to upload",
        description: "Please provide some data before submitting",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare column information from the headers
    const columns: Record<string, { type: string }> = {};
    pastedData.headers.forEach(header => {
      // Try to determine column type (simplified)
      const firstValue = pastedData.data[0][header];
      let type = "string";
      
      if (!isNaN(Number(firstValue))) {
        type = "number";
      } else if (firstValue === "true" || firstValue === "false") {
        type = "boolean";
      } else if (!isNaN(Date.parse(firstValue))) {
        type = "date";
      }
      
      columns[header] = { type };
    });
    
    await createDatasetMutation.mutate({
      ...values,
      columns,
    });
  };
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Upload Dataset</h1>
          <p className="text-muted-foreground">
            Add a new dataset to analyze and generate insights
          </p>
        </div>
      </div>
      
      {/* Upload Progress */}
      {uploadStage !== "idle" && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  {uploadStage === "preparing" && <Database className="animate-pulse mr-2 h-5 w-5 text-blue-500" />}
                  {uploadStage === "uploading" && <Upload className="animate-pulse mr-2 h-5 w-5 text-blue-500" />}
                  {uploadStage === "processing" && <Table className="animate-pulse mr-2 h-5 w-5 text-yellow-500" />}
                  {uploadStage === "complete" && <Check className="mr-2 h-5 w-5 text-green-500" />}
                  {uploadStage === "error" && <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />}
                  
                  <span className="font-medium">
                    {uploadStage === "preparing" && "Preparing dataset..."}
                    {uploadStage === "uploading" && "Uploading data..."}
                    {uploadStage === "processing" && "Processing data..."}
                    {uploadStage === "complete" && "Upload complete!"}
                    {uploadStage === "error" && "Upload failed"}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dataset metadata form */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Dataset Information</CardTitle>
            <CardDescription>
              Provide details about your dataset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., User Engagement Metrics" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of this dataset" 
                          className="resize-none h-20"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dataType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Type</FormLabel>
                      <FormControl>
                        <Input value={field.value} readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full mt-4"
                  disabled={createDatasetMutation.isPending || uploadStage !== "idle" || !pastedData}
                >
                  Upload Dataset
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Data input */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Data Source</CardTitle>
            <CardDescription>
              Paste your CSV data or upload a file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="csv" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="csv" className="flex items-center gap-1">
                  <FileType className="h-4 w-4" />
                  Paste CSV
                </TabsTrigger>
                <TabsTrigger value="file" className="flex items-center gap-1" disabled>
                  <Upload className="h-4 w-4" />
                  Upload File
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="csv">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="csv-data">Paste CSV Data</Label>
                    <Textarea 
                      id="csv-data"
                      placeholder="Paste your CSV data here (include headers in the first row)"
                      className="font-mono text-sm h-64"
                      value={csvText}
                      onChange={handleCSVPaste}
                      disabled={createDatasetMutation.isPending || uploadStage !== "idle"}
                    />
                  </div>
                  
                  {pastedData && (
                    <div className="border rounded-md p-4">
                      <h3 className="text-sm font-medium mb-2">Preview</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                          <thead>
                            <tr>
                              {pastedData.headers.map((header, idx) => (
                                <th key={idx} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {pastedData.data.slice(0, 3).map((row, rowIdx) => (
                              <tr key={rowIdx}>
                                {pastedData.headers.map((header, colIdx) => (
                                  <td key={colIdx} className="px-4 py-2 text-sm">
                                    {row[header]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {pastedData.data.length > 3 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Showing 3 of {pastedData.data.length} rows
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="file">
                <DataUploadForm />
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 flex justify-between">
            <div className="text-sm text-muted-foreground">
              {pastedData 
                ? `${pastedData.data.length} rows × ${pastedData.headers.length} columns`
                : "No data pasted yet"}
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              setCsvText("");
              setPastedData(null);
            }} disabled={!csvText || createDatasetMutation.isPending || uploadStage !== "idle"}>
              Clear
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
