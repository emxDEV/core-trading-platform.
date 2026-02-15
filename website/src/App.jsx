import HeroSection from './components/HeroSection'
import FeatureGrid from './components/FeatureGrid'
import PreviewsSection from './components/PreviewsSection'
import DownloadCTA from './components/DownloadCTA'
import logo from './assets/logo.svg'

function App() {
  return (
    <div className="min-h-screen bg-mid-void font-sans antialiased text-white selection:bg-cyan-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b-0 py-4 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="CORE Logo" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
          <span className="text-xl font-bold tracking-tighter">CORE</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Tactical Intel</a>
          <a href="#previews" className="hover:text-white transition-colors">Gallery</a>
          <a
            href="https://github.com/emxDEV/core-trading-platform./releases/latest"
            className="px-5 py-2 glass glass-cyan rounded-full text-cyan-400 hover:bg-cyan-400/10 transition-colors"
          >
            Download v1.1.9
          </a>
        </div>
      </nav>

      <main>
        <HeroSection />

        <div id="features" className="scroll-mt-20">
          <FeatureGrid />
        </div>

        <div id="previews" className="scroll-mt-20">
          <PreviewsSection />
        </div>

        <DownloadCTA />
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 text-center border-t border-white/5">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src={logo} alt="CORE Logo" className="w-8 h-8 opacity-50" />
          <span className="text-lg font-bold tracking-tighter opacity-50">CORE</span>
        </div>
        <p className="text-gray-500 text-sm">
          &copy; 2026 emxDEV. Built for advanced operators.
        </p>
      </footer>
    </div>
  )
}

export default App
