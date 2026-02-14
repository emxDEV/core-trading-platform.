import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import CopyCockpit from './components/CopyCockpit';
import NewTradeModal from './components/NewTradeModal';
import DailyPnLModal from './components/DailyPnLModal';
import CommandCenter from './components/CommandCenter';
import ImportModal from './components/ImportModal';
import { TradeProvider, useData } from './context/TradeContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Toaster from './components/Toaster';
import Profile from './components/Profile';
import Settings from './components/Settings';
import UpgradeModal from './components/UpgradeModal';
import AuthPage from './components/AuthPage';
import OnboardingWizard from './components/OnboardingWizard';
import AppTutorial from './components/AppTutorial';
import LoadingScreen from './components/LoadingScreen';

import Calendar from './components/Calendar';
import TitleBar from './components/TitleBar';
import ErrorBoundary from './components/ErrorBoundary';
import UpdateSummaryModal from './components/UpdateSummaryModal';
import pkg from '../package.json';

import { useShortcuts } from './hooks/useShortcuts';
import { useState, useEffect } from 'react';

import { soundEngine } from './utils/SoundEngine';

function App() {
  useEffect(() => {
    const unlockAudio = () => {
      soundEngine.init();
      if (soundEngine.context?.state === 'suspended') {
        soundEngine.context.resume();
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <AuthGate />
          <Toaster />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AuthGate() {
  const { isAuthenticated, loading, user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsTutorial, setNeedsTutorial] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const APP_VERSION = pkg.version;

  useEffect(() => {
    if (user) {
      const hasSpecificProfile = localStorage.getItem(`userProfile_${user.id}`);
      const onboardingFlag = localStorage.getItem(`onboarding_complete_${user.id}`);

      // ONLY consider it done if the SPECIFIC user has finished it
      // Ignore legacy global 'userProfile' for the setup decision to ensure new accounts get the wizard
      const onboardingDone = onboardingFlag === 'true' || !!hasSpecificProfile;

      const tutorialDone = localStorage.getItem(`tutorial_complete_${user.id}`);

      setNeedsOnboarding(!onboardingDone);
      setNeedsTutorial(!onboardingDone || !tutorialDone);
      setOnboardingChecked(true);

      // Version Check for Update Modal
      const lastSeenVersion = localStorage.getItem(`last_seen_version_${user.id}`);
      if (lastSeenVersion && lastSeenVersion !== APP_VERSION) {
        setShowUpdateModal(true);
      } else if (!lastSeenVersion) {
        // First time users don't see the update modal after onboarding
        localStorage.setItem(`last_seen_version_${user.id}`, APP_VERSION);
      }

      // Get profile name for tutorial greeting
      try {
        const saved = hasSpecificProfile || localStorage.getItem('userProfile');
        if (saved) setProfileName(JSON.parse(saved).name || '');
      } catch (e) { }
    } else {
      setOnboardingChecked(false);
      setNeedsOnboarding(false);
      setNeedsTutorial(false);
    }
  }, [user]);


  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (!onboardingChecked) {
    return null;
  }

  if (needsOnboarding) {
    return (
      <OnboardingWizard
        onComplete={(profile) => {
          localStorage.setItem(`userProfile_${user.id}`, JSON.stringify(profile));
          localStorage.setItem('userProfile', JSON.stringify(profile)); // Backup for legacy
          localStorage.setItem(`onboarding_complete_${user.id}`, 'true');
          setProfileName(profile.name || '');
          setNeedsOnboarding(false);
          setNeedsTutorial(true); // Show tutorial after onboarding
        }}
      />
    );
  }

  return (
    <TradeProvider>
      <TitleBar />
      <ShortcutManager />
      <MainContent />
      <GlobalModal />
      <UpgradeContainer />
      {needsTutorial && (
        <AppTutorial
          userName={profileName}
          onComplete={() => {
            localStorage.setItem(`tutorial_complete_${user.id}`, 'true');
            setNeedsTutorial(false);
          }}
        />
      )}
      {showUpdateModal && (
        <UpdateSummaryModal
          version={APP_VERSION}
          onClose={() => {
            localStorage.setItem(`last_seen_version_${user.id}`, APP_VERSION);
            setShowUpdateModal(false);
          }}
        />
      )}
    </TradeProvider>
  );
}

function ShortcutManager() {
  const { setCurrentView, openModal, closeModal, isModalOpen, setIsDailyPnLOpen, setIsCommandCenterOpen, appSettings } = useData();

  useShortcuts({
    onNewTrade: () => {
      openModal();
    },
    onViewSwitch: (view) => {
      setCurrentView(view);
    },
    onSettings: () => {
      setCurrentView('settings');
    },
    onEscape: () => {
      closeModal();
      setIsDailyPnLOpen(false);
      setIsDailyJournalOpen(false);
      setIsCommandCenterOpen(false);
    },
    onCommandCenter: () => {
      setIsCommandCenterOpen(true);
    }
  }, appSettings.enableShortcuts);

  return null;
}

function UpgradeContainer() {
  const { passedAccounts, setPassedAccounts } = useData();
  return <UpgradeModal accounts={passedAccounts} onClose={() => setPassedAccounts([])} />;
}

function MainContent() {
  const { currentView } = useData();
  return (
    <Layout>
      <div key={currentView} className="page-fade-in h-full overflow-y-auto pr-2 custom-scrollbar">
        {currentView === 'journal' ? <Dashboard /> :
          currentView === 'copy' ? <CopyCockpit /> :
            currentView === 'analytics' ? <Analytics /> :
              currentView === 'calendar' ? <Calendar /> :
                currentView === 'settings' ? <Settings /> :
                  currentView === 'profile' ? <Profile /> :
                    <Dashboard />}
      </div>
    </Layout>
  );
}

import DailyJournal from './components/DailyJournal';

function GlobalModal() {
  const { isModalOpen, closeModal, tradeToEdit, isDailyPnLOpen, setIsDailyPnLOpen, isDailyJournalOpen } = useData();
  return (
    <>
      <NewTradeModal isOpen={isModalOpen} onClose={closeModal} tradeToEdit={tradeToEdit} />
      <DailyPnLModal isOpen={isDailyPnLOpen} onClose={() => setIsDailyPnLOpen(false)} />
      <CommandCenter />
      <DailyJournal />
      <ImportModal />
    </>
  );
}

export default App;
