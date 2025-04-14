"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Camera, X, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress"; // Import Progress component

type FileWithPreview = {
  file: File;
  preview: string;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  description: string;
  errorMessage?: string;
  uploadProgress?: number; // Add upload progress tracking
};

export default function UploadPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const { toast } = useToast();

  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [remainingUploads, setRemainingUploads] = useState(10);
  const [totalGalleryCount, setTotalGalleryCount] = useState(0);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);
  const maxUploads = 10;

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      files.forEach((fileObj) => URL.revokeObjectURL(fileObj.preview));
    };
  }, [files]);

  // Fetch the user's current photo count when the page loads
  useEffect(() => {
    const fetchPhotoCount = async () => {
      if (!isSignedIn) return;
      setIsLoadingCounts(true);

      try {
        const response = await fetch("/api/user/photo-count");

        if (response.ok) {
          const data = await response.json();
          setUploadCount(data.count);
          setRemainingUploads(data.remainingUploads);
        }
      } catch (error) {
        console.error("Failed to fetch photo count:", error);
      } finally {
        setIsLoadingCounts(false);
      }
    };

    fetchPhotoCount();
  }, [isSignedIn]);

  // New effect to fetch total gallery count
  useEffect(() => {
    const fetchTotalGalleryCount = async () => {
      setIsLoadingCounts(true);
      try {
        const response = await fetch("/api/gallery?count=true");
        if (response.ok) {
          const data = await response.json();
          setTotalGalleryCount(data.pagination?.total || 0);
        }
      } catch (error) {
        console.error("Error fetching gallery count:", error);
      } finally {
        setIsLoadingCounts(false);
      }
    };
    
    fetchTotalGalleryCount();
  }, []);

  // Handle file drop
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Limit number of files to remaining uploads
      const filesToAdd = acceptedFiles.slice(0, remainingUploads);

      if (filesToAdd.length === 0) return;

      const newFiles = filesToAdd.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substring(2, 9),
        status: "pending" as const,
        description: "",
        uploadProgress: 0,
      }));

      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      setError(null);
    },
    [remainingUploads]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".heic"],
    },
    maxFiles: remainingUploads,
    multiple: true,
  });

  // Handle description change for a specific file
  const handleDescriptionChange = (id: string, description: string) => {
    setFiles(
      files.map((file) => (file.id === id ? { ...file, description } : file))
    );
  };

  // Remove a file from the list
  const handleRemoveFile = (id: string) => {
    setFiles((prevFiles) => {
      const fileToRemove = prevFiles.find((f) => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prevFiles.filter((f) => f.id !== id);
    });
  };

  // Simulated progress update (since fetch doesn't provide upload progress)
  const simulateProgress = (fileId: string) => {
    // Simulate progress steps
    const progressSteps = [10, 25, 40, 60, 75, 90, 95];
    let stepIndex = 0;

    const interval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        // Update progress for this specific file
        setFiles(prevFiles => 
          prevFiles.map(f => 
            f.id === fileId 
              ? { ...f, uploadProgress: progressSteps[stepIndex] } 
              : f
          )
        );
        
        // Update overall progress
        updateOverallProgress();
        
        stepIndex++;
      } else {
        clearInterval(interval);
      }
    }, 500); // Adjust timing as needed

    return interval;
  };

  // Calculate overall progress
  const updateOverallProgress = () => {
    if (files.length === 0) return;

    const totalProgress = files.reduce((sum, file) => sum + (file.uploadProgress || 0), 0);
    const average = totalProgress / files.length;
    setOverallProgress(average);
  };

  // Handle upload of all files
  const handleUploadAll = async () => {
    if (files.length === 0 || !user) return;

    // Check if user has reached upload limit
    if (remainingUploads <= 0) {
      setError("You've reached the maximum number of uploads (10 photos).");
      return;
    }

    // Check if there are enough remaining uploads
    if (files.length > remainingUploads) {
      setError(`You can only upload ${remainingUploads} more photos.`);
      return;
    }

    setIsUploading(true);
    setError(null);
    setOverallProgress(0);

    // Mark all files as uploading
    setFiles((prevFiles) =>
      prevFiles.map((file) => ({ ...file, status: "uploading", uploadProgress: 0 }))
    );

    // Store progress update intervals to clear later
    const intervals: NodeJS.Timeout[] = [];

    // Upload each file sequentially
    let successCount = 0;
    let failCount = 0;

    // Toast for starting the upload process
    toast({
      title: "Reading and preparing your images",
      description: "Please wait while we process your photos...",
    });

    for (const fileObj of files) {
      // Skip already uploaded files
      if (fileObj.status === "success") {
        continue;
      }

      // Start simulated progress updates
      const progressInterval = simulateProgress(fileObj.id);
      intervals.push(progressInterval);

      try {
        const formData = new FormData();
        formData.append("file", fileObj.file);

        if (fileObj.description) {
          formData.append("description", fileObj.description);
        }

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        // Clear the progress interval
        clearInterval(progressInterval);

        if (!response.ok) {
          // Mark this specific file as failed
          setFiles((prevFiles) =>
            prevFiles.map((f) =>
              f.id === fileObj.id
                ? {
                    ...f,
                    status: "error",
                    uploadProgress: 0,
                    errorMessage:
                      result.reason || result.error || "Upload failed",
                  }
                : f
            )
          );
          failCount++;
        } else {
          // Mark this file as successful
          setFiles((prevFiles) =>
            prevFiles.map((f) =>
              f.id === fileObj.id 
                ? { ...f, status: "success", uploadProgress: 100 } 
                : f
            )
          );
          successCount++;
        }

        // Update overall progress
        updateOverallProgress();
      } catch (error: unknown) {
        // Clear the progress interval
        clearInterval(progressInterval);

        const errorMessage =
          error instanceof Error ? error.message : "Failed to upload image";

        // Mark this file as failed
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileObj.id 
              ? { ...f, status: "error", uploadProgress: 0, errorMessage } 
              : f
          )
        );
        failCount++;

        // Update overall progress
        updateOverallProgress();
      }
    }

    // Clear all progress intervals
    intervals.forEach(interval => clearInterval(interval));
    
    // Set overall progress to 100 when complete
    setOverallProgress(100);

    // Update counts based on successful uploads
    if (successCount > 0) {
      setUploadCount((prev) => prev + successCount);
      setRemainingUploads((prev) => prev - successCount);
      setTotalGalleryCount((prev) => prev + successCount);

      // Show success toast
      toast({
        title: "Upload Complete",
        description: `${successCount} ${successCount === 1 ? 'photo' : 'photos'} uploaded successfully.`,
      });

      // Remove successfully uploaded photos from the view
      setTimeout(() => {
        setFiles(prevFiles => prevFiles.filter(f => f.status !== "success"));
        setOverallProgress(0); // Reset progress after uploads are removed
      }, 1500);
    }

    if (failCount > 0) {
      toast({
        title: "Some uploads failed",
        description: `${failCount} ${failCount === 1 ? 'photo' : 'photos'} failed to upload.`,
        variant: "destructive"
      });
    }

    setIsUploading(false);

    // If all uploads are done and there are no more remaining uploads, redirect to gallery
    if (successCount > 0 && remainingUploads - successCount <= 0) {
      setTimeout(() => {
        router.push("/gallery");
      }, 2000);
    }
  };

  // Handle camera capture
  const handleCameraCapture = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment"; // For rear camera

    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        onDrop([target.files[0]]);
      }
    };

    input.click();
  };

  // Show loading or nothing while checking auth
  if (!isLoaded) {
    return <div className="p-4">Loading...</div>;
  }

  // Don't render anything if redirecting
  if (isLoaded && !isSignedIn) {
    return null;
  }

  const pendingFiles = files.filter(
    (f) => f.status === "pending" || f.status === "uploading"
  );

  return (
    <div className="h-screen max-w-2xl mx-auto p-4 justify-center">
      <h1 className="text-2xl font-bold mb-6 text-center text-primary-400">
        Share Your Best Moments!
      </h1>
      <div className="relative mt-12 lg:mt-4 lg:grid lg:grid-cols-1 lg:gap-8 lg:items-center bg-mono-100/10 rounded-2xl">
        <div className="mt-10 -mx-4 relative lg:mt-0">
          <div className="relative space-y-4 px-12 py-5">
            {[
              {
                number: "01",
                description: "Choose your favorite photos from the event.",
              },
              {
                number: "02",
                description: "Make sure they're clear and appropriate.",
              },
              {
                number: "03",
                description:
                  "Hit Upload and your memories will light up the big screen!",
              },
            ].map((step) => (
              <div key={step.number} className="flex items-center space-x-4">
                {/* Fixed-size circular number indicator */}
                <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary-400 text-secondary-800">
                  <span className="text-sm font-bold">
                    {step.number.toString().padStart(2, "0")}
                  </span>
                </div>

                {/* Content */}
                <div>
                  <p className="text-base text-secondary-200">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress indicator with loading state */}
      <div className="mb-8 mt-12">
        {isLoadingCounts ? (
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary-400" />
            <p className="text-mono-400">Loading your upload information...</p>
          </div>
        ) : (
          <p className="text-lg mb-2 text-primary-400 justify-center text-center">
            {uploadCount} of {maxUploads} photos uploaded ({remainingUploads}{" "}
            remaining)
          </p>
        )}
        <div className="w-full bg-mono-200 rounded-full h-2.5">
          <div
            className="bg-rose-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${(uploadCount / maxUploads) * 100}%` }}
          ></div>
        </div>
        {remainingUploads <= 0 && (
          <p className="text-red-500 mt-2">
            You have reached the maximum number of uploads. Please delete some
            photos if you want to upload more.
          </p>
        )}
      </div>

      {/* Dropzone */}
      {remainingUploads <= 0 ? (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
          You have reached the maximum upload limit of {maxUploads} photos.
          Please visit your dashboard to delete some photos if you want to
          upload more.
        </div>
      ) : (
        <>
          {/* File drop area */}
          <div className="mb-6">
            <div
              {...getRootProps()}
              className={`border-1 border-dashed rounded-lg p-8 text-center cursor-pointer transition bg-secondary-600/50 ${
                isDragActive ? "border-blue-500 bg-blue-50" : "border-mono-300"
              }`}
            >
              <input {...getInputProps()} />
              <p className="text-lg mb-2 text-mono-200">
                Drag & drop up to {remainingUploads} images here, or click to
                select
              </p>
              <p className="text-sm text-mono-400 mb-4">
                Supported formats: JPG, PNG, GIF
              </p>
            </div>

            {/* Camera capture button */}
            <div className="mt-4">
              <Button
                variant="primary"
                size="lg"
                onClick={handleCameraCapture}
                className="w-full"
              >
                <Camera className="mr-2" size={20} />
                Take a Photo
              </Button>
            </div>
          </div>

          {/* Files Preview and Upload Section */}
          {files.length > 0 && (
            <div className="space-y-6 mb-8">
              <h3 className="text-lg font-semibold text-primary-400">
                Selected Photos ({files.length})
              </h3>

              {/* Overall upload progress bar - only show during upload */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-mono-400">Reading and preparing your images...</p>
                    <span className="text-sm font-medium text-primary-400">{Math.round(overallProgress)}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2 w-full" />
                </div>
              )}

              {/* Photo thumbnails grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {files.map((fileObj) => (
                  <div
                    key={fileObj.id}
                    className="relative border rounded-lg overflow-hidden bg-mono-200"
                  >
                    {/* Status indicator */}
                    <div className="absolute top-2 right-2 z-10">
                      {fileObj.status === "success" && (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      )}
                      {fileObj.status === "error" && (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                      {fileObj.status === "uploading" && (
                        <Clock className="h-6 w-6 text-yellow-500 animate-pulse" />
                      )}
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveFile(fileObj.id)}
                      className="absolute top-2 left-2 z-10 bg-black bg-opacity-60 text-white rounded-full p-1 hover:bg-opacity-80"
                      type="button"
                      disabled={isUploading}
                    >
                      <X size={16} />
                    </button>

                    {/* Image */}
                    <div className="relative aspect-square w-full">
                      <Image
                        src={fileObj.preview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      {/* Individual file upload progress overlay */}
                      {fileObj.status === "uploading" && (fileObj.uploadProgress || 0) > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
                          Processing... {fileObj.uploadProgress}%
                        </div>
                      )}
                    </div>

                    {/* Error message if any */}
                    {fileObj.status === "error" && fileObj.errorMessage && (
                      <div className="p-2 text-xs text-red-500 bg-red-50 border-t border-red-200">
                        {fileObj.errorMessage}
                      </div>
                    )}

                    {/* Description field (if not yet uploaded) */}
                    {(fileObj.status === "pending" ||
                      fileObj.status === "uploading") && (
                      <div className="p-1">
                        <input
                          type="text"
                          value={fileObj.description}
                          onChange={(e) =>
                            handleDescriptionChange(fileObj.id, e.target.value)
                          }
                          placeholder="Add description..."
                          className="w-full text-xs p-2 bg-mono-100 border border-mono-300 rounded-md"
                          disabled={fileObj.status === "uploading"}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Upload button for multiple files */}
              {pendingFiles.length > 0 && (
                <Button
                  variant="primary"
                  onClick={handleUploadAll}
                  disabled={isUploading || pendingFiles.length === 0}
                  className={`w-full py-6 rounded-md text-secondary-600 ${
                    isUploading
                      ? "bg-secondary-400 cursor-not-allowed text-primary-400 transition duration-700 ease-in-out"
                      : "bg-primary-400 hover:bg-primary-600"
                  }`}
                >
                  {isUploading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reading and preparing images...
                    </div>
                  ) : (
                    `Upload ${pendingFiles.length} Photo${
                      pendingFiles.length !== 1 ? "s" : ""
                    }`
                  )}
                </Button>
              )}

              {/* Error message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 mt-4">
                  {error}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Gallery link with total count */}
      {totalGalleryCount > 0 && (
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/gallery")}
            className="text-secondary-200 hover:underline hover:bg-transparent hover:text-secondary-300 py-6 w-full"
          >
            View the gallery ({totalGalleryCount} photos)
          </Button>
        </div>
      )}
      
      {/* Fallback to show something if we have user uploads but total count failed to load */}
      {totalGalleryCount === 0 && uploadCount > 0 && (
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/gallery")}
            className="text-secondary-200 hover:underline hover:bg-transparent hover:text-secondary-300 py-6 w-full"
          >
            View the gallery
          </Button>
        </div>
      )}
    </div>
  );
}