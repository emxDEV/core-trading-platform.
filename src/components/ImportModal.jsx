import React, { useState } from 'react';
import { useData } from '../context/TradeContext';

export default function ImportModal() {
    const { isImportModalOpen, setIsImportModalOpen, importFromCloud } = useData();
    const [loading, setLoading] = useState(false);

    if (!isImportModalOpen) return null;

    const handleImport = async () => {
        setLoading(true);
        try {
            await importFromCloud();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setIsImportModalOpen(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                <div className="text-center relative z-10">
                    <div className="w-16 h-16 mx-auto bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                        <span className="material-symbols-outlined text-primary text-3xl">cloud_download</span>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-2">Sync Cloud Data?</h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8 px-4">
                        We've cleaned up the local workspace for your session. Would you like to synchronize your trading history from the cloud?
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setIsImportModalOpen(false)}
                            disabled={loading}
                            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors font-medium border border-white/5 disabled:opacity-50"
                        >
                            Start Fresh
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={loading}
                            className="px-4 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white transition-all font-medium shadow-lg shadow-primary/20 hover:shadow-primary/40 disabled:opacity-50 flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Sync Data</span>
                                    <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">sync</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
