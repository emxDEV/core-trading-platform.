import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/TradeContext';
import PillInput from './PillInput';
import { useNotifications } from '../context/NotificationContext';

// New Imports
import { SmartPortal, ValidationTooltip } from '../utils/uiUtils';
import { ACCOUNT_TYPES, PROP_FIRMS, TYPE_COLORS } from '../constants/firms';
import ImageSection from './ImageSection';
import ModernDatePicker from './ModernDatePicker';
import CurrencyInput from './CurrencyInput';
import AccountStatsTooltip from './AccountStatsTooltip';
import { PropFirmPicker, AccountPicker } from './AccountPickers';
import { CelebrationModal, BreachModal, PayoutGoalModal } from './modals/OutcomeModals';

export default function NewTradeModal({ isOpen, onClose, tradeToEdit = null }) {
    const { addTrade, updateTrade, updateAccount, deleteAccount, accounts, addAccount, trades, getAccountStats, copyGroups } = useData();
    const { showSuccess, showError, showWarning, confirm } = useNotifications();
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    const [formErrors, setFormErrors] = useState({});
    const inputRefs = {
        account_id: React.useRef(null),
        date: React.useRef(null),
        symbol: React.useRef(null),
        pnl: React.useRef(null)
    };

    const [formData, setFormData] = useState({
        account_id: '',
        date: new Date().toISOString().split('T')[0],
        symbol: '',
        model: '',
        bias: '',
        side: 'LONG',
        confluences: '',
        entry_signal: '',
        order_type: 'Market',
        sl_pips: '',
        risk_percent: '',
        pnl: '',
        psychology: '',
        mistakes: '',
        comment_bias: '',
        comment_execution: '',
        comment_problems: '',
        comment_fazit: '',
        image_paths: '',
        images_execution: '',
        images_condition: '',
        images_narrative: '',
        trade_session: ''
    });

    // Fix for race condition between PillInput onBlur and submit
    const formDataRef = useRef(formData);
    formDataRef.current = formData;

    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountType, setNewAccountType] = useState('Live');
    const [newAccountCapital, setNewAccountCapital] = useState('');
    const [newAccountProfitTarget, setNewAccountProfitTarget] = useState('');
    const [newAccountMaxLoss, setNewAccountMaxLoss] = useState('');
    const [newAccountConsistency, setNewAccountConsistency] = useState('');
    const [newAccountPropFirm, setNewAccountPropFirm] = useState('');
    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [accountContextMenu, setAccountContextMenu] = useState(null);
    const [showAccountPicker, setShowAccountPicker] = useState(false);
    const [showPropFirmPicker, setShowPropFirmPicker] = useState(false);
    const [showEditPropFirmPicker, setShowEditPropFirmPicker] = useState(false);
    const [consistencyWarning, setConsistencyWarning] = useState(null);
    const [hoveredAccount, setHoveredAccount] = useState(null); // { acc, x, y }
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationData, setCelebrationData] = useState(null);
    const [showBreach, setShowBreach] = useState(false);
    const [breachData, setBreachData] = useState(null);
    const [showPayoutGoal, setShowPayoutGoal] = useState(false);
    const [payoutGoalData, setPayoutGoalData] = useState(null);

    // Form Validation Helpers
    const isNewAccountReady = useMemo(() => {
        const hasBaseFields = newAccountName.trim() !== '' && newAccountCapital !== '';
        if (newAccountType === 'Evaluation') {
            return hasBaseFields && newAccountPropFirm !== '' && newAccountProfitTarget !== '' && newAccountMaxLoss !== '';
        }
        if (newAccountType === 'Funded') {
            return hasBaseFields && newAccountPropFirm !== '' && newAccountMaxLoss !== '';
        }
        return hasBaseFields;
    }, [newAccountName, newAccountCapital, newAccountType, newAccountPropFirm, newAccountProfitTarget, newAccountMaxLoss]);

    const isTradeReady = useMemo(() => {
        return formData.account_id !== '' && formData.date !== '' && formData.symbol !== '' && formData.pnl !== '';
    }, [formData.account_id, formData.date, formData.symbol, formData.pnl]);

    const isEditAccountReady = useMemo(() => {
        if (!editingAccount) return false;
        const hasBaseFields = (editingAccount.name || '').trim() !== '' && editingAccount.capital !== '';
        if (editingAccount.type === 'Evaluation') {
            return hasBaseFields && (editingAccount.prop_firm || '') !== '' && editingAccount.profit_target !== '' && editingAccount.max_loss !== '';
        }
        if (editingAccount.type === 'Funded') {
            return hasBaseFields && (editingAccount.prop_firm || '') !== '' && editingAccount.max_loss !== '';
        }
        return hasBaseFields;
    }, [editingAccount]);





    // Derive unique suggestions from past trades
    const symbolSuggestions = useMemo(() => {
        const unique = [...new Set(trades.map(t => t.symbol).filter(Boolean))];
        return unique.sort();
    }, [trades]);

    const modelSuggestions = useMemo(() => {
        const unique = [...new Set(trades.map(t => t.model).filter(Boolean))];
        return unique.sort();
    }, [trades]);

    const entrySignalSuggestions = useMemo(() => {
        const all = trades.flatMap(t =>
            (t.entry_signal || '').split(',').map(s => s.trim()).filter(Boolean)
        );
        return [...new Set(all)].sort();
    }, [trades]);

    const confluenceSuggestions = useMemo(() => {
        const all = trades.flatMap(t =>
            (t.confluences || '').split(',').map(s => s.trim()).filter(Boolean)
        );
        return [...new Set(all)].sort();
    }, [trades]);

    const sessionSuggestions = useMemo(() => {
        const unique = [...new Set(trades.map(t => t.trade_session).filter(Boolean))];
        return unique.length > 0 ? unique.sort() : ['London', 'New York', 'Asia'];
    }, [trades]);

    useEffect(() => {
        if (tradeToEdit) {
            setFormData({
                id: tradeToEdit.id,
                account_id: tradeToEdit.account_id || (accounts.length > 0 ? accounts[0].id : ''),
                date: tradeToEdit.date,
                symbol: tradeToEdit.symbol,
                model: tradeToEdit.model || '',
                bias: tradeToEdit.bias || '',
                side: tradeToEdit.side,
                confluences: tradeToEdit.confluences || '',
                entry_signal: tradeToEdit.entry_signal || '',
                order_type: tradeToEdit.order_type || 'Market',
                sl_pips: tradeToEdit.sl_pips || '',
                risk_percent: tradeToEdit.risk_percent || '',
                pnl: tradeToEdit.pnl || '',
                psychology: tradeToEdit.psychology || '',
                mistakes: tradeToEdit.mistakes || '',
                comment_bias: tradeToEdit.comment_bias || '',
                comment_execution: tradeToEdit.comment_execution || '',
                comment_problems: tradeToEdit.comment_problems || '',
                comment_fazit: tradeToEdit.comment_fazit || '',
                image_paths: tradeToEdit.image_paths || '',
                images_execution: tradeToEdit.images_execution || '',
                images_condition: tradeToEdit.images_condition || '',
                images_narrative: tradeToEdit.images_narrative || '',
                trade_session: tradeToEdit.trade_session || ''
            });
        } else if (isOpen) {
            // Reset for new trade
            setFormData(prev => ({
                ...prev,
                account_id: prev.account_id || (accounts.length > 0 ? accounts[0].id : ''),
                date: new Date().toISOString().split('T')[0],
                symbol: '',
                model: '',
                bias: '',
                side: 'LONG',
                confluences: '',
                entry_signal: '',
                order_type: 'Market',
                sl_pips: '',
                risk_percent: '',
                pnl: '',
                psychology: '',
                mistakes: '',
                comment_bias: '',
                comment_execution: '',
                comment_problems: '',
                comment_fazit: '',
                image_paths: '',
                images_execution: '',
                images_condition: '',
                images_narrative: '',
                trade_session: ''
            }));
        }
    }, [tradeToEdit, isOpen]);

    useEffect(() => {
        if (accounts.length > 0 && !formData.account_id) {
            setFormData(prev => ({ ...prev, account_id: accounts[0].id }));
        }
    }, [accounts]);

    // Dismiss all account popups on outside click
    useEffect(() => {
        const dismiss = (e) => {
            // If click is on a trigger, let the trigger handle it
            if (e.target.closest('[data-dropdown-trigger]')) return;

            // Portals stop propagation, so clicks inside them won't reach here.
            // This is truly "outside click" logic now.
            setAccountContextMenu(null);
            setShowAccountPicker(false);
            setEditingAccount(null);
            setShowPropFirmPicker(false);
            setShowEditPropFirmPicker(false);
            setHoveredAccount(null);
        };
        window.addEventListener('mousedown', dismiss);
        return () => window.removeEventListener('mousedown', dismiss);
    }, []);

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



    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAccountSubmit = async () => {
        if (newAccountName) {
            const id = await addAccount({
                name: newAccountName,
                type: newAccountType,
                currency: 'USD',
                capital: parseFloat(newAccountCapital) || 0,
                profit_target: parseFloat(newAccountProfitTarget) || 0,
                max_loss: parseFloat(newAccountMaxLoss) || 0,
                consistency_rule: newAccountConsistency,
                prop_firm: newAccountPropFirm,
            });
            if (id) {
                setFormData(prev => ({ ...prev, account_id: id }));
                setIsAddingAccount(false);
                setNewAccountName('');
                setNewAccountCapital('');
                setNewAccountProfitTarget('');
                setNewAccountMaxLoss('');
                setNewAccountConsistency('');
                setNewAccountPropFirm('');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Wait for PillInput onBlur to update state
        await new Promise(resolve => setTimeout(resolve, 0));
        const data = formDataRef.current;

        // Manual Validation
        const errors = {};
        if (!data.account_id) errors.account_id = "Account ist erforderlich";
        if (!data.date) errors.date = "Datum ist erforderlich";
        if (!data.symbol) errors.symbol = "Symbol ist erforderlich";
        if (data.pnl === '' || data.pnl === null) errors.pnl = "PnL ist erforderlich";

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            showError("Bitte füllen Sie alle erforderlichen Felder aus");

            // Auto-hide errors after 3 seconds
            setTimeout(() => setFormErrors({}), 3000);
            return;
        }

        const tradeData = {
            ...data,
            pnl: parseFloat(data.pnl) || 0,
            sl_pips: parseFloat(data.sl_pips) || 0,
            risk_percent: parseFloat(data.risk_percent) || 0,
            account_id: parseInt(data.account_id) || null
        };

        // Event Queues
        const passedEvents = [];
        const breachedEvents = [];
        const payoutEvents = [];
        const checkedAccountIds = new Set();

        // Helper to analyze account state changes
        const analyzeAccountStatus = (acc, tradePnL) => {
            if (!acc || checkedAccountIds.has(acc.id)) return;
            checkedAccountIds.add(acc.id);

            // Skip if not relevant type
            if (!['Evaluation', 'Funded'].includes(acc.type)) return;

            const _pnl = parseFloat(tradePnL) || 0;
            const stats = getAccountStats(acc.id, accounts, trades);
            const newBalance = stats.balance + _pnl;
            const newTotalPnL = stats.totalPnL + _pnl;

            console.log(`[NewTradeModal] Analyzing ${acc.name} (${acc.id})`);
            console.log(`[NewTradeModal] Type: ${acc.type}, Profit Target: ${acc.profit_target}, Payout Goal: ${acc.payout_goal}`);
            console.log(`[NewTradeModal] Old Balance: ${stats.balance}, New Balance: ${newBalance}`);
            console.log(`[NewTradeModal] Target: ${stats.target}, UpdatedTarget: ${stats.updatedTarget}, MLL: ${stats.mll}`);
            console.log(`[NewTradeModal] ConsistencyValid: ${stats.consistencyValid}`);

            // 1. Check Eval Pass / Rank Up
            if (acc.profit_target > 0) {
                // Fixed: Use stats.target logic directly. Explicitly check for target hit locally.
                const target = stats.target;
                const targetHit = stats.balance < target && newBalance >= target;

                console.log(`[NewTradeModal] Target Hit Check: ${targetHit} (${stats.balance} < ${target} && ${newBalance} >= ${target})`);

                if (targetHit) {
                    passedEvents.push({
                        account: acc,
                        oldStats: stats,
                        newStats: { ...stats, balance: newBalance, totalPnL: newTotalPnL },
                        type: acc.type === 'Evaluation' ? 'RANK_UP' : 'TARGET_HIT'
                    });
                }
            }

            // 2. Check Breach
            if (stats.balance > stats.mll && newBalance <= stats.mll) {
                console.log(`[NewTradeModal] Breach Check: TRUE (${stats.balance} > ${stats.mll} && ${newBalance} <= ${stats.mll})`);
                breachedEvents.push({
                    account: acc,
                    oldStats: stats,
                    newStats: { ...stats, balance: newBalance, totalPnL: newTotalPnL }
                });
            } else {
                console.log(`[NewTradeModal] Breach Check: FALSE (${stats.balance} > ${stats.mll} && ${newBalance} <= ${stats.mll})`);
            }

            // 3. Check Payout Goal
            const payoutGoal = parseFloat(acc.payout_goal) || 0;
            if (acc.type === 'Funded' && payoutGoal > 0) {
                const payoutHit = stats.totalPnL < payoutGoal && newTotalPnL >= payoutGoal;
                console.log(`[NewTradeModal] Payout Check: ${payoutHit} (${stats.totalPnL} < ${payoutGoal} && ${newTotalPnL} >= ${payoutGoal})`);

                if (payoutHit) {
                    payoutEvents.push({
                        account: acc,
                        oldPnL: stats.totalPnL,
                        newPnL: newTotalPnL
                    });
                }
            }
        };

        // 1. Analyze Main Account
        const mainAcc = accounts.find(a => String(a.id) === String(tradeData.account_id));
        analyzeAccountStatus(mainAcc, tradeData.pnl);

        let success = false;
        if (tradeToEdit) {
            success = await updateTrade(tradeData);
            if (success) showSuccess("Trade updated successfully");
        } else {
            success = await addTrade(tradeData);
            if (success) {
                showSuccess("Trade saved successfully");

                // --- COPY TRADING LOGIC ---
                const activeCopyGroups = copyGroups.filter(g => g.is_active && String(g.leader_account_id) === String(tradeData.account_id));

                if (activeCopyGroups.length > 0) {
                    console.log(`[CopyTrading] Found ${activeCopyGroups.length} active groups for leader ${tradeData.account_id}`);

                    for (const group of activeCopyGroups) {
                        if (!group.members) continue;

                        for (const member of group.members) {
                            const multiplier = parseFloat(member.risk_multiplier) || 1.0;
                            const followerPnL = (parseFloat(tradeData.pnl) || 0) * multiplier;

                            // Prepare follower trade
                            const followerTrade = {
                                ...tradeData,
                                account_id: member.follower_account_id,
                                pnl: followerPnL,
                                risk_percent: (parseFloat(tradeData.risk_percent) || 0) * multiplier,
                                comment_execution: `[CopyTrade] Copied from Leader (x${multiplier})`,
                            };
                            delete followerTrade.id; // Ensure new

                            console.log(`[CopyTrading] Copying to follower ${member.follower_account_id}`);
                            await addTrade(followerTrade);

                            // Analyze Follower
                            const followerAcc = accounts.find(a => String(a.id) === String(member.follower_account_id));
                            analyzeAccountStatus(followerAcc, followerPnL);
                        }
                    }
                }
            }
        }

        // 4. Trigger Modals Sequentially
        if (passedEvents.length > 0 || breachedEvents.length > 0 || payoutEvents.length > 0) {
            // Set Data
            if (passedEvents.length > 0) setCelebrationData({ events: passedEvents });
            if (breachedEvents.length > 0) setBreachData({ events: breachedEvents });
            if (payoutEvents.length > 0) setPayoutGoalData({ accounts: payoutEvents });

            // Show Critical first (Celebration > Breach > Payout)
            if (passedEvents.length > 0) setShowCelebration(true);
            else if (breachedEvents.length > 0) setShowBreach(true);
            else if (payoutEvents.length > 0) setShowPayoutGoal(true);
        } else {
            // Close if no events (and success)
            if (success) {
                onClose();
                setActiveTab('general');
            } else if (!success) {
                showError("Fehler beim Speichern des Trades");
            }
        }
    };

    // Consistency rule check: warn if a single day's profit exceeds the threshold
    useEffect(() => {
        const account = accounts.find(a => String(a.id) === String(formData.account_id));
        if (!account || (account.type !== 'Evaluation' && account.type !== 'Funded')) {
            setConsistencyWarning(null);
            return;
        }
        const consistencyPct = parseFloat(account.consistency_rule);
        const profitTarget = parseFloat(account.profit_target);
        if (!consistencyPct || !profitTarget) {
            setConsistencyWarning(null);
            return;
        }
        const maxDailyProfit = profitTarget * (consistencyPct / 100);
        const currentDate = formData.date;
        const currentPnl = parseFloat(formData.pnl) || 0;
        // Sum PnL for same account + same day from existing trades (exclude current trade if editing)
        const sameDayPnL = trades
            .filter(t => String(t.account_id) === String(account.id) && t.date === currentDate && (!tradeToEdit || t.id !== tradeToEdit.id))
            .reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalDayPnL = sameDayPnL + currentPnl;

        // Current account's total net PnL including this trade
        const totalAccountPnL = trades
            .filter(t => String(t.account_id) === String(account.id) && (!tradeToEdit || t.id !== tradeToEdit.id))
            .reduce((sum, t) => sum + (t.pnl || 0), 0) + currentPnl;

        // The warning only triggers if the user is actually entering a profit (currentPnl > 0)
        // AND today's total profit is a breach AND the entire account is in a breach-relevant profit level
        if (currentPnl > 0 && totalDayPnL > maxDailyProfit && totalAccountPnL > maxDailyProfit) {
            setConsistencyWarning({
                message: `Warning: Today's total profit ($${totalDayPnL.toFixed(2)}) exceeds the ${consistencyPct}% consistency limit ($${maxDailyProfit.toFixed(2)}) of your $${profitTarget.toFixed(0)} profit target!`,
                severity: 'danger'
            });
        } else if (currentPnl > 0 && totalDayPnL > maxDailyProfit * 0.8 && totalAccountPnL > maxDailyProfit * 0.8) {
            setConsistencyWarning({
                message: `Caution: Today's total profit ($${totalDayPnL.toFixed(2)}) is approaching the ${consistencyPct}% consistency limit ($${maxDailyProfit.toFixed(2)}).`,
                severity: 'warning'
            });
        } else {
            setConsistencyWarning(null);
        }
    }, [formData.pnl, formData.date, formData.account_id, accounts, trades]);





    if (!isOpen && !isVisible) return null;

    const inputClass = "w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white text-sm";
    const labelClass = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2";

    const tabs = [
        { id: 'general', label: 'General', icon: 'info' },
        { id: 'execution', label: 'Execution', icon: 'candlestick_chart' },
        { id: 'attachments', label: 'Attachments', icon: 'image' },
        { id: 'psychology', label: 'Psychology', icon: 'psychology' },
        { id: 'journal', label: 'Journal', icon: 'edit_note' },
    ];

    return (
        <>
            <AccountStatsTooltip hoveredAccount={hoveredAccount} accounts={accounts} trades={trades} getAccountStats={getAccountStats} />
            {createPortal(
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ease-out ${isAnimating ? 'bg-black/70 backdrop-blur-md opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`}
                    onClick={onClose}
                >
                    <div
                        className={`bg-white dark:bg-surface-dark rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${isAnimating ? 'scale-100 translate-y-0 opacity-100 blur-0' : 'scale-95 translate-y-8 opacity-0 blur-md'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center px-8 pt-8 pb-6">
                            <div>
                                <h2 className="text-2xl font-bold dark:text-white">{tradeToEdit ? 'Edit Trade' : 'New Trade'}</h2>
                                <p className="text-sm text-slate-400 mt-1">{tradeToEdit ? 'Update position details' : 'Record a new position in your journal'}</p>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-white transition-all">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-8 gap-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all border-b-2 ${activeTab === tab.id
                                        ? 'border-primary text-primary bg-primary/5'
                                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="border-b border-slate-100 dark:border-slate-800"></div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-10 py-10">
                            <form id="tradeForm" onSubmit={handleSubmit} noValidate className="space-y-8">

                                {activeTab === 'general' && (
                                    <div className="space-y-8">
                                        {/* Account */}
                                        <div className="relative" ref={inputRefs.account_id}>
                                            <label className={labelClass}>Account <span className="normal-case font-normal text-slate-500 ml-1">(right-click to edit)</span></label>
                                            <ValidationTooltip message={formErrors.account_id} isVisible={!!formErrors.account_id} anchorRef={inputRefs.account_id} />

                                            {/* Context Menu */}
                                            {accountContextMenu && (
                                                <SmartPortal coords={{ x: accountContextMenu.x, y: accountContextMenu.y }} className="min-w-[160px] bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden focus:outline-none">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const a = accountContextMenu.acc;
                                                            setEditingAccount({ id: a.id, name: a.name, type: a.type, capital: a.capital || 0, profit_target: a.profit_target || 0, max_loss: a.max_loss || 0, consistency_rule: a.consistency_rule || '', prop_firm: a.prop_firm || '', x: accountContextMenu.x, y: accountContextMenu.y });
                                                            setAccountContextMenu(null);
                                                            setIsAddingAccount(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                                        Edit Account
                                                    </button>
                                                    <div className="border-t border-slate-100 dark:border-slate-800"></div>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            const confirmed = await confirm({
                                                                title: 'Delete Account',
                                                                message: `Are you sure you want to delete "${accountContextMenu.acc.name}"? This will also remove the link to all associated trades.`,
                                                                confirmText: 'Delete',
                                                                type: 'danger'
                                                            });
                                                            if (confirmed) {
                                                                await deleteAccount(accountContextMenu.acc.id);
                                                            }
                                                            setAccountContextMenu(null);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                        Delete Account
                                                    </button>
                                                </SmartPortal>
                                            )}

                                            {/* Floating Edit Account Form */}
                                            {editingAccount && (
                                                <SmartPortal coords={{ x: editingAccount.x, y: editingAccount.y }} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 space-y-3 w-[360px] max-h-[80vh] overflow-y-auto">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="material-symbols-outlined text-[16px] text-primary">edit</span>
                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Edit Account</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Account name..."
                                                        value={editingAccount.name}
                                                        onChange={(e) => setEditingAccount(prev => ({ ...prev, name: e.target.value }))}
                                                        className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white text-sm"
                                                        autoFocus
                                                    />
                                                    <div className="flex flex-wrap gap-2">
                                                        {ACCOUNT_TYPES.map(type => (
                                                            <button
                                                                key={type}
                                                                type="button"
                                                                onClick={() => setEditingAccount(prev => ({ ...prev, type }))}
                                                                className={`flex-1 min-w-[60px] py-2 rounded-lg text-xs font-bold border transition-all ${editingAccount.type === type
                                                                    ? (TYPE_COLORS[type]?.active || '')
                                                                    : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}
                                                            >
                                                                {type}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {/* Capital — all types */}
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Account Capital ($)</label>
                                                        <CurrencyInput
                                                            placeholder="e.g. 100000"
                                                            value={editingAccount.capital || ''}
                                                            onChange={(val) => setEditingAccount(prev => ({ ...prev, capital: val }))}
                                                            className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white text-sm"
                                                        />
                                                    </div>
                                                    {/* Evaluation / Funded specific fields */}
                                                    {(editingAccount.type === 'Evaluation' || editingAccount.type === 'Funded') && (
                                                        <>
                                                            <div>
                                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Prop Firm</label>
                                                                <PropFirmPicker
                                                                    selectedFirm={editingAccount.prop_firm}
                                                                    onSelect={(firm) => setEditingAccount(prev => ({ ...prev, prop_firm: firm }))}
                                                                    isOpen={showEditPropFirmPicker}
                                                                    setOpen={setShowEditPropFirmPicker}
                                                                />
                                                            </div>
                                                            <div className={`grid ${editingAccount.type === 'Evaluation' ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                                                                {editingAccount.type === 'Evaluation' && (
                                                                    <div>
                                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1 block">Profit Target ($)</label>
                                                                        <CurrencyInput
                                                                            placeholder="e.g. 10000"
                                                                            value={editingAccount.profit_target || ''}
                                                                            onChange={(val) => setEditingAccount(prev => ({ ...prev, profit_target: val }))}
                                                                            className="w-full bg-white dark:bg-background-dark border border-emerald-500/40 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-emerald-300 text-sm"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1 block">Max Loss ($)</label>
                                                                    <CurrencyInput
                                                                        placeholder="e.g. 5000"
                                                                        value={editingAccount.max_loss || ''}
                                                                        onChange={(val) => setEditingAccount(prev => ({ ...prev, max_loss: val }))}
                                                                        className="w-full bg-white dark:bg-background-dark border border-red-500/40 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/50 dark:text-red-300 text-sm"
                                                                    />
                                                                </div>
                                                            </div>
                                                            {editingAccount.type === 'Funded' && (
                                                                <div>
                                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 block">Payout Goal ($) <span className="text-[8px] opacity-60">(Optional)</span></label>
                                                                    <CurrencyInput
                                                                        placeholder="e.g. 5000"
                                                                        value={editingAccount.payout_goal || ''}
                                                                        onChange={(val) => setEditingAccount(prev => ({ ...prev, payout_goal: val }))}
                                                                        className="w-full bg-white dark:bg-background-dark border border-primary/40 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-primary-light text-sm"
                                                                    />
                                                                    <p className="text-[10px] text-primary/60 mt-1">Target amount for your next payout</p>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 block">Consistency Rule (%)</label>
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max="100"
                                                                        placeholder="e.g. 50"
                                                                        value={editingAccount.consistency_rule || ''}
                                                                        onChange={(e) => setEditingAccount(prev => ({ ...prev, consistency_rule: e.target.value }))}
                                                                        className="w-full bg-white dark:bg-background-dark border border-amber-500/40 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-amber-300 text-sm"
                                                                    />
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/60 text-sm font-bold">%</span>
                                                                </div>
                                                                <p className="text-[10px] text-amber-500/60 mt-1">Max % of profit target allowed in a single day</p>
                                                            </div>
                                                        </>
                                                    )}
                                                    <div className="flex gap-2 pt-1">
                                                        <button
                                                            type="button"
                                                            disabled={!isEditAccountReady}
                                                            onClick={async () => {
                                                                if (!isEditAccountReady) return;
                                                                await updateAccount(editingAccount);
                                                                setEditingAccount(null);
                                                                setShowEditPropFirmPicker(false);
                                                            }}
                                                            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${isEditAccountReady
                                                                ? 'bg-primary text-white hover:bg-primary/90 active:scale-95 shadow-lg shadow-primary/20'
                                                                : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                                                                }`}
                                                        >
                                                            Save
                                                        </button>
                                                        <button type="button" onClick={() => { setEditingAccount(null); setShowEditPropFirmPicker(false); }} className="px-4 py-2 text-slate-400 text-sm hover:text-slate-200 transition-colors">Cancel</button>
                                                    </div>
                                                </SmartPortal>
                                            )}

                                            {!isAddingAccount ? (
                                                <AccountPicker
                                                    selectedId={formData.account_id}
                                                    onSelect={(id) => setFormData(prev => ({ ...prev, account_id: id }))}
                                                    isOpen={showAccountPicker}
                                                    setOpen={setShowAccountPicker}
                                                    onAddAccount={() => setIsAddingAccount(true)}
                                                    accounts={accounts}
                                                    setHoveredAccount={setHoveredAccount}
                                                    setAccountContextMenu={setAccountContextMenu}
                                                />
                                            ) : (
                                                /* Add Account Form */
                                                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="material-symbols-outlined text-[16px] text-emerald-400">add_circle</span>
                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">New Account</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Account name..."
                                                        value={newAccountName}
                                                        onChange={(e) => setNewAccountName(e.target.value)}
                                                        className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white text-sm"
                                                        autoFocus
                                                    />
                                                    <div className="flex flex-wrap gap-2">
                                                        {ACCOUNT_TYPES.map(type => (
                                                            <button
                                                                key={type}
                                                                type="button"
                                                                onClick={() => setNewAccountType(type)}
                                                                className={`flex-1 min-w-[60px] py-2 rounded-lg text-xs font-bold border transition-all ${newAccountType === type
                                                                    ? (TYPE_COLORS[type]?.active || '')
                                                                    : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}
                                                            >
                                                                {type}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {/* Capital — all types */}
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Account Capital ($)</label>
                                                        <CurrencyInput
                                                            placeholder="e.g. 100000"
                                                            value={newAccountCapital}
                                                            onChange={(val) => setNewAccountCapital(val)}
                                                            className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white text-sm"
                                                        />
                                                    </div>
                                                    {/* Evaluation / Funded specific fields */}
                                                    {(newAccountType === 'Evaluation' || newAccountType === 'Funded') && (
                                                        <>
                                                            <div>
                                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Prop Firm</label>
                                                                <PropFirmPicker
                                                                    selectedFirm={newAccountPropFirm}
                                                                    onSelect={(firm) => setNewAccountPropFirm(firm)}
                                                                    isOpen={showPropFirmPicker}
                                                                    setOpen={setShowPropFirmPicker}
                                                                />
                                                            </div>
                                                            <div className={`grid ${newAccountType === 'Evaluation' ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                                                                {newAccountType === 'Evaluation' && (
                                                                    <div>
                                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1 block">Profit Target ($)</label>
                                                                        <CurrencyInput
                                                                            placeholder="e.g. 10000"
                                                                            value={newAccountProfitTarget}
                                                                            onChange={(val) => setNewAccountProfitTarget(val)}
                                                                            className="w-full bg-white dark:bg-background-dark border border-emerald-500/40 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-emerald-300 text-sm"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1 block">Max Loss ($)</label>
                                                                    <CurrencyInput
                                                                        placeholder="e.g. 5000"
                                                                        value={newAccountMaxLoss}
                                                                        onChange={(val) => setNewAccountMaxLoss(val)}
                                                                        className="w-full bg-white dark:bg-background-dark border border-red-500/40 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/50 dark:text-red-300 text-sm"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 block">Consistency Rule (%)</label>
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max="100"
                                                                        placeholder="e.g. 50"
                                                                        value={newAccountConsistency}
                                                                        onChange={(e) => setNewAccountConsistency(e.target.value)}
                                                                        className="w-full bg-white dark:bg-background-dark border border-amber-500/40 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-amber-300 text-sm"
                                                                    />
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/60 text-sm font-bold">%</span>
                                                                </div>
                                                                <p className="text-[10px] text-amber-500/60 mt-1">Max % of profit target allowed in a single day</p>
                                                            </div>
                                                        </>
                                                    )}
                                                    <div className="flex gap-2 pt-1">
                                                        <button
                                                            type="button"
                                                            onClick={handleAccountSubmit}
                                                            disabled={!isNewAccountReady}
                                                            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${isNewAccountReady
                                                                ? 'bg-primary text-white hover:bg-primary/90 active:scale-95 shadow-lg shadow-primary/20'
                                                                : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                                                                }`}
                                                        >
                                                            Create
                                                        </button>
                                                        <button type="button" onClick={() => setIsAddingAccount(false)} className="px-4 py-2 text-slate-400 text-sm hover:text-slate-200 transition-colors">Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-5">
                                            {/* Row 1: Date & Session */}
                                            <div className="grid grid-cols-2 gap-5">
                                                <div className="relative" ref={inputRefs.date}>
                                                    <ModernDatePicker
                                                        label="Date"
                                                        value={formData.date}
                                                        onChange={(val) => setFormData(prev => ({ ...prev, date: val }))}
                                                        error={formErrors.date}
                                                    />
                                                    <ValidationTooltip message={formErrors.date} isVisible={!!formErrors.date} anchorRef={inputRefs.date} />
                                                </div>
                                                <div className="relative">
                                                    <label className={labelClass}>Session</label>
                                                    <PillInput
                                                        value={formData.trade_session}
                                                        onChange={(val) => setFormData(prev => ({ ...prev, trade_session: val }))}
                                                        suggestions={sessionSuggestions}
                                                        placeholder="e.g. London"
                                                        category="session"
                                                        defaultColor="sky"
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 2: Symbol & Model */}
                                            <div className="grid grid-cols-2 gap-5">
                                                <div className="relative" ref={inputRefs.symbol}>
                                                    <label className={labelClass}>Symbol</label>
                                                    <PillInput
                                                        value={formData.symbol}
                                                        onChange={(val) => {
                                                            setFormData(prev => ({ ...prev, symbol: val }));
                                                            if (formErrors.symbol) setFormErrors(prev => ({ ...prev, symbol: null }));
                                                        }}
                                                        suggestions={symbolSuggestions}
                                                        placeholder="e.g. EUR/USD, NAS100..."
                                                        defaultColor="sky"
                                                        category="symbol"
                                                        style={{ textTransform: 'uppercase' }}
                                                    />
                                                    <ValidationTooltip message={formErrors.symbol} isVisible={!!formErrors.symbol} anchorRef={inputRefs.symbol} />
                                                </div>

                                                <div>
                                                    <label className={labelClass}>Model / Setup</label>
                                                    <PillInput
                                                        value={formData.model}
                                                        onChange={(val) => setFormData(prev => ({ ...prev, model: val }))}
                                                        suggestions={modelSuggestions}
                                                        placeholder="e.g. Silver Bullet, Breaker Block..."
                                                        defaultColor="violet"
                                                        category="model"
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 3: Bias & Position */}
                                            <div className="grid grid-cols-2 gap-5">
                                                <div>
                                                    <label className={labelClass}>Bias</label>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, bias: 'Bullish' }))}
                                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border transition-all ${formData.bias === 'Bullish'
                                                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                                                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-500/30 hover:text-emerald-400'}`}
                                                        >
                                                            <span className={`w-2 h-2 rounded-full ${formData.bias === 'Bullish' ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                                                            Bullish
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, bias: 'Bearish' }))}
                                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border transition-all ${formData.bias === 'Bearish'
                                                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-lg shadow-rose-500/10'
                                                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-rose-500/30 hover:text-rose-400'}`}
                                                        >
                                                            <span className={`w-2 h-2 rounded-full ${formData.bias === 'Bearish' ? 'bg-rose-400' : 'bg-slate-400'}`}></span>
                                                            Bearish
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className={labelClass}>Position</label>
                                                    <div className="flex bg-slate-50 dark:bg-background-dark rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, side: 'LONG' }))}
                                                            className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${formData.side === 'LONG' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                                                        >
                                                            LONG
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, side: 'SHORT' }))}
                                                            className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${formData.side === 'SHORT' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                                                        >
                                                            SHORT
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Row 4: Net P&L */}
                                            <div className="grid grid-cols-2 gap-5">
                                                <div className="relative" ref={inputRefs.pnl}>
                                                    <label className={labelClass}>Net P&L ($)</label>
                                                    <CurrencyInput
                                                        name="pnl"
                                                        required
                                                        placeholder="0.00"
                                                        value={formData.pnl}
                                                        onChange={(e) => {
                                                            handleChange(e);
                                                            if (formErrors.pnl) setFormErrors(prev => ({ ...prev, pnl: null }));
                                                        }}
                                                        className={`${inputClass} !font-bold ${formErrors.pnl ? 'border-rose-500/50 bg-rose-500/5' : ''} ${parseFloat(formData.pnl) > 0 ? '!text-emerald-500' : parseFloat(formData.pnl) < 0 ? '!text-rose-500' : formData.pnl !== '' ? '!text-amber-500' : ''}`}
                                                    />
                                                    <ValidationTooltip message={formErrors.pnl} isVisible={!!formErrors.pnl} anchorRef={inputRefs.pnl} />
                                                    {consistencyWarning && (
                                                        <div className={`mt-2 p-3 rounded-xl border flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-300 ${consistencyWarning.severity === 'danger' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                                                            <span className="material-symbols-outlined text-[18px] mt-0.5">warning</span>
                                                            <span className="text-[11px] font-bold leading-tight">{consistencyWarning.message}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {activeTab === 'execution' && (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <label className={labelClass}>Order Type</label>
                                                <div className="flex gap-2">
                                                    {['Market', 'Limit', 'Stop'].map(type => (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, order_type: type }))}
                                                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${formData.order_type === type
                                                                ? 'bg-primary/10 text-primary border-primary/30'
                                                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary/20'}`}
                                                        >
                                                            {type}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Entry Signal</label>
                                                <PillInput
                                                    value={formData.entry_signal}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, entry_signal: val }))}
                                                    suggestions={entrySignalSuggestions}
                                                    placeholder="e.g. FVG Tap, OB Reaction..."
                                                    defaultColor="amber"
                                                    category="entry_signal"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <label className={labelClass}>SL Pips</label>
                                                <input type="number" name="sl_pips" step="0.1" placeholder="0.0" value={formData.sl_pips} onChange={handleChange} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>% Risk</label>
                                                <input type="number" name="risk_percent" step="0.1" placeholder="0.0" value={formData.risk_percent} onChange={handleChange} className={inputClass} />
                                            </div>
                                        </div>

                                        {/* Confluences — Multi Pill */}
                                        <div>
                                            <label className={labelClass}>Confluences</label>
                                            <PillInput
                                                value={formData.confluences}
                                                onChange={(val) => setFormData(prev => ({ ...prev, confluences: val }))}
                                                suggestions={confluenceSuggestions}
                                                placeholder="Add confluences..."
                                                defaultColor="primary"
                                                category="confluences"
                                                allowMultiple={true}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'psychology' && (
                                    <div className="space-y-6">
                                        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                            {/* Psychology Block */}
                                            <div className="border-b border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                                                    <span className="material-symbols-outlined text-[16px] text-sky-400">psychology</span>
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">State of Mind</span>
                                                </div>
                                                <textarea
                                                    name="psychology"
                                                    rows="5"
                                                    placeholder="How were you feeling before and during the trade? Were you calm, anxious, overconfident?"
                                                    value={formData.psychology}
                                                    onChange={handleChange}
                                                    className="w-full bg-transparent px-5 pb-4 focus:outline-none dark:text-white text-sm leading-relaxed resize-none placeholder-slate-400/60"
                                                ></textarea>
                                            </div>

                                            {/* Mistakes Block */}
                                            <div>
                                                <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                                                    <span className="material-symbols-outlined text-[16px] text-rose-400">error</span>
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Mistakes</span>
                                                </div>
                                                <textarea
                                                    name="mistakes"
                                                    rows="4"
                                                    placeholder="What could you have done better? Any rule breaks?"
                                                    value={formData.mistakes}
                                                    onChange={handleChange}
                                                    className="w-full bg-transparent px-5 pb-4 focus:outline-none dark:text-white text-sm leading-relaxed resize-none placeholder-slate-400/60"
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'journal' && (
                                    <div className="space-y-6">
                                        {/* Notion-style journal blocks */}
                                        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                            {/* Bias Block */}
                                            <div className="border-b border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                                                    <span className="material-symbols-outlined text-[16px] text-emerald-400">trending_up</span>
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Bias</span>
                                                </div>
                                                <textarea
                                                    name="comment_bias"
                                                    rows="3"
                                                    placeholder="Was your bias correct? What confirmed or invalidated it?"
                                                    value={formData.comment_bias}
                                                    onChange={handleChange}
                                                    className="w-full bg-transparent px-5 pb-4 focus:outline-none dark:text-white text-sm leading-relaxed resize-none placeholder-slate-400/60"
                                                ></textarea>
                                            </div>

                                            {/* Execution Block */}
                                            <div className="border-b border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                                                    <span className="material-symbols-outlined text-[16px] text-primary">bolt</span>
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Execution</span>
                                                </div>
                                                <textarea
                                                    name="comment_execution"
                                                    rows="3"
                                                    placeholder="How was the entry timing? Did you follow your plan?"
                                                    value={formData.comment_execution}
                                                    onChange={handleChange}
                                                    className="w-full bg-transparent px-5 pb-4 focus:outline-none dark:text-white text-sm leading-relaxed resize-none placeholder-slate-400/60"
                                                ></textarea>
                                            </div>

                                            {/* Problems Block */}
                                            <div className="border-b border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                                                    <span className="material-symbols-outlined text-[16px] text-amber-400">warning</span>
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Problems</span>
                                                </div>
                                                <textarea
                                                    name="comment_problems"
                                                    rows="3"
                                                    placeholder="Any issues with execution, psychology, or market conditions?"
                                                    value={formData.comment_problems}
                                                    onChange={handleChange}
                                                    className="w-full bg-transparent px-5 pb-4 focus:outline-none dark:text-white text-sm leading-relaxed resize-none placeholder-slate-400/60"
                                                ></textarea>
                                            </div>

                                            {/* Fazit Block */}
                                            <div>
                                                <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                                                    <span className="material-symbols-outlined text-[16px] text-violet-400">summarize</span>
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fazit</span>
                                                </div>
                                                <textarea
                                                    name="comment_fazit"
                                                    rows="4"
                                                    placeholder="Final takeaway. What did you learn from this trade?"
                                                    value={formData.comment_fazit}
                                                    onChange={handleChange}
                                                    className="w-full bg-transparent px-5 pb-4 focus:outline-none dark:text-white text-sm leading-relaxed resize-none placeholder-slate-400/60"
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'attachments' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 gap-8">
                                            {/* Category 1: Execution */}
                                            <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
                                                        <h3 className="text-sm font-bold dark:text-white uppercase tracking-wider">Execution (1m - 5m)</h3>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase">Entry Precision</span>
                                                </div>
                                                <ImageSection
                                                    value={formData.images_execution}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, images_execution: val }))}
                                                />
                                            </div>

                                            {/* Category 2: Condition */}
                                            <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-emerald-400 text-[20px]">analytics</span>
                                                        <h3 className="text-sm font-bold dark:text-white uppercase tracking-wider">Condition (5m, 15m)</h3>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase">Trend & Levels</span>
                                                </div>
                                                <ImageSection
                                                    value={formData.images_condition}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, images_condition: val }))}
                                                />
                                            </div>

                                            {/* Category 3: Narrative */}
                                            <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-amber-400 text-[20px]">auto_stories</span>
                                                        <h3 className="text-sm font-bold dark:text-white uppercase tracking-wider">Narrative (1h, 4h, Daily)</h3>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase">Higher Timeframe Bias</span>
                                                </div>
                                                <ImageSection
                                                    value={formData.images_narrative}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, images_narrative: val }))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Footer */}
                        {!showCelebration && (
                            <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-white/[0.02] rounded-b-2xl">
                                <button
                                    type="submit"
                                    form="tradeForm"
                                    disabled={!isTradeReady}
                                    className={`w-full font-bold py-3.5 rounded-xl transition-all transform ${isTradeReady
                                        ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-[0.99]'
                                        : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                                        }`}
                                >
                                    {tradeToEdit ? 'Update Trade' : 'Save Trade'}
                                </button>
                            </div>
                        )}
                    </div >
                </div >,
                document.body
            )
            }

            {
                celebrationData && showCelebration && (
                    <CelebrationModal
                        data={celebrationData}
                        onClose={() => {
                            setShowCelebration(false);
                            setCelebrationData(null);

                            // Chain to next modal if data exists
                            if (breachData) {
                                setShowBreach(true);
                            } else if (payoutGoalData) {
                                setShowPayoutGoal(true);
                            } else {
                                onClose();
                                setActiveTab('general');
                            }
                        }}
                    />
                )
            }

            {
                breachData && showBreach && (
                    <BreachModal
                        data={breachData}
                        onClose={() => {
                            setShowBreach(false);
                            setBreachData(null);

                            // Chain to next modal if data exists
                            if (payoutGoalData) {
                                setShowPayoutGoal(true);
                            } else {
                                onClose();
                                setActiveTab('general');
                            }
                        }}
                    />
                )
            }

            {
                payoutGoalData && showPayoutGoal && (
                    <PayoutGoalModal
                        data={payoutGoalData}
                        updateAccount={updateAccount}
                        onClose={() => {
                            setShowPayoutGoal(false);
                            setPayoutGoalData(null);
                            onClose();
                            setActiveTab('general');
                        }}
                    />
                )
            }
        </>
    );
};

