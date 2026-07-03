import { useState, useCallback, useEffect } from 'preact/hooks';
import { useRegisterSW } from 'virtual:pwa-register/preact';
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

  // Use vite-plugin-pwa's useRegisterSW hook for proper SW update flow.
  // needRefresh is a tuple [boolean, StateUpdater<boolean>] where
  // StateUpdater is the value-or-updater type; we use index access to
  // avoid destructuring type issues with the union type.
  const { needRefresh, updateServiceWorker } = useRegisterSW();
  const updateAvailable = needRefresh[0];
  const dismissUpdate = needRefresh[1] as unknown as () => void;

  const handleRefresh = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  const handleDismissUpdate = useCallback(() => {
    dismissUpdate();
  }, [dismissUpdate]);

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
      {!online && !offlineDismissed && <OfflineBanner onDismiss={handleDismissOffline} />}
      {updateAvailable && (
        <UpdatePrompt onRefresh={handleRefresh} onDismiss={handleDismissUpdate} />
      )}
      {children}
    </div>
  );
}
