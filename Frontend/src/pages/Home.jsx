import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import WebcamFeed from '../components/WebcamFeed';
import PredictionCard from '../components/PredictionCard';
import AnalyticsPanel from '../components/AnalyticsPanel';
import SessionHistory from '../components/SessionHistory';
import ASLCheatSheet from '../components/ASLCheatSheet';
import { Activity, ShieldAlert, Cpu, HeartHandshake, BookOpen, LogOut, Palette } from 'lucide-react';

const Home = ({ user, onLogout }) => {
  // Theme state: nebula (indigo/purple), matrix (dark green), cyberpunk (pink/yellow)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('asl_theme') || 'nebula';
  });

  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('asl_session_id') || '';
  });

  const {
    isConnected,
    prediction,
    analytics,
    sendLandmarks,
    resetSession,
    selectSuggestion
  } = useWebSocket(sessionId, setSessionId, user);

  const [initialAnalyticsFetched, setInitialAnalyticsFetched] = useState(false);
  const [latestAnalytics, setLatestAnalytics] = useState(analytics);

  useEffect(() => {
    localStorage.setItem('asl_theme', theme);
  }, [theme]);

  useEffect(() => {
    // Reset fetch lock and statistics when active user changes (login, logout, switch)
    setInitialAnalyticsFetched(false);
    setLatestAnalytics({
      totalGestures: 0,
      averageAccuracy: 0,
      mostUsed: [],
      confidenceDistribution: [],
      recentSentences: []
    });
    setSessionId('');
    localStorage.removeItem('asl_session_id');
  }, [user]);

  useEffect(() => {
    if (isConnected && !initialAnalyticsFetched) {
      fetch('/api/analytics')
        .then(res => res.json())
        .then(data => {
          setLatestAnalytics(data);
          setInitialAnalyticsFetched(true);
        })
        .catch(err => console.error("Error fetching initial analytics:", err));
    }
  }, [isConnected, initialAnalyticsFetched]);

  useEffect(() => {
    if (analytics.totalGestures > 0) {
      setLatestAnalytics(analytics);
    }
  }, [analytics]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        onLogout();
      }
    } catch (error) {
      console.error("Logout error: ", error);
    }
  };

  // Theme styling presets
  const themeStyles = {
    nebula: {
      bgClass: 'bg-[#0B0F19]',
      headerBorder: 'border-dark-border',
      ambientBlobs: (
        <>
          <div className="absolute top-0 left-1/4 -z-20 h-96 w-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none"></div>
          <div className="absolute top-1/3 right-1/4 -z-20 h-[500px] w-[500px] rounded-full bg-accent/5 blur-[120px] pointer-events-none"></div>
        </>
      ),
      badgeClass: 'bg-primary/20 text-primary-light border-primary/20',
      logoGradient: 'from-primary to-accent',
      accentColor: 'text-primary-light',
    },
    matrix: {
      bgClass: 'bg-[#05080C]',
      headerBorder: 'border-emerald-950/60',
      ambientBlobs: (
        <>
          <div className="absolute top-0 left-1/4 -z-20 h-96 w-96 rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none"></div>
          <div className="absolute top-1/3 right-1/4 -z-20 h-[500px] w-[500px] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none"></div>
        </>
      ),
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      logoGradient: 'from-emerald-500 to-teal-400',
      accentColor: 'text-emerald-400',
    },
    cyberpunk: {
      bgClass: 'bg-[#150722]',
      headerBorder: 'border-fuchsia-950/60',
      ambientBlobs: (
        <>
          <div className="absolute top-0 left-1/4 -z-20 h-96 w-96 rounded-full bg-pink-500/5 blur-[100px] pointer-events-none"></div>
          <div className="absolute top-1/3 right-1/4 -z-20 h-[500px] w-[500px] rounded-full bg-yellow-500/5 blur-[120px] pointer-events-none"></div>
        </>
      ),
      badgeClass: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      logoGradient: 'from-pink-500 to-yellow-500',
      accentColor: 'text-pink-400',
    }
  };

  const activeTheme = themeStyles[theme] || themeStyles.nebula;

  return (
    <div className={`min-h-screen ${activeTheme.bgClass} text-gray-100 flex flex-col font-sans transition-colors duration-500 selection:bg-primary/30 selection:text-primary-light`}>
      
      {/* Decorative neon ambient blobs based on selected theme */}
      {activeTheme.ambientBlobs}

      {/* Main Premium Navbar */}
      <header className={`border-b ${activeTheme.headerBorder} bg-dark-bg/60 backdrop-blur-md sticky top-0 z-50 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl bg-gradient-to-tr ${activeTheme.logoGradient} p-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]`}>
              <Cpu className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Sign Language Translator
                <span className={`text-[10px] uppercase font-semibold tracking-widest px-2 py-0.5 rounded border ${activeTheme.badgeClass}`}>
                  Real-time
                </span>
              </h1>
              <p className="text-[10px] text-gray-400">Accessibility System — ASL to Text & Speech</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Selector */}
            <div className="flex items-center gap-1.5 bg-dark-card border border-dark-border rounded-xl px-2 py-1">
              <Palette className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="bg-transparent text-gray-300 text-xs rounded focus:outline-none cursor-pointer pr-1"
              >
                <option value="nebula" className="bg-dark-bg">Nebula (Dark)</option>
                <option value="matrix" className="bg-dark-bg">Matrix (Green)</option>
                <option value="cyberpunk" className="bg-dark-bg">Cyberpunk (Neon)</option>
              </select>
            </div>

            {/* User Profile Info */}
            <span className="text-xs text-gray-300 bg-dark-card border border-dark-border rounded-xl px-3 py-1.5 font-medium hidden sm:inline-block">
              Welcome, <strong className="text-white font-semibold">{user?.username}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent px-3 py-1.5 text-xs font-semibold transition-all duration-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log Out
            </button>
            
            {/* Connection Status indicator */}
            <div className="flex items-center gap-2 rounded-xl bg-dark-card border border-dark-border px-3.5 py-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-rose-500 animate-pulse'}`} />
              <span className="text-xs font-semibold tracking-wide text-gray-300 hidden md:inline-block">
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Body Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Connection Failure Alert */}
        {!isConnected && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400 flex items-center gap-3 shadow-glass">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-semibold">Server Offline:</span> Establishing connection to Flask WebSocket server... Please ensure the backend is running on <code className="bg-black/40 px-1.5 py-0.5 rounded text-white">http://localhost:5000</code>.
            </div>
          </div>
        )}

        {/* Translation Section: Webcam & Results Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <div className="flex flex-col gap-4">
            <WebcamFeed 
              onLandmarksDetected={sendLandmarks} 
              isConnected={isConnected} 
            />
            <div className="flex justify-between items-center bg-dark-card/15 border border-dark-border/40 px-4 py-3 rounded-2xl">
              <span className="text-xs text-gray-400">Not sure about hand shapes? Click the guide:</span>
              <ASLCheatSheet />
            </div>
          </div>
          <div className="h-full">
            <PredictionCard 
              prediction={prediction}
              resetSession={resetSession}
              selectSuggestion={selectSuggestion}
              isConnected={isConnected}
            />
          </div>
        </div>

        {/* Bottom Section: Analytics & History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="h-full flex flex-col gap-4">
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Live Dashboard Performance Analytics
              </h2>
              <AnalyticsPanel analytics={latestAnalytics} />
            </div>
          </div>
          <div className="lg:col-span-1">
            <SessionHistory 
              recentSentences={latestAnalytics.recentSentences} 
              isConnected={isConnected}
            />
          </div>
        </div>

        {/* Quick Instructions info panel */}
        <div className="rounded-2xl border border-dark-border bg-dark-card/10 p-5 shadow-glass-inset flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4">
          <div className="rounded-xl bg-primary/10 p-3 text-primary-light border border-primary/20 flex-shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-200">How to use this system:</h4>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              1. Click <strong className="text-gray-300">Start Camera Feed</strong> and permit webcam access. <br />
              2. Place your hand in the frame. The system will detect joints and draw a skeleton helper overlay. <br />
              3. Hold your hand in an ASL sign gesture shape (e.g. A, B, C). When held stably for a few frames, the character is added to the word. <br />
              4. Complete words by signing the <strong className="text-gray-300">Space</strong> gesture, or correct letters with <strong className="text-gray-300">Backspace (delete)</strong>. Click autocomplete suggestions to build sentences quickly.
            </p>
          </div>
        </div>

      </main>

      {/* Dashboard Footer */}
      <footer className="border-t border-dark-border bg-dark-bg/60 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p className="flex items-center gap-1.5 font-medium">
            <HeartHandshake className="h-4 w-4 text-rose-400" />
            Designed for accessibility and inclusion.
          </p>
          <p>© 2026 Sign Language Translator Project. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
};

export default Home;
