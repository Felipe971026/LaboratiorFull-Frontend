import { useState, useEffect } from 'react';
import { loginWithGoogle } from '../../../firebase';

export const useGoogleSheets = (user: any, isSystemUnlocked: boolean) => {
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const checkGoogleStatus = async () => {
      try {
        const response = await fetch('/api/auth/google/status');
        const data = await response.json();
        setIsGoogleConnected(data.connected);
      } catch (error) {
        console.error('Error checking Google status:', error);
      }
    };
    if (user && isSystemUnlocked) {
      checkGoogleStatus();
    }
  }, [user, isSystemUnlocked]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsGoogleConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      window.open(url, 'google_auth_popup', 'width=600,height=700');
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await fetch('/api/auth/google/logout', { method: 'POST' });
      setIsGoogleConnected(false);
    } catch (error) {
      console.error('Error logging out of Google:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('El usuario cerró la ventana de inicio de sesión.');
      } else {
        console.error('Error al iniciar sesión con Google:', error);
      }
    }
  };

  return {
    isGoogleConnected,
    isSyncing,
    setIsSyncing,
    handleConnectGoogle,
    handleDisconnectGoogle,
    handleGoogleLogin,
  };
};
