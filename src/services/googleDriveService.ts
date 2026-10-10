import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing Firebase App if initialized
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));
// Force prompt to ensure new permissions are granted
provider.setCustomParameters({ 
  prompt: 'consent select_account' 
});

// In-memory token cache (never stored in localStorage/sessionStorage as required)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveBackupFile {
  id: string;
  name: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
}

/**
 * Initializes the auth listener.
 */
export const initAuthListener = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

/**
 * Initiates Google sign-in with Google Drive scope.
 */
export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso do Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieves the current in-memory access token.
 */
export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Disconnects Google session and clears cached token.
 */
export const signOutGoogleDrive = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Uploads a JSON backup directly to the user's Google Drive via multipart upload.
 */
export const uploadBackupToGoogleDrive = async (
  fileName: string,
  backupContent: object | string,
  description: string = 'Backup do Sistema ISP Telecom & MikroTik'
): Promise<DriveBackupFile> => {
  if (!cachedAccessToken) {
    throw new Error('Usuário não autenticado no Google Drive. Conecte sua conta Google primeiro.');
  }

  const jsonString = typeof backupContent === 'string' ? backupContent : JSON.stringify(backupContent, null, 2);

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description,
    properties: {
      app: 'ISP-Telecom-Management',
      type: 'system-backup'
    }
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonString +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    let message = 'Falha ao salvar no Google Drive.';
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) {
        message = parsed.error.message;
      }
    } catch {
      message = errorText || response.statusText;
    }

    if (response.status === 401 || response.status === 403 || message.includes('insufficient authentication scopes')) {
      cachedAccessToken = null;
      message = 'Permissões do Google Drive atualizadas. Por favor, clique novamente em Conectar com Google Drive para autorizar.';
    }

    throw new Error(message);
  }

  const result = await response.json();
  return result as DriveBackupFile;
};

/**
 * Lists backups saved to Google Drive created by this app or matching JSON backups.
 */
export const listGoogleDriveBackups = async (): Promise<DriveBackupFile[]> => {
  if (!cachedAccessToken) return [];

  try {
    const query = encodeURIComponent("mimeType = 'application/json' and trashed = false and name contains 'backup'");
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,size,createdTime,modifiedTime,webViewLink,webContentLink)&orderBy=createdTime desc&pageSize=15`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`
      }
    });

    if (!res.ok) {
      console.warn('Erro ao consultar arquivos no Google Drive:', await res.text());
      return [];
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.warn('Falha na listagem de arquivos do Google Drive:', err);
    return [];
  }
};
