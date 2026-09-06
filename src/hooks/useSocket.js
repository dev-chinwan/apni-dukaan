'use client';
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let _socket = null;

export function useSocket({ role, userId, onNewOrder, onOrderUpdate, onOrderUpdated } = {}) {
  const handlersRef = useRef({});
  handlersRef.current = { onNewOrder, onOrderUpdate, onOrderUpdated };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!_socket) {
      _socket = io(window.location.origin, {
        path: '/api/socketio',
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1500,
      });
    }

    const socket = _socket;

    const onConnect = () => {
      if (role === 'admin')                    socket.emit('join-admin');
      else if (role === 'customer' && userId)  socket.emit('join-customer', userId);
    };

    socket.on('connect', onConnect);
    if (socket.connected) onConnect();

    const onConnectError = (err) => {
      console.error('[Socket] connect_error:', err?.message || err);
    };
    socket.on('connect_error', onConnectError);

    const onNewOrd  = (d) => handlersRef.current.onNewOrder?.(d);
    const onOrdUpd  = (d) => handlersRef.current.onOrderUpdate?.(d);
    const onOrdUpd2 = (d) => handlersRef.current.onOrderUpdated?.(d);

    socket.on('new_order',           onNewOrd);
    socket.on('order_status_update', onOrdUpd);
    socket.on('order_updated',       onOrdUpd2);

    return () => {
      socket.off('connect',              onConnect);
      socket.off('connect_error',        onConnectError);
      socket.off('new_order',            onNewOrd);
      socket.off('order_status_update',  onOrdUpd);
      socket.off('order_updated',        onOrdUpd2);
    };
  }, [role, userId]);

  return _socket;
}
