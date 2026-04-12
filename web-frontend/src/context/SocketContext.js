import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Only connect if user is logged in
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const SOCKET_URL = process.env.REACT_APP_API_URL 
      ? process.env.REACT_APP_API_URL.replace('/api', '')
      : `http://${window.location.hostname}:5000`;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      newSocket.emit('join_room', user._id); // Join private room if needed
    });

    // Global notifications handler
    newSocket.on('notification', (data) => {
      toast.success(data.message, { icon: data.icon || '💡' });
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [user, token]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
