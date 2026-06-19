import { useEffect, useRef, useState, useCallback } from 'react';

const getWsUrl = () => {
  const envUrl = import.meta.env.VITE_WS_URL;
  let url = '';
  if (envUrl) {
    url = envUrl;
  } else {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    url = `${protocol}//${host}/ws`;
  }

  try {
    const storedUser = localStorage.getItem('r9:user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed.token) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}token=${encodeURIComponent(parsed.token)}`;
      }
    }
  } catch (err) {
    console.error('Erro ao buscar token para WebSocket:', err);
  }

  return url;
};

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      ws.current = new WebSocket(getWsUrl());

      ws.current.onopen = () => {
        setConnected(true);
        console.log('📡 WebSocket conectado');
        // Enviar ping a cada 30s
        ws.current._pingInterval = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (err) {
          console.error('Erro ao parsear mensagem WebSocket:', err);
        }
      };

      ws.current.onclose = () => {
        setConnected(false);
        clearInterval(ws.current?._pingInterval);
        console.log('📡 WebSocket desconectado');
        // Reconectar em 3s
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket erro:', error);
        ws.current?.close();
      };
    } catch (err) {
      console.error('Erro ao conectar WebSocket:', err);
      reconnectTimeout.current = setTimeout(connect, 3000);
    }
  }, []);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimeout.current);
    clearInterval(ws.current?._pingInterval);
    ws.current?.close();
    ws.current = null;
    setConnected(false);
  }, []);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { connected, lastMessage, send, connect, disconnect };
}

