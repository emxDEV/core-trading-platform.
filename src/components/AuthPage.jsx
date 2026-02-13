import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AppBackground from './AppBackground';

export default function AuthPage() {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { signIn, signUp, signInWithGoogle } = useAuth();

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const { error } = await signInWithGoogle();
            if (error) throw error;
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            if (mode === 'login') {
                const { error } = await signIn(email, password);
                if (error) setError(error.message);
            } else {
                if (!displayName.trim()) {
                    setError('Display name is required');
                    setIsLoading(false);
                    return;
                }
                if (password.length < 6) {
                    setError('Password must be at least 6 characters');
                    setIsLoading(false);
                    return;
                }
                const { error } = await signUp(email, password, displayName);
                if (error) {
                    setError(error.message);
                } else {
                    setSuccess('Account created! Check your email to confirm, then log in.');
                    setMode('login');
                }
            }
        } catch (err) {
            setError('An unexpected error occurred');
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-background-dark flex items-center justify-center relative overflow-hidden" style={{ WebkitAppRegion: 'drag' }}>
            <AppBackground />

            {/* Auth Card */}
            <div className="relative z-10 w-full max-w-md mx-4" style={{ WebkitAppRegion: 'no-drag' }}>
                {/* Logo/Brand */}
                <div className="text-center mb-10">
                    <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center group cursor-pointer">
                        <div className="text-primary transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:rotate-[360deg]">
                            <svg fill="none" height="80" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="80" className="drop-shadow-[0_0_25px_rgba(124,93,250,0.6)]">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none animate-in fade-in slide-in-from-bottom-2 duration-1000">
                        CORE
                    </h1>
                    <p className="text-xs text-primary font-black uppercase tracking-[0.4em] mt-3 opacity-80 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
                        Trading Intelligence
                    </p>
                </div>

                {/* Card */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-10 shadow-2xl relative overflow-hidden">
                    {/* Glass Reflection Highlight */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                    {/* Tab Switcher */}
                    <div className="flex bg-white/5 rounded-2xl p-1.5 mb-8">
                        <button
                            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${mode === 'login'
                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${mode === 'register'
                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 animate-[fadeIn_0.3s_ease]">
                            <span className="material-symbols-outlined text-rose-500 text-lg">error</span>
                            <p className="text-xs text-rose-400 font-semibold">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 animate-[fadeIn_0.3s_ease]">
                            <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                            <p className="text-xs text-emerald-400 font-semibold">{success}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {mode === 'register' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Display Name</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-lg">person</span>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-medium placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="Your trader name"
                                        autoComplete="name"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Email</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-lg">mail</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-medium placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="trader@example.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Password</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-lg">lock</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-medium placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="••••••••"
                                    required
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 mt-2 bg-gradient-to-r from-primary to-violet-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">
                                        {mode === 'login' ? 'login' : 'person_add'}
                                    </span>
                                    {mode === 'login' ? 'Access Terminal' : 'Create Account'}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-[#1A1D26] text-[10px] text-slate-500 font-bold uppercase tracking-widest">Or continue with</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-[0.1em] hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                        Google
                    </button>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-[10px] text-slate-600 font-medium">
                            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                            <button
                                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
                                className="ml-2 text-primary hover:text-violet-400 font-bold transition-colors"
                            >
                                {mode === 'login' ? 'Register now' : 'Sign in'}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Bottom Brand */}
                <p className="text-center mt-8 text-[10px] text-slate-700 font-bold uppercase tracking-[0.5em]">
                    Secure • Encrypted • Cloud-Synced
                </p>
            </div>
        </div>
    );
}
