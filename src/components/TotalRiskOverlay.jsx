import React, { useMemo } from 'react';
import { useData } from '../context/TradeContext';

const TotalRiskOverlay = () => {
    const { accounts, getAccountStats, filteredTrades, appSettings, formatCurrency } = useData();

    const fleetStats = useMemo(() => {
        const activeAccounts = accounts.filter(acc => acc.type !== 'Demo' && acc.type !== 'Backtesting');

        const totals = activeAccounts.reduce((acc, account) => {
            const stats = getAccountStats(account.id, accounts, filteredTrades);
            if (!stats) return acc;

            return {
                totalCapital: acc.totalCapital + (parseFloat(account.capital) || 0),
                totalBalance: acc.totalBalance + (stats.balance || 0),
                totalMLL: acc.totalMLL + (stats.mll || 0),
                count: acc.count + 1
            };
        }, { totalCapital: 0, totalBalance: 0, totalMLL: 0, count: 0 });

        const totalExposure = totals.totalBalance - totals.totalMLL;
        const fleetHealth = totals.totalCapital > 0
            ? (totals.totalMLL / totals.totalCapital) * 100
            : 0;

        return {
            ...totals,
            totalExposure,
            fleetHealth
        };
    }, [accounts, getAccountStats, filteredTrades]);

    if (fleetStats.count === 0) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <div className="lg:col-span-3 bg-[#0F172A]/80 backdrop-blur-2xl rounded-3xl p-6 border border-white/5 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-primary/20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 transition-transform duration-[3s] group-hover:scale-125 -z-10" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-amber-500 text-sm">shield</span>
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Strategic Risk Overlay</span>
                        </div>
                        <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Total Fleet Exposure</h3>
                    </div>

                    <div className="flex items-center gap-10">
                        <div className="text-right">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-1 text-right">Net Liquidity</span>
                            <span className="text-xl font-black text-emerald-400 tracking-tighter">
                                {appSettings.maskBalances ? '****' : formatCurrency(fleetStats.totalBalance)}
                            </span>
                        </div>
                        <div className="w-px h-10 bg-white/10" />
                        <div className="text-right">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-1 text-right">Max Risk Cap</span>
                            <span className="text-xl font-black text-rose-400 tracking-tighter text-right">
                                {appSettings.maskBalances ? '****' : formatCurrency(fleetStats.totalMLL)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 max-w-md">
                        <div className="flex-1">
                            <div className="flex justify-between text-[8px] font-black text-white/40 uppercase tracking-widest mb-1.5">
                                <span>Risk-to-Breach Distance</span>
                                <span className="text-white/60">{formatCurrency(fleetStats.totalExposure)} Available</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-primary rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (fleetStats.totalExposure / fleetStats.totalCapital) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 ml-8">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">System Stable</span>
                    </div>
                </div>
            </div>

            <div className="bg-[#0F172A]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col justify-center items-center text-center relative overflow-hidden group/utilization transition-all duration-500 hover:border-primary/20 hover:shadow-primary/5">
                {/* Immersive Background Elements */}
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/utilization:opacity-100 transition-opacity duration-700 -z-10" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/20 blur-[60px] rounded-full opacity-40 group-hover/utilization:opacity-70 transition-opacity duration-1000 -z-10" />
                <div className="absolute top-4 right-4 transition-transform duration-700 group-hover/utilization:rotate-12">
                    <span className="material-symbols-outlined text-white/5 text-4xl select-none">share_reviews</span>
                </div>

                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 relative z-10 transition-colors group-hover/utilization:text-primary/70">Fleet Utilization</span>

                <div className="relative z-10 flex flex-col items-center gap-1 mb-3">
                    <div className="text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] group-hover/utilization:scale-110 transition-transform duration-500">
                        {fleetStats.count}
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Deployed Units</span>
                </div>

                <div className="relative z-10">
                    <div className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] bg-emerald-500/10 px-5 py-2.5 rounded-2xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)] flex items-center gap-3 transition-all group-hover/utilization:border-emerald-500/40">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        Prop Ready
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TotalRiskOverlay;
