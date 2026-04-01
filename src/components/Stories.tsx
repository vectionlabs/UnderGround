import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, CloseIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import ImageUploader from './ImageUploader';

type Story = {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  imageBase64: string;
  createdAt: string;
  viewed: boolean;
};

type StoriesProps = {
  stories: Story[];
  currentUserId: string;
  onCreateStory: (imageBase64: string) => Promise<void>;
  onViewStory: (storyId: string) => void;
};

export default function Stories({ stories, currentUserId, onCreateStory, onViewStory }: StoriesProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [storyImage, setStoryImage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.userId]) {
      acc[story.userId] = [];
    }
    acc[story.userId].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const userStories = Object.entries(groupedStories).map(([userId, userStories]) => ({
    userId,
    userName: userStories[0].userName,
    userAvatar: userStories[0].userAvatar,
    stories: userStories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    hasUnviewed: userStories.some(s => !s.viewed),
  }));

  // Story progress timer
  useEffect(() => {
    if (selectedStory) {
      setProgress(0);
      timerRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNextStory();
            return 0;
          }
          return prev + 2;
        });
      }, 100);
      onViewStory(selectedStory.id);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedStory?.id]);

  const handleNextStory = () => {
    if (!selectedStory) return;
    const currentUserStories = groupedStories[selectedStory.userId];
    const currentIndex = currentUserStories.findIndex(s => s.id === selectedStory.id);
    if (currentIndex < currentUserStories.length - 1) {
      setSelectedStory(currentUserStories[currentIndex + 1]);
    } else {
      setSelectedStory(null);
    }
  };

  const handlePrevStory = () => {
    if (!selectedStory) return;
    const currentUserStories = groupedStories[selectedStory.userId];
    const currentIndex = currentUserStories.findIndex(s => s.id === selectedStory.id);
    if (currentIndex > 0) {
      setSelectedStory(currentUserStories[currentIndex - 1]);
    }
  };

  const handleCreate = async () => {
    if (!storyImage) return;
    setCreating(true);
    try {
      await onCreateStory(storyImage);
      setShowCreate(false);
      setStoryImage(null);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Stories Bar */}
      <div className="relative mb-6">
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Add Story Button */}
          <div 
            onClick={() => setShowCreate(true)}
            className="flex flex-shrink-0 cursor-pointer flex-col items-center gap-2"
          >
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 p-[2px]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900">
                <PlusIcon size={24} className="text-pink-400" />
              </div>
            </div>
            <span className="text-xs text-slate-400">La tua storia</span>
          </div>

          {/* User Stories */}
          {userStories.map((user) => (
            <div
              key={user.userId}
              onClick={() => setSelectedStory(user.stories[0])}
              className="flex flex-shrink-0 cursor-pointer flex-col items-center gap-2"
            >
              <div className={`relative flex h-16 w-16 items-center justify-center rounded-full p-[2px] ${
                user.hasUnviewed 
                  ? 'bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400' 
                  : 'bg-slate-600'
              }`}>
                {user.userAvatar ? (
                  <img 
                    src={user.userAvatar} 
                    alt={user.userName}
                    className="h-full w-full rounded-full object-cover border-2 border-slate-900"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-lg font-bold border-2 border-slate-900">
                    {user.userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="max-w-[64px] truncate text-xs text-slate-400">{user.userName}</span>
            </div>
          ))}
        </div>

        {/* Scroll Buttons */}
        {userStories.length > 4 && (
          <>
            <button 
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-slate-800/80 p-1 text-white opacity-0 transition hover:opacity-100"
            >
              <ChevronLeftIcon size={20} />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-slate-800/80 p-1 text-white opacity-0 transition hover:opacity-100"
            >
              <ChevronRightIcon size={20} />
            </button>
          </>
        )}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {selectedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            onClick={() => setSelectedStory(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative h-full max-h-[90vh] w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress Bar */}
              <div className="absolute top-4 left-4 right-4 z-10">
                <div className="h-1 rounded-full bg-white/30">
                  <div 
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Header */}
              <div className="absolute top-8 left-4 right-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedStory.userAvatar ? (
                    <img src={selectedStory.userAvatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 font-bold">
                      {selectedStory.userName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white">{selectedStory.userName}</p>
                    <p className="text-xs text-white/70">
                      {new Date(selectedStory.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStory(null)}
                  className="rounded-full p-2 text-white hover:bg-white/10"
                >
                  <CloseIcon size={24} />
                </button>
              </div>

              {/* Story Image */}
              <img
                src={selectedStory.imageBase64}
                alt=""
                className="h-full w-full object-contain"
              />

              {/* Navigation Areas */}
              <div 
                className="absolute left-0 top-0 h-full w-1/3 cursor-pointer"
                onClick={handlePrevStory}
              />
              <div 
                className="absolute right-0 top-0 h-full w-1/3 cursor-pointer"
                onClick={handleNextStory}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Story Modal */}
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
                <h2 className="text-xl font-bold">Nuova Storia</h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-white/10"
                >
                  <CloseIcon size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <ImageUploader
                  variant="banner"
                  onImageSelect={setStoryImage}
                  currentImage={storyImage}
                />

                <button
                  onClick={handleCreate}
                  disabled={!storyImage || creating}
                  className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 py-3 font-semibold transition hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? 'Pubblicazione...' : 'Pubblica Storia'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
