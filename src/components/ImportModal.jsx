import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useData } from '../context/TradeContext';
import { useNotifications } from '../context/NotificationContext';

export default function ImportModal() {
    const {
        isImportModalOpen,
        setIsImportModalOpen,
        importFromCloud,
        accounts,
        addTrade,
        trades,
        formatCurrency
    } = useData();
    const { showSuccess, showError, showWarning } = useNotifications();

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('cloud'); // 'cloud' or 'csv'
    const [dragActive, setDragActive] = useState(false);
    const [importData, setImportData] = useState(null); // { trades: [], filename: '' }
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [mapping, setMapping] = useState({}); // { csvCol: tradeField }
    const [step, setStep] = useState('upload'); // 'upload', 'mapping', 'preview'

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts]);

    if (!isImportModalOpen) return null;

    const handleCloudImport = async () => {
        setLoading(true);
        try {
            await importFromCloud();
            showSuccess("Intelligence Core Synchronized");
        } catch (e) {
            showError("Cloud Uplink Terminated: " + e.message);
        } finally {
            setLoading(false);
            setIsImportModalOpen(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const processFile = (file) => {
        if (!file.name.endsWith('.csv')) {
            showWarning("Operational Error: File must be in .CSV format");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
            if (rows.length < 2) {
                showError("Zero-Data Payload: CSV is empty");
                return;
            }

            const headers = rows[0];
            const dataRows = rows.slice(1).filter(r => r.length > 1);

            setImportData({
                filename: file.name,
                headers,
                rows: dataRows
            });

            // Try auto-mapping
            const autoMap = {};
            const h = headers.map(s => s.toLowerCase());

            // MT4/MT5 / Standard Guesses
            const indexMap = {
                symbol: h.findIndex(s => s.includes('symbol') || s.includes('item') || s.includes('ticker') || s.includes('asset')),
                date: h.findIndex(s => s.includes('time') || s.includes('date') || s.includes('open') || s.includes('closed')),
                pnl: h.findIndex(s => s.includes('profit') || s.includes('pnl') || s.includes('gain') || s.includes('amount')),
                side: h.findIndex(s => s.includes('type') || s.includes('side') || s.includes('action')),
                size: h.findIndex(s => s.includes('size') || s.includes('lot') || s.includes('volume') || s.includes('qty'))
            };

            Object.entries(indexMap).forEach(([field, idx]) => {
                if (idx !== -1) autoMap[field] = headers[idx];
            });

            setMapping(autoMap);
            setStep('mapping');
        };
        reader.readAsText(file);
    };

    const finalizeImport = async () => {
        if (!selectedAccountId) {
            showWarning("Deployment Vector Required: Select an account");
            return;
        }

        setLoading(true);
        try {
            const tradesToImport = importData.rows.map(row => {
                const getVal = (field) => {
                    const colName = mapping[field];
                    const idx = importData.headers.indexOf(colName);
                    return idx !== -1 ? row[idx] : null;
                };

                // Date Parsing
                let rawDate = getVal('date') || new Date().toISOString();
                let dateStr = rawDate.split(' ')[0]; // Try YYYY-MM-DD
                if (dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    // Assume MM/DD/YYYY or DD/MM/YYYY - need guessing? Let's just try to parse
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
                }

                // PnL Parsing
                let pnlValue = parseFloat((getVal('pnl') || '0').replace(/[^0-9.-]+/g, '')) || 0;

                return {
                    account_id: parseInt(selectedAccountId),
                    symbol: (getVal('symbol') || 'UNKNOWN').toUpperCase(),
                    pnl: pnlValue,
                    date: dateStr,
                    side: (getVal('side') || 'LONG').toUpperCase().includes('BUY') || (getVal('side') || '').toUpperCase().includes('LONG') ? 'LONG' : 'SHORT',
                    model: 'CSV Import',
                    comment_fazit: `Imported from ${importData.filename}`
                };
            });

            console.log(`[Import] Importing ${tradesToImport.length} trades into account ${selectedAccountId}`);
            let count = 0;
            for (const t of tradesToImport) {
                await addTrade(t);
                count++;
            }

            showSuccess(`Operation Successful: ${count} trades deployed to matrix`);
            setIsImportModalOpen(false);
        } catch (e) {
            showError("Data Corruption: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-6 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isImportModalOpen ? 'bg-slate-950/80 backdrop-blur-xl opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`} onClick={() => setIsImportModalOpen(false)}>
            <div
                className={`w-full max-w-2xl bg-slate-900/40 backdrop-blur-[45px] border border-white/10 rounded-[3.5rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform relative flex flex-col max-h-[90vh] ${isImportModalOpen ? 'scale-100 translate-y-0 opacity-100 blur-0' : 'scale-[0.9] translate-y-20 opacity-0 blur-2xl'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Glass Reflection Highlight */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                {/* Header Section */}
                <div className="p-8 pb-4 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Intelligence Hub</h2>
                            <p className="text-slate-500 text-xs font-bold tracking-[0.2em] uppercase mt-1">Data Ingestion Center</p>
                        </div>
                        <button
                            onClick={() => setIsImportModalOpen(false)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-white transition-all"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>

                    <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
                        <SelectionTab
                            active={activeTab === 'cloud'}
                            onClick={() => setActiveTab('cloud')}
                            icon="cloud_sync"
                            label="Cloud Uplink"
                        />
                        <SelectionTab
                            active={activeTab === 'csv'}
                            onClick={() => setActiveTab('csv')}
                            icon="upload_file"
                            label="CSV Vector"
                        />
                    </div>
                </div>

                {/* Body Section */}
                <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                    {activeTab === 'cloud' ? (
                        <div className="text-center py-6">
                            <div className="w-20 h-20 mx-auto bg-primary/10 border border-primary/20 rounded-[2rem] flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(124,58,237,0.2)]">
                                <span className="material-symbols-outlined text-primary text-4xl animate-pulse">sync</span>
                            </div>
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-4">Cloud Core Synchronization</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-md mx-auto italic font-medium">
                                We've detected a clean local workspace. Establish a secure uplink to synchronize your global trading history and account parameters from our primary cloud network.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setIsImportModalOpen(false)}
                                    className="px-6 py-4 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all font-black uppercase text-[10px] tracking-widest"
                                >
                                    Start Fresh
                                </button>
                                <button
                                    onClick={handleCloudImport}
                                    disabled={loading}
                                    className="px-6 py-4 rounded-xl bg-primary text-white transition-all font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-primary/20 hover:shadow-primary/40 disabled:opacity-50 flex items-center justify-center gap-3 group relative overflow-hidden"
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>Initialize Uplink</span>
                                            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">bolt</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {step === 'upload' && (
                                <div
                                    className={`relative group border-2 border-dashed rounded-[2.5rem] p-12 text-center transition-all duration-500 cursor-pointer overflow-hidden
                                        ${dragActive ? 'border-primary bg-primary/10 scale-[0.98]' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'}`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".csv"
                                        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                                    />

                                    <div className={`w-20 h-20 mx-auto rounded-[2rem] flex items-center justify-center mb-6 border transition-all duration-500
                                        ${dragActive ? 'bg-primary text-white border-primary shadow-[0_0_30px_rgba(124,58,237,0.4)]' : 'bg-white/5 text-slate-500 border-white/10 group-hover:text-primary group-hover:border-primary/50'}`}>
                                        <span className={`material-symbols-outlined text-4xl ${dragActive ? 'animate-bounce' : ''}`}>upload_file</span>
                                    </div>

                                    <h4 className="text-lg font-black text-white italic tracking-tight uppercase">Deploy CSV Intelligence</h4>
                                    <p className="text-slate-500 text-xs mt-3 font-bold tracking-widest uppercase italic">Drag & Drop or click to ingest</p>

                                    {/* Format Badges */}
                                    <div className="flex items-center justify-center gap-4 mt-8">
                                        <FormatBadge label="MT4/MT5" />
                                        <FormatBadge label="TradingView" />
                                        <FormatBadge label="Standard" />
                                    </div>

                                    {dragActive && (
                                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                                            <span className="text-2xl font-black text-white uppercase italic tracking-widest drop-shadow-glow">Release to Ingest</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 'mapping' && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-primary">description</span>
                                            <div>
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selected Payload</div>
                                                <div className="text-sm font-black text-white italic">{importData.filename}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setStep('upload')}
                                            className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
                                        >
                                            Change
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-2">
                                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Target Account</h5>
                                        </div>
                                        <select
                                            value={selectedAccountId}
                                            onChange={(e) => setSelectedAccountId(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 font-black text-white text-sm outline-none focus:border-primary/50 transition-all appearance-none italic"
                                        >
                                            <option value="" disabled>Select Operational Matrix...</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-4">
                                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Column Intelligence Mapping</h5>
                                        <div className="grid grid-cols-2 gap-3">
                                            <MappingField label="Symbol" field="symbol" mapping={mapping} setMapping={setMapping} headers={importData.headers} />
                                            <MappingField label="Date/Time" field="date" mapping={mapping} setMapping={setMapping} headers={importData.headers} />
                                            <MappingField label="PnL/Profit" field="pnl" mapping={mapping} setMapping={setMapping} headers={importData.headers} />
                                            <MappingField label="Side/Type" field="side" mapping={mapping} setMapping={setMapping} headers={importData.headers} />
                                        </div>
                                    </div>

                                    <button
                                        onClick={finalizeImport}
                                        disabled={loading || !selectedAccountId}
                                        className="w-full py-5 bg-primary text-white font-black uppercase text-xs tracking-[0.25em] rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-3 mt-4"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <span>Deploy {importData.rows.length} Executions</span>
                                                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="p-8 bg-black/40 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(124,58,237,0.5)]" />
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">Intelligence Protocol V2.0</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px] text-slate-700">security_update_good</span>
                        <span className="text-[9px] font-bold text-slate-700 uppercase tracking-tighter">Secure Data Stream</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SelectionTab({ active, onClick, icon, label }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl transition-all duration-300 relative overflow-hidden
                ${active ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
        >
            <span className={`material-symbols-outlined text-xl transition-transform duration-500 ${active ? 'scale-110 drop-shadow-glow' : 'opacity-50'}`}>{icon}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.15em]">{label}</span>
            {active && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary animate-in fade-in zoom-in-x duration-500" />
            )}
        </button>
    );
}

function FormatBadge({ label }) {
    return (
        <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    );
}

function MappingField({ label, field, mapping, setMapping, headers }) {
    return (
        <div className="space-y-1.5">
            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">{label}</div>
            <select
                value={mapping[field] || ''}
                onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-300 outline-none focus:border-primary/40 focus:bg-primary/5 transition-all appearance-none"
            >
                <option value="">Skip Field</option>
                {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                ))}
            </select>
        </div>
    );
}
