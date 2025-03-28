"use client";

import { useState, useEffect, useCallback} from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Grid,
  MonitorPlay,
  Expand,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

type ViewMode = "grid" | "slideshow";
type SlideTransition = "none" | "incoming" | "active" | "outgoing";

export default function GalleryPage() {
  const { isSignedIn } = useUser();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [slideTransition, setSlideTransition] =
    useState<SlideTransition>("none");
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Animation state
  const [zoomActive, setZoomActive] = useState(false);

  // Slideshow state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [slideshowPlaying, setSlideshowPlaying] = useState(false);

  // Define functions with useCallback to prevent dependency issues
  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setIsFullScreen(false);
    if (viewMode === "slideshow") {
      setViewMode("grid");
    }
  }, [viewMode]);

  const toggleSlideshow = useCallback(() => {
    setSlideshowPlaying((prev) => !prev);
  }, []);

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => !prev);
  }, []);

  const navigateLightbox = useCallback(
    (direction: "prev" | "next") => {
      // Reset zoom immediately
      setZoomActive(false);
      
      let newIndex;
      if (direction === "prev") {
        newIndex = (currentPhotoIndex - 1 + photos.length) % photos.length;
        setSlideTransition("outgoing"); // Right to left for previous
      } else {
        newIndex = (currentPhotoIndex + 1) % photos.length;
        setSlideTransition("incoming"); // Left to right for next
      }

      // Apply transition
      setTimeout(() => {
        setCurrentPhotoIndex(newIndex);
        setSlideTransition("active");

        // Reset transition state after animation completes
        setTimeout(() => {
          setSlideTransition("none");
          
          // Start zoom effect after slide transition is complete
          setTimeout(() => {
            setZoomActive(true);
          }, 100);
        }, 500);
      }, 50);
    },
    [currentPhotoIndex, photos.length]
  );

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
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery(1);
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;

      switch (e.key) {
        case "ArrowLeft":
          navigateLightbox("prev");
          break;
        case "ArrowRight":
          navigateLightbox("next");
          break;
        case "Escape":
          if (isFullScreen) {
            setIsFullScreen(false);
          } else {
            closeLightbox();
          }
          break;
        case "f":
        case "F":
          toggleFullScreen();
          break;
        case " ": // Spacebar
          if (viewMode === "slideshow") {
            toggleSlideshow();
            e.preventDefault(); // Prevent page scrolling
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    lightboxOpen,
    navigateLightbox,
    isFullScreen,
    closeLightbox,
    toggleFullScreen,
    viewMode,
    toggleSlideshow
  ]);

  // Reset zoom animation when photo changes
  useEffect(() => {
    // Start the zoom effect with a slight delay to allow slide transition to complete
    setZoomActive(false);

    const timer = setTimeout(() => {
      setZoomActive(true);
    }, 500); // Start after slide transition completes

    // Cleanup
    return () => {
      clearTimeout(timer);
    };
  }, [currentPhotoIndex]);

  // Handle slideshow auto-play
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (slideshowPlaying && viewMode === "slideshow") {
      interval = setInterval(() => {
        navigateLightbox("next");
      }, 5000); // Change slide every 5 seconds
    }

    // Clean up function
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [slideshowPlaying, viewMode, navigateLightbox]);

  // Stop slideshow when view mode changes
  useEffect(() => {
    if (viewMode !== "slideshow") {
      setSlideshowPlaying(false);
    }
  }, [viewMode]);

  const handlePageChange = (newPage: number) => {
    if (pagination && newPage > 0 && newPage <= pagination.pages) {
      fetchGallery(newPage);
    }
  };

  const openLightbox = (index: number) => {
    setCurrentPhotoIndex(index);
    setSlideTransition("none");
    setLightboxOpen(true);
  };

  // Modified to enable fullscreen immediately
  const toggleViewMode = () => {
    if (viewMode === "grid") {
      // Switch to slideshow
      setViewMode("slideshow");
      
      // Open lightbox if not already open
      if (!lightboxOpen && photos.length > 0) {
        setLightboxOpen(true);
        
        // Automatically start playing the slideshow
        setSlideshowPlaying(true);
        
        // Automatically enable fullscreen mode
        setIsFullScreen(true);
      } else if (lightboxOpen) {
        // If lightbox is already open, just enable fullscreen
        setIsFullScreen(true);
      }
    } else {
      // Switch back to grid view
      setViewMode("grid");
      setSlideshowPlaying(false);
      setIsFullScreen(false);
    }
  };

  const selectThumbnail = (index: number) => {
    if (index === currentPhotoIndex) return;
    
    // Reset zoom immediately
    setZoomActive(false);
    
    setSlideTransition(index > currentPhotoIndex ? "incoming" : "outgoing");
    
    // Apply transition
    setTimeout(() => {
      setCurrentPhotoIndex(index);
      setSlideTransition("active");
      
      // Reset transition state after animation completes
      setTimeout(() => {
        setSlideTransition("none");
        
        // Start zoom effect after slide transition is complete
        setTimeout(() => {
          setZoomActive(true);
        }, 100);
      }, 500);
    }, 50);
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-mono-100">
          Event Photo Gallery
        </h1>

        <div className="flex items-center lg:space-x-2">
          {/* View mode toggle */}
          {photos.length > 0 && (
            <Button
              variant="secondary"
              onClick={toggleViewMode}
              className="flex items-center"
            >
              {viewMode === "grid" ? (
                <>
                  <MonitorPlay className="mr-2 h-4 w-4" />
                  Fullscreen Slideshow
                </>
              ) : (
                <>
                  <Grid className="mr-2 h-4 w-4" />
                  Grid View
                </>
              )}
            </Button>
          )}

          {/* Upload button */}
          {isSignedIn && (
            <Link href="/upload">
              <Button variant="primary" size="sm" className="flex items-center">
                <Camera className="mr-2 h-4 w-4" /> Upload
              </Button>
            </Link>
          )}
        </div>
      </div>

      {isLoading && photos.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg text-mono-500">Loading gallery...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg mb-4">No photos have been uploaded yet.</p>
          {isSignedIn ? (
            <Link href="/upload" className="text-secondary-400 hover:underline">
              Be the first to upload a photo!
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="text-secondary-400 hover:underline"
            >
              Sign in to upload photos
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Grid view */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="bg-white rounded-lg overflow-hidden shadow-md cursor-pointer"
                  onClick={() => openLightbox(index)}
                >
                  <div className="relative aspect-square">
                    <Image
                      src={photo.s3Url}
                      alt={photo.description || "Event photo"}
                      fill
                      className="object-cover hover:opacity-90 transition-opacity"
                    />
                  </div>

                  <div className="p-4">
                    {photo.description && (
                      <p className="text-mono-700 mb-2">{photo.description}</p>
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
                        <div className="w-6 h-6 bg-mono-200 rounded-full mr-2"></div>
                      )}
                      <span className="text-sm text-mono-500">
                        {photo.user.name || "Anonymous"}
                      </span>
                    </div>

                    <p className="text-xs text-mono-400 mt-1">
                      {new Date(photo.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lightbox with enhanced slideshow */}
          {lightboxOpen && photos.length > 0 && (
            <div
              className={`fixed inset-0 z-50 bg-black flex flex-col ${
                isFullScreen ? "fullscreen" : ""
              }`}
            >
              {/* Lightbox header - hide in fullscreen */}
              {!isFullScreen && (
                <div className="flex justify-between items-center p-4 bg-black bg-opacity-50">
                  <div className="text-white flex items-center space-x-2">
                    {/* Slideshow controls */}
                    {viewMode === "slideshow" && (
                      <Button
                        variant="ghost"
                        onClick={toggleSlideshow}
                        className="text-white hover:bg-white hover:bg-opacity-20"
                      >
                        {slideshowPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </Button>
                    )}

                    <span>
                      {currentPhotoIndex + 1} of {photos.length}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      onClick={toggleFullScreen}
                      className="text-white hover:bg-white hover:bg-opacity-20"
                    >
                      <Expand className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={closeLightbox}
                      className="text-white hover:bg-white hover:bg-opacity-20"
                    >
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Lightbox content with slide transition effect */}
              <div className="flex-grow flex items-center justify-center relative overflow-hidden">
                {/* Navigation buttons - always visible */}
                <button
                  className="absolute left-4 z-20 bg-black bg-opacity-50 rounded-full p-2 text-white hover:bg-opacity-75 transition-all"
                  onClick={() => navigateLightbox("prev")}
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>

                {/* Main image with inline style zoom effect */}
                <div
                  className={`relative w-full h-full flex items-center justify-center
                    ${
                      slideTransition === "incoming"
                        ? "translate-x-full"
                        : slideTransition === "outgoing"
                        ? "-translate-x-full"
                        : slideTransition === "active"
                        ? "translate-x-0 transition-transform duration-500"
                        : ""
                    }
                  `}
                >
                  <div className="relative max-w-full max-h-full overflow-hidden">
                    <div
                      key={photos[currentPhotoIndex].id}
                      style={{
                        transition: "transform 30s linear",
                        transform: zoomActive ? "scale(1.4)" : "scale(1)",
                        transformOrigin: "center center",
                      }}
                    >
                      <Image
                        src={photos[currentPhotoIndex].s3Url}
                        alt={
                          photos[currentPhotoIndex].description || "Event photo"
                        }
                        width={1600}
                        height={1200}
                        className="object-contain max-h-[85vh] max-w-full"
                        priority
                      />
                    </div>
                  </div>
                </div>

                <button
                  className="absolute right-4 z-20 bg-black bg-opacity-50 rounded-full p-2 text-white hover:bg-opacity-75 transition-all"
                  onClick={() => navigateLightbox("next")}
                >
                  <ChevronRight className="h-8 w-8" />
                </button>

                {/* Fullscreen controls overlay - only in fullscreen mode */}
                {isFullScreen && (
                  <div className="absolute top-4 right-4 flex items-center space-x-2 z-30">
                    {viewMode === "slideshow" && (
                      <Button
                        variant="ghost"
                        onClick={toggleSlideshow}
                        className="text-white hover:bg-white hover:bg-opacity-20"
                      >
                        {slideshowPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={toggleFullScreen}
                      className="text-white hover:bg-white hover:bg-opacity-20"
                    >
                      <Expand className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={closeLightbox}
                      className="text-white hover:bg-white hover:bg-opacity-20"
                    >
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                )}

                {/* Photo counter overlay in fullscreen mode */}
                {isFullScreen && (
                  <div className="absolute top-4 left-4 text-white bg-black bg-opacity-50 px-3 py-1 rounded-full">
                    {currentPhotoIndex + 1} / {photos.length}
                  </div>
                )}
              </div>

              {/* Thumbnails bar */}
              {viewMode === "slideshow" && !isFullScreen && (
                <div className="bg-black p-2 overflow-x-auto">
                  <div className="flex space-x-2">
                    {photos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className={`relative cursor-pointer ${
                          index === currentPhotoIndex
                            ? "ring-2 ring-primary-400"
                            : "opacity-60 hover:opacity-100"
                        }`}
                        onClick={() => selectThumbnail(index)}
                      >
                        <div className="relative h-16 w-16">
                          <Image
                            src={photo.s3Url}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo info - show in all modes with different styling */}
              <div className={`bg-black ${isFullScreen ? 'bg-opacity-25 absolute bottom-0 left-0 w-full' : 'bg-opacity-50'} p-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {photos[currentPhotoIndex].user.avatar ? (
                      <Image
                        src={photos[currentPhotoIndex].user.avatar}
                        alt={photos[currentPhotoIndex].user.name || "User"}
                        width={24}
                        height={24}
                        className="rounded-full mr-2"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-gray-600 rounded-full mr-2"></div>
                    )}
                    <div>
                      <span className="text-sm font-semibold">
                        {photos[currentPhotoIndex].user.name || "Anonymous"}
                      </span>
                      {photos[currentPhotoIndex].description && (
                        <p className="text-sm opacity-90 mt-1">
                          {photos[currentPhotoIndex].description}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs opacity-75">
                    {new Date(photos[currentPhotoIndex].createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Pagination - only show in grid view */}
          {viewMode === "grid" && pagination && pagination.pages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    pagination.currentPage === 1
                      ? "bg-mono-100 text-mono-400 cursor-not-allowed"
                      : "bg-mono-200 hover:bg-mono-300"
                  }`}
                >
                  Previous
                </button>

                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter(
                    (page) =>
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
                          className="px-3 py-1 text-mono-400"
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
                            ? "bg-secondary-400 text-white"
                            : "bg-mono-200 hover:bg-mono-300"
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
                      ? "bg-mono-100 text-mono-400 cursor-not-allowed"
                      : "bg-mono-200 hover:bg-mono-300"
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