import React from 'react';
import { googleSignIn, logout } from '../services/firebaseAuth';
import { User } from 'firebase/auth';
import { LogOut, CheckCircle2 } from 'lucide-react';

interface Props {
  user: User | null;
  onAuthChange: (user: User | null, token: string | null) => void;
}

export const GoogleSignInButton: React.FC<Props> = ({ user, onAuthChange }) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onAuthChange(result.user, result.accessToken);
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      onAuthChange(null, null);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#ECE6D8] border border-[#D7D0C0] text-xs text-[#1C1B19]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#366340]" />
          <span className="font-medium truncate max-w-[140px] sm:max-w-[200px]" title={user.email || ''}>
            {user.email || user.displayName || 'Google Connected'}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          title="Sign out of Google Drive"
          className="p-1.5 rounded hover:bg-[#ECE6D8] text-[#625E56] hover:text-[#A94336] transition-colors border border-transparent hover:border-[#D7D0C0]"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleSignIn}
        disabled={loading}
        className="gsi-material-button text-xs h-9 px-3 border border-[#D7D0C0] hover:border-[#1C1B19]"
      >
        <div className="gsi-material-button-state"></div>
        <div className="gsi-material-button-content-wrapper">
          <div className="gsi-material-button-icon">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          </div>
          <span className="gsi-material-button-contents font-medium text-xs">
            {loading ? 'Connecting...' : 'Sign in with Google'}
          </span>
        </div>
      </button>
      {error && <p className="text-[11px] text-[#A94336] mt-1">{error}</p>}
    </div>
  );
};
