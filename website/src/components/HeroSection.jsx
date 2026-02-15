import { motion } from 'framer-motion';
import { Download, ChevronRight, Apple, Monitor } from 'lucide-react';
import heroImage from '../assets/core_hero_preview_1771198115828.png';

export default function HeroSection() {
    return (
        <section className="relative min-height-screen flex flex-col items-center justify-center pt-32 pb-20 px-4 overflow-hidden">
            {/* Background Glows */}
            <div className="glow-overlay w-[600px] h-[600px] bg-cyan-500/10 -top-48 -left-48" />
            <div className="glow-overlay w-[600px] h-[600px] bg-indigo-500/10 -bottom-48 -right-48" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 text-center max-w-4xl"
            >
                <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium tracking-wider text-cyan-400 uppercase glass glass-cyan rounded-full">
                    v1.1.9 Operational
                </span>

                <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                    The Future of <span className="text-cyan-400">Tactical Trading</span>
                </h1>

                <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                    Master the markets with CORE. An immersive trading ecosystem designed for the modern operator.
                    Real-time analytics, celestial journaling, and tactical replication.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                    <button className="group flex items-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-cyan-50 transition-all active:scale-95">
                        <Apple size={20} />
                        Download for macOS
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button className="group flex items-center gap-3 px-8 py-4 glass text-white font-semibold rounded-xl hover:bg-white/5 transition-all active:scale-95">
                        <Monitor size={20} />
                        Download for Windows
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="relative z-10 w-full max-w-6xl mx-auto"
            >
                <div className="glass rounded-3xl p-2 md:p-4 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-t from-mid-void via-transparent to-transparent opacity-60 z-10" />
                    <img
                        src={heroImage}
                        alt="CORE Platform Overview"
                        className="w-full h-auto rounded-2xl transform transition-transform duration-700 group-hover:scale-[1.01]"
                    />
                </div>
            </motion.div>
        </section>
    );
}
