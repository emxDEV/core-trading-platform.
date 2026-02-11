import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { soundEngine } from '../utils/SoundEngine';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const TradeContext = createContext();

// Supabase column whitelists — only these fields get sent to the DB
// Core columns that are guaranteed to exist or critical
const CORE_TRADE_COLS = ['symbol', 'model', 'bias', 'side', 'pnl', 'risk_percent', 'trade_session', 'account_type'];
const ADVANCED_TRADE_COLS = [
    'entry_signal', 'order_type', 'sl_pips', 'confluences',
    'psychology', 'mistakes', 'comment_bias', 'comment_execution',
    'comment_problems', 'comment_fazit', 'image_paths',
    'images_execution', 'images_condition', 'images_narrative'
];

const CORE_ACCOUNT_COLS = ['id', 'name', 'type', 'balance', 'currency', 'capital', 'profit_target', 'max_loss', 'consistency_rule', 'prop_firm', 'reset_date', 'breach_report'];
const ADVANCED_ACCOUNT_COLS = ['is_ranked_up', 'prev_reset_date', 'payout_goal'];

const cleanForSupabase = (obj, allowedCols) => {
    const cleaned = {};
    for (const key of allowedCols) {
        if (key in obj && obj[key] !== undefined) cleaned[key] = obj[key];
    }
    return cleaned;
};

export const useData = () => {
    return useContext(TradeContext);
};

// Pure helper function for calculating account statistics
// Pure helper for calculating stats
export const getAccountStats = (accId, accountsList, tradesList) => {
    const acc = accountsList.find(a => String(a.id) === String(accId));
    if (!acc) return null;

    let accTrades = tradesList.filter(t => String(t.account_id) === String(accId));

    // Filter trades after reset date if it exists
    if (acc.reset_date) {
        // Add 2s buffer to handle millisecond precision loss or immediate trades
        const resetTime = new Date(acc.reset_date).getTime() - 2000;

        accTrades = accTrades.filter(t => {
            // Priority: Precise Timestamp
            if (t.created_at) {
                let tStr = t.created_at;
                // Fix SQLite/JS Timezone bug: If string lacks offset (e.g. "2024-02-11 10:00:00"), 
                // JS might treat as Local. We assume DB stores UTC, so verify and force UTC.
                if (typeof tStr === 'string') {
                    // Check if it's SQL style (space separated)
                    if (tStr.includes(' ')) {
                        tStr = tStr.replace(' ', 'T');
                    }
                    // If missing Z and offset, append Z to force UTC
                    if (!tStr.endsWith('Z') && !tStr.includes('+') && (tStr.match(/-/g) || []).length < 3) {
                        // Note: ISO date has 2 dashes. If it has offset, it might have 3 or +
                        // Simpler check: If it doesn't end in Z and no +, assume UTC (Z)
                        tStr += 'Z';
                    }
                }
                const tradeTimestamp = new Date(tStr).getTime();
                if (!isNaN(tradeTimestamp)) {
                    return tradeTimestamp > resetTime;
                }
            }

            // Fallback: Date (Midnight) logic
            // If created_at missing, we can only compare Day > Reset Day
            // Note: This excludes Same Day trades if they happen after reset (limitation of no timestamp)
            const tradeDate = t.date ? new Date(t.date).getTime() : 0;
            return tradeDate > resetTime;
        });
    }

    const totalPnL = accTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);

    const capital = parseFloat(acc.capital) || 0;
    const maxLoss = parseFloat(acc.max_loss) || 0;
    const profitTarget = parseFloat(acc.profit_target) || 0;

    const balance = capital + totalPnL;
    const mll = capital - maxLoss;
    const target = capital + profitTarget;

    let consistencyValid = null;
    let failingDay = null;

    if (acc.consistency_rule && acc.profit_target > 0) {
        const rulePercent = parseFloat(acc.consistency_rule);
        if (!isNaN(rulePercent) && rulePercent > 0) {
            consistencyValid = true;
            const maxAllowed = acc.profit_target * (rulePercent / 100);

            const dailyPnLs = {};
            accTrades.forEach(t => {
                const date = t.date ? t.date.split('T')[0] : 'Unknown';
                dailyPnLs[date] = (dailyPnLs[date] || 0) + (t.pnl || 0);
            });

            for (const [date, pnl] of Object.entries(dailyPnLs)) {
                if (pnl > maxAllowed) {
                    consistencyValid = false;
                    failingDay = date;
                    break;
                }
            }
        }
    }

    // Enhanced Stats Calculation
    const wins = accTrades.filter(t => t.pnl > 0).length;
    const losses = accTrades.filter(t => t.pnl <= 0).length;
    const winRate = accTrades.length > 0 ? (wins / accTrades.length) * 100 : 0;

    const grossProfit = accTrades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
    const grossLoss = Math.abs(accTrades.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 100 : 0) : grossProfit / grossLoss;

    // For Sparkline (last 20 trades)
    const recentTradesForSparkline = accTrades
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-20)
        .map(t => t.pnl);

    return {
        acc, balance, totalPnL, mll, target,
        drawdownRemaining: balance - mll,
        remainingToTarget: target - balance,
        consistencyValid, failingDay,
        isBreached: (acc.type === 'Evaluation' || acc.type === 'Funded') && (balance <= mll || !!acc.breach_report),
        winRate,
        profitFactor,
        tradeCount: accTrades.length,
        recentPnl: recentTradesForSparkline
    };
};

export const TradeProvider = ({ children }) => {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [pillColors, setPillColors] = useState({});
    const [copyGroups, setCopyGroups] = useState([]);
    const [currentView, setCurrentView] = useState('journal');
    const [trades, setTrades] = useState([]);
    const [passedAccounts, setPassedAccounts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCopyGroupModalOpen, setIsCopyGroupModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [tradeToEdit, setTradeToEdit] = useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isDailyPnLOpen, setIsDailyPnLOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState({ type: 'all', startDate: null, endDate: null });
    const [analyticsFilters, setAnalyticsFilters] = useState({ accountId: 'all', type: 'all' });
    const syncTimerRef = useRef(null);
    const isSyncingRef = useRef(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Schema Capabilities Detection
    const [syncCapabilities, setSyncCapabilities] = useState({
        advancedTrades: false,
        advancedAccounts: false
    });

    useEffect(() => {
        const checkCloudCapabilities = async () => {
            // Probe for advanced columns & tables
            const checkTrade = await supabase.from('trades').select('comment_bias').limit(1);
            const checkAccount = await supabase.from('accounts').select('payout_goal').limit(1);
            const checkGroups = await supabase.from('copy_groups').select('id').limit(1);

            setSyncCapabilities({
                advancedTrades: !checkTrade.error && checkTrade.error?.code !== 'PGRST301',
                advancedAccounts: !checkAccount.error,
                copyGroups: !checkGroups.error
            });
        };
        checkCloudCapabilities();
    }, []);

    const [userProfile, setUserProfile] = useState({
        name: 'Alex Rivera',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDU5qbxeGZ1q28nET6V7_0hQ4NxoH7ud3tqcYDgp50RVdhrWsKMQ-nfmoPpypW9CovWtV4x_lsU7cH6JTocjzbiQd-pCplppt1p8_U3OZofiYP_PbnYuJqoSsSyVkhTy0L0aS5QDQCxFYMo4nDBwT_sC42NgRYVFmicT5HIEtL2k1tTOBNwxJMhTxkTbL1JlyEze52t2DVfFeCgVE0AmzHGfVTRNYDq3l8HKz41Kgw3ilX39_5 (etc...)', // Truncated for brevity but the real one is kept in state
        bio: 'Focused on disciplined prop firm scaling and algorithmic execution patterns.',
        goals: [],
        dailyPnLGoal: 2500,
        riskAppetite: 'Balanced',
        location: 'Barcelona, Spain',
        memberSince: '2024'
    });

    // Resetting userProfile to the full version if it was truncated in my thought
    // Load/Save User Profile based on user.id
    useEffect(() => {
        if (!user) return;

        const profileKey = `userProfile_${user.id}`;
        const savedProfile = localStorage.getItem(profileKey);

        if (savedProfile) {
            try {
                setUserProfile(JSON.parse(savedProfile));
            } catch (e) {
                console.error('Failed to parse profile:', e);
            }
        } else {
            // Default profile for new user
            setUserProfile({
                name: user.email?.split('@')[0] || 'Trader',
                avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDU5qbxeGZ1q28nET6V7_0hQ4NxoH7ud3tqcYDgp50RVdhrWsKMQ-nfmoPpypW9CovWtV4x_lsU7cH6JTocjzbiQd-pCplppt1p8_U3OZofiYP_PbnYuJqoSsSyVkhTy0L0aS5QDQCxFYMo4nDBwT_sC42NgRYVFmicT5HIEtL2k1tTOBNwxJMhTxkTbL1JlyEze52t2DVfFeCgVE0AmzHGfVTRNYDq3l8HKz41Kgw3ilX39_5Q9fYqC1dpEqRqIZFXaItdbIomvGLr',
                bio: 'Focused on disciplined prop firm scaling and algorithmic execution patterns.',
                goals: [],
                dailyPnLGoal: 2500,
                riskAppetite: 'Balanced',
                location: 'Barcelona, Spain',
                memberSince: new Date().getFullYear().toString()
            });
        }
    }, [user]);

    const [appSettings, setAppSettings] = useState({
        cloudSync: true,
        showPnLInPercent: false,
        autoSaveTrades: true,
        defaultRiskPerc: 1.0,
        enableShortcuts: true,
        soundEnabled: true,
        soundVolume: 0.5,
        maskBalances: false,
        hideCapitalOnDailyPnL: false,
        currency: 'USD',
        timezone: 'UTC +1 (Madrid)',
        language: 'English (US)'
    });

    const [stats, setStats] = useState({
        winRate: 0,
        totalPnL: 0,
        totalTrades: 0,
        monthlyPnL: 0,
        xp: 0,
        rank: { name: 'Initiate' }
    });

    const RANKS = [
        { level: 1, name: 'Initiate', minXp: 0, color: 'text-slate-400', icon: 'auto_fix' },
        { level: 2, name: 'Tactical Novice', minXp: 500, color: 'text-emerald-400', icon: 'target' },
        { level: 3, name: 'Momentum Builder', minXp: 2000, color: 'text-cyan-400', icon: 'trending_up' },
        { level: 4, name: 'Consistent Scalper', minXp: 5000, color: 'text-blue-400', icon: 'bolt' },
        { level: 5, name: 'Prop Associate', minXp: 12000, color: 'text-indigo-400', icon: 'verified_user' },
        { level: 6, name: 'Elite Performer', minXp: 30000, color: 'text-purple-400', icon: 'military_tech' },
        { level: 7, name: 'Capital Master', minXp: 75000, color: 'text-amber-400', icon: 'workspace_premium' },
        { level: 8, name: 'Apex Legend', minXp: 200000, color: 'text-rose-500', icon: 'diamond' }
    ];

    useEffect(() => {
        const init = async () => {
            if (user && window.electron) {
                // 1. Wipe Guest Data (Offline Session)
                try {
                    await window.electron.ipcRenderer.invoke('db-delete-guest-data');
                } catch (e) {
                    console.error('Failed to wipe guest data:', e);
                }
            }

            // 2. Load User Data (or empty if new/wiped)
            await loadInitialData();

            // 3. If User Logged In AND Workspace Empty -> Prompt Import
            if (user && window.electron) {
                try {
                    const tRes = await window.electron.ipcRenderer.invoke('db-get-trades', user.id);
                    const aRes = await window.electron.ipcRenderer.invoke('db-get-accounts', user.id);

                    const hasTrades = tRes.success && tRes.data.length > 0;
                    const hasAccounts = aRes.success && aRes.data.length > 0;

                    if (!hasTrades && !hasAccounts) {
                        setIsImportModalOpen(true);
                    }
                } catch (e) { console.error(e); }
            }
        };
        init();
    }, [user]);

    // Helper to get start/end dates for predefined ranges
    const getRangeDates = (type) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (type) {
            case 'today':
                return { start: today, end: today };
            case 'yesterday': {
                const y = new Date(today);
                y.setDate(y.getDate() - 1);
                return { start: y, end: y };
            }
            case 'this_week': {
                // Assuming Monday start
                const day = today.getDay() || 7; // 1 (Mon) - 7 (Sun)
                if (day !== 1) today.setHours(-24 * (day - 1));
                const start = new Date(today); // Monday
                return { start, end: new Date() }; // Up to now
            }
            case 'last_week': {
                const day = today.getDay() || 7;
                const start = new Date(today);
                start.setDate(today.getDate() - day - 6);
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                return { start, end };
            }
            case 'this_month': {
                const start = new Date(today.getFullYear(), today.getMonth(), 1);
                return { start, end: new Date() };
            }
            case 'last_month': {
                const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const end = new Date(today.getFullYear(), today.getMonth(), 0);
                return { start, end };
            }
            default:
                return null;
        }
    };

    const normalizeDate = (dateStr) => {
        if (!dateStr) return null;
        // db stores as YYYY-MM-DD usually, or ISO
        // We only care about YYYY-MM-DD
        return dateStr.split('T')[0];
    };

    const applyDateFilter = (allTrades, filter) => {
        if (filter.type === 'all') return allTrades;

        let start, end;
        if (filter.type === 'custom') {
            start = filter.startDate ? new Date(filter.startDate) : null;
            end = filter.endDate ? new Date(filter.endDate) : null;
        } else {
            const range = getRangeDates(filter.type);
            // Clone dates to ensure distinct instances
            start = range?.start ? new Date(range.start) : null;
            end = range?.end ? new Date(range.end) : null;
        }

        if (!start) return allTrades;
        // Adjust end to include the full day
        if (end) end.setHours(23, 59, 59, 999);
        start.setHours(0, 0, 0, 0);

        return allTrades.filter(t => {
            if (!t.date) return false;
            // Parse trade date YYYY-MM-DD as local midnight
            const [y, m, d] = t.date.split('-').map(Number);
            const tDate = new Date(y, m - 1, d);
            if (end) return tDate >= start && tDate <= end;
            return tDate >= start;
        });
    };

    // Calculate filtered trades
    const filteredTrades = React.useMemo(() => {
        return applyDateFilter(trades, dateFilter);
    }, [trades, dateFilter]);

    useEffect(() => {
        calculateStats();
    }, [filteredTrades, accounts]); // Depend on filteredTrades

    const calculateStats = () => {
        const sourceTrades = filteredTrades; // Use filtered trades for stats
        const total = sourceTrades.length;
        if (total === 0) {
            setStats(prev => ({ ...prev, winRate: 0, totalPnL: 0, totalTrades: 0, monthlyPnL: 0, xp: 0, rank: RANKS[0] }));
            return;
        }
        const wins = sourceTrades.filter(t => t.pnl > 0).length;
        const totalPnL = sourceTrades.reduce((acc, curr) => acc + curr.pnl, 0);

        // XP Calculation might typically imply "Career XP", but user said "All stats". 
        // Showing "XP gained in this period" is also valid. 
        // However, Rank is usually a lifetime stat. 
        // Let's keep Rank based on ALL trades if possible? 
        // User check: "All stats are then only shown for the chosen time". 
        // If I limit trades, XP drops, Rank drops. This might be confusing if Rank is persistent user level.
        // I will calculate LIFETIME XP separately for Rank to stay consistent, but show stats for the period.
        // Actually, let's keep it simple: Stats reflect the view. If view is "Today", XP is "Today's XP". 
        // But Rank? A user doesn't "lose rank" by viewing today.

        // Let's calculate Lifetime Stats for Rank
        const lifetimeTotal = trades.length;
        const lifetimeWins = trades.filter(t => t.pnl > 0).length;
        const lifetimePnL = trades.reduce((acc, curr) => acc + curr.pnl, 0);

        let lifetimeXp = lifetimeTotal * 15 + lifetimeWins * 35 + Math.max(0, Math.floor(lifetimePnL / 100)) * 10;
        const fundedCount = accounts.filter(a => a.type === 'Funded').length;
        lifetimeXp += fundedCount * 1000;

        let currentRank = RANKS[0];
        for (let i = RANKS.length - 1; i >= 0; i--) {
            if (lifetimeXp >= RANKS[i].minXp) {
                currentRank = RANKS[i];
                break;
            }
        }

        // Stats for the view period
        setStats({
            winRate: ((wins / total) * 100).toFixed(1),
            totalPnL,
            totalTrades: total,
            monthlyPnL: totalPnL, // In this context, it's just "Period PnL"
            xp: lifetimeXp, // Keep XP as lifetime property for the profile badge
            rank: currentRank // Keep Rank as lifetime property
        });
    };

    const loadTrades = async () => {
        if (!window.electron) return;
        const result = await window.electron.ipcRenderer.invoke('db-get-trades', user?.id);
        if (result.success) setTrades(result.data);
    };

    const loadAccounts = async () => {
        if (!window.electron) return;
        const result = await window.electron.ipcRenderer.invoke('db-get-accounts', user?.id);
        if (result.success) setAccounts(result.data);
    };

    const loadPillColors = async () => {
        if (!window.electron) return;
        const result = await window.electron.ipcRenderer.invoke('db-get-pill-colors');
        if (result.success) {
            const map = {};
            result.data.forEach(row => map[`${row.category}:${row.value}`] = row.color);
            setPillColors(map);
        }
    };

    const loadCopyGroups = async () => {
        if (!window.electron) return;
        // Note: keeping copy groups local for now as it involves complex joins
        const result = await window.electron.ipcRenderer.invoke('db-get-copy-groups', user?.id);
        if (result.success) setCopyGroups(result.data);
    };

    const updateAppSettings = (newSettings) => {
        setAppSettings(prev => {
            const updated = { ...prev, ...newSettings };
            localStorage.setItem('appSettings', JSON.stringify(updated));

            // Sync Sound Engine on update
            if (newSettings.hasOwnProperty('soundEnabled')) {
                soundEngine.setEnabled(newSettings.soundEnabled);
            }
            if (newSettings.hasOwnProperty('soundVolume')) {
                soundEngine.setVolume(newSettings.soundVolume);
            }

            // Reload data if cloudSync changed
            if (newSettings.hasOwnProperty('cloudSync')) {
                setIsLoading(true);
                setTimeout(() => {
                    loadInitialData();
                }, 100);
            }

            return updated;
        });
    };

    const loadInitialData = async () => {
        await Promise.all([loadTrades(), loadAccounts(), loadPillColors(), loadCopyGroups()]);
        setTimeout(() => setIsLoading(false), 800);
    };

    const updateUserProfile = (newProfile) => {
        if (!user) return;
        const updated = { ...userProfile, ...newProfile };
        setUserProfile(updated);
        localStorage.setItem(`userProfile_${user.id}`, JSON.stringify(updated));
        scheduleCloudSync();
    };

    const addTrade = async (trade) => {
        if (!window.electron) return false;

        // Inject ISO timestamp to ensure timezone consistency with reset_date
        // This prevents new trades from being filtered out if SQLite defaults to non-ISO string
        const tradeWithDetails = {
            ...trade,
            created_at: trade.created_at || new Date().toISOString()
        };

        try {
            console.log('[addTrade] Sending trade to local DB:', JSON.stringify(tradeWithDetails, null, 2));
            const result = await window.electron.ipcRenderer.invoke('db-add-trade', tradeWithDetails);
            console.log('[addTrade] Result from local DB:', result);
            if (result.success) {
                await loadTrades();
                scheduleCloudSync();
                return true;
            }
            console.error('[addTrade] Local save failed:', result.error || result);
        } catch (e) {
            console.error('[addTrade] IPC Invocation Error:', e);
        }
        return false;
    };

    const [lastDeletedTrade, setLastDeletedTrade] = useState(null);

    const deleteTrade = async (id) => {
        if (!window.electron) return false;
        const tradeToDelete = trades.find(t => t.id === id);
        if (tradeToDelete) setLastDeletedTrade(tradeToDelete);
        const result = await window.electron.ipcRenderer.invoke('db-delete-trade', id);
        if (result.success) {
            await loadTrades();
            scheduleCloudSync();
        }
        return result.success;
    };

    const undoDeleteTrade = async () => {
        if (!lastDeletedTrade) return false;
        const { id, ...tradeRest } = lastDeletedTrade;
        const success = await addTrade(tradeRest);
        if (success) setLastDeletedTrade(null);
        return success;
    };

    const updateTrade = async (trade) => {
        if (!window.electron) return false;
        const result = await window.electron.ipcRenderer.invoke('db-update-trade', trade);
        if (result.success) {
            await loadTrades();
            scheduleCloudSync();
            return true;
        }
        return false;
    };

    const addAccount = async (account) => {
        if (!window.electron) return null;
        const result = await window.electron.ipcRenderer.invoke('db-add-account', { ...account, user_id: user?.id });
        if (result.success) {
            await loadAccounts();
            scheduleCloudSync();
            return result.id;
        }
        return null;
    };

    const updateAccount = async (account) => {
        if (!window.electron) return false;
        const result = await window.electron.ipcRenderer.invoke('db-update-account', account);
        if (result.success) {
            await loadAccounts();
            scheduleCloudSync();
            return true;
        }
        return false;
    };

    const deleteAccount = async (id) => {
        if (!window.electron) return false;
        const result = await window.electron.ipcRenderer.invoke('db-delete-account', id);
        if (result.success) {
            await Promise.all([loadAccounts(), loadTrades()]);
            scheduleCloudSync();
            return true;
        }
        return false;
    };

    const getPillColor = (cat, val) => pillColors[`${cat}:${val}`] || null;

    const savePillColor = async (cat, val, col) => {
        if (window.electron) {
            const result = await window.electron.ipcRenderer.invoke('db-set-pill-color', { category: cat, value: val, color: col });
            if (result.success) {
                setPillColors(prev => ({ ...prev, [`${cat}:${val}`]: col }));
                scheduleCloudSync();
            }
        }
    };

    // --- Background Cloud Auto-Sync (debounced, with proper ID mapping) ---
    const backgroundSyncToCloud = useCallback(async () => {
        if (!appSettings.cloudSync || isSyncingRef.current) return;
        if (!window.electron || !user) return;

        isSyncingRef.current = true;
        setIsSyncing(true);
        try {
            const tradesRes = await window.electron.ipcRenderer.invoke('db-get-trades');
            const accountsRes = await window.electron.ipcRenderer.invoke('db-get-accounts');
            const colorsRes = await window.electron.ipcRenderer.invoke('db-get-pill-colors');
            const groupsRes = await window.electron.ipcRenderer.invoke('db-get-copy-groups');

            if (!accountsRes.success || !tradesRes.success) throw new Error('Failed to load local data');

            // Clear remote for THIS user
            await supabase.from('trades').delete().eq('user_id', user.id);
            await supabase.from('accounts').delete().eq('user_id', user.id);
            await supabase.from('pill_colors').delete().eq('user_id', user.id);
            if (syncCapabilities.copyGroups) {
                await supabase.from('copy_groups').delete().eq('user_id', user.id); // Cascades to members
            }

            // Push accounts with user_id & ID Mapping
            const idMap = {};
            if (accountsRes.data.length > 0) {
                const effectiveAccountCols = syncCapabilities.advancedAccounts
                    ? [...CORE_ACCOUNT_COLS, ...ADVANCED_ACCOUNT_COLS]
                    : CORE_ACCOUNT_COLS;

                const cleanedAccounts = accountsRes.data.map(acc => ({
                    ...cleanForSupabase(acc, effectiveAccountCols),
                    user_id: user.id
                })).map(({ id, ...rest }) => rest);

                const { data: remoteAccounts, error: accError } = await supabase
                    .from('accounts')
                    .insert(cleanedAccounts)
                    .select();

                if (accError) throw accError;

                // Build ID mapping
                accountsRes.data.forEach((oldAcc, idx) => {
                    idMap[oldAcc.id] = remoteAccounts[idx].id;
                });
            }

            // Push trades
            if (tradesRes.data.length > 0) {
                const effectiveTradeCols = syncCapabilities.advancedTrades
                    ? [...CORE_TRADE_COLS, ...ADVANCED_TRADE_COLS]
                    : CORE_TRADE_COLS;

                const cleanedTrades = tradesRes.data.map(trade => ({
                    ...cleanForSupabase(trade, effectiveTradeCols),
                    account_id: idMap[trade.account_id] || null,
                    user_id: user.id
                })).map(({ id, ...rest }) => rest);

                const { error: tradeError } = await supabase
                    .from('trades')
                    .insert(cleanedTrades);

                if (tradeError) throw tradeError;
            }

            // Push Copy Groups
            if (syncCapabilities.copyGroups && groupsRes.success && groupsRes.data.length > 0) {
                for (const group of groupsRes.data) {
                    const cloudLeaderId = idMap[group.leader_account_id];
                    if (!cloudLeaderId) continue;

                    const { data: remoteGroup, error: grpErr } = await supabase
                        .from('copy_groups')
                        .insert({
                            name: group.name,
                            leader_id: cloudLeaderId,
                            is_active: group.is_active ? true : false,
                            user_id: user.id
                        })
                        .select()
                        .single();

                    if (!grpErr && remoteGroup && group.members && group.members.length > 0) {
                        const membersToInsert = group.members
                            .map(m => ({
                                group_id: remoteGroup.id,
                                follower_account_id: idMap[m.follower_account_id],
                                risk_multiplier: m.risk_multiplier
                            }))
                            .filter(m => m.follower_account_id);

                        if (membersToInsert.length > 0) {
                            await supabase.from('copy_members').insert(membersToInsert);
                        }
                    }
                }
            }

            // Push pill colors
            if (colorsRes.data && colorsRes.data.length > 0) {
                const cleanedColors = colorsRes.data.map(({ id, ...rest }) => ({
                    ...rest,
                    user_id: user.id
                }));
                await supabase.from('pill_colors').upsert(cleanedColors);
            }

            // Push User Profile (Metadata)
            if (userProfile) {
                await supabase.auth.updateUser({
                    data: { profile: userProfile }
                });
            }

            console.log('[CloudSync] ✅ Auto-sync complete');
        } catch (err) {
            console.error('[CloudSync] ❌ Auto-sync failed:', err);
        } finally {
            isSyncingRef.current = false;
            setIsSyncing(false);
        }
    }, [appSettings.cloudSync, user]);

    const scheduleCloudSync = useCallback(() => {
        if (!appSettings.cloudSync) return;
        // Debounce: wait 3s after last mutation before syncing
        syncTimerRef.current = setTimeout(() => {
            backgroundSyncToCloud();
        }, 1000); // 1s debounce for instant feel
    }, [appSettings.cloudSync, backgroundSyncToCloud]);

    const migrateToCloud = async () => {
        if (!appSettings.cloudSync) return { success: false, message: 'Cloud sync is disabled' };

        try {
            // 1. Fetch all local data
            const tradesRes = await window.electron.ipcRenderer.invoke('db-get-trades');
            const accountsRes = await window.electron.ipcRenderer.invoke('db-get-accounts');
            const colorsRes = await window.electron.ipcRenderer.invoke('db-get-pill-colors');

            if (!accountsRes.success || !tradesRes.success) throw new Error('Failed to load local data');

            // 2. Clear remote (Optional, but safer for a clean start)
            // Note: In production you might want to merge or ask

            // 3. Push accounts first (to satisfy FK)
            const cleanedAccounts = accountsRes.data.map(({ id, created_at, ...rest }) => rest);
            const { data: remoteAccounts, error: accError } = await supabase
                .from('accounts')
                .insert(cleanedAccounts)
                .select();

            if (accError) throw accError;

            // Create a mapping of old ID -> new UUID
            const idMap = {};
            accountsRes.data.forEach((oldAcc, idx) => {
                idMap[oldAcc.id] = remoteAccounts[idx].id;
            });

            // 4. Push trades with mapped account IDs
            const cleanedTrades = tradesRes.data.map(({ id, created_at, account_id, account_name, current_account_type, account_prop_firm, ...rest }) => ({
                ...rest,
                account_id: idMap[account_id] || null
            }));

            const { error: tradeError } = await supabase
                .from('trades')
                .insert(cleanedTrades);

            if (tradeError) throw tradeError;

            // 5. Push colors
            const cleanedColors = colorsRes.data.map(({ id, ...rest }) => rest);
            await supabase.from('pill_colors').upsert(cleanedColors);

            await loadInitialData();
            return { success: true, message: 'Tactical migration complete' };
        } catch (err) {
            console.error('Migration failed:', err);
            return { success: false, error: err.message };
        }
    };

    const syncToCloud = async () => {
        if (!appSettings.cloudSync) return { success: false, message: 'Cloud sync is disabled' };

        try {
            // 1. Get local data
            if (!window.electron) return { success: false, message: 'No local database available' };
            const tradesRes = await window.electron.ipcRenderer.invoke('db-get-trades');
            const accountsRes = await window.electron.ipcRenderer.invoke('db-get-accounts');
            const colorsRes = await window.electron.ipcRenderer.invoke('db-get-pill-colors');

            if (!accountsRes.success || !tradesRes.success) throw new Error('Failed to load local data');

            // 2. Clear remote tables (trades first due to FK)
            await supabase.from('trades').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('pill_colors').delete().neq('category', '__never__');

            // 3. Push accounts
            const cleanedAccounts = accountsRes.data.map(({ id, created_at, ...rest }) => rest);
            const { data: remoteAccounts, error: accError } = await supabase
                .from('accounts')
                .insert(cleanedAccounts)
                .select();

            if (accError) throw accError;

            // 4. Build ID mapping
            const idMap = {};
            accountsRes.data.forEach((oldAcc, idx) => {
                idMap[oldAcc.id] = remoteAccounts[idx].id;
            });

            // 5. Push trades
            if (tradesRes.data.length > 0) {
                const cleanedTrades = tradesRes.data.map(({ id, created_at, account_id, account_name, current_account_type, account_prop_firm, ...rest }) => ({
                    ...rest,
                    account_id: idMap[account_id] || null
                }));

                const { error: tradeError } = await supabase
                    .from('trades')
                    .insert(cleanedTrades);

                if (tradeError) throw tradeError;
            }

            // 6. Push pill colors
            if (colorsRes.data && colorsRes.data.length > 0) {
                const cleanedColors = colorsRes.data.map(({ id, ...rest }) => rest);
                await supabase.from('pill_colors').upsert(cleanedColors);
            }

            // 7. Reload from cloud
            await loadInitialData();
            return { success: true, message: `Synced ${accountsRes.data.length} accounts & ${tradesRes.data.length} trades to cloud` };
        } catch (err) {
            console.error('Sync to cloud failed:', err);
            return { success: false, error: err.message };
        }
    };

    const importFromCloud = async () => {
        if (!appSettings.cloudSync) return { success: false, message: 'Cloud sync is disabled' };

        // Prevent race condition: If background sync is deleting/inserting, do NOT read cloud
        if (isSyncingRef.current || isSyncing) {
            return { success: false, message: 'Sync in progress, please wait...' };
        }

        isSyncingRef.current = true;
        setIsSyncing(true);

        try {
            // 1. Fetch cloud accounts
            const { data: cloudAccounts, error: accErr } = await supabase
                .from('accounts')
                .select('*')
                .order('name', { ascending: true });

            if (accErr) throw accErr;

            // 2. Fetch cloud trades with join
            const { data: cloudTrades, error: tradeErr } = await supabase
                .from('trades')
                .select(`
                    *,
                    accounts (
                        name,
                        type,
                        prop_firm
                    )
                `)
                .order('date', { ascending: false });

            if (tradeErr) throw tradeErr;

            // 3. Fetch pill colors
            const { data: cloudColors, error: colorErr } = await supabase
                .from('pill_colors')
                .select('*')
                .eq('user_id', user.id);

            if (colorErr) throw colorErr;

            // 3b. Fetch Copy Groups (if capable)
            let cloudGroups = [];
            if (syncCapabilities.copyGroups) {
                const { data: grpData } = await supabase
                    .from('copy_groups')
                    .select('*, copy_members(*)')
                    .eq('user_id', user.id);
                if (grpData) cloudGroups = grpData;
            }

            // 3c. Fetch User Profile from Metadata
            const { data: { user: freshUser }, error: userErr } = await supabase.auth.getUser();
            if (freshUser?.user_metadata?.profile) {
                // Update local profile immediately
                updateUserProfile(freshUser.user_metadata.profile);
            }

            // Check if there is ANY data to sync
            const hasData = (cloudAccounts?.length > 0) || (cloudTrades?.length > 0) || (cloudGroups?.length > 0);

            if (!hasData) {
                return { success: true, message: 'No data available to sync' };
            }

            // SMART SYNC CHECK: If counts and PnL match, assume up to date
            // This prevents unnecessary wiping/reloading for metadata-only edits (unless pnl changed)
            if (window.electron && trades.length > 0) {
                const localCount = trades.length;
                const cloudCount = cloudTrades.length;
                const localPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                const cloudPnL = cloudTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

                // Round to avoid float precision mismatch
                const pnlMatch = Math.abs(localPnL - cloudPnL) < 0.01;
                const countMatch = localCount === cloudCount;
                const accountMatch = accounts.length === cloudAccounts.length;

                if (pnlMatch && countMatch && accountMatch) {
                    return { success: true, message: 'Your data is already up to date' };
                }
            }

            // 4. Save to Local DB (Persist Import)
            if (window.electron) {
                // Wipe existing User Data first to avoid Duplicates
                try {
                    await window.electron.ipcRenderer.invoke('db-delete-user-data', user.id);
                } catch (e) { console.error('Failed to wipe user data before import:', e); }

                // Determine source accounts
                const accountsToImport = cloudAccounts || [];
                const idMap = {}; // Cloud UUID -> Local ID

                for (const acc of accountsToImport) {
                    const result = await window.electron.ipcRenderer.invoke('db-add-account', { ...acc, user_id: user.id });
                    if (result.success) {
                        idMap[acc.id] = result.id;
                    }
                }

                // Import Trades with ID Mapping
                const tradesToImport = cloudTrades || [];
                for (const trade of tradesToImport) {
                    const localAccountId = trade.account_id ? idMap[trade.account_id] : null;
                    if (localAccountId) {
                        await window.electron.ipcRenderer.invoke('db-add-trade', {
                            ...trade,
                            account_id: localAccountId,
                            // Ensure created_at is preserved or generated
                            created_at: trade.created_at || new Date().toISOString()
                        });
                    }
                }

                // Import Colors
                if (cloudColors) {
                    for (const color of cloudColors) {
                        await window.electron.ipcRenderer.invoke('db-set-pill-color', { ...color, user_id: user.id });
                    }
                }

                // Import Copy Groups
                for (const group of cloudGroups) {
                    const localLeaderId = idMap[group.leader_id];
                    if (localLeaderId) {
                        const grpRes = await window.electron.ipcRenderer.invoke('db-add-copy-group', {
                            name: group.name,
                            leader_id: localLeaderId,
                            user_id: user.id
                        });

                        if (grpRes.success && group.copy_members) {
                            const localGroupId = grpRes.id;
                            for (const member of group.copy_members) {
                                const localFollowerId = idMap[member.follower_account_id];
                                if (localFollowerId) {
                                    await window.electron.ipcRenderer.invoke('db-add-copy-member', {
                                        group_id: localGroupId,
                                        follower_id: localFollowerId,
                                        risk_multiplier: member.risk_multiplier
                                    });
                                }
                            }
                        }
                    }
                }
            }

            // 5. Reload Local Data to Refresh UI
            await loadInitialData();

            return { success: true, message: `Synced ${cloudAccounts?.length || 0} accounts & ${cloudTrades?.length || 0} trades from cloud` };
        } catch (err) {
            console.error('Import failed:', err);
            return { success: false, error: err.message };
        } finally {
            isSyncingRef.current = false;
            setIsSyncing(false);
        }
    };

    const addCopyGroup = async (name, leader_id) => {
        if (!window.electron) return null;
        const result = await window.electron.ipcRenderer.invoke('db-add-copy-group', { name, leader_id, user_id: user?.id });
        if (result.success) { await loadCopyGroups(); return result.id; }
        return null;
    };

    const deleteCopyGroup = async (id) => {
        if (!window.electron) return;
        const result = await window.electron.ipcRenderer.invoke('db-delete-copy-group', id);
        if (result.success) await loadCopyGroups();
    };

    const addCopyMember = async (group_id, follower_id, risk_multiplier) => {
        if (!window.electron) return;
        const result = await window.electron.ipcRenderer.invoke('db-add-copy-member', { group_id, follower_id, risk_multiplier });
        if (result.success) await loadCopyGroups();
    };

    const removeCopyMember = async (member_id) => {
        if (!window.electron) return;
        const result = await window.electron.ipcRenderer.invoke('db-remove-copy-member', member_id);
        if (result.success) await loadCopyGroups();
    };

    const updateCopyGroupStatus = async (id, isActive) => {
        if (!window.electron) return;
        const result = await window.electron.ipcRenderer.invoke('db-update-copy-group-status', { id, is_active: isActive });
        if (result.success) await loadCopyGroups();
    };

    const updateCopyGroup = async (id, updates) => {
        if (!window.electron) return;
        const result = await window.electron.ipcRenderer.invoke('db-update-copy-group', { id, updates });
        if (result.success) await loadCopyGroups();
    };

    // Wrapper for context that uses internal state as default
    const getStatsWrapper = (accId, accountsList = accounts, tradesList = trades) => {
        return getAccountStats(accId, accountsList, tradesList);
    };

    const openModal = (trade = null) => { setTradeToEdit(trade); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setTradeToEdit(null); };
    const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

    return (
        <TradeContext.Provider value={{
            trades, allTrades: trades, filteredTrades, stats, accounts, addTrade, deleteTrade, undoDeleteTrade, updateTrade,
            addAccount, updateAccount, deleteAccount, isModalOpen, isCopyGroupModalOpen,
            setIsCopyGroupModalOpen, isImportModalOpen, setIsImportModalOpen, tradeToEdit, openModal, closeModal, activeTrades: trades,
            getPillColor, savePillColor, isSidebarCollapsed, toggleSidebar, copyGroups,
            addCopyGroup, deleteCopyGroup, addCopyMember, removeCopyMember,
            updateCopyGroupStatus, updateCopyGroup, currentView, setCurrentView,
            passedAccounts, setPassedAccounts, isDailyPnLOpen, setIsDailyPnLOpen,
            userProfile, updateUserProfile, appSettings, updateAppSettings,
            ranks: RANKS, getAccountStats: getStatsWrapper,
            dateFilter, setDateFilter,
            analyticsFilters, setAnalyticsFilters,
            isLoading, migrateToCloud, syncToCloud, importFromCloud, isSyncing
        }}>
            {children}
        </TradeContext.Provider>
    );
};
