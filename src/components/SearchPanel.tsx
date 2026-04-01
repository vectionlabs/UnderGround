import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, CloseIcon, HashIcon, UserIcon, TrendingIcon } from './Icons';
import type { User, Channel, Post } from '../hooks/useApi';

type SearchPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onSearchUsers: (query: string) => Promise<User[]>;
  onSearchChannels: (query: string) => Channel[];
  onSearchPosts: (query: string) => Post[];
  onSelectUser: (user: User) => void;
  onSelectChannel: (channel: Channel) => void;
};

export default function SearchPanel({
  isOpen,
  onClose,
  onSearchUsers,
  onSearchChannels,
  onSearchPosts,
  onSelectUser,
  onSelectChannel,
}: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'channels' | 'posts'>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      setChannels([]);
      setPosts([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const [usersResult, channelsResult, postsResult] = await Promise.all([
          onSearchUsers(query).catch(() => []),
          Promise.resolve(onSearchChannels(query)),
          Promise.resolve(onSearchPosts(query)),
        ]);
        setUsers(usersResult);
        setChannels(channelsResult);
        setPosts(postsResult);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const filteredUsers = activeTab === 'all' || activeTab === 'users' ? users : [];
  const filteredChannels = activeTab === 'all' || activeTab === 'channels' ? channels : [];
  const filteredPosts = activeTab === 'all' || activeTab === 'posts' ? posts : [];
  const hasResults = filteredUsers.length > 0 || filteredChannels.length > 0 || filteredPosts.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="mx-auto max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 rounded-2xl bg-slate-900 p-4">
              <SearchIcon size={24} className="text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca utenti, canali, post..."
                className="flex-1 bg-transparent text-lg outline-none placeholder:text-slate-500"
              />
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            {/* Tabs */}
            {query && (
              <div className="mt-4 flex gap-2">
                {(['all', 'users', 'channels', 'posts'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      activeTab === tab
                        ? 'bg-pink-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {tab === 'all' ? 'Tutti' : tab === 'users' ? 'Utenti' : tab === 'channels' ? 'Canali' : 'Post'}
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            {query && (
              <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto rounded-2xl bg-slate-900 p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
                  </div>
                ) : !hasResults ? (
                  <div className="py-8 text-center text-slate-400">
                    Nessun risultato per "{query}"
                  </div>
                ) : (
                  <>
                    {/* Users */}
                    {filteredUsers.length > 0 && (
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
                          <UserIcon size={16} /> Utenti
                        </h3>
                        <div className="space-y-2">
                          {filteredUsers.slice(0, 5).map((user) => (
                            <div
                              key={user.id}
                              onClick={() => {
                                onSelectUser(user);
                                onClose();
                              }}
                              className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition hover:bg-white/5"
                            >
                              {user.avatar ? (
                                <img src={user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 font-bold">
                                  {user.displayName.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{user.displayName}</p>
                                <p className="text-sm text-slate-500">@{user.username}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Channels */}
                    {filteredChannels.length > 0 && (
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
                          <HashIcon size={16} /> Canali
                        </h3>
                        <div className="space-y-2">
                          {filteredChannels.slice(0, 5).map((channel) => (
                            <div
                              key={channel.id}
                              onClick={() => {
                                onSelectChannel(channel);
                                onClose();
                              }}
                              className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition hover:bg-white/5"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-xl">
                                {channel.icon.startsWith('data:image') ? (
                                  <img src={channel.icon} alt="" className="h-full w-full rounded-lg object-cover" />
                                ) : (
                                  channel.icon
                                )}
                              </div>
                              <div>
                                <p className="font-medium">#{channel.name}</p>
                                <p className="text-sm text-slate-500">{channel.memberCount} membri</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Posts */}
                    {filteredPosts.length > 0 && (
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
                          <TrendingIcon size={16} /> Post
                        </h3>
                        <div className="space-y-2">
                          {filteredPosts.slice(0, 5).map((post) => (
                            <div
                              key={post.id}
                              className="rounded-lg bg-slate-800/50 p-3"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{post.authorName}</span>
                                <span className="text-xs text-slate-500">
                                  {new Date(post.createdAt).toLocaleDateString('it-IT')}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm text-slate-300">{post.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Quick Suggestions */}
            {!query && (
              <div className="mt-4 rounded-2xl bg-slate-900 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
                  <TrendingIcon size={16} /> Tendenze
                </h3>
                <div className="space-y-2">
                  {['#gaming', '#musica', '#tech', '#arte', '#sport'].map((tag) => (
                    <div
                      key={tag}
                      onClick={() => setQuery(tag)}
                      className="cursor-pointer rounded-lg p-3 text-pink-400 transition hover:bg-white/5"
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
