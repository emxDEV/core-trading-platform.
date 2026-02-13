import React from 'react';
import { useData } from '../context/TradeContext';

const TitleBar = () => {
    const { isSyncing } = useData();
    // Detect OS if needed, but for now we'll support hiddenInset on Mac
    // and a custom bar for other platforms if frame: false was used.

    return (
        <div className="fixed top-0 left-0 w-full h-8 flex items-center justify-center z-[9999] drag-region select-none">
            <div className="flex items-center gap-2 opacity-40 group hover:opacity-100 transition-opacity duration-500 no-drag cursor-default">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] dark:text-white">core</span>
                <div className="w-1 h-1 rounded-full bg-primary" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol v1.1.3</span>
            </div>

            {/* Sync Indicator */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 no-drag cursor-default">
                <div className={`transition-all duration-500 flex items-center justify-center ${isSyncing ? 'text-primary animate-spin opacity-100' : 'text-emerald-500/40 opacity-50 hover:opacity-100'}`}>
                    <span className="material-symbols-outlined text-[14px]">
                        {isSyncing ? 'sync' : 'cloud_done'}
                    </span>
                </div>
                {isSyncing && (
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest animate-in fade-in zoom-in duration-300">Syncing</span>
                )}
            </div>

            {/* Window Controls for Windows/Linux (Platform Check) */}
            {/* If not darwin, we would add them on the right */}
        </div>
    );
};

export default TitleBar;
