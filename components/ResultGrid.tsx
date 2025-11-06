
import React from 'react';
import type { GeneratedImage } from '../types';

interface ResultGridProps {
  images: GeneratedImage[];
  onImageSelect: (image: GeneratedImage) => void;
  onDownload: (src: string, filename: string) => void;
  gridClass?: string;
}

interface ImageCardProps {
  image: GeneratedImage;
  index: number;
  onImageSelect: (image: GeneratedImage) => void;
  onDownload: (src: string, filename: string) => void;
}

export const LoadingCard: React.FC<{ label: string }> = ({ label }) => (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-full aspect-square bg-slate-200 dark:bg-slate-700/50 rounded-lg overflow-hidden shimmer-overlay">
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium transition-colors">{label}</p>
    </div>
);


export const ErrorCard: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center gap-2">
    <div className="w-full aspect-square bg-red-100 dark:bg-red-900/50 rounded-lg flex flex-col items-center justify-center text-red-500 dark:text-red-400 p-2">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
      <span className="text-xs text-center mt-1">Gagal</span>
    </div>
    <p className="text-sm text-slate-600 dark:text-slate-300">{label}</p>
  </div>
);

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
);

export const ImageCard: React.FC<ImageCardProps> = ({ image, index, onImageSelect, onDownload }) => {
  const animationDelay = (image.loading ? 0 : index * 70);

  if (image.loading) {
    return <LoadingCard label={image.label} />;
  }

  if (image.src === 'error') {
    return (
      <div className="fade-in-blur" style={{ animationDelay: `${animationDelay}ms` }}>
        <ErrorCard label={image.label} />
      </div>
    );
  }
  
  const filename = `${image.label.toLowerCase().replace(/\s+/g, '-')}.png`;

  return (
    <div className="flex flex-col items-center gap-2 fade-in-blur" style={{ animationDelay: `${animationDelay}ms` }}>
      <div className="group relative w-full aspect-square bg-slate-800 rounded-lg overflow-hidden cursor-pointer" onClick={() => onImageSelect(image)}>
        <img src={image.src!} alt={image.label} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span className="text-white text-lg font-bold">Lihat</span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDownload(image.src!, filename);
          }}
          className="absolute top-2 right-2 p-2 rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all duration-300"
          aria-label="Download image"
        >
          <DownloadIcon />
        </button>
      </div>
      <p className="text-sm text-slate-300 font-medium">{image.label}</p>
    </div>
  );
};

export const ResultGrid: React.FC<ResultGridProps> = ({ images, onImageSelect, onDownload, gridClass }) => {
  if (!images || images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500 dark:text-slate-400 bg-slate-500/10 dark:bg-black/20 rounded-lg transition-colors p-4">
        <p className="text-lg">Gambar yang dihasilkan akan muncul di sini</p>
      </div>
    );
  }

  return (
    <div className={gridClass || "grid grid-cols-2 sm:grid-cols-3 gap-4"}>
      {images.map((image, index) => (
        <ImageCard key={index} image={image} index={index} onImageSelect={onImageSelect} onDownload={onDownload} />
      ))}
    </div>
  );
};
