import { useState, useCallback, useEffect } from 'preact/hooks';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflineBanner } from '@/components/OfflineBanner';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import type { ComponentChildren } from 'preact';

interface AppShellProps {
  children: ComponentChildren;
}

export function AppShell({ children }: AppShellProps) {
  const online = useOnlineStatus();
  const [offlineDismissed, setOfflineDismissed] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Listen for service worker updates
  useEffect(() => {
    // If Workbox is available via vite-plugin-pwa, listen for updates
    if ('serviceWorker' in navigator) {
      // The workbox-window instance is registered by vite-plugin-pwa
      // We listen for the custom event it dispatches
      const handleUpdate = () => setUpdateAvailable(true);
      window.addEventListener('sw-update-available', handleUpdate);
      return () => window.removeEventListener('sw-update-available', handleUpdate);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    // Post message to waiting service worker to skip waiting
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, []);

  const handleDismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  const handleDismissOffline = useCallback(() => {
    setOfflineDismissed(true);
  }, []);

  // Reset offline dismissed when back online
  useEffect(() => {
    if (online) {
      setOfflineDismissed(false);
    }
  }, [online]);

  return (
    <div>
      {!online && !offlineDismissed && (
        <OfflineBanner onDismiss={handleDismissOffline} />
      )}
      {updateAvailable && (
        <UpdatePrompt onRefresh={handleRefresh} onDismiss={handleDismissUpdate} />
      )}
      {children}
    </div>
  );
}
