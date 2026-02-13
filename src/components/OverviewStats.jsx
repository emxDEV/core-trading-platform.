import React, { useState, useMemo } from 'react';
import { useData } from '../context/TradeContext';
import AnimatedNumber from './AnimatedNumber';

export default function OverviewStats() {
    const { filteredTrades: trades, accounts, stats, appSettings, formatCurrency, formatPnL, analyticsFilters } = useData();

    const filterOptions = [
        { label: 'Total PNL', value: 'all', types: ['Live', 'Funded', 'Evaluation'], icon: 'payments' },
        { label: 'Live PNL', value: 'Live', types: ['Live'], icon: 'sensors' },
        { label: 'Funded PNL', value: 'Funded', types: ['Funded'], icon: 'account_balance' },
        { label: 'Evaluation PNL', value: 'Evaluation', types: ['Evaluation'], icon: 'assignment' },
        { label: 'Demo PNL', value: 'Demo', types: ['Demo'], icon: 'science' },
        { label: 'Backtesting PNL', value: 'Backtesting', types: ['Backtesting'], icon: 'history' },
    ];

    const currentFilter = filterOptions.find(opt => opt.value === analyticsFilters.type) || filterOptions[0];

    const filteredStats = useMemo(() => {
        let matchingAccounts = accounts;
        if (analyticsFilters.accountId !== 'all') {
            matchingAccounts = accounts.filter(acc => String(acc.id) === String(analyticsFilters.accountId));
        }
        if (analyticsFilters.type !== 'all') {
            matchingAccounts = matchingAccounts.filter(acc => acc.type === analyticsFilters.type);
        } else if (currentFilter.value === 'all') {
            // Default "Total" view usually includes these three for prop traders
            matchingAccounts = matchingAccounts.filter(acc => ['Live', 'Funded', 'Evaluation'].includes(acc.type));
        }

        const accountIds = matchingAccounts.map(acc => String(acc.id));

        const filteredTrades = trades.filter(t => accountIds.includes(String(t.account_id)));
        const totalPnL = filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalCapital = matchingAccounts.reduce((sum, acc) => sum + (acc.capital || 0), 0);
        const winCount = filteredTrades.filter(t => t.pnl > 0).length;
        const winRate = filteredTrades.length > 0 ? (winCount / filteredTrades.length) * 100 : 0;

        return {
            totalPnL,
            totalCapital,
            totalTrades: filteredTrades.length,
            winRate
        };
    }, [trades, accounts, analyticsFilters, currentFilter]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Win Rate Card */}
            <div className="bg-slate-900/40 backdrop-blur-[45px] border border-white/10 p-6 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative group/winrate transition-all duration-700 hover:border-primary/40 hover:shadow-primary/10 flex flex-col min-h-[220px] overflow-hidden">
                {/* Glass Reflection Highlight */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                {/* Immersive Background Elements */}
                <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none -z-10">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/winrate:opacity-100 transition-opacity duration-700" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-[3s]" />
                </div>

                <div className="flex items-center justify-between mb-3 relative z-10 text-left">
                    <div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-1 transition-colors group-hover/winrate:text-primary/70">Execution Accuracy</span>
                        <h3 className="text-base font-black text-white uppercase tracking-tighter italic">Win Rate</h3>
                    </div>
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] bg-emerald-500/5 border border-emerald-500/20 px-4 py-1.5 rounded-full shadow-lg shadow-emerald-500/5">{currentFilter.label} Scope</span>
                </div>

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
                    <div className="flex flex-col items-center">
                        <AnimatedNumber
                            value={filteredStats.winRate}
                            formatter={(n) => `${n.toFixed(1)}%`}
                            className={`text-6xl font-black tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover/winrate:scale-110 transition-transform duration-500 italic ${filteredStats.winRate > 50 ? 'text-emerald-400' : filteredStats.winRate === 50 ? 'text-amber-400' : 'text-rose-400'}`}
                        />
                        <div className="flex items-center justify-center gap-2 mt-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${filteredStats.winRate > 50 ? 'bg-emerald-500' : filteredStats.winRate === 50 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Efficiency</span>
                        </div>
                    </div>

                    <div className="relative h-2.5 w-full max-w-[240px] bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5 mt-6">
                        <div
                            className={`h-full rounded-full transition-all duration-[2000ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${filteredStats.winRate > 50
                                ? 'shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                : filteredStats.winRate === 50
                                    ? 'shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                                    : 'shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                                }`}
                            style={{
                                width: `${filteredStats.winRate}%`,
                                background: `linear-gradient(90deg, #f43f5e 0%, #f59e0b 50%, #10b981 100%)`,
                                backgroundSize: `${(100 / (filteredStats.winRate || 1)) * 100}% 100%`
                            }}
                        />
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMiIgdmlld0JveD0iMCAwIDQwIDIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMEg0MFYySDUiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')] bg-repeat-x opacity-20" />
                    </div>
                </div>
            </div>

            {/* P/L Impact Card - Now synchronized with Global Filter */}
            <div className="bg-slate-900/40 backdrop-blur-[45px] border border-white/10 p-6 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative group/pnl transition-all duration-700 hover:border-primary/40 hover:shadow-primary/10 flex flex-col min-h-[220px] z-10 overflow-hidden">
                {/* Glass Reflection Highlight */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none -z-10">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/pnl:opacity-100 transition-opacity duration-700" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full opacity-50 group-hover:scale-110 transition-transform duration-[3s]" />
                </div>

                <div className="flex items-center justify-between mb-3 relative z-30 text-left">
                    <div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-1 transition-colors group-hover/pnl:text-primary/70">Financial Trajectory</span>
                        <div className="flex items-center gap-3">
                            <h3 className="text-base font-black text-white uppercase tracking-tighter italic">P/L Impact</h3>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 shadow-sm">
                                <span className="material-symbols-outlined text-[14px] text-primary">{currentFilter.icon}</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{currentFilter.label}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
                    {appSettings.maskBalances ? (
                        <span className="text-6xl font-black tracking-tighter italic leading-none transition-transform duration-500 group-hover/pnl:scale-105 text-white/20">****</span>
                    ) : (
                        <AnimatedNumber
                            value={filteredStats.totalPnL}
                            formatter={(n) => formatPnL(n, filteredStats.totalCapital)}
                            className={`text-6xl font-black tracking-tighter italic leading-none transition-transform duration-700 group-hover/pnl:scale-110 drop-shadow-2xl ${filteredStats.totalPnL >= 0 ? 'text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.4)]' : 'text-rose-400 drop-shadow-[0_0_25px_rgba(244,63,94,0.4)]'}`}
                        />
                    )}
                    <div className="flex items-center justify-center gap-2 mt-3">
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${filteredStats.totalPnL >= 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic transition-colors group-hover/pnl:text-white/40">
                            {filteredStats.totalPnL >= 0 ? 'Surplus' : 'Deficit'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Total Trades Card */}
            <div className="bg-slate-900/40 backdrop-blur-[45px] border border-white/10 p-6 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative group/volume transition-all duration-700 hover:border-primary/40 hover:shadow-primary/10 flex flex-col min-h-[220px] overflow-hidden">
                {/* Glass Reflection Highlight */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                {/* Immersive Background Elements */}
                <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none -z-10">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/volume:opacity-100 transition-opacity duration-700" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-[3s]" />
                </div>

                <div className="flex items-center justify-between mb-6 relative z-10 text-left">
                    <div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-1 transition-colors group-hover/volume:text-primary/70">Operational Volume</span>
                        <h3 className="text-base font-black text-white uppercase tracking-tighter italic">Total Ops</h3>
                    </div>
                    <button className="text-[9px] font-black text-white/40 hover:text-white bg-white/5 hover:bg-primary px-5 py-2 rounded-full border border-white/10 hover:border-primary/50 transition-all uppercase tracking-[0.2em] shadow-lg shadow-black/20 group/btn">
                        Fleet Log
                    </button>
                </div>

                <div className="relative z-10 flex-1 flex items-center justify-center">
                    {/* Left-aligned Icon box */}
                    <div className="absolute left-0 w-12 h-12 rounded-[1rem] bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xl shadow-primary/5 group-hover/volume:scale-110 group-hover/volume:bg-primary transition-all duration-700">
                        <span className="material-symbols-outlined text-[24px] text-primary group-hover/volume:text-white transition-colors drop-shadow-glow">history</span>
                    </div>

                    {/* Centered Value wrapper */}
                    <div className="flex flex-col items-center text-center">
                        <AnimatedNumber
                            value={filteredStats.totalTrades}
                            formatter={(n) => Math.round(n)}
                            className="text-6xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover/volume:scale-110 transition-transform duration-500"
                        />
                        <div className="flex items-center justify-center gap-2 mt-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                            <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Executions</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
