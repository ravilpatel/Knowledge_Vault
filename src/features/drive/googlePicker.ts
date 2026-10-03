import { useAuthStore } from '../auth/authStore';
import { getClientId } from '../auth/googleAuth';

/**
 * Loads the Google Picker API script if not loaded
 */
export function loadPickerApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.picker) {
      resolve();
      return;
    }
    if (window.gapi) {
      window.gapi.load('picker', () => {
        resolve();
      });
    } else {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('picker', () => {
          resolve();
        });
      };
      script.onerror = reject;
      document.body.appendChild(script);
    }
  });
}

/**
 * Open Google Picker to select a folder from Drive
 */
export async function openFolderPicker(): Promise<{ id: string; name: string } | null> {
  const user = useAuthStore.getState().user;
  if (!user || !user.accessToken) {
    throw new Error('Please sign in with Google Drive first.');
  }

  await loadPickerApi();

  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMimeTypes('application/vnd.google-apps.folder');

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(user.accessToken)
      .setAppId(getClientId())
      .setTitle('Select Google Drive Folder for NoteVault')
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const doc = data.docs[0];
          resolve({ id: doc.id, name: doc.name });
        } else if (data.action === window.google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();

    picker.setVisible(true);
  });
}
