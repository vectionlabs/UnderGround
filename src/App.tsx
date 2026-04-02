import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  auth,
  posts,
  channels,
  groups,
  messages,
  reels,
  media,
  friends,
  type User,
  type Post,
  type Channel,
  type Group,
  type Conversation,
  type Reel,
  type Comment,
  type DirectMessage,
  type Friend,
} from "./hooks/useApi";
import { useSocket } from "./hooks/useSocket";
import {
  HomeIcon,
  ReelsIcon,
  HashIcon,
  PlusIcon,
  UserIcon,
  MessageIcon,
  GroupIcon,
  BellIcon,
  SearchIcon,
  SettingsIcon,
} from "./components/Icons";
import Feed from "./components/Feed";
import ReelsComponent from "./components/Reels";
import Channels from "./components/Channels";
import Groups from "./components/Groups";
import Messages from "./components/Messages";
import Profile from "./components/Profile";
import CreatePost from "./components/CreatePost";
import Stories from "./components/Stories";
import SearchPanel from "./components/SearchPanel";
import NotificationsPanel from "./components/NotificationsPanel";
import SettingsPanel, { type AppSettings } from "./components/SettingsPanel";
import AdminPanel from "./components/AdminPanel";
import BannedScreen from "./components/BannedScreen";

type Tab = "feed" | "reels" | "canali" | "gruppi" | "messaggi" | "crea" | "profilo" | "admin";

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'sunset',
  darkMode: true,
  fontSize: 'normal',
  language: 'it',
  notificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  messagePreview: true,
  autoPlayVideos: true,
  reducedMotion: false,
};

export default function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");

  // App state
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [postList, setPostList] = useState<Post[]>([]);
  const [channelList, setChannelList] = useState<Channel[]>([]);
  const [groupList, setGroupList] = useState<Group[]>([]);
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [reelList, setReelList] = useState<Reel[]>([]);
  const [friendList, setFriendList] = useState<Friend[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // New features state
  const [bookmarkedPosts, setBookmarkedPosts] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem("underground_settings");
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Socket.IO for real-time chat
  const socket = useSocket(currentUser);

  // Theme color mapping
  const themeColors: Record<string, { primary: string; secondary: string; accent: string }> = {
    sunset: { primary: '#ec4899', secondary: '#f97316', accent: '#eab308' },
    ocean: { primary: '#06b6d4', secondary: '#3b82f6', accent: '#8b5cf6' },
    mint: { primary: '#10b981', secondary: '#14b8a6', accent: '#06b6d4' },
    purple: { primary: '#a855f7', secondary: '#ec4899', accent: '#6366f1' },
    dark: { primary: '#64748b', secondary: '#475569', accent: '#334155' },
  };

  // Apply theme settings on mount and when they change
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', appSettings.theme);
    html.setAttribute('data-mode', appSettings.darkMode ? 'dark' : 'light');
    html.setAttribute('data-font-size', appSettings.fontSize);
    
    // Apply CSS variables directly to html element
    const colors = themeColors[appSettings.theme];
    html.style.setProperty('--primary', colors.primary);
    html.style.setProperty('--secondary', colors.secondary);
    html.style.setProperty('--accent', colors.accent);
    html.style.setProperty('--gradient-from', colors.primary);
    html.style.setProperty('--gradient-to', colors.secondary);
    
    // Apply mode colors
    if (appSettings.darkMode) {
      html.style.setProperty('--bg-primary', '#020617');
      html.style.setProperty('--bg-secondary', '#0f172a');
      html.style.setProperty('--bg-tertiary', '#1e293b');
      html.style.setProperty('--text-primary', '#ffffff');
      html.style.setProperty('--text-secondary', '#94a3b8');
      document.body.style.background = 'linear-gradient(to bottom right, #020617, #0f172a, #020617)';
      document.body.style.color = '#ffffff';
    } else {
      html.style.setProperty('--bg-primary', '#f8fafc');
      html.style.setProperty('--bg-secondary', '#f1f5f9');
      html.style.setProperty('--bg-tertiary', '#e2e8f0');
      html.style.setProperty('--text-primary', '#0f172a');
      html.style.setProperty('--text-secondary', '#475569');
      document.body.style.background = 'linear-gradient(to bottom right, #f8fafc, #f1f5f9, #f8fafc)';
      document.body.style.color = '#0f172a';
    }
    
    // Apply font size
    const fontScales: Record<string, string> = { small: '0.875', normal: '1', large: '1.125', xlarge: '1.25' };
    html.style.setProperty('--font-scale', fontScales[appSettings.fontSize] || '1');
    document.body.style.fontSize = `calc(1rem * ${fontScales[appSettings.fontSize] || '1'})`;
  }, [appSettings.theme, appSettings.darkMode, appSettings.fontSize]);

  // Check stored session on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem("underground_userId");
    if (storedUserId) {
      loadUserData(storedUserId);
    }
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      const user = await auth.getUser(userId);
      if (user) {
        setCurrentUser(user);
        setIsLoggedIn(true);
        localStorage.setItem("underground_userId", userId);
        loadAllData();
      }
    } catch (e) {
      console.error("Failed to load user:", e);
      localStorage.removeItem("underground_userId");
    }
  };

  const loadAllData = useCallback(async (retryCount = 0) => {
    if (!currentUser) return;
    
    // Prevent concurrent requests
    if (isLoadingData) {
      console.log('🔄 Data loading already in progress, skipping...');
      return;
    }
    
    setIsLoading(true);
    setIsLoadingData(true);
    setDataError(null);
    
    try {
      console.log('🔄 Loading initial data...');
      const [postsData, channelsData, groupsData, conversationsData, reelsData, friendsData, unreadData] = await Promise.all([
        posts.list().catch(e => { console.warn('Posts load failed:', e); return []; }),
        channels.list().catch(e => { console.warn('Channels load failed:', e); return []; }),
        groups.list().catch(e => { console.warn('Groups load failed:', e); return []; }),
        messages.conversations().catch(e => { console.warn('Conversations load failed:', e); return []; }),
        reels.list().catch(e => { console.warn('Reels load failed:', e); return []; }),
        friends.list().catch(e => { console.warn('Friends load failed:', e); return []; }),
        messages.unreadCount().catch(e => { console.warn('Unread count failed:', e); return 0; }),
      ]);
      
      setPostList(postsData);
      setChannelList(channelsData);
      setGroupList(groupsData);
      setConversationList(conversationsData);
      setReelList(reelsData);
      setFriendList(friendsData);
      setUnreadMessages(unreadData);
      setIsLoading(false);
      setIsLoadingData(false);
      console.log('✅ Initial data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setIsLoading(false);
      setIsLoadingData(false);
      
      if (retryCount < 2) {
        console.log(`🔄 Retrying data load... (${retryCount + 1}/2)`);
        setTimeout(() => loadAllData(retryCount + 1), 2000 * (retryCount + 1));
      } else {
        console.error('❌ Failed to load data after 2 retries');
        setDataError('Impossibile caricare i dati. Riprova più tardi.');
      }
    }
  }, [currentUser, isLoadingData]);

  // Load data when user changes
  useEffect(() => {
    if (currentUser) {
      loadAllData();
      const interval = setInterval(loadAllData, 60000); // Reduced from 30s to 60s
      return () => clearInterval(interval);
    }
  }, [currentUser, loadAllData]);

  // Auth handlers
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const result = await auth.login(username, password);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsLoggedIn(true);
        localStorage.setItem("underground_userId", result.user.id);
        resetForm();
      } else {
        setAuthError(result.error || "Login fallito");
      }
    } catch (e: any) {
      setAuthError(e.message || "Errore di connessione");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!username || !password || !displayName || !age) {
      setAuthError("Compila tutti i campi");
      return;
    }
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      setAuthError("Età non valida (minimo 13 anni)");
      return;
    }
    setAuthLoading(true);
    try {
      const result = await auth.register(username, password, displayName, ageNum);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsLoggedIn(true);
        localStorage.setItem("underground_userId", result.user.id);
        resetForm();
      } else {
        setAuthError(result.error || "Registrazione fallita");
      }
    } catch (e: any) {
      setAuthError(e.message || "Errore di connessione");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("underground_userId");
    setCurrentUser(null);
    setIsLoggedIn(false);
    setPostList([]);
    setChannelList([]);
    setGroupList([]);
    setConversationList([]);
    setReelList([]);
  };

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setDisplayName("");
    setAge("");
    setAuthError("");
  };

  // Post handlers
  const handleLikePost = async (postId: string) => {
    try {
      await posts.like(postId);
      setPostList((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 }
            : p
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleCommentPost = async (postId: string, text: string) => {
    try {
      await posts.comment(postId, text);
      setPostList((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await posts.delete(postId);
      setPostList((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadComments = async (postId: string): Promise<Comment[]> => {
    try {
      return await posts.comments(postId);
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const handleCreatePost = async (text: string, channelId: string, mediaFile: any, publishAs: string | null) => {
    // Check if muted
    if (currentUser?.muted) {
      alert('Sei mutato: ' + (currentUser.muteReason || 'Comportamento inappropriato'));
      return;
    }

    let uploadedMedia = mediaFile;
    
    // Upload media to Supabase Storage if present
    if (mediaFile && mediaFile.dataBase64) {
      const result = await media.upload(mediaFile.dataBase64, mediaFile.type, mediaFile.fileName);
      uploadedMedia = {
        ...mediaFile,
        dataBase64: result.url, // Replace base64 with Storage URL
      };
    }
    
    await posts.create(text, channelId, uploadedMedia, publishAs);
    const newPosts = await posts.list();
    setPostList(newPosts);
    setActiveTab("feed");
  };

  // Channel handlers
  const handleJoinChannel = async (channelId: string) => {
    try {
      await channels.join(channelId);
      setChannelList((prev) =>
        prev.map((c) =>
          c.id === channelId ? { ...c, joined: true, memberCount: c.memberCount + 1 } : c
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveChannel = async (channelId: string) => {
    try {
      await channels.leave(channelId);
      setChannelList((prev) =>
        prev.map((c) =>
          c.id === channelId ? { ...c, joined: false, memberCount: c.memberCount - 1 } : c
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateChannel = async (name: string, description: string, icon: string) => {
    await channels.create(name, description, icon);
    const newChannels = await channels.list();
    setChannelList(newChannels);
  };

  // Group handlers
  const handleCreateGroup = async (name: string, description: string, avatar: string | null, memberIds: string[]) => {
    const newGroup = await groups.create(name, description, avatar);
    // Invite selected members
    for (const memberId of memberIds) {
      const friend = friendList.find(f => f.friendId === memberId);
      if (friend) {
        try {
          await groups.invite(newGroup.id, friend.friendUsername);
        } catch (e) {
          console.error("Failed to invite member:", e);
        }
      }
    }
    const newGroups = await groups.list();
    setGroupList(newGroups);
  };

  const handleInviteToGroup = async (groupId: string, username: string) => {
    await groups.invite(groupId, username);
  };

  const handleLeaveGroup = async (groupId: string) => {
    await groups.leave(groupId);
    const newGroups = await groups.list();
    setGroupList(newGroups);
  };

  // Reel handlers
  const handleLikeReel = async (reelId: string) => {
    // Optimistic update first
    setReelList((prev) =>
      prev.map((r) =>
        r.id === reelId
          ? { ...r, liked: !r.liked, likeCount: r.liked ? r.likeCount - 1 : r.likeCount + 1 }
          : r
      )
    );
    try {
      await reels.like(reelId);
    } catch (e) {
      // Rollback on error
      setReelList((prev) =>
        prev.map((r) =>
          r.id === reelId
            ? { ...r, liked: !r.liked, likeCount: r.liked ? r.likeCount - 1 : r.likeCount + 1 }
            : r
        )
      );
      console.error(e);
    }
  };

  const handleCreateReel = async (title: string, mediaFile: any) => {
    // Check if muted
    if (currentUser?.muted) {
      alert('Sei mutato: ' + (currentUser.muteReason || 'Comportamento inappropriato'));
      return;
    }

    // Upload media to Supabase Storage first
    let imageUrl: string | undefined;
    let videoUrl: string | undefined;

    if (mediaFile.type === 'video' && mediaFile.dataBase64) {
      const videoResult = await media.upload(mediaFile.dataBase64, 'video');
      videoUrl = videoResult.url;
      // Upload thumbnail as image
      if (mediaFile.thumbnailBase64) {
        const thumbResult = await media.upload(mediaFile.thumbnailBase64, 'image');
        imageUrl = thumbResult.url;
      }
    } else if (mediaFile.type === 'image' && mediaFile.dataBase64) {
      const imgResult = await media.upload(mediaFile.dataBase64, 'image');
      imageUrl = imgResult.url;
    }

    await reels.create(title, {
      imageUrl,
      videoUrl,
      mediaType: mediaFile.type,
      duration: mediaFile.duration,
      isShort: mediaFile.duration ? mediaFile.duration <= 60 : true,
    });
    const newReels = await reels.list();
    setReelList(newReels);
  };

  // Profile handler
  const handleUpdateProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    await auth.updateProfile(data);
    setCurrentUser((prev) => (prev ? { ...prev, ...data } : prev));
  };

  // New feature handlers
  const handleBookmark = (postId: string) => {
    setBookmarkedPosts((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const handleReact = (postId: string, reaction: string) => {
    console.log(`Reacted to post ${postId} with ${reaction}`);
  };

  const handleShare = async (postId: string) => {
    const post = postList.find((p) => p.id === postId);
    if (post && navigator.share) {
      try {
        await navigator.share({
          title: 'UnderGround Post',
          text: post.text,
          url: window.location.href,
        });
      } catch (e) {
        console.log('Share cancelled');
      }
    }
  };

  const handleCreateStory = async (imageBase64: string) => {
    const newStory = {
      id: Date.now().toString(),
      userId: currentUser?.id || '',
      userName: currentUser?.displayName || '',
      userAvatar: currentUser?.avatar || null,
      imageBase64,
      createdAt: new Date().toISOString(),
      viewed: false,
    };
    setStories((prev) => [newStory, ...prev]);
  };

  const handleViewStory = (storyId: string) => {
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, viewed: true } : s))
    );
  };

  const handleSearchUsers = async (query: string) => {
    return messages.searchUsers(query);
  };

  const handleSearchChannels = (query: string) => {
    return channelList.filter(
      (c) => c.name.toLowerCase().includes(query.toLowerCase()) ||
             c.description.toLowerCase().includes(query.toLowerCase())
    );
  };

  const handleSearchPosts = (query: string) => {
    return postList.filter((p) => p.text.toLowerCase().includes(query.toLowerCase()));
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleSettingsChange = (newSettings: Partial<AppSettings>) => {
    setAppSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem("underground_settings", JSON.stringify(updated));
      return updated;
    });
  };

  // Tab config
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "feed", label: "Feed", icon: <HomeIcon size={20} /> },
    { id: "reels", label: "Reels", icon: <ReelsIcon size={20} /> },
    { id: "canali", label: "Canali", icon: <HashIcon size={20} /> },
    { id: "gruppi", label: "Gruppi", icon: <GroupIcon size={20} /> },
    { id: "messaggi", label: "Messaggi", icon: <MessageIcon size={20} /> },
    { id: "crea", label: "Crea", icon: <PlusIcon size={20} /> },
    { id: "profilo", label: "Profilo", icon: <UserIcon size={20} /> },
    ...(currentUser?.role === 'admin' ? [{ id: "admin", label: "Admin", icon: <AdminIcon size={20} /> }] : []),
  ];

  const joinedChannels = channelList.filter((c) => c.joined);

  // Login/Register screen
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center">
            <h1 className="mx-auto mb-2 text-4xl font-black">
              <span className="animate-gradient-text bg-gradient-to-r from-pink-500 via-orange-400 to-violet-500 bg-[length:200%_auto] bg-clip-text text-transparent">
                UnderGround
              </span>
            </h1>
            <p className="text-slate-400">Social platform per la Gen-Z</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <div className="mb-6 flex rounded-xl bg-white/5 p-1">
              <button
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  authMode === "login" ? "bg-pink-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Accedi
              </button>
              <button
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  authMode === "register" ? "bg-pink-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Registrati
              </button>
            </div>

            <form onSubmit={authMode === "login" ? handleLogin : handleRegister}>
              <div className="space-y-4">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 outline-none focus:border-pink-400"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 outline-none focus:border-pink-400"
                />

                {authMode === "register" && (
                  <>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Nome visualizzato"
                      className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 outline-none focus:border-pink-400"
                    />
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Età"
                      min="13"
                      max="120"
                      className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 outline-none focus:border-pink-400"
                    />
                  </>
                )}

                {authError && (
                  <p className="rounded-lg bg-red-500/20 p-3 text-sm text-red-400">{authError}</p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 py-3 font-bold transition hover:opacity-90 disabled:opacity-50"
                >
                  {authLoading
                    ? "Caricamento..."
                    : authMode === "login"
                    ? "Accedi"
                    : "Registrati"}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // Get dynamic styles based on current settings
  const isDark = appSettings.darkMode;
  const colors = themeColors[appSettings.theme];
  
  const appStyles: React.CSSProperties = {
    background: isDark 
      ? 'linear-gradient(to bottom right, #020617, #0f172a, #020617)'
      : 'linear-gradient(to bottom right, #f8fafc, #f1f5f9, #f8fafc)',
    color: isDark ? '#ffffff' : '#0f172a',
    minHeight: '100vh',
  };

  const headerStyles: React.CSSProperties = {
    backgroundColor: isDark ? 'rgba(2, 6, 23, 0.9)' : 'rgba(248, 250, 252, 0.95)',
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  };

  const cardStyles: React.CSSProperties = {
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(226, 232, 240, 0.8)',
    color: isDark ? '#ffffff' : '#0f172a',
  };

  const mutedTextColor = isDark ? '#94a3b8' : '#64748b';
  const buttonBgColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  // Main app
  if (currentUser?.banned) {
    return <BannedScreen reason={currentUser.banReason || undefined} />;
  }

  return (
    <div style={appStyles}>
      {/* Header */}
      <header 
        className="sticky top-0 z-40 border-b backdrop-blur-lg"
        style={headerStyles}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <h1 className="text-xl font-black">
              <span className="animate-gradient-text bg-gradient-to-r from-pink-500 via-orange-400 to-violet-500 bg-[length:200%_auto] bg-clip-text text-transparent">
                UnderGround
              </span>
            </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="rounded-lg bg-white/10 p-2 transition hover:bg-white/20"
              aria-label="Cerca"
            >
              <SearchIcon size={20} />
            </button>
            <button
              onClick={() => setShowNotifications(true)}
              className="relative rounded-lg bg-white/10 p-2 transition hover:bg-white/20"
              aria-label="Notifiche"
            >
              <BellIcon size={20} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-xs font-bold">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg bg-white/10 p-2 transition hover:bg-white/20"
              aria-label="Impostazioni"
            >
              <SettingsIcon size={20} />
            </button>
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.displayName}
                className="h-9 w-9 cursor-pointer rounded-full object-cover"
                onClick={() => setActiveTab("profilo")}
              />
            ) : (
              <div
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 font-bold"
                onClick={() => setActiveTab("profilo")}
              >
                {currentUser?.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <nav 
        className="sticky top-14 z-30 border-b backdrop-blur-lg"
        style={headerStyles}
      >
        <div className="mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto px-4 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-pink-500 to-orange-500 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "messaggi" && unreadMessages > 0 && (
                <span className="rounded-full bg-pink-500 px-1.5 py-0.5 text-xs">{unreadMessages}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-400">Caricamento dati...</p>
          </div>
        )}

        {/* Error state */}
        {dataError && !isLoading && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-red-400">{dataError}</p>
            <button
              onClick={() => loadAllData()}
              className="mt-4 rounded-lg bg-pink-500 px-4 py-2 text-white hover:bg-pink-600"
            >
              Riprova
            </button>
          </div>
        )}

        {!isLoading && !dataError && (
          <AnimatePresence mode="wait">
          {activeTab === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Stories */}
              <Stories
                stories={stories}
                currentUserId={currentUser?.id || ""}
                onCreateStory={handleCreateStory}
                onViewStory={handleViewStory}
              />
              
              <Feed
                posts={postList}
                channels={channelList}
                currentUserId={currentUser?.id || ""}
                bookmarkedPosts={bookmarkedPosts}
                onLike={handleLikePost}
                onComment={handleCommentPost}
                onDelete={handleDeletePost}
                onLoadComments={handleLoadComments}
                onBookmark={handleBookmark}
                onReact={handleReact}
                onShare={handleShare}
              />
            </motion.div>
          )}

          {activeTab === "reels" && (
            <motion.div
              key="reels"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ReelsComponent
                reels={reelList}
                currentUserId={currentUser?.id || ""}
                onLike={handleLikeReel}
                onCreate={handleCreateReel}
              />
            </motion.div>
          )}

          {activeTab === "canali" && (
            <motion.div
              key="canali"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Channels
                channels={channelList}
                onJoin={handleJoinChannel}
                onLeave={handleLeaveChannel}
                onCreate={handleCreateChannel}
                onLoadPosts={posts.byChannel}
              />
            </motion.div>
          )}

          {activeTab === "gruppi" && (
            <motion.div
              key="gruppi"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Groups
                groups={groupList}
                currentUserId={currentUser?.id || ""}
                friends={friendList}
                onCreate={handleCreateGroup}
                onInvite={handleInviteToGroup}
                onLeave={handleLeaveGroup}
                onLoadMembers={groups.members}
                onLoadMessages={groups.messages}
                onSendMessage={(groupId, text) => socket.sendGroupMessage(groupId, text)}
                onJoinRoom={socket.joinGroup}
                onLeaveRoom={socket.leaveGroup}
                onNewMessage={socket.onGroupMessage}
              />
            </motion.div>
          )}

          {activeTab === "messaggi" && (
            <motion.div
              key="messaggi"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Messages
                conversations={conversationList}
                currentUserId={currentUser?.id || ""}
                onLoadMessages={messages.list}
                onSendMessage={(receiverId, text) => socket.sendDM(receiverId, text)}
                onSearchUsers={messages.searchUsers}
                unreadCount={unreadMessages}
                onlineUsers={socket.onlineUsers}
                typingUsers={socket.typingUsers}
                onStartTyping={(recipientId) => socket.startTyping(recipientId)}
                onStopTyping={(recipientId) => socket.stopTyping(recipientId)}
                onNewMessage={socket.onDMReceive}
              />
            </motion.div>
          )}

          {activeTab === "crea" && (
            <motion.div
              key="crea"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CreatePost channels={joinedChannels} currentUser={currentUser!} onPublish={handleCreatePost} />
            </motion.div>
          )}

          {activeTab === "profilo" && currentUser && (
            <motion.div
              key="profilo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Profile user={currentUser} onUpdate={handleUpdateProfile} onLogout={handleLogout} />
            </motion.div>
          )}

          {activeTab === "admin" && currentUser?.role === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AdminPanel />
            </motion.div>
          )}
          </AnimatePresence>
        )}
      </main>

      {/* Search Panel */}
      <SearchPanel
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSearchUsers={handleSearchUsers}
        onSearchChannels={handleSearchChannels}
        onSearchPosts={handleSearchPosts}
        onSelectUser={(user) => {
          setShowSearch(false);
          setActiveTab("messaggi");
        }}
        onSelectChannel={(channel) => {
          setShowSearch(false);
          setActiveTab("canali");
        }}
      />

      {/* Notifications Panel */}
      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onNotificationClick={(notification) => {
          setShowNotifications(false);
        }}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        user={currentUser}
        settings={appSettings}
        onSettingsChange={handleSettingsChange}
        onUpdateProfile={handleUpdateProfile}
      />
    </div>
  );
}
