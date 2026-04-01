import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CameraIcon, CloseIcon, ImageIcon, CheckIcon } from './Icons';

type ImageUploaderProps = {
  onImageSelect: (base64: string | null) => void;
  currentImage?: string | null;
  className?: string;
  variant?: 'button' | 'avatar' | 'banner' | 'icon';
};

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default function ImageUploader({ 
  onImageSelect, 
  currentImage, 
  className = '', 
  variant = 'button' 
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPositioner, setShowPositioner] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [position, setPosition] = useState({ y: 50 });
  const inputRef = useRef<HTMLInputElement>(null);

  const compressImage = useCallback((file: File, cropY?: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          
          // Max dimensions based on variant
          const maxDim = variant === 'avatar' ? 200 : variant === 'icon' ? 100 : variant === 'banner' ? 1200 : 800;
          
          if (variant === 'banner' && cropY !== undefined) {
            // For banner, crop to 3:1 aspect ratio with position
            const targetHeight = width / 3;
            const maxY = Math.max(0, height - targetHeight);
            const startY = (maxY * cropY) / 100;
            
            canvas.width = Math.min(width, 1200);
            canvas.height = canvas.width / 3;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas not supported'));
              return;
            }
            
            ctx.drawImage(img, 0, startY, width, targetHeight, 0, 0, canvas.width, canvas.height);
          } else {
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = (height / width) * maxDim;
                width = maxDim;
              } else {
                width = (width / height) * maxDim;
                height = maxDim;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas not supported'));
              return;
            }
            
            ctx.drawImage(img, 0, 0, width, height);
          }
          
          const base64 = canvas.toDataURL('image/jpeg', 0.85);
          resolve(base64);
        };
        img.onerror = () => reject(new Error('Errore caricamento immagine'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Errore lettura file'));
      reader.readAsDataURL(file);
    });
  }, [variant]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Tipo file non supportato. Usa JPG, PNG, GIF o WebP.');
      return;
    }

    if (file.size > MAX_SIZE) {
      setError('File troppo grande. Max 5MB.');
      return;
    }

    setLoading(true);
    try {
      if (variant === 'banner') {
        // Show positioner for banner
        const reader = new FileReader();
        reader.onload = (ev) => {
          setTempImage(ev.target?.result as string);
          setShowPositioner(true);
          setPosition({ y: 50 });
          setLoading(false);
        };
        reader.readAsDataURL(file);
      } else {
        const base64 = await compressImage(file);
        setPreview(base64);
        onImageSelect(base64);
        setLoading(false);
      }
    } catch (err) {
      setError('Errore durante la compressione');
      setLoading(false);
    }
  };

  const handleConfirmPosition = async () => {
    if (!tempImage) return;
    setLoading(true);
    try {
      // Create a file-like object from base64
      const response = await fetch(tempImage);
      const blob = await response.blob();
      const file = new File([blob], 'banner.jpg', { type: 'image/jpeg' });
      const base64 = await compressImage(file, position.y);
      setPreview(base64);
      onImageSelect(base64);
      setShowPositioner(false);
      setTempImage(null);
    } catch (err) {
      setError('Errore durante il ritaglio');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPosition = () => {
    setShowPositioner(false);
    setTempImage(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = () => {
    setPreview(null);
    onImageSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  if (variant === 'avatar') {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          type="button"
          onClick={handleClick}
          className="relative h-24 w-24 overflow-hidden rounded-full bg-slate-700 ring-2 ring-white/20 transition hover:ring-pink-400"
        >
          {preview ? (
            <img src={preview} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <CameraIcon size={32} className="text-slate-400" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
            <CameraIcon size={24} className="text-white" />
          </div>
        </button>
        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white shadow-lg"
          >
            <CloseIcon size={14} />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  if (variant === 'banner') {
    // Banner position modal
    if (showPositioner && tempImage) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 p-6">
            <h3 className="mb-4 text-center text-lg font-bold">Posiziona il banner</h3>
            <p className="mb-4 text-center text-sm text-slate-400">Trascina per scegliere la porzione visibile</p>
            
            <div className="relative mb-4 h-32 overflow-hidden rounded-xl bg-slate-800">
              <img
                src={tempImage}
                alt="Banner preview"
                className="absolute w-full object-cover"
                style={{
                  top: `${-position.y}%`,
                  transform: 'translateY(0)',
                }}
                draggable={false}
              />
            </div>
            
            <div className="mb-6">
              <label className="mb-2 block text-sm text-slate-400">Posizione verticale</label>
              <input
                type="range"
                min="0"
                max="100"
                value={position.y}
                onChange={(e) => setPosition({ y: parseInt(e.target.value) })}
                className="w-full accent-pink-500"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelPosition}
                className="rounded-lg bg-white/10 px-4 py-2 transition hover:bg-white/20"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmPosition}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-pink-500 px-4 py-2 transition hover:bg-pink-600 disabled:opacity-50"
              >
                <CheckIcon size={16} />
                {loading ? 'Elaborazione...' : 'Conferma'}
              </button>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm backdrop-blur-sm transition hover:bg-white/30"
        >
          <ImageIcon size={18} />
          <span>{preview ? 'Cambia banner' : 'Aggiungi banner'}</span>
        </button>
        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            className="ml-2 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/30"
          >
            Rimuovi
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  // Icon variant (small square for channels)
  if (variant === 'icon') {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          type="button"
          onClick={handleClick}
          className="relative h-12 w-12 overflow-hidden rounded-xl bg-slate-700 ring-2 ring-white/20 transition hover:ring-pink-400"
        >
          {preview ? (
            <img src={preview} alt="Icon" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">
              📢
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
            <CameraIcon size={16} className="text-white" />
          </div>
        </button>
        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white shadow-lg"
          >
            <CloseIcon size={12} />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  // Default button variant
  return (
    <div className={className}>
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="max-h-48 w-full rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-red-500"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20 disabled:opacity-50"
        >
          {loading ? (
            <span className="animate-pulse">Caricamento...</span>
          ) : (
            <>
              <ImageIcon size={18} />
              <span>Aggiungi immagine</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
