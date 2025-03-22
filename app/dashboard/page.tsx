"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { Trash2 } from "lucide-react";

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
        const errorMessage = error instanceof Error ? error.message : "An error occurred";
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
      setPhotos(photos.filter(photo => photo.id !== photoId));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete photo";
      setError(errorMessage);
    } finally {
      setDeleteLoading(null);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">My Photos</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg text-gray-500">Loading your photos...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-lg mb-4">You haven&apos;t uploaded any photos yet.</p>
          <button
            onClick={() => router.push("/upload")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Upload Your First Photo
          </button>
        </div>
      ) : (
        <>
          <p className="mb-6">
            You have uploaded {photos.length} photo{photos.length !== 1 ? "s" : ""}.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-lg overflow-hidden shadow-md relative group">
                <div className="relative aspect-square">
                  <Image 
                    src={photo.s3Url}
                    alt={photo.description || "My photo"}
                    fill
                    className="object-cover"
                  />
                  
                  {/* Delete button overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      disabled={deleteLoading === photo.id}
                      className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                
                <div className="p-4">
                  {photo.description && (
                    <p className="text-gray-700 mb-2">{photo.description}</p>
                  )}
                  
                  <p className="text-xs text-gray-400">
                    {new Date(photo.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}