import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../firebase';
import { AppUser } from '../types';

function toAppUser(u: FirebaseUser): AppUser {
  const isGoogle = u.providerData.some(p => p.providerId === 'google.com');
  return {
    uid:         u.uid,
    displayName: u.displayName || 'Captain',
    email:       u.email || '',
    photoURL:    u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.uid}`,
    provider:    isGoogle ? 'google' : 'facebook',
  };
}

export function useAuth() {
  const [user, setUser]       = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ? toAppUser(firebaseUser) : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      if (e.code !== 'auth/popup-closed-by-user') {
        setError(e.message || 'Google sign-in failed');
      }
    }
  };

  const loginFacebook = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, facebookProvider);
    } catch (e: any) {
      if (e.code !== 'auth/popup-closed-by-user') {
        setError(e.message || 'Facebook sign-in failed');
      }
    }
  };

  const logout = () => signOut(auth);

  return { user, loading, error, loginGoogle, loginFacebook, logout };
}
