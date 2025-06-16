"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

// No longer need the PaginationData interface for infinite scroll

type ViewMode = "grid" | "slideshow" | "selection";
type SlideTransition = "none" | "incoming" | "active" | "outgoing";

export default function GalleryPage() {
  const { isSignedIn, user } = useUser();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Infinite scroll observer
  const loadingRef = useRef<HTMLDivElement>(null);
  const lastPhotoRef = useRef<HTMLDivElement>(null); // Reference to the last photo element

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

  // Fetch more photos when page changes - NOT USED NOW (replaced by direct fetch in loadMorePhotos)
  // Only keeping this function for compatibility with other parts of the code
  const fetchGallery = useCallback(async (pageNum: number, append = false) => {
    console.log(
      `⚠️ Legacy fetchGallery called but not used: page=${pageNum}, append=${append}`
    );
    // This function is no longer used directly
  }, []);

  // Initial fetch when component mounts
  useEffect(() => {
    console.log("⭐ Initial fetch triggered");
    // Force initial load with a fresh state
    setIsLoading(true);
    setHasMore(true);
    setPage(1);

    const initialFetch = async () => {
      try {
        console.log("🔄 Performing initial fetch for page 1");
        const response = await fetch(`/api/gallery?page=1&limit=12`);

        if (!response.ok) {
          throw new Error("Failed to fetch gallery");
        }

        const data = await response.json();
        console.log(
          `✅ Initial fetch received ${data.photos?.length || 0} photos`
        );

        if (!data.photos || data.photos.length === 0) {
          console.log("❌ No photos returned in initial fetch");
          setHasMore(false);
        } else {
          setPhotos(data.photos);

          // Check if we have more pages
          const hasMorePages =
            data.photos.length === 12 &&
            (!data.pagination || data.pagination.pages > 1);

          setHasMore(hasMorePages);
          console.log(`📊 Initial fetch - hasMore set to ${hasMorePages}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";
        setError(errorMessage);
        console.error("❌ Error in initial fetch:", errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initialFetch();
  }, []);

  // Function to load more photos (for infinite scroll)
  const loadMorePhotos = useCallback(() => {
    if (isLoading || !hasMore) {
      console.log(
        `⏸️ Load more prevented: isLoading=${isLoading}, hasMore=${hasMore}`
      );
      return;
    }

    const nextPage = page + 1;
    console.log(`🔄 Loading more photos - page ${nextPage}`);

    setIsLoading(true);

    // Fetch next page
    const fetchMorePhotos = async () => {
      try {
        const response = await fetch(`/api/gallery?page=${nextPage}&limit=12`);

        if (!response.ok) {
          throw new Error("Failed to fetch more photos");
        }

        const data = await response.json();
        console.log(
          `✅ Page ${nextPage} received ${data.photos?.length || 0} photos`
        );

        if (!data.photos || data.photos.length === 0) {
          console.log("🏁 No more photos available");
          setHasMore(false);
          return;
        }

        // Add new photos to existing ones (avoiding duplicates)
        setPhotos((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPhotos = data.photos.filter(
            (photo: Photo) => !existingIds.has(photo.id)
          );
          console.log(
            `➕ Adding ${newPhotos.length} new photos to existing ${prev.length}`
          );
          return [...prev, ...newPhotos];
        });

        // Update page number
        setPage(nextPage);

        // Check if we've reached the end
        const reachedEnd =
          data.photos.length < 12 ||
          (data.pagination && nextPage >= data.pagination.pages);

        if (reachedEnd) {
          console.log("🏁 Reached the end of available photos");
          setHasMore(false);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";
        setError(errorMessage);
        console.error(`❌ Error loading more photos:`, errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMorePhotos();
  }, [isLoading, hasMore, page]);

  // Set up scroll event listener for infinite scrolling - with debounce
  useEffect(() => {
    // Simple throttle implementation
    let isThrottled = false;

    const handleScroll = () => {
      if (isThrottled) return;

      // Check if we're near the bottom of the page
      const scrollPosition = window.innerHeight + window.scrollY;
      const documentHeight = document.body.offsetHeight;
      const scrollThreshold = documentHeight - 500;

      if (scrollPosition >= scrollThreshold && !isLoading && hasMore) {
        console.log(
          `📜 Scroll triggered at ${Math.round(
            scrollPosition
          )}px / ${documentHeight}px`
        );

        // Throttle to prevent multiple triggers
        isThrottled = true;
        loadMorePhotos();

        // Reset throttle after 1s
        setTimeout(() => {
          isThrottled = false;
        }, 1000);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLoading, hasMore, loadMorePhotos]);

  // Basic intersection observer for loading indicator
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading && hasMore) {
          console.log("👁️ Loading indicator visible, triggering load");
          loadMorePhotos();
        }
      },
      { rootMargin: "100px 0px" }
    );

    const currentLoadingRef = loadingRef.current;
    if (currentLoadingRef) {
      observer.observe(currentLoadingRef);
    }

    return () => {
      if (currentLoadingRef) {
        observer.unobserve(currentLoadingRef);
      }
    };
  }, [isLoading, hasMore, loadMorePhotos]);

  // Also observe the last photo element, but with throttling
  useEffect(() => {
    // Don't set up this observer until we have photos
    if (photos.length === 0) return;

    let isThrottled = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          !isLoading &&
          hasMore &&
          !isThrottled
        ) {
          console.log("🖼️ Last photo is visible, loading more");
          isThrottled = true;
          loadMorePhotos();

          // Reset throttle after 1 second
          setTimeout(() => {
            isThrottled = false;
          }, 1000);
        }
      },
      { threshold: 0.1 }
    );

    const currentLastPhotoRef = lastPhotoRef.current;
    if (currentLastPhotoRef) {
      observer.observe(currentLastPhotoRef);
    }

    return () => {
      if (currentLastPhotoRef) {
        observer.unobserve(currentLastPhotoRef);
      }
    };
  }, [isLoading, hasMore, loadMorePhotos, photos.length]);

  // Fetch more photos when page changes
  useEffect(() => {
    if (page > 1) {
      fetchGallery(page, true);
    }
  }, [page, fetchGallery]);

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

  const openLightbox = (index: number) => {
    if (viewMode === "selection") return; // Don't open lightbox in selection mode

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
    if (photos.length === 0) {
      console.log("No photos to select");
      return;
    }

    console.log("Select All button clicked, photos count:", photos.length);

    // In selection mode
    if (viewMode === "selection") {
      // Create a new Set with all photo IDs
      const allPhotoIds = photos.map((photo) => photo.id);
      console.log("Setting selected photos:", allPhotoIds);

      // Explicitly create a new Set instance to ensure state update
      setSelectedPhotos(new Set(allPhotoIds));

      // Add a toast notification for user feedback
      toast({
        title: "All photos selected",
        description: `Selected ${allPhotoIds.length} photos`,
      });

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

      // Listen for events
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "new-photo") {
          // Fetch the latest photos - reset to first page when new photos arrive
          fetchGallery(1, false);
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
  }, [fetchGallery]);

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
          <p className="text-lg text-mono-200 mb-4">No photos have been uploaded yet.</p>
          {isSignedIn ? (
            <Link href="/upload" className="text-xl text-primary-500 hover:underline">
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
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  // Add ref to the last photo element
                  ref={index === photos.length - 1 ? lastPhotoRef : null}
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
                  <div className="relative max-w-full max-h-full ">
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

          {/* Load More button as fallback */}
          {hasMore && (
            <>
              <div
                ref={loadingRef}
                className="flex justify-center items-center p-4 mt-4"
              >
                {isLoading && (
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-secondary-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-2 text-mono-400">Loading more photos...</p>
                  </div>
                )}
              </div>

              {!isLoading && hasMore && (
                <div className="flex justify-center mt-4 mb-8">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      console.log("🖱️ Load more button clicked");
                      loadMorePhotos();
                    }}
                    className="px-6 py-2"
                  >
                    Load More Photos
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Reached end message */}
          {!hasMore && photos.length > 12 && (
            <div className="text-center py-8 text-mono-400">
              You have reached the end of the gallery
            </div>
          )}
        </>
      )}
    </div>
  );
}
