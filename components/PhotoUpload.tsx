'use client';

import { useState, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import { X, Upload, Image as ImageIcon } from 'lucide-react';

interface PhotoUploadProps {
  onPhotosChange: (files: File[]) => void;
  maxPhotos?: number;
}

const PhotoUpload = ({ onPhotosChange, maxPhotos = 10 }: PhotoUploadProps) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Check if adding new files would exceed the max limit
    if (photos.length + selectedFiles.length > maxPhotos) {
      alert(`You can only upload a maximum of ${maxPhotos} photos.`);
      return;
    }

    // Create preview URLs
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    
    // Update state
    const updatedPhotos = [...photos, ...selectedFiles];
    setPhotos(updatedPhotos);
    setPreviews([...previews, ...newPreviews]);
    
    // Send updated files to parent component
    onPhotosChange(updatedPhotos);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    // Create new arrays without the removed item
    const updatedPhotos = photos.filter((_, i) => i !== index);
    
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(previews[index]);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    
    // Update state
    setPhotos(updatedPhotos);
    setPreviews(updatedPreviews);
    
    // Send updated files to parent component
    onPhotosChange(updatedPhotos);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Upload Photos</h3>
        <span className="text-sm text-mono-500">
          {photos.length} / {maxPhotos} photos
        </span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Preview images */}
        {previews.map((previewUrl, index) => (
          <div 
            key={index} 
            className="relative aspect-square rounded-md border overflow-hidden group"
          >
            <Image
              src={previewUrl}
              alt={`Preview ${index + 1}`}
              fill
              className="object-cover"
            />
            <button
              onClick={() => removePhoto(index)}
              className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove photo"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ))}
        
        {/* Upload button - only show if under the limit */}
        {photos.length < maxPhotos && (
          <button
            onClick={triggerFileInput}
            className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-mono-300 rounded-md hover:border-mono-400 transition-colors p-4"
          >
            <Upload className="w-8 h-8 text-mono-400 mb-2" />
            <span className="text-sm text-mono-500">Upload</span>
          </button>
        )}
      </div>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*"
        className="hidden"
      />
      
      {/* Instructions */}
      <div className="flex items-center gap-2 text-sm text-mono-500">
        <ImageIcon className="w-4 h-4" />
        <p>Click on the upload button to add photos (max {maxPhotos})</p>
      </div>
    </div>
  );
};

export default PhotoUpload;