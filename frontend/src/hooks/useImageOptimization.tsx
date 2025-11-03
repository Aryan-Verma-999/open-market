import { useState, useEffect } from 'react';

interface ImageOptimizationOptions {
  enableWebP?: boolean;
  enableLazyLoading?: boolean;
  quality?: number;
  sizes?: string;
}

interface OptimizedImage {
  src: string;
  webpSrc?: string;
  placeholder: string;
  isLoaded: boolean;
  error: string | null;
}

/**
 * Hook for optimized image loading with WebP support and lazy loading
 */
export function useImageOptimization(
  originalSrc: string,
  options: ImageOptimizationOptions = {}
): OptimizedImage {
  const {
    enableWebP = true,
    enableLazyLoading = true,
    quality = 85,
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
  } = options;

  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimizedSrc, setOptimizedSrc] = useState(originalSrc);
  const [webpSrc, setWebpSrc] = useState<string | undefined>();

  // Generate placeholder (low quality, small size)
  const placeholder = generatePlaceholder(originalSrc);

  useEffect(() => {
    if (!originalSrc) return;

    // Generate optimized URLs
    const optimized = generateOptimizedUrl(originalSrc, { quality });
    setOptimizedSrc(optimized);

    if (enableWebP && supportsWebP()) {
      const webp = generateWebPUrl(originalSrc, { quality });
      setWebpSrc(webp);
    }

    // Preload the image
    if (!enableLazyLoading) {
      preloadImage(webpSrc || optimized)
        .then(() => setIsLoaded(true))
        .catch((err) => setError(err.message));
    }
  }, [originalSrc, enableWebP, enableLazyLoading, quality]);

  return {
    src: optimizedSrc,
    webpSrc,
    placeholder,
    isLoaded,
    error
  };
}

/**
 * Generate optimized image URL with query parameters
 */
function generateOptimizedUrl(src: string, options: { quality?: number; width?: number; height?: number }): string {
  if (!src.startsWith('http')) return src;

  const url = new URL(src);
  const { quality, width, height } = options;

  if (quality) url.searchParams.set('q', quality.toString());
  if (width) url.searchParams.set('w', width.toString());
  if (height) url.searchParams.set('h', height.toString());
  url.searchParams.set('f', 'auto'); // Auto format selection

  return url.toString();
}

/**
 * Generate WebP version URL
 */
function generateWebPUrl(src: string, options: { quality?: number }): string {
  if (!src.startsWith('http')) return src;

  const url = new URL(src);
  url.searchParams.set('f', 'webp');
  if (options.quality) {
    url.searchParams.set('q', options.quality.toString());
  }

  return url.toString();
}

/**
 * Generate placeholder image (base64 encoded low quality)
 */
function generatePlaceholder(src: string): string {
  // For now, return a simple gray placeholder
  // In a real implementation, you might generate a blurred thumbnail
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNiAxNkwyNCAyNE0yNCAxNkwxNiAyNCIgc3Ryb2tlPSIjOUI5QkEwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K';
}

/**
 * Check if browser supports WebP
 */
function supportsWebP(): boolean {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Preload image and return promise
 */
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Hook for responsive image sizes
 */
export function useResponsiveImage(
  src: string,
  breakpoints: { [key: string]: { width: number; height?: number } }
) {
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    const updateImageSrc = () => {
      const width = window.innerWidth;
      let selectedBreakpoint = 'default';

      // Find the appropriate breakpoint
      for (const [name, config] of Object.entries(breakpoints)) {
        if (width <= config.width) {
          selectedBreakpoint = name;
          break;
        }
      }

      const config = breakpoints[selectedBreakpoint];
      if (config) {
        const optimizedSrc = generateOptimizedUrl(src, {
          width: config.width,
          height: config.height,
          quality: 85
        });
        setCurrentSrc(optimizedSrc);
      }
    };

    updateImageSrc();
    window.addEventListener('resize', updateImageSrc);

    return () => window.removeEventListener('resize', updateImageSrc);
  }, [src, breakpoints]);

  return currentSrc;
}

/**
 * Image component with built-in optimization
 */
interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: number;
  enableWebP?: boolean;
  enableLazyLoading?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  quality = 85,
  enableWebP = true,
  enableLazyLoading = true,
  onLoad,
  onError
}: OptimizedImageProps) {
  const { src: optimizedSrc, webpSrc, placeholder, isLoaded, error } = useImageOptimization(src, {
    enableWebP,
    enableLazyLoading,
    quality
  });

  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleLoad = () => {
    setImageLoaded(true);
    if (onLoad) onLoad();
  };

  if (error) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Placeholder */}
      {!imageLoaded && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm"
        />
      )}

      {/* Main image with WebP support */}
      <picture>
        {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
        <img
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading={enableLazyLoading ? 'lazy' : 'eager'}
          onLoad={handleLoad}
        />
      </picture>
    </div>
  );
}