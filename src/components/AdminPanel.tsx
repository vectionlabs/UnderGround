import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { admin } from '../hooks/useApi';
import { AdminIcon, BanIcon, MuteIcon, DeleteIcon, CheckIcon, XIcon } from './Icons';
import type { AdminUser } from '../hooks/useApi';

export default function AdminPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await admin.users();
      setUsers(data);
    } catch (e: any) {
      setError(e.message || 'Errore caricamento utenti');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    action: () => Promise<any>,
    successMsg: string,
    userId: string
  ) => {
    setActionLoading(userId);
    try {
      await action();
      await loadUsers(); // Refresh
    } catch (e: any) {
      setError(e.message || 'Errore azione');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <p className="text-center text-slate-400">Caricamento...</p>;
  if (error) return <p className="text-center text-red-400">{error}</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-pink-400">🛡️ Pannello Admin</h2>
      <div className="space-y-2">
        {users.map((user) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-slate-800/50 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.displayName} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 font-bold">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold">{user.displayName}</p>
                  <p className="text-xs text-slate-400">@{user.username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {user.role === 'admin' && <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400">ADMIN</span>}
                    {user.banned && <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">BANNED</span>}
                    {user.muted && <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-400">MUTED</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Ban/Unban */}
                {user.banned ? (
                  <button
                    onClick={() =>
                      handleAction(() => admin.unban(user.id), 'Utente sbannato', user.id)
                    }
                    disabled={actionLoading === user.id}
                    className="rounded-lg bg-green-500/20 px-3 py-1 text-xs text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                  >
                    {actionLoading === user.id ? '...' : <CheckIcon size={14} />}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const reason = prompt('Motivo del ban?');
                      if (reason) handleAction(() => admin.ban(user.id, reason), 'Utente bannato', user.id);
                    }}
                    disabled={actionLoading === user.id || user.role === 'admin'}
                    className="rounded-lg bg-red-500/20 px-3 py-1 text-xs text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                  >
                    {actionLoading === user.id ? '...' : <BanIcon size={14} />}
                  </button>
                )}

                {/* Mute/Unmute */}
                {user.muted ? (
                  <button
                    onClick={() =>
                      handleAction(() => admin.unmute(user.id), 'Utente smutato', user.id)
                    }
                    disabled={actionLoading === user.id}
                    className="rounded-lg bg-green-500/20 px-3 py-1 text-xs text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                  >
                    {actionLoading === user.id ? '...' : <CheckIcon size={14} />}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const reason = prompt('Motivo del mute?');
                      if (reason) handleAction(() => admin.mute(user.id, reason), 'Utente mutato', user.id);
                    }}
                    disabled={actionLoading === user.id || user.role === 'admin'}
                    className="rounded-lg bg-yellow-500/20 px-3 py-1 text-xs text-yellow-400 hover:bg-yellow-500/30 disabled:opacity-50"
                  >
                    {actionLoading === user.id ? '...' : <MuteIcon size={14} />}
                  </button>
                )}
              </div>
            </div>

            {/* Ban/Mute reasons */}
            {(user.banReason || user.muteReason) && (
              <div className="mt-2 text-xs text-slate-400">
                {user.banReason && <p className="text-red-400">Ban: {user.banReason}</p>}
                {user.muteReason && <p className="text-yellow-400">Mute: {user.muteReason}</p>}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
