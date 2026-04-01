import { useState } from 'react';
import { motion } from 'framer-motion';
import { EditIcon, CheckIcon, InstagramIcon, TikTokIcon, YouTubeIcon, BadgeIcon } from './Icons';
import ImageUploader from './ImageUploader';
import type { User } from '../hooks/useApi';

type ProfileProps = {
  user: User;
  onUpdate: (data: Partial<User>) => Promise<void>;
  onLogout: () => void;
};

const THEMES = [
  { id: 'sunset', name: 'Sunset Pop', gradient: 'from-fuchsia-400 via-pink-500 to-orange-400' },
  { id: 'ocean', name: 'Ocean Wave', gradient: 'from-cyan-400 via-blue-500 to-indigo-600' },
  { id: 'mint', name: 'Mint Fresh', gradient: 'from-emerald-400 via-teal-500 to-lime-500' },
] as const;

const STATUS_OPTIONS = [
  { id: 'online', label: 'Online', color: 'bg-emerald-500' },
  { id: 'busy', label: 'Occupato', color: 'bg-amber-500' },
  { id: 'invisible', label: 'Invisibile', color: 'bg-slate-500' },
] as const;

const MOOD_EMOJIS = ['😊', '😎', '🔥', '💪', '🎮', '📚', '🎵', '🎨', '⚽', '😴', '🤔', '😂', '❤️', '✨', '🌟'];

const BADGE_INFO: Record<string, { name: string; description: string }> = {
  first_post: { name: 'Primo Post', description: 'Hai pubblicato il tuo primo post!' },
  '10_likes': { name: '10 Like', description: 'Hai ricevuto 10 like sui tuoi post!' },
  channel_creator: { name: 'Creatore', description: 'Hai creato un canale!' },
  active_member: { name: 'Membro Attivo', description: 'Sei un membro attivo della community!' },
};

export default function Profile({ user, onUpdate, onLogout }: ProfileProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);
  const [avatar, setAvatar] = useState<string | null>(user.avatar);
  const [banner, setBanner] = useState<string | null>(user.banner);
  const [status, setStatus] = useState(user.status);
  const [mood, setMood] = useState(user.mood);
  const [theme, setTheme] = useState(user.theme);
  const [socialLinks, setSocialLinks] = useState(user.socialLinks || {});

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        displayName,
        bio,
        avatar,
        banner,
        status,
        mood,
        theme,
        socialLinks,
      });
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(user.displayName);
    setBio(user.bio);
    setAvatar(user.avatar);
    setBanner(user.banner);
    setStatus(user.status);
    setMood(user.mood);
    setTheme(user.theme);
    setSocialLinks(user.socialLinks || {});
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70"
      >
        {/* Banner */}
        <div className={`relative h-32 bg-gradient-to-r ${currentTheme.gradient}`}>
          {banner && (
            <img src={banner} alt="Banner" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {editing && (
            <div className="absolute bottom-2 right-2 flex gap-2">
              <ImageUploader
                variant="banner"
                onImageSelect={setBanner}
                currentImage={banner}
              />
            </div>
          )}
        </div>

        {/* Avatar & Info */}
        <div className="relative px-6 pb-6">
          <div className="flex items-end justify-between">
            <div className="-mt-12 flex items-end gap-4">
              {editing ? (
                <ImageUploader
                  variant="avatar"
                  onImageSelect={setAvatar}
                  currentImage={avatar}
                />
              ) : (
                <div className="relative">
                  {avatar ? (
                    <img src={avatar} alt={displayName} className="h-24 w-24 rounded-full border-4 border-slate-900 object-cover" />
                  ) : (
                    <div className={`flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-900 bg-gradient-to-br ${currentTheme.gradient} text-3xl font-bold`}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Status indicator */}
                  <span className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-3 border-slate-900 ${
                    STATUS_OPTIONS.find((s) => s.id === status)?.color || 'bg-slate-500'
                  }`} />
                </div>
              )}
              
              <div className="mb-2">
                {editing ? (
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="rounded-lg border border-white/20 bg-transparent px-3 py-1 text-xl font-bold outline-none focus:border-pink-400"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{displayName}</h2>
                    <span className="text-2xl">{mood}</span>
                  </div>
                )}
                <p className="text-sm text-slate-400">@{user.username}</p>
              </div>
            </div>

            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 transition hover:bg-white/20"
              >
                <EditIcon size={16} />
                Modifica
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="rounded-lg bg-white/10 px-4 py-2 transition hover:bg-white/20"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-pink-500 px-4 py-2 transition hover:bg-pink-600 disabled:opacity-50"
                >
                  <CheckIcon size={16} />
                  {saving ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="mt-4">
            {editing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Scrivi qualcosa su di te..."
                rows={3}
                className="w-full resize-none rounded-lg border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-pink-400"
              />
            ) : (
              <p className="text-slate-300">{bio}</p>
            )}
          </div>

          {/* Badges */}
          {user.badges && user.badges.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-400">Badge</p>
              <div className="flex flex-wrap gap-2">
                {user.badges.map((badge) => (
                  <div
                    key={badge}
                    className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1"
                    title={BADGE_INFO[badge]?.description}
                  >
                    <BadgeIcon size={20} type={badge} />
                    <span className="text-sm">{BADGE_INFO[badge]?.name || badge}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-slate-400">Social</p>
            {editing ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800 px-3 py-2">
                  <InstagramIcon size={18} className="text-pink-400" />
                  <input
                    value={socialLinks.instagram || ''}
                    onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                    placeholder="Instagram"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800 px-3 py-2">
                  <TikTokIcon size={18} />
                  <input
                    value={socialLinks.tiktok || ''}
                    onChange={(e) => setSocialLinks({ ...socialLinks, tiktok: e.target.value })}
                    placeholder="TikTok"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800 px-3 py-2">
                  <YouTubeIcon size={18} className="text-red-500" />
                  <input
                    value={socialLinks.youtube || ''}
                    onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                    placeholder="YouTube"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                {socialLinks.instagram && (
                  <span className="flex items-center gap-1 text-sm text-slate-400">
                    <InstagramIcon size={16} className="text-pink-400" />
                    {socialLinks.instagram}
                  </span>
                )}
                {socialLinks.tiktok && (
                  <span className="flex items-center gap-1 text-sm text-slate-400">
                    <TikTokIcon size={16} />
                    {socialLinks.tiktok}
                  </span>
                )}
                {socialLinks.youtube && (
                  <span className="flex items-center gap-1 text-sm text-slate-400">
                    <YouTubeIcon size={16} className="text-red-500" />
                    {socialLinks.youtube}
                  </span>
                )}
                {!socialLinks.instagram && !socialLinks.tiktok && !socialLinks.youtube && (
                  <span className="text-sm text-slate-500">Nessun social collegato</span>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Settings */}
      {editing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-slate-900/70 p-6"
        >
          <h3 className="mb-4 text-lg font-bold">Personalizzazione</h3>

          {/* Status */}
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-slate-400">Stato</p>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setStatus(opt.id)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 transition ${
                    status === opt.id
                      ? 'bg-white/20 ring-2 ring-pink-500'
                      : 'bg-white/10 hover:bg-white/15'
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${opt.color}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-slate-400">Mood</p>
            <div className="flex flex-wrap gap-2">
              {MOOD_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setMood(emoji)}
                  className={`rounded-lg p-2 text-xl transition ${
                    mood === emoji
                      ? 'bg-pink-500/30 ring-2 ring-pink-500'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-400">Tema</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`overflow-hidden rounded-xl transition ${
                    theme === t.id ? 'ring-2 ring-pink-500' : ''
                  }`}
                >
                  <div className={`h-16 bg-gradient-to-r ${t.gradient}`} />
                  <div className="bg-slate-800 p-2 text-center text-sm font-medium">{t.name}</div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Account Info */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
        <h3 className="mb-4 text-lg font-bold">Account</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Username</span>
            <span>@{user.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Età</span>
            <span>{user.age} anni</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Membro dal</span>
            <span>{new Date(user.createdAt).toLocaleDateString('it-IT')}</span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="mt-6 w-full rounded-lg bg-red-500/20 py-3 font-medium text-red-400 transition hover:bg-red-500/30"
        >
          Esci dall'account
        </button>
      </div>
    </div>
  );
}
