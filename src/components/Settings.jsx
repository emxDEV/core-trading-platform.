import React, { useState, useEffect } from 'react';
import ViewHeader from './ViewHeader';
import { createPortal } from 'react-dom';
import { useData } from '../context/TradeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { soundEngine } from '../utils/SoundEngine';

export default function Settings() {
    const { appSettings, updateAppSettings, filteredTrades, importFromCloud, t, userProfile, updateUserProfile } = useData();
    const { user, signOut, updateEmail, changePasswordWithVerify, updateDisplayName, resetPassword } = useAuth();
    const { showSuccess, showInfo } = useNotifications();

    // Account edit state
    const [contextMenu, setContextMenu] = useState(null);
    const [accountEditMode, setAccountEditMode] = useState(null); // 'name' | 'email' | 'password'
    const [accountEditValue, setAccountEditValue] = useState('');
    const [accountEditConfirm, setAccountEditConfirm] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [accountEditError, setAccountEditError] = useState('');
    const [accountEditSuccess, setAccountEditSuccess] = useState('');
    const [accountEditLoading, setAccountEditLoading] = useState(false);

    // Update state
    const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, downloading, downloaded, error, not-available
    const [updateProgress, setUpdateProgress] = useState(0);
    const [updateInfo, setUpdateInfo] = useState(null);

    useEffect(() => {
        if (!window.electron) return;

        const handleUpdaterEvent = (data) => {
            if (!data) return;
            console.log('[Updater Event]', data);
            switch (data.type) {
                case 'checking':
                    setUpdateStatus('checking');
                    break;
                case 'available':
                    setUpdateStatus('available');
                    setUpdateInfo(data.info);
                    showInfo(`Tactical update found: v${data.info.version}. Starting download...`);
                    break;
                case 'not-available':
                    setUpdateStatus('not-available');
                    showInfo("Mission critical: You are currently running the latest stable build.");
                    break;
                case 'progress':
                    setUpdateStatus('downloading');
                    setUpdateProgress(data.progress.percent);
                    break;
                case 'downloaded':
                    setUpdateStatus('downloaded');
                    setUpdateInfo(data.info);
                    showSuccess(`Update v${data.info.version} ready for extraction.`);
                    soundEngine.playSuccess();
                    break;
                case 'error':
                    setUpdateStatus('error');
                    console.error('Update error:', data.message);
                    showInfo(`Protocol scan failed: ${data.message || 'Unknown error'}`);
                    break;
                default:
                    break;
            }
        };

        window.electron.ipcRenderer.on('updater-event', handleUpdaterEvent);
        return () => {
            window.electron.ipcRenderer.removeAllListeners('updater-event');
        };
    }, []);

    const resetEditState = () => {
        setAccountEditValue('');
        setAccountEditConfirm('');
        setCurrentPassword('');
        setAccountEditError('');
        setAccountEditSuccess('');
    };

    const handleAccountUpdate = async () => {
        setAccountEditError('');
        setAccountEditSuccess('');

        if (accountEditMode === 'name') {
            if (!accountEditValue.trim()) {
                setAccountEditError('Please enter a display name');
                return;
            }
        }

        if (accountEditMode === 'email') {
            if (!accountEditValue.trim() || !accountEditValue.includes('@')) {
                setAccountEditError('Please enter a valid email address');
                return;
            }
        }

        if (accountEditMode === 'password') {
            if (!currentPassword) {
                setAccountEditError('Please enter your current password');
                return;
            }
            if (!accountEditValue || accountEditValue.length < 6) {
                setAccountEditError('New password must be at least 6 characters');
                return;
            }
            if (accountEditValue !== accountEditConfirm) {
                setAccountEditError('New passwords do not match');
                return;
            }
        }

        setAccountEditLoading(true);
        try {
            let result;
            if (accountEditMode === 'name') {
                result = await updateDisplayName(accountEditValue.trim());
            } else if (accountEditMode === 'email') {
                result = await updateEmail(accountEditValue.trim());
            } else if (accountEditMode === 'password') {
                result = await changePasswordWithVerify(currentPassword, accountEditValue);
            }

            if (result?.error) {
                setAccountEditError(result.error.message);
            } else {
                const msg = accountEditMode === 'email'
                    ? 'Verification email sent — check your inbox to confirm'
                    : accountEditMode === 'name'
                        ? 'Display name updated successfully'
                        : 'Password changed successfully';
                setAccountEditSuccess(msg);
                showSuccess(msg);
                setTimeout(() => setAccountEditMode(null), 1800);
            }
        } catch (err) {
            setAccountEditError('An unexpected error occurred');
        }
        setAccountEditLoading(false);
    };

    const handleForgotPassword = async () => {
        if (!user?.email) return;
        setAccountEditLoading(true);
        setAccountEditError('');
        try {
            const { error } = await resetPassword(user.email);
            if (error) {
                setAccountEditError(error.message);
            } else {
                setAccountEditSuccess('Password reset email sent — check your inbox');
                showSuccess('Password reset email sent');
                setTimeout(() => setAccountEditMode(null), 2000);
            }
        } catch {
            setAccountEditError('Failed to send reset email');
        }
        setAccountEditLoading(false);
    };

    const handleExportData = () => {
        if (!filteredTrades.length) {
            showInfo("No tactical records found to export.");
            return;
        }

        const headers = ['Date', 'Symbol', 'Account', 'Model', 'Session', 'Side', 'PNL', 'Notes'];
        const csvContent = [
            headers.join(','),
            ...filteredTrades.map(t => [
                t.date,
                t.symbol,
                t.account_name,
                t.model,
                t.trade_session,
                t.side,
                t.pnl,
                `"${(t.notes || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `tactical_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        soundEngine.playSuccess();
        showSuccess('Tactical records exported to CSV');
    };

    const toggleSetting = (key) => {
        soundEngine.playClick();
        updateAppSettings({ [key]: !appSettings[key] });
        showInfo(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} synchronized`);
    };




    const handleImportFromCloud = async () => {
        if (!appSettings.cloudSync) {
            showInfo("Please enable Neural Sync (Cloud Sync) first.");
            return;
        }

        soundEngine.playClick();
        showInfo("Syncing data from cloud...");

        const result = await importFromCloud();

        if (result.success) {
            soundEngine.playSuccess();
            showSuccess(result.message);
        } else {
            soundEngine.playError();
            showInfo(`Sync failed: ${result.error || result.message}`);
        }
    };

    const handleResetData = async () => {
        soundEngine.playError();
        if (window.confirm('CRITICAL: Purge all tactical records? This action is irreversible.')) {
            try {
                if (window.electron) {
                    const result = await window.electron.ipcRenderer.invoke('db-clear-all');
                    if (result.success) {
                        showSuccess('Data base purged');
                        setTimeout(() => window.location.reload(), 1000);
                    }
                }
            } catch (err) {
                showInfo('Purge failed');
            }
        }
    };

    const [tempGeminiKey, setTempGeminiKey] = useState(localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
    const handleSaveGeminiKey = () => {
        localStorage.setItem('gemini_api_key', tempGeminiKey);
        showSuccess('Neural Key synchronized successfully.');
        soundEngine.playSuccess();
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <ViewHeader
                title="System"
                accent="Settings"
                subtitle="Terminal configuration & user preferences"
                icon="settings"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Main Settings Area */}
                <div className="lg:col-span-8 space-y-4">

                    {/* Trading Block */}
                    <div className="bg-slate-900/40 backdrop-blur-[45px] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                        {/* Glass Reflection Highlight */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/[0.03] blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/[0.05] transition-colors duration-1000" />

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-sm">
                                <span className="material-symbols-outlined text-emerald-500 text-[24px]">query_stats</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight uppercase tracking-widest leading-none">Risk & Trading Metrics</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <MetricToggle
                                icon="percent"
                                label="PnL Relativity"
                                description="Calculate PnL in percentage by default"
                                enabled={appSettings.showPnLInPercent}
                                onClick={() => toggleSetting('showPnLInPercent')}
                            />
                            <MetricToggle
                                icon="sync_saved_locally"
                                label="Instant Commit"
                                description="Auto-save entries on modal close"
                                enabled={appSettings.autoSaveTrades}
                                onClick={() => toggleSetting('autoSaveTrades')}
                            />
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-8 flex items-center justify-between gap-6 hover:bg-white/[0.02] transition-all duration-500">
                            <div>
                                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] mb-1">Standard Risk Exposure</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Default value for new deployments</p>
                            </div>
                            <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={appSettings.defaultRiskPerc || 1.0}
                                    onChange={(e) => updateAppSettings({ defaultRiskPerc: parseFloat(e.target.value) })}
                                    className="w-16 bg-transparent text-sm font-black text-slate-800 dark:text-white text-center focus:outline-none"
                                />
                                <span className="text-[10px] font-black text-primary uppercase pr-2">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Privacy Block */}
                    <div className="bg-slate-900/40 backdrop-blur-[45px] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                        {/* Glass Reflection Highlight */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-sm">
                                <span className="material-symbols-outlined text-indigo-500 text-[24px]">visibility_off</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight uppercase tracking-widest leading-none">Privacy & Experience</h3>
                        </div>

                        <div className="space-y-4">
                            <ProtocolRow
                                icon="lock"
                                label="Shadow Protocol"
                                description="Mask account balances and capital figures globally"
                                enabled={appSettings.maskBalances}
                                onClick={() => toggleSetting('maskBalances')}
                            />
                            <ProtocolRow
                                icon="keyboard"
                                label="Neural Shortcuts"
                                description="Expert keyboard navigation (CMD+K, etc.)"
                                enabled={appSettings.enableShortcuts}
                                onClick={() => toggleSetting('enableShortcuts')}
                            />
                            <ProtocolRow
                                icon="hide_source"
                                label="Privacy Mode: Daily PnL"
                                description="Hide initial account capital on Daily PnL report"
                                enabled={appSettings.hideCapitalOnDailyPnL}
                                onClick={() => toggleSetting('hideCapitalOnDailyPnL')}
                            />
                        </div>
                    </div>

                    {/* Sound Block */}
                    <div className="bg-slate-900/40 backdrop-blur-[45px] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                        {/* Glass Reflection Highlight */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-sm">
                                <span className="material-symbols-outlined text-amber-500 text-[24px]">volume_up</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight uppercase tracking-widest leading-none">Tactical Audio</h3>
                        </div>

                        <div className="space-y-6">
                            <ProtocolRow
                                icon={appSettings.soundEnabled ? "volume_up" : "volume_off"}
                                label="Audio Feedback"
                                description="Experimental sound signals for tactical actions"
                                enabled={appSettings.soundEnabled}
                                onClick={() => toggleSetting('soundEnabled')}
                            />

                            <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-6 flex items-center justify-between gap-6">
                                <div className="flex-1">
                                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] mb-1">Signal Intensity</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Global volume for tactical ticks</p>
                                </div>
                                <div className="flex items-center gap-4 w-48">
                                    <span className="material-symbols-outlined text-slate-400 text-sm">volume_mute</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={appSettings.soundVolume || 0.5}
                                        onChange={(e) => updateAppSettings({ soundVolume: parseFloat(e.target.value) })}
                                        className="flex-1 accent-primary h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="material-symbols-outlined text-slate-400 text-sm">volume_up</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Configuration Block */}
                    <div className="bg-slate-900/40 backdrop-blur-[45px] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] mt-4">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-sm">
                                <span className="material-symbols-outlined text-purple-500 text-[24px]">psychology</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight uppercase tracking-widest leading-none">AI Intelligence Engine</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Configure your neural network connection</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-8 space-y-4">
                                <div>
                                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] mb-1">Gemini API Token</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Required for fact-based trade analysis</p>
                                </div>
                                <div className="flex gap-4">
                                    <input
                                        type="password"
                                        value={tempGeminiKey}
                                        onChange={(e) => setTempGeminiKey(e.target.value)}
                                        className="flex-1 bg-white dark:bg-slate-800 px-6 py-4 rounded-xl border border-slate-200 dark:border-white/5 text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-primary/50 transition-all"
                                        placeholder="Enter your Gemini API key..."
                                    />
                                    <button
                                        onClick={handleSaveGeminiKey}
                                        className="px-8 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                                    >
                                        Save Key
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                    <span className="material-symbols-outlined text-slate-500 text-sm">info</span>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic">
                                        Your key is stored locally and used only for analysis queries.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Settings Area */}
                <div className="lg:col-span-4 space-y-4">

                    {/* Intel Card */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-[2.5rem] p-8 text-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                        {/* Glass Reflection Highlight */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 transition-transform duration-[3s] group-hover:scale-125" />

                        <h4 className="text-xl font-black mb-6 leading-none tracking-tighter uppercase italic opacity-90">Operational Intel</h4>

                        <div className="space-y-6 mb-8 border-b border-white/5 pb-6">
                            <div className="flex justify-between items-center group/item">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 group-hover/item:text-white/70 transition-opacity">Engine</span>
                                <span className="text-sm font-black text-cyan-400 uppercase tracking-tighter">Core v4.2.0</span>
                            </div>
                            <div className="flex justify-between items-center group/item">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 group-hover/item:text-white/70 transition-opacity">Connectivity</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" />
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
                                </div>
                            </div>
                        </div>

                        <MetricToggle
                            icon="cloud_sync"
                            label="Neural Sync"
                            description="Real-time tactical persistence"
                            enabled={appSettings.cloudSync}
                            onClick={() => toggleSetting('cloudSync')}
                            theme="dark"
                        />
                    </div>

                    {/* Localization */}
                    <div className="bg-slate-900/40 backdrop-blur-[45px] border border-white/10 rounded-[2.5rem] p-8 relative shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] space-y-8">
                        {/* Glass Reflection Highlight */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] px-2 opacity-50 italic">{t('localization')}</h4>

                        <div className="space-y-6">
                            <TacticalSelect
                                label={t('base_currency')}
                                value={appSettings.currency || 'USD'}
                                icon="payments"
                                options={['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD']}
                                onChange={(val) => updateAppSettings({ currency: val })}
                            />
                            <TacticalSelect
                                label={t('timezone')}
                                value={appSettings.timezone || 'UTC +1 (Madrid/Paris)'}
                                icon="public"
                                options={[
                                    'UTC -12 (Baker Island)', 'UTC -11 (American Samoa)', 'UTC -10 (Hawaii)',
                                    'UTC -9 (Alaska)', 'UTC -8 (Pacific Time)', 'UTC -7 (Mountain Time)',
                                    'UTC -6 (Central Time)', 'UTC -5 (Eastern Time)', 'UTC -4 (Atlantic Time)',
                                    'UTC -3 (Argentina)', 'UTC -2 (South Georgia)', 'UTC -1 (Azores)',
                                    'UTC +0 (London)', 'UTC +1 (Madrid/Paris)', 'UTC +2 (Cairo/Athens)',
                                    'UTC +3 (Moscow/Dubai)', 'UTC +4 (Abu Dhabi)', 'UTC +5 (Karachi)',
                                    'UTC +6 (Dhaka)', 'UTC +7 (Bangkok)', 'UTC +8 (Singapore/Hong Kong)',
                                    'UTC +9 (Tokyo/Seoul)', 'UTC +10 (Sydney/Brisbane)', 'UTC +11 (Solomon Islands)',
                                    'UTC +12 (Auckland)', 'UTC +13 (Samoa)', 'UTC +14 (Line Islands)'
                                ]}
                                onChange={(val) => updateAppSettings({ timezone: val })}
                            />
                            <TacticalSelect
                                label={t('language')}
                                value={appSettings.language || 'English (US)'}
                                icon="language"
                                options={['English (US)', 'German', 'Spanish']}
                                onChange={(val) => updateAppSettings({ language: val })}
                            />
                            <TacticalSelect
                                label={t('week_start')}
                                value={appSettings.weekStart === 'MO' ? t('monday') : t('sunday')}
                                icon="calendar_today"
                                options={[t('monday'), t('sunday')]}
                                onChange={(val) => updateAppSettings({ weekStart: val === t('monday') ? 'MO' : 'SU' })}
                            />
                        </div>
                    </div>
                </div>

                {/* Data Persistence */}
                <div className="lg:col-span-12 mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-8 px-2">Data Management</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Tactical Export */}
                        <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl flex items-center justify-between group transition-all hover:bg-white/[0.02]">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-3 shadow-sm">
                                    <span className="material-symbols-outlined text-sky-500 text-[28px]">system_update_alt</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black dark:text-white uppercase tracking-widest">Tactical Export</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Dump trade history to CSV</p>
                                </div>
                            </div>
                            <button
                                onClick={handleExportData}
                                className="px-6 py-4 bg-sky-500 text-white shadow-lg shadow-sky-500/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-sky-400 transition-all active:scale-95"
                            >
                                Export Records
                            </button>
                        </div>

                        {/* Sync with Cloud */}
                        <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl flex items-center justify-between group transition-all hover:bg-amber-500/[0.02]">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-180 shadow-sm">
                                    <span className="material-symbols-outlined text-amber-500 text-[28px]">sync</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black dark:text-white uppercase tracking-widest">Sync with Cloud</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Synchronize workspace state</p>
                                </div>
                            </div>
                            <button
                                onClick={handleImportFromCloud}
                                className="px-6 py-4 bg-amber-500 text-white shadow-lg shadow-amber-500/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-amber-400 transition-all active:scale-95"
                            >
                                Sync Now
                            </button>
                        </div>

                        {/* Hard Reset */}
                        <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl flex items-center justify-between group transition-all hover:bg-rose-500/[0.02]">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-[-3deg] shadow-sm">
                                    <span className="material-symbols-outlined text-rose-500 text-[28px]">dangerous</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black dark:text-white uppercase tracking-widest">Hard Reset</p>
                                    <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest italic">Wipe all local persistence</p>
                                </div>
                            </div>
                            <button
                                onClick={handleResetData}
                                className="px-6 py-4 bg-white dark:bg-black/20 border border-rose-500/30 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm"
                            >
                                Purge System
                            </button>
                        </div>
                    </div>
                </div>

                {/* System & Updates */}
                <div className="lg:col-span-12 mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-8 px-2">System Infrastructure</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                                    <span className="material-symbols-outlined text-primary text-[28px]">terminal</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black dark:text-white uppercase tracking-widest mb-1">Protocol Version</p>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic">Build 1.1.3-stable</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {updateStatus === 'downloading' && (
                                    <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                                        <div className="flex justify-between w-full">
                                            <span className="text-[8px] font-black text-primary uppercase tracking-widest">Downloading...</span>
                                            <span className="text-[8px] font-black text-white">{Math.round(updateProgress)}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${updateProgress}%` }} />
                                        </div>
                                    </div>
                                )}

                                {updateStatus === 'downloaded' ? (
                                    <button
                                        onClick={() => {
                                            soundEngine.playClick();
                                            window.electron.ipcRenderer.invoke('restart-and-install');
                                        }}
                                        className="px-5 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 animate-pulse"
                                    >
                                        Install & Restart
                                    </button>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            if (updateStatus === 'checking' || updateStatus === 'downloading') return;

                                            showInfo("Scanning for protocol updates...");
                                            if (window.electron) {
                                                const result = await window.electron.ipcRenderer.invoke('check-for-updates');
                                                if (!result.success) {
                                                    showInfo(result.message || "Scan failed.");
                                                }
                                            } else {
                                                setTimeout(() => showSuccess("You are running the latest stable build."), 2000);
                                            }
                                        }}
                                        disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                                        className={`px-5 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm ${(updateStatus === 'checking' || updateStatus === 'downloading') ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                    >
                                        {updateStatus === 'checking' ? 'Scanning...' : 'Check for Updates'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                                    <span className="material-symbols-outlined text-emerald-500 text-[28px]">speed</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black dark:text-white uppercase tracking-widest mb-1">Engine Status</p>
                                    <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest italic">Operational</p>
                                </div>
                            </div>
                            <div className="px-4 py-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">
                                Latency: 12ms
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Section */}
                <div className="lg:col-span-12 mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 px-2">Account</h3>
                    <div
                        className="p-6 bg-slate-900/40 backdrop-blur-[45px] border border-white/10 rounded-[2.5rem] flex items-center justify-between group transition-all relative overflow-hidden cursor-context-menu shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY });
                        }}
                    >
                        {/* Glass Reflection Highlight */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20">
                                <span className="material-symbols-outlined text-white text-[24px]">person</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-black dark:text-white uppercase tracking-widest">
                                    {user?.user_metadata?.display_name || 'Trader'}
                                </p>
                                <p className="text-[10px] text-slate-500 font-bold tracking-wide">
                                    {user?.email}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                soundEngine.playClick();
                                await signOut();
                            }}
                            className="px-6 py-4 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all active:scale-95 shadow-sm"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* Right-Click Context Menu */}
                {contextMenu && createPortal(
                    <div className="fixed inset-0 z-[9998]" onClick={() => setContextMenu(null)}>
                        <div
                            className="absolute bg-slate-900/95 backdrop-blur-[45px] border border-white/10 rounded-3xl shadow-2xl shadow-black/50 py-2 min-w-[220px] overflow-hidden"
                            style={{ top: contextMenu.y, left: contextMenu.x, animation: 'fadeIn 0.15s ease' }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Glass Reflection Highlight */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                            <div className="px-4 py-2.5 border-b border-white/5 mb-1">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Account Settings</p>
                            </div>
                            {[
                                { icon: 'badge', label: 'Change Display Name', action: 'name' },
                                { icon: 'mail', label: 'Change Email', action: 'email' },
                                { icon: 'lock', label: 'Change Password', action: 'password' },
                            ].map((item) => (
                                <button
                                    key={item.action}
                                    onClick={() => {
                                        soundEngine.playClick();
                                        setAccountEditMode(item.action);
                                        resetEditState();
                                        setContextMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-all text-left"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-slate-500">{item.icon}</span>
                                    <span className="font-bold text-xs tracking-wide">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>,
                    document.body)}

                {/* Account Edit Modal */}
                {accountEditMode && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-8 bg-background-dark/95 backdrop-blur-3xl" style={{ animation: 'fadeIn 0.3s ease' }} onClick={() => setAccountEditMode(null)}>
                        <div className="w-full max-w-md bg-surface-dark border border-white/10 rounded-[2rem] shadow-2xl p-10" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <span className="material-symbols-outlined text-primary text-[24px]">
                                        {accountEditMode === 'name' ? 'badge' : accountEditMode === 'email' ? 'mail' : 'lock'}
                                    </span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">
                                        {accountEditMode === 'name' ? 'Change Display Name' : accountEditMode === 'email' ? 'Change Email' : 'Change Password'}
                                    </h2>
                                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em] mt-1">
                                        {accountEditMode === 'email' ? 'Verification sent to current email' : accountEditMode === 'password' ? 'Verify identity first' : 'Update your identity'}
                                    </p>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="space-y-5 mb-8">
                                {/* ── Display Name ── */}
                                {accountEditMode === 'name' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">New Display Name</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={accountEditValue}
                                            onChange={e => setAccountEditValue(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAccountUpdate()}
                                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-black uppercase tracking-widest placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                            placeholder={user?.user_metadata?.display_name || 'Enter name'}
                                        />
                                    </div>
                                )}

                                {/* ── Change Email ── */}
                                {accountEditMode === 'email' && (
                                    <>
                                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex items-start gap-3">
                                            <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">info</span>
                                            <div>
                                                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                                    A verification link will be sent to <span className="font-black text-white">{user?.email}</span> to confirm this change.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">New Email Address</label>
                                            <input
                                                autoFocus
                                                type="email"
                                                value={accountEditValue}
                                                onChange={e => setAccountEditValue(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAccountUpdate()}
                                                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-medium placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                                placeholder="new@email.com"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* ── Change Password ── */}
                                {accountEditMode === 'password' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Current Password</label>
                                            <input
                                                autoFocus
                                                type="password"
                                                value={currentPassword}
                                                onChange={e => setCurrentPassword(e.target.value)}
                                                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-medium placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                                placeholder="Enter current password"
                                            />
                                        </div>

                                        <div className="h-px bg-white/5 my-2" />

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">New Password</label>
                                            <input
                                                type="password"
                                                value={accountEditValue}
                                                onChange={e => setAccountEditValue(e.target.value)}
                                                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-medium placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                                placeholder="Min. 6 characters"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Confirm New Password</label>
                                            <input
                                                type="password"
                                                value={accountEditConfirm}
                                                onChange={e => setAccountEditConfirm(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAccountUpdate()}
                                                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-medium placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                                placeholder="Repeat new password"
                                            />
                                        </div>

                                        <button
                                            onClick={handleForgotPassword}
                                            disabled={accountEditLoading}
                                            className="text-xs text-primary/70 hover:text-primary font-bold tracking-wide transition-colors pl-1 mt-1"
                                        >
                                            Forgot Password? Send reset email →
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Error / Success */}
                            {accountEditError && (
                                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
                                    <span className="material-symbols-outlined text-rose-400 text-[18px]">error</span>
                                    <span className="text-xs text-rose-400 font-bold">{accountEditError}</span>
                                </div>
                            )}
                            {accountEditSuccess && (
                                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                                    <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                                    <span className="text-xs text-emerald-400 font-bold">{accountEditSuccess}</span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setAccountEditMode(null)}
                                    className="flex-1 py-4 bg-white/5 border border-white/10 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAccountUpdate}
                                    disabled={accountEditLoading}
                                    className="flex-[2] py-4 bg-gradient-to-r from-primary to-violet-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {accountEditLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-lg">check</span>
                                            {accountEditMode === 'email' ? 'Send Verification' : 'Confirm'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body)}
            </div>
        </div>
    );
}

function MetricToggle({ icon, label, description, enabled, onClick, theme = "light" }) {
    return (
        <button
            onClick={onClick}
            className={`p-6 rounded-2xl border transition-all duration-500 text-left group flex flex-col items-start w-full relative overflow-hidden ${theme === 'dark'
                ? 'bg-white/5 border-white/10 hover:bg-white/15'
                : enabled
                    ? 'bg-primary/[0.05] border-primary/30 shadow-inner'
                    : 'bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/80 hover:border-primary/20 hover:bg-white/[0.02]'
                }`}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-6 transition-all duration-700 shadow-sm ${enabled ? 'bg-primary text-white scale-105' : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:text-primary border border-transparent dark:border-white/5'
                }`}>
                <span className="material-symbols-outlined text-[24px]">{icon}</span>
            </div>
            <h4 className={`text-xs font-black uppercase tracking-[0.2em] mb-2 ${enabled ? 'text-primary' : 'text-slate-800 dark:text-slate-200 group-hover:text-white'}`}>{label}</h4>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed line-clamp-2">
                {description}
            </p>
        </button>
    );
}

function ProtocolRow({ icon, label, description, enabled, onClick }) {
    return (
        <div className="flex items-center gap-5 p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:bg-white/[0.04] hover:border-primary/10 transition-all duration-500 shadow-sm">
            <div className={`w-[48px] h-[48px] rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center transition-all duration-700 shadow-sm ${enabled ? 'text-primary border-primary/20 scale-105' : 'text-slate-400'}`}>
                <span className={`material-symbols-outlined text-[24px] ${enabled ? 'font-fill' : ''}`}>{icon}</span>
            </div>
            <div className="flex-1">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.2em] mb-1 group-hover:text-primary transition-colors leading-none">{label}</h4>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-relaxed mt-1 group-hover:text-slate-400 transition-colors uppercase italic">{description}</p>
            </div>
            <button
                onClick={onClick}
                className={`w-16 h-8 rounded-full p-1 transition-all duration-700 relative flex items-center shadow-inner ${enabled ? 'bg-emerald-500/80' : 'bg-slate-200 dark:bg-white/10'}`}
            >
                <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-[0.8s] cubic-bezier(0.34,1.56,0.64,1) ${enabled ? 'translate-x-8' : 'translate-x-0'}`} />
            </button>
        </div>
    );
}

function TacticalSelect({ label, value, icon, options, onChange }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="space-y-3 relative group">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] block px-1 group-hover:text-primary transition-colors">{label}</label>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-5 bg-white/[0.03] border border-white/5 rounded-xl group-hover:bg-white/[0.06] transition-all duration-300 text-left shadow-sm"
            >
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-slate-400 text-[20px] group-hover:text-primary transition-colors">{icon}</span>
                    <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">{value}</span>
                </div>
                <span className={`material-symbols-outlined text-slate-400 text-[18px] transition-all duration-500 ${isOpen ? 'rotate-180 text-primary' : ''}`}>expand_more</span>
            </button>

            {isOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-3 bg-slate-900/95 backdrop-blur-[45px] border border-white/10 rounded-[2rem] shadow-2xl overflow-y-auto max-h-[400px] p-2 animate-in fade-in slide-in-from-top-4 duration-500 custom-scrollbar">
                    {/* Glass Reflection Highlight */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                    {options.map(opt => (
                        <button
                            key={opt}
                            onClick={() => {
                                soundEngine.playClick();
                                onChange(opt);
                                setIsOpen(false);
                            }}
                            className={`w-full px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest rounded-xl transition-all mb-1 last:mb-0 ${opt === value ? 'bg-primary text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

