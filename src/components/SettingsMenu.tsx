import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
import styles from './SettingsMenu.module.css';

interface SettingsMenuProps {
  onExport: () => void;
  onImport: (file: File) => void;
  onShortcutsOpen?: () => void;
}

export function SettingsMenu({ onExport, onImport, onShortcutsOpen }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Escape to close; ArrowUp/ArrowDown to navigate menu items
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
        if (!items || items.length === 0) return;

        const currentIndex = Array.from(items).findIndex((item) => document.activeElement === item);
        let nextIndex: number;
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }
        items[nextIndex]?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };

    // Defer to let the current click event finish before listening
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [open, close]);

  const handleExport = useCallback(() => {
    onExport();
    close();
  }, [onExport, close]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
    close();
  }, [close]);

  const handleFileChange = useCallback(
    (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onImport(file);
      }
      // Reset so re-selecting the same file re-fires onChange
      (e.target as HTMLInputElement).value = '';
    },
    [onImport],
  );

  const handleShortcuts = useCallback(() => {
    onShortcutsOpen?.();
    close();
  }, [onShortcutsOpen, close]);

  const handleAbout = useCallback(() => {
    setShowAbout(true);
    close();
  }, [close]);

  return (
    <div class={styles.container}>
      <button
        ref={triggerRef}
        class={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
      >
        &hellip;
      </button>

      {open && (
        <div ref={menuRef} class={styles.dropdown} role="menu">
          {/* Export */}
          <button class={styles.menuItem} role="menuitem" onClick={handleExport} type="button">
            <span class={styles.menuIcon} aria-hidden="true">
              &darr;
            </span>
            Export
          </button>
          <div class={styles.privacyNote}>Exported data is saved as an unencrypted JSON file.</div>

          {/* Import */}
          <button class={styles.menuItem} role="menuitem" onClick={handleImportClick} type="button">
            <span class={styles.menuIcon} aria-hidden="true">
              &uarr;
            </span>
            Import
          </button>

          {/* Keyboard Shortcuts (conditional) */}
          {onShortcutsOpen && (
            <button class={styles.menuItem} role="menuitem" onClick={handleShortcuts} type="button">
              <span class={styles.menuIcon} aria-hidden="true">
                &#9000;
              </span>
              Keyboard Shortcuts
            </button>
          )}

          {/* About */}
          <button class={styles.menuItem} role="menuitem" onClick={handleAbout} type="button">
            <span class={styles.menuIcon} aria-hidden="true">
              &#8505;
            </span>
            About
          </button>
        </div>
      )}

      {/* About dialog */}
      {showAbout && (
        <div
          class={styles.backdrop}
          onClick={() => setShowAbout(false)}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowAbout(false);
            }
          }}
          role="button"
          tabIndex={-1}
          aria-label="Close about dialog"
        >
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            class={styles.aboutDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            onClick={(e: MouseEvent) => e.stopPropagation()}
            onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}
          >
            <h2 id="about-title" class={styles.aboutTitle}>
              About
            </h2>
            <p class={styles.aboutText}>Todo App — A simple task manager built with Preact.</p>
            <div class={styles.aboutVersion}>Version 1.0.0</div>
            <button
              class={styles.aboutClose}
              onClick={() => setShowAbout(false)}
              type="button"
              aria-label="Close"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input for Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        class={styles.fileInput}
        onChange={handleFileChange}
        tabIndex={-1}
      />
    </div>
  );
}
