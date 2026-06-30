import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useWebSocket = (sessionId, setSessionId, user) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [prediction, setPrediction] = useState({
    gesture: 'Waiting...',
    confidence: 0,
    sentence: '',
    suggestions: [],
    isStable: false,
  });
  const [analytics, setAnalytics] = useState({
    totalGestures: 0,
    averageAccuracy: 0,
    mostUsed: [],
    confidenceDistribution: [],
    recentSentences: []
  });

  useEffect(() => {
    // Connect to Flask backend
    const socket = io(window.location.origin, {
      transports: ['websocket'],
      autoConnect: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to WebSocket server');
      // Join room with current session ID and user ID
      socket.emit('join', { 
        session_id: sessionId || null,
        user_id: user?.id || null
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket server');
    });

    socket.on('session_created', (data) => {
      setSessionId(data.session_id);
      localStorage.setItem('asl_session_id', data.session_id);
    });

    socket.on('prediction', (data) => {
      setPrediction({
        gesture: data.gesture,
        confidence: data.confidence,
        sentence: data.sentence,
        suggestions: data.suggestions || [],
        isStable: data.is_stable,
      });
      if (data.analytics) {
        setAnalytics(data.analytics);
      }
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [sessionId, setSessionId, user]);

  const sendLandmarks = (landmarks) => {
    if (socketRef.current && isConnected && sessionId) {
      socketRef.current.emit('landmarks', {
        session_id: sessionId,
        landmarks: landmarks,
        user_id: user?.id || null
      });
    }
  };

  const resetSession = async () => {
    if (!sessionId) return;
    try {
      const response = await fetch('/api/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setPrediction(prev => ({
          ...prev,
          sentence: '',
          suggestions: [],
          gesture: 'Waiting...'
        }));
      }
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  };

  const selectSuggestion = async (suggestion) => {
    if (!sessionId || !suggestion) return;
    try {
      const response = await fetch('/api/suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId, suggestion }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setPrediction(prev => ({
          ...prev,
          sentence: data.sentence,
          suggestions: []
        }));
      }
    } catch (error) {
      console.error('Error selecting suggestion:', error);
    }
  };

  return {
    isConnected,
    prediction,
    analytics,
    sendLandmarks,
    resetSession,
    selectSuggestion,
  };
};
