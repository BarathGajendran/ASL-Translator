import React, { useState } from 'react';
import { Cpu, Lock, User, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onAuthSuccess(data.user);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Connection to backend failed. Is the server running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex items-center justify-center relative overflow-hidden px-4">
      {/* Background Decorative Ambient Blobs */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 rounded-full bg-accent/10 blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel p-8 rounded-2xl relative overflow-hidden"
      >
        <div className="absolute -top-12 -left-12 -z-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl"></div>

        <div className="flex flex-col items-center mb-8 text-center">
          <div className="rounded-2xl bg-gradient-to-tr from-primary to-accent p-3 shadow-[0_0_20px_rgba(59,130,246,0.3)] mb-4">
            <Cpu className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-1.5 justify-center">
            Sign Language Translator
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Real-time accessibility platform powered by Deep Learning
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400 flex items-start gap-2.5 text-sm"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest block mb-2 font-semibold">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-11 pr-4 py-3 bg-dark-bg/60 border border-dark-border/80 rounded-xl focus:outline-none focus:border-primary text-gray-100 placeholder-gray-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest block mb-2 font-semibold">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-11 pr-4 py-3 bg-dark-bg/60 border border-dark-border/80 rounded-xl focus:outline-none focus:border-primary text-gray-100 placeholder-gray-600 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary-dark hover:to-accent-pink text-white py-3.5 font-bold transition-all duration-300 shadow-[0_4px_15px_rgba(59,130,246,0.2)] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                {isLogin ? 'Log In to System' : 'Create Access Account'}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400 border-t border-dark-border/40 pt-4 flex flex-col items-center justify-center gap-1">
          <span>
            {isLogin ? "New user? Create a profile first:" : "Already have an account?"}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-primary-light hover:text-white font-semibold underline underline-offset-4 transition-colors"
          >
            {isLogin ? 'Register New Account' : 'Log In Existing Account'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
