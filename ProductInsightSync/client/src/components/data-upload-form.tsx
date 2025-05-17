import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileType, X, File, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function DataUploadForm() {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Handle drag events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };
  
  const handleFileSelection = (file: File) => {
    // Check file type (only allow CSV, JSON, etc.)
    const allowedTypes = [
      'text/csv', 
      'application/json',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV, JSON, or Excel file",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
  };
  
  // Handle file upload (this is a placeholder since file upload is not implemented)
  const handleUpload = () => {
    if (!selectedFile) return;
    
    // Show toast explaining file upload is not implemented
    toast({
      title: "File Upload Not Implemented",
      description: "Please use the CSV paste option instead",
      variant: "destructive",
    });
    
    // Simulate upload progress
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };
  
  // Clear selected file
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
  };
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <FileType className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearSelectedFile} disabled={isUploading}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1" />
              </div>
            )}
            
            {!isUploading && uploadProgress === 100 && (
              <div className="flex items-center text-green-500 text-sm">
                <Check className="h-4 w-4 mr-1" /> Upload complete
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="p-3 mb-4 bg-primary/10 rounded-full">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">Drag and drop your file here</p>
            <p className="text-xs text-muted-foreground mb-4">
              Supports CSV, JSON, and Excel files up to 10MB
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <File className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".csv,.json,.xlsx,.xls,.txt"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>
      
      {/* Instructions and upload button */}
      {selectedFile && (
        <div className="flex justify-end">
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || uploadProgress === 100}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload File
          </Button>
        </div>
      )}
      
      {/* Info card */}
      <Card className="p-4 bg-muted/30">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> For this demo, please use the "Paste CSV" option instead.
          File upload functionality is not currently implemented in the backend.
        </p>
      </Card>
    </div>
  );
}
