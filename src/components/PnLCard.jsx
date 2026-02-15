import React from 'react';

const PnLCard = React.forwardRef(({ data, userProfile, stats, formatCurrency, formatPnL }, ref) => {
    const { totalDailyPnL, totalTradesToday, date } = data;

    // Fallback if data is empty
    const displayDate = date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const isProfit = totalDailyPnL >= 0;

    return (
        <div
            ref={ref}
            className="w-[1200px] h-[675px] bg-[#020617] relative overflow-hidden flex flex-col font-sans"
            style={{
                backgroundImage: 'radial-gradient(circle at top right, rgba(124, 58, 237, 0.15), transparent), radial-gradient(circle at bottom left, rgba(16, 185, 129, 0.05), transparent)',
                fontFamily: "'Inter', sans-serif"
            }}
        >
            {/* Background Texture - Using local pattern or CSS to avoid CORS */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20l20 20V20L20 0v20zM0 20l20 20V20L0 0v20z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`
                }}
            />

            {/* Corner Accents */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

            {/* Header / Brand */}
            <div className="relative p-16 flex justify-between items-start">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)]">
                            <span className="text-white font-black text-xl italic mt-0.5">C</span>
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-[0.3em] uppercase italic shimmer-text">Core <span className="text-primary">Terminal</span></h1>
                    </div>
                    <p className="text-slate-500 font-mono text-sm tracking-widest uppercase">Operational Performance Report</p>
                </div>
                <div className="text-right">
                    <p className="text-white/40 font-black text-sm uppercase tracking-[0.2em]">{displayDate}</p>
                    <p className="text-slate-600 font-mono text-[10px] uppercase tracking-widest mt-1">Ref: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative flex-1 flex flex-col justify-center px-16 -mt-10">
                <div className="space-y-4">
                    <span className="text-slate-500 font-black text-lg uppercase tracking-[0.5em] italic ml-1">Daily Net Returns</span>
                    <div className="flex items-baseline gap-6">
                        <h2 className={`text-[160px] font-black leading-none tracking-tighter shimmer-text ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`} style={{ filter: `drop-shadow(0 0 40px ${isProfit ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'})` }}>
                            {formatPnL(totalDailyPnL)}
                        </h2>
                    </div>
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-3 gap-12 mt-20">
                    <div className="space-y-2">
                        <span className="text-slate-600 font-black text-xs uppercase tracking-[0.3em] block">Trades Executed</span>
                        <div className="flex items-center gap-3">
                            <span className="text-4xl font-black text-white italic">{totalTradesToday}</span>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-slate-600 font-black text-xs uppercase tracking-[0.3em] block">Yield Accuracy</span>
                        <div className="flex items-center gap-3">
                            <span className="text-4xl font-black text-white italic">{(stats || {}).winRate || 0}%</span>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-slate-600 font-black text-xs uppercase tracking-[0.3em] block">Combat Rating</span>
                        <div className="flex items-center gap-3">
                            <span className="text-4xl font-black text-primary italic uppercase">{(stats || {}).rank?.name ? (stats || {}).rank.name.split(' ')[0] : 'INITIATE'}</span>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Profile */}
            <div className="relative p-16 pt-0 mt-auto">
                <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <img
                                src={(userProfile || {}).avatar}
                                className="w-16 h-16 rounded-2xl object-cover border border-white/10"
                                alt="Avatar"
                                crossOrigin="anonymous"
                            />
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs border-4 border-[#020617] shadow-xl">
                                <span className="material-symbols-outlined text-[16px]">verified</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">{(userProfile || {}).name || 'Trader'}</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-primary font-black text-xs italic tracking-widest">#{(userProfile || {}).tag || '000000'}</span>
                                <div className="w-1 h-1 rounded-full bg-slate-700" />
                                <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest leading-none">Global Operator</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-10 pr-4">
                        <div className="text-right">
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] block mb-2">System Version</span>
                            <span className="text-white/20 font-mono text-xs">v1.2.0-PRO</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="w-full h-[2px] bg-primary/20 absolute top-0 left-0 animate-scanline" />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scanline {
                    0% { top: -10%; opacity: 0; }
                    50% { opacity: 0.5; }
                    100% { top: 110%; opacity: 0; }
                }
                .animate-scanline {
                    animation: scanline 8s linear infinite;
                }
            ` }} />
        </div>
    );
});

export default PnLCard;
