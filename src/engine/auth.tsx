import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from './firebase';

/* ================================================================
   Authentication Layer — Google & Email/Password Authentication
   
   Provides:
   - Persistent session detection via onAuthStateChanged & local session
   - Google Sign-In with popup
   - Email & Password Sign-In and Sign-Up
   - Clean sign-out functionality
   - Safe local account fallback when Firebase keys are not in .env
   ================================================================ */

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const LOCAL_SESSION_KEY = 'fyza.local_session';
const LOCAL_ACCOUNTS_KEY = 'fyza.local_accounts';

const AuthContext = createContext<AuthContextType | null>(null);

function mapFirebaseUser(user: FirebaseUser | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export function parseAuthError(err: any): string {
  if (!err) return 'An unexpected authentication error occurred.';
  const code = err.code || '';

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled. The Google popup was closed before completing sign-in.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for Fyza and try again.';
    case 'auth/cancelled-popup-request':
      return 'Only one popup request is allowed at a time.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Console. Add it under Authentication > Settings > Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase Console. Enable it under Authentication > Sign-in method.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please check your email or create an account.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/too-many-requests':
      return 'Too many failed sign-in attempts. Please wait a few moments and try again.';
    default:
      return err.message || 'Authentication failed. Please try again.';
  }
}

function generateLocalUid(email: string): string {
  try {
    return 'local_' + btoa(email.toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  } catch {
    return 'local_' + email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (!configured || !auth) {
      // Restore local offline session if present
      try {
        const raw = localStorage.getItem(LOCAL_SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.uid) {
            setUser(parsed);
          }
        }
      } catch {}
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (fbUser) => {
        setUser(mapFirebaseUser(fbUser));
        setLoading(false);
      },
      (err) => {
        console.error('Firebase onAuthStateChanged error:', err);
        setError(parseAuthError(err));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [configured]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);

    if (!configured || !auth || !googleProvider) {
      const msg = 'Google Sign-In requires Firebase configuration in .env. You can sign in below with Email and Password!';
      setError(msg);
      throw new Error(msg);
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(mapFirebaseUser(result.user));
    } catch (err: any) {
      const message = parseAuthError(err);
      setError(message);
      throw err;
    }
  }, [configured]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      const msg = 'Please enter your email address.';
      setError(msg);
      throw new Error(msg);
    }
    if (!password) {
      const msg = 'Please enter your password.';
      setError(msg);
      throw new Error(msg);
    }

    // 1. If Firebase is configured, use Firebase Authentication
    if (configured && auth) {
      try {
        const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
        setUser(mapFirebaseUser(result.user));
        return;
      } catch (err: any) {
        const message = parseAuthError(err);
        setError(message);
        throw err;
      }
    }

    // 2. Local fallback when Firebase credentials are not in .env
    try {
      const rawAccounts = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
      const accounts = rawAccounts ? JSON.parse(rawAccounts) : {};
      const acc = accounts[cleanEmail.toLowerCase()];

      if (!acc) {
        const msg = 'No account found with this email. Switch to "Create account" to get started.';
        setError(msg);
        throw new Error(msg);
      }

      if (acc.password !== password) {
        const msg = 'Incorrect password. Please try again.';
        setError(msg);
        throw new Error(msg);
      }

      const localUser: AuthUser = {
        uid: generateLocalUid(cleanEmail),
        email: cleanEmail,
        displayName: acc.name || cleanEmail.split('@')[0],
        photoURL: null,
      };

      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(localUser));
      setUser(localUser);
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in.');
      throw err;
    }
  }, [configured]);

  const signUpWithEmail = useCallback(async (email: string, password: string, name?: string) => {
    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      const msg = 'Please enter a valid email address.';
      setError(msg);
      throw new Error(msg);
    }
    if (!password || password.length < 6) {
      const msg = 'Password must be at least 6 characters.';
      setError(msg);
      throw new Error(msg);
    }

    const displayName = name?.trim() || cleanEmail.split('@')[0];

    // 1. If Firebase is configured, use Firebase Authentication
    if (configured && auth) {
      try {
        const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (displayName) {
          try {
            await updateProfile(result.user, { displayName });
          } catch {}
        }
        setUser({
          uid: result.user.uid,
          email: result.user.email,
          displayName,
          photoURL: result.user.photoURL,
        });
        return;
      } catch (err: any) {
        const message = parseAuthError(err);
        setError(message);
        throw err;
      }
    }

    // 2. Local fallback when Firebase credentials are not in .env
    try {
      const rawAccounts = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
      const accounts = rawAccounts ? JSON.parse(rawAccounts) : {};
      const key = cleanEmail.toLowerCase();

      if (accounts[key]) {
        const msg = 'An account already exists with this email. Please sign in instead.';
        setError(msg);
        throw new Error(msg);
      }

      accounts[key] = {
        email: cleanEmail,
        password,
        name: displayName,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));

      const localUser: AuthUser = {
        uid: generateLocalUid(cleanEmail),
        email: cleanEmail,
        displayName,
        photoURL: null,
      };

      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(localUser));
      setUser(localUser);
    } catch (err: any) {
      setError(err?.message || 'Failed to create account.');
      throw err;
    }
  }, [configured]);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    } catch {}

    if (!configured || !auth) {
      setUser(null);
      return;
    }

    try {
      await fbSignOut(auth);
      setUser(null);
    } catch (err: any) {
      const message = parseAuthError(err);
      setError(message);
      throw err;
    }
  }, [configured]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    error,
    isConfigured: configured,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    clearError,
  }), [user, loading, error, configured, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, clearError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
