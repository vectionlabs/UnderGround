import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SettingsIcon, CloseIcon, UserIcon, LockIcon, BellIcon, 
  PaletteIcon, VolumeIcon, GlobeIcon, MoonIcon, SunIcon, EyeIcon, EyeOffIcon 
} from './Icons';
import type { User } from '../hooks/useApi';
import { getTranslations, type Language } from '../utils/i18n';

type Theme = 'sunset' | 'ocean' | 'mint' | 'purple' | 'dark';
type FontSize = 'small' | 'normal' | 'large' | 'xlarge';

export type AppSettings = {
  theme: Theme;
  darkMode: boolean;
  fontSize: FontSize;
  language: Language;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  messagePreview: boolean;
  autoPlayVideos: boolean;
  reducedMotion: boolean;
};

type SettingsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  onUpdateProfile: (data: Partial<User>) => Promise<void>;
};

const THEMES: { id: Theme; name: string; colors: string[] }[] = [
  { id: 'sunset', name: 'Tramonto', colors: ['#ec4899', '#f97316', '#eab308'] },
  { id: 'ocean', name: 'Oceano', colors: ['#06b6d4', '#3b82f6', '#8b5cf6'] },
  { id: 'mint', name: 'Menta', colors: ['#10b981', '#14b8a6', '#06b6d4'] },
  { id: 'purple', name: 'Viola', colors: ['#a855f7', '#ec4899', '#6366f1'] },
  { id: 'dark', name: 'Scuro', colors: ['#334155', '#475569', '#64748b'] },
];

const FONT_SIZES: { id: FontSize; name: string; preview: string }[] = [
  { id: 'small', name: 'Piccolo', preview: 'Aa' },
  { id: 'normal', name: 'Normale', preview: 'Aa' },
  { id: 'large', name: 'Grande', preview: 'Aa' },
  { id: 'xlarge', name: 'Molto grande', preview: 'Aa' },
];

const LANGUAGES: { id: Language; name: string; flag: string }[] = [
  { id: 'it', name: 'Italiano', flag: '🇮🇹' },
  { id: 'en', name: 'English', flag: '🇬🇧' },
  { id: 'es', name: 'Español', flag: '🇪🇸' },
  { id: 'fr', name: 'Français', flag: '🇫🇷' },
  { id: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

export default function SettingsPanel({
  isOpen,
  onClose,
  user,
  settings,
  onSettingsChange,
  onUpdateProfile,
}: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<'account' | 'privacy' | 'notifications' | 'appearance' | 'sound' | 'accessibility'>('account');
  const [saving, setSaving] = useState(false);
  
  // Get translations based on current language
  const t = getTranslations(settings.language);
  
  // Form states
  const [privateProfile, setPrivateProfile] = useState(user?.privateProfile ?? false);
  const [safeComments, setSafeComments] = useState(user?.safeComments ?? false);

  // Apply theme and mode to document when settings change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('data-mode', settings.darkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-font-size', settings.fontSize);
  }, [settings.theme, settings.darkMode, settings.fontSize]);

  const handleSavePrivacy = async () => {
    setSaving(true);
    try {
      await onUpdateProfile({ privateProfile, safeComments });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Dynamic theme names based on language
  const getThemeName = (themeId: Theme) => {
    const names: Record<Theme, string> = {
      sunset: t.themeSunset,
      ocean: t.themeOcean,
      mint: t.themeMint,
      purple: t.themePurple,
      dark: t.themeDark,
    };
    return names[themeId];
  };

  // Dynamic font size names based on language
  const getFontSizeName = (sizeId: FontSize) => {
    const names: Record<FontSize, string> = {
      small: t.fontSmall,
      normal: t.fontNormal,
      large: t.fontLarge,
      xlarge: t.fontXLarge,
    };
    return names[sizeId];
  };

  const sections = [
    { id: 'account', label: t.account, icon: <UserIcon size={20} /> },
    { id: 'privacy', label: t.privacy, icon: <LockIcon size={20} /> },
    { id: 'notifications', label: t.notifications, icon: <BellIcon size={20} /> },
    { id: 'appearance', label: t.appearance, icon: <PaletteIcon size={20} /> },
    { id: 'sound', label: t.sounds, icon: <VolumeIcon size={20} /> },
    { id: 'accessibility', label: t.accessibility, icon: <GlobeIcon size={20} /> },
  ] as const;

  // Toggle switch component for reusability
  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition ${
        enabled ? 'theme-primary' : 'bg-slate-600'
      }`}
      style={{ backgroundColor: enabled ? 'var(--primary)' : undefined }}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
          enabled ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 z-50 flex overflow-hidden rounded-2xl bg-slate-900 shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:h-[80vh] md:w-full md:max-w-4xl md:-translate-x-1/2 md:-translate-y-1/2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar */}
            <div className="hidden w-64 border-r border-white/10 bg-slate-950 md:block">
              <div className="flex items-center gap-3 border-b border-white/10 p-6">
                <SettingsIcon size={24} />
                <h2 className="text-xl font-bold">{t.settingsTitle}</h2>
              </div>
              <nav className="p-4">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition ${
                      activeSection === section.id
                        ? 'bg-pink-500/20 text-pink-400'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {section.icon}
                    <span>{section.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Mobile Header */}
              <div className="flex items-center justify-between border-b border-white/10 p-4 md:hidden">
                <div className="flex items-center gap-3">
                  <SettingsIcon size={24} />
                  <h2 className="text-xl font-bold">{t.settingsTitle}</h2>
                </div>
                <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10">
                  <CloseIcon size={20} />
                </button>
              </div>

              {/* Mobile Tabs */}
              <div className="flex gap-2 overflow-x-auto border-b border-white/10 p-4 md:hidden">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                      activeSection === section.id
                        ? 'bg-pink-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {section.icon}
                    {section.label}
                  </button>
                ))}
              </div>

              {/* Desktop Close Button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 hidden rounded-lg p-2 text-slate-400 hover:bg-white/10 md:block"
              >
                <CloseIcon size={20} />
              </button>

              {/* Settings Content */}
              <div className="p-6">
                {activeSection === 'account' && (
                  <div>
                    <h3 className="mb-6 text-lg font-semibold">{t.account}</h3>
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 rounded-xl bg-slate-800/50 p-4">
                        {user?.avatar ? (
                          <img src={user.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-2xl font-bold">
                            {user?.displayName?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{user?.displayName}</p>
                          <p className="text-sm text-slate-400">@{user?.username}</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-2">{t.email}</label>
                        <p className="text-slate-300">{user?.username}@underground.app</p>
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-2">{t.memberSince}</label>
                        <p className="text-slate-300">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('it-IT', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          }) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'privacy' && (
                  <div>
                    <h3 className="mb-6 text-lg font-semibold">{t.privacy}</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4">
                        <div className="flex items-center gap-3">
                          {privateProfile ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                          <div>
                            <p className="font-medium">{t.privateProfile}</p>
                            <p className="text-sm text-slate-400">{t.privateProfileDesc}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setPrivateProfile(!privateProfile)}
                          className={`relative h-6 w-11 rounded-full transition ${
                            privateProfile ? 'bg-pink-500' : 'bg-slate-600'
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                              privateProfile ? 'left-6' : 'left-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4">
                        <div className="flex items-center gap-3">
                          <LockIcon size={20} />
                          <div>
                            <p className="font-medium">{t.safeComments}</p>
                            <p className="text-sm text-slate-400">{t.safeCommentsDesc}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSafeComments(!safeComments)}
                          className={`relative h-6 w-11 rounded-full transition ${
                            safeComments ? 'bg-pink-500' : 'bg-slate-600'
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                              safeComments ? 'left-6' : 'left-1'
                            }`}
                          />
                        </button>
                      </div>

                      <button
                        onClick={handleSavePrivacy}
                        disabled={saving}
                        className="mt-4 w-full rounded-lg bg-pink-500 py-3 font-semibold transition hover:bg-pink-600 disabled:opacity-50"
                      >
                        {saving ? t.saving : t.saveChanges}
                      </button>
                    </div>
                  </div>
                )}

                {activeSection === 'notifications' && (
                  <div>
                    <h3 className="mb-6 text-lg font-semibold">{t.notifications}</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4">
                        <div className="flex items-center gap-3">
                          <BellIcon size={20} />
                          <div>
                            <p className="font-medium">{t.enableNotifications}</p>
                            <p className="text-sm text-slate-400">{t.enableNotificationsDesc}</p>
                          </div>
                        </div>
                        <ToggleSwitch
                          enabled={settings.notificationsEnabled}
                          onChange={() => onSettingsChange({ notificationsEnabled: !settings.notificationsEnabled })}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4">
                        <div className="flex items-center gap-3">
                          <EyeIcon size={20} />
                          <div>
                            <p className="font-medium">{t.messagePreview}</p>
                            <p className="text-sm text-slate-400">{t.messagePreviewDesc}</p>
                          </div>
                        </div>
                        <ToggleSwitch
                          enabled={settings.messagePreview}
                          onChange={() => onSettingsChange({ messagePreview: !settings.messagePreview })}
                        />
                      </div>

                      <div className="mt-6 rounded-xl bg-slate-800/30 p-4">
                        <p className="text-sm text-slate-400">
                          💡 Le notifiche ti permettono di rimanere aggiornato su like, commenti, follower e messaggi diretti.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'appearance' && (
                  <div>
                    <h3 className="mb-6 text-lg font-semibold">{t.appearance}</h3>
                    <div className="space-y-6">
                      {/* Theme Selection */}
                      <div>
                        <p className="mb-4 text-sm text-slate-400">{t.colorTheme}</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {THEMES.map((theme) => (
                            <button
                              key={theme.id}
                              onClick={() => onSettingsChange({ theme: theme.id })}
                              className={`flex items-center gap-3 rounded-xl p-4 transition ${
                                settings.theme === theme.id
                                  ? 'ring-2 bg-slate-800'
                                  : 'bg-slate-800/50 hover:bg-slate-800'
                              }`}
                              style={{ 
                                ringColor: settings.theme === theme.id ? 'var(--primary)' : undefined 
                              }}
                            >
                              <div className="flex -space-x-1">
                                {theme.colors.map((color, i) => (
                                  <div
                                    key={i}
                                    className="h-6 w-6 rounded-full border-2 border-slate-900"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                              <span className="text-sm font-medium">{getThemeName(theme.id)}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dark Mode Toggle */}
                      <div className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4">
                        <div className="flex items-center gap-3">
                          {settings.darkMode ? <MoonIcon size={20} /> : <SunIcon size={20} />}
                          <div>
                            <p className="font-medium">{t.darkMode}</p>
                            <p className="text-sm text-slate-400">
                              {settings.darkMode ? t.darkModeOn : t.darkModeOff}
                            </p>
                          </div>
                        </div>
                        <ToggleSwitch
                          enabled={settings.darkMode}
                          onChange={() => onSettingsChange({ darkMode: !settings.darkMode })}
                        />
                      </div>

                      {/* Font Size Selection */}
                      <div>
                        <p className="mb-4 text-sm text-slate-400">{t.fontSize}</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {FONT_SIZES.map((size) => (
                            <button
                              key={size.id}
                              onClick={() => onSettingsChange({ fontSize: size.id })}
                              className={`flex flex-col items-center gap-2 rounded-xl p-4 transition ${
                                settings.fontSize === size.id
                                  ? 'ring-2 bg-slate-800'
                                  : 'bg-slate-800/50 hover:bg-slate-800'
                              }`}
                              style={{ 
                                ringColor: settings.fontSize === size.id ? 'var(--primary)' : undefined 
                              }}
                            >
                              <span 
                                className="font-bold"
                                style={{ 
                                  fontSize: size.id === 'small' ? '14px' : 
                                           size.id === 'normal' ? '16px' : 
                                           size.id === 'large' ? '18px' : '20px' 
                                }}
                              >
                                {size.preview}
                              </span>
                              <span className="text-xs text-slate-400">{getFontSizeName(size.id)}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Language Selection */}
                      <div>
                        <p className="mb-4 text-sm text-slate-400">{t.language}</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {LANGUAGES.map((lang) => (
                            <button
                              key={lang.id}
                              onClick={() => onSettingsChange({ language: lang.id })}
                              className={`flex items-center gap-3 rounded-xl p-4 transition ${
                                settings.language === lang.id
                                  ? 'ring-2 bg-slate-800'
                                  : 'bg-slate-800/50 hover:bg-slate-800'
                              }`}
                              style={{ 
                                ringColor: settings.language === lang.id ? 'var(--primary)' : undefined 
                              }}
                            >
                              <span className="text-xl">{lang.flag}</span>
                              <span className="text-sm font-medium">{lang.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'sound' && (
                  <div>
                    <h3 className="mb-6 text-lg font-semibold">{t.sounds}</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4">
                        <div className="flex items-center gap-3">
                          <VolumeIcon size={20} />
                          <div>
                            <p className="font-medium">{t.notificationSounds}</p>
                            <p className="text-sm text-slate-400">{t.notificationSoundsDesc}</p>
                          </div>
                        </div>
                        <ToggleSwitch
                          enabled={settings.soundEnabled}
                          onChange={() => onSettingsChange({ soundEnabled: !settings.soundEnabled })}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4">
                        <div className="flex items-center gap-3">
                          <VolumeIcon size={20} />
                          <div>
                            <p className="font-medium">{t.vibration}</p>
                            <p className="text-sm text-slate-400">{t.vibrationDesc}</p>
                          </div>
                        </div>
                        <ToggleSwitch
                          enabled={settings.vibrationEnabled}
                          onChange={() => onSettingsChange({ vibrationEnabled: !settings.vibrationEnabled })}
                        />
                      </div>

                      <div className="mt-6 rounded-xl bg-slate-800/30 p-4">
                        <p className="text-sm text-slate-400">
                          🔊 I suoni ti aiutano a non perdere messaggi e notifiche importanti.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'accessibility' && (
                  <div>
                    <h3 className="mb-6 text-lg font-semibold">{t.accessibility}</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4">
                        <div className="flex items-center gap-3">
                          <EyeIcon size={20} />
                          <div>
                            <p className="font-medium">{t.autoPlayVideos}</p>
                            <p className="text-sm text-slate-400">{t.autoPlayVideosDesc}</p>
                          </div>
                        </div>
                        <ToggleSwitch
                          enabled={settings.autoPlayVideos}
                          onChange={() => onSettingsChange({ autoPlayVideos: !settings.autoPlayVideos })}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4">
                        <div className="flex items-center gap-3">
                          <GlobeIcon size={20} />
                          <div>
                            <p className="font-medium">{t.reduceMotion}</p>
                            <p className="text-sm text-slate-400">{t.reduceMotionDesc}</p>
                          </div>
                        </div>
                        <ToggleSwitch
                          enabled={settings.reducedMotion}
                          onChange={() => onSettingsChange({ reducedMotion: !settings.reducedMotion })}
                        />
                      </div>

                      <div className="mt-6 rounded-xl bg-slate-800/30 p-4">
                        <p className="text-sm text-slate-400">
                          ♿ Queste opzioni rendono l'app più accessibile per tutti gli utenti.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
