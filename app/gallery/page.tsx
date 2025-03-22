// app/gallery/page.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

interface Photo {
  id: string;
  s3Url: string;
  description: string | null;
  createdAt: string;
  user: {
    name: string | null;
    avatar: string | null;
  };
}

interface PaginationData {
  total: number;
  pages: number;
  currentPage: number;
  limit: number;
}

export default function GalleryPage() {
  const { isSignedIn } = useUser();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGallery = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/gallery?page=${page}&limit=12`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch gallery");
      }
      
      const data = await response.json();
      setPhotos(data.photos);
      setPagination(data.pagination);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery(1);
  }, []);

  const handlePageChange = (newPage: number) => {
    if (pagination && newPage > 0 && newPage <= pagination.pages) {
      fetchGallery(newPage);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Event Photo Gallery</h1>
        
        {isSignedIn && (
          <Link href="/upload" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Upload Photos
          </Link>
        )}
      </div>
      
      {isLoading && photos.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg text-gray-500">Loading gallery...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg mb-4">No photos have been uploaded yet.</p>
          {isSignedIn ? (
            <Link href="/upload" className="text-blue-600 hover:underline">
              Be the first to upload a photo!
            </Link>
          ) : (
            <Link href="/sign-in" className="text-blue-600 hover:underline">
              Sign in to upload photos
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Gallery grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-lg overflow-hidden shadow-md">
                <div className="relative aspect-square">
                  <Image 
                    src={photo.s3Url}
                    alt={photo.description || "Event photo"}
                    fill
                    className="object-cover"
                  />
                </div>
                
                <div className="p-4">
                  {photo.description && (
                    <p className="text-gray-700 mb-2">{photo.description}</p>
                  )}
                  
                  <div className="flex items-center mt-2">
                    {photo.user.avatar ? (
                      <Image 
                        src={photo.user.avatar}
                        alt={photo.user.name || "User"}
                        width={24}
                        height={24}
                        className="rounded-full mr-2"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-gray-200 rounded-full mr-2"></div>
                    )}
                    <span className="text-sm text-gray-500">
                      {photo.user.name || "Anonymous"}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(photo.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    pagination.currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  Previous
                </button>
                
                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === pagination.pages || 
                    Math.abs(page - pagination.currentPage) <= 1
                  )
                  .map((page, index, array) => {
                    // Add ellipsis
                    if (index > 0 && page - array[index - 1] > 1) {
                      return (
                        <span 
                          key={`ellipsis-${page}`}
                          className="px-3 py-1 text-gray-400"
                        >
                          ...
                        </span>
                      );
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 rounded-md ${
                          pagination.currentPage === page
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 hover:bg-gray-300"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.pages}
                  className={`px-3 py-1 rounded-md ${
                    pagination.currentPage === pagination.pages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}