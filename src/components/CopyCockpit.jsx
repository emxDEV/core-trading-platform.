import React, { useState, useRef, useEffect } from 'react';
import ViewHeader from './ViewHeader';
import { createPortal } from 'react-dom';
import { useData } from '../context/TradeContext';
import { useNotifications } from '../context/NotificationContext';

// Account Dropdown Component - Modernized for Strategic Commander
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
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">{label}</label>
            <div className="relative" ref={anchorRef}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl border transition-all duration-300 outline-none
                        ${isOpen
                            ? 'bg-white/10 border-primary/50 ring-4 ring-primary/10'
                            : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/5'}`}
                >
                    {selectedAcc ? (
                        <>
                            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                            <span className="font-bold text-sm text-white">{selectedAcc.name}</span>
                            <span className="text-[10px] uppercase font-black tracking-widest opacity-30 ml-auto">{selectedAcc.type}</span>
                        </>
                    ) : (
                        <>
                            <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">Select Tactical Unit</span>
                        </>
                    )}
                    <span className={`material-symbols-outlined text-[18px] text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {isOpen && coords && createPortal(
                    <div
                        ref={dropdownRef}
                        style={{
                            position: 'fixed',
                            top: coords.y,
                            left: coords.x,
                            minWidth: Math.max(280, coords.width),
                            zIndex: 99999
                        }}
                        className="bg-[#0F172A]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden focus:outline-none animate-in fade-in zoom-in-95 duration-300"
                    >
                        <div className="px-5 py-3 border-b border-white/5 bg-white/5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Unit Matrix</span>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto py-2">
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
                                        className={`w-full flex items-center gap-4 px-5 py-3.5 text-sm transition-all group ${isCurrent ? 'bg-primary/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <div className={`w-2 h-2 rounded-full transition-shadow ${isCurrent ? 'bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-700 group-hover:bg-slate-500'}`}></div>
                                        <span className="font-bold uppercase tracking-tight">{acc.name}</span>
                                        <span className="text-[9px] uppercase font-black tracking-widest opacity-30 ml-auto">{acc.type}</span>
                                        {isCurrent && <span className="material-symbols-outlined text-[18px] text-emerald-400 drop-shadow-glow">verified</span>}
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
        formatCurrency,
        isCopyGroupModalOpen: isCreatingGroup,
        setIsCopyGroupModalOpen: setIsCreatingGroup
    } = useData();
    const { showSuccess, showError, confirm } = useNotifications();

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
            showSuccess('Deployment group initialized');
            setIsCreatingGroup(false);
            setNewGroupName('');
            setSelectedLeaderId('');
        }
    };

    const handleDeleteGroup = async (group) => {
        const confirmed = await confirm({
            title: 'Decommission Group',
            message: `Are you sure you want to delete "${group.name}"? All operational links will be severed.`,
            confirmText: 'Confirm Deletion',
            type: 'danger'
        });

        if (confirmed) {
            await deleteCopyGroup(group.id);
            showSuccess('Command group terminated');
        }
    };

    const handleAddMember = async (groupId) => {
        if (!selectedFollowerId) return;
        await addCopyMember(groupId, selectedFollowerId, riskMultiplier);
        showSuccess('Tactical follower linked');
        setIsAddingMember(false);
        setSelectedFollowerId('');
        setRiskMultiplier(1.0);
    };

    const handleRemoveMember = async (member_id) => {
        await removeCopyMember(member_id);
        showSuccess('Operational link severed');
    };

    const handleUpdateLeader = async (groupId) => {
        if (!newLeaderId) return;
        await updateCopyGroup(groupId, { leader_account_id: parseInt(newLeaderId) });
        showSuccess('Command leadership updated');
        setEditingLeaderId(null);
        setNewLeaderId('');
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <ViewHeader
                title="Copy-Trading"
                accent="Cockpit"
                subtitle="Operational Fleet Sync Hub"
                icon="radar"
                iconColor="text-amber-400"
                iconBg="bg-amber-500/20"
                iconBorder="border-amber-500/30"
            >
                {!isCreatingGroup && (
                    <button
                        onClick={() => setIsCreatingGroup(true)}
                        className="px-6 py-3.5 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all rounded-2xl flex items-center gap-3 group/add"
                    >
                        <span className="material-symbols-outlined text-primary group-hover/add:rotate-90 transition-transform duration-500">add_circle</span>
                        <span className="text-xs font-black uppercase tracking-widest text-white/70">New Command Group</span>
                    </button>
                )}
            </ViewHeader>

            {/* Creation Modal / Inline Form */}
            {isCreatingGroup && (
                <div className="bg-[#0F172A]/90 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 opacity-50 blur-[80px] -z-10 pointer-events-none" />

                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Deploy New Command Group</h3>
                        </div>
                        <button
                            onClick={() => setIsCreatingGroup(false)}
                            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Tactical Codename</label>
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={e => setNewGroupName(e.target.value)}
                                placeholder="e.g. ALPHA_SYNC_OMEGA"
                                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:ring-4 ring-primary/10 border-primary/30 outline-none transition-all placeholder:text-slate-700"
                            />
                        </div>
                        <AccountDropdown
                            value={selectedLeaderId}
                            onChange={(id) => setSelectedLeaderId(id)}
                            label="Command Leader Unit"
                        />
                    </div>

                    <div className="mt-12 flex justify-end items-center gap-6">
                        <button
                            onClick={() => setIsCreatingGroup(false)}
                            className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-white transition-colors"
                        >
                            Abort Deployment
                        </button>
                        <button
                            onClick={handleCreateGroup}
                            disabled={!newGroupName || !selectedLeaderId}
                            className={`px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all transform active:scale-[0.98]
                                ${newGroupName && selectedLeaderId
                                    ? 'bg-primary text-white shadow-xl shadow-primary/30 hover:shadow-primary/40'
                                    : 'bg-white/5 text-slate-700 cursor-not-allowed border border-white/5'}`}
                        >
                            Initialize Group
                        </button>
                    </div>
                </div>
            )}

            {/* Groups Grid */}
            <div className="space-y-8">
                {copyGroups.length === 0 && !isCreatingGroup && (
                    <div className="py-32 text-center rounded-[3rem] bg-white/[0.01] border border-dashed border-white/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[100px]" />
                        <div className="relative z-10 max-w-sm mx-auto space-y-8">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse" />
                                <div className="relative bg-white/5 w-28 h-28 rounded-[2.5rem] flex items-center justify-center border border-white/10 mx-auto shadow-2xl">
                                    <span className="material-symbols-outlined text-6xl text-primary/40 drop-shadow-glow">auto_awesome_motion</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-3xl font-black text-white tracking-tighter">Command Void Detected</h3>
                                <p className="text-slate-500 font-medium leading-relaxed px-4">
                                    No active synchronization groups found in the cockpit. Initialize a group to begin mirroring tactical maneuvers across your fleet.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCreatingGroup(true)}
                                className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-1 active:scale-[0.98]"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                )}

                {copyGroups.map(group => {
                    const leaderStats = getAccountStats(group.leader_account_id, accounts, trades);
                    const todayStr = new Date().toISOString().split('T')[0];
                    const leaderDailyTrades = trades.filter(t => String(t.account_id) === String(group.leader_account_id) && t.date === todayStr);
                    const leaderDailyPnL = leaderDailyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                    if (leaderStats) {
                        leaderStats.dailyPnL = leaderDailyPnL;
                    }

                    const membersPnL = (group.members || []).reduce((sum, member) => {
                        const memberStats = getAccountStats(member.follower_account_id, accounts, trades);
                        return sum + (memberStats?.totalPnL || 0);
                    }, 0);
                    const groupPnL = (leaderStats?.totalPnL || 0) + membersPnL;

                    return (
                        <div key={group.id} className="group/card relative">
                            {/* Operational Status Pulse */}
                            {!!group.is_active && (
                                <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/10 via-cyan-400/5 to-primary/10 blur-md rounded-[3rem] opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000 -z-10" />
                            )}

                            <div className={`relative rounded-[3rem] border transition-all duration-700 overflow-hidden backdrop-blur-3xl
                                ${group.is_active
                                    ? 'bg-[#0F172A]/90 border-white/10 hover:border-white/20 shadow-2xl shadow-black/50'
                                    : 'bg-[#0F172A]/60 border-white/5 opacity-60 hover:opacity-100 hover:bg-[#0F172A]/80'}`}>

                                <div className="p-6 md:p-8">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all duration-500 shadow-inner
                                                ${group.is_active
                                                    ? 'bg-primary/10 border border-primary/20 shadow-primary/5'
                                                    : 'bg-white/5 border border-white/10 shadow-black/40'}`}>
                                                <span className={`material-symbols-outlined text-[30px] transition-all duration-500
                                                    ${group.is_active ? 'text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'text-slate-600'}`}>
                                                    {group.is_active ? 'bolt' : 'motion_photos_off'}
                                                </span>
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-2xl font-black text-white tracking-tighter">{group.name}</h3>
                                                    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border
                                                        ${group.is_active
                                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                            : 'bg-white/5 border-white/10 text-slate-500'}`}>
                                                        {group.is_active ? 'Active Sync' : 'Paused'}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 mt-1.5 px-0.5">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Command Leader:</span>
                                                    {editingLeaderId === group.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="relative">
                                                                <select
                                                                    value={newLeaderId}
                                                                    onChange={e => setNewLeaderId(e.target.value)}
                                                                    className="bg-white/10 border border-primary/30 rounded-xl px-4 py-1.5 pr-10 text-xs font-black text-primary outline-none focus:ring-4 ring-primary/10 appearance-none cursor-pointer hover:border-primary/50"
                                                                    style={{
                                                                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236366f1' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                                                        backgroundPosition: 'right 0.75rem center',
                                                                        backgroundRepeat: 'no-repeat',
                                                                        backgroundSize: '1em 1em',
                                                                    }}
                                                                >
                                                                    <option value="" className="bg-slate-900">Select...</option>
                                                                    {accounts.map(acc => (
                                                                        <option key={acc.id} value={acc.id} className="bg-slate-900">{acc.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <button onClick={() => handleUpdateLeader(group.id)} className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                                                                <span className="material-symbols-outlined text-[18px]">check</span>
                                                            </button>
                                                            <button onClick={() => { setEditingLeaderId(null); setNewLeaderId(''); }} className="w-8 h-8 rounded-xl bg-white/5 text-slate-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all">
                                                                <span className="material-symbols-outlined text-[18px]">close</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 group/leader">
                                                            <span className="text-xs font-black text-primary uppercase tracking-wider">{group.leader_name}</span>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingLeaderId(group.id);
                                                                    setNewLeaderId(group.leader_account_id.toString());
                                                                }}
                                                                className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-slate-600 hover:text-primary hover:bg-primary/10 transition-all opacity-0 group-hover/leader:opacity-100 scale-90 hover:scale-100"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-6 md:gap-10">
                                            {/* Tactical Performance Stats */}
                                            <div className="flex items-center gap-8">
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] block">Leader P/L</span>
                                                    <span className={`text-base font-black tracking-tight ${leaderDailyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {leaderDailyPnL >= 0 ? '+' : ''}{formatCurrency(leaderDailyPnL)}
                                                    </span>
                                                </div>
                                                <div className="w-px h-10 bg-white/5" />
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.25em] block">Fleet Output</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-2xl font-black tracking-tighter drop-shadow-lg ${groupPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {formatCurrency(groupPnL)}
                                                        </span>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${groupPnL >= 0 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Hub */}
                                            <div className="flex items-center gap-4 border-l border-white/5 pl-8 md:pl-10">
                                                <button
                                                    onClick={() => updateCopyGroupStatus(group.id, !group.is_active)}
                                                    title={group.is_active ? "Deactivate Sync" : "Initialize Sync"}
                                                    className={`w-14 h-8 rounded-full transition-all duration-500 relative flex items-center px-1.5 shadow-inner
                                                        ${group.is_active ? 'bg-primary shadow-primary/20' : 'bg-white/[0.05] border border-white/5'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full bg-white shadow-xl transition-all duration-500 
                                                        ${group.is_active ? 'translate-x-6' : 'translate-x-0 opacity-40'}`} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteGroup(group)}
                                                    className="w-11 h-11 rounded-2xl bg-white/5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 border border-white/5 transition-all flex items-center justify-center group/del"
                                                >
                                                    <span className="material-symbols-outlined text-[20px] group-hover/del:scale-110 transition-transform">scan_delete</span>
                                                </button>
                                                <button
                                                    onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
                                                    className={`w-11 h-11 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-300 transition-all duration-500
                                                        ${expandedGroupId === group.id ? 'rotate-180 bg-primary/10 border-primary/20 text-primary' : 'hover:bg-white/10 hover:border-white/20'}`}
                                                >
                                                    <span className="material-symbols-outlined text-[24px]">expand_more</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Follower Management */}
                                    <div className={`transition-all duration-700 ease-[cubic-bezier(0.34, 1.56, 0.64, 1)] 
                                        ${expandedGroupId === group.id ? 'mt-10 opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0 overflow-hidden mt-0'}`}>

                                        <div className="pt-8 border-t border-white/5 space-y-8">
                                            <div className="flex items-center justify-between px-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-4 bg-slate-700 rounded-full" />
                                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">Operational Links ({group.members.length})</h4>
                                                </div>
                                                {!isAddingMember && (
                                                    <button
                                                        onClick={() => setIsAddingMember(true)}
                                                        className="px-5 py-2.5 bg-primary/10 border border-primary/20 rounded-xl text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:bg-primary/20 transition-all active:scale-[0.98]"
                                                    >
                                                        + Signal New Follower
                                                    </button>
                                                )}
                                            </div>

                                            {isAddingMember && expandedGroupId === group.id && (
                                                <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 animate-in slide-in-from-top-6 duration-500 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-primary/5 blur-[40px] opacity-30 -z-10" />
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                        <AccountDropdown
                                                            value={selectedFollowerId}
                                                            onChange={(id) => setSelectedFollowerId(id)}
                                                            label="Follower Unit"
                                                            filterOut={[group.leader_account_id]}
                                                        />
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Risk Intensity</label>
                                                            <div className="relative group/range">
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    value={riskMultiplier}
                                                                    onChange={e => setRiskMultiplier(parseFloat(e.target.value))}
                                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-black text-white outline-none focus:ring-4 ring-primary/10 transition-all text-center pr-10"
                                                                />
                                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary">xVAL</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-end gap-3">
                                                            <button
                                                                onClick={handleAddMember.bind(null, group.id)}
                                                                className="flex-1 bg-primary text-white font-black text-[10px] py-4 rounded-2xl uppercase tracking-[0.2em] hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.96]"
                                                            >
                                                                Link Unit
                                                            </button>
                                                            <button
                                                                onClick={() => setIsAddingMember(false)}
                                                                className="px-6 py-4 bg-white/5 border border-white/5 text-slate-500 font-black text-[10px] rounded-2xl uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all"
                                                            >
                                                                Abort
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                {group.members.map(member => {
                                                    const stats = getAccountStats(member.follower_account_id, accounts, trades);
                                                    const accountName = stats?.acc?.name || member.follower_name;
                                                    const accountType = stats?.acc?.type || member.follower_type;
                                                    const todayStr = new Date().toISOString().split('T')[0];
                                                    const memberDailyTrades = trades.filter(t => String(t.account_id) === String(member.follower_account_id) && t.date === todayStr);
                                                    const memberDailyPnL = memberDailyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

                                                    return (
                                                        <div key={member.id} className="group/item flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-2 h-2 rounded-full bg-primary/40 shadow-inner group-hover/item:bg-primary group-hover/item:shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-500" />
                                                                <div>
                                                                    <div className="font-black text-[13px] text-white/90 uppercase tracking-tight">{accountName}</div>
                                                                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-0.5">{accountType} Matrix</div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-10">
                                                                <div className="flex flex-col items-end min-w-[70px]">
                                                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1.5">Daily Net</span>
                                                                    <span className={`text-xs font-black tracking-tight ${memberDailyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                        {memberDailyPnL >= 0 ? '+' : ''}{formatCurrency(memberDailyPnL)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-col items-end min-w-[60px]">
                                                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1.5">Risk</span>
                                                                    <span className="text-xs font-black text-white/40 tracking-tight">{member.risk_multiplier.toFixed(1)}x</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleRemoveMember(member.id)}
                                                                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover/item:opacity-100 translate-x-4 group-hover/item:translate-x-0 group/rem"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px] group-hover/rem:rotate-90 transition-transform duration-500">close</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {group.members.length === 0 && !isAddingMember && (
                                                    <div className="col-span-full py-16 text-center bg-white/[0.01] rounded-[2.5rem] border border-dashed border-white/5">
                                                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 opacity-40">
                                                            <span className="material-symbols-outlined text-slate-500 text-[24px]">link_off</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-600 font-bold uppercase tracking-[0.25em] italic">No active follower links detected.</p>
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
