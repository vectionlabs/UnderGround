const API_BASE = '/api';

function getUserId(): string | null {
  return localStorage.getItem('underground_userId');
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  skipAuth?: boolean;
};

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuth = false } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const userId = getUserId();
  if (userId && !skipAuth) {
    headers['x-user-id'] = userId;
  }

  // Add timeout and retry logic
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Errore di rete' }));
      throw new Error(error.error || 'Errore sconosciuto');
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    
    // Retry once for network errors
    if (err.name === 'AbortError' || err.message.includes('fetch')) {
      console.warn(`Retrying ${endpoint}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({ error: 'Errore di rete' }));
        throw new Error(error.error || 'Errore sconosciuto');
      }
      
      return retryResponse.json();
    }
    
    throw err;
  }
}

// Auth
export const auth = {
  register: (username: string, password: string, displayName: string, age: number) =>
    apiRequest<{ success: boolean; user?: User; error?: string }>('/auth/register', { 
      method: 'POST', 
      body: { username, password, displayName, age },
      skipAuth: true 
    }),
  
  login: (username: string, password: string) =>
    apiRequest<{ success: boolean; user?: User; error?: string }>('/auth/login', { 
      method: 'POST', 
      body: { username, password },
      skipAuth: true 
    }),
  
  logout: () =>
    apiRequest('/auth/logout', { method: 'POST' }),
  
  getUser: (id: string) =>
    apiRequest<User>(`/auth/users/${id}`, { skipAuth: true }),
  
  updateProfile: (data: Partial<User>) =>
    apiRequest<User>('/auth/profile', { method: 'PATCH', body: data }),
};

// Posts
export const posts = {
  list: () =>
    apiRequest<Post[]>('/posts'),
  
  byChannel: (channelId: string) =>
    apiRequest<Post[]>(`/posts/channel/${channelId}`),
  
  create: (text: string, channelId: string, media: MediaFile | null, publishAs: string | null = null) =>
    apiRequest<Post>('/posts', { method: 'POST', body: { text, channelId, media, publishAs } }),
  
  like: (postId: string) =>
    apiRequest<{ liked: boolean; likeCount: number }>(`/posts/${postId}/like`, { method: 'POST' }),
  
  comments: (postId: string) =>
    apiRequest<Comment[]>(`/posts/${postId}/comments`),
  
  comment: (postId: string, text: string) =>
    apiRequest<Comment>(`/posts/${postId}/comments`, { method: 'POST', body: { text } }),
  
  delete: (postId: string) =>
    apiRequest(`/posts/${postId}`, { method: 'DELETE' }),
};

// Channels
export const channels = {
  list: () =>
    apiRequest<Channel[]>('/channels'),
  
  joined: () =>
    apiRequest<Channel[]>('/channels/joined'),
  
  create: (name: string, description: string, icon: string) =>
    apiRequest<Channel>('/channels', { method: 'POST', body: { name, description, icon } }),
  
  join: (channelId: string) =>
    apiRequest<{ joined: boolean; memberCount: number }>(`/channels/${channelId}/join`, { method: 'POST' }),
  
  leave: (channelId: string) =>
    apiRequest<{ joined: boolean; memberCount: number }>(`/channels/${channelId}/leave`, { method: 'POST' }),
};

// Groups
export const groups = {
  list: () =>
    apiRequest<Group[]>('/groups'),
  
  create: (name: string, description: string, avatar: string | null) =>
    apiRequest<Group>('/groups', { method: 'POST', body: { name, description, avatar } }),
  
  members: (groupId: string) =>
    apiRequest<GroupMember[]>(`/groups/${groupId}/members`),
  
  invite: (groupId: string, username: string) =>
    apiRequest(`/groups/${groupId}/invite`, { method: 'POST', body: { username } }),
  
  leave: (groupId: string) =>
    apiRequest(`/groups/${groupId}/leave`, { method: 'POST' }),
  
  messages: (groupId: string) =>
    apiRequest<GroupMessage[]>(`/groups/${groupId}/messages`),
  
  sendMessage: (groupId: string, text: string) =>
    apiRequest<GroupMessage>(`/groups/${groupId}/messages`, { method: 'POST', body: { text } }),
};

// Direct Messages
export const messages = {
  conversations: () =>
    apiRequest<Conversation[]>('/messages/conversations'),
  
  list: (otherId: string) =>
    apiRequest<DirectMessage[]>(`/messages/with/${otherId}`),
  
  send: (receiverId: string, text: string) =>
    apiRequest<DirectMessage>('/messages/send', { method: 'POST', body: { receiverId, text } }),
  
  unreadCount: () =>
    apiRequest<number>('/messages/unread').then(r => typeof r === 'number' ? r : (r as any).count || 0),
  
  searchUsers: (q: string) =>
    apiRequest<User[]>(`/messages/search-users?q=${encodeURIComponent(q)}`),
};

// Friends
export const friends = {
  list: () =>
    apiRequest<Friend[]>('/friends'),
  
  requests: () =>
    apiRequest<FriendRequest[]>('/friends/requests'),
  
  send: (userId: string) =>
    apiRequest<{ success: boolean }>('/friends/request', { method: 'POST', body: { userId } }),
  
  accept: (requestId: string) =>
    apiRequest<{ success: boolean }>(`/friends/accept/${requestId}`, { method: 'POST' }),
  
  decline: (requestId: string) =>
    apiRequest<{ success: boolean }>(`/friends/decline/${requestId}`, { method: 'POST' }),
  
  remove: (friendId: string) =>
    apiRequest<{ success: boolean }>(`/friends/${friendId}`, { method: 'DELETE' }),

  searchUsers: (query: string) =>
    apiRequest<User[]>(`/friends/search?q=${encodeURIComponent(query)}`),
};

// Admin
export const admin = {
  users: () =>
    apiRequest<AdminUser[]>('/admin/users'),
  ban: (userId: string, reason?: string) =>
    apiRequest<{ success: boolean }>(`/admin/ban/${userId}`, { method: 'POST', body: { reason } }),
  unban: (userId: string) =>
    apiRequest<{ success: boolean }>(`/admin/unban/${userId}`, { method: 'POST' }),
  mute: (userId: string, reason?: string) =>
    apiRequest<{ success: boolean }>(`/admin/mute/${userId}`, { method: 'POST', body: { reason } }),
  unmute: (userId: string) =>
    apiRequest<{ success: boolean }>(`/admin/unmute/${userId}`, { method: 'POST' }),
  deletePost: (postId: string) =>
    apiRequest<{ success: boolean }>(`/admin/posts/${postId}`, { method: 'DELETE' }),
  deleteReel: (reelId: string) =>
    apiRequest<{ success: boolean }>(`/admin/reels/${reelId}`, { method: 'DELETE' }),
  deleteChannel: (channelId: string) =>
    apiRequest<{ success: boolean }>(`/admin/channels/${channelId}`, { method: 'DELETE' }),
  deleteComment: (commentId: string) =>
    apiRequest<{ success: boolean }>(`/admin/comments/${commentId}`, { method: 'DELETE' }),
};

// Media upload (Supabase Storage)
export const media = {
  upload: (data: string, type: string, fileName?: string) =>
    apiRequest<{ url: string; path?: string; size: number; fallback?: boolean }>('/media/upload', {
      method: 'POST',
      body: { data, type, fileName },
    }),
};

// Reels
export const reels = {
  list: () =>
    apiRequest<Reel[]>('/reels'),
  
  create: (title: string, mediaData: { imageUrl?: string; videoUrl?: string; mediaType: string; duration?: number; isShort?: boolean }) =>
    apiRequest<Reel>('/reels', { method: 'POST', body: { 
      title, 
      imageBase64: mediaData.imageUrl || null,
      videoBase64: mediaData.videoUrl || null,
      mediaType: mediaData.mediaType,
      duration: mediaData.duration,
      isShort: mediaData.isShort ?? true,
    } }),
  
  like: (reelId: string) =>
    apiRequest<{ liked: boolean; likeCount: number }>(`/reels/${reelId}/like`, { method: 'POST' }),
  
  delete: (reelId: string) =>
    apiRequest(`/reels/${reelId}`, { method: 'DELETE' }),
};

// Types
export type User = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  banner: string | null;
  bio: string;
  status: 'online' | 'offline' | 'busy' | 'invisible';
  mood: string;
  theme: 'sunset' | 'ocean' | 'mint';
  badges: string[];
  socialLinks: { instagram?: string; tiktok?: string; youtube?: string };
  age: number;
  privateProfile: boolean;
  safeComments: boolean;
  role: 'admin' | 'user';
  banned: boolean;
  banReason: string | null;
  muted: boolean;
  muteReason: string | null;
  createdAt: string;
};

export type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  role: 'admin' | 'user';
  banned: boolean;
  banReason: string | null;
  muted: boolean;
  muteReason: string | null;
  status: string;
  createdAt: string;
};

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  channelId: string | null;
  text: string;
  imageBase64: string | null;
  videoBase64: string | null;
  documentBase64: string | null;
  documentName: string | null;
  documentType: string | null;
  mediaType: 'text' | 'image' | 'video' | 'document';
  likeCount: number;
  commentCount: number;
  liked: boolean;
  createdAt: string;
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  text: string;
  createdAt: string;
};

export type Channel = {
  id: string;
  name: string;
  description: string;
  icon: string;
  isPublic: boolean;
  memberCount: number;
  joined: boolean;
  createdBy: string | null;
  creatorName: string | null;
  createdAt: string;
};

export type Group = {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  adminId: string;
  adminName: string;
  memberCount: number;
  role: 'admin' | 'member' | null;
  isMember: boolean;
  createdAt: string;
};

export type GroupMember = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  status: string;
  role: 'admin' | 'member';
};

export type GroupMessage = {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  text: string;
  createdAt: string;
};

export type DirectMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  receiverId: string;
  text: string;
  read: boolean;
  createdAt: string;
};

export type Conversation = {
  user: User;
  lastMessage: DirectMessage;
  unreadCount: number;
};

export type Reel = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  title: string;
  imageBase64: string | null;
  videoBase64: string | null;
  mediaType: 'image' | 'video';
  duration: number;
  isShort: boolean;
  likeCount: number;
  liked: boolean;
  createdAt: string;
};

export type MediaFile = {
  type: 'image' | 'video' | 'document';
  dataBase64: string;
  thumbnailBase64?: string;
  fileName?: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
};

export type Friend = {
  id: string;
  oderId: string;
  friendId: string;
  friendUsername: string;
  friendDisplayName: string;
  friendAvatar: string | null;
  friendStatus: string;
  createdAt: string;
};

export type FriendRequest = {
  id: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatar: string | null;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
};
