import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlusIcon, SearchIcon, CheckIcon, XIcon, UsersIcon } from './Icons';
import type { User, Friend, FriendRequest } from '../hooks/useApi';
import { friends } from '../hooks/useApi';

type FriendsProps = {
  currentUserId: string;
  friends: Friend[];
  onRefreshFriends: () => void;
};

export default function Friends({ currentUserId, friends, onRefreshFriends }: FriendsProps) {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load friend requests
  useEffect(() => {
    loadFriendRequests();
  }, []);

  const loadFriendRequests = async () => {
    try {
      const requests = await friends.requests();
      setFriendRequests(requests);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await friends.searchUsers(searchQuery);
      // Filter out current user and existing friends
      const filteredResults = results.filter(user => 
        user.id !== currentUserId && 
        !friends.some(f => f.friendId === user.id)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setLoading(true);
    try {
      await friends.send(userId);
      alert('Richiesta di amicizia inviata!');
      // Remove from search results
      setSearchResults(prev => prev.filter(user => user.id !== userId));
    } catch (error: any) {
      alert(error.message || 'Errore nell\'invio della richiesta');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await friends.accept(requestId);
      alert('Richiesta accettata!');
      loadFriendRequests();
      onRefreshFriends();
    } catch (error: any) {
      alert(error.message || 'Errore nell\'accettazione');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await friends.decline(requestId);
      loadFriendRequests();
    } catch (error: any) {
      alert(error.message || 'Errore nel rifiuto');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('Sei sicuro di voler rimuovere questo amico?')) return;
    
    try {
      await friends.remove(friendId);
      alert('Amico rimosso');
      onRefreshFriends();
    } catch (error: any) {
      alert(error.message || 'Errore nella rimozione');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'friends'
              ? 'border-b-2 border-pink-500 text-pink-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UsersIcon size={18} className="mr-2 inline" />
          Amici ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'requests'
              ? 'border-b-2 border-pink-500 text-pink-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserPlusIcon size={18} className="mr-2 inline" />
          Richieste ({friendRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'search'
              ? 'border-b-2 border-pink-500 text-pink-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <SearchIcon size={18} className="mr-2 inline" />
          Cerca
        </button>
      </div>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {friends.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-slate-800/50 p-8 text-center">
              <UsersIcon size={48} className="mx-auto mb-4 text-slate-500" />
              <p className="text-slate-400">Non hai ancora amici</p>
              <p className="mt-2 text-sm text-slate-500">Cerca utenti o aggiungi amici dai post!</p>
            </div>
          ) : (
            friends.map((friend) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/50 p-4"
              >
                <div className="flex items-center gap-3">
                  {friend.friendAvatar ? (
                    <img
                      src={friend.friendAvatar}
                      alt={friend.friendUsername}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-lg font-bold">
                      {friend.friendUsername.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{friend.friendUsername}</p>
                    <p className="text-sm text-slate-400">Amico dal {new Date(friend.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFriend(friend.id)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-500/20 hover:text-red-400"
                  title="Rimuovi amico"
                >
                  <XIcon size={18} />
                </button>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {friendRequests.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-slate-800/50 p-8 text-center">
              <UserPlusIcon size={48} className="mx-auto mb-4 text-slate-500" />
              <p className="text-slate-400">Nessuna richiesta di amicizia</p>
            </div>
          ) : (
            friendRequests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/50 p-4"
              >
                <div className="flex items-center gap-3">
                  {request.requesterAvatar ? (
                    <img
                      src={request.requesterAvatar}
                      alt={request.requesterUsername}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-lg font-bold">
                      {request.requesterUsername.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{request.requesterUsername}</p>
                    <p className="text-sm text-slate-400">Ti ha inviato una richiesta</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(request.id)}
                    className="rounded-lg bg-green-500 px-3 py-2 text-white transition hover:bg-green-600"
                  >
                    <CheckIcon size={16} />
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(request.id)}
                    className="rounded-lg bg-red-500 px-3 py-2 text-white transition hover:bg-red-600"
                  >
                    <XIcon size={16} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Cerca per nickname..."
              className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-4 py-3 outline-none focus:border-pink-400"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="rounded-lg bg-pink-500 px-6 py-3 font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50"
            >
              {searching ? 'Ricerca...' : 'Cerca'}
            </button>
          </div>

          {searchResults.length === 0 && searchQuery && !searching && (
            <div className="rounded-xl border border-white/10 bg-slate-800/50 p-8 text-center">
              <SearchIcon size={48} className="mx-auto mb-4 text-slate-500" />
              <p className="text-slate-400">Nessun utente trovato</p>
            </div>
          )}

          <div className="space-y-3">
            {searchResults.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/50 p-4"
              >
                <div className="flex items-center gap-3">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-lg font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{user.username}</p>
                    <p className="text-sm text-slate-400">{user.displayName || user.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSendRequest(user.id)}
                  disabled={loading}
                  className="rounded-lg bg-pink-500 px-4 py-2 font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50"
                >
                  <UserPlusIcon size={16} className="mr-2 inline" />
                  Aggiungi
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
