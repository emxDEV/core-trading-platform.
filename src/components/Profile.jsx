import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../context/TradeContext';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';

import { COUNTRIES } from '../constants/countries';
import { soundEngine } from '../utils/SoundEngine';

// Observer System to prevent UI elements from being cut off
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

export default function Profile() {
    const {
        userProfile,
        updateUserProfile,
        stats,
        ranks,
        activeTrades,
        accounts,
        friends,
        friendRequests,
        sendFriendRequest,
        acceptFriendRequest,
        removeFriend,
        loadFriends,
        syncProfileToCloud,
        supabase,
        t,
        formatCurrency
    } = useData();
    const { user } = useAuth();
    const fileInputRef = useRef(null);

    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('identity');
    const [editData, setEditData] = useState({ ...userProfile });
    const [newGoalText, setNewGoalText] = useState('');
    const [contextMenu, setContextMenu] = useState(null);

    // Close context menu on outside click
    useEffect(() => {
        const handleOutsideClick = () => setContextMenu(null);
        window.addEventListener('mousedown', handleOutsideClick);
        return () => window.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const onContextMenu = (e, friend) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            friend
        });
    };

    const handleSave = () => {
        updateUserProfile(editData);
        if (syncProfileToCloud) syncProfileToCloud();
        setIsEditing(false);
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
            goals: [...(prev.goals || []), newGoal]
        }));
        setNewGoalText('');
    };

    const handleRemoveGoal = (id) => {
        setEditData(prev => ({
            ...prev,
            goals: (prev.goals || []).filter(g => g.id !== id)
        }));
    };

    const handleGoalToggle = (id) => {
        const goal = (userProfile.goals || []).find(g => g.id === id);
        if (goal && !goal.completed) {
            soundEngine.playSuccess();
        } else {
            soundEngine.playClick();
        }
        const updatedGoals = (userProfile.goals || []).map(g =>
            g.id === id ? { ...g, completed: !g.completed } : g
        );
        updateUserProfile({ goals: updatedGoals });
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditData(prev => ({ ...prev, avatar: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const masteryStats = useMemo(() => {
        const trades = activeTrades || [];
        const total = trades.length;
        if (total === 0) return { strategy: 0, mitigation: 0, buffer: 100 };

        // 1. Strategy: Hybrid of Precision (Win Rate) and Documentation (Journaling)
        const winRate = parseFloat(stats.winRate) || 0;
        const documented = trades.filter(t =>
            t.images_execution || t.images_condition || t.images_narrative ||
            t.comment_fazit || t.psychology || (t.confluences && t.confluences.length > 0)
        ).length;
        const docRate = (documented / total) * 100;
        const strategyScore = Math.round((winRate * 0.6) + (docRate * 0.4));

        // 2. Mitigation: Operational Discipline (Mistake-Free Operations)
        const cleanOperations = trades.filter(t =>
            !t.mistakes || t.mistakes === 'None' || t.mistakes === '[]' || t.mistakes.length === 0
        ).length;
        const mitigationScore = Math.round((cleanOperations / total) * 100);

        // 3. Buffer: Survival Margin / Capital Integrity
        const bufferScores = accounts.map(acc => {
            const capital = parseFloat(acc.capital) || 0;
            const balance = parseFloat(acc.balance) || capital;
            const maxLoss = parseFloat(acc.max_loss) || (capital * 0.1) || 1000;
            const currentDrawdown = Math.max(0, capital - balance);
            return Math.max(0, (1 - (currentDrawdown / maxLoss)) * 100);
        });
        const bufferScore = bufferScores.length > 0
            ? Math.round(bufferScores.reduce((a, b) => a + b, 0) / bufferScores.length)
            : 100;

        return {
            strategy: Math.min(100, strategyScore),
            mitigation: Math.min(100, mitigationScore),
            buffer: Math.min(100, bufferScore)
        };
    }, [activeTrades, stats.winRate, accounts]);

    const tacticalGrade = useMemo(() => {
        const wr = parseFloat(stats.winRate);
        const pnlScore = Math.min(100, (stats.totalPnL / 5000) * 100);
        const score = (wr * 0.6) + (pnlScore * 0.4);

        if (score > 85) return { tier: 'SR', label: 'ELITE OPERATOR', color: 'text-amber-400', bg: 'bg-amber-400/10' };
        if (score > 70) return { tier: 'A+', label: 'PRECISION SCALPER', color: 'text-rose-500', bg: 'bg-rose-500/10' };
        if (score > 50) return { tier: 'B', label: 'TACTICAL INITIATE', color: 'text-blue-400', bg: 'bg-blue-400/10' };
        return { tier: 'C', label: 'MOMENTUM SEEKER', color: 'text-slate-400', bg: 'bg-slate-400/10' };
    }, [stats]);

    return (
        <div className="w-full h-full animate-in fade-in slide-in-from-bottom-6 duration-1000">

            {/* Upper Header: Tabs & Calibration */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 px-2">
                <div className="flex p-1 bg-[#131525] border border-white/5 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('identity')}
                        className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${activeTab === 'identity' ? 'bg-primary text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]' : 'text-slate-500 hover:text-white'}`}
                    >
                        {t('operator_identity')}
                    </button>
                    <button
                        onClick={() => setActiveTab('network')}
                        className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${activeTab === 'network' ? 'bg-primary text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]' : 'text-slate-500 hover:text-white'}`}
                    >
                        {t('social_network')}
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden xl:flex items-center gap-3 px-6 py-3 bg-[#131525] border border-white/5 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 font-mono">{t('system_ready')}</span>
                    </div>
                    <button
                        onClick={() => {
                            setEditData({ ...userProfile });
                            setIsEditing(true);
                        }}
                        className="px-10 py-4 bg-primary text-white font-black rounded-xl hover:brightness-110 transition-all shadow-xl shadow-primary/10 active:scale-95 text-[10px] uppercase tracking-[0.4em]"
                    >
                        {t('calibrate_identity')}
                    </button>
                </div>
            </div>

            {activeTab === 'identity' ? (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    <div className="xl:col-span-3 space-y-6">
                        {/* Identity Hero Card - 'Tactical Dossier' Style */}
                        <div className="relative group/hero">
                            <div className="relative bg-[#131525] border border-white/10 rounded-xl p-6 lg:p-10 flex items-center gap-12 shadow-2xl overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px]" />

                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-xl overflow-hidden border border-white/10 bg-black relative z-10 shadow-2xl">
                                        <img src={userProfile.avatar} className="w-full h-full object-cover" alt="Profile" />
                                    </div>
                                    <div className={`absolute -top-3 -right-3 w-10 h-10 ${stats.rank?.color?.replace('text-', 'bg-') || 'bg-primary'} rounded-lg flex items-center justify-center shadow-xl z-20 border border-[#0b0e14]`}>
                                        <span className="material-symbols-outlined text-white text-xl">{stats.rank?.icon}</span>
                                    </div>
                                    <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-[#0b0e14] border border-white/10 rounded-lg flex flex-col items-center justify-center shadow-xl z-20">
                                        <span className="text-[8px] font-black text-primary uppercase tracking-tighter leading-none mb-1">{t('level')}</span>
                                        <span className="text-xl font-black text-white leading-none tracking-tighter">{stats.level || 1}</span>
                                    </div>
                                </div>

                                {/* Identity Info */}
                                <div className="flex-1 min-w-0 space-y-4">
                                    <div className="flex items-center gap-6">
                                        <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase italic truncate bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">{userProfile.name}</h1>
                                        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.4em]">OPERATIONAL</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="flex items-center gap-3">
                                            <span className="text-base font-black text-primary italic lowercase">#{userProfile.tag}</span>
                                            <div className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] font-mono">{userProfile.location}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-primary text-base">verified_user</span>
                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">{t('risk_appetite')}: {userProfile.riskAppetite}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Progression Enhanced */}
                                <div className="hidden lg:block w-80 space-y-4 pr-6">
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.6em] italic">Cycle Progression</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[15px] font-black text-white uppercase tracking-tighter font-mono">{stats.rank?.name.split(' ')[0]}</span>
                                                <span className="material-symbols-outlined text-[14px] text-primary">double_arrow</span>
                                                <span className="text-[15px] font-black text-slate-500 uppercase tracking-tighter font-mono">{stats.nextRank?.name.split(' ')[0] || 'MAX'}</span>
                                            </div>
                                        </div>
                                        <span className="text-[13px] font-black text-primary font-mono">{Math.floor(stats.xp || 0).toLocaleString()} {t('xp')}</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full transition-all duration-[2s] shadow-[0_0_15px_rgba(124,58,237,0.4)]" style={{ width: `${stats.levelProgress || 0}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatTile label={t('risk_protocol')} value={userProfile.riskAppetite} icon="shield_with_heart" color="text-emerald-400" />
                            <StatTile label={t('tactical_precision')} value={`${stats.winRate}%`} icon="target" color="text-primary" />
                            <StatTile
                                label={t('pnl')}
                                value={`${stats.totalPnL >= 0 ? '+' : ''}${formatCurrency(stats.totalPnL)}`}
                                icon="payments"
                                color={stats.totalPnL > 0 ? 'text-emerald-500' : stats.totalPnL < 0 ? 'text-rose-500' : 'text-amber-500'}
                            />
                            <StatTile label={t('active_rank')} value={stats.rank?.name.split(' ')[0]} icon="military_tech" color="text-amber-400" />
                        </div>

                        <div className="bg-[#131525] border border-white/10 rounded-xl p-8 lg:p-12 shadow-2xl relative overflow-hidden group/obj">
                            <div className="flex items-center justify-between mb-12">
                                <h3 className="text-2xl lg:text-3xl font-black text-white tracking-[0.05em] flex items-center gap-6 uppercase italic">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                        <span className="material-symbols-outlined text-primary text-[28px]">assignment_turned_in</span>
                                    </div>
                                    {t('operational_objectives')}
                                </h3>
                                <div className="flex gap-4">
                                    <Badge label={`${(userProfile.goals || []).filter(g => g.completed).length} ${t('achieved')}`} bg="bg-emerald-500/10" color="text-emerald-500" />
                                    <Badge label={`${(userProfile.goals || []).filter(g => !g.completed).length} ${t('pending')}`} bg="bg-primary/10" color="text-primary" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                {(userProfile.goals || []).map((goal, idx) => (
                                    <button
                                        key={goal.id}
                                        onClick={() => handleGoalToggle(goal.id)}
                                        className={`flex items-center gap-5 p-6 border rounded-xl group transition-all duration-500 text-left relative overflow-hidden ${goal.completed
                                            ? 'bg-emerald-500/[0.04] border-emerald-500/10'
                                            : 'bg-white/[0.02] border-white/5 hover:border-primary/40'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-500 ${goal.completed ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-white/5 text-white/20 group-hover:bg-primary group-hover:text-white'}`}>
                                            {goal.completed ? (
                                                <span className="material-symbols-outlined text-[20px]">check</span>
                                            ) : (
                                                <span className="text-[10px] font-black tracking-tighter italic">0{idx + 1}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${goal.completed ? 'text-emerald-500/50' : 'text-white/20'}`}>Directive 0{(idx + 1).toString().padStart(2, '0')}</div>
                                            <div className={`text-lg font-black tracking-tight transition-all duration-500 truncate ${goal.completed ? 'text-emerald-500/50 line-through' : 'text-white'}`}>
                                                {goal.text}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {(userProfile.goals || []).length === 0 && (
                                    <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-3xl group/empty">
                                        <span className="material-symbols-outlined text-[54px] text-white/5 mb-8 group-hover/empty:scale-110 group-hover/empty:text-primary/20 transition-all duration-700">security_update_good</span>
                                        <p className="text-lg font-black text-white/10 uppercase tracking-[0.5em] italic">No active objectives calibrated</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-1 space-y-6">
                        <div className="bg-[#131525] border border-white/10 rounded-2xl p-8 relative overflow-hidden group/readiness shadow-2xl">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 opacity-50" />
                            <div className="relative space-y-10">
                                <div className="flex items-center justify-between h-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.5em] text-white/30 italic font-mono">{t('combat_readiness')}</span>
                                    </div>
                                    <div className="px-3 py-1 bg-white/5 border border-white/10 text-[8px] font-black text-primary font-mono rounded shadow-inner">v1.0.7</div>
                                </div>
                                <div className="flex items-center gap-7">
                                    <div className={`w-24 h-24 rounded-[2rem] ${tacticalGrade.bg} flex items-center justify-center border border-white/20 shadow-2xl relative group/tier overflow-hidden`}>
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/tier:opacity-100 transition-opacity" />
                                        <div className={`absolute inset-0 ${tacticalGrade.bg} blur-2xl opacity-40`} />
                                        <span className={`text-6xl font-black ${tacticalGrade.color} italic font-mono relative z-10 drop-shadow-2xl`}>{tacticalGrade.tier}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-3xl font-black text-white tracking-tighter italic uppercase truncate leading-none mb-2 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">{tacticalGrade.label}</h4>
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] font-mono flex items-center gap-2">
                                            <span className="w-4 h-[1px] bg-slate-800" />
                                            {t('operator_class')}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <StandingItem label="Execution" value="ELITE" color="primary" />
                                    <StandingItem label="Tactical" value="A-RANK" color="cyan-400" />
                                    <StandingItem label="Scaling" value="ALPHA" color="emerald-400" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#131525] border border-white/10 rounded-2xl p-8 lg:p-10 shadow-2xl relative overflow-hidden group/mastery">
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/5 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-12">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 font-mono flex items-center gap-3">
                                        <span className="material-symbols-outlined text-primary text-sm">leaderboard</span>
                                        {t('mastery_analysis')}
                                    </h3>
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover/mastery:border-primary/40 transition-colors">
                                        <span className="material-symbols-outlined text-primary text-xl">analytics</span>
                                    </div>
                                </div>
                                <div className="space-y-12">
                                    <MasteryItem
                                        label={t('strategy')}
                                        value={masteryStats.strategy}
                                        icon="psychology"
                                        gradient="from-primary via-primary to-primary-light"
                                        color="text-primary"
                                        description="Hybrid of Precision & Narrative. Measures win rate vs. journaling depth (confluences, images, and reflections)."
                                    />
                                    <MasteryItem
                                        label={t('mitigation')}
                                        value={masteryStats.mitigation}
                                        icon="verified_user"
                                        gradient="from-cyan-400 via-primary to-primary"
                                        color="text-cyan-400"
                                        description="Operational Discipline. Tracking the percentage of executions performed without any recorded mistakes or errors."
                                    />
                                    <MasteryItem
                                        label={t('buffer')}
                                        value={masteryStats.buffer}
                                        icon="self_improvement"
                                        gradient="from-emerald-400 via-cyan-400 to-cyan-400"
                                        color="text-emerald-400"
                                        description="Survival Margin. Your distance from the account's maximum loss boundary. High values indicate high capital integrity."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <SocialNetworkView
                    friends={friends}
                    friendRequests={friendRequests}
                    sendFriendRequest={sendFriendRequest}
                    acceptFriendRequest={acceptFriendRequest}
                    removeFriend={removeFriend}
                    loadFriends={loadFriends}
                    supabase={supabase}
                    userId={user?.id}
                    onContextMenu={onContextMenu}
                />
            )}

            {contextMenu && (
                <SmartPortal coords={{ x: contextMenu.x, y: contextMenu.y }} className="w-80 bg-[#131525]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden focus:outline-none p-7 animate-in zoom-in-95 duration-200">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative space-y-6">
                        {/* Dossier Header */}
                        <div className="flex items-center gap-4">
                            <div className="relative group/avatar">
                                <div className="absolute -inset-1 bg-gradient-to-br from-primary to-cyan-400 rounded-2xl blur opacity-20 group-hover/avatar:opacity-40 transition-opacity" />
                                <img src={contextMenu.friend.avatar_url} className="w-16 h-16 rounded-2xl object-cover border border-white/20 relative z-10" alt="Friend" />
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg shadow-xl flex items-center justify-center border-2 border-[#131525] z-20">
                                    <span className="material-symbols-outlined text-white text-[12px] font-black italic">bolt</span>
                                </div>
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge label="Verified Sync" bg="bg-emerald-500/10" color="text-emerald-500" />
                                </div>
                                <h4 className="text-xl font-black text-white italic uppercase tracking-tighter truncate leading-none mb-1.5">{contextMenu.friend.name}</h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-primary font-mono tracking-tighter uppercase italic">#{contextMenu.friend.tag || 'X-000'}</span>
                                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none font-mono">{contextMenu.friend.rank_name || 'Initiate'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Operational Briefing */}
                        {contextMenu.friend.bio && (
                            <div className="space-y-2">
                                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest font-mono">Operational Briefing</div>
                                <p className="text-[11px] text-slate-400 leading-relaxed italic border-l-2 border-primary/30 pl-4 py-1 bg-white/[0.02] rounded-r-lg">
                                    "{contextMenu.friend.bio}"
                                </p>
                            </div>
                        )}

                        {/* Tactical Metrics */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/5 rounded-2xl p-4 transition-all hover:border-emerald-500/20">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1 font-mono">Yield Accuracy</span>
                                <span className="text-xl font-black text-emerald-400 italic font-mono">{contextMenu.friend.win_rate !== null ? `${contextMenu.friend.win_rate}%` : '---'}</span>
                            </div>
                            <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/5 rounded-2xl p-4 transition-all hover:border-primary/20">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1 font-mono">Combat Level</span>
                                <span className="text-xl font-black text-primary italic font-mono">LVL {Math.floor(Math.sqrt((contextMenu.friend.xp || 0) / 100)) + 1}</span>
                            </div>
                        </div>

                        {/* Progression Matrix */}
                        <div className="space-y-2.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] font-mono">Power Progression</span>
                                <span className="text-[9px] font-black text-white/50 font-mono tracking-tighter">{Math.floor(contextMenu.friend.xp || 0).toLocaleString()} <span className="text-primary italic">XP</span></span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                                <div
                                    className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all duration-1000 relative"
                                    style={{ width: `${(contextMenu.friend.xp % 100) || 0}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex flex-col gap-2">
                            <button
                                onClick={() => setContextMenu(null)}
                                className="w-full py-3.5 bg-primary/10 border border-primary/20 rounded-xl text-[9px] font-black text-primary uppercase tracking-[0.4em] hover:bg-primary hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3 group"
                            >
                                <span className="material-symbols-outlined text-base group-hover:rotate-12 transition-transform">database</span>
                                Request Data Sync
                            </button>
                            <button
                                onClick={async () => {
                                    if (confirm(`Terminate connection with ${contextMenu.friend.name}?`)) {
                                        await removeFriend(contextMenu.friend.id);
                                        setContextMenu(null);
                                    }
                                }}
                                className="w-full py-3 bg-transparent border border-white/5 rounded-xl text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                            >
                                <span className="material-symbols-outlined text-sm group-hover:scale-110 transition-transform">logout</span>
                                Terminate Connection
                            </button>
                        </div>
                    </div>
                </SmartPortal>
            )}

            {createPortal(
                <CalibrationModal
                    isOpen={isEditing}
                    onClose={() => setIsEditing(false)}
                    editData={editData}
                    setEditData={setEditData}
                    handleSave={handleSave}
                    handleAvatarUpload={handleAvatarUpload}
                    fileInputRef={fileInputRef}
                    handleAddGoal={handleAddGoal}
                    handleRemoveGoal={handleRemoveGoal}
                    newGoalText={newGoalText}
                    setNewGoalText={setNewGoalText}
                />,
                document.body
            )}
        </div>
    );
}

function StatTile({ label, value, icon, color }) {
    return (
        <div className="bg-[#131525] border border-white/5 rounded-xl p-8 shadow-2xl group transition-all duration-500">
            <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-8 border border-white/5 group-hover:bg-primary transition-all duration-500`}>
                <span className={`material-symbols-outlined ${color} group-hover:text-white text-[22px]`}>{icon}</span>
            </div>
            <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] font-mono block">{label}</span>
                <span className="text-3xl font-black text-white tracking-tighter uppercase italic block">{value}</span>
            </div>
        </div>
    );
}

function MasteryItem({ label, value, icon, gradient, color, description }) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className="space-y-5 group/item relative">
            {showTooltip && (
                <div className="absolute -top-14 left-0 bg-[#0b0e14]/95 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl z-50 w-72 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`material-symbols-outlined text-[12px] ${color}`}>{icon}</span>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{label} Logic</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                        {description}
                    </p>
                    {/* Tooltip Arrow */}
                    <div className="absolute top-full left-6 -translate-y-1/2 w-2 h-2 bg-[#0b0e14] border-r border-b border-white/10 rotate-45" />
                </div>
            )}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-4">
                    <div
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-all group-hover/item:border-primary/40 group-hover/item:bg-white/10 cursor-help"
                    >
                        <span className={`material-symbols-outlined ${color} text-[18px]`}>{icon}</span>
                    </div>
                    <span className="text-[11px] font-black text-white tracking-[0.2em] font-mono group-hover/item:text-primary transition-colors uppercase">{label}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-white italic font-mono block leading-none">{value}%</span>
                    <div className="flex gap-1 mt-1.5">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-1 h-1 rounded-full ${i < Math.floor(value / 20) ? color.replace('text-', 'bg-') : 'bg-white/5'}`} />
                        ))}
                    </div>
                </div>
            </div>
            <div className="relative h-2.5 w-full bg-black/40 rounded-full border border-white/5 p-[2px] overflow-hidden group-hover/item:border-white/10 transition-all">
                {/* Progress Fill */}
                <div
                    className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-[2s] relative overflow-hidden z-10 shadow-[0_0_15px_rgba(0,0,0,0.5)]`}
                    style={{ width: `${value}%` }}
                >
                    <div className="absolute inset-0 bg-white/10 opacity-20" />
                    <div className="absolute top-0 right-0 w-8 h-full bg-white/20 blur-md -skew-x-[30deg] translate-x-4" />
                </div>
            </div>
        </div>
    );
}

function StandingItem({ label, value, color }) {
    // Determine the actual color class for background and text
    // If it's a custom variable like 'primary', we keep it as is.
    // Tailwind dynamic classes sometimes fail with opacity modifiers and variables.
    const baseColorClass = color.startsWith('#') ? '' : color;

    return (
        <div className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-white/10 hover:bg-white/[0.04] transition-all relative overflow-hidden shadow-inner font-mono">
            <div
                className={`absolute top-0 left-0 w-[3px] h-full bg-${baseColorClass} opacity-40 group-hover:opacity-100 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]`}
                style={color.startsWith('#') ? { backgroundColor: color } : {}}
            />
            <span
                className={`text-[10px] font-black uppercase tracking-[0.4em] relative z-10 transition-colors italic text-${baseColorClass} opacity-40 group-hover:opacity-100`}
                style={color.startsWith('#') ? { color: color } : {}}
            >
                {label}
            </span>
            <div className={`px-4 py-2 bg-${baseColorClass}/10 border border-current rounded-xl relative z-10 shadow-[0_0_15px_rgba(0,0,0,0.3)] group-hover:shadow-[0_0_20px_currentColor] transition-all duration-500 text-${baseColorClass}`}>
                <span className="text-[11px] font-black tracking-widest uppercase shadow-black drop-shadow-md">{value}</span>
            </div>
        </div>
    );
}

function Badge({ label, bg, color }) {
    return (
        <div className={`px-4 py-1.5 rounded-xl ${bg} border border-current text-[9px] font-black ${color} uppercase tracking-widest`}>
            {label}
        </div>
    );
}

function SocialNetworkView({ friends, friendRequests, sendFriendRequest, acceptFriendRequest, removeFriend, loadFriends, supabase, userId, onContextMenu }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [socialTab, setSocialTab] = useState('syncs'); // 'syncs' or 'leaderboard'
    const { userProfile, stats, formatCurrency } = useData();

    const handleSearch = async () => {
        if (!searchQuery.trim() || !supabase) return;
        setIsSearching(true);

        let query = supabase.from('profiles').select('*').limit(10);

        if (searchQuery.startsWith('#')) {
            const cleanTag = searchQuery.substring(1).toUpperCase();
            query = query.eq('tag', cleanTag);
        } else {
            query = query.ilike('name', `%${searchQuery}%`);
        }

        const { data, error } = await query.neq('id', userId);

        if (!error) setSearchResults(data || []);
        setIsSearching(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Discovery Section - Compact */}
            <div className="bg-[#131525] rounded-2xl p-6 lg:p-8 shadow-xl relative overflow-hidden group border border-white/10">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                <div className="relative space-y-6">
                    <div className="space-y-2 max-w-xl">
                        <div className="flex items-center gap-3">
                            <Badge label="Global Matrix" bg="bg-primary/10" color="text-primary" />
                            <div className="h-[1px] flex-1 bg-white/5" />
                        </div>
                        <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tighter uppercase italic truncate bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                            Discover Operators
                        </h2>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 p-1 bg-black/20 backdrop-blur-3xl rounded-xl border border-white/5">
                        <div className="flex-1 relative">
                            <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-primary/30 text-xl">radar</span>
                            <input
                                className="w-full bg-transparent pl-16 pr-6 py-4 outline-none text-white font-black text-lg placeholder:text-slate-700 tracking-tight"
                                placeholder="Scan Codename..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="px-8 py-4 bg-primary text-white font-black rounded-lg hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all active:scale-95 text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">{isSearching ? 'sync' : 'search'}</span>
                            {isSearching ? 'Scanning...' : 'Scan Matrix'}
                        </button>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2 animate-in slide-in-from-top-2 duration-300">
                            {searchResults.map(profile => (
                                <div key={profile.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4 group/result hover:bg-white/[0.04] transition-all">
                                    <div className="relative">
                                        <img src={profile.avatar_url} className="w-12 h-12 rounded-lg object-cover border border-white/10" alt="Result" />
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#131525] border border-primary/40 rounded flex items-center justify-center text-[8px] font-black text-white shadow-xl">
                                            {profile.rank_level || 1}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-black text-white truncate italic uppercase tracking-tighter">{profile.name}</div>
                                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{profile.rank_name || 'Initiate'}</div>
                                    </div>
                                    <button
                                        onClick={() => sendFriendRequest(profile.id)}
                                        className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all border border-primary/20"
                                    >
                                        <span className="material-symbols-outlined text-lg">person_add</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Sub-Navigation for Social */}
            <div className="flex items-center gap-4 border-b border-white/5 pb-2">
                <button
                    onClick={() => setSocialTab('syncs')}
                    className={`px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${socialTab === 'syncs' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
                >
                    Active Syncs
                    {socialTab === 'syncs' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_rgba(124,58,237,0.5)]" />}
                </button>
                <button
                    onClick={() => setSocialTab('leaderboard')}
                    className={`px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${socialTab === 'leaderboard' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
                >
                    Leaderboard Matrix
                    {socialTab === 'leaderboard' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_rgba(124,58,237,0.5)]" />}
                </button>
            </div>

            {socialTab === 'syncs' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Active Syncs - Compact */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="bg-[#131525] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden h-full">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-white tracking-tighter flex items-center gap-3 uppercase italic">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                                        <span className="material-symbols-outlined text-emerald-500 text-xl">hub</span>
                                    </div>
                                    Active Syncs
                                </h3>
                                <div className="px-2 py-0.5 bg-emerald-500/5 border border-emerald-500/10 rounded text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none">
                                    {friends.length} AUTH
                                </div>
                            </div>

                            <div className="space-y-3">
                                {friends.length > 0 ? friends.map(friend => (
                                    <div
                                        key={friend.id}
                                        onContextMenu={(e) => onContextMenu(e, friend)}
                                        className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-6 group transition-all duration-300 hover:border-emerald-500/30 cursor-context-menu"
                                    >
                                        <div className="flex items-center gap-4 min-w-[160px]">
                                            <div className="relative">
                                                <img src={friend.avatar_url} className="w-12 h-12 rounded-lg object-cover border border-white/10 transition-transform" alt="Friend" />
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded flex items-center justify-center text-white border-2 border-[#131525] shadow-lg">
                                                    <span className="material-symbols-outlined text-[8px] font-black">bolt</span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-base font-black text-white tracking-tighter italic uppercase leading-none mb-1">{friend.name}</div>
                                                <div className="text-[8px] font-black text-primary uppercase tracking-widest font-mono opacity-60">{friend.rank_name}</div>
                                            </div>
                                        </div>

                                        <div className="flex-1 grid grid-cols-3 gap-4 border-l border-white/5 pl-6">
                                            <div>
                                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">Yield</div>
                                                <div className="text-xs font-black text-white italic font-mono uppercase">
                                                    {friend.win_rate !== null ? `${friend.win_rate}%` : '---'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">XP</div>
                                                <div className="text-xs font-black text-white italic font-mono uppercase">LVL {Math.floor(Math.sqrt((friend.xp || 0) / 100)) + 1}</div>
                                            </div>
                                            <div className="flex justify-end pr-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm(`Terminate connection with ${friend.name}?`)) {
                                                            removeFriend(friend.id);
                                                        }
                                                    }}
                                                    className="w-9 h-9 rounded-lg bg-white/5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-white/5 flex items-center justify-center active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-lg">logout</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-xl bg-black/10">
                                        <span className="material-symbols-outlined text-3xl text-white/5 mb-3">group_off</span>
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] italic">No active syncs</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Signals - Compact */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-[#131525] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden h-full">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-white tracking-tighter flex items-center gap-3 uppercase italic leading-none">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                                        <span className="material-symbols-outlined text-primary text-xl">satellite_alt</span>
                                    </div>
                                    Signals
                                </h3>
                                <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary shadow-lg border border-primary/20">
                                    {(friendRequests || []).length}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {(friendRequests || []).length > 0 ? friendRequests.map(req => (
                                    <div key={req.id} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl flex items-center gap-4 transition-all hover:bg-white/[0.06]">
                                        <img src={req.avatar_url} className="w-11 h-11 rounded-lg object-cover border border-white/10" alt="Request" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-black text-white truncate italic uppercase tracking-tighter">{req.name}</div>
                                            <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">Incoming Signal</div>
                                        </div>
                                        <button
                                            onClick={() => acceptFriendRequest(req.id)}
                                            className="w-10 h-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-xl">check</span>
                                        </button>
                                    </div>
                                )) : (
                                    <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-xl bg-black/10 flex flex-col items-center justify-center">
                                        <span className="material-symbols-outlined text-2xl text-white/5 mb-2">notifications_off</span>
                                        <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] italic">No signals</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-[#131525] border border-white/10 rounded-2xl p-8 shadow-xl relative overflow-hidden animate-in fade-in duration-500">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-inner">
                                    <span className="material-symbols-outlined text-amber-500 text-2xl">leaderboard</span>
                                </div>
                                Weekly Performance Dominance
                            </h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-primary" />
                                Current Session Cycle: Monday - Sunday
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none font-mono">Metric:</span>
                                <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none font-mono">Consistency Score</span>
                            </div>
                            <button
                                onClick={() => {
                                    loadFriends();
                                    if (window.soundEngine) window.soundEngine.playInfo();
                                }}
                                className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all active:scale-90 group"
                                title="Synchronize Intelligence"
                            >
                                <span className="material-symbols-outlined text-2xl group-active:animate-spin">sync</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                id: userId,
                                name: userProfile.name,
                                avatar_url: userProfile.avatar,
                                tag: userProfile.tag,
                                rank_name: stats.rank?.name,
                                weekly_consistency_score: stats.winRate > 0 ? Math.round(Math.min(100, (parseFloat(stats.winRate) * 0.5) + 30)) : 0,
                                weekly_pnl: stats.totalPnL,
                                isMe: true
                            },
                            ...friends
                        ].sort((a, b) => (b.weekly_consistency_score || 0) - (a.weekly_consistency_score || 0))
                            .map((entry, idx) => (
                                <LeaderboardItem
                                    key={entry.id}
                                    entry={entry}
                                    rank={idx + 1}
                                    formatCurrency={formatCurrency}
                                    onContextMenu={onContextMenu}
                                />
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function LeaderboardItem({ entry, rank, formatCurrency, onContextMenu }) {
    const isTop3 = rank <= 3;
    const medalColor = rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-700' : 'text-slate-600';

    return (
        <div className={`p-5 bg-white/[0.02] border rounded-2xl flex items-center gap-8 group transition-all duration-300 hover:bg-white/[0.04] ${entry.isMe ? 'border-primary/40 bg-primary/5' : 'border-white/5'}`}>
            {/* Rank Position */}
            <div className="w-12 flex flex-col items-center">
                {isTop3 ? (
                    <span className={`material-symbols-outlined text-3xl ${medalColor} drop-shadow-[0_0_10px_currentColor]`}>military_tech</span>
                ) : (
                    <span className="text-xl font-black text-slate-600 italic font-mono">#{rank}</span>
                )}
            </div>

            {/* Operator Info */}
            <div className="flex items-center gap-5 min-w-[240px]">
                <div className="relative">
                    <img src={entry.avatar_url} className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-xl" alt="Operator" />
                    {entry.isMe && (
                        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-primary text-white text-[8px] font-black uppercase rounded-md shadow-lg border border-white/10">You</div>
                    )}
                </div>
                <div className="min-w-0">
                    <div className="text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-1.5 flex items-center gap-2 truncate">
                        {entry.name}
                        {entry.is_verified && <span className="material-symbols-outlined text-primary text-sm">verified</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-primary font-mono tracking-tighter uppercase italic">#{entry.tag || 'X-000'}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none font-mono">{entry.rank_name || 'Initiate'}</span>
                    </div>
                </div>
            </div>

            {/* Metrics Section */}
            <div className="flex-1 grid grid-cols-2 gap-8 px-8 border-x border-white/5">
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Consistency Score</span>
                        <span className={`text-lg font-black italic font-mono ${(entry.weekly_consistency_score || 0) >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {entry.weekly_consistency_score || 0}%
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden p-[1px] border border-white/5">
                        <div
                            className={`h-full rounded-full transition-all duration-[2s] shadow-[0_0_10px_rgba(0,0,0,0.5)] ${(entry.weekly_consistency_score || 0) >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${entry.weekly_consistency_score || 0}%` }}
                        />
                    </div>
                </div>

                <div className="flex flex-col justify-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono mb-1">Weekly Delta</span>
                    <div className={`text-xl font-black italic font-mono ${(entry.weekly_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {(entry.weekly_pnl || 0) >= 0 ? '+' : ''}{formatCurrency(entry.weekly_pnl || 0)}
                    </div>
                </div>
            </div>

            {/* Actions / View Profile */}
            <div className="flex items-center gap-3 pr-2">
                <button
                    onClick={(e) => onContextMenu(e, entry)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[9px] font-black text-white uppercase tracking-[0.2em] transition-all active:scale-95"
                >
                    Tactical Review
                </button>
            </div>
        </div>
    );
}

function CountrySelector({ value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCountry = COUNTRIES.find(c => c.name === value) || COUNTRIES.find(c => c.name === 'United States');

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white font-bold flex items-center justify-between transition-all hover:border-primary/50 focus:border-primary/50 shadow-lg"
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl">{selectedCountry?.flag || '🏳️'}</span>
                    <span className="text-sm font-bold uppercase tracking-widest">{selectedCountry?.name || 'Select Country'}</span>
                </div>
                <span className={`material-symbols-outlined text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`}>expand_more</span>
            </button>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-[#1A1D26] border border-white/10 rounded-2xl shadow-2xl py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-white/5">
                        <input
                            autoFocus
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none text-white placeholder-slate-600"
                            placeholder="Search countries..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                        {filteredCountries.map((country) => (
                            <button
                                key={country.code}
                                type="button"
                                onClick={() => {
                                    onChange(country.name);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                                className={`w-full px-3 py-2 flex items-center gap-3 rounded-lg text-left transition-all ${country.name === value ? 'bg-primary text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                <span className="text-lg">{country.flag}</span>
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    {country.name}
                                </span>
                            </button>
                        ))}
                        {filteredCountries.length === 0 && (
                            <div className="px-3 py-4 text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                No matches found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function CalibrationModal({
    isOpen, onClose, editData, setEditData, handleSave, handleAvatarUpload,
    fileInputRef, handleAddGoal, handleRemoveGoal, newGoalText, setNewGoalText
}) {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

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

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-8 transition-all duration-500 ease-out ${isAnimating ? 'bg-[#0b0c14]/80 backdrop-blur-md opacity-100' : 'bg-[#0b0c14]/0 backdrop-blur-none opacity-0'}`}
            onClick={onClose}
        >
            <div
                className={`w-full max-w-5xl max-h-[90vh] flex flex-col bg-[#131525] border border-white/10 rounded-[3.5rem] shadow-2xl relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${isAnimating ? 'scale-100 translate-y-0 opacity-100 blur-0' : 'scale-95 translate-y-8 opacity-0 blur-md'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-12 pb-8 border-b border-white/5">
                    <div>
                        <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic">Redefine Identity</h2>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Authorized Calibration</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent">
                        <span className="material-symbols-outlined text-3xl">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-12 pt-10 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div className="space-y-12">
                            <div className="space-y-8">
                                <label className="text-[11px] font-black text-primary uppercase tracking-[0.4em]">Section 01: Core Recognition</label>
                                <div className="space-y-4">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Active Codename</label>
                                    <input
                                        className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl px-8 py-6 outline-none text-slate-800 dark:text-white font-black uppercase tracking-widest text-lg focus:ring-4 focus:ring-primary/10 transition-all"
                                        value={editData.name}
                                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Identity Visual (Avatar)</label>
                                    <div className="flex items-center gap-8 p-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl">
                                        <div className="w-28 h-28 rounded-3xl overflow-hidden border-2 border-primary/20 bg-slate-100 dark:bg-white/5 relative">
                                            <img src={editData.avatar} className="w-full h-full object-cover" alt="Preview" />
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-light transition-all shadow-lg shadow-primary/10 text-[10px] uppercase tracking-widest"
                                            >
                                                Select New File
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Trading Philosophy</label>
                                    <textarea
                                        rows="4"
                                        className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-[2.5rem] px-8 py-6 outline-none text-slate-800 dark:text-white font-medium text-lg italic leading-relaxed focus:ring-4 focus:ring-primary/10 transition-all"
                                        value={editData.bio}
                                        onChange={e => setEditData({ ...editData, bio: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <div className="space-y-8">
                                <label className="text-[11px] font-black text-primary uppercase tracking-[0.4em]">Section 02: Operational Rules</label>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Base Origin</label>
                                        <CountrySelector
                                            value={editData.location}
                                            onChange={val => setEditData({ ...editData, location: val })}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Risk Protocol</label>
                                        <select
                                            className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-5 outline-none text-slate-800 dark:text-white font-bold appearance-none focus:ring-4 focus:ring-primary/10"
                                            value={editData.riskAppetite}
                                            onChange={e => setEditData({ ...editData, riskAppetite: e.target.value })}
                                        >
                                            <option value="Conservative">Conservative</option>
                                            <option value="Balanced">Balanced</option>
                                            <option value="Aggressive">Aggressive</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Privacy Configuration</label>
                                    <div className="grid gap-4 p-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl">
                                        <PrivacyToggle
                                            label="Global Visibility"
                                            description="Allow other operators to find your codename."
                                            enabled={editData.privacy?.isPublic}
                                            onChange={val => setEditData({ ...editData, privacy: { ...editData.privacy, isPublic: val } })}
                                        />
                                        <PrivacyToggle
                                            label="Performance Translucency"
                                            description="Share stats with active syncs."
                                            enabled={editData.privacy?.showPnL}
                                            onChange={val => setEditData({ ...editData, privacy: { ...editData.privacy, showPnL: val } })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Directives</label>
                                        <span className="text-[10px] font-black text-primary uppercase">MAX 10</span>
                                    </div>
                                    <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                        {(editData.goals || []).map(goal => (
                                            <div key={goal.id} className="flex gap-4 group">
                                                <input
                                                    className="flex-1 bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 outline-none text-slate-700 dark:text-slate-200 font-bold text-sm"
                                                    value={goal.text}
                                                    onChange={e => {
                                                        const updated = editData.goals.map(g => g.id === goal.id ? { ...g, text: e.target.value } : g);
                                                        setEditData({ ...editData, goals: updated });
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleRemoveGoal(goal.id)}
                                                    className="w-12 h-12 flex-shrink-0 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-4">
                                        <input
                                            className="flex-1 bg-white dark:bg-white/5 border-2 border-primary/20 rounded-2xl px-6 py-5 outline-none text-slate-800 dark:text-white font-bold text-sm focus:border-primary transition-all"
                                            placeholder="Assign objective..."
                                            value={newGoalText}
                                            onChange={e => setNewGoalText(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddGoal()}
                                        />
                                        <button onClick={handleAddGoal} className="w-16 bg-primary text-white font-black rounded-2xl flex items-center justify-center hover:shadow-xl active:scale-95 transition-all text-2xl">
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-12 pt-8 flex gap-6 bg-black/20 border-t border-white/5">
                    <button onClick={onClose} className="flex-1 py-6 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400 font-black rounded-3xl hover:bg-slate-300 transition-all text-[11px] uppercase tracking-widest">
                        Terminate
                    </button>
                    <button onClick={handleSave} className="flex-[2] py-6 bg-primary text-white font-black rounded-3xl hover:bg-primary-light transition-all shadow-2xl shadow-primary/30 active:scale-95 text-[11px] uppercase tracking-[0.3em]">
                        Authorize
                    </button>
                </div>
            </div>
        </div>
    );
}

function PrivacyToggle({ label, description, enabled, onChange }) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className="w-full flex items-center justify-between p-5 rounded-2xl bg-white dark:bg-white/5 border border-transparent hover:border-primary/20 transition-all text-left group"
        >
            <div className="space-y-1">
                <span className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest block">{label}</span>
                <p className="text-[10px] text-slate-500 font-medium italic">{description}</p>
            </div>
            <div className={`w-14 h-8 rounded-full transition-all duration-500 relative flex items-center px-1.5 ${enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-sm ${enabled ? 'translate-x-[24px]' : 'translate-x-0'}`} />
            </div>
        </button>
    );
}
