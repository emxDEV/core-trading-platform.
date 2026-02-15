import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/TradeContext';
import { toPng } from 'html-to-image';
import PnLCard from './PnLCard';

export default function WeeklySummaryModal() {
    const {
        isWeeklySummaryOpen,
        setIsWeeklySummaryOpen,
        weeklySummaries,
        saveWeeklySummary,
        accounts,
        allTrades,
        formatCurrency,
        formatPnL,
        userProfile,
        stats
    } = useData();

    const [isAnimating, setIsAnimating] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [reflection, setReflection] = useState('');
    const cardRef = useRef(null);

    // activeDate is expected to be the Monday of the week (YYYY-MM-DD)
    const activeDate = typeof isWeeklySummaryOpen === 'string' ? isWeeklySummaryOpen : null;

    useEffect(() => {
        if (isWeeklySummaryOpen) {
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
    }, [isWeeklySummaryOpen]);

    useEffect(() => {
        if (activeDate) {
            const summary = weeklySummaries.find(s => s.week_start === activeDate);
            setReflection(summary?.reflection || '');
        }
    }, [weeklySummaries, activeDate]);

    const weeklyData = useMemo(() => {
        if (!activeDate) return null;

        const [y, m, d_num] = activeDate.split('-').map(Number);
        const d = new Date(y, m - 1, d_num);
        const dayNum = d.getDay() || 7; // Sunday becomes 7
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        start.setDate(d.getDate() - (dayNum - 1)); // Back to Monday

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        const formatDate = (date) => {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        const weeklyTrades = allTrades.filter(t => {
            if (!t.date) return false;
            const [ty, tm, td_val] = t.date.split('-').map(Number);
            const tradeDate = new Date(ty, tm - 1, td_val);
            return tradeDate >= start && tradeDate <= end;
        });

        const totalPnL = weeklyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const winCount = weeklyTrades.filter(t => t.pnl > 0).length;
        const bestTrade = [...weeklyTrades].sort((a, b) => b.pnl - a.pnl)[0];
        const worstTrade = [...weeklyTrades].sort((a, b) => a.pnl - b.pnl)[0];

        // Richer Metrics
        const grossProfit = weeklyTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
        const grossLoss = Math.abs(weeklyTrades.filter(t => t.pnl <= 0).reduce((sum, t) => sum + t.pnl, 0));
        const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 10 : 0) : grossProfit / grossLoss;

        const symbolCounts = {};
        weeklyTrades.forEach(t => {
            symbolCounts[t.symbol] = (symbolCounts[t.symbol] || 0) + 1;
        });
        const mostTraded = Object.entries(symbolCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        const longs = weeklyTrades.filter(t => t.side?.toLowerCase() === 'buy' || t.side?.toLowerCase() === 'long').length;
        const shorts = weeklyTrades.filter(t => t.side?.toLowerCase() === 'sell' || t.side?.toLowerCase() === 'short').length;

        // Account Breakdown
        const accountBreakdown = accounts.map(acc => {
            const accTrades = weeklyTrades.filter(t => String(t.account_id) === String(acc.id));
            const accPnL = accTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
            return {
                ...acc,
                pnl: accPnL,
                tradeCount: accTrades.length
            };
        }).filter(acc => acc.tradeCount > 0);

        return {
            trades: weeklyTrades,
            totalPnL,
            winRate: weeklyTrades.length > 0 ? (winCount / weeklyTrades.length) * 100 : 0,
            tradeCount: weeklyTrades.length,
            bestTrade,
            worstTrade,
            profitFactor,
            mostTraded,
            longs,
            shorts,
            accountBreakdown,
            weekStart: formatDate(start),
            weekEnd: formatDate(end)
        };
    }, [activeDate, allTrades, accounts]);

    if (!isWeeklySummaryOpen && !isVisible) return null;

    const handleSave = async () => {
        const success = await saveWeeklySummary({
            week_start: activeDate,
            reflection,
            is_completed: true
        });
        if (success) {
            setIsWeeklySummaryOpen(false);
        }
    };

    const handleShare = async () => {
        if (!cardRef.current) return;
        setIsSharing(true);
        try {
            await new Promise(r => setTimeout(r, 200));
            const dataUrl = await toPng(cardRef.current, {
                quality: 1,
                pixelRatio: 2,
                width: 1200,
                height: 675,
                cacheBust: true,
                skipFontFace: true,
            });
            const link = document.createElement('a');
            link.download = `CORE-Weekly-${activeDate}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Failed to generate sharing card:', error);
        } finally {
            setIsSharing(false);
        }
    };

    return createPortal(
        <div
            className={`fixed inset-0 z-[1000] flex items-center justify-center p-6 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isAnimating ? 'bg-slate-950/90 backdrop-blur-2xl opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`}
            onClick={() => setIsWeeklySummaryOpen(false)}
        >
            <div
                className={`w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-900/40 backdrop-blur-[45px] border border-white/10 rounded-[3.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform relative ${isAnimating ? 'scale-100 translate-y-0 opacity-100 blur-0' : 'scale-[0.9] translate-y-20 opacity-0 blur-2xl'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Background Layer with Overflow Clipping for Glass Effects */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[3.5rem]">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent" />
                    <div className="absolute inset-0 bg-primary/5 opacity-30 blur-[60px]" />
                </div>

                {/* Header */}
                <div className="flex justify-between items-center px-12 pt-12 pb-8 relative">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
                            <span className="material-symbols-outlined text-primary text-[42px] drop-shadow-glow rotate-12">auto_awesome</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.2em]">Strategic Mission</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                            </div>
                            <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Weekly Performance Protocol...</h2>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">
                                <span className="text-primary">{weeklyData?.weekStart}</span> — <span className="text-primary">{weeklyData?.weekEnd}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsWeeklySummaryOpen(false)}
                        className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 transition-all border border-white/10 active:scale-90 group"
                    >
                        <span className="material-symbols-outlined text-[32px] group-hover:rotate-180 transition-transform duration-500">close</span>
                    </button>
                </div>

                {/* Content Overlay */}
                <div className="px-12 py-4 flex-1 overflow-y-auto space-y-10 custom-scrollbar relative z-10">
                    {/* Visual Highlights & Core Stats */}
                    <div className="grid grid-cols-4 gap-6">
                        <div className="col-span-2 relative group p-1 bg-gradient-to-br from-primary/20 via-white/5 to-emerald-500/20 rounded-[2.5rem] border border-white/5 overflow-hidden">
                            <div className="absolute inset-0 bg-slate-900 rounded-[2.4rem] m-0.5" />
                            <div className="relative p-8 flex items-center justify-between h-full">
                                <div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] block mb-4 italic">Aggregated Result</span>
                                    <span className={`text-5xl font-black tracking-tighter italic shimmer-text ${weeklyData?.totalPnL >= 0 ? 'text-emerald-400 drop-shadow-glow' : 'text-rose-400'}`}>
                                        {formatCurrency(weeklyData?.totalPnL || 0)}
                                    </span>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 font-mono">Mission Success</span>
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${weeklyData?.totalPnL >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        {weeklyData?.totalPnL >= 0 ? 'Surplus' : 'Deficit'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 text-center flex flex-col justify-center hover:bg-white/[0.04] transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 relative z-10">Win Rate</p>
                            <p className="text-3xl font-black text-white italic tracking-tighter relative z-10">
                                {weeklyData?.winRate.toFixed(1)}<span className="text-primary">%</span>
                            </p>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 text-center flex flex-col justify-center hover:bg-white/[0.04] transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 relative z-10">Profit Factor</p>
                            <p className="text-3xl font-black text-primary italic tracking-tighter relative z-10">
                                {weeklyData?.profitFactor.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-4 gap-6">
                        <div className="bg-white/[0.02] border border-white/5 rounded-[1.8rem] p-6 group hover:bg-white/5 transition-all">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Ops</span>
                                <span className="material-symbols-outlined text-primary/40 text-sm">equalizer</span>
                            </div>
                            <span className="text-xl font-black text-white italic">{weeklyData?.tradeCount}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-[1.8rem] p-6 group hover:bg-white/5 transition-all">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Primary Symbol</span>
                                <span className="material-symbols-outlined text-primary/40 text-sm">token</span>
                            </div>
                            <span className="text-xl font-black text-white italic">{weeklyData?.mostTraded}</span>
                        </div>
                        <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-[1.8rem] p-6 group hover:bg-white/5 transition-all">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Bias Distribution</span>
                                <div className="flex gap-2">
                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">{weeklyData?.longs} L</span>
                                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">{weeklyData?.shorts} S</span>
                                </div>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                    style={{ width: `${(weeklyData?.longs / (weeklyData?.tradeCount || 1)) * 100}%` }}
                                />
                                <div
                                    className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                                    style={{ width: `${(weeklyData?.shorts / (weeklyData?.tradeCount || 1)) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Account Breakdown Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic flex items-center gap-3">
                                <div className="w-4 h-[1px] bg-primary/30" />
                                Account Connectivity Review
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {weeklyData?.accountBreakdown.map(acc => (
                                <div key={acc.id} className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 flex justify-between items-center hover:bg-slate-900/60 transition-all border-l-4 group" style={{ borderLeftColor: acc.pnl >= 0 ? '#10b98133' : '#f43f5e33' }}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${acc.pnl >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                            <span className="material-symbols-outlined text-xl">{acc.pnl >= 0 ? 'trending_up' : 'trending_down'}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-white italic uppercase tracking-tight">{acc.name}</h4>
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{acc.tradeCount} Ops this week</p>
                                        </div>
                                    </div>
                                    <span className={`text-md font-black tracking-tighter italic ${acc.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {formatCurrency(acc.pnl)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Peak Performance vs Max Drawdown */}
                    <div className="grid grid-cols-2 gap-8 pt-4">
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.4em] italic px-2">Peak Performance</h3>
                            {weeklyData?.bestTrade ? (
                                <div className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-[2rem] p-8 relative overflow-hidden group hover:bg-emerald-500/[0.05] transition-all">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <span className="material-symbols-outlined text-4xl rotate-12 text-emerald-500">rocket_launch</span>
                                    </div>
                                    <div className="flex justify-between items-end relative z-10">
                                        <div>
                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-2 block font-mono">Top Execution</span>
                                            <h4 className="text-2xl font-black text-white italic">{weeklyData.bestTrade.symbol}</h4>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2 italic font-mono">{weeklyData.bestTrade.date}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-3xl font-black text-emerald-400 drop-shadow-glow italic">+{formatCurrency(weeklyData.bestTrade.pnl)}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-28 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem] flex items-center justify-center">
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">No Data Signal</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-rose-500/60 uppercase tracking-[0.4em] italic px-2">Maximum Drawdown</h3>
                            {weeklyData?.worstTrade ? (
                                <div className="bg-rose-500/[0.03] border border-rose-500/10 rounded-[2rem] p-8 relative overflow-hidden group hover:bg-rose-500/[0.05] transition-all">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <span className="material-symbols-outlined text-4xl -rotate-12 text-rose-500">warning</span>
                                    </div>
                                    <div className="flex justify-between items-end relative z-10">
                                        <div>
                                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-2 block font-mono">Max Risk Event</span>
                                            <h4 className="text-2xl font-black text-white italic">{weeklyData.worstTrade.symbol}</h4>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2 italic font-mono">{weeklyData.worstTrade.date}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-3xl font-black text-rose-400 italic">{formatCurrency(weeklyData.worstTrade.pnl)}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-28 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem] flex items-center justify-center">
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">No Data Signal</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Trades Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic flex items-center gap-3">
                                <div className="w-4 h-[1px] bg-primary/30" />
                                Top Tier Executions
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {[...(weeklyData?.trades || [])].sort((a, b) => b.pnl - a.pnl).slice(0, 5).map((trade, i) => (
                                <div key={trade.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex justify-between items-center hover:bg-white/[0.04] transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                            <span className="text-[10px] font-black">#{i + 1}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black text-white italic uppercase">{trade.symbol}</h4>
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{trade.date}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-emerald-400 italic">+{formatCurrency(trade.pnl)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reflection Area - Enhanced Styling */}
                    <div className="space-y-6 pt-6">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic flex items-center gap-3">
                                <div className="w-4 h-[1px] bg-primary/30" />
                                Strategic Synthesis & Mindset
                            </h3>
                            <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-xs">history_edu</span>
                                Required Reflection
                            </div>
                        </div>
                        <div className="relative group p-[1px] bg-white/10 rounded-[2.5rem] transition-all duration-700 focus-within:bg-primary/30">
                            <textarea
                                className="w-full bg-slate-900 shadow-inner rounded-[2.4rem] p-10 text-sm font-black leading-relaxed text-slate-200 outline-none backdrop-blur-md transition-all min-h-[160px] italic placeholder:text-slate-700 relative z-10"
                                placeholder="Synthesize the week's execution quality, mental state, and market adaptation..."
                                value={reflection}
                                onChange={(e) => setReflection(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-12 pt-6 flex gap-6 border-t border-white/5 bg-slate-950/40 backdrop-blur-md relative z-20">
                    <button
                        onClick={handleShare}
                        disabled={isSharing}
                        className="flex-1 py-6 bg-white/5 text-slate-500 font-black rounded-2xl hover:bg-white/10 hover:text-white transition-all text-[11px] uppercase tracking-[0.3em] border border-white/10 flex items-center justify-center gap-3 group active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform duration-500">share</span>
                        {isSharing ? 'Encoding...' : 'Share Directive'}
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-[2.5] py-6 bg-primary text-white font-black rounded-2xl hover:bg-primary-light transition-all text-[12px] uppercase tracking-[0.4em] shadow-2xl relative overflow-hidden group active:scale-95"
                    >
                        <div className="relative z-10 flex items-center justify-center gap-4">
                            Archive Week Protocol <span className="material-symbols-outlined text-[24px] group-hover:translate-x-2 transition-transform duration-500">send</span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    </button>
                </div>

                {/* Hidden Capture Area for PnLCard */}
                <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
                    <PnLCard
                        ref={cardRef}
                        data={{
                            totalDailyPnL: weeklyData?.totalPnL || 0,
                            totalTradesToday: weeklyData?.tradeCount || 0,
                            date: activeDate
                        }}
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
