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
    const { addTrade, updateTrade, updateAccount, deleteAccount, accounts, addAccount, trades, getAccountStats, copyGroups, appSettings, userProfile } = useData();
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
        sentiment_pre: '',
        sentiment_post: '',
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
    const isSubmitting = useRef(false);
    const hasSubmitted = useRef(false);

    // psychology sentiments
    const PRE_TRADE_EMOTIONS = [
        { label: 'Disciplined', icon: '🧘', id: 'disciplined' },
        { label: 'Focused', icon: '🎯', id: 'focused' },
        { label: 'Nervous', icon: '😨', id: 'nervous' },
        { label: 'Aggressive', icon: '😤', id: 'aggressive' },
    ];

    const POST_TRADE_EMOTIONS = [
        { label: 'Gratified', icon: '😊', id: 'gratified' },
        { label: 'FOMO', icon: '😤', id: 'fomo' },
        { label: 'Revenge', icon: '🎢', id: 'revenge' },
        { label: 'Regret', icon: '😔', id: 'regret' },
    ];


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
        if (tradeToEdit && tradeToEdit.id) {
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
                sentiment_pre: tradeToEdit.sentiment_pre || '',
                sentiment_post: tradeToEdit.sentiment_post || '',
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
            hasSubmitted.current = false;
            // Reset for new trade
            setFormData(prev => ({
                ...prev,
                account_id: tradeToEdit?.account_id || prev.account_id || (accounts.length > 0 ? accounts[0].id : ''),
                date: tradeToEdit?.date || new Date().toISOString().split('T')[0],
                symbol: tradeToEdit?.symbol || '',
                model: tradeToEdit?.model || '',
                bias: tradeToEdit?.bias || '',
                side: tradeToEdit?.side || 'LONG',
                confluences: tradeToEdit?.confluences || '',
                entry_signal: tradeToEdit?.entry_signal || '',
                order_type: tradeToEdit?.order_type || 'Market',
                sl_pips: tradeToEdit?.sl_pips || '',
                risk_percent: tradeToEdit?.risk_percent || appSettings.defaultRiskPerc || '',
                pnl: tradeToEdit?.pnl || '',
                psychology: tradeToEdit?.psychology || '',
                mistakes: tradeToEdit?.mistakes || '',
                sentiment_pre: tradeToEdit?.sentiment_pre || '',
                sentiment_post: tradeToEdit?.sentiment_post || '',
                comment_bias: tradeToEdit?.comment_bias || '',
                comment_execution: tradeToEdit?.comment_execution || '',
                comment_problems: tradeToEdit?.comment_problems || '',
                comment_fazit: tradeToEdit?.comment_fazit || '',
                image_paths: tradeToEdit?.image_paths || '',
                images_execution: tradeToEdit?.images_execution || '',
                images_condition: tradeToEdit?.images_condition || '',
                images_narrative: tradeToEdit?.images_narrative || '',
                trade_session: tradeToEdit?.trade_session || ''
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
            // Instant Commit Logic: Save if enabled, valid, and not editing
            if (appSettings.autoSaveTrades && isTradeReady && !tradeToEdit && !hasSubmitted.current) {
                handleSubmit({ preventDefault: () => { } });
            }
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
        if (e && e.preventDefault) e.preventDefault();

        if (isSubmitting.current) return;
        isSubmitting.current = true;

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
        if (tradeToEdit && tradeToEdit.id) {
            success = await updateTrade(tradeData);
            if (success) showSuccess("Trade updated successfully");
        } else {
            success = await addTrade(tradeData);
            if (success) {
                showSuccess("Trade saved successfully");
                hasSubmitted.current = true; // Mark early to prevent auto-save double trigger!

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
                                // Inherit all parameters from leader via spread in followerTrade

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
                hasSubmitted.current = true;
                onClose();
                setActiveTab('general');
            } else if (!success) {
                showError("Fehler beim Speichern des Trades");
            }
        }

        isSubmitting.current = false;
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

    const inputClass = "w-full bg-slate-900/40 dark:bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-white text-sm placeholder:text-slate-700 shadow-inner relative z-10";
    const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 px-1";

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
                    className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isAnimating ? 'bg-slate-950/80 backdrop-blur-xl opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`}
                    onClick={onClose}
                >
                    <div
                        className={`bg-slate-900/40 backdrop-blur-[45px] rounded-[3.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] transform relative overflow-hidden ${isAnimating ? 'scale-100 translate-y-0 opacity-100 blur-0' : 'scale-[0.9] translate-y-20 opacity-0 blur-2xl'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Glass Reflection Highlight */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                        {/* Header - Tactical Execution */}
                        <div className="flex justify-between items-center px-12 pt-12 pb-8 relative overflow-hidden">
                            <div className="absolute inset-0 bg-primary/5 opacity-30 blur-[60px] -z-10" />
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
                                    <span className="material-symbols-outlined text-primary text-[36px] drop-shadow-glow">
                                        {tradeToEdit ? 'edit_square' : 'add_notes'}
                                    </span>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">{tradeToEdit ? 'Edit Execution' : 'Precision Entry'}</h2>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{tradeToEdit ? 'Updating Operational Parameters' : 'Deploying New Performance Data'}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 transition-all group/close border border-white/10 active:scale-90"
                            >
                                <span className="material-symbols-outlined text-[28px] group-hover/close:rotate-180 transition-transform duration-500">close</span>
                            </button>
                        </div>

                        {/* Tabs - Command Navigation */}
                        <div className="flex px-12 gap-1 border-b border-white/5 pb-0 overflow-x-auto no-scrollbar bg-white/[0.02]">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] transition-all relative
                                        ${activeTab === tab.id
                                            ? 'text-primary'
                                            : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    <span className={`material-symbols-outlined text-[18px] transition-all ${activeTab === tab.id ? 'drop-shadow-glow scale-110' : ''}`}>{tab.icon}</span>
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
                                    )}
                                </button>
                            ))}
                        </div>

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
                                                <div className="group/picker relative">
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
                                                    {/* Selection Glow */}
                                                    <div className="absolute inset-0 bg-primary/5 blur-xl -z-10 opacity-0 group-hover/picker:opacity-100 transition-opacity duration-500" />
                                                </div>
                                            ) : (
                                                /* Add Account Form - Tactical Unit Initialization */
                                                <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/40 backdrop-blur-md p-8 space-y-6 relative overflow-hidden group/newacc animate-in zoom-in-95 duration-500 shadow-inner">
                                                    {/* Glass Reflection Highlight */}
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                                                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                                                        <span className="material-symbols-outlined text-[80px]">add_task</span>
                                                    </div>

                                                    <div className="flex items-center gap-3 mb-2 relative z-10">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-[20px] text-emerald-400">add_circle</span>
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Initialize New Unit</span>
                                                    </div>

                                                    <input
                                                        type="text"
                                                        placeholder="Unit identifier (e.g. Master Funded)..."
                                                        value={newAccountName}
                                                        onChange={(e) => setNewAccountName(e.target.value)}
                                                        className={inputClass}
                                                        autoFocus
                                                    />

                                                    <div className="flex flex-wrap gap-2.5 relative z-10">
                                                        {ACCOUNT_TYPES.map(type => (
                                                            <button
                                                                key={type}
                                                                type="button"
                                                                onClick={() => setNewAccountType(type)}
                                                                className={`flex-1 min-w-[80px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 transform active:scale-[0.98] ${newAccountType === type
                                                                    ? (TYPE_COLORS[type]?.active || '')
                                                                    : 'bg-white/[0.03] text-slate-500 border-white/10 hover:border-white/20 hover:text-slate-300'}`}
                                                            >
                                                                {type}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                                        <div>
                                                            <label className={labelClass}>Initial Capital (USD)</label>
                                                            <CurrencyInput
                                                                placeholder="e.g. 100000"
                                                                value={newAccountCapital}
                                                                onChange={(val) => setNewAccountCapital(val)}
                                                                className={inputClass}
                                                            />
                                                        </div>

                                                        {(newAccountType === 'Evaluation' || newAccountType === 'Funded') && (
                                                            <div>
                                                                <label className={labelClass}>Operational Firm</label>
                                                                <PropFirmPicker
                                                                    selectedFirm={newAccountPropFirm}
                                                                    onSelect={(firm) => setNewAccountPropFirm(firm)}
                                                                    isOpen={showPropFirmPicker}
                                                                    setOpen={setShowPropFirmPicker}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {(newAccountType === 'Evaluation' || newAccountType === 'Funded') && (
                                                        <div className="grid grid-cols-2 gap-6 p-6 bg-slate-900/40 border border-white/10 rounded-2xl relative z-10 shadow-inner">
                                                            {newAccountType === 'Evaluation' && (
                                                                <div>
                                                                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400/70 mb-2 block">Capture Target</label>
                                                                    <CurrencyInput
                                                                        placeholder="Target"
                                                                        value={newAccountProfitTarget}
                                                                        onChange={(val) => setNewAccountProfitTarget(val)}
                                                                        className={`${inputClass} !border-emerald-500/20 !bg-emerald-500/5 !text-emerald-400`}
                                                                    />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-rose-400/70 mb-2 block">Terminal Breach</label>
                                                                <CurrencyInput
                                                                    placeholder="Max Loss"
                                                                    value={newAccountMaxLoss}
                                                                    onChange={(val) => setNewAccountMaxLoss(val)}
                                                                    className={`${inputClass} !border-rose-500/20 !bg-rose-500/5 !text-rose-400`}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {newAccountType === 'Evaluation' && (
                                                        <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl relative z-10">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-amber-500/70 mb-2 block">Consistency Protocol (%)</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="100"
                                                                    placeholder="50"
                                                                    value={newAccountConsistency}
                                                                    onChange={(e) => setNewAccountConsistency(e.target.value)}
                                                                    className={`${inputClass} !border-amber-500/20 !bg-amber-500/5 !text-amber-400 pr-12`}
                                                                />
                                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-amber-500/50 text-xs font-black">%</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex gap-4 pt-4 relative z-10">
                                                        <button
                                                            type="button"
                                                            onClick={handleAccountSubmit}
                                                            disabled={!isNewAccountReady}
                                                            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 transform active:scale-[0.98] ${isNewAccountReady
                                                                ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-light'
                                                                : 'bg-white/5 border border-white/10 text-slate-600'
                                                                }`}
                                                        >
                                                            Deploy Unit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsAddingAccount(false)}
                                                            className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-5">
                                            {/* Row 1: Date & Session */}
                                            <div className="grid grid-cols-2 gap-5">
                                                <div className="relative" ref={inputRefs.date}>
                                                    <ModernDatePicker
                                                        label="Deployment Date"
                                                        value={formData.date}
                                                        onChange={(val) => setFormData(prev => ({ ...prev, date: val }))}
                                                        error={formErrors.date}
                                                    />
                                                    <ValidationTooltip message={formErrors.date} isVisible={!!formErrors.date} anchorRef={inputRefs.date} />
                                                </div>
                                            </div>

                                            {/* Row 2: Symbol & Model */}
                                            <div className="grid grid-cols-2 gap-5">
                                                <div className="relative" ref={inputRefs.symbol}>
                                                    <label className={labelClass}>Asset Identifier</label>
                                                    <div className="relative group/pill">
                                                        <PillInput
                                                            value={formData.symbol}
                                                            onChange={(val) => {
                                                                setFormData(prev => ({ ...prev, symbol: val }));
                                                                if (formErrors.symbol) setFormErrors(prev => ({ ...prev, symbol: null }));
                                                            }}
                                                            suggestions={symbolSuggestions}
                                                            placeholder="e.g. EUR/USD..."
                                                            defaultColor="sky"
                                                            category="symbol"
                                                            style={{ textTransform: 'uppercase' }}
                                                        />
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none group-focus-within/pill:opacity-50 transition-opacity">
                                                            <span className="material-symbols-outlined text-sm">currency_exchange</span>
                                                        </div>
                                                    </div>
                                                    <ValidationTooltip message={formErrors.symbol} isVisible={!!formErrors.symbol} anchorRef={inputRefs.symbol} />
                                                </div>

                                                <div>
                                                    <label className={labelClass}>Tactical Model</label>
                                                    <div className="relative group/pill">
                                                        <PillInput
                                                            value={formData.model}
                                                            onChange={(val) => setFormData(prev => ({ ...prev, model: val }))}
                                                            suggestions={modelSuggestions}
                                                            placeholder="e.g. Silver Bullet..."
                                                            defaultColor="violet"
                                                            category="model"
                                                        />
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none group-focus-within/pill:opacity-50 transition-opacity">
                                                            <span className="material-symbols-outlined text-sm">architecture</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Row 3: Bias & Position */}
                                            <div className="grid grid-cols-2 gap-5">
                                                <div>
                                                    <label className={labelClass}>Operational Bias</label>
                                                    <div className="flex gap-2.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, bias: 'Bullish' }))}
                                                            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border transition-all duration-300 transform active:scale-[0.98] ${formData.bias === 'Bullish'
                                                                ? 'bg-emerald-500/20 text-emerald-400 border-white/20 shadow-lg shadow-emerald-500/10'
                                                                : 'bg-slate-900/40 border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}
                                                        >
                                                            <span className={`material-symbols-outlined text-[20px] ${formData.bias === 'Bullish' ? 'drop-shadow-glow' : ''}`}>trending_up</span>
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Bullish</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, bias: 'Bearish' }))}
                                                            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border transition-all duration-300 transform active:scale-[0.98] ${formData.bias === 'Bearish'
                                                                ? 'bg-rose-500/20 text-rose-400 border-white/20 shadow-lg shadow-rose-500/10'
                                                                : 'bg-slate-900/40 border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}
                                                        >
                                                            <span className={`material-symbols-outlined text-[20px] ${formData.bias === 'Bearish' ? 'drop-shadow-glow' : ''}`}>trending_down</span>
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Bearish</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className={labelClass}>Entry Vector</label>
                                                    <div className="flex bg-slate-900/40 rounded-2xl p-1.5 border border-white/10 h-[62px] shadow-inner relative z-10 overflow-hidden">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, side: 'LONG' }))}
                                                            className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all transform active:scale-[0.98] ${formData.side === 'LONG' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                                        >
                                                            LONG UNIT
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, side: 'SHORT' }))}
                                                            className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all transform active:scale-[0.98] ${formData.side === 'SHORT' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                                        >
                                                            SHORT UNIT
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Row 4: Net P&L */}
                                            <div className="grid grid-cols-2 gap-5">
                                                <div className="relative" ref={inputRefs.pnl}>
                                                    <label className={labelClass}>Net Performance (USD)</label>
                                                    <div className="relative group/pnl">
                                                        <CurrencyInput
                                                            name="pnl"
                                                            required
                                                            placeholder="0.00"
                                                            value={formData.pnl}
                                                            onChange={(e) => {
                                                                handleChange(e);
                                                                if (formErrors.pnl) setFormErrors(prev => ({ ...prev, pnl: null }));
                                                            }}
                                                            className={`${inputClass} !font-black !text-xl tracking-tighter ${formErrors.pnl ? 'border-rose-500/50 ring-4 ring-rose-500/10' : ''} ${parseFloat(formData.pnl) > 0 ? '!text-emerald-400 drop-shadow-glow' : parseFloat(formData.pnl) < 0 ? '!text-rose-400 drop-shadow-glow' : formData.pnl !== '' ? '!text-amber-400' : ''}`}
                                                        />
                                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 uppercase tracking-widest pointer-events-none group-hover/pnl:text-slate-500 transition-colors">Yield Output</div>
                                                    </div>
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
                                                <label className={labelClass}>Transmission Type</label>
                                                <div className="flex gap-2.5 bg-slate-900/40 p-1.5 rounded-2xl border border-white/10 h-[62px] shadow-inner relative z-10 overflow-hidden">
                                                    {['Market', 'Limit', 'Stop'].map(type => (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, order_type: type }))}
                                                            className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 transform active:scale-[0.98] ${formData.order_type === type
                                                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/10'}`}
                                                        >
                                                            {type}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Execution Signal</label>
                                                <div className="relative group/pill min-h-[62px] flex items-center">
                                                    <PillInput
                                                        value={formData.entry_signal}
                                                        onChange={(val) => setFormData(prev => ({ ...prev, entry_signal: val }))}
                                                        suggestions={entrySignalSuggestions}
                                                        placeholder="e.g. FVG Tap..."
                                                        defaultColor="amber"
                                                        category="entry_signal"
                                                        className="w-full"
                                                    />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none group-focus-within/pill:opacity-50 transition-opacity">
                                                        <span className="material-symbols-outlined text-sm">sensors</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <label className={labelClass}>SL Vector (Pips)</label>
                                                <div className="relative group/input">
                                                    <input type="number" name="sl_pips" step="0.1" placeholder="0.0" value={formData.sl_pips} onChange={handleChange} className={inputClass} />
                                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 uppercase tracking-widest pointer-events-none group-focus-within/input:text-slate-500 transition-colors">Distance</div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Operational Risk (%)</label>
                                                <div className="relative group/input">
                                                    <input type="number" name="risk_percent" step="0.1" placeholder="0.0" value={formData.risk_percent} onChange={handleChange} className={inputClass} />
                                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 uppercase tracking-widest pointer-events-none group-focus-within/input:text-slate-500 transition-colors">Exposure</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelClass}>Market Session</label>
                                            <div className="flex gap-2.5 bg-slate-900/40 p-1.5 rounded-2xl border border-white/10 h-[62px] shadow-inner relative z-10 overflow-hidden">
                                                {['London', 'New York', 'Asia'].map(session => (
                                                    <button
                                                        key={session}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, trade_session: session }))}
                                                        className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2 ${formData.trade_session === session
                                                            ? session === 'Asia' ? 'bg-rose-500/20 text-rose-400 border-white/20 shadow-lg shadow-rose-500/10'
                                                                : session === 'London' ? 'bg-sky-500/20 text-sky-400 border-white/20 shadow-lg shadow-sky-500/10'
                                                                    : 'bg-emerald-500/20 text-emerald-400 border-white/20 shadow-lg shadow-emerald-500/10'
                                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/10'}`}
                                                    >
                                                        <span className={`material-symbols-outlined text-[16px] ${formData.trade_session === session ? 'drop-shadow-glow' : ''}`}>
                                                            {session === 'London' ? 'schedule' : session === 'New York' ? 'monitoring' : 'nights_stay'}
                                                        </span>
                                                        {session}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelClass}>Strategic Confluences</label>
                                            <div className="relative group/pill flex items-center">
                                                <PillInput
                                                    value={formData.confluences}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, confluences: val }))}
                                                    suggestions={confluenceSuggestions}
                                                    placeholder="Add confluences..."
                                                    defaultColor="primary"
                                                    category="confluences"
                                                    allowMultiple={true}
                                                    className="w-full"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none group-focus-within/pill:opacity-50 transition-opacity">
                                                    <span className="material-symbols-outlined text-sm">hub</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'psychology' && (
                                    <div className="space-y-6">
                                        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] overflow-hidden p-8 space-y-8">
                                            {/* Pre-Trade Sentiment */}
                                            <div>
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-[18px] text-indigo-400">psychology</span>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pre-Trade Sentiment</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-3">
                                                    {PRE_TRADE_EMOTIONS.map(emo => (
                                                        <button
                                                            key={emo.id}
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, sentiment_pre: emo.id }))}
                                                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${formData.sentiment_pre === emo.id
                                                                ? 'bg-indigo-500/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                                                                : 'bg-white/5 border-white/5 hover:border-white/10'
                                                                }`}
                                                        >
                                                            <span className="text-2xl mb-2">{emo.icon}</span>
                                                            <span className={`text-[9px] font-black uppercase tracking-wider ${formData.sentiment_pre === emo.id ? 'text-indigo-400' : 'text-slate-500'}`}>{emo.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Post-Trade Sentiment */}
                                            <div>
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-[18px] text-emerald-400">mood</span>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Post-Trade Sentiment</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-3">
                                                    {POST_TRADE_EMOTIONS.map(emo => (
                                                        <button
                                                            key={emo.id}
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, sentiment_post: emo.id }))}
                                                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 transform active:scale-95 ${formData.sentiment_post === emo.id
                                                                ? 'bg-emerald-500/20 border-white/20 shadow-lg shadow-emerald-500/10'
                                                                : 'bg-slate-900/40 border-white/10 text-slate-500 hover:border-white/20'
                                                                }`}
                                                        >
                                                            <span className="text-2xl mb-2">{emo.icon}</span>
                                                            <span className={`text-[9px] font-black uppercase tracking-wider ${formData.sentiment_post === emo.id ? 'text-emerald-400' : 'text-slate-500'}`}>{emo.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="h-px bg-white/5 my-6" />

                                            {/* Psychology Block */}
                                            <div className="group/text">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-[18px] text-sky-400 group-focus-within/text:drop-shadow-glow">description</span>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Psychological Narrative</span>
                                                </div>
                                                <textarea
                                                    name="psychology"
                                                    rows="4"
                                                    placeholder="Document cognitive state during execution..."
                                                    value={formData.psychology}
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-900/40 rounded-2xl border border-white/10 p-5 focus:outline-none focus:ring-4 focus:ring-primary/10 text-white text-sm leading-relaxed resize-none placeholder-slate-700 transition-all shadow-inner"
                                                ></textarea>
                                            </div>

                                            {/* Mistakes Block */}
                                            <div className="group/text">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-[18px] text-rose-400 group-focus-within/text:drop-shadow-glow">error</span>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Operational Mistakes</span>
                                                </div>
                                                <textarea
                                                    name="mistakes"
                                                    rows="3"
                                                    placeholder="Any protocol deviations or rule violations?"
                                                    value={formData.mistakes}
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-900/40 rounded-2xl border border-white/10 p-5 focus:outline-none focus:ring-4 focus:ring-rose-500/10 text-white text-sm leading-relaxed resize-none placeholder-slate-700 transition-all shadow-inner"
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'journal' && (
                                    <div className="space-y-8">
                                        {/* Operational Scorecard */}
                                        <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group/score shadow-inner">
                                            {/* Glass Reflection Highlight */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                                            <div className="flex items-center justify-between mb-8 relative z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-primary">analytics</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-0.5">Tactical Execution Rating</h3>
                                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic leading-none">Objective Performance Scorecard</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, model: String(star) }))}
                                                            className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all duration-300 transform active:scale-90 ${String(formData.model) === String(star)
                                                                ? 'bg-amber-500/20 border-white/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                                                : 'bg-white/5 border-white/10 text-slate-600 hover:text-slate-400 hover:bg-white/10'}`}
                                                        >
                                                            <span className={`material-symbols-outlined text-xl ${String(formData.model) === String(star) ? 'fill-1' : ''}`}>
                                                                {String(formData.model) >= String(star) ? 'star' : 'star_border'}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                                <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/10 flex flex-col items-center text-center shadow-inner">
                                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 font-mono">Setup Quality</div>
                                                    <div className="text-sm font-black text-white italic tracking-tighter uppercase whitespace-nowrap">
                                                        {String(formData.model) === '5' ? 'A+ PERFECT' : String(formData.model) === '4' ? 'B+ SOLID' : String(formData.model) === '3' ? 'C NEUTRAL' : String(formData.model) === '2' ? 'D SUBPAR' : String(formData.model) === '1' ? 'F TRASH' : 'UNRATED'}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/10 flex flex-col items-center text-center shadow-inner">
                                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 font-mono">Discipline Protocol</div>
                                                    <div className={`text-sm font-black italic tracking-tighter uppercase ${formData.mistakes ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                        {formData.mistakes ? 'VIOLATED' : 'MAINTAINED'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/40 relative overflow-hidden shadow-inner group/notes">
                                            {/* Glass Reflection Highlight */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                                            {/* Bias Block */}
                                            <div className="border-b border-white/5 group/text">
                                                <div className="flex items-center justify-between px-8 pt-6 pb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-[18px] text-emerald-400 group-focus-within/text:drop-shadow-glow">trending_up</span>
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Operational Bias Analysis</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {['Liquidity Sweep', 'FVG Gap', 'MSB'].map(tag => (
                                                            <button
                                                                key={tag}
                                                                type="button"
                                                                onClick={() => setFormData(prev => ({ ...prev, comment_bias: (prev.comment_bias ? prev.comment_bias + ' ' : '') + tag + '.' }))}
                                                                className="text-[8px] font-black text-slate-600 hover:text-emerald-400 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/5 hover:border-emerald-500/30 transition-all"
                                                            >
                                                                + {tag}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <textarea
                                                    name="comment_bias"
                                                    rows="3"
                                                    placeholder="Validate bias alignment with price action. Why did this trade make sense?"
                                                    value={formData.comment_bias}
                                                    onChange={handleChange}
                                                    className="w-full bg-transparent px-8 pb-6 focus:outline-none text-white text-sm leading-relaxed resize-none placeholder-slate-700 font-medium transition-all focus:placeholder-transparent"
                                                ></textarea>
                                            </div>

                                            {/* Execution Block */}
                                            <div className="border-b border-white/5 group/text">
                                                <div className="flex items-center justify-between px-8 pt-6 pb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-[18px] text-primary group-focus-within/text:drop-shadow-glow">bolt</span>
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tactical Execution Review</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {['Clean Entry', 'Late Entry', 'Slipped'].map(tag => (
                                                            <button
                                                                key={tag}
                                                                type="button"
                                                                onClick={() => setFormData(prev => ({ ...prev, comment_execution: (prev.comment_execution ? prev.comment_execution + ' ' : '') + tag + '.' }))}
                                                                className="text-[8px] font-black text-slate-600 hover:text-primary uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/5 hover:border-primary-light/30 transition-all"
                                                            >
                                                                + {tag}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <textarea
                                                    name="comment_execution"
                                                    rows="3"
                                                    placeholder="Evaluate entry precision and protocol adherence. Was the entry clean?"
                                                    value={formData.comment_execution}
                                                    onChange={handleChange}
                                                    className="w-full bg-transparent px-8 pb-6 focus:outline-none text-white text-sm leading-relaxed resize-none placeholder-slate-700 font-medium transition-all focus:placeholder-transparent"
                                                ></textarea>
                                            </div>

                                            {/* Problems Block */}
                                            <div className="border-b border-white/5 group/text">
                                                <div className="flex items-center justify-between px-8 pt-6 pb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-[18px] text-amber-400 group-focus-within/text:drop-shadow-glow">warning</span>
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Operational Friction</span>
                                                    </div>
                                                </div>
                                                <textarea
                                                    name="comment_problems"
                                                    rows="3"
                                                    placeholder="Identify issues with execution or market conditions. What went wrong?"
                                                    value={formData.comment_problems}
                                                    onChange={handleChange}
                                                    className="w-full bg-transparent px-8 pb-6 focus:outline-none text-white text-sm leading-relaxed resize-none placeholder-slate-700 font-medium transition-all focus:placeholder-transparent"
                                                ></textarea>
                                            </div>

                                            {/* Fazit Block */}
                                            <div className="group/text">
                                                <div className="flex items-center justify-between px-8 pt-6 pb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-[18px] text-violet-400 group-focus-within/text:drop-shadow-glow">summarize</span>
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Mission Debrief (Fazit)</span>
                                                    </div>
                                                </div>
                                                <textarea
                                                    name="comment_fazit"
                                                    rows="4"
                                                    placeholder="Synthesize lessons and tactical takeaways for future operations..."
                                                    value={formData.comment_fazit}
                                                    onChange={handleChange}
                                                    className="w-full bg-transparent px-8 pb-10 focus:outline-none text-white text-sm leading-relaxed resize-none placeholder-slate-700 font-medium transition-all focus:placeholder-transparent"
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'attachments' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 gap-8">
                                            {/* Category 1: Execution */}
                                            <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 group/attach overflow-hidden relative shadow-inner">
                                                {/* Glass Reflection Highlight */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                                                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none transition-opacity group-hover/attach:opacity-10">
                                                    <span className="material-symbols-outlined text-[120px]">target</span>
                                                </div>
                                                <div className="flex items-center justify-between mb-6 relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
                                                            <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
                                                        </div>
                                                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Execution Matrix (LTF)</h3>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900/40 px-3 py-1 rounded-full border border-white/10 shadow-inner">Entry Precision</span>
                                                </div>
                                                <ImageSection
                                                    value={formData.images_execution}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, images_execution: val }))}
                                                />
                                            </div>

                                            {/* Category 2: Condition */}
                                            <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 group/attach overflow-hidden relative shadow-inner">
                                                {/* Glass Reflection Highlight */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                                                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none transition-opacity group-hover/attach:opacity-10">
                                                    <span className="material-symbols-outlined text-[120px]">analytics</span>
                                                </div>
                                                <div className="flex items-center justify-between mb-6 relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                                                            <span className="material-symbols-outlined text-emerald-400 text-[20px]">analytics</span>
                                                        </div>
                                                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Structural Context (MTF)</h3>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900/40 px-3 py-1 rounded-full border border-white/10 shadow-inner">Trend & Levels</span>
                                                </div>
                                                <ImageSection
                                                    value={formData.images_condition}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, images_condition: val }))}
                                                />
                                            </div>

                                            {/* Category 3: Narrative */}
                                            <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 group/attach overflow-hidden relative shadow-inner">
                                                {/* Glass Reflection Highlight */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                                                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none transition-opacity group-hover/attach:opacity-10">
                                                    <span className="material-symbols-outlined text-[120px]">auto_stories</span>
                                                </div>
                                                <div className="flex items-center justify-between mb-6 relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
                                                            <span className="material-symbols-outlined text-amber-400 text-[20px]">auto_stories</span>
                                                        </div>
                                                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Higher Narrative (HTF)</h3>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900/40 px-3 py-1 rounded-full border border-white/10 shadow-inner">Bias Framework</span>
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

                        {/* Footer - Final Deployment */}
                        {!showCelebration && (
                            <div className="px-12 py-10 border-t border-white/5 bg-slate-900/40 backdrop-blur-md rounded-b-[3.5rem]">
                                <button
                                    type="submit"
                                    form="tradeForm"
                                    disabled={!isTradeReady}
                                    className={`w-full font-black py-6 rounded-[2rem] transition-all duration-500 transform relative overflow-hidden group/submit ${isTradeReady
                                        ? 'bg-primary text-white hover:bg-primary-light shadow-[0_0_30px_rgba(99,102,241,0.3)] active:scale-[0.99] cursor-pointer'
                                        : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed grayscale'
                                        }`}
                                >
                                    <div className="flex items-center justify-center gap-3 relative z-10">
                                        <span className="material-symbols-outlined text-[20px]">
                                            {tradeToEdit ? 'sync' : 'rocket_launch'}
                                        </span>
                                        <span className="uppercase tracking-[0.25em] text-xs">
                                            {tradeToEdit ? 'Update Operational Data' : 'Commit Execution'}
                                        </span>
                                    </div>
                                    {isTradeReady && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/submit:translate-x-full transition-transform duration-1000" />
                                    )}
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

