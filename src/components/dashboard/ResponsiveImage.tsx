/**
 * RESPONSIVE IMAGE COMPONENT
 * =========================
 * Optimized image loading with lazy loading, WebP format, and responsive sizing
 * 
 * Benefits:
 * - 60-80% smaller image sizes with WebP format
 * - Lazy loading reduces initial page weight
 * - Responsive sizes based on viewport
 * - Automatic fallbacks for older browsers
 */

import React, { imgHTMLAttributes, useState } from 'react';

export interface ResponsiveImageProps extends Omit<imgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  srcWebp?: string;
  sizes?: string;
  alt: string;
  loading?: 'lazy' | 'eager';
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

/**
 * Responsive Image Component
 * 
 * Usage:
 * ```tsx
 * <ResponsiveImage
 *   src="image.jpg"
 *   srcWebp="image.webp"
 *   alt="Description"
 *   sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
 *   loading="lazy"
 * />
 * ```
 */
export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  srcWebp,
  alt,
  loading = 'lazy',
  className = '',
  onLoad,
  onError,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    onError?.(e);
  };

  if (hasError) {
    return (
      <div className={`bg-slate-700 flex items-center justify-center ${className}`}>
        <span className="text-xs text-slate-400">Image failed to load</span>
      </div>
    );
  }

  return (
    <picture>
      {/* WebP format for modern browsers (60-80% smaller) */}
      {srcWebp && <source srcSet={srcWebp} type="image/webp" />}

      {/* JPEG/PNG fallback */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </picture>
  );
};

// ============================================================
// IMAGE OPTIMIZATION UTILITIES
// ============================================================

/**
 * Generate optimized image sizes
 * 
 * Usage:
 * ```tsx
 * const imageSizes = generateImageSizes({
 *   mobile: 100,    // 100vw on mobile
 *   tablet: 50,     // 50vw on tablet
 *   desktop: 33,    // 33vw on desktop
 * });
 * ```
 */
export function generateImageSizes(breakpoints: {
  mobile?: number;
  tablet?: number;
  desktop?: number;
}): string {
  const parts = [];

  if (breakpoints.mobile !== undefined) {
    parts.push(`(max-width: 640px) ${breakpoints.mobile}vw`);
  }
  if (breakpoints.tablet !== undefined) {
    parts.push(`(max-width: 1280px) ${breakpoints.tablet}vw`);
  }
  if (breakpoints.desktop !== undefined) {
    parts.push(`${breakpoints.desktop}vw`);
  }

  return parts.join(', ');
}

/**
 * Generate responsive srcset
 * 
 * Usage:
 * ```tsx
 * const srcset = generateResponsiveSrcset({
 *   base: 'image.jpg',
 *   sizes: [320, 640, 1024, 1280],
 * });
 * // Returns: "image-320.jpg 320w, image-640.jpg 640w, ..."
 * ```
 */
export function generateResponsiveSrcset(options: {
  base: string;
  sizes: number[];
  ext?: string;
}): string {
  const { base, sizes, ext = 'jpg' } = options;
  const baseName = base.replace(/\.[^/.]+$/, '');

  return sizes
    .map(size => `${baseName}-${size}w.${ext} ${size}w`)
    .join(', ');
}

// ============================================================
// IMAGE LAZY LOADING OBSERVER
// ============================================================

/**
 * Native lazy loading fallback for older browsers
 */
export function setupImageLazyLoading(): void {
  if (!('IntersectionObserver' in window)) {
    console.warn('IntersectionObserver not supported');
    return;
  }

  const images = document.querySelectorAll('img[data-lazy]');
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src || '';
        img.removeAttribute('data-lazy');
        imageObserver.unobserve(img);
      }
    });
  });

  images.forEach(img => imageObserver.observe(img));
}

// ============================================================
// IMAGE COMPRESSION GUIDELINES
// ============================================================

/**
 * Recommended image sizes and formats
 *
 * Format recommendations:
 * - Photos: WebP (modern), JPEG (fallback)
 * - Graphics/Icons: SVG or WebP
 * - Animated: WebP with loop, or MP4
 *
 * Size recommendations:
 * - Mobile (320px): 320px width
 * - Tablet (768px): 768px width
 * - Desktop (1024px): 1024px width
 * - 2x Retina: 2048px width
 *
 * Quality recommendations:
 * - WebP: 75 quality
 * - JPEG: 80 quality
 * - File target: < 100KB for thumbnails, < 300KB for hero
 *
 * Expected size reduction:
 * - JPEG → WebP: 30-40% smaller
 * - Optimized JPEG: 20-30% smaller
 * - Modern compression: 50-70% total reduction
 */

export const IMAGE_OPTIMIZATION_TIPS = {
  formats: {
    webp: 'Best compression, modern browsers',
    jpeg: 'Good fallback, wide support',
    svg: 'Best for icons and graphics',
  },
  tools: {
    squoosh: 'https://squoosh.app/',
    tinyimg: 'https://tinypng.com/',
    imagemagick: 'Command line: convert image.jpg -quality 80 image-opt.jpg',
  },
  benchmarks: {
    mobileTarget: '< 100KB for critical images',
    tabletTarget: '< 200KB',
    desktopTarget: '< 400KB',
    totalSavings: '50-70% with WebP + optimization',
  }
} as const;

export default ResponsiveImage;
