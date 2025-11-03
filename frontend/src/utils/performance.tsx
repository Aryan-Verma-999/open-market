import React, { lazy } from 'react';

/**
 * Lazy load components with better error handling
 */
export function lazyLoad<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = lazy(importFunc);
  
  return (props: React.ComponentProps<T>) => (
    <React.Suspense fallback={fallback ? React.createElement(fallback) : <div>Loading...</div>}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for scroll events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) {
  const [observer, setObserver] = React.useState<IntersectionObserver | null>(null);

  React.useEffect(() => {
    const obs = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });
    setObserver(obs);

    return () => obs.disconnect();
  }, [callback, options]);

  return observer;
}

/**
 * Image lazy loading with placeholder
 */
export function LazyImage({ 
  src, 
  alt, 
  className, 
  placeholder 
}: { 
  src: string; 
  alt: string; 
  className?: string; 
  placeholder?: string;
}) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const observer = useIntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      });
    },
    { threshold: 0.1 }
  );

  React.useEffect(() => {
    if (imgRef.current && observer) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current && observer) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [observer]);

  return (
    <div className={`relative ${className}`} ref={imgRef}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          {placeholder || <div className="text-gray-400">Loading...</div>}
        </div>
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
      )}
    </div>
  );
}

/**
 * Virtual scrolling for large lists
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    setScrollTop
  };
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();

  static mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  static measure(name: string, startMark: string): number {
    const startTime = this.marks.get(startMark);
    if (!startTime) {
      console.warn(`Start mark "${startMark}" not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    console.log(`${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  static measureComponent(componentName: string) {
    return function<T extends React.ComponentType<any>>(Component: T): T {
      const MeasuredComponent = (props: React.ComponentProps<T>) => {
        React.useEffect(() => {
          PerformanceMonitor.mark(`${componentName}-start`);
          return () => {
            PerformanceMonitor.measure(`${componentName} render`, `${componentName}-start`);
          };
        }, []);

        return React.createElement(Component, props);
      };

      MeasuredComponent.displayName = `Measured(${componentName})`;
      return MeasuredComponent as T;
    };
  }
}

/**
 * Memory usage monitoring
 */
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = React.useState<any>(null);

  React.useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        setMemoryInfo((performance as any).memory);
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

/**
 * Bundle size analyzer (development only)
 */
export function analyzeBundleSize() {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle analyzer not available in this build');
  }
}

/**
 * Web Vitals monitoring
 */
export function reportWebVitals(onPerfEntry?: (metric: any) => void) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    console.log('Web Vitals monitoring not available in this build');
  }
}