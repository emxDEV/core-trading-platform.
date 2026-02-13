import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/TradeContext';
import { toPng } from 'html-to-image';
import PnLCard from './PnLCard';

export default function DailyPnLModal({ isOpen, onClose }) {
    const { accounts, trades, getAccountStats, appSettings, formatCurrency, formatPnL, userProfile, stats } = useData();
    const [isAnimating, setIsAnimating] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const cardRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsAnimating(true);
                });
            });
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => setIsVisible(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen && !isVisible) return null;

    const todayStr = new Date().toISOString().split('T')[0];

    const accountData = accounts.map(acc => {
        const accStats = getAccountStats(acc.id, accounts, trades);
        const dailyTrades = trades.filter(t =>
            String(t.account_id) === String(acc.id) &&
            t.date === todayStr
        );
        const dailyPnL = dailyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

        return {
            ...acc,
            balance: accStats.balance,
            dailyPnL,
            overallPnL: accStats.totalPnL,
            tradeCount: dailyTrades.length,
            winCount: dailyTrades.filter(t => t.pnl > 0).length
        };
    });

    const totalDailyPnL = accountData.reduce((sum, acc) => sum + acc.dailyPnL, 0);
    const totalTradesToday = accountData.reduce((sum, acc) => sum + acc.tradeCount, 0);

    const handleShare = async () => {
        if (!cardRef.current) return;
        setIsSharing(true);
        try {
            // Give a tiny moment for any fonts/images to be rock solid
            await new Promise(r => setTimeout(r, 200));

            const dataUrl = await toPng(cardRef.current, {
                quality: 1,
                pixelRatio: 2,
                width: 1200,
                height: 675,
                cacheBust: true,
                skipFontFace: true, // Prevent security errors with Google Fonts in electron
            });

            const link = document.createElement('a');
            link.download = `CORE-PnL-${todayStr}.png`;
            link.href = dataUrl;
            link.click();

            // Play success sound if available
            if (window.soundEngine) window.soundEngine.playSuccess();
        } catch (error) {
            console.error('Failed to generate sharing card:', error);
        } finally {
            setIsSharing(false);
        }
    };


    return createPortal(
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-6 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isAnimating ? 'bg-slate-950/80 backdrop-blur-xl opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`}
            onClick={onClose}
        >
            <div
                className={`w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900/40 backdrop-blur-[45px] border border-white/10 rounded-[3.5rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform relative ${isAnimating ? 'scale-100 translate-y-0 opacity-100 blur-0' : 'scale-[0.9] translate-y-20 opacity-0 blur-2xl'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Glass Reflection Highlight */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                {/* Header - Tactical Performance */}
                <div className="flex justify-between items-center px-12 pt-12 pb-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 opacity-30 blur-[60px] -z-10" />
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
                            <span className="material-symbols-outlined text-primary text-[36px] drop-shadow-glow">
                                monitoring
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.2em]">Live Terminal</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic line-height-none">Performance Hub</h2>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1.5">
                                <span className="text-slate-400">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</span>, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 transition-all group/close border border-white/10 active:scale-90"
                    >
                        <span className="material-symbols-outlined text-[28px] group-hover/close:rotate-180 transition-transform duration-500">close</span>
                    </button>
                </div>

                {/* Performance Feed */}
                <div className="px-12 py-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                    {accountData.map((acc, idx) => (
                        <div
                            key={acc.id}
                            className={`group relative transition-all duration-700 ${isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'}`}
                            style={{ transitionDelay: `${idx * 100}ms` }}
                        >
                            <div className="relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-7 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500 group/item shadow-inner">
                                {/* Glass Reflection Highlight */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                                <div className={`absolute inset-0 opacity-0 group-hover/item:opacity-[0.05] transition-opacity duration-1000 ${acc.dailyPnL >= 0 ? 'bg-gradient-to-br from-emerald-500 to-transparent' : 'bg-gradient-to-br from-rose-500 to-transparent'}`} />

                                <div className="relative flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 shadow-inner ${acc.dailyPnL >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover/item:shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-rose-500/10 border-rose-500/20 text-rose-400 group-hover/item:shadow-[0_0_15px_rgba(244,63,94,0.3)]'}`}>
                                            <span className={`material-symbols-outlined text-[28px] ${acc.dailyPnL >= 0 ? 'drop-shadow-glow' : ''}`}>
                                                {acc.dailyPnL >= 0 ? 'trending_up' : 'trending_down'}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white tracking-tight leading-tight group-hover/item:text-primary transition-colors uppercase italic">{acc.name}</h3>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{acc.type} Unit</span>
                                                <div className="w-1 h-1 rounded-full bg-slate-800" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{acc.tradeCount} Operatives Today</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-end gap-12">
                                        {appSettings && !appSettings.hideCapitalOnDailyPnL && (
                                            <div className="text-right">
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-1.5 opacity-60">Unit Balance</span>
                                                <span className="text-slate-300 font-black tracking-tight text-sm font-mono">
                                                    {appSettings.maskBalances ? '****' : formatCurrency(acc.balance)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="text-right min-w-[140px]">
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-1.5 opacity-60">Daily Net Returns</span>
                                            <span className={`text-2xl font-black tracking-tighter drop-shadow-md italic ${acc.dailyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {appSettings.maskBalances ? '****' : formatPnL(acc.dailyPnL, acc.capital)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {accountData.length === 0 && (
                        <div className="py-24 text-center flex flex-col items-center">
                            <div className="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                                <span className="material-symbols-outlined text-4xl text-slate-600 drop-shadow-glow">monitoring</span>
                            </div>
                            <h4 className="text-lg font-black text-white uppercase tracking-[0.2em] italic">Signal Missing</h4>
                            <p className="text-slate-500 text-[11px] mt-2 max-w-[240px] font-black uppercase tracking-widest opacity-60 leading-relaxed italic">No active account synchronization detected for the current session cycle.</p>
                        </div>
                    )}
                </div>

                {/* Premium Summary Badge */}
                <div className="px-12 py-10">
                    <div className="relative group p-1 bg-gradient-to-br from-primary/20 via-white/5 to-emerald-500/20 rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                        <div className="absolute inset-0 bg-slate-900 shadow-inner rounded-[2.9rem] m-0.5" />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                        <div className="relative flex items-center justify-between p-8">
                            <div className="space-y-6">
                                <div>
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] block mb-4 italic">Aggregated Daily Summary</span>
                                    <div className="flex items-center gap-10">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-2 font-mono">Total Executions</span>
                                            <span className="text-2xl font-black text-white italic tracking-tighter">{totalTradesToday}</span>
                                        </div>
                                        <div className="w-[1px] h-10 bg-white/5" />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-2 font-mono">Session Status</span>
                                            <span className={`text-2xl font-black italic tracking-tighter ${totalDailyPnL >= 0 ? 'text-emerald-500 shadow-emerald-500/20' : 'text-rose-500 shadow-rose-500/20'}`}>
                                                {totalDailyPnL >= 0 ? 'IN PROFIT' : 'IN LOSS'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="inline-flex flex-col items-end">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-3 leading-none italic">Net Result</span>
                                    <span className={`text-5xl font-black tracking-tighter italic ${totalDailyPnL >= 0 ? 'text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.3)]' : 'text-rose-400 drop-shadow-[0_0_25px_rgba(244,63,94,0.3)]'}`}>
                                        {appSettings.maskBalances ? '****' : formatPnL(totalDailyPnL, accountData.reduce((sum, a) => sum + (a.capital || 0), 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 flex flex-col items-center gap-8">
                        <button
                            onClick={handleShare}
                            disabled={isSharing}
                            className={`group relative px-14 py-6 bg-primary text-white font-black rounded-[2rem] transition-all duration-500 hover:shadow-[0_0_50px_rgba(124,58,237,0.4)] active:scale-95 disabled:opacity-50 flex items-center gap-4 overflow-hidden border border-white/20`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            <span className="material-symbols-outlined text-[24px] transition-transform group-hover:rotate-12 group-hover:scale-110 duration-500">share</span>
                            <span className="text-[12px] uppercase tracking-[0.4em] font-black">{isSharing ? 'Encoding Matrix...' : 'Share Directive'}</span>
                        </button>

                        <div className="flex items-center justify-center gap-3 opacity-40 hover:opacity-100 transition-opacity">
                            <div className="w-1.5 h-[1px] bg-slate-700" />
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] font-mono text-center italic">Data synchronized via global terminal network</p>
                            <div className="w-1.5 h-[1px] bg-slate-700" />
                        </div>
                    </div>
                </div>

                {/* Hidden Capture Area */}
                <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
                    <PnLCard
                        ref={cardRef}
                        data={{ totalDailyPnL, totalTradesToday, date: todayStr }}
                        userProfile={userProfile}
                        stats={stats}
                        formatCurrency={formatCurrency}
                        formatPnL={formatPnL}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
}
