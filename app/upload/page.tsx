// app/upload/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function UploadPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [remainingUploads, setRemainingUploads] = useState(10);
  const maxUploads = 10; // Maximum number of photos allowed

  // Redirect if not signed in - moved to useEffect
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

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
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxFiles: 1,
    multiple: false,
  });

  // Handle upload
  const handleUpload = async () => {
    if (!file || !user) return;

    // Check if user has reached upload limit
    if (remainingUploads <= 0) {
      setError("You've reached the maximum number of uploads (10 photos).");
      return;
    }

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
      setUploadCount((prev) => prev + 1);
      setRemainingUploads((prev) => prev - 1);
      setFile(null);
      setPreview(null);
      setDescription("");

      // If user has reached the limit, redirect to gallery
      if (remainingUploads <= 1) {
        router.push("/gallery");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload image";
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
                description:
                  "Choose your favorite photo from the event.",
              },
              {
                number: "02",
                description:
                  "Make sure it’s clear and appropriate.",
              },
              {
                number: "03",
                description:
                  "Hit “Upload” and your memory will light up the big screen!",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="flex items-center space-x-4"
              >
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
      ) : !preview ? (
        <div className="mb-6">
          <div
            {...getRootProps()}
            className={`border-1 border-dashed rounded-lg p-8 text-center cursor-pointer transition bg-secondary-600/50 ${
              isDragActive ? "border-blue-500 bg-blue-50" : "border-mono-300"
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-lg mb-2 text-mono-200">
              Drag & drop an image here, or click to select
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
          {/* <button
            type="button"
            onClick={handleCameraCapture}
            className="mt-4 flex items-center justify-center w-full py-2 bg-mono-100 rounded-md hover:bg-mono-200"
          >
            <Camera className="mr-2" size={20} />
            Take a Photo
          </button> */}
        </div>
      ) : (
        /* Image preview */
        <div className="mb-6">
          <div className="relative aspect-video w-full mb-4 bg-mono-100 rounded-lg overflow-hidden">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
            />
            <div className="absolute bottom-2 left-2 flex space-x-2">
              <Button
                variant="destructive"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="text-mono-100"
              >
                <X /> Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Description field */}
      {preview && (
        <div className="mb-6">
          <label
            htmlFor="description"
            className="block mb-2 text-sm font-medium text-mono-400"
          >
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-mono-300 rounded-md text-mono-100 bg-secondary-600/50"
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
        <Button
          variant="primary"
          onClick={handleUpload}
          disabled={isUploading || !file}
          className={`w-full py-6 rounded-md text-secondary-600 ${
            isUploading
              ? "bg-secondary-400 cursor-not-allowed text-primary-400 transition duration-700 ease-in-out"
              : "bg-primary-400 hover:bg-primary-600"
          }`}
        >
          {isUploading ? "Validating..." : "Validate & Upload"}
        </Button>
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
