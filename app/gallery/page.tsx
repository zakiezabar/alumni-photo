"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Grid,
  MonitorPlay,
  Expand,
  Download,
  CircleCheck,
  Circle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
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
  userId: string;
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

type ViewMode = "grid" | "slideshow" | "selection";
type SlideTransition = "none" | "incoming" | "active" | "outgoing";

export default function GalleryPage() {
  const { isSignedIn, user } = useUser();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  // Selection/deletion state
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hoverPhotoId, setHoverPhotoId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch user role
  const fetchUserRole = useCallback(async () => {
    if (!isSignedIn || !user) return;

    console.log("Fetching user role for", user.id);

    try {
      const response = await fetch("/api/user/role");
      console.log("Role API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Role data received:", data);

        setUserRole(data.role);
        setCurrentUserId(data.userId);

        console.log(
          "Updated state - userRole:",
          data.role,
          "currentUserId:",
          data.userId
        );
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Could not parse error response" }));
        console.error("Error response from role API:", errorData);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  }, [isSignedIn, user]);

  useEffect(() => {
    if (isSignedIn && user) {
      fetchUserRole();
    }
  }, [isSignedIn, user, fetchUserRole]);

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

  const fetchGallery = useCallback(async (page = 1) => {
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
  }, []);

  useEffect(() => {
    fetchGallery(1);
  }, [fetchGallery]);

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
    toggleSlideshow,
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
      // Clear selections when changing pages
      setSelectedPhotos(new Set());
    }
  };

  const openLightbox = (index: number) => {
    if (viewMode === "selection") return; // Don't open lightbox in selection or deletion mode

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

  // New functions for toggle operation modes
  const toggleSelectionMode = () => {
    if (viewMode === "selection") {
      setViewMode("grid");
      setSelectedPhotos(new Set());
    } else {
      setViewMode("selection");
      // Close lightbox if open
      if (lightboxOpen) {
        closeLightbox();
      }
    }
  };

  // const toggleDeletionMode = () => {
  //   if (viewMode === "deletion") {
  //     setViewMode("grid");
  //     setSelectedPhotos(new Set());
  //   } else {
  //     setViewMode("deletion");
  //     // Close lightbox if open
  //     if (lightboxOpen) {
  //       closeLightbox();
  //     }
  //   }
  // };

  const togglePhotoSelection = (id: string) => {
    setSelectedPhotos((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  };

  const selectAllPhotos = () => {
    if (viewMode === "selection") {
      // In deletion mode, only select photos that can be deleted
      const deletablePhotoIds = photos
        .filter((photo) => canDeletePhoto(photo.userId))
        .map((photo) => photo.id);
      setSelectedPhotos(new Set(deletablePhotoIds));
    } else {
      // In selection mode, select all photos
      const allIds = photos.map((photo) => photo.id);
      setSelectedPhotos(new Set(allIds));
    }
  };

  const deselectAllPhotos = () => {
    setSelectedPhotos(new Set());
  };

  // Single photo download
  const downloadSinglePhoto = async (photoId: string, photoUrl: string) => {
    try {
      // Create a link to download the image directly
      const link = document.createElement("a");
      link.href = photoUrl;
      link.download = `photo-${photoId}.jpg`; // Default name
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: "Your photo download should begin shortly.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description:
          error instanceof Error ? error.message : "Failed to download photo",
        variant: "destructive",
      });
    }
  };

  // Single photo delete
  const deleteSinglePhoto = async (photoId: string) => {
    if (!isSignedIn) {
      toast({
        title: "Authentication required",
        description: "Please sign in to delete photos.",
        variant: "destructive",
      });
      return;
    }

    if (
      confirm(
        "Are you sure you want to delete this photo? This action cannot be undone."
      )
    ) {
      try {
        const response = await fetch(`/api/photos/${photoId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete photo");
        }

        // Remove photo from state
        setPhotos((prevPhotos) =>
          prevPhotos.filter((photo) => photo.id !== photoId)
        );

        toast({
          title: "Photo deleted",
          description: "The photo has been deleted successfully.",
        });
      } catch (error) {
        toast({
          title: "Deletion failed",
          description:
            error instanceof Error ? error.message : "Failed to delete photo",
          variant: "destructive",
        });
      }
    }
  };

  // Check if user can delete a photo
  const canDeletePhoto = (photoUserId: string): boolean => {
    console.log(
      "canDeletePhoto check:",
      "photoUserId:",
      photoUserId,
      "currentUserId:",
      currentUserId,
      "userRole:",
      userRole,
      "isAdmin?",
      userRole === "ADMIN"
    );

    if (!isSignedIn) return false;
    return userRole === "ADMIN"; // Only admins can delete photos
  };

  const downloadSelectedPhotos = async () => {
    if (selectedPhotos.size === 0) {
      toast({
        title: "No photos selected",
        description: "Please select at least one photo to download.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);

    // Show initial toast
    toast({
      title: "Download started",
      description: `Preparing ${selectedPhotos.size} photos for download...`,
    });

    try {
      // Convert Set to Array for the API request
      const photoIds = Array.from(selectedPhotos);

      console.log(
        `Sending download request for ${photoIds.length} photos:`,
        photoIds
      );

      // Use AbortController to handle timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      // Fetch the ZIP file from our API
      const response = await fetch("/api/gallery/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoIds }),
        signal: controller.signal,
      });

      // Clear timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = "Failed to download photos";

        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }

        throw new Error(errorMessage);
      }

      // Check Content-Type to make sure we got a ZIP file
      const contentType = response.headers.get("Content-Type");
      if (contentType !== "application/zip") {
        console.warn("Unexpected content type:", contentType);
      }

      // Get content length if available
      const contentLength = response.headers.get("Content-Length");
      console.log(
        `Received response with size: ${contentLength || "unknown"} bytes`
      );

      // Create a blob from the response
      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("Received empty file");
      }

      console.log(`Created blob of size: ${blob.size} bytes`);

      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "event-photos.zip";
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1000);

      toast({
        title: "Download complete",
        description: `Successfully downloaded ${selectedPhotos.size} photos as a ZIP file.`,
      });

      // Exit selection mode after download
      setViewMode("grid");
      setSelectedPhotos(new Set());
    } catch (error) {
      console.error("Download error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : error instanceof DOMException && error.name === "AbortError"
          ? "Download request timed out. Try downloading fewer photos at once."
          : "Failed to download photos";

      toast({
        title: "Download failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const deleteSelectedPhotos = async () => {
    if (selectedPhotos.size === 0) {
      toast({
        title: "No photos selected",
        description: "Please select at least one photo to delete.",
        variant: "destructive",
      });
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedPhotos.size} photos? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      // Convert Set to Array for the API request
      const photoIds = Array.from(selectedPhotos);

      // Send delete request to our API
      const response = await fetch("/api/gallery/delete-multiple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete photos");
      }

      const result = await response.json();

      // Remove deleted photos from state
      if (result.results.success.length > 0) {
        setPhotos((prevPhotos) =>
          prevPhotos.filter(
            (photo) => !result.results.success.includes(photo.id)
          )
        );
      }

      toast({
        title: "Photos deleted",
        description: `Successfully deleted ${
          result.results.success.length
        } photos.${
          result.results.failed.length > 0
            ? ` Failed to delete ${result.results.failed.length} photos.`
            : ""
        }`,
      });

      // Exit deletion mode after delete
      setViewMode("grid");
      setSelectedPhotos(new Set());
    } catch (error) {
      toast({
        title: "Deletion failed",
        description:
          error instanceof Error ? error.message : "Failed to delete photos",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    let eventSource: EventSource | null = null;

    if (typeof window !== "undefined") {
      // Create SSE connection
      eventSource = new EventSource("/api/gallery/updates");

      // Store current pagination page to use in the event handler
      // const currentPage = pagination?.currentPage || 1;

      // Listen for events
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "new-photo") {
          // Fetch the latest photos
          fetchGallery(pagination?.currentPage || 1);
        }
      };

      eventSource.onerror = (error) => {
        console.error("EventSource error:", error);
        eventSource?.close();

        // Try to reconnect after a delay
        setTimeout(() => {
          eventSource = new EventSource("/api/gallery/updates");
        }, 5000);
      };
    }

    // Clean up on component unmount
    return () => {
      eventSource?.close();
    };
  }, [pagination?.currentPage, fetchGallery]);

  return (
    <div className="max-w-6xl lg:w-3/4 mx-auto p-4">
      <div className="flex flex-col lg:flex-row justify-between items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold text-mono-100">
          Event Photo Gallery
        </h1>

        <div className="w-full lg:w-fit flex items-center justify-end lg:space-x-2 flex-wrap gap-2">
          {/* Selection/deletion mode toggles */}
          {/* Selection mode toggle */}
          {photos.length > 0 && (
            <Button
              variant="secondary"
              onClick={toggleSelectionMode}
              className="flex items-center"
            >
              {viewMode === "selection" ? (
                <>
                  <X className="mr-1 size-5" />
                  Cancel Selection
                </>
              ) : (
                <>
                  <CircleCheck className="mr-1 size-5" />
                  Select
                </>
              )}
            </Button>
          )}

          {/* View mode toggle */}
          {photos.length > 0 && viewMode !== "selection" && (
            <Button
              variant="primary"
              onClick={toggleViewMode}
              className="flex items-center"
            >
              {viewMode === "grid" ? (
                <>
                  <MonitorPlay className="mr-1 size-5" />
                  Slideshow
                </>
              ) : (
                <>
                  <Grid className="mr-1 size-5" />
                  Grid View
                </>
              )}
            </Button>
          )}

          {/* Upload button */}
          {/* {isSignedIn && viewMode !== "selection" && (
            <Link href="/upload">
              <Button variant="primary" size="sm" className="flex items-center">
                <Camera className="mr-2 h-4 w-4" /> Upload
              </Button>
            </Link>
          )} */}
        </div>
      </div>

      {/* Selection mode controls */}
      {viewMode === "selection" && (
        <div className="bg-secondary-600 p-4 rounded-lg mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-row items-center gap-4">
            <span className="font-medium text-mono-200">
              {selectedPhotos.size} of {photos.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={
                selectedPhotos.size === photos.length
                  ? deselectAllPhotos
                  : selectAllPhotos
              }
            >
              {selectedPhotos.size === photos.length
                ? "Deselect All"
                : "Select All"}
            </Button>
          </div>
          <div className="flex flex-row gap-2">
            <Button
              variant="primary"
              onClick={downloadSelectedPhotos}
              disabled={selectedPhotos.size === 0 || isDownloading}
              className="flex items-center font-normal"
            >
              <Download className="mr-2 size-5" />
              {isDownloading
                ? "Preparing Download..."
                : `Download (${selectedPhotos.size})`}
            </Button>

            <Button
              variant="destructive"
              onClick={deleteSelectedPhotos}
              disabled={selectedPhotos.size === 0 || isDeleting}
              className="flex items-center text-md text-mono-100"
            >
              <Trash2 className="mr-2 size-5" />
              {isDeleting ? "Deleting..." : `Delete (${selectedPhotos.size})`}
            </Button>
          </div>
        </div>
      )}

      {/* Deletion mode controls */}
      {/* {viewMode === "deletion" && (
        <div className="bg-red-50 p-4 rounded-lg mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium flex items-center">
              <AlertTriangle className="text-red-500 mr-2 h-4 w-4" />
              {selectedPhotos.size} of {photos.length} selected for deletion
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllPhotos}
              disabled={selectedPhotos.size === photos.length}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAllPhotos}
              disabled={selectedPhotos.size === 0}
            >
              Deselect All
            </Button>
          </div>
          <Button
            variant="destructive"
            onClick={deleteSelectedPhotos}
            disabled={selectedPhotos.size === 0 || isDeleting}
            className="flex items-center"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting
              ? "Deleting..."
              : `Delete ${selectedPhotos.size} Photos`}
          </Button>
        </div>
      )} */}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="rounded-lg overflow-hidden shadow-md cursor-pointer relative group h-full"
                  onClick={() =>
                    openLightbox(photos.findIndex((p) => p.id === photo.id))
                  }
                  onMouseEnter={() => setHoverPhotoId(photo.id)}
                  onMouseLeave={() => setHoverPhotoId(null)}
                >
                  {/* Hover action buttons */}
                  {hoverPhotoId === photo.id && (
                    <div className="absolute inset-0 bg-mono-900/60 bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10">
                      <div className="flex space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-full p-2 bg-mono-600"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent opening lightbox
                            downloadSinglePhoto(photo.id, photo.s3Url);
                          }}
                        >
                          <Download className="h-5 w-5" />
                        </Button>

                        {userRole === "ADMIN" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-full p-2 text-mono-100"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening lightbox
                              deleteSinglePhoto(photo.id);
                            }}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="relative aspect-square ">
                    <Image
                      src={photo.s3Url}
                      alt={photo.description || "Event photo"}
                      fill
                      className="object-cover hover:opacity-90 transition-opacity"
                    />
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
                      {photo.user.avatar ? (
                        <Image
                          src={photo.user.avatar}
                          alt={photo.user.name || "User"}
                          width={24}
                          height={24}
                          className="rounded-full mr-2 border-1 border-secondary-300"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-mono-200 rounded-full mr-2"></div>
                      )}
                      {/* <span className="text-xs text-mono-300">
                        {photo.user.name || "Anonymous"}
                      </span> */}
                      <p
                        className={`${spaceMono.className} text-xs text-mono-400 mt-1`}
                      >
                        {new Date(photo.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selection mode grid */}
          {viewMode === "selection" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => {
                const isSelected = selectedPhotos.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    className={`rounded-lg overflow-hidden shadow-md cursor-pointer relative group h-full ${
                      isSelected ? "ring-2 ring-primary-400" : ""
                    }`}
                    onClick={() => togglePhotoSelection(photo.id)}
                  >
                    {/* Selection indicator */}
                    <div
                      className="absolute top-2 right-2 z-20 bg-white rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePhotoSelection(photo.id);
                      }}
                    >
                      {isSelected ? (
                        <CircleCheck className="h-6 w-6 text-mono-800" />
                      ) : (
                        <Circle className="h-6 w-6 text-mono-400" />
                      )}
                    </div>

                    <div className="relative aspect-square">
                      <Image
                        src={photo.s3Url}
                        alt={photo.description || "Event photo"}
                        fill
                        className={`object-cover transition-opacity ${
                          isSelected ? "opacity-90" : "hover:opacity-75"
                        }`}
                      />

                      {/* Gradient overlay for better text visibility */}
                      <div
                        className="absolute bottom-0 left-0 w-full h-40 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%)",
                        }}
                      ></div>

                      {/* Text content positioned at the bottom */}
                      <div className="absolute bottom-0 left-0 w-full p-3 text-white z-10">
                        {photo.description && (
                          <p className="text-sm font-medium mb-1 line-clamp-2">
                            {photo.description}
                          </p>
                        )}

                        <div className="flex items-center">
                          {photo.user.avatar ? (
                            <Image
                              src={photo.user.avatar}
                              alt={photo.user.name || "User"}
                              width={20}
                              height={20}
                              className="rounded-full mr-2"
                            />
                          ) : (
                            <div className="w-5 h-5 bg-mono-300 rounded-full mr-2"></div>
                          )}
                          <span className="text-xs text-white/90">
                            {photo.user.name || "Anonymous"}
                          </span>
                        </div>

                        <p
                          className={`${spaceMono.className} text-xs text-mono-400 mt-1`}
                        >
                          {new Date(photo.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Deletion mode grid */}
          {/* {viewMode === "deletion" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {photos.map((photo) => {
                const isSelected = selectedPhotos.has(photo.id);
                const canDelete = canDeletePhoto(photo.userId);

                return (
                  <div
                    key={photo.id}
                    className={`bg-white rounded-lg overflow-hidden shadow-md relative ${
                      isSelected ? "ring-2 ring-red-500" : ""
                    } ${
                      canDelete
                        ? "cursor-pointer"
                        : "opacity-60 cursor-not-allowed"
                    }`}
                    onClick={() => {
                      if (canDelete) togglePhotoSelection(photo.id);
                    }}
                  >
                    {!canDelete && (
                      <div className="absolute inset-0 bg-mono-100 bg-opacity-40 z-10 flex items-center justify-center">
                        <div className="bg-white p-2 rounded-md text-xs text-center">
                          {userRole !== "ADMIN"
                            ? "You can only delete your own photos"
                            : "Cannot delete this photo"}
                        </div>
                      </div>
                    )}

                    <div className="absolute top-2 right-2 z-20">
                      {isSelected ? (
                        <CircleCheck className="h-6 w-6 text-red-500 bg-white rounded-full" />
                      ) : (
                        <Circle className="h-6 w-6 text-white" />
                      )}
                    </div>

                    <div className="relative aspect-square">
                      <Image
                        src={photo.s3Url}
                        alt={photo.description || "Event photo"}
                        fill
                        className={`object-cover transition-opacity ${
                          isSelected
                            ? "opacity-70"
                            : canDelete
                            ? "hover:opacity-75"
                            : ""
                        }`}
                      />
                    </div>

                    <div className="p-4">
                      {photo.description && (
                        <p className="text-mono-700 mb-2">
                          {photo.description}
                        </p>
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
                );
              })}
            </div>
          )} */}

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
                        className="object-contain object-center max-h-[85vh] max-w-full"
                        priority
                      />
                      <div
                        className="absolute bottom-0 left-0 w-full h-32 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%)",
                        }}
                      ></div>
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

              {/* Photo info and action buttons in lightbox */}
              <div
                className={`bg-secondary-800/0 ${
                  isFullScreen
                    ? "bg-opacity-25 absolute bottom-0 left-0 w-full"
                    : "bg-opacity-50"
                } p-4 text-white`}
              >
                <div className="flex flex-col items-center justify-between w-full gap-2">
                  <div className="flex items-center w-full justify-center">
                    <div className="flex flex-col gap-4">
                      {photos[currentPhotoIndex].description && (
                        <p className="text-lg opacity-90 text-center">
                          &quot;{photos[currentPhotoIndex].description}&quot;
                        </p>
                      )}
                      <div className="flex flex-row items-center justify-center">
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
                        <span className="text-sm font-semibold">
                          {photos[currentPhotoIndex].user.name || "Anonymous"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* <Button
                      variant="ghost"
                      onClick={() => downloadSinglePhoto(
                        photos[currentPhotoIndex].id,
                        photos[currentPhotoIndex].s3Url
                      )}
                      className="text-white hover:bg-white hover:bg-opacity-20 rounded-full"
                      size="sm"
                    >
                      <Download className="h-5 w-5" />
                    </Button> */}

                    {/* {canDeletePhoto(photos[currentPhotoIndex].userId) && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          closeLightbox();
                          setTimeout(() => {
                            deleteSinglePhoto(photos[currentPhotoIndex].id);
                          }, 300);
                        }}
                        className="text-red-500 hover:bg-red-500 hover:bg-opacity-20 rounded-full"
                        size="sm"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    )} */}

                    <span className="text-xs opacity-75 ml-2">
                      {new Date(
                        photos[currentPhotoIndex].createdAt
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pagination - only show in grid view or selection/deletion mode */}
          {(viewMode === "grid" || viewMode === "selection") &&
            pagination &&
            pagination.pages > 1 && (
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
