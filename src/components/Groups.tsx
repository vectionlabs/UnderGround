import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GroupIcon, PlusIcon, CloseIcon, UsersIcon, SendIcon, CheckIcon, UserCheckIcon } from './Icons';
import ImageUploader from './ImageUploader';
import type { Group, GroupMember, GroupMessage, Friend } from '../hooks/useApi';

type GroupsProps = {
  groups: Group[];
  currentUserId: string;
  friends: Friend[];
  onCreate: (name: string, description: string, avatar: string | null, memberIds: string[]) => Promise<void>;
  onInvite: (groupId: string, username: string) => Promise<void>;
  onLeave: (groupId: string) => Promise<void>;
  onLoadMembers: (groupId: string) => Promise<GroupMember[]>;
  onLoadMessages: (groupId: string) => Promise<GroupMessage[]>;
  onSendMessage: (groupId: string, text: string) => void;
  onJoinRoom: (groupId: string) => void;
  onLeaveRoom: (groupId: string) => void;
  onNewMessage: (callback: (msg: GroupMessage) => void) => void;
};

export default function Groups({
  groups,
  currentUserId,
  friends,
  onCreate,
  onInvite,
  onLeave,
  onLoadMembers,
  onLoadMessages,
  onSendMessage,
  onJoinRoom,
  onLeaveRoom,
  onNewMessage,
}: GroupsProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createAvatar, setCreateAvatar] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedGroupRef = useRef<string | null>(null);

  // Track selected group for real-time updates
  useEffect(() => {
    selectedGroupRef.current = selectedGroup?.id || null;
  }, [selectedGroup?.id]);

  // Handle real-time messages
  useEffect(() => {
    onNewMessage((msg: GroupMessage) => {
      const currentGroupId = selectedGroupRef.current;
      if (currentGroupId && msg.groupId === currentGroupId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });
  }, [onNewMessage]);

  // Join/leave room when selecting a group
  useEffect(() => {
    if (selectedGroup) {
      onJoinRoom(selectedGroup.id);
      loadGroupData(selectedGroup.id);
      return () => {
        onLeaveRoom(selectedGroup.id);
      };
    }
  }, [selectedGroup?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadGroupData = async (groupId: string) => {
    try {
      const [msgs, mems] = await Promise.all([
        onLoadMessages(groupId),
        onLoadMembers(groupId),
      ]);
      setMessages(msgs);
      setMembers(mems);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMember = (friendId: string) => {
    setSelectedMembers(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      await onCreate(createName.trim(), createDesc.trim(), createAvatar, selectedMembers);
      setShowCreate(false);
      setCreateName('');
      setCreateDesc('');
      setCreateAvatar(null);
      setSelectedMembers([]);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = () => {
    if (!selectedGroup || !messageDraft.trim()) return;
    const text = messageDraft.trim();
    setMessageDraft('');
    onSendMessage(selectedGroup.id, text);
  };

  const handleInvite = async () => {
    if (!selectedGroup || !inviteUsername.trim()) return;
    setInviteError('');
    try {
      await onInvite(selectedGroup.id, inviteUsername.trim());
      setInviteUsername('');
      loadGroupData(selectedGroup.id);
    } catch (e: any) {
      setInviteError(e.message || 'Errore invito');
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Create Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 font-semibold transition hover:opacity-90"
        >
          <PlusIcon size={18} />
          Crea Gruppo
        </button>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center">
          <GroupIcon size={48} className="mx-auto mb-4 text-slate-500" />
          <p className="text-slate-400">Non sei in nessun gruppo.</p>
          <p className="mt-2 text-sm text-slate-500">Crea un gruppo per chattare con i tuoi amici!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedGroup(group)}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 p-4 transition hover:bg-slate-800/70"
            >
              <div className="flex items-center gap-4">
                {group.avatar ? (
                  <img src={group.avatar} alt={group.name} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500">
                    <GroupIcon size={24} />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{group.name}</p>
                  {group.description && <p className="text-sm text-slate-400">{group.description}</p>}
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <UsersIcon size={12} />
                    <span>{group.memberCount} membri</span>
                    {group.role === 'admin' && (
                      <span className="rounded bg-pink-500/20 px-1.5 py-0.5 text-pink-400">Admin</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Group Chat Modal */}
      <AnimatePresence>
        {selectedGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-slate-900"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <div className="flex items-center gap-3">
                  {selectedGroup.avatar ? (
                    <img src={selectedGroup.avatar} alt={selectedGroup.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500">
                      <GroupIcon size={20} />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{selectedGroup.name}</p>
                    <p className="text-xs text-slate-400">{members.length} membri</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMembers(!showMembers)}
                    className="rounded-lg bg-white/10 p-2 transition hover:bg-white/20"
                  >
                    <UsersIcon size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className="rounded-lg bg-white/10 p-2 transition hover:bg-white/20"
                  >
                    <CloseIcon size={18} />
                  </button>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Messages */}
                <div className="flex flex-1 flex-col">
                  <div className="flex-1 space-y-3 overflow-y-auto p-4">
                    {messages.map((msg) => {
                      const isMe = msg.senderId === currentUserId;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] ${isMe ? 'order-2' : ''}`}>
                            {!isMe && (
                              <p className="mb-1 text-xs text-slate-400">{msg.senderName}</p>
                            )}
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
                        onChange={(e) => setMessageDraft(e.target.value)}
                        placeholder="Scrivi un messaggio..."
                        className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-4 py-2 outline-none focus:border-pink-400"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button
                        onClick={handleSendMessage}
                        className="rounded-lg bg-pink-500 px-4 py-2 transition hover:bg-pink-600"
                      >
                        <SendIcon size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Members Sidebar */}
                {showMembers && (
                  <div className="w-64 border-l border-white/10 p-4">
                    <h3 className="mb-3 font-semibold">Membri</h3>
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center gap-2">
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.displayName} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm">
                              {member.displayName.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm">{member.displayName}</p>
                            {member.role === 'admin' && (
                              <span className="text-xs text-pink-400">Admin</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedGroup.role === 'admin' && (
                      <div className="mt-4 border-t border-white/10 pt-4">
                        <p className="mb-2 text-sm font-medium">Invita utente</p>
                        <div className="flex gap-2">
                          <input
                            value={inviteUsername}
                            onChange={(e) => setInviteUsername(e.target.value)}
                            placeholder="Username..."
                            className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm outline-none"
                          />
                          <button
                            onClick={handleInvite}
                            className="rounded-lg bg-pink-500 px-3 py-1.5 text-sm"
                          >
                            Invita
                          </button>
                        </div>
                        {inviteError && <p className="mt-1 text-xs text-red-400">{inviteError}</p>}
                      </div>
                    )}

                    {selectedGroup.role !== 'admin' && (
                      <button
                        onClick={() => {
                          onLeave(selectedGroup.id);
                          setSelectedGroup(null);
                        }}
                        className="mt-4 w-full rounded-lg bg-red-500/20 py-2 text-sm text-red-400 transition hover:bg-red-500/30"
                      >
                        Lascia gruppo
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-slate-900 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Nuovo Gruppo</h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-white/10"
                >
                  <CloseIcon size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center">
                  <ImageUploader
                    variant="avatar"
                    onImageSelect={setCreateAvatar}
                    currentImage={createAvatar}
                  />
                </div>

                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Nome gruppo..."
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 outline-none focus:border-pink-400"
                />

                <textarea
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Descrizione (opzionale)..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-white/10 bg-slate-800 px-4 py-3 outline-none focus:border-pink-400"
                />

                {/* Member Selection */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                    <UserCheckIcon size={16} />
                    Aggiungi membri ({selectedMembers.length} selezionati)
                  </label>
                  {friends.length > 0 ? (
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-slate-800/50 p-2">
                      {friends.map((friend) => (
                        <div
                          key={friend.friendId}
                          onClick={() => toggleMember(friend.friendId)}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition ${
                            selectedMembers.includes(friend.friendId)
                              ? 'bg-pink-500/20 ring-1 ring-pink-500'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          {friend.friendAvatar ? (
                            <img src={friend.friendAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm">
                              {friend.friendDisplayName.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{friend.friendDisplayName}</p>
                            <p className="text-xs text-slate-500">@{friend.friendUsername}</p>
                          </div>
                          {selectedMembers.includes(friend.friendId) && (
                            <CheckIcon size={18} className="text-pink-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-white/10 bg-slate-800/50 p-3 text-center text-sm text-slate-500">
                      Nessun amico disponibile. Aggiungi amici dai post o dai reels!
                    </p>
                  )}
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!createName.trim() || creating}
                  className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 py-3 font-semibold transition hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? 'Creazione...' : 'Crea Gruppo'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
