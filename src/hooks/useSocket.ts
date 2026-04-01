import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { DirectMessage, GroupMessage, User } from './useApi';

type OnlineUser = {
  oderId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  socketId: string;
};

type TypingState = {
  oderId: string;
  username: string;
  typing: boolean;
  groupId?: string;
};

type SocketHook = {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: OnlineUser[];
  typingUsers: Map<string, TypingState>;
  sendDM: (receiverId: string, text: string) => void;
  sendGroupMessage: (groupId: string, text: string) => void;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  startTyping: (recipientId?: string, groupId?: string) => void;
  stopTyping: (recipientId?: string, groupId?: string) => void;
  onDMReceive: (callback: (message: DirectMessage) => void) => void;
  onGroupMessage: (callback: (message: GroupMessage) => void) => void;
};

const SOCKET_URL = 'http://localhost:3001';

export function useSocket(user: User | null): SocketHook {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingState>>(new Map());
  
  const dmCallbackRef = useRef<((message: DirectMessage) => void) | null>(null);
  const groupMessageCallbackRef = useRef<((message: GroupMessage) => void) | null>(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('user:join', {
        oderId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('users:online', (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    socket.on('dm:receive', (message: DirectMessage) => {
      dmCallbackRef.current?.(message);
    });

    socket.on('dm:sent', (message: DirectMessage) => {
      dmCallbackRef.current?.(message);
    });

    socket.on('group:newMessage', (message: GroupMessage) => {
      groupMessageCallbackRef.current?.(message);
    });

    socket.on('typing:update', (data: TypingState) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        const key = data.groupId ? `group:${data.groupId}:${data.oderId}` : `dm:${data.oderId}`;
        if (data.typing) {
          next.set(key, data);
        } else {
          next.delete(key);
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const sendDM = useCallback((receiverId: string, text: string) => {
    socketRef.current?.emit('dm:send', { receiverId, text });
  }, []);

  const sendGroupMessage = useCallback((groupId: string, text: string) => {
    socketRef.current?.emit('group:message', { groupId, text });
  }, []);

  const joinGroup = useCallback((groupId: string) => {
    socketRef.current?.emit('group:join', groupId);
  }, []);

  const leaveGroup = useCallback((groupId: string) => {
    socketRef.current?.emit('group:leave', groupId);
  }, []);

  const startTyping = useCallback((recipientId?: string, groupId?: string) => {
    socketRef.current?.emit('typing:start', { recipientId, groupId });
  }, []);

  const stopTyping = useCallback((recipientId?: string, groupId?: string) => {
    socketRef.current?.emit('typing:stop', { recipientId, groupId });
  }, []);

  const onDMReceive = useCallback((callback: (message: DirectMessage) => void) => {
    dmCallbackRef.current = callback;
  }, []);

  const onGroupMessage = useCallback((callback: (message: GroupMessage) => void) => {
    groupMessageCallbackRef.current = callback;
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    typingUsers,
    sendDM,
    sendGroupMessage,
    joinGroup,
    leaveGroup,
    startTyping,
    stopTyping,
    onDMReceive,
    onGroupMessage,
  };
}
