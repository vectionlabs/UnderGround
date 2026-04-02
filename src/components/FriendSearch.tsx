import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SearchIcon, UserPlusIcon, CheckIcon, XIcon } from './Icons';
import type { User } from '../hooks/useApi';
import { friends } from '../hooks/useApi';

type FriendSearchProps = {
  currentUserId: string;
  onSendFriendRequest: (userId: string) => void;
};

export default function FriendSearch({ currentUserId, onSendFriendRequest }: FriendSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendRequests, setFriendRequests] = useState<string[]>([]); // Track sent requests

  // Search users
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const searchUsers = async () => {
      setIsSearching(true);
      try {
        const results = await friends.searchUsers(searchQuery);
        // Filter out current user and existing friends
        const filtered = results.filter(user => 
          user.id !== currentUserId && 
          !user.isFriend
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentUserId]);

  const handleSendRequest = async (userId: string) => {
    try {
      await onSendFriendRequest(userId);
      setFriendRequests(prev => [...prev, userId]);
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold mb-2">Trova Amici</h1>
        <p className="text-slate-400">Cerca utenti per nickname e invia richieste di amicizia</p>
      </motion.div>

      {/* Search Input */}
      <div className="relative mb-6">
        <SearchIcon size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca per nickname..."
          className="w-full rounded-xl border border-white/10 bg-slate-800/50 pl-10 pr-4 py-3 outline-none focus:border-pink-400"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-pink-500 border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Debug Button */}
      <div className="mb-6">
        <button
          onClick={async () => {
            try {
              const response = await fetch('/api/friends/debug/users', {
                headers: {
                  'x-user-id': currentUserId,
                },
              });
              const users = await response.json();
              console.log('🐛 Debug users:', users);
              alert(`Debug: Trovati ${users.length} utenti nel database. Controlla la console per i dettagli.`);
            } catch (error) {
              console.error('Debug error:', error);
              alert('Errore nel debug. Controlla la console.');
            }
          }}
          className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-400 hover:bg-yellow-500/20"
        >
          🐛 Debug: Mostra tutti gli utenti
        </button>
      </div>

      {/* Search Results */}
      {searchQuery.trim().length >= 2 && (
        <div className="space-y-3">
          {isSearching ? (
            <div className="text-center py-8 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent mx-auto mb-4"></div>
              <p>Ricerca utenti...</p>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/50 p-4"
              >
                <div className="flex items-center gap-3">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-lg font-bold">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="text-sm text-slate-400">@{user.username}</p>
                    {user.bio && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{user.bio}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {friendRequests.includes(user.id) ? (
                    <div className="flex items-center gap-1 text-green-400">
                      <CheckIcon size={16} />
                      <span className="text-sm">Richiesta inviata</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      className="flex items-center gap-2 rounded-lg bg-pink-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-600"
                    >
                      <UserPlusIcon size={16} />
                      Aggiungi
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">
              <XIcon size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nessun utente trovato</p>
              <p className="text-sm mt-2">Prova con un altro nickname</p>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {searchQuery.trim().length < 2 && (
        <div className="text-center py-12 text-slate-400">
          <SearchIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">Cerca nuovi amici</p>
          <p className="text-sm">Inserisci almeno 2 caratteri per iniziare la ricerca</p>
        </div>
      )}
    </div>
  );
}
