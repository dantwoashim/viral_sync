'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, WifiHigh, WifiSlash } from '@phosphor-icons/react';
import { useOnlineStatus } from '@/lib/useOnlineStatus';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

export default function LaunchShellStatus() {
  const online = useOnlineStatus();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandaloneDisplayMode);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const canInstall = !installed && Boolean(installPrompt);

  return (
    <div className="launch-shell-status">
      <div className={`vs-chip ${online ? 'is-online' : 'is-offline'}`}>
        {online ? <WifiHigh size={16} /> : <WifiSlash size={16} />}
        <span>{online ? 'Online' : 'Offline cache mode'}</span>
      </div>

      {canInstall && (
        <button
          className="vs-link-chip"
          onClick={async () => {
            const pendingPrompt = installPrompt;
            if (!pendingPrompt) {
              return;
            }

            await pendingPrompt.prompt();
            const choice = await pendingPrompt.userChoice;
            if (choice.outcome === 'accepted') {
              setInstallPrompt(null);
            }
          }}
        >
          <ArrowDown size={16} />
          <span>Install app</span>
        </button>
      )}
    </div>
  );
}
