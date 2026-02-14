import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function UpdateSummaryModal({ version, onClose }) {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        setIsAnimating(true);
    }, []);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(onClose, 700);
    };

    const updates = [
        {
            title: 'Atmospheric App Background',
            description: 'Experience a living workspace with our new dynamic mesh gradient engine, featuring organic textures and professional vignette depth.',
            icon: 'auto_awesome'
        },
        {
            title: 'Liquid Glass Design',
            description: 'The entire interface has been upgraded to an ultra-transparent Liquid Glass system, offering better visual flow and premium backdrop interactions.',
            icon: 'opacity'
        },
        {
            title: 'Performance Hub Optimization',
            description: 'Major refinements to modal scaling and internal scrolling logic for the Daily PnL and Command Center terminals.',
            icon: 'speed'
        },
        {
            title: 'Tactical UI Refinements',
            description: 'Higher-fidelity iconography and professional lighting highlights across all tactical modules.',
            icon: 'rebase_edit'
        }
    ];

    return createPortal(
        <div
            className={`fixed inset-0 z-[2000] flex items-center justify-center p-6 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isAnimating ? 'bg-slate-950/90 backdrop-blur-xl opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`}
            onClick={handleClose}
        >
            <div
                className={`w-full max-w-2xl bg-slate-900/40 backdrop-blur-[45px] border border-white/10 rounded-[3.5rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform relative flex flex-col ${isAnimating ? 'scale-100 translate-y-0 opacity-100 blur-0' : 'scale-[0.9] translate-y-20 opacity-0 blur-2xl'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Glass Reflection Highlight */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                {/* Animated Background Accent */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse" />

                <div className="p-10 relative z-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-3xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-6 shadow-2xl shadow-primary/20 animate-bounce-subtle">
                        <span className="material-symbols-outlined text-primary text-4xl">system_update_alt</span>
                    </div>

                    <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-2 leading-none">System Update Successful</h2>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic mb-8">
                        Welcome to CORE <span className="text-primary-light">v{version}</span>
                    </h1>

                    <div className="grid grid-cols-1 gap-4 w-full text-left">
                        {updates.map((update, idx) => (
                            <div
                                key={idx}
                                className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group"
                                style={{ transitionDelay: `${idx * 100}ms` }}
                            >
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-xl">{update.icon}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1">{update.title}</h3>
                                        <p className="text-xs text-slate-400 leading-relaxed">{update.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleClose}
                        className="mt-10 w-full py-4 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                    >
                        Initialize Workspace
                    </button>

                    <div className="mt-6 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">All Systems Operational • {version}</span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
