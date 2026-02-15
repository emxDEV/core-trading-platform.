import { motion } from 'framer-motion';
import mobilePreview from '../assets/core_mobile_preview_1771198131006.png';
import bentoPreview from '../assets/core_bento_features_1771198146901.png';

export default function PreviewsSection() {
    return (
        <section className="py-24 px-4 bg-gradient-to-b from-transparent to-mid-void/50">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="order-2 lg:order-1"
                >
                    <img
                        src={mobilePreview}
                        alt="CORE Mobile Experience"
                        className="w-full max-w-md mx-auto drop-shadow-[0_0_50px_rgba(6,182,212,0.2)]"
                    />
                </motion.div>

                <div className="order-1 lg:order-2">
                    <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
                        Built for <span className="text-mid-spark">Every Dimension</span>
                    </h2>
                    <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                        Whether you're at the workstation or on clinical deployment, CORE keeps you synced.
                        Native performance across all platforms with zero compromise.
                    </p>

                    <div className="space-y-6">
                        <div className="glass p-6 rounded-2xl">
                            <h4 className="font-bold text-lg mb-2 text-cyan-400">Cross-Platform Sync</h4>
                            <p className="text-gray-400 text-sm">Unified database architecture ensures your journals and strategies are available everywhere.</p>
                        </div>
                        <div className="glass p-6 rounded-2xl">
                            <h4 className="font-bold text-lg mb-2 text-indigo-400">Native Speed</h4>
                            <p className="text-gray-400 text-sm">Built with highly optimized logic for sub-millisecond data processing and UI responsiveness.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-32 max-w-5xl mx-auto text-center">
                <h3 className="text-3xl font-bold mb-12">The Ecosystem</h3>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="glass rounded-3xl p-4 md:p-8"
                >
                    <img src={bentoPreview} alt="App Modules" className="w-full h-auto rounded-xl" />
                </motion.div>
            </div>
        </section>
    );
}
