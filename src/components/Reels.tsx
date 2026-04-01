import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon, CloseIcon, PlayIcon, PlusIcon, ShortsIcon, VideoIcon } from './Icons';
import MediaUploader from './MediaUploader';
import type { Reel } from '../hooks/useApi';

type MediaFile = {
  type: 'image' | 'video' | 'document';
  dataBase64: string;
  thumbnailBase64?: string;
  fileName?: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
};

type ReelsProps = {
  reels: Reel[];
  currentUserId: string;
  onLike: (reelId: string) => void;
  onCreate: (title: string, media: MediaFile) => Promise<void>;
};

export default function Reels({ reels, currentUserId, onLike, onCreate }: ReelsProps) {
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createMedia, setCreateMedia] = useState<MediaFile | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'shorts' | 'videos'>('shorts');
  const videoRef = useRef<HTMLVideoElement>(null);

  const shorts = reels.filter(r => r.isShort || (r.duration && r.duration <= 60));
  const videos = reels.filter(r => !r.isShort && r.duration && r.duration > 60);

  const displayReels = activeTab === 'shorts' ? shorts : videos;

  const handleCreate = async () => {
    if (!createTitle.trim() || !createMedia) return;
    setCreating(true);
    try {
      await onCreate(createTitle.trim(), createMedia);
      setShowCreate(false);
      setCreateTitle('');
      setCreateMedia(null);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Header with tabs */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex rounded-xl bg-white/5 p-1">
          <button
            onClick={() => setActiveTab('shorts')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'shorts' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShortsIcon size={16} />
            Shorts ({shorts.length})
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'videos' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <VideoIcon size={16} />
            Video ({videos.length})
          </button>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 font-semibold transition hover:opacity-90"
        >
          <PlusIcon size={18} />
          Crea
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {displayReels.map((reel) => (
          <motion.div
            key={reel.id}
            layoutId={`reel-${reel.id}`}
            onClick={() => setSelectedReel(reel)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60"
          >
            <div className="aspect-[9/14]">
              {reel.mediaType === 'video' && reel.videoBase64 ? (
                <video
                  src={reel.videoBase64}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  muted
                  loop
                  playsInline
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                />
              ) : (
                <img
                  src={reel.imageBase64}
                  alt={reel.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              {/* Duration badge */}
              {reel.duration && reel.duration > 0 && (
                <span className="absolute top-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs">
                  {formatDuration(reel.duration)}
                </span>
              )}
              
              {/* Play icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                <div className="rounded-full bg-white/20 p-4 backdrop-blur">
                  <PlayIcon size={24} className="text-white" />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="truncate text-sm font-semibold">{reel.title}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-300">
                <span>{reel.authorName}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <HeartIcon size={12} filled={reel.liked} />
                  {reel.likeCount}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {reels.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center">
          <p className="text-slate-400">Nessun reel disponibile.</p>
          <p className="mt-2 text-sm text-slate-500">Crea il primo reel!</p>
        </div>
      )}

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {selectedReel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setSelectedReel(null)}
          >
            <motion.div
              layoutId={`reel-${selectedReel.id}`}
              className="relative max-h-[90vh] max-w-md overflow-hidden rounded-2xl bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedReel(null)}
                className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70"
              >
                <CloseIcon size={20} />
              </button>

              {selectedReel.mediaType === 'video' && selectedReel.videoBase64 ? (
                <video
                  ref={videoRef}
                  src={selectedReel.videoBase64}
                  className="max-h-[70vh] w-full object-contain"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={selectedReel.imageBase64}
                  alt={selectedReel.title}
                  className="max-h-[70vh] w-full object-contain"
                />
              )}

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{selectedReel.title}</p>
                    <p className="text-sm text-slate-400">@{selectedReel.authorName}</p>
                  </div>
                  <button
                    onClick={() => onLike(selectedReel.id)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 transition ${
                      selectedReel.liked
                        ? 'bg-pink-500/20 text-pink-400'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <HeartIcon size={20} filled={selectedReel.liked} />
                    <span>{selectedReel.likeCount}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-slate-900 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Nuovo Reel</h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-white/10"
                >
                  <CloseIcon size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Titolo del reel..."
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 outline-none focus:border-pink-400"
                />

                <MediaUploader
                  onMediaSelect={setCreateMedia}
                  currentMedia={createMedia}
                  allowedTypes={['image', 'video']}
                  maxSizeMB={100}
                />

                {createMedia?.duration && (
                  <p className="flex items-center gap-2 text-sm text-slate-400">
                    Durata: {formatDuration(createMedia.duration)} - 
                    {createMedia.duration <= 60 ? (
                      <span className="flex items-center gap-1"><ShortsIcon size={14} /> Short</span>
                    ) : (
                      <span className="flex items-center gap-1"><VideoIcon size={14} /> Video completo</span>
                    )}
                  </p>
                )}

                <button
                  onClick={handleCreate}
                  disabled={!createTitle.trim() || !createMedia || creating}
                  className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 py-3 font-semibold transition hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? 'Pubblicazione...' : 'Pubblica Reel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
