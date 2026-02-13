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
            className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isAnimating ? 'bg-[#020617]/80 backdrop-blur-xl opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`}
            onClick={onClose}
        >
            <div
                className={`w-full max-w-2xl bg-[#0F172A]/90 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform ${isAnimating ? 'scale-100 translate-y-0 opacity-100 blur-0' : 'scale-[0.9] translate-y-20 opacity-0 blur-2xl'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Immersive Header */}
                <div className="relative p-10 pb-6 overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />

                    <div className="relative flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">Live Terminal</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                            </div>
                            <h2 className="text-4xl font-black text-white tracking-tighter">Performance Hub</h2>
                            <p className="text-slate-500 text-sm font-medium mt-1">
                                <span className="text-slate-400">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</span>, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-slate-500 hover:text-white hover:bg-white/5 hover:border-white/10 transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Performance Feed */}
                <div className="px-10 py-4 max-h-[50vh] overflow-y-auto space-y-4 custom-scrollbar">
                    {accountData.map((acc, idx) => (
                        <div
                            key={acc.id}
                            className={`group relative transition-all duration-700 ${isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'}`}
                            style={{ transitionDelay: `${idx * 100}ms` }}
                        >
                            <div className="relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-[2.25rem] p-6 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500 group/item">
                                {/* Subtle Background Gradient for profit/loss */}
                                <div className={`absolute inset-0 opacity-0 group-hover/item:opacity-[0.05] transition-opacity duration-1000 ${acc.dailyPnL >= 0 ? 'bg-gradient-to-br from-emerald-500 to-transparent' : 'bg-gradient-to-br from-rose-500 to-transparent'}`} />

                                <div className="relative flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 shadow-inner ${acc.dailyPnL >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover/item:shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-rose-500/10 border-rose-500/20 text-rose-400 group-hover/item:shadow-[0_0_15px_rgba(244,63,94,0.3)]'}`}>
                                            <span className={`material-symbols-outlined text-[28px]`}>
                                                {acc.dailyPnL >= 0 ? 'trending_up' : 'trending_down'}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white tracking-tight leading-tight group-hover/item:text-primary transition-colors">{acc.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{acc.type} Matrix</span>
                                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{acc.tradeCount} Operatives Today</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-end gap-10">
                                        {appSettings && !appSettings.hideCapitalOnDailyPnL && (
                                            <div className="text-right">
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-1">Unit Balance</span>
                                                <span className="text-slate-300 font-black tracking-tight text-sm">
                                                    {appSettings.maskBalances ? '****' : formatCurrency(acc.balance)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="text-right min-w-[140px]">
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-1 font-bold">Daily Net Returns</span>
                                            <span className={`text-2xl font-black tracking-tighter drop-shadow-md ${acc.dailyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {appSettings.maskBalances ? '****' : formatPnL(acc.dailyPnL, acc.capital)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {accountData.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center">
                            <div className="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                                <span className="material-symbols-outlined text-4xl text-slate-600 drop-shadow-glow">monitoring</span>
                            </div>
                            <h4 className="text-lg font-black text-white uppercase tracking-[0.2em]">Signal Missing</h4>
                            <p className="text-slate-500 text-sm mt-2 max-w-[240px] font-medium italic">No active account synchronization detected for the current session cycle.</p>
                        </div>
                    )}
                </div>

                {/* Premium Summary Badge */}
                <div className="p-10 pt-4">
                    <div className="relative group p-1 bg-gradient-to-br from-primary/20 via-white/5 to-emerald-500/20 rounded-[2.5rem] border border-white/5 overflow-hidden">
                        <div className="absolute inset-0 bg-[#0B0E14] rounded-[2.4rem] m-0.5" />

                        <div className="relative flex items-center justify-between p-8">
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] block mb-2">Aggregated Daily Summary</span>
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Total Executions</span>
                                            <span className="text-xl font-black text-white">{totalTradesToday}</span>
                                        </div>
                                        <div className="w-px h-8 bg-white/5" />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Session Status</span>
                                            <span className={`text-xl font-black ${totalDailyPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {totalDailyPnL >= 0 ? 'IN PROFIT' : 'IN LOSS'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="inline-flex flex-col items-end">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 leading-none">Net Result</span>
                                    <span className={`text-6xl font-black tracking-tighter ${totalDailyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'} drop-shadow-[0_0_25px_rgba(16,185,129,0.2)]`}>
                                        {appSettings.maskBalances ? '****' : formatPnL(totalDailyPnL, accountData.reduce((sum, a) => sum + (a.capital || 0), 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col items-center gap-6">
                        <button
                            onClick={handleShare}
                            disabled={isSharing}
                            className={`group relative px-12 py-5 bg-primary text-white font-black rounded-2xl transition-all duration-500 hover:shadow-[0_0_40px_rgba(124,58,237,0.4)] active:scale-95 disabled:opacity-50 flex items-center gap-4 overflow-hidden`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            <span className="material-symbols-outlined text-[20px] transition-transform group-hover:rotate-12">share</span>
                            <span className="text-[11px] uppercase tracking-[0.3em] font-black">{isSharing ? 'Encoding Matrix...' : 'Share Directive'}</span>
                        </button>

                        <div className="flex items-center justify-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-slate-700" />
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center">Data synchronized via global terminal network</p>
                            <div className="w-1 h-1 rounded-full bg-slate-700" />
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
