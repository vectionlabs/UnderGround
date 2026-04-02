// MEGA COMPRESSION - Aggressive image & video compression utilities

/**
 * Compress an image file aggressively using Canvas API
 * - Resizes to maxDimension
 * - Converts to WebP (or JPEG fallback)
 * - Quality reduction
 * Returns a Blob
 */
export async function compressImage(
  file: File,
  maxDimension = 1200,
  quality = 0.6
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down if needed
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d')!;
      // Smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Try WebP first (much smaller), fallback to JPEG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, width, height });
          } else {
            // Fallback to JPEG
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) resolve({ blob: jpegBlob, width, height });
                else reject(new Error('Compression failed'));
              },
              'image/jpeg',
              quality
            );
          }
        },
        'image/webp',
        quality
      );

      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress an avatar/profile image even more aggressively
 * 256x256 max, quality 0.5
 */
export async function compressAvatar(file: File): Promise<Blob> {
  const { blob } = await compressImage(file, 256, 0.5);
  return blob;
}

/**
 * Compress a video thumbnail
 */
export async function compressVideoThumbnail(
  videoFile: File
): Promise<{ thumbnailBlob: Blob; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const duration = Math.round(video.duration);
      video.currentTime = Math.min(1, duration / 2);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      // Thumbnail max 480px
      let w = video.videoWidth;
      let h = video.videoHeight;
      const maxDim = 480;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          const duration = Math.round(video.duration);
          URL.revokeObjectURL(video.src);
          if (blob) resolve({ thumbnailBlob: blob, duration });
          else reject(new Error('Thumbnail failed'));
        },
        'image/webp',
        0.5
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Video load failed'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Convert a Blob to base64 string (for preview only)
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
