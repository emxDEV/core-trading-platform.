import React from 'react';

export default function AppBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Dark/Light Base */}
            <div className="absolute inset-0 bg-slate-50 dark:bg-[#020617] transition-colors duration-700" />

            {/* Animated Mesh Gradients - Primary Core (Liquid Pulse) */}
            <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/25 blur-[120px] rounded-full animate-mesh-1 opacity-70 mix-blend-screen" />
            <div className="absolute top-[-15%] left-[-5%] w-[60%] h-[60%] bg-violet-400/10 blur-[100px] rounded-full animate-mesh-3 opacity-30 mix-blend-soft-light" />

            {/* Secondary Pulse - Indigo Depth */}
            <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/20 blur-[100px] rounded-full animate-mesh-2 opacity-60 mix-blend-screen" />

            {/* Tertiary Flow - Tactical Emerald Mix */}
            <div className="absolute bottom-[10%] left-[5%] w-[40%] h-[40%] bg-emerald-500/15 blur-[110px] rounded-full animate-mesh-4 opacity-30 mix-blend-screen" />

            {/* Immersive Grid Overlay - Tactical Matrix */}
            <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.05]" style={{
                backgroundImage: `
                    linear-gradient(rgba(124,93,250,0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(124,93,250,0.3) 1px, transparent 1px)
                `,
                backgroundSize: '120px 120px'
            }} />

            {/* Grain Texture - Organic Feel */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay shadow-inner" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }} />

            {/* Multi-Layered Vignette - Professional Focus */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#020617] via-transparent to-[#020617]/40 opacity-40" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(2,6,23,0.6)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(124,93,250,0.05)_0%,transparent_50%)]" />
        </div>
    );
}
