import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import Auth from './pages/Auth';
import { Loader2 } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in on session mount
    const checkUserSession = async () => {
      try {
        const response = await fetch('/api/auth/user');
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Error loading user session: ", error);
      } finally {
        setLoading(false);
      }
    };

    checkUserSession();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-gray-400">Loading ASL Translation Suite...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={(authenticatedUser) => setUser(authenticatedUser)} />;
  }

  return <Home user={user} onLogout={() => setUser(null)} />;
}

export default App;
