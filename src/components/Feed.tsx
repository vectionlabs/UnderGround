import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon, CommentIcon, SendIcon, TrashIcon, BookmarkIcon, ShareIcon, SmileIcon } from './Icons';
import type { Post, Comment, Channel } from '../hooks/useApi';

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👏', '🔥', '💯'];

// Sanitize names to prevent base64 strings from showing as text
const safeName = (name: string) => {
  if (!name) return '?';
  if (name.length > 50 || name.includes('base64') || name.startsWith('data:')) {
    return name.substring(0, 20).replace(/[^a-zA-Z0-9\s._-]/g, '').trim() || '?';
  }
  return name;
};

type FeedProps = {
  posts: Post[];
  channels: Channel[];
  currentUserId: string;
  bookmarkedPosts: string[];
  onLike: (postId: string) => void;
  onComment: (postId: string, text: string) => void;
  onDelete: (postId: string) => void;
  onLoadComments: (postId: string) => Promise<Comment[]>;
  onBookmark: (postId: string) => void;
  onReact: (postId: string, reaction: string) => void;
  onShare: (postId: string) => void;
};

export default function Feed({
  posts,
  channels,
  currentUserId,
  bookmarkedPosts,
  onLike,
  onComment,
  onDelete,
  onLoadComments,
  onBookmark,
  onReact,
  onShare,
}: FeedProps) {
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, Comment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [showReactions, setShowReactions] = useState<string | null>(null);

  const handleToggleComments = async (postId: string) => {
    if (expandedComments[postId]) {
      setExpandedComments((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      return;
    }

    setLoadingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const comments = await onLoadComments(postId);
      setExpandedComments((prev) => ({ ...prev, [postId]: comments }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleComment = (postId: string) => {
    const text = commentDrafts[postId]?.trim();
    if (!text) return;
    onComment(postId, text);
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    // Refresh comments
    handleToggleComments(postId);
    setTimeout(() => handleToggleComments(postId), 300);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Adesso';
    if (mins < 60) return `${mins}m fa`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h fa`;
    const days = Math.floor(hours / 24);
    return `${days}g fa`;
  };

  const getChannelName = (channelId: string | null) => {
    if (!channelId) return null;
    const channel = channels.find((c) => c.id === channelId);
    return channel ? `#${channel.name}` : null;
  };

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center">
        <p className="text-slate-400">Nessun post da mostrare.</p>
        <p className="mt-2 text-sm text-slate-500">Iscriviti a più canali o crea il primo post!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const draft = commentDrafts[post.id] ?? '';
        const comments = expandedComments[post.id];
        const isLoading = loadingComments[post.id];
        const channelName = getChannelName(post.channelId);

        return (
          <motion.article
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-3">
                {(post as any).publishAsName ? (
                  (post as any).publishAsIcon && (post as any).publishAsIcon.startsWith('data:') ? (
                    <img src={(post as any).publishAsIcon} alt={(post as any).publishAsName} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-400 text-xl">
                    {(post as any).publishAsIcon || '📢'}
                  </div>
                  )
                ) : post.authorAvatar ? (
                  <img
                    src={post.authorAvatar}
                    alt={post.authorName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-lg font-bold">
                    {safeName(post.authorName).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold">
                    {safeName((post as any).publishAsName || post.authorName)}
                    {(post as any).publishAsName && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        (da {safeName(post.authorName)})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatTime(post.createdAt)}
                    {channelName && <span className="ml-2 text-pink-400">{channelName}</span>}
                  </p>
                </div>
              </div>
              {post.authorId === currentUserId && (
                <button
                  onClick={() => onDelete(post.id)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-500/20 hover:text-red-400"
                >
                  <TrashIcon size={18} />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="px-4 pb-3">
              <p className="whitespace-pre-wrap text-slate-100">{post.text}</p>
            </div>

            {/* Media */}
            {post.mediaType === 'image' && post.imageBase64 && (
              <div className="px-4 pb-3">
                <img
                  src={post.imageBase64}
                  alt="Post"
                  className="max-h-96 w-full rounded-xl object-cover"
                />
              </div>
            )}

            {post.mediaType === 'video' && post.videoBase64 && (
              <div className="px-4 pb-3">
                <video
                  src={post.videoBase64}
                  controls
                  playsInline
                  className="max-h-96 w-full rounded-xl"
                />
              </div>
            )}

            {post.mediaType === 'document' && post.documentBase64 && (
              <div className="px-4 pb-3">
                <a
                  href={post.documentBase64}
                  download={post.documentName || 'documento'}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800/50 p-4 transition hover:bg-slate-700/50"
                >
                  <span className="text-3xl">
                    {post.documentType?.includes('pdf') ? '📄' :
                     post.documentType?.includes('word') ? '📝' :
                     post.documentType?.includes('excel') || post.documentType?.includes('sheet') ? '📊' :
                     post.documentType?.includes('powerpoint') || post.documentType?.includes('presentation') ? '📽️' :
                     '📎'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{post.documentName || 'Documento'}</p>
                    <p className="text-sm text-slate-400">Clicca per scaricare</p>
                  </div>
                </a>
              </div>
            )}

            {/* Legacy support for old posts with imageBase64 but no mediaType */}
            {!post.mediaType && post.imageBase64 && (
              <div className="px-4 pb-3">
                <img
                  src={post.imageBase64}
                  alt="Post"
                  className="max-h-96 w-full rounded-xl object-cover"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
              <div className="flex items-center gap-2">
                {/* Like */}
                <button
                  onClick={() => onLike(post.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition ${
                    post.liked
                      ? 'bg-pink-500/20 text-pink-400'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <HeartIcon size={18} filled={post.liked} />
                  <span className="text-sm font-medium">{post.likeCount}</span>
                </button>

                {/* Comments */}
                <button
                  onClick={() => handleToggleComments(post.id)}
                  className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-slate-300 transition hover:bg-white/10"
                >
                  <CommentIcon size={18} />
                  <span className="text-sm font-medium">{post.commentCount}</span>
                </button>

                {/* Reactions */}
                <div className="relative">
                  <button
                    onClick={() => setShowReactions(showReactions === post.id ? null : post.id)}
                    className="rounded-lg bg-white/5 p-1.5 text-slate-300 transition hover:bg-white/10"
                  >
                    <SmileIcon size={18} />
                  </button>
                  <AnimatePresence>
                    {showReactions === post.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-xl bg-slate-800 p-2 shadow-xl"
                      >
                        {REACTIONS.map((reaction) => (
                          <button
                            key={reaction}
                            onClick={() => {
                              onReact(post.id, reaction);
                              setShowReactions(null);
                            }}
                            className="rounded-lg p-1.5 text-xl transition hover:scale-125 hover:bg-white/10"
                          >
                            {reaction}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Share */}
                <button
                  onClick={() => onShare(post.id)}
                  className="rounded-lg bg-white/5 p-1.5 text-slate-300 transition hover:bg-white/10"
                >
                  <ShareIcon size={18} />
                </button>
              </div>

              {/* Bookmark */}
              <button
                onClick={() => onBookmark(post.id)}
                className={`rounded-lg p-1.5 transition ${
                  bookmarkedPosts.includes(post.id)
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <BookmarkIcon size={18} filled={bookmarkedPosts.includes(post.id)} />
              </button>
            </div>

            {/* Comments Section */}
            {(comments || isLoading) && (
              <div className="border-t border-white/5 bg-slate-950/50 p-4">
                {isLoading ? (
                  <p className="text-center text-sm text-slate-400">Caricamento...</p>
                ) : (
                  <div className="space-y-3">
                    {comments?.length === 0 && (
                      <p className="text-center text-sm text-slate-500">Nessun commento</p>
                    )}
                    {comments?.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        {comment.authorAvatar ? (
                          <img
                            src={comment.authorAvatar}
                            alt={comment.authorName}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm font-bold">
                            {comment.authorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-semibold">{comment.authorName}</span>{' '}
                            <span className="text-slate-300">{comment.text}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatTime(comment.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Add comment */}
                    <div className="mt-3 flex gap-2">
                      <input
                        value={draft}
                        onChange={(e) =>
                          setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        placeholder="Scrivi un commento..."
                        className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-pink-400"
                        onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                      />
                      <button
                        onClick={() => handleComment(post.id)}
                        className="rounded-lg bg-pink-500 px-3 py-2 transition hover:bg-pink-600"
                      >
                        <SendIcon size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.article>
        );
      })}
    </div>
  );
}
