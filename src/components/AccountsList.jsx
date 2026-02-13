import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useData, getAccountStats } from '../context/TradeContext';
import CircularProgressRing from './CircularProgressRing';
import AnimatedNumber from './AnimatedNumber';
import { useNotifications } from '../context/NotificationContext';
import { SkeletonAccountCard } from './SkeletonLoader';
import lucidLogo from '../assets/firms/lucid_trading.png';
import tradeifyLogo from '../assets/firms/tradeify.png';
import alphaFuturesLogo from '../assets/firms/alpha_futures.png';
import topstepLogo from '../assets/firms/topstep.png';

const PROP_FIRMS = [
    { name: 'Lucid Trading', logo: lucidLogo, color: '#06b6d4' },
    { name: 'Tradeify', logo: tradeifyLogo, color: '#10b981' },
    { name: 'Alpha Futures', logo: alphaFuturesLogo, color: '#f59e0b' },
    { name: 'TopStep', logo: topstepLogo, color: '#8b5cf6' },
];

const TYPE_COLORS = {
    'Live': { border: 'border-emerald-500/40 bg-emerald-500/10', dot: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    'Evaluation': { border: 'border-amber-500/40 bg-amber-500/10', dot: 'bg-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
    'Funded': { border: 'border-cyan-500/40 bg-cyan-500/10', dot: 'bg-cyan-500', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
    'Demo': { border: 'border-sky-500/40 bg-sky-500/10', dot: 'bg-sky-500', text: 'text-sky-400', glow: 'shadow-sky-500/20' },
    'Backtesting': { border: 'border-violet-500/40 bg-violet-500/10', dot: 'bg-violet-500', text: 'text-violet-400', glow: 'shadow-violet-500/20' },
};

// Observer System for Portals
const useBoundaryObserver = (coords, padding = 16) => {
    const [adjustedStyles, setAdjustedStyles] = useState({
        position: 'fixed',
        top: coords?.y || 0,
        left: coords?.x || 0,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 99999,
    });
    const ref = useRef(null);

    React.useLayoutEffect(() => {
        if (!coords || !ref.current) return;

        const element = ref.current;
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let { x, y } = coords;
        let finalX = x;
        let finalY = y;

        if (x + rect.width > viewportWidth - padding) {
            finalX = viewportWidth - rect.width - padding;
        }
        if (finalX < padding) finalX = padding;

        if (y + rect.height > viewportHeight - padding) {
            finalY = viewportHeight - rect.height - padding;
        }
        if (finalY < padding) finalY = padding;

        setAdjustedStyles({
            position: 'fixed',
            top: finalY,
            left: finalX,
            opacity: 1,
            zIndex: 99999,
            pointerEvents: 'auto',
            transition: 'opacity 0.2s ease-out, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: 'scale(1)',
            transformOrigin: 'top left'
        });
    }, [coords, padding]);

    return { ref, style: adjustedStyles };
};

const SmartPortal = ({ coords, children, padding = 16, className = "" }) => {
    const { ref, style } = useBoundaryObserver(coords, padding);
    return createPortal(
        <div ref={ref} style={style} className={className} onMouseDown={e => e.stopPropagation()}>
            {children}
        </div>,
        document.body
    );
};

const AccountCard = ({ acc, onReset, onContextMenu }) => {
    const { copyGroups, appSettings, formatCurrency, formatPnL } = useData();
    const stats = acc.stats;
    const isBreached = stats?.isBreached;
    const propFirm = PROP_FIRMS.find(f => f.name === acc.prop_firm);

    const activeLeaderGroup = copyGroups.find(g => g.is_active && String(g.leader_account_id) === String(acc.id));
    const activeFollowerInGroup = copyGroups.find(g => g.is_active && g.members && g.members.some(m => String(m.follower_account_id) === String(acc.id)));

    const maxDrawdown = acc.capital - stats?.mll;
    const currentDrawdownRemaining = stats?.drawdownRemaining;
    const drawdownBufferPercent = maxDrawdown > 0 ? (currentDrawdownRemaining / maxDrawdown) * 100 : 0;
    const isCritical = !isBreached && drawdownBufferPercent < 20;
    const isUltraCritical = !isBreached && drawdownBufferPercent < 1;

    return (
        <div
            onContextMenu={(e) => onContextMenu(e, acc)}
            className={`group relative overflow-hidden backdrop-blur-[45px] rounded-[2.5rem] border transition-all duration-700 cursor-default select-none
                ${isBreached
                    ? 'bg-rose-500/5 border-rose-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                    : isUltraCritical
                        ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_60px_rgba(244,63,94,0.25)] animate-pulse'
                        : isCritical
                            ? 'bg-rose-500/5 border-rose-500/30 shadow-2xl shadow-rose-500/10'
                            : 'bg-slate-900/40 border-white/10 hover:border-primary/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] hover:shadow-primary/10'}`}
        >
            {/* Glass Reflection Highlight */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
            {/* Tactical Glow Backdrop */}
            {!isBreached && (
                <div className={`absolute -right-12 -top-12 w-32 h-32 blur-[60px] opacity-20 transition-opacity duration-500 group-hover:opacity-30
                    ${activeLeaderGroup ? 'bg-amber-400' : activeFollowerInGroup ? 'bg-primary' : TYPE_COLORS[acc.type]?.dot === 'bg-emerald-500' ? 'bg-emerald-500' : 'bg-primary'}`}
                />
            )}

            <div className="p-5 relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-inner">
                                {propFirm ? (
                                    <img src={propFirm.logo} alt={acc.prop_firm} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white font-black text-xs opacity-50">{acc.name.substring(0, 2).toUpperCase()}</span>
                                )}
                            </div>

                            {/* Role Badges */}
                            {activeLeaderGroup && (
                                <div className="absolute -top-2 -left-2 bg-gradient-to-br from-amber-300 to-amber-500 text-white w-5 h-5 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/40 border border-white/20 z-10">
                                    <span className="material-symbols-outlined text-[12px] font-black">crown</span>
                                </div>
                            )}
                            {activeFollowerInGroup && (
                                <div className="absolute -top-2 -left-2 bg-gradient-to-br from-primary to-indigo-500 text-white w-5 h-5 rounded-lg flex items-center justify-center shadow-lg shadow-primary/40 border border-white/20 z-10">
                                    <span className="material-symbols-outlined text-[12px] font-black">sync</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-white tracking-tight">{acc.name}</h4>
                                {isCritical && (
                                    <div className="flex items-center gap-1 bg-rose-500/20 px-1.5 py-0.5 rounded-md border border-rose-500/30">
                                        <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Alert</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${isBreached ? 'text-rose-500' : TYPE_COLORS[acc.type]?.text || 'text-slate-400'}`}>
                                    {isBreached ? (acc.breach_report === 'MANUAL_BREACH' ? 'Unit Terminated' : 'Breached') : (acc.is_ranked_up ? 'Graduated Fleet' : acc.type)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {isBreached && (
                        <div className="bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-rose-500/20 border border-white/20">
                            Failed
                        </div>
                    )}
                </div>

                {/* Balance & PnL Section */}
                <div className="space-y-0.5 mb-4">
                    {appSettings.maskBalances ? (
                        <div className="text-3xl font-black text-white/20 tracking-tighter drop-shadow-md">••••••</div>
                    ) : (
                        <AnimatedNumber
                            value={stats?.balance || 0}
                            formatter={(n) => formatCurrency(n)}
                            className="text-xl font-black text-white tracking-tighter drop-shadow-md"
                        />
                    )}
                    <div className="flex items-center gap-2">
                        {appSettings.maskBalances ? (
                            <div className="text-xs font-bold px-2 py-0.5 rounded-full border bg-white/5 border-white/10 text-white/20">••••</div>
                        ) : (
                            <AnimatedNumber
                                value={stats?.totalPnL || 0}
                                formatter={(n) => formatPnL(n, acc.capital)}
                                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${stats?.totalPnL >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
                            />
                        )}
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Net Profit</span>
                    </div>
                </div>

                {/* Performance Hub */}
                {!isBreached && stats?.tradeCount > 0 && (
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-1.5">Combat Win Rate</span>
                            <div className="flex items-end gap-2">
                                <AnimatedNumber
                                    value={stats.winRate}
                                    formatter={(n) => `${n.toFixed(0)}%`}
                                    className={`text-xl font-black tracking-tighter ${stats.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}
                                />
                                <div className="flex gap-0.5 mb-1.5">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div
                                            key={i}
                                            className={`w-1 h-3 rounded-full transition-colors duration-500 ${i <= stats.winRate / 20 ? (stats.winRate >= 50 ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-white/5'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="h-10 w-px bg-white/5" />
                        <div className="flex-1">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-1.5">Profit Factor</span>
                            <AnimatedNumber
                                value={stats.profitFactor}
                                formatter={(n) => n.toFixed(2)}
                                className={`text-xl font-black tracking-tighter ${stats.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-white/60'}`}
                            />
                        </div>
                    </div>
                )}

                {/* Immersive Equity Sparkline */}
                {!isBreached && stats?.recentPnl && stats.recentPnl.length > 1 ? (
                    <div className="mb-4 h-12 w-full relative group/sparkline">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id={`grad-${acc.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor={stats.totalPnL >= 0 ? '#10b981' : '#f43f5e'} stopOpacity="0.2" />
                                    <stop offset="100%" stopColor={stats.totalPnL >= 0 ? '#10b981' : '#f43f5e'} stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            {(() => {
                                const data = stats.recentPnl;
                                let cum = 0;
                                const points = data.map(pnl => { cum += pnl; return cum; });
                                const min = Math.min(0, ...points);
                                const max = Math.max(0, ...points);
                                const range = max - min || 1;

                                const pathD = points.map((val, i) => {
                                    const x = (i / (points.length - 1)) * 100;
                                    const y = 100 - ((val - min) / range) * 100;
                                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                }).join(' ');

                                const areaD = `${pathD} L 100 100 L 0 100 Z`;

                                return (
                                    <>
                                        <path d={areaD} fill={`url(#grad-${acc.id})`} className="opacity-40 transition-opacity group-hover/sparkline:opacity-60" />
                                        <path
                                            d={pathD}
                                            fill="none"
                                            stroke={points[points.length - 1] >= 0 ? '#10b981' : '#f43f5e'}
                                            strokeWidth="3"
                                            vectorEffect="non-scaling-stroke"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-500"
                                        />
                                    </>
                                );
                            })()}
                        </svg>
                    </div>
                ) : !isBreached && (
                    <div className="mb-4 h-12 w-full flex items-center justify-center border border-dashed border-white/5 rounded-2xl">
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Awaiting Data</span>
                    </div>
                )}

                {/* Progress Indicators */}
                <div className="space-y-4">
                    {/* Phase Progress (Evaluation) */}
                    {acc.type === 'Evaluation' && acc.profit_target > 0 && !isBreached && (
                        <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1">Target Progress</span>
                                {appSettings.maskBalances ? (
                                    <span className="text-sm font-black text-white/20">••••</span>
                                ) : (
                                    <AnimatedNumber
                                        value={stats?.remainingToTarget || 0}
                                        formatter={(n) => formatCurrency(n)}
                                        className="text-sm font-black text-white"
                                    />
                                )}
                                <span className="ml-1.5 text-[10px] text-white/30 font-bold uppercase tracking-tighter">to extraction</span>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                                <CircularProgressRing
                                    percentage={Math.min(100, Math.max(0, (stats?.totalPnL / acc.profit_target) * 100))}
                                    size={44}
                                    strokeWidth={4}
                                    color="#10b981"
                                />
                            </div>
                        </div>
                    )}

                    {/* General Drawdown / Payout Status */}
                    {!isBreached && (
                        <div className="space-y-3">
                            {/* Drawdown Bar */}
                            <div>
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5">
                                    <span className="text-white/40">Drawdown Shield</span>
                                    {appSettings.maskBalances ? (
                                        <span className="text-white/20">••••</span>
                                    ) : (
                                        <AnimatedNumber
                                            value={stats?.drawdownRemaining || 0}
                                            formatter={(n) => formatCurrency(n)}
                                            className={isCritical ? 'text-rose-400 animate-pulse' : 'text-rose-400/60'}
                                        />
                                    )}
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 relative ${isCritical ? 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'bg-rose-500/40'}`}
                                        style={{ width: `${Math.min(100, Math.max(0, 100 - (stats?.drawdownRemaining / (acc.capital - stats?.mll)) * 100))}%` }}
                                    >
                                        {isCritical && <div className="absolute inset-0 bg-white/20 animate-pulse-subtle" />}
                                    </div>
                                </div>
                            </div>

                            {/* Payout Goal (Funded) */}
                            {acc.type === 'Funded' && acc.payout_goal > 0 && (
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5">
                                        <span className="text-white/40">Extraction Target</span>
                                        <span className={stats.totalPnL >= acc.payout_goal ? 'text-emerald-400' : 'text-primary'}>
                                            {formatCurrency(acc.payout_goal)}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${stats.totalPnL >= acc.payout_goal
                                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                                : 'bg-primary/50'}`}
                                            style={{ width: `${Math.min(100, Math.max(0, (stats?.totalPnL / acc.payout_goal) * 100))}%` }}
                                        />
                                    </div>
                                    {stats.totalPnL >= acc.payout_goal && (
                                        <div className="flex items-center justify-end gap-1.5 mt-2">
                                            <span className="material-symbols-outlined text-[14px] text-emerald-400 drop-shadow-glow">verified</span>
                                            <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Target Secured</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Breached State Actions */}
                {isBreached && (
                    <div className="mt-8 space-y-4">
                        <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-center">
                            <span className="text-xs font-black text-rose-400 uppercase tracking-widest block mb-1">Unit Neutralized</span>
                            <div className="text-[10px] text-rose-400/60 font-bold leading-tight">
                                {acc.breach_report === 'MANUAL_BREACH' ? 'Decommissioned by Operator' : 'Maximum Loss Boundary Exceeded'}
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onReset(acc);
                            }}
                            className="w-full bg-white dark:bg-white/5 text-[11px] font-black text-white px-4 py-3.5 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all uppercase tracking-[0.2em] shadow-lg active:scale-[0.98]"
                        >
                            Reset Deployment
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function AccountsList() {
    const { accounts, filteredTrades, updateAccount, isLoading } = useData();
    const { confirm } = useNotifications();
    const [contextMenu, setContextMenu] = useState(null);
    const [showAccounts, setShowAccounts] = useState(true);

    const [filterType, setFilterType] = useState('All');
    const [filterFirm, setFilterFirm] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    useEffect(() => {
        const handleOutsideClick = () => setContextMenu(null);
        window.addEventListener('mousedown', handleOutsideClick);
        return () => window.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const handleReset = async (acc) => {
        const confirmed = await confirm({
            title: 'Decommission & Reset',
            message: 'Are you sure you want to reset this unit? Current history will be archived for a fresh deployment.',
            confirmText: 'Reset Deployment',
            type: 'danger'
        });

        if (confirmed) {
            const accountToUpdate = { ...acc };
            delete accountToUpdate.stats;

            await updateAccount({
                ...accountToUpdate,
                prev_reset_date: acc.reset_date,
                reset_date: new Date().toISOString(),
                breach_report: null
            });
        }
        setContextMenu(null);
    };

    const handleUndoReset = async (acc) => {
        const accountToUpdate = { ...acc };
        delete accountToUpdate.stats;

        await updateAccount({
            ...accountToUpdate,
            reset_date: acc.prev_reset_date,
            prev_reset_date: null,
            breach_report: null
        });
        setContextMenu(null);
    };

    const handleManualBreach = async (acc) => {
        const confirmed = await confirm({
            title: 'Manual Neutralization',
            message: 'Are you sure you want to manually decommission this unit?',
            confirmText: 'Confirm Breach',
            type: 'danger'
        });

        if (confirmed) {
            const accountToUpdate = { ...acc };
            delete accountToUpdate.stats;

            await updateAccount({
                ...accountToUpdate,
                breach_report: 'MANUAL_BREACH'
            });
        }
        setContextMenu(null);
    };

    const handleUndoBreach = async (acc) => {
        const accountToUpdate = { ...acc };
        delete accountToUpdate.stats;

        await updateAccount({
            ...accountToUpdate,
            breach_report: null
        });
        setContextMenu(null);
    };

    const onContextMenu = (e, acc) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            acc
        });
    };

    const accountStats = accounts.map(acc => {
        const stats = getAccountStats(acc.id, accounts, filteredTrades);
        return { ...acc, stats };
    })
        .filter(acc => {
            if (filterType !== 'All' && acc.type !== filterType) return false;
            if (filterFirm !== 'All' && acc.prop_firm !== filterFirm) return false;
            if (filterStatus === 'Active' && acc.stats.isBreached) return false;
            if (filterStatus === 'Breached' && !acc.stats.isBreached) return false;
            return true;
        })
        .sort((a, b) => (b.stats?.balance || 0) - (a.stats?.balance || 0));

    const activeAccounts = accountStats.filter(a => !a.stats?.isBreached);
    const breachedAccounts = accountStats.filter(a => a.stats?.isBreached);

    const FilterDropdown = ({ label, options, active, onChange, icon }) => {
        const [isOpen, setIsOpen] = useState(false);
        const containerRef = useRef(null);

        useEffect(() => {
            const clickOutside = (e) => {
                if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
            };
            window.addEventListener('mousedown', clickOutside);
            return () => window.removeEventListener('mousedown', clickOutside);
        }, []);

        return (
            <div className="relative" ref={containerRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${active !== 'All'
                        ? 'bg-primary/20 border-primary/40 text-primary shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                        }`}
                >
                    <span className="material-symbols-outlined text-[18px] opacity-70">{icon}</span>
                    <span>{active === 'All' ? label : active}</span>
                    <span className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {isOpen && (
                    <div className="absolute top-full left-0 mt-3 z-[100] min-w-[200px] bg-[#0F172A]/90 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl py-3 animate-in zoom-in-95 slide-in-from-top-2 duration-300 overflow-hidden">
                        <div className="px-4 py-2 mb-1 border-b border-white/5">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{label} Portal</span>
                        </div>
                        {options.map(opt => (
                            <button
                                key={opt}
                                onClick={() => { onChange(opt); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${active === opt ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-white hover:bg-white/5 hover:translate-x-1'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-10 relative">
            {/* Fleet Command Header & Control Hub */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-[24px]">leaderboard</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-black text-white tracking-tight">Fleet Command</h2>
                            <button
                                onClick={() => setShowAccounts(!showAccounts)}
                                className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-all active:scale-90 group/toggle ${showAccounts ? 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:border-white/20' : 'bg-primary/20 border-primary/30 text-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                    }`}
                                title={showAccounts ? "Collapse Fleet" : "Expand Fleet"}
                            >
                                <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover/toggle:scale-110">
                                    {showAccounts ? 'visibility' : 'visibility_off'}
                                </span>
                            </button>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Operational Unit Overview</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <FilterDropdown
                        label="Category"
                        icon="inventory_2"
                        options={['All', 'Evaluation', 'Funded', 'Live', 'Demo', 'Backtesting']}
                        active={filterType}
                        onChange={setFilterType}
                    />
                    <FilterDropdown
                        label="Manufacturer"
                        icon="domain"
                        options={['All', ...PROP_FIRMS.map(f => f.name)]}
                        active={filterFirm}
                        onChange={setFilterFirm}
                    />

                    <div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />

                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 shadow-inner">
                        {['All', 'Active', 'Breached'].map(opt => (
                            <button
                                key={opt}
                                onClick={() => setFilterStatus(opt)}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === opt
                                    ? (opt === 'Active' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 shadow-inner' :
                                        opt === 'Breached' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 shadow-inner' :
                                            'bg-white text-slate-900 shadow-sm shadow-inner')
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>

                    {(filterType !== 'All' || filterFirm !== 'All' || filterStatus !== 'All') && (
                        <button
                            onClick={() => { setFilterType('All'); setFilterFirm('All'); setFilterStatus('All'); }}
                            className="bg-primary/10 hover:bg-primary/20 text-[10px] font-black text-primary px-4 py-2 rounded-2xl border border-primary/20 transition-all uppercase tracking-widest"
                        >
                            Reset System
                        </button>
                    )}
                </div>
            </div>

            {showAccounts && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-700 space-y-8">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {[1, 2, 3, 4].map(i => <SkeletonAccountCard key={i} />)}
                        </div>
                    ) : (
                        <>
                            {activeAccounts.length > 0 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="w-1.5 h-4 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Operational Units ({activeAccounts.length})</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {activeAccounts.map(acc => <AccountCard key={acc.id} acc={acc} onReset={handleReset} onContextMenu={onContextMenu} />)}
                                    </div>
                                </div>
                            )}

                            {breachedAccounts.length > 0 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="w-1.5 h-4 bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-rose-500/50">Neutralized Units ({breachedAccounts.length})</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {breachedAccounts.map(acc => <AccountCard key={acc.id} acc={acc} onReset={handleReset} onContextMenu={onContextMenu} />)}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Empty State: System Search Failure */}
            {!isLoading && accountStats.length === 0 && (
                <div className="py-24 text-center rounded-[3rem] bg-white/[0.02] border border-dashed border-white/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[80px]" />
                    <div className="relative z-10 max-w-md mx-auto space-y-8">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse" />
                            <div className="relative bg-white/5 w-28 h-28 rounded-[2.5rem] flex items-center justify-center border border-white/10 mx-auto shadow-2xl">
                                <span className="material-symbols-outlined text-6xl text-primary drop-shadow-glow">
                                    {accounts.length === 0 ? 'account_balance' : 'search_off'}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-3xl font-black text-white tracking-tighter">
                                {accounts.length === 0 ? 'Fleet Awaiting Deployment' : 'Target Scan Negative'}
                            </h3>
                            <p className="text-slate-400 font-medium leading-relaxed px-8">
                                {accounts.length === 0
                                    ? 'No operational units detected in the local network. Initiate your first deployment by adding a mission record.'
                                    : 'The current filters yielded no matching units. Adjust your operational criteria or reset the search portal.'}
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={() => { setFilterType('All'); setFilterFirm('All'); setFilterStatus('All'); }}
                                className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group/btn"
                            >
                                <span className="material-symbols-outlined text-[20px] text-primary group-hover/btn:rotate-180 transition-transform duration-500">refresh</span>
                                <span className="text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">Reset Sensors</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Context Menu Portal */}
            {contextMenu && (
                <SmartPortal coords={{ x: contextMenu.x, y: contextMenu.y }} className="min-w-[220px] bg-[#0f111a]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="py-2">
                        <div className="px-4 py-2 border-b border-white/5 mb-1">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Unit Protocols</span>
                        </div>
                        {!contextMenu.acc.stats.isBreached && (
                            <button
                                onClick={() => handleManualBreach(contextMenu.acc)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black text-rose-400 hover:bg-rose-500/10 transition-all text-left uppercase tracking-widest group/item"
                            >
                                <span className="material-symbols-outlined text-[20px] group-hover/item:scale-110 transition-transform">scan_delete</span>
                                Manual Breach
                            </button>
                        )}

                        {contextMenu.acc.breach_report === 'MANUAL_BREACH' && (
                            <button
                                onClick={() => handleUndoBreach(contextMenu.acc)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black text-emerald-400 hover:bg-emerald-500/10 transition-all text-left uppercase tracking-widest group/item"
                            >
                                <span className="material-symbols-outlined text-[20px] group-hover/item:scale-110 transition-transform">undo</span>
                                Restore Unit
                            </button>
                        )}

                        <button
                            onClick={() => handleReset(contextMenu.acc)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black text-slate-300 hover:bg-white/5 transition-all text-left uppercase tracking-widest group/item"
                        >
                            <span className="material-symbols-outlined text-[20px] group-hover/item:rotate-180 transition-transform duration-700">refresh</span>
                            Reset Deployment
                        </button>

                        {contextMenu.acc.prev_reset_date && (
                            <button
                                onClick={() => handleUndoReset(contextMenu.acc)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black text-sky-400 hover:bg-sky-500/10 transition-all text-left uppercase tracking-widest group/item"
                            >
                                <span className="material-symbols-outlined text-[20px] group-hover/item:scale-110 transition-transform">history</span>
                                Revert archiving
                            </button>
                        )}
                    </div>
                </SmartPortal>
            )}
        </div>
    );
}
