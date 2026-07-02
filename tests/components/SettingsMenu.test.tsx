import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/preact';
import { SettingsMenu } from '@/components/SettingsMenu';

describe('SettingsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trigger button with settings aria-label', async () => {
    render(<SettingsMenu onExport={vi.fn()} onImport={vi.fn()} />);
    const trigger = screen.getByLabelText('Settings');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens menu when trigger is clicked', async () => {
    render(<SettingsMenu onExport={vi.fn()} onImport={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Settings'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('calls onExport when Export is clicked and closes menu', () => {
    const onExport = vi.fn();
    render(<SettingsMenu onExport={onExport} onImport={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Settings'));
    fireEvent.click(screen.getByText('Export'));
    expect(onExport).toHaveBeenCalledTimes(1);
    // Menu should close
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    // Focus returns to trigger
    expect(screen.getByLabelText('Settings')).toHaveFocus();
  });

  it('opens file picker when Import is clicked', () => {
    const onImport = vi.fn();
    render(<SettingsMenu onExport={vi.fn()} onImport={onImport} />);
    fireEvent.click(screen.getByLabelText('Settings'));
    // There's a hidden file input - we can't easily test it clicking directly
    // But we can verify the menu closes
    fireEvent.click(screen.getByText('Import'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('calls onImport when a file is selected', () => {
    const onImport = vi.fn();
    const { container } = render(<SettingsMenu onExport={vi.fn()} onImport={onImport} />);
    const file = new File(['{"todos":[]}'], 'todos.json', { type: 'application/json' });

    // Open menu
    fireEvent.click(screen.getByLabelText('Settings'));

    // The hidden file input should be in the document
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    // Simulate file selection
    fireEvent.change(fileInput!, { target: { files: [file] } });
    expect(onImport).toHaveBeenCalledWith(file);
  });

  it('shows keyboard shortcuts button when onShortcutsOpen is provided', () => {
    const onShortcutsOpen = vi.fn();
    render(
      <SettingsMenu onExport={vi.fn()} onImport={vi.fn()} onShortcutsOpen={onShortcutsOpen} />,
    );
    fireEvent.click(screen.getByLabelText('Settings'));
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Keyboard Shortcuts'));
    expect(onShortcutsOpen).toHaveBeenCalledTimes(1);
  });

  it('hides keyboard shortcuts button when onShortcutsOpen is not provided', () => {
    render(<SettingsMenu onExport={vi.fn()} onImport={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Settings'));
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
  });

  it('opens and closes about dialog', async () => {
    render(<SettingsMenu onExport={vi.fn()} onImport={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Settings'));
    fireEvent.click(screen.getByText('About'));

    // About dialog should be visible
    expect(screen.getByRole('dialog', { name: 'About' })).toBeInTheDocument();
    expect(
      screen.getByText('Todo App — A simple task manager built with Preact.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();

    // Close via button
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'About' })).not.toBeInTheDocument();
  });

  it('closes about dialog on Escape key', () => {
    render(<SettingsMenu onExport={vi.fn()} onImport={vi.fn()} />);
    // Open menu and about
    fireEvent.click(screen.getByLabelText('Settings'));
    fireEvent.click(screen.getByText('About'));
    expect(screen.getByRole('dialog', { name: 'About' })).toBeInTheDocument();

    // Escape on backdrop should close about
    const backdrop = document.querySelector('[aria-label="Close about dialog"]')!;
    fireEvent.keyDown(backdrop, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'About' })).not.toBeInTheDocument();
  });

  it('closes about dialog on Enter key', () => {
    render(<SettingsMenu onExport={vi.fn()} onImport={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Settings'));
    fireEvent.click(screen.getByText('About'));
    expect(screen.getByRole('dialog', { name: 'About' })).toBeInTheDocument();

    const backdrop = document.querySelector('[aria-label="Close about dialog"]')!;
    fireEvent.keyDown(backdrop, { key: 'Enter' });
    expect(screen.queryByRole('dialog', { name: 'About' })).not.toBeInTheDocument();
  });

  it('closes about dialog on Space key', () => {
    render(<SettingsMenu onExport={vi.fn()} onImport={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Settings'));
    fireEvent.click(screen.getByText('About'));
    expect(screen.getByRole('dialog', { name: 'About' })).toBeInTheDocument();

    const backdrop = document.querySelector('[aria-label="Close about dialog"]')!;
    fireEvent.keyDown(backdrop, { key: ' ' });
    expect(screen.queryByRole('dialog', { name: 'About' })).not.toBeInTheDocument();
  });

  it('closes about dialog on backdrop click', () => {
    render(<SettingsMenu onExport={vi.fn()} onImport={vi.fn()} />);
    // Open menu and about
    fireEvent.click(screen.getByLabelText('Settings'));
    fireEvent.click(screen.getByText('About'));

    // Click the backdrop (not the dialog)
    const backdrop = document.querySelector('[aria-label="Close about dialog"]')!;
    fireEvent.click(backdrop);
    expect(screen.queryByRole('dialog', { name: 'About' })).not.toBeInTheDocument();
  });

  it('does not close about dialog when clicking inside it', () => {
    render(<SettingsMenu onExport={vi.fn()} onImport={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Settings'));
    fireEvent.click(screen.getByText('About'));

    // Click inside the dialog
    const aboutDialog = screen.getByRole('dialog', { name: 'About' });
    fireEvent.click(aboutDialog);
    expect(aboutDialog).toBeInTheDocument();
  });

  it('closes menu on Escape', () => {
    render(<SettingsMenu onExport={vi.fn()} onImport={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Settings'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('navigates menu items with arrow keys', () => {
    const onShortcutsOpen = vi.fn();
    render(
      <SettingsMenu onExport={vi.fn()} onImport={vi.fn()} onShortcutsOpen={onShortcutsOpen} />,
    );
    fireEvent.click(screen.getByLabelText('Settings'));

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems.length).toBeGreaterThanOrEqual(4); // Export, Import, Keyboard Shortcuts, About

    // ArrowDown from first item moves to second
    menuItems[0].focus();
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(menuItems[1]);

    // ArrowUp on second item moves back to first
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(menuItems[0]);
  });

  it('wraps arrow down from last item to first', () => {
    render(<SettingsMenu onExport={vi.fn()} onImport={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Settings'));

    const menuItems = screen.getAllByRole('menuitem');
    const lastIndex = menuItems.length - 1;
    menuItems[lastIndex].focus();

    // ArrowDown from last should wrap to first
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(menuItems[0]);
  });

  it('wraps arrow up from first item to last', () => {
    render(<SettingsMenu onExport={vi.fn()} onImport={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Settings'));

    const menuItems = screen.getAllByRole('menuitem');
    menuItems[0].focus();

    // ArrowUp from first should wrap to last
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(menuItems[menuItems.length - 1]);
  });

  it('closes menu when clicking outside', async () => {
    render(<SettingsMenu onExport={vi.fn()} onImport={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Settings'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Wait for the setTimeout(0) that registers the click-outside listener
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Click on document body (outside the menu)
    await act(async () => {
      fireEvent.click(document.body);
    });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
