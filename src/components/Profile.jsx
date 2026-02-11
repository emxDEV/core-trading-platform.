import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/TradeContext';
import { useNotifications } from '../context/NotificationContext';
import { COUNTRIES } from '../constants/countries';

export default function Profile() {
    const { userProfile, updateUserProfile, stats, accounts, activeTrades, ranks } = useData();
    const { showSuccess, showInfo, showError } = useNotifications();

    const fileInputRef = useRef(null);

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ ...userProfile });
    const [newGoalText, setNewGoalText] = useState('');

    const currentRank = stats.rank || ranks[0];
    const nextRank = ranks.find(r => r.level === currentRank.level + 1);

    const xpProgress = useMemo(() => {
        if (!nextRank) return 100;
        const range = nextRank.minXp - currentRank.minXp;
        const currentProgress = stats.xp - currentRank.minXp;
        return Math.min(100, Math.max(0, (currentProgress / range) * 100));
    }, [stats.xp, currentRank, nextRank]);

    // ── Mastery Matrix (calculated from real trade data) ──
    const masteryScores = useMemo(() => {
        const trades = activeTrades;
        if (!trades.length) return { strategyConsistency: 0, riskNeutralization: 0, emotionalStability: 0, positionSizing: 0 };

        // Strategy Consistency: how often you use your top entry signal
        const signalCounts = {};
        trades.forEach(t => {
            const signal = (t.entry_signal || '').trim();
            if (signal) signalCounts[signal] = (signalCounts[signal] || 0) + 1;
        });
        const tradesWithSignal = trades.filter(t => (t.entry_signal || '').trim()).length;
        const topSignalCount = Math.max(0, ...Object.values(signalCounts));
        const strategyConsistency = tradesWithSignal > 0
            ? Math.round((topSignalCount / tradesWithSignal) * 100)
            : 0;

        // Risk Neutralization: % of trades with SL set
        const tradesWithSL = trades.filter(t => t.sl_pips && parseFloat(t.sl_pips) > 0).length;
        const riskNeutralization = Math.round((tradesWithSL / trades.length) * 100);

        // Emotional Stability: 100% minus penalty for bad psychology notes
        const negativeKeywords = ['revenge', 'fomo', 'overtrad', 'tilt', 'impuls', 'emotional', 'fear', 'greed', 'frustrat'];
        const badTrades = trades.filter(t => {
            const psych = (t.psychology || '').toLowerCase();
            return negativeKeywords.some(kw => psych.includes(kw));
        }).length;
        const emotionalStability = Math.max(0, Math.round(100 - (badTrades / trades.length) * 150));

        // Position Sizing: % of trades with risk_percent defined
        const tradesWithRisk = trades.filter(t => t.risk_percent && parseFloat(t.risk_percent) > 0).length;
        const positionSizing = Math.round((tradesWithRisk / trades.length) * 100);

        return { strategyConsistency, riskNeutralization, emotionalStability, positionSizing };
    }, [activeTrades]);

    // ── Tactical Grade (derived from mastery + performance) ──
    const tacticalGrade = useMemo(() => {
        const trades = activeTrades;
        const winRate = trades.length ? (trades.filter(t => t.pnl > 0).length / trades.length) * 100 : 0;
        const totalPnL = trades.reduce((s, t) => s + (t.pnl || 0), 0);
        const fundedCount = accounts.filter(a => a.type === 'Funded').length;

        // Execution Grade based on win rate
        const execGrades = [
            { min: 70, grade: 'SSR+', color: 'text-amber-400' },
            { min: 60, grade: 'S+', color: 'text-amber-400' },
            { min: 55, grade: 'S', color: 'text-yellow-400' },
            { min: 50, grade: 'A+', color: 'text-emerald-400' },
            { min: 45, grade: 'A', color: 'text-emerald-400' },
            { min: 40, grade: 'B+', color: 'text-cyan-400' },
            { min: 35, grade: 'B', color: 'text-cyan-400' },
            { min: 30, grade: 'C', color: 'text-slate-400' },
            { min: 0, grade: 'D', color: 'text-rose-400' },
        ];
        const exec = execGrades.find(g => winRate >= g.min) || execGrades[execGrades.length - 1];

        // Discipline based on average mastery
        const avgMastery = (masteryScores.strategyConsistency + masteryScores.riskNeutralization + masteryScores.emotionalStability + masteryScores.positionSizing) / 4;
        const discGrades = [
            { min: 90, grade: 'MAX', color: 'text-emerald-400' },
            { min: 75, grade: 'HIGH', color: 'text-emerald-400' },
            { min: 60, grade: 'MED', color: 'text-yellow-400' },
            { min: 40, grade: 'LOW', color: 'text-amber-400' },
            { min: 0, grade: 'MIN', color: 'text-rose-400' },
        ];
        const disc = discGrades.find(g => avgMastery >= g.min) || discGrades[discGrades.length - 1];

        // Scaling Potential based on funded accounts + PnL
        let scalingScore = 0;
        scalingScore += Math.min(40, fundedCount * 10); // up to 40 from funded accounts
        scalingScore += Math.min(30, Math.max(0, totalPnL / 500) * 10); // up to 30 from PnL
        scalingScore += Math.min(30, trades.length >= 100 ? 30 : trades.length >= 50 ? 20 : trades.length >= 20 ? 10 : 0); // up to 30 from experience
        const scaleGrades = [
            { min: 80, grade: 'A++', color: 'text-cyan-400' },
            { min: 60, grade: 'A+', color: 'text-cyan-400' },
            { min: 40, grade: 'A', color: 'text-emerald-400' },
            { min: 25, grade: 'B+', color: 'text-yellow-400' },
            { min: 10, grade: 'B', color: 'text-amber-400' },
            { min: 0, grade: 'C', color: 'text-slate-400' },
        ];
        const scale = scaleGrades.find(g => scalingScore >= g.min) || scaleGrades[scaleGrades.length - 1];

        // Overall tier
        const overallScore = (winRate * 0.4 + avgMastery * 0.3 + scalingScore * 0.3);
        let tier, label;
        if (overallScore >= 75) { tier = 'Top 1%'; label = 'Elite'; }
        else if (overallScore >= 60) { tier = 'Top 5%'; label = 'Advanced'; }
        else if (overallScore >= 45) { tier = 'Top 15%'; label = 'Proficient'; }
        else if (overallScore >= 30) { tier = 'Top 30%'; label = 'Developing'; }
        else if (trades.length === 0) { tier = 'Unranked'; label = 'No Data'; }
        else { tier = 'Top 50%'; label = 'Rookie'; }

        return {
            tier, label,
            executionGrade: exec.grade, executionColor: exec.color,
            disciplineGrade: disc.grade, disciplineColor: disc.color,
            scalingGrade: scale.grade, scalingColor: scale.color,
        };
    }, [activeTrades, accounts, masteryScores]);

    // ── Today's XP ──
    const todayXp = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayTrades = activeTrades.filter(t => t.date === todayStr);
        if (!todayTrades.length) return 0;
        const wins = todayTrades.filter(t => t.pnl > 0).length;
        const pnl = todayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
        return todayTrades.length * 15 + wins * 35 + Math.max(0, Math.floor(pnl / 100)) * 10;
    }, [activeTrades]);

    const handleSave = () => {
        updateUserProfile(editData);
        setIsEditing(false);
        showSuccess('Profile encrypted and updated successfully');
    };

    const handleGoalToggle = (goalId) => {
        const updatedGoals = userProfile.goals.map(g =>
            g.id === goalId ? { ...g, completed: !g.completed } : g
        );
        updateUserProfile({ goals: updatedGoals });
        showInfo('Trading objective updated');
    };

    const handleAddGoal = () => {
        if (!newGoalText.trim()) return;
        const newGoal = {
            id: Date.now(),
            text: newGoalText.trim(),
            completed: false
        };
        setEditData(prev => ({
            ...prev,
            goals: [...prev.goals, newGoal]
        }));
        setNewGoalText('');
    };

    const handleRemoveGoal = (id) => {
        setEditData(prev => ({
            ...prev,
            goals: prev.goals.filter(g => g.id !== id)
        }));
    };

    const handleShareDNA = () => {
        const dnaSummary = `
            Trading DNA: ${userProfile.name}
            Rank: ${currentRank.name} (LVL ${currentRank.level})
            Total P/L: ${formatCurrency(stats.totalPnL)}
            Win Rate: ${stats.winRate}%
            XP: ${stats.xp}
        `.replace(/^\s+/gm, '');

        navigator.clipboard.writeText(dnaSummary);
        showSuccess('Trading DNA copied to clipboard');
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                showError('File too large. Max 2MB allowed.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setEditData(prev => ({ ...prev, avatar: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(val || 0);
    };

    // Derived stats
    const totalFundedCapital = accounts
        .filter(acc => acc.type === 'Funded')
        .reduce((sum, acc) => sum + (acc.capital || 0), 0);

    const profitFactor = activeTrades.length > 0
        ? (activeTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) /
            Math.abs(activeTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) || 1)).toFixed(2)
        : '0.00';

    return (
        <div className="max-w-7xl mx-auto py-12 px-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Operator Profile</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic">
                        Global Standing
                    </h2>
                </div>

                <div className="flex items-center gap-4 bg-white dark:bg-surface-dark backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 pr-8 border-l-4 border-l-primary shadow-sm">
                    <div className={`w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg ${currentRank.color.replace('text-', 'shadow-')}/20`}>
                        <span className={`material-symbols-outlined text-[26px] ${currentRank.color}`}>{currentRank.icon}</span>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Current Rank</div>
                        <div className={`text-lg font-black tracking-tight leading-none ${currentRank.color}`}>{currentRank.name}</div>
                    </div>
                    <div className="ml-8 pl-8 border-l border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Operator Level</div>
                        <div className="text-2xl font-black dark:text-white tracking-tighter leading-none">LVL {currentRank.level}</div>
                    </div>
                </div>
            </div>

            {/* Main Rank Progress Container */}
            <div className="mb-12 relative group">
                <div className="relative bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 overflow-hidden shadow-sm">
                    <div className="flex justify-between items-end mb-4 px-2">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Deployment Path:</span>
                            <span className="text-xs font-black text-primary uppercase tracking-widest italic">{nextRank?.name || 'MAX RANK ACHIEVED'}</span>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-black dark:text-white tracking-tighter leading-none">{Math.floor(stats.xp).toLocaleString()}</span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">/ {nextRank?.minXp?.toLocaleString() || 'MAX'} XP</span>
                        </div>
                    </div>
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-800">
                        <div
                            className="h-full bg-gradient-to-r from-primary via-emerald-400 to-cyan-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(124,93,250,0.3)] relative"
                            style={{ width: `${xpProgress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/10 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Detail Card */}
            <div className="relative mb-12">
                <div className="relative bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 overflow-hidden shadow-sm">
                    <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12">
                        {/* Avatar Column */}
                        <div className="relative group/avatar">
                            <div className="absolute -inset-2 bg-gradient-to-br from-primary via-emerald-400 to-cyan-400 rounded-[3.8rem] p-0.5 opacity-50 shadow-xl shadow-primary/10">
                                <div className="absolute inset-0 bg-white/5 rounded-[3.7rem] opacity-0 group-hover/avatar:opacity-100 transition duration-500" />
                            </div>
                            <div className="relative w-44 h-44 rounded-[3.5rem] overflow-hidden bg-slate-900 border-4 border-white/5">
                                <img
                                    src={userProfile.avatar}
                                    className="w-full h-full object-cover transform transition duration-700 group-hover/avatar:scale-110"
                                    alt="Operator Profile"
                                />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-primary border-4 border-white dark:border-surface-dark rounded-2xl flex items-center justify-center shadow-xl">
                                <span className="material-symbols-outlined text-white text-[24px]">verified_user</span>
                            </div>
                        </div>

                        {/* Info Column */}
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-5 mb-6 mt-2">
                                <h1 className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic leading-none">
                                    {userProfile.name}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <div className={`px-4 py-1.5 rounded-xl bg-slate-900 border border-white/10 ${currentRank.color} text-[9px] font-black uppercase tracking-[0.2em] shadow-lg`}>
                                        {currentRank.name}
                                    </div>
                                    <div className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
                                        LVL {currentRank.level}
                                    </div>
                                </div>
                            </div>

                            <p className="text-slate-500 dark:text-slate-400 text-base font-bold leading-relaxed max-w-2xl italic mb-8 border-l-4 border-primary/20 pl-6">
                                "{userProfile.bio}"
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                                <div className="space-y-4">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block">HQ Station</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-3xl filter drop-shadow-sm leading-none">
                                            {COUNTRIES.find(c => c.name === userProfile.location)?.flag || '📍'}
                                        </span>
                                        <div>
                                            <div className="text-slate-800 dark:text-white font-black tracking-tight leading-none text-sm">{userProfile.location}</div>
                                            <div className="text-[9px] font-black text-primary/60 uppercase tracking-widest mt-0.5">Authorized</div>
                                        </div>
                                    </div>
                                </div>

                                <Metric label="Risk Protocol" value={userProfile.riskAppetite} />
                                <Metric label="Total Earnings" value={formatCurrency(stats.totalPnL)} />
                                <Metric label="Global Winrate" value={`${stats.winRate}%`} />
                            </div>
                        </div>

                        {/* Action Column */}
                        <div className="flex lg:flex-col gap-4 w-full lg:w-auto mt-8 lg:mt-0">
                            <button
                                onClick={() => {
                                    setEditData({ ...userProfile });
                                    setIsEditing(true);
                                }}
                                className="flex-1 lg:w-44 py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-light transition-all shadow-lg active:scale-95 text-[9px] uppercase tracking-[0.3em] border border-white/10"
                            >
                                Overhaul ID
                            </button>
                            <button
                                onClick={handleShareDNA}
                                className="flex-1 lg:w-44 py-4 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-black rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800 active:scale-95 text-[9px] uppercase tracking-[0.3em]"
                            >
                                Extract DNA
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Sections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Rank Journey Column */}
                <div className="lg:col-span-8 space-y-10">
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-[2rem] p-10 overflow-hidden relative shadow-sm">
                        <div className="flex items-center justify-between mb-12">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                    <span className="material-symbols-outlined text-amber-500">military_tech</span>
                                </div>
                                Rank Hierarchy
                            </h3>
                            <div className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                {ranks.length} Specialized Tiers
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {ranks.map(r => (
                                <div key={r.level} className={`relative group/rank p-6 rounded-2xl border transition-all duration-500 ${r.level === currentRank.level
                                    ? 'bg-primary/5 border-primary/30 shadow-sm'
                                    : r.level < currentRank.level
                                        ? 'bg-emerald-500/5 border-emerald-500/10'
                                        : 'bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/50 opacity-40 grayscale group-hover/rank:grayscale-0 transition-all'
                                    }`}>
                                    <div className={`w-11 h-11 rounded-xl mb-4 flex items-center justify-center transition-transform duration-500 group-hover/rank:scale-110 shadow-sm ${r.level <= currentRank.level ? 'bg-slate-900 border border-white/5' : 'bg-slate-200 dark:bg-white/5'
                                        }`}>
                                        <span className={`material-symbols-outlined text-[22px] ${r.level <= currentRank.level ? r.color : 'text-slate-400'}`}>
                                            {r.icon}
                                        </span>
                                    </div>
                                    <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${r.level <= currentRank.level ? 'text-primary' : 'text-slate-500'}`}>Tier {r.level}</div>
                                    <div className={`text-sm font-black tracking-tight ${r.level <= currentRank.level ? 'dark:text-white' : 'text-slate-400'}`}>{r.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quest Log */}
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-[2rem] p-10 relative overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <span className="material-symbols-outlined text-primary">terminal</span>
                                </div>
                                Operational Objectives
                            </h3>
                            <div className="flex gap-2">
                                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                    {userProfile.goals.filter(g => g.completed).length} Success
                                </div>
                                <div className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest">
                                    {userProfile.goals.filter(g => !g.completed).length} Active
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            {userProfile.goals.map((goal, idx) => (
                                <button
                                    key={goal.id}
                                    onClick={() => handleGoalToggle(goal.id)}
                                    className={`w-full flex items-center gap-5 p-5 border rounded-2xl group transition-all duration-500 text-left ${goal.completed
                                        ? 'bg-emerald-500/[0.03] border-emerald-500/10 hover:bg-emerald-500/[0.06]'
                                        : 'bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/50 hover:border-primary/20 hover:bg-white/[0.02]'
                                        }`}
                                >
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black transition-all duration-500 group-hover:scale-105 shadow-sm ${goal.completed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-200 dark:bg-white/5 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'
                                        }`}>
                                        {goal.completed ? (
                                            <span className="material-symbols-outlined text-[22px]">task_alt</span>
                                        ) : (
                                            <span className="text-base font-black tracking-tighter">0{idx + 1}</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className={`text-[8px] font-black uppercase tracking-[0.4em] mb-1 ${goal.completed ? 'text-emerald-500/50' : 'text-slate-500'}`}>Mission Objective {idx + 1}</div>
                                        <div className={`text-base font-black tracking-tight transition-all duration-500 ${goal.completed ? 'text-emerald-500 line-through opacity-50' : 'text-slate-700 dark:text-slate-200'
                                            }`}>
                                            {goal.text}
                                        </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${goal.completed ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 group-hover:bg-primary group-hover:text-white'}`}>
                                        {goal.completed ? 'Completed' : 'Execute'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tactical Stats Column */}
                <div className="lg:col-span-4 space-y-10">
                    {/* Global Standing Card */}
                    <div className="bg-gradient-to-br from-[#1E1B2E] via-[#2A2445] to-[#1E1B2E] rounded-[2.5rem] p-10 text-white shadow-sm relative overflow-hidden group border border-slate-200/5 dark:border-white/5">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-125 transition-transform duration-[3s]" />

                        <div className="relative">
                            <div className="flex items-center gap-3 mb-8">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">Tactical Grade</span>
                                <div className="flex-1 h-px bg-white/5" />
                            </div>

                            <h4 className="text-4xl font-black mb-10 leading-none tracking-tighter italic">
                                {tacticalGrade.tier}<br />{tacticalGrade.label}
                            </h4>

                            <div className="space-y-4">
                                <StandingItem label="Execution Grade" value={tacticalGrade.executionGrade} color={tacticalGrade.executionColor} />
                                <StandingItem label="Tactical Discipline" value={tacticalGrade.disciplineGrade} color={tacticalGrade.disciplineColor} />
                                <StandingItem label="Scaling Potential" value={tacticalGrade.scalingGrade} color={tacticalGrade.scalingColor} />
                            </div>

                            <button className="w-full py-5 bg-white text-slate-900 font-black rounded-xl text-[9px] uppercase tracking-[0.3em] mt-10 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95 shadow-sm">
                                Access Leaderboard
                            </button>
                        </div>
                    </div>

                    {/* Progress Stats */}
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-[2rem] p-10 relative overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between mb-10 text-slate-800 dark:text-white">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Mastery Matrix</span>
                            <span className="material-symbols-outlined text-primary text-[24px]">insights</span>
                        </div>
                        <div className="space-y-8">
                            <MasteryItem label="Strategy Consistency" value={masteryScores.strategyConsistency} />
                            <MasteryItem label="Risk Neutralization" value={masteryScores.riskNeutralization} />
                            <MasteryItem label="Emotional Stability" value={masteryScores.emotionalStability} />
                            <MasteryItem label="Position Sizing" value={masteryScores.positionSizing} />
                        </div>

                        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">XP Bonus Today</div>
                                <div className="text-lg font-black text-emerald-400">+{todayXp.toLocaleString()} XP</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                <span className="material-symbols-outlined text-[20px]">bolt</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal (Overhauled) */}
            {isEditing && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-8 bg-background-dark/95 backdrop-blur-3xl" style={{ animation: 'fadeIn 0.3s ease' }} onClick={() => setIsEditing(false)}>
                    <div className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        {/* Fixed Header */}
                        <div className="flex items-center justify-between p-10 pb-6 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic">Redefine Identity</h2>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Authorized Profile Modification</p>
                            </div>
                            <button onClick={() => setIsEditing(false)} className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all hover:bg-rose-500/20 hover:text-rose-500 border border-transparent dark:border-white/5">
                                <span className="material-symbols-outlined text-[24px]">close</span>
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-10 pt-8 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                                <div className="space-y-10">
                                    <div className="space-y-6">
                                        <InputWrapper label="Codename">
                                            <input
                                                className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-5 focus:ring-4 focus:ring-primary/20 outline-none text-slate-800 dark:text-white font-black uppercase tracking-widest"
                                                value={editData.name}
                                                onChange={e => setEditData({ ...editData, name: e.target.value })}
                                            />
                                        </InputWrapper>

                                        <InputWrapper label="Identity Visual (Avatar)">
                                            <div className="flex items-center gap-6">
                                                <div className="relative group/avatar">
                                                    <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-primary/20 bg-slate-100 dark:bg-white/5 relative">
                                                        <img
                                                            src={editData.avatar}
                                                            className="w-full h-full object-cover"
                                                            alt="Preview"
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-white">photo_camera</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={handleAvatarUpload}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="w-full py-4 bg-slate-100 dark:bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all mb-2"
                                                    >
                                                        Select New File
                                                    </button>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">PNG, JPG up to 2MB</p>
                                                </div>
                                            </div>
                                        </InputWrapper>

                                        <InputWrapper label="Trading Philosophy Statement">
                                            <textarea
                                                rows="4"
                                                className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-[2rem] px-6 py-5 focus:ring-4 focus:ring-primary/20 outline-none text-slate-800 dark:text-white font-medium text-lg leading-relaxed italic"
                                                value={editData.bio}
                                                onChange={e => setEditData({ ...editData, bio: e.target.value })}
                                            />
                                        </InputWrapper>
                                    </div>
                                </div>

                                <div className="space-y-10">
                                    <div className="grid grid-cols-2 gap-6">
                                        <InputWrapper label="Base Location">
                                            <CountrySelector
                                                value={editData.location}
                                                onChange={val => setEditData({ ...editData, location: val })}
                                            />
                                        </InputWrapper>
                                        <InputWrapper label="Risk Protocol">
                                            <select
                                                className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-5 focus:ring-4 focus:ring-primary/20 outline-none text-slate-800 dark:text-white font-bold appearance-none cursor-pointer"
                                                value={editData.riskAppetite}
                                                onChange={e => setEditData({ ...editData, riskAppetite: e.target.value })}
                                            >
                                                <option value="Conservative">Conservative</option>
                                                <option value="Balanced">Balanced</option>
                                                <option value="Aggressive">Aggressive</option>
                                            </select>
                                        </InputWrapper>
                                    </div>

                                    <InputWrapper label="Daily Capital Gain Goal ($)">
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-5 focus:ring-4 focus:ring-primary/20 outline-none text-slate-800 dark:text-white font-black text-2xl"
                                            value={editData.dailyPnLGoal}
                                            onChange={e => setEditData({ ...editData, dailyPnLGoal: parseFloat(e.target.value) || 0 })}
                                        />
                                    </InputWrapper>

                                    <div className="flex flex-col h-[300px]">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-4 px-1">Quest Line Editor</label>
                                        <div className="space-y-3 mb-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                            {editData.goals.map(goal => (
                                                <div key={goal.id} className="flex gap-4 group">
                                                    <input
                                                        className="flex-1 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 outline-none text-slate-800 dark:text-white font-bold text-sm"
                                                        value={goal.text}
                                                        onChange={e => {
                                                            const updated = editData.goals.map(g => g.id === goal.id ? { ...g, text: e.target.value } : g);
                                                            setEditData({ ...editData, goals: updated });
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleRemoveGoal(goal.id)}
                                                        className="w-12 h-12 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 flex items-center justify-center hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-4">
                                            <input
                                                className="flex-1 bg-slate-50 dark:bg-white/[0.03] border border-primary/20 rounded-2xl px-6 py-5 outline-none text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-primary/10"
                                                placeholder="Forge new mission..."
                                                value={newGoalText}
                                                onChange={e => setNewGoalText(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddGoal()}
                                            />
                                            <button
                                                onClick={handleAddGoal}
                                                className="px-8 bg-primary text-white font-black rounded-2xl flex items-center justify-center hover:shadow-xl transition-all"
                                            >
                                                <span className="material-symbols-outlined">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fixed Footer */}
                        <div className="flex gap-6 p-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 py-5 bg-slate-100 dark:bg-white/5 text-slate-500 font-black rounded-2xl hover:bg-rose-500/10 hover:text-rose-500 transition-all text-xs uppercase tracking-widest"
                            >
                                Terminate Changes
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-[2] py-5 bg-primary text-white font-black rounded-2xl hover:bg-primary-light transition-all shadow-[0_20px_50px_rgba(124,93,250,0.4)] text-xs uppercase tracking-[0.2em]"
                            >
                                Authorize Identity Update
                            </button>
                        </div>
                    </div>
                </div>,
                document.body)}
        </div>
    );
}

function CountrySelector({ value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    const selectedCountry = COUNTRIES.find(c => c.name === value) || COUNTRIES.find(c => c.name === 'Spain');

    const filtered = useMemo(() =>
        COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
        [search]
    );

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-5 focus:ring-4 focus:ring-primary/20 outline-none text-slate-800 dark:text-white font-bold flex items-center justify-between transition-all"
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedCountry?.flag}</span>
                    <span className="truncate">{selectedCountry?.name}</span>
                </div>
                <span className={`material-symbols-outlined transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {isOpen && (
                <div className="absolute z-[1100] top-full left-0 right-0 mt-3 bg-white dark:bg-[#1A1D26] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-3xl">
                    <div className="p-4 border-b border-slate-100 dark:border-white/5">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                            <input
                                autoFocus
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-white"
                                placeholder="Filter countries..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar p-2">
                        {filtered.map(c => (
                            <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                    onChange(c.name);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all text-left ${c.name === value
                                    ? 'bg-primary text-white'
                                    : 'hover:bg-primary/10 text-slate-700 dark:text-slate-300'
                                    }`}
                            >
                                <span className="text-2xl">{c.flag}</span>
                                <span className="font-bold">{c.name}</span>
                                {c.name === value && <span className="material-symbols-outlined ml-auto text-white">check_circle</span>}
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <div className="py-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">No territories found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Metric({ label, value }) {
    return (
        <div className="flex flex-col group/metric cursor-default">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 group-hover/metric:text-primary transition-colors">{label}</span>
            <span className="text-xl font-black text-slate-800 dark:text-white tracking-tighter leading-none group-hover/metric:scale-105 transition-transform origin-left">{value}</span>
            <div className="h-0.5 w-6 bg-primary/20 mt-2 group-hover/metric:w-12 group-hover/metric:bg-primary transition-all duration-500" />
        </div>
    );
}

function StandingItem({ label, value, color }) {
    return (
        <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all duration-300">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{label}</span>
            <span className={`text-2xl font-black ${color} tracking-tighter filter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]`}>{value}</span>
        </div>
    );
}

function MasteryItem({ label, value }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                <span className="text-xs font-black dark:text-white">{value}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(124,93,250,0.4)]"
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}

function InputWrapper({ label, children }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block px-1">{label}</label>
            {children}
        </div>
    );
}
