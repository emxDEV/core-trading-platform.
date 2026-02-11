import React, { useEffect, useState } from 'react';

const LoadingScreen = () => {
    const [statusText, setStatusText] = useState('INITIALIZING CORE SYSTEMS');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const statuses = [
            'CONNECTING NEURAL NETWORK',
            'DECRYPTING USER DATA',
            'LOADING MARKET MODULES',
            'SYSTEM READY'
        ];

        let currentStatus = 0;
        const interval = setInterval(() => {
            currentStatus = (currentStatus + 1) % statuses.length;
            setStatusText(statuses[currentStatus]);
        }, 800);

        const progressInterval = setInterval(() => {
            setProgress(p => Math.min(p + 2, 100));
        }, 30);

        return () => {
            clearInterval(interval);
            clearInterval(progressInterval);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-[#0A0B14] flex flex-col items-center justify-center overflow-hidden">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

            {/* Central Hexagon Animation */}
            <div className="relative w-32 h-32 mb-12 flex items-center justify-center">
                {/* Outer Rotating Ring */}
                <div className="absolute inset-0 rounded-full border border-violet-500/20 animate-[spin_4s_linear_infinite]" />
                <div className="absolute inset-2 rounded-full border border-violet-500/10 animate-[spin_6s_linear_infinite_reverse]" />

                {/* Glowing Pulse Behind */}
                <div className="absolute inset-0 bg-violet-600/20 blur-[40px] rounded-full animate-pulse" />

                {/* Hexagon Logo */}
                <div className="relative z-10 text-violet-500 drop-shadow-[0_0_15px_rgba(139,92,246,0.6)] animate-pulse">
                    <svg fill="none" height="80" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="80">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                </div>
            </div>

            {/* Typography */}
            <div className="text-center space-y-4 relative z-10">
                <h1 className="text-5xl font-black italic tracking-tighter text-white/90 drop-shadow-xl animate-in fade-in zoom-in duration-500">
                    CORE
                </h1>

                {/* Status Text with Typing Effect */}
                <div className="h-6 flex items-center justify-center">
                    <p className="text-[10px] font-mono font-bold text-violet-400 tracking-[0.3em] uppercase animate-pulse">
                        {statusText}
                    </p>
                </div>

                {/* Loading Bar */}
                <div className="w-64 h-1 bg-slate-900 rounded-full overflow-hidden mt-6 mx-auto border border-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all duration-100 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Version Number */}
            <div className="absolute bottom-8 text-[10px] text-slate-700 font-mono">
                v1.0.5 SYSTEM REVISION
            </div>
        </div>
    );
};

export default LoadingScreen;
