import { motion } from 'framer-motion';
import { Apple, Monitor, ChevronRight } from 'lucide-react';

export default function DownloadCTA() {
    return (
        <section className="py-24 px-4 bg-gradient-to-t from-cyan-900/20 to-transparent">
            <div className="max-w-4xl mx-auto text-center glass p-12 md:p-20 rounded-[3rem] border-cyan-500/20 relative overflow-hidden group">
                <div className="glow-overlay w-96 h-96 bg-cyan-500/20 -top-20 -left-20 group-hover:scale-110 transition-transform duration-1000" />

                <h2 className="text-4xl md:text-6xl font-bold mb-8">Ready to <span className="text-mid-spark">Calibrate?</span></h2>
                <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                    Join the elite group of operators who have elevated their edge.
                    CORE is the standard in tactical trade management.
                </p>

                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                    <a
                        href="https://github.com/emxDEV/core-trading-platform./releases/latest"
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-white text-black font-bold rounded-2xl hover:bg-cyan-50 transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                    >
                        <Apple size={24} />
                        macOS Release
                    </a>

                    <a
                        href="https://github.com/emxDEV/core-trading-platform./releases/latest"
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 glass text-white font-bold rounded-2xl hover:bg-white/5 transition-all"
                    >
                        <Monitor size={24} />
                        Windows Build
                    </a>
                </div>

                <p className="mt-10 text-sm text-gray-500">
                    Latest stable build: v1.1.9 • Updated: Today
                </p>
            </div>
        </section>
    );
}
