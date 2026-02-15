import { motion } from 'framer-motion';
import { Shield, BarChart3, Users, Zap } from 'lucide-react';

const features = [
    {
        title: "Operator Identity",
        description: "Build your legacy. Level up your trading profile, earn XP, and track your class progression.",
        icon: Shield,
        color: "cyan",
        delay: 0.1
    },
    {
        title: "Tactical Analytics",
        description: "Deep-dive into performance. Advanced PnL metrics and celestial visualizations of your edge.",
        icon: BarChart3,
        color: "indigo",
        delay: 0.2
    },
    {
        title: "Copy Cockpit",
        description: "Replicate excellence. Real-time trade replication with military-grade precision and speed.",
        icon: Users,
        color: "purple",
        delay: 0.3
    },
    {
        title: "Combat Readiness",
        description: "Operational intel at your fingertips. Stay ahead of threats with unified news and alerts.",
        icon: Zap,
        color: "cyan",
        delay: 0.4
    }
];

export default function FeatureGrid() {
    return (
        <section className="py-24 px-4 max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold mb-4">Tactical Superiority</h2>
                <p className="text-gray-400">Engineered for performance. Built for operators.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((f, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: f.delay }}
                        className={`glass p-8 rounded-3xl hover:border-${f.color}-500/50 transition-colors group`}
                    >
                        <div className={`w-12 h-12 rounded-2xl bg-${f.color}-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                            <f.icon className={`text-${f.color}-400`} size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                        <p className="text-gray-400 leading-relaxed text-sm">
                            {f.description}
                        </p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
