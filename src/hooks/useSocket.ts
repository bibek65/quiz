'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';

export function useSocket(quizId: string) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [hasReconnected, setHasReconnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const isInitialConnection = useRef(true);

  useEffect(() => {
    // Clean up existing socket if it exists
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    const socketPath = process.env.NEXT_PUBLIC_SOCKET_PATH || '/socket.io';
    socketRef.current = io(socketUrl, {
      path: socketPath,
      forceNew: true,
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;
    console.log('Socket initialized:', socketUrl);

    const handleConnect = () => {
      console.log('Socket connected');
      if (!isInitialConnection.current && !isConnected) {
        // This is a reconnection
        setHasReconnected(true);
        console.log('Socket reconnected - refreshing state');
        router.refresh();
      }
      isInitialConnection.current = false;
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    };

    const handleUpdate = () => {
      console.log('Received quiz-update, refreshing...');
      router.refresh();
    };

    // Add listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('quiz-update', handleUpdate);

    // Join quiz room
    socket.emit('join-quiz', quizId);
    console.log('Joined quiz:', quizId);

    // Cleanup function
    return () => {
      console.log('Cleaning up socket connection');
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [quizId, router]); // Removed isConnected from dependencies to prevent loops

  return { socket: socketRef.current, isConnected, hasReconnected };
}
