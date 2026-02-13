import React from 'react';
import { useData } from '../context/TradeContext';
import { useNotifications } from '../context/NotificationContext';

import lucidLogo from '../assets/firms/lucid_trading.png';
import tradeifyLogo from '../assets/firms/tradeify.png';
import alphaFuturesLogo from '../assets/firms/alpha_futures.png';
import topstepLogo from '../assets/firms/topstep.png';

const TYPE_COLORS = {
    'Live': { border: 'border-emerald-500/40 bg-emerald-500/5', dot: 'bg-emerald-500', text: 'text-emerald-500' },
    'Evaluation': { border: 'border-amber-500/40 bg-amber-500/5', dot: 'bg-amber-500', text: 'text-amber-500' },
    'Funded': { border: 'border-cyan-500/40 bg-cyan-500/5', dot: 'bg-cyan-500', text: 'text-cyan-500' },
    'Demo': { border: 'border-sky-500/40 bg-sky-500/5', dot: 'bg-sky-500', text: 'text-sky-500' },
    'Backtesting': { border: 'border-violet-500/40 bg-violet-500/5', dot: 'bg-violet-500', text: 'text-violet-500' },
};

const PROP_FIRMS = [
    { name: 'Lucid Trading', logo: lucidLogo, color: '#06b6d4' },
    { name: 'Tradeify', logo: tradeifyLogo, color: '#10b981' },
    { name: 'Alpha Futures', logo: alphaFuturesLogo, color: '#f59e0b' },
    { name: 'TopStep', logo: topstepLogo, color: '#8b5cf6' },
];

const COLOR_MAP = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    lime: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
};

export default function RecentTrades() {
    const { filteredTrades, deleteTrade, undoDeleteTrade, openModal, getPillColor, formatPnL, accounts, appSettings } = useData();
    const { confirm, showSuccess } = useNotifications();

    const handleDelete = async (trade) => {
        const confirmed = await confirm({
            title: 'Purge Operation?',
            message: `Confirming removal of ${trade.symbol} trade from tactical records. This can be reverted immediately after.`,
            confirmText: 'Execute Purge',
            type: 'danger'
        });

        if (confirmed) {
            const success = await deleteTrade(trade.id);
            if (success) {
                showSuccess({
                    message: `Operation ${trade.symbol} purged from history.`,
                    action: {
                        label: 'Restore',
                        onClick: () => undoDeleteTrade()
                    }
                });
            }
        }
    };

    const getPillStyles = (category, value, fallback = 'primary') => {
        if (category === 'session') {
            if (value === 'Asia') return COLOR_MAP.rose;
            if (value === 'London') return COLOR_MAP.sky;
            if (value === 'New York') return COLOR_MAP.emerald;
        }
        const color = getPillColor(category, value) || fallback;
        return COLOR_MAP[color] || COLOR_MAP.primary;
    };

    return (
        <div className="bg-slate-900/40 backdrop-blur-[45px] rounded-[2.5rem] border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-all duration-700 hover:border-white/20">
            {/* Glass Reflection Highlight */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="px-8 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-md rounded-full shadow-[0_0_15px_rgba(124,93,250,0.5)]" />
                        <span className="material-symbols-outlined text-primary relative z-10 text-xl font-black">history</span>
                    </div>
                    <div>
                        <h2 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter italic text-xl">Mission History</h2>
                        <span className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.3em] block mt-0.5 leading-none">Operational Trade Log</span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto max-h-[530px] overflow-y-auto relative z-10 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20 bg-slate-900/40 backdrop-blur-xl">
                        <tr className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-500 border-b border-white/5">
                            <th className="px-8 py-4">Timestamp</th>
                            <th className="px-5 py-4">Asset</th>
                            <th className="px-5 py-4">Tactical Unit</th>
                            <th className="px-5 py-4">Model</th>
                            <th className="px-5 py-4">Session</th>
                            <th className="px-5 py-4">Vector</th>
                            <th className="px-5 py-4 text-right">Yield</th>
                            <th className="px-8 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                        {filteredTrades.map((trade) => (
                            <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all duration-300 group/row relative overflow-hidden">
                                <td className="px-8 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black dark:text-slate-100 tracking-tight">{trade.date}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Logged</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg border leading-none inline-block italic ${getPillStyles('symbol', trade.symbol, 'sky')}`}>
                                        {trade.symbol}
                                    </span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            {trade.account_prop_firm && PROP_FIRMS.find(f => f.name === trade.account_prop_firm) ? (
                                                <img
                                                    src={PROP_FIRMS.find(f => f.name === trade.account_prop_firm).logo}
                                                    alt={trade.account_prop_firm}
                                                    className="w-7 h-7 rounded-lg object-cover shadow-lg border border-white/10"
                                                />
                                            ) : (
                                                <div className={`w-3 h-3 rounded-full ${TYPE_COLORS[trade.account_type]?.dot || 'bg-slate-400'} ring-4 ring-white/5`}></div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black dark:text-white tracking-tight leading-none">{trade.account_name || 'Protocol Delta'}</span>
                                            {trade.account_type && (
                                                <span className={`text-[8px] uppercase font-black tracking-widest mt-1 ${TYPE_COLORS[trade.account_type]?.text || 'text-slate-500'}`}>
                                                    {trade.account_type}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md border uppercase tracking-widest ${getPillStyles('model', trade.model, 'violet')}`}>
                                        {trade.model || 'DEFAULT'}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md border uppercase tracking-widest ${getPillStyles('session', trade.trade_session, 'primary')}`}>
                                        {trade.trade_session || 'N/A'}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${trade.side === 'LONG' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'} animate-pulse`} />
                                        <span className={`text-[10px] font-black tracking-[0.1em] italic ${trade.side === 'LONG' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {trade.side}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-right font-black">
                                    <span className={`text-[13px] tracking-tighter ${trade.pnl > 0 ? 'text-emerald-500' : trade.pnl < 0 ? 'text-rose-500' : 'text-amber-500'}`}>
                                        {appSettings.maskBalances ? '****' : formatPnL(trade.pnl, accounts.find(a => String(a.id) === String(trade.account_id))?.capital)}
                                    </span>
                                </td>
                                <td className="px-8 py-4 text-right relative overflow-hidden">
                                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover/row:opacity-100 transition-all duration-300 translate-x-2 group-hover/row:translate-x-0">
                                        <button
                                            onClick={() => openModal(trade)}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-primary dark:hover:text-primary-light border border-transparent hover:border-primary/20 transition-all active:scale-90"
                                            title="Modify Entry"
                                        >
                                            <span className="material-symbols-outlined text-base">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(trade)}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 border border-transparent hover:border-rose-500/20 transition-all active:scale-90"
                                            title="Execute Purge"
                                        >
                                            <span className="material-symbols-outlined text-base">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredTrades.length === 0 && (
                            <tr>
                                <td colSpan="8" className="px-8 py-32 text-center relative overflow-hidden">
                                    {/* Empty State Decor */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />

                                    <div className="relative z-10 flex flex-col items-center justify-center space-y-6 max-w-sm mx-auto">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-slate-200 dark:bg-white/5 blur-2xl rounded-full scale-150" />
                                            <div className="w-20 h-20 rounded-3xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center relative z-10 shadow-xl">
                                                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 animate-pulse">radar</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-base font-black dark:text-white uppercase tracking-tighter italic">No Strategic Records</h3>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-loose font-bold">Awaiting first tactical execution data for analysis.</p>
                                        </div>
                                        <button
                                            onClick={() => openModal()}
                                            className="px-8 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center gap-2"
                                        >
                                            Initiate Mission <span className="material-symbols-outlined text-base">add_circle</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {/* Table Footer / Pagination Placeholder */}
            {filteredTrades.length > 0 && (
                <div className="px-10 py-5 bg-slate-50/50 dark:bg-white/[0.01] border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[9px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.2em] relative z-10 italic">
                    <span>Showing core tactical history</span>
                    <span className="flex items-center gap-2">
                        System Online <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </span>
                </div>
            )}
        </div>
    );
}
