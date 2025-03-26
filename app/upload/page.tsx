"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Camera, X, CheckCircle, XCircle, Clock } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

type FileWithPreview = {
  file: File;
  preview: string;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  description: string;
  errorMessage?: string;
};

export default function UploadPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();

  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [remainingUploads, setRemainingUploads] = useState(10);
  const maxUploads = 10; // Maximum number of photos allowed

  // const [file, setFile] = useState<FileWithPreview[]>([]);
  // const [preview, setPreview] = useState<string | null>(null);
  // const [description, setDescription] = useState("");
  // const [isUploading, setIsUploading] = useState(false);
  // const [error, setError] = useState<string | null>(null);
  // const [uploadCount, setUploadCount] = useState(0);
  // const [remainingUploads, setRemainingUploads] = useState(10);
  // const maxUploads = 10; // Maximum number of photos allowed

  // Redirect if not signed in - moved to useEffect
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

      try {
        const response = await fetch("/api/user/photo-count");

        if (response.ok) {
          const data = await response.json();
          setUploadCount(data.count);
          setRemainingUploads(data.remainingUploads);
        }
      } catch (error) {
        console.error("Failed to fetch photo count:", error);
      }
    };

    fetchPhotoCount();
  }, [isSignedIn]);

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
    multiple: true, // Allow multiple files
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

    // Mark all files as uploading
    setFiles((prevFiles) =>
      prevFiles.map((file) => ({ ...file, status: "uploading" }))
    );

    // Upload each file sequentially
    let successCount = 0;

    for (const fileObj of files) {
      // Skip already uploaded files
      if (fileObj.status === "success") {
        continue;
      }

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

        if (!response.ok) {
          // Mark this specific file as failed
          setFiles((prevFiles) =>
            prevFiles.map((f) =>
              f.id === fileObj.id
                ? {
                    ...f,
                    status: "error",
                    errorMessage:
                      result.reason || result.error || "Upload failed",
                  }
                : f
            )
          );
        } else {
          // Mark this file as successful
          setFiles((prevFiles) =>
            prevFiles.map((f) =>
              f.id === fileObj.id ? { ...f, status: "success" } : f
            )
          );
          successCount++;
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to upload image";

        // Mark this file as failed
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileObj.id ? { ...f, status: "error", errorMessage } : f
          )
        );
      }
    }

    // Update counts based on successful uploads
    if (successCount > 0) {
      setUploadCount((prev) => prev + successCount);
      setRemainingUploads((prev) => prev - successCount);
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
    <div className="max-w-2xl mx-auto p-4 justify-center">
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

      {/* Progress indicator */}
      <div className="mb-8 mt-12">
        <p className="text-lg mb-2 text-primary-400 justify-center text-center">
          {uploadCount} of {maxUploads} photos uploaded ({remainingUploads}{" "}
          remaining)
        </p>
        <div className="w-full bg-mono-200 rounded-full h-2.5">
          <div
            className="bg-rose-600 h-2.5 rounded-full"
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

              {/* Photo thumbnails grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {files.map((fileObj) => (
                  <div
                    key={fileObj.id}
                    className="relative border rounded-lg overflow-hidden bg-mono-800"
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
                      <div className="p-2">
                        <input
                          type="text"
                          value={fileObj.description}
                          onChange={(e) =>
                            handleDescriptionChange(fileObj.id, e.target.value)
                          }
                          placeholder="Add description..."
                          className="w-full text-xs p-1 bg-secondary-600/50 border border-mono-300 rounded"
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
                  {isUploading
                    ? "Uploading..."
                    : `Upload ${pendingFiles.length} Photo${
                        pendingFiles.length !== 1 ? "s" : ""
                      }`}
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

      {/* Gallery link */}
      {uploadCount > 0 && (
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/gallery")}
            className="text-secondary-200 hover:underline hover:bg-transparent hover:text-secondary-300 py-6 w-full"
          >
            View the gallery ({uploadCount} photos)
          </Button>
        </div>
      )}
    </div>
  );
}
