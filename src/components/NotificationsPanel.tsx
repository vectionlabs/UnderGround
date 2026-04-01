import { motion, AnimatePresence } from 'framer-motion';
import { BellIcon, CloseIcon, HeartIcon, CommentIcon, UserPlusIcon, HashIcon, CheckIcon } from './Icons';

type Notification = {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'channel_invite' | 'group_invite';
  fromUser: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
  message: string;
  read: boolean;
  createdAt: string;
  targetId?: string;
};

type NotificationsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNotificationClick: (notification: Notification) => void;
};

export default function NotificationsPanel({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNotificationClick,
}: NotificationsPanelProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like': return <HeartIcon size={18} className="text-pink-400" />;
      case 'comment': return <CommentIcon size={18} className="text-blue-400" />;
      case 'follow': return <UserPlusIcon size={18} className="text-green-400" />;
      case 'mention': return <span className="text-orange-400">@</span>;
      case 'channel_invite': return <HashIcon size={18} className="text-purple-400" />;
      case 'group_invite': return <UserPlusIcon size={18} className="text-yellow-400" />;
      default: return <BellIcon size={18} />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Adesso';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}g`;
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-slate-900 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div className="flex items-center gap-3">
                <BellIcon size={24} />
                <h2 className="text-xl font-bold">Notifiche</h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-pink-500 px-2 py-0.5 text-xs font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    className="rounded-lg px-3 py-1.5 text-sm text-pink-400 transition hover:bg-pink-500/10"
                  >
                    <CheckIcon size={16} className="inline mr-1" />
                    Segna tutto letto
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
                >
                  <CloseIcon size={20} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="h-[calc(100%-72px)] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BellIcon size={48} className="mb-4 text-slate-600" />
                  <p className="text-slate-400">Nessuna notifica</p>
                  <p className="mt-1 text-sm text-slate-600">Le tue notifiche appariranno qui</p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        if (!notification.read) onMarkRead(notification.id);
                        onNotificationClick(notification);
                      }}
                      className={`flex cursor-pointer items-start gap-3 border-b border-white/5 p-4 transition hover:bg-white/5 ${
                        !notification.read ? 'bg-pink-500/5' : ''
                      }`}
                    >
                      {/* User Avatar */}
                      <div className="relative">
                        {notification.fromUser.avatar ? (
                          <img
                            src={notification.fromUser.avatar}
                            alt=""
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 font-bold">
                            {notification.fromUser.displayName.charAt(0)}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 rounded-full bg-slate-900 p-1">
                          {getIcon(notification.type)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-semibold">{notification.fromUser.displayName}</span>{' '}
                          <span className="text-slate-400">{notification.message}</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{formatTime(notification.createdAt)}</p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className="mt-2 h-2 w-2 rounded-full bg-pink-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
