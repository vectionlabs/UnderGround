import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageIcon, SendIcon, SearchIcon, CloseIcon, TypingIcon, OnlineIcon } from './Icons';
import type { Conversation, DirectMessage, User } from '../hooks/useApi';

type OnlineUser = {
  oderId: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

type TypingState = {
  oderId: string;
  username: string;
  typing: boolean;
};

type MessagesProps = {
  conversations: Conversation[];
  currentUserId: string;
  onLoadMessages: (userId: string) => Promise<DirectMessage[]>;
  onSendMessage: (receiverId: string, text: string) => void;
  onSearchUsers: (query: string) => Promise<User[]>;
  unreadCount: number;
  onlineUsers: OnlineUser[];
  typingUsers: Map<string, TypingState>;
  onStartTyping: (recipientId: string) => void;
  onStopTyping: (recipientId: string) => void;
  onNewMessage: (callback: (msg: DirectMessage) => void) => void;
};

export default function Messages({
  conversations,
  currentUserId,
  onLoadMessages,
  onSendMessage,
  onSearchUsers,
  unreadCount,
  onlineUsers,
  typingUsers,
  onStartTyping,
  onStopTyping,
  onNewMessage,
}: MessagesProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedUserRef = useRef<string | null>(null);

  // Track selected user for real-time updates
  useEffect(() => {
    selectedUserRef.current = selectedUser?.id || null;
  }, [selectedUser?.id]);

  // Handle real-time messages
  useEffect(() => {
    onNewMessage((msg: DirectMessage) => {
      const currentSelectedId = selectedUserRef.current;
      if (
        currentSelectedId &&
        (msg.senderId === currentSelectedId || msg.receiverId === currentSelectedId)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });
  }, [onNewMessage]);

  // Load messages when selecting a user
  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser.id);
    }
  }, [selectedUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      setSearching(true);
      const timeout = setTimeout(async () => {
        try {
          const results = await onSearchUsers(searchQuery);
          setSearchResults(results);
        } catch (e) {
          console.error(e);
        } finally {
          setSearching(false);
        }
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadMessages = async (userId: string) => {
    try {
      const msgs = await onLoadMessages(userId);
      setMessages(msgs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTyping = useCallback(() => {
    if (!selectedUser) return;
    
    if (!isTyping) {
      setIsTyping(true);
      onStartTyping(selectedUser.id);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (selectedUser) onStopTyping(selectedUser.id);
    }, 2000);
  }, [selectedUser, isTyping, onStartTyping, onStopTyping]);

  const handleSend = () => {
    if (!selectedUser || !messageDraft.trim()) return;
    const text = messageDraft.trim();
    setMessageDraft('');
    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onStopTyping(selectedUser.id);
    onSendMessage(selectedUser.id, text);
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.some((u) => u.oderId === userId);
  };

  const getTypingIndicator = () => {
    if (!selectedUser) return null;
    const key = `dm:${selectedUser.id}`;
    const typing = typingUsers.get(key);
    if (typing?.typing) {
      return (
        <span className="flex items-center gap-1 text-pink-400">
          <TypingIcon size={16} />
          <span className="text-sm">{typing.username} sta scrivendo</span>
        </span>
      );
    }
    return null;
  };

  const startConversation = (user: User) => {
    setSelectedUser(user);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
      {/* Conversations List */}
      <div className="w-80 border-r border-white/10">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Messaggi</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-pink-500 px-2 py-0.5 text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="mt-3 flex w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-white/15"
          >
            <SearchIcon size={16} />
            Cerca utenti...
          </button>
        </div>

        {/* Search */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-white/10 overflow-hidden"
            >
              <div className="p-3">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca per username..."
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-pink-400"
                  autoFocus
                />
                {searching && <p className="mt-2 text-center text-xs text-slate-400">Ricerca...</p>}
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => startConversation(user)}
                        className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition hover:bg-white/10"
                      >
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.displayName} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm">
                            {user.displayName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">{user.displayName}</p>
                          <p className="text-xs text-slate-400">@{user.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation List */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 120px)' }}>
          {conversations.length === 0 && !showSearch && (
            <div className="p-6 text-center">
              <MessageIcon size={32} className="mx-auto mb-2 text-slate-500" />
              <p className="text-sm text-slate-400">Nessuna conversazione</p>
              <p className="mt-1 text-xs text-slate-500">Cerca un utente per iniziare</p>
            </div>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.user.id}
              onClick={() => setSelectedUser(conv.user)}
              className={`flex w-full items-center gap-3 border-b border-white/5 p-4 text-left transition hover:bg-white/5 ${
                selectedUser?.id === conv.user.id ? 'bg-white/10' : ''
              }`}
            >
              <div className="relative">
                {conv.user.avatar ? (
                  <img src={conv.user.avatar} alt={conv.user.displayName} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 font-bold">
                    {conv.user.displayName.charAt(0)}
                  </div>
                )}
                {conv.user.status === 'online' && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500" />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{conv.user.displayName}</p>
                  <span className="text-xs text-slate-400">{formatTime(conv.lastMessage.createdAt)}</span>
                </div>
                <p className="truncate text-sm text-slate-400">
                  {conv.lastMessage.senderId === currentUserId ? 'Tu: ' : ''}
                  {conv.lastMessage.text}
                </p>
              </div>
              {conv.unreadCount > 0 && (
                <span className="rounded-full bg-pink-500 px-2 py-0.5 text-xs font-bold">
                  {conv.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div className="flex items-center gap-3">
                {selectedUser.avatar ? (
                  <img src={selectedUser.avatar} alt={selectedUser.displayName} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 font-bold">
                    {selectedUser.displayName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold">{selectedUser.displayName}</p>
                  <div className="text-xs text-slate-400">
                    {getTypingIndicator() || (
                      isUserOnline(selectedUser.id) ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <OnlineIcon size={10} />
                          <span>Online</span>
                        </span>
                      ) : (
                        'Offline'
                      )
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10"
                aria-label="Chiudi chat"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%]`}>
                      <div className={`rounded-2xl px-4 py-2 ${isMe ? 'bg-pink-500' : 'bg-slate-700'}`}>
                        <p>{msg.text}</p>
                      </div>
                      <p className={`mt-1 text-xs text-slate-500 ${isMe ? 'text-right' : ''}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/10 p-4">
              <div className="flex gap-2">
                <input
                  value={messageDraft}
                  onChange={(e) => {
                    setMessageDraft(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-4 py-2 outline-none focus:border-pink-400"
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button
                  onClick={handleSend}
                  className="rounded-lg bg-pink-500 px-4 py-2 transition hover:bg-pink-600"
                  aria-label="Invia messaggio"
                >
                  <SendIcon size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <MessageIcon size={64} className="mb-4 text-slate-600" />
            <p className="text-lg font-medium text-slate-400">Seleziona una conversazione</p>
            <p className="mt-1 text-sm text-slate-500">o cerca un utente per iniziare a chattare</p>
          </div>
        )}
      </div>
    </div>
  );
}
