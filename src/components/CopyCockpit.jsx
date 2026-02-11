import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/TradeContext';
import { useNotifications } from '../context/NotificationContext';

// Account Dropdown Component (similar to NewTradeModal)
const AccountDropdown = ({ value, onChange, label, filterOut = [] }) => {
    const { accounts } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef(null);
    const [coords, setCoords] = useState(null);
    const dropdownRef = useRef(null);

    const selectedAcc = accounts.find(a => String(a.id) === String(value));
    const filteredAccounts = accounts.filter(a => !filterOut.includes(a.id));

    const updateCoords = () => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setCoords({
                x: rect.left,
                y: rect.bottom + 8,
                width: rect.width
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateCoords();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (anchorRef.current && !anchorRef.current.contains(e.target) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{label}</label>
            <div className="relative" ref={anchorRef}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center gap-3 px-5 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-semibold transition-all hover:border-primary/30 focus:ring-2 ring-primary/20 outline-none dark:text-white"
                >
                    {selectedAcc ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            <span className="font-bold">{selectedAcc.name}</span>
                            <span className="text-[10px] uppercase tracking-wider opacity-50 ml-auto">{selectedAcc.type}</span>
                        </>
                    ) : (
                        <>
                            <span className="text-slate-400">Select...</span>
                        </>
                    )}
                    <span className="material-symbols-outlined text-[14px] text-slate-400">unfold_more</span>
                </button>

                {isOpen && coords && createPortal(
                    <div
                        ref={dropdownRef}
                        style={{
                            position: 'fixed',
                            top: coords.y,
                            left: coords.x,
                            minWidth: Math.max(260, coords.width),
                            zIndex: 99999
                        }}
                        className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden focus:outline-none animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Choose Account</span>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            {filteredAccounts.map(acc => {
                                const isCurrent = String(acc.id) === String(value);
                                return (
                                    <button
                                        key={acc.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(acc.id);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isCurrent ? 'bg-primary/5 text-white' : 'text-slate-300 hover:bg-white/5'}`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                                        <span className="font-semibold">{acc.name}</span>
                                        <span className="text-[10px] uppercase tracking-wider opacity-50 ml-auto">{acc.type}</span>
                                        {isCurrent && <span className="material-symbols-outlined text-[14px] text-emerald-400">check</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
};

export default function CopyCockpit() {
    const {
        accounts,
        trades,
        copyGroups,
        addCopyGroup,
        deleteCopyGroup,
        addCopyMember,
        removeCopyMember,
        updateCopyGroupStatus,
        updateCopyGroup,
        getAccountStats,
        isCopyGroupModalOpen: isCreatingGroup,
        setIsCopyGroupModalOpen: setIsCreatingGroup
    } = useData();
    const { showSuccess, showError } = useNotifications();

    const [newGroupName, setNewGroupName] = useState('');
    const [selectedLeaderId, setSelectedLeaderId] = useState('');

    const [expandedGroupId, setExpandedGroupId] = useState(null);
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [selectedFollowerId, setSelectedFollowerId] = useState('');
    const [riskMultiplier, setRiskMultiplier] = useState(1.0);
    const [editingLeaderId, setEditingLeaderId] = useState(null);
    const [newLeaderId, setNewLeaderId] = useState('');

    const handleCreateGroup = async () => {
        if (!newGroupName || !selectedLeaderId) return;
        const id = await addCopyGroup(newGroupName, selectedLeaderId);
        if (id) {
            showSuccess('Copy Trading Group created successfully');
            setIsCreatingGroup(false);
            setNewGroupName('');
            setSelectedLeaderId('');
        }
    };

    const handleDeleteGroup = async (group) => {
        const ok = window.confirm(`Are you sure you want to delete "${group.name}"? All member links will be removed.`);
        if (ok) {
            await deleteCopyGroup(group.id);
            showSuccess('Group deleted');
        }
    };

    const handleAddMember = async (groupId) => {
        if (!selectedFollowerId) return;
        await addCopyMember(groupId, selectedFollowerId, riskMultiplier);
        showSuccess('Follower added to group');
        setIsAddingMember(false);
        setSelectedFollowerId('');
        setRiskMultiplier(1.0);
    };

    const handleRemoveMember = async (member_id) => {
        await removeCopyMember(member_id);
        showSuccess('Follower removed');
    };

    const handleUpdateLeader = async (groupId) => {
        if (!newLeaderId) return;
        await updateCopyGroup(groupId, { leader_account_id: parseInt(newLeaderId) });
        showSuccess('Leader account updated');
        setEditingLeaderId(null);
        setNewLeaderId('');
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black dark:text-white tracking-tight">Copy Trading Cockpit</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your leader and follower account groups.</p>
                </div>
            </div>

            {isCreatingGroup && (
                <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold dark:text-white">Create Management Group</h3>
                        <button onClick={() => setIsCreatingGroup(false)} className="text-slate-400 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Group Name</label>
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={e => setNewGroupName(e.target.value)}
                                placeholder="e.g. Prop Firm Master Group"
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-5 py-3 focus:ring-2 ring-primary/20 outline-none transition-all dark:text-white"
                            />
                        </div>
                        <AccountDropdown
                            value={selectedLeaderId}
                            onChange={(id) => setSelectedLeaderId(id)}
                            label="Leader Account"
                        />
                    </div>
                    <div className="mt-8 flex justify-end gap-3">
                        <button onClick={() => setIsCreatingGroup(false)} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-700 dark:hover:text-white transition-colors">Cancel</button>
                        <button
                            onClick={handleCreateGroup}
                            className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                        >
                            Create Group
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {copyGroups.length === 0 && !isCreatingGroup && (
                    <div className="bg-slate-50 dark:bg-white/[0.02] border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem] py-20 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-slate-400 text-3xl">auto_awesome_motion</span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Copy Groups Yet</h4>
                        <p className="text-slate-500 text-sm max-w-xs mt-2">Create groups to automatically mirror trades from one leader account to multiple followers.</p>
                        <button
                            onClick={() => setIsCreatingGroup(true)}
                            className="mt-6 px-6 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                        >
                            Get Started
                        </button>
                    </div>
                )}

                {copyGroups.map(group => {
                    // Calculate group PnL (leader + all members)
                    const leaderStats = getAccountStats(group.leader_account_id, accounts, trades);
                    const todayStr = new Date().toISOString().split('T')[0];
                    const leaderDailyTrades = trades.filter(t => String(t.account_id) === String(group.leader_account_id) && t.date === todayStr);
                    const leaderDailyPnL = leaderDailyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                    if (leaderStats) {
                        leaderStats.dailyPnL = leaderDailyPnL;
                    }

                    const membersPnL = group.members.reduce((sum, member) => {
                        const memberStats = getAccountStats(member.follower_account_id, accounts, trades);
                        return sum + (memberStats?.totalPnL || 0);
                    }, 0);
                    const groupPnL = (leaderStats?.totalPnL || 0) + membersPnL;

                    return (
                        <div key={group.id} className="group relative">
                            {/* Glow Background */}
                            <div className={`absolute -inset-1 blur-2xl opacity-10 rounded-[2.5rem] transition-all duration-500 group-hover:opacity-20 ${group.is_active ? 'bg-primary' : 'bg-slate-500'}`} />

                            <div className="relative bg-white dark:bg-[#1E1B2E]/60 border border-slate-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl transition-all duration-500">
                                <div className="p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${group.is_active ? 'bg-primary/10 border border-primary/20' : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5'}`}>
                                                <span className={`material-symbols-outlined text-[32px] ${group.is_active ? 'text-primary' : 'text-slate-400'}`}>
                                                    {group.is_active ? 'bolt' : 'motion_photos_off'}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-xl font-black dark:text-white">{group.name}</h3>
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${group.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                                        {group.is_active ? 'Active' : 'Paused'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leader:</span>
                                                        {editingLeaderId === group.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="relative">
                                                                    <select
                                                                        value={newLeaderId}
                                                                        onChange={e => setNewLeaderId(e.target.value)}
                                                                        className="bg-white dark:bg-white/10 border border-primary/30 rounded-lg px-3 py-1 pr-8 text-xs font-bold text-primary outline-none focus:ring-2 ring-primary/20 appearance-none cursor-pointer hover:border-primary/50"
                                                                        style={{
                                                                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236366f1' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                                                            backgroundPosition: 'right 0.5rem center',
                                                                            backgroundRepeat: 'no-repeat',
                                                                            backgroundSize: '1em 1em',
                                                                        }}
                                                                    >
                                                                        <option value="" className="bg-white dark:bg-slate-800">Select...</option>
                                                                        {accounts.map(acc => (
                                                                            <option key={acc.id} value={acc.id} className="bg-white dark:bg-slate-800">{acc.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleUpdateLeader(group.id)}
                                                                    className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary/90 transition-all"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingLeaderId(null);
                                                                        setNewLeaderId('');
                                                                    }}
                                                                    className="px-2 py-1 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-white/20 transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span className="text-xs font-bold text-primary">{group.leader_name}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingLeaderId(group.id);
                                                                        setNewLeaderId(group.leader_account_id.toString());
                                                                    }}
                                                                    className="ml-2 text-slate-400 hover:text-primary transition-colors"
                                                                    title="Change leader account"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-4">
                                                    {/* Leader Stats */}
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1.5">Leader Daily</span>
                                                            <span className={`text-sm font-black ${(leaderStats?.dailyPnL || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {((leaderStats?.dailyPnL || 0) >= 0 ? '+' : '')}${(leaderStats?.dailyPnL || 0).toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="w-px h-6 bg-white/5 mx-1" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1.5">Leader Overall</span>
                                                            <span className={`text-sm font-black ${(leaderStats?.totalPnL || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {((leaderStats?.totalPnL || 0) >= 0 ? '+' : '')}${(leaderStats?.totalPnL || 0).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Group Stats */}
                                                    <div className="flex items-center gap-4 bg-white/5 px-5 py-2.5 rounded-2xl border border-white/5">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1.5">Group Combined P/L</span>
                                                            <span className={`text-base font-black ${groupPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                ${groupPnL.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => updateCopyGroupStatus(group.id, !group.is_active)}
                                                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${group.is_active ? 'bg-primary' : 'bg-slate-200 dark:bg-white/10'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${group.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteGroup(group)}
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                            </button>
                                            <button
                                                onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-300 transition-all ${expandedGroupId === group.id ? 'rotate-180' : ''}`}
                                            >
                                                <span className="material-symbols-outlined">expand_more</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Members List */}
                                    <div className={`space-y-3 transition-all duration-500 ${expandedGroupId === group.id ? 'opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                        <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                                            <div className="flex items-center justify-between mb-4 px-2">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Follower Accounts ({group.members.length})</h4>
                                                {!isAddingMember && (
                                                    <button
                                                        onClick={() => setIsAddingMember(true)}
                                                        className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                                                    >
                                                        + Add Member
                                                    </button>
                                                )}
                                            </div>

                                            {isAddingMember && expandedGroupId === group.id && (
                                                <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-6 mb-4 animate-in slide-in-from-top-4 duration-300">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <AccountDropdown
                                                            value={selectedFollowerId}
                                                            onChange={(id) => setSelectedFollowerId(id)}
                                                            label="Account"
                                                            filterOut={[group.leader_account_id]}
                                                        />
                                                        <div className="space-y-1.5 font-bold">
                                                            <label className="text-[10px] text-slate-500 ml-1">Risk Multiplier</label>
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    value={riskMultiplier}
                                                                    onChange={e => setRiskMultiplier(parseFloat(e.target.value))}
                                                                    className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 ring-primary/20 dark:text-white"
                                                                />
                                                                <span className="text-xs text-slate-400 font-black">X</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-end gap-2">
                                                            <button
                                                                onClick={handleAddMember.bind(null, group.id)}
                                                                className="flex-1 bg-primary text-white font-bold text-xs py-2.5 rounded-xl hover:bg-primary/90 transition-all"
                                                            >
                                                                Add
                                                            </button>
                                                            <button
                                                                onClick={() => setIsAddingMember(false)}
                                                                className="px-4 py-2.5 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-300 dark:hover:bg-white/20 transition-all"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                {group.members.map(member => {
                                                    // Use live stats to get current name/type (handles Rank Ups dynamically)
                                                    const stats = getAccountStats(member.follower_account_id, accounts, trades);
                                                    const accountName = stats?.acc?.name || member.follower_name;
                                                    const accountType = stats?.acc?.type || member.follower_type;
                                                    const todayStr = new Date().toISOString().split('T')[0];

                                                    // Calculate daily PnL efficiently
                                                    const memberDailyTrades = trades.filter(t => String(t.account_id) === String(member.follower_account_id) && t.date === todayStr);
                                                    const memberDailyPnL = memberDailyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

                                                    return (
                                                        <div key={member.id} className="group/item flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl hover:border-primary/20 hover:bg-white/50 dark:hover:bg-white/[0.04] transition-all duration-300">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                                                <div>
                                                                    <span className="text-sm font-bold dark:text-white uppercase tracking-tight">{accountName}</span>
                                                                    <span className="ml-2 text-[10px] text-slate-400 font-black">{accountType}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-10">
                                                                <div className="flex flex-col items-end min-w-[80px]">
                                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Daily P/L</span>
                                                                    <span className={`text-sm font-bold ${memberDailyPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                        {memberDailyPnL >= 0 ? '+' : ''}${memberDailyPnL.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-col items-end min-w-[80px]">
                                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Overall P/L</span>
                                                                    <span className={`text-sm font-bold ${(stats?.totalPnL || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                        {((stats?.totalPnL || 0) >= 0 ? '+' : '')}${(stats?.totalPnL || 0).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-col items-end min-w-[60px]">
                                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Multiplier</span>
                                                                    <span className="text-sm font-black text-slate-800 dark:text-white">{member.risk_multiplier.toFixed(1)}x</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleRemoveMember(member.id)}
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-all"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {group.members.length === 0 && !isAddingMember && (
                                                    <div className="p-8 text-center bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
                                                        <span className="text-xs text-slate-400 font-bold italic">No followers linked yet. Click "Add Member" to mirror trades.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
