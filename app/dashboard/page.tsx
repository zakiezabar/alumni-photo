"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { Trash2 } from "lucide-react";
import { Space_Mono } from "next/font/google";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

interface Photo {
  id: string;
  s3Url: string;
  description: string | null;
  createdAt: string;
}

export default function MyPhotosPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch user's photos
  useEffect(() => {
    const fetchUserPhotos = async () => {
      if (!isSignedIn) return;

      setIsLoading(true);
      try {
        const response = await fetch("/api/user/photos");

        if (!response.ok) {
          throw new Error("Failed to fetch your photos");
        }

        const data = await response.json();
        setPhotos(data.photos);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPhotos();
  }, [isSignedIn]);

  // Handle photo deletion
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    setDeleteLoading(photoId);
    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete photo");
      }

      // Remove from state
      setPhotos(photos.filter((photo) => photo.id !== photoId));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete photo";
      setError(errorMessage);
    } finally {
      setDeleteLoading(null);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div className="max-w-6xl w-full p-4 justify-center">
      <h1 className="text-2xl font-bold text-center text-mono-100">
        My Photos
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg text-mono-500">Loading your photos...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12 bg-mono-50 rounded-lg">
          <p className="text-lg mb-4 text-mono-400">
            You haven&apos;t uploaded any photos yet.
          </p>
          <button
            onClick={() => router.push("/upload")}
            className="px-4 py-2 bg-secondary-400 text-white rounded-md hover:bg-secondary-600"
          >
            Upload Your First Photo
          </button>
        </div>
      ) : (
        <>
          <p className="mb-6 text-mono-400 text-center">
            You have uploaded {photos.length} photo
            {photos.length !== 1 ? "s" : ""}.
          </p>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="rounded-lg overflow-hidden shadow-md relative group"
                >
                  <div className="relative aspect-square">
                    <Image
                      src={photo.s3Url}
                      alt={photo.description || "My photo"}
                      fill
                      className="object-cover"
                    />

                    {/* Delete button overlay */}
                    <div className="absolute inset-0 bg-mono-900/60 bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        disabled={deleteLoading === photo.id}
                        className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    {/* Gradient overlay for better text visibility */}
                    <div
                      className="absolute bottom-0 left-0 w-full h-40 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%)",
                      }}
                    ></div>

                    {/* Text content positioned at the bottom */}
                    <div className="absolute bottom-0 left-0 w-full p-3 text-mono-100 z-10">
                      {photo.description && (
                        <p className="text-xs font-medium mb-1 line-clamp-1">
                          {photo.description}
                        </p>
                      )}
                      <div className="flex items-center mt-2">
                        <p className={`${spaceMono.className} text-xs text-mono-400 mt-1`}>
                          {new Date(photo.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {/* thumbnails will become smaller if i delete this div */}
                    {/* <div className="p-4">
                      {photo.description && (
                        <p className="text-mono-700 mb-2">
                          {photo.description}
                        </p>
                      )}

                      <p className="text-xs text-mono-400">
                        {new Date(photo.createdAt).toLocaleString()}
                      </p>
                    </div> */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
