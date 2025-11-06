
import React, { useRef, useState, useCallback } from 'react';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  label?: string;
  description?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, label, description }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);
      onImageUpload(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
     if (file && file.type.startsWith('image/')) {
       if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);
      onImageUpload(file);
    }
  }, [onImageUpload, previewUrl]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };
  
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const uploaderClasses = `group relative w-full aspect-[4/3] sm:aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden ${
    isDragging 
      ? 'border-solid border-teal-500 bg-teal-900/40 scale-105' 
      : 'bg-black/20 border-slate-600 hover:border-teal-500'
  }`;

  return (
    <>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={uploaderClasses}
        aria-label="Image uploader"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Model preview" className="w-full h-full object-contain p-1" />
        ) : (
          <div className="text-center text-slate-400 p-4 flex flex-col items-center justify-center">
            <p className="text-lg font-semibold group-hover:text-slate-300 transition-colors duration-300">{label || "Klik atau seret & lepas"}</p>
            <p className="text-sm text-slate-500">{description || "file gambar"}</p>
          </div>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </>
  );
};
