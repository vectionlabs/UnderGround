import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, PlayIcon, CloseIcon, PlusIcon } from './Icons';
import { compressImage, compressVideoThumbnail, blobToBase64, formatBytes } from '../utils/compress';

type MediaType = 'image' | 'video' | 'document';

type MediaFile = {
  type: MediaType;
  dataBase64: string;
  thumbnailBase64?: string;
  fileName?: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
};

type MediaUploaderProps = {
  onMediaSelect: (media: MediaFile | null) => void;
  currentMedia?: MediaFile | null;
  allowedTypes?: MediaType[];
  maxSizeMB?: number;
};

const FILE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/vnd.ms-powerpoint': '📽️',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📽️',
  'text/plain': '📃',
  'application/zip': '📦',
  'application/x-rar-compressed': '📦',
};

export default function MediaUploader({
  onMediaSelect,
  currentMedia,
  allowedTypes = ['image', 'video', 'document'],
  maxSizeMB = 50,
}: MediaUploaderProps) {
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<MediaFile | null>(currentMedia || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const getAcceptTypes = () => {
    const types: string[] = [];
    if (allowedTypes.includes('image')) {
      types.push('image/jpeg', 'image/png', 'image/gif', 'image/webp');
    }
    if (allowedTypes.includes('video')) {
      types.push('video/mp4', 'video/webm', 'video/quicktime');
    }
    if (allowedTypes.includes('document')) {
      types.push(
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip'
      );
    }
    return types.join(',');
  };

  const getMediaType = (mimeType: string): MediaType => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'document';
  };

  const generateVideoThumbnail = (videoFile: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        video.currentTime = 1;
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        resolve('');
      };

      video.src = URL.createObjectURL(videoFile);
    });
  };

  const getVideoDuration = (videoFile: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        resolve(Math.round(video.duration));
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(videoFile);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File troppo grande (max ${maxSizeMB}MB)`);
      setUploading(false);
      return;
    }

    const mediaType = getMediaType(file.type);

    try {
      let dataBase64: string;
      let thumbnailBase64: string | undefined;
      let duration: number | undefined;
      let finalSize: number;

      if (mediaType === 'image') {
        // MEGA COMPRESSION for images
        const originalSize = file.size;
        const { blob } = await compressImage(file, 1200, 0.6);
        dataBase64 = await blobToBase64(blob);
        finalSize = blob.size;
        console.log(`🗜️ Image: ${formatBytes(originalSize)} → ${formatBytes(finalSize)} (${Math.round((1 - finalSize / originalSize) * 100)}% smaller)`);
      } else if (mediaType === 'video') {
        // Video: read as base64, compress thumbnail
        const { thumbnailBlob, duration: dur } = await compressVideoThumbnail(file);
        thumbnailBase64 = await blobToBase64(thumbnailBlob);
        duration = dur;
        // Read video file as base64
        dataBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        finalSize = file.size;
        console.log(`🎬 Video: ${formatBytes(file.size)}, thumbnail compressed, duration: ${duration}s`);
      } else {
        // Documents: read as-is
        dataBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        finalSize = file.size;
      }

      const media: MediaFile = {
        type: mediaType,
        dataBase64,
        thumbnailBase64,
        fileName: file.name,
        fileSize: finalSize,
        mimeType: file.type,
        duration,
      };

      setPreview(media);
      onMediaSelect(media);
      setUploading(false);
    } catch (err) {
      console.error('Compression error:', err);
      setError('Errore elaborazione file');
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onMediaSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptTypes()}
        onChange={handleFileChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-xl border border-white/10 bg-slate-800/50 overflow-hidden"
          >
            {preview.type === 'image' && (
              <img
                src={preview.dataBase64}
                alt="Preview"
                className="w-full max-h-64 object-contain"
              />
            )}

            {preview.type === 'video' && (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={preview.dataBase64}
                  className="w-full max-h-64 object-contain"
                  controls
                  preload="metadata"
                />
                {preview.duration && (
                  <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs">
                    {formatDuration(preview.duration)}
                  </span>
                )}
              </div>
            )}

            {preview.type === 'document' && (
              <div className="flex items-center gap-4 p-4">
                <span className="text-4xl">
                  {FILE_ICONS[preview.mimeType] || '📎'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{preview.fileName}</p>
                  <p className="text-sm text-slate-400">
                    {formatFileSize(preview.fileSize)}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white transition hover:bg-red-500"
            >
              <CloseIcon size={16} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2"
          >
            {allowedTypes.includes('image') && (
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'image/*';
                    fileInputRef.current.click();
                  }
                }}
                disabled={uploading}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800/50 px-4 py-2 transition hover:bg-slate-700/50 disabled:opacity-50"
              >
                <ImageIcon size={18} />
                <span className="text-sm">Immagine</span>
              </button>
            )}

            {allowedTypes.includes('video') && (
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'video/*';
                    fileInputRef.current.click();
                  }
                }}
                disabled={uploading}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800/50 px-4 py-2 transition hover:bg-slate-700/50 disabled:opacity-50"
              >
                <PlayIcon size={18} />
                <span className="text-sm">Video</span>
              </button>
            )}

            {allowedTypes.includes('document') && (
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = Object.keys(FILE_ICONS).join(',');
                    fileInputRef.current.click();
                  }
                }}
                disabled={uploading}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800/50 px-4 py-2 transition hover:bg-slate-700/50 disabled:opacity-50"
              >
                <PlusIcon size={18} />
                <span className="text-sm">Documento</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {uploading && (
        <p className="text-sm text-pink-400 animate-pulse">Caricamento...</p>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

export function DocumentIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export function VideoIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
    </svg>
  );
}
