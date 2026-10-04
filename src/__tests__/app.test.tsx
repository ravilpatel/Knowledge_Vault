import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import 'fake-indexeddb/auto';

// Ensure global window mock for tests
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    innerWidth: 1200,
    innerHeight: 800,
    matchMedia: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

if (typeof globalThis.navigator === 'undefined') {
  (globalThis as any).navigator = {
    onLine: true,
  };
}

if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    documentElement: {
      classList: {
        add: () => {},
        remove: () => {},
      },
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    visibilityState: 'visible',
  };
}

import { App } from '../app/App';
import { WorkspaceLayout } from '../app/WorkspaceLayout';
import { SupabaseAuthModal } from '../features/auth/SupabaseAuthModal';

describe('App and Workspace UI Rendering', () => {
  it('renders SupabaseAuthModal without throwing', () => {
    const html = renderToString(<SupabaseAuthModal />);
    expect(html).toBeDefined();
    expect(html).toContain('Knowledge Vault');
  });

  it('renders WorkspaceLayout without throwing', () => {
    const html = renderToString(<WorkspaceLayout isDark={false} onToggleTheme={() => {}} />);
    expect(html).toBeDefined();
    expect(html).toContain('NoteVault');
  });

  it('renders App root without throwing', () => {
    const html = renderToString(<App />);
    expect(html).toBeDefined();
  });
});
