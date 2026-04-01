import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HashIcon, CheckIcon, PlusIcon, CloseIcon, UsersIcon, CalendarIcon, HeartIcon, CommentIcon, InfoIcon } from './Icons';
import ImageUploader from './ImageUploader';
import type { Channel, Post } from '../hooks/useApi';

type ChannelsProps = {
  channels: Channel[];
  onJoin: (channelId: string) => void;
  onLeave: (channelId: string) => void;
  onCreate: (name: string, description: string, icon: string) => Promise<void>;
  onLoadPosts: (channelId: string) => Promise<Post[]>;
};

const CHANNEL_ICONS = ['📚', '⚽', '🎵', '🎮', '🎨', '🔬', '🍳', '📷', '✈️', '🎭', '🌱', '💡', '🎬', '📱', '🏆'];

export default function Channels({ channels, onJoin, onLeave, onCreate, onLoadPosts }: ChannelsProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelPosts, setChannelPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createIcon, setCreateIcon] = useState('📢');
  const [iconImage, setIconImage] = useState<string | null>(null);
  const [useImageIcon, setUseImageIcon] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Load posts when channel is selected
  useEffect(() => {
    if (selectedChannel) {
      setLoadingPosts(true);
      onLoadPosts(selectedChannel.id)
        .then(posts => setChannelPosts(posts))
        .catch(console.error)
        .finally(() => setLoadingPosts(false));
    }
  }, [selectedChannel?.id]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setError('');
    setCreating(true);
    try {
      const icon = useImageIcon && iconImage ? iconImage : createIcon;
      await onCreate(createName.trim(), createDesc.trim(), icon);
      setShowCreate(false);
      setCreateName('');
      setCreateDesc('');
      setCreateIcon('📢');
      setIconImage(null);
      setUseImageIcon(false);
    } catch (e: any) {
      setError(e.message || 'Errore creazione canale');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {/* Create Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 font-semibold transition hover:opacity-90"
        >
          <PlusIcon size={18} />
          Crea Canale
        </button>
      </div>

      {/* Channels List */}
      <div className="space-y-3">
        {channels.map((channel) => (
          <motion.div
            key={channel.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 p-4 transition hover:bg-slate-800/70"
          >
            <div 
              className="flex flex-1 cursor-pointer items-center gap-4"
              onClick={() => setSelectedChannel(channel)}
            >
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/10 text-2xl">
                {channel.icon.startsWith('data:image') ? (
                  <img src={channel.icon} alt="" className="h-full w-full object-cover" />
                ) : (
                  channel.icon
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <HashIcon size={16} className="text-pink-400" />
                  <p className="font-semibold">{channel.name}</p>
                </div>
                <p className="mt-0.5 text-sm text-slate-400">{channel.description}</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <UsersIcon size={12} />
                  <span>{channel.memberCount} membri</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedChannel(channel)}
                className="rounded-lg bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                title="Dettagli canale"
              >
                <InfoIcon size={18} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  channel.joined ? onLeave(channel.id) : onJoin(channel.id);
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  channel.joined
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-red-500/20 hover:text-red-400'
                    : 'bg-white/10 text-white hover:bg-pink-500/20 hover:text-pink-400'
                }`}
              >
                {channel.joined ? (
                  <>
                    <CheckIcon size={16} />
                    Iscritto
                  </>
                ) : (
                  'Iscriviti'
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Channel Details Modal */}
      <AnimatePresence>
        {selectedChannel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setSelectedChannel(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white/10 text-3xl">
                      {selectedChannel.icon.startsWith('data:image') ? (
                        <img src={selectedChannel.icon} alt="" className="h-full w-full object-cover" />
                      ) : (
                        selectedChannel.icon
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <HashIcon size={18} className="text-pink-400" />
                        <h2 className="text-xl font-bold">{selectedChannel.name}</h2>
                      </div>
                      <p className="text-sm text-slate-400">{selectedChannel.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedChannel(null)}
                    className="rounded-full p-2 text-slate-400 hover:bg-white/10"
                  >
                    <CloseIcon size={20} />
                  </button>
                </div>
                
                {/* Channel Stats */}
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <UsersIcon size={16} />
                    <span>{selectedChannel.memberCount} membri</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <CalendarIcon size={16} />
                    <span>Creato il {formatDate(selectedChannel.createdAt)}</span>
                  </div>
                  {selectedChannel.creatorName && (
                    <div className="text-slate-400">
                      da <span className="text-pink-400">@{selectedChannel.creatorName}</span>
                    </div>
                  )}
                </div>

                {/* Join/Leave Button */}
                <div className="mt-4">
                  <button
                    onClick={() => {
                      selectedChannel.joined 
                        ? onLeave(selectedChannel.id) 
                        : onJoin(selectedChannel.id);
                      setSelectedChannel({
                        ...selectedChannel,
                        joined: !selectedChannel.joined,
                        memberCount: selectedChannel.joined 
                          ? selectedChannel.memberCount - 1 
                          : selectedChannel.memberCount + 1
                      });
                    }}
                    className={`flex items-center gap-2 rounded-lg px-6 py-2 font-medium transition ${
                      selectedChannel.joined
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:opacity-90'
                    }`}
                  >
                    {selectedChannel.joined ? (
                      <>
                        <CloseIcon size={16} />
                        Lascia canale
                      </>
                    ) : (
                      <>
                        <CheckIcon size={16} />
                        Iscriviti
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Posts */}
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="mb-4 font-semibold">Ultimi post</h3>
                {loadingPosts ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
                  </div>
                ) : channelPosts.length > 0 ? (
                  <div className="space-y-4">
                    {channelPosts.slice(0, 10).map((post) => (
                      <div key={post.id} className="rounded-xl border border-white/10 bg-slate-800/50 p-4">
                        <div className="flex items-center gap-3">
                          {post.authorAvatar ? (
                            <img src={post.authorAvatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 font-bold">
                              {post.authorName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{post.authorName}</p>
                            <p className="text-xs text-slate-500">{formatDate(post.createdAt)} • {formatTime(post.createdAt)}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-slate-300">{post.text}</p>
                        {post.imageBase64 && (
                          <img src={post.imageBase64} alt="" className="mt-3 max-h-60 rounded-lg object-cover" />
                        )}
                        <div className="mt-3 flex items-center gap-4 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <HeartIcon size={16} filled={post.liked} className={post.liked ? 'text-pink-500' : ''} />
                            {post.likeCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <CommentIcon size={16} />
                            {post.commentCount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-slate-800/30 p-8 text-center">
                    <p className="text-slate-400">Nessun post in questo canale.</p>
                    <p className="mt-2 text-sm text-slate-500">Sii il primo a pubblicare qualcosa!</p>
                  </div>
                )}
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
                <h2 className="text-xl font-bold">Nuovo Canale</h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-white/10"
                  aria-label="Chiudi"
                >
                  <CloseIcon size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Icona</label>
                  
                  {/* Toggle emoji/image */}
                  <div className="mb-3 flex gap-2">
                    <button
                      onClick={() => setUseImageIcon(false)}
                      className={`rounded-lg px-3 py-1.5 text-sm transition ${!useImageIcon ? 'bg-pink-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                      Emoji
                    </button>
                    <button
                      onClick={() => setUseImageIcon(true)}
                      className={`rounded-lg px-3 py-1.5 text-sm transition ${useImageIcon ? 'bg-pink-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                      Immagine
                    </button>
                  </div>
                  
                  {useImageIcon ? (
                    <div className="flex items-center gap-3">
                      <ImageUploader
                        variant="icon"
                        currentImage={iconImage}
                        onImageSelect={setIconImage}
                      />
                      <span className="text-sm text-slate-400">Carica un'immagine per l'icona</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {CHANNEL_ICONS.map((icon) => (
                        <button
                          key={icon}
                          onClick={() => setCreateIcon(icon)}
                          className={`rounded-lg p-2 text-xl transition ${
                            createIcon === icon
                              ? 'bg-pink-500/30 ring-2 ring-pink-500'
                              : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Nome canale..."
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 outline-none focus:border-pink-400"
                />

                <textarea
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Descrizione (opzionale)..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-white/10 bg-slate-800 px-4 py-3 outline-none focus:border-pink-400"
                />

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  onClick={handleCreate}
                  disabled={!createName.trim() || creating}
                  className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 py-3 font-semibold transition hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? 'Creazione...' : 'Crea Canale'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
