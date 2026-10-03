import { useAuthStore } from './authStore';

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const DRIVE_FULL_SCOPE = 'https://www.googleapis.com/auth/drive';
export const USERINFO_SCOPE = 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

let tokenClient: any = null;

export function getClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
}

export function isGoogleAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.google?.accounts?.oauth2);
}

/**
 * Initializes Google OAuth2 token client
 */
export function initGoogleAuth(): Promise<boolean> {
  return new Promise((resolve) => {
    const clientId = getClientId();
    if (!clientId) {
      resolve(false);
      return;
    }

    const checkGoogle = () => {
      if (window.google?.accounts?.oauth2) {
        const scopeMode = useAuthStore.getState().scopeMode;
        const driveScope = scopeMode === 'drive' ? DRIVE_FULL_SCOPE : DRIVE_FILE_SCOPE;
        const fullScope = `${driveScope} ${USERINFO_SCOPE}`;

        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: fullScope,
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              useAuthStore.getState().setError(tokenResponse.error_description || tokenResponse.error);
              return;
            }
            if (tokenResponse.access_token) {
              await handleAccessToken(tokenResponse.access_token, tokenResponse.expires_in);
            }
          },
        });
        resolve(true);
      } else {
        setTimeout(checkGoogle, 200);
      }
    };

    checkGoogle();
  });
}

/**
 * Trigger sign in popup
 */
export async function signInWithGoogle(): Promise<void> {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error(
      'VITE_GOOGLE_CLIENT_ID is not configured in .env. Please configure your Google Cloud OAuth Client ID, or continue in Guest Offline Mode.'
    );
  }

  if (!tokenClient) {
    const ready = await initGoogleAuth();
    if (!ready || !tokenClient) {
      throw new Error('Google Identity Services library could not be loaded. Check your internet connection.');
    }
  }

  tokenClient.requestAccessToken({ prompt: 'consent' });
}

/**
 * Fetch user profile after receiving access token
 */
async function handleAccessToken(accessToken: string, expiresIn: number = 3599) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch Google user profile');
    }
    const info = await res.json();
    useAuthStore.getState().setUser({
      email: info.email || 'user@drive.google.com',
      name: info.name || 'Google User',
      picture: info.picture,
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      scope: useAuthStore.getState().scopeMode,
    });
  } catch (err: any) {
    // If userinfo fails, still allow authenticated state
    useAuthStore.getState().setUser({
      email: 'user@drive.google.com',
      name: 'Google Drive User',
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      scope: useAuthStore.getState().scopeMode,
    });
  }
}
