import { useState } from 'react';
import { motion } from 'framer-motion';
import { SendIcon } from './Icons';
import MediaUploader from './MediaUploader';
import type { Channel, User } from '../hooks/useApi';

type MediaFile = {
  type: 'image' | 'video' | 'document';
  dataBase64: string;
  thumbnailBase64?: string;
  fileName?: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
};

type CreatePostProps = {
  channels: Channel[];
  currentUser: User;
  onPublish: (text: string, channelId: string, media: MediaFile | null, publishAs: string | null) => Promise<void>;
};

// Sanitize icon: if base64, use default emoji
const safeIcon = (icon: string) => {
  if (!icon || icon.length > 10 || icon.startsWith('data:') || icon.includes('base64')) return '📢';
  return icon;
};
// Sanitize name: truncate if too long or contains base64
const safeName = (name: string) => {
  if (!name) return '?';
  if (name.length > 50 || name.includes('base64') || name.startsWith('data:')) {
    return name.substring(0, 20).replace(/[^a-zA-Z0-9\s._-]/g, '').trim() || '?';
  }
  return name;
};

export default function CreatePost({ channels, currentUser, onPublish }: CreatePostProps) {
  const [text, setText] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(channels[0]?.id || '');
  const [media, setMedia] = useState<MediaFile | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [publishAs, setPublishAs] = useState<string>('user'); // 'user' or channel id

  const handlePublish = async () => {
    if (!text.trim()) return;
    setError('');
    setPublishing(true);
    try {
      const publishAsValue = publishAs === 'user' ? null : publishAs;
      await onPublish(text.trim(), selectedChannel, media, publishAsValue);
      setText('');
      setMedia(null);
    } catch (e: any) {
      setError(e.message || 'Errore pubblicazione');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-slate-900/70 p-6"
    >
      <h2 className="mb-4 text-xl font-bold">Nuovo Post</h2>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Cosa vuoi condividere?"
        rows={4}
        className="mb-4 w-full resize-none rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 outline-none focus:border-pink-400"
      />

      <div className="mb-4">
        <MediaUploader 
          onMediaSelect={setMedia} 
          currentMedia={media}
          allowedTypes={['image', 'video', 'document']}
          maxSizeMB={50}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Pubblica come */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Pubblica come:</label>
          <select
            value={publishAs}
            onChange={(e) => setPublishAs(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-pink-400"
          >
            <option value="user">
              👤 Tu ({currentUser.displayName})
            </option>
            {channels.filter(c => !c.name?.startsWith('data:')).map((channel) => (
              <option key={channel.id} value={channel.id}>
                {safeIcon(channel.icon)} {safeName(channel.name)}
              </option>
            ))}
          </select>
        </div>

        {/* Canale destinazione */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">In:</label>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-pink-400"
          >
            {channels.filter(c => !c.name?.startsWith('data:')).map((channel) => (
              <option key={channel.id} value={channel.id}>
                {safeIcon(channel.icon)} {safeName(channel.name)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handlePublish}
          disabled={!text.trim() || publishing}
          className="ml-auto flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-2.5 font-semibold transition hover:opacity-90 disabled:opacity-50"
        >
          <SendIcon size={18} />
          {publishing ? 'Pubblicazione...' : 'Pubblica'}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-500/20 p-3 text-sm text-red-400">{error}</p>
      )}
    </motion.div>
  );
}
