"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Camera } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export default function UploadPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const maxUploads = 10; // Maximum number of photos allowed
  
  // Redirect if not signed in - moved to useEffect
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    multiple: false
  });

  // Handle upload
  const handleUpload = async () => {
    if (!file || !user) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (description) {
        formData.append("description", description);
      }
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.reason || result.error || "Upload failed");
      }
      
      // Success - update count and reset form
      setUploadCount(prev => prev + 1);
      setFile(null);
      setPreview(null);
      setDescription("");
      
      // If user has hit the max uploads, redirect to gallery
      if (uploadCount + 1 >= maxUploads) {
        router.push("/gallery");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
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

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Upload Your Event Photos</h1>
      
      {/* Progress indicator */}
      <div className="mb-8">
        <p className="text-lg mb-2">
          {uploadCount} of {maxUploads} photos uploaded
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${(uploadCount / maxUploads) * 100}%` }}
          ></div>
        </div>
      </div>
      
      {/* Dropzone */}
      {!preview ? (
        <div className="mb-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
              isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-lg mb-2">Drag & drop an image here, or click to select</p>
            <p className="text-sm text-gray-500 mb-4">Supported formats: JPG, PNG, GIF</p>
          </div>
          
          {/* Camera capture button */}
          <button
            type="button"
            onClick={handleCameraCapture}
            className="mt-4 flex items-center justify-center w-full py-2 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            <Camera className="mr-2" size={20} />
            Take a Photo
          </button>
        </div>
      ) : (
        /* Image preview */
        <div className="mb-6">
          <div className="relative aspect-video w-full mb-4 bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-contain"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Description field */}
      {preview && (
        <div className="mb-6">
          <label htmlFor="description" className="block mb-2 text-sm font-medium">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            rows={2}
            placeholder="Add a description..."
          ></textarea>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}
      
      {/* Upload button */}
      {preview && (
        <button
          onClick={handleUpload}
          disabled={isUploading || !file}
          className={`w-full py-3 rounded-md text-white font-medium ${
            isUploading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isUploading ? "Uploading..." : "Upload Photo"}
        </button>
      )}
      
      {/* Gallery link */}
      {uploadCount > 0 && (
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/gallery")}
            className="text-blue-600 hover:underline"
          >
            View the gallery ({uploadCount} photos)
          </button>
        </div>
      )}
    </div>
  );
}