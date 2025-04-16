import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';

interface AuthForm {
  email: string;
  password: string;
}

const initialAuthForm: AuthForm = {
  email: '',
  password: '',
};

interface AuthError {
  code: string;
  message: string;
}

export default function Login() {
  const [authForm, setAuthForm] = useState<AuthForm>(initialAuthForm);
  const [isSignUp, setIsSignUp] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const error = location.state?.error;
    if (error) {
      setMessage({ type: 'error', text: error });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const { email, password } = authForm;
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const additionalInfo = getAdditionalUserInfo(userCredential);
        const isNewUser = additionalInfo?.isNewUser;

        await setDoc(doc(db, 'users', userCredential.user.uid), {
          role: 'user',
          email: email,
          displayName: userCredential.user.displayName || '',
          createdAt: serverTimestamp()
        });

        if (isNewUser) {
          setMessage({ type: 'success', text: 'Registration successful! Redirecting to profile...' });
          setAuthForm(initialAuthForm);
          navigate('/profile');
        } else {
          setMessage({ type: 'success', text: 'Account created. Please sign in.' });
          setIsSignUp(false);
          setAuthForm(initialAuthForm);
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setMessage({ type: 'success', text: 'Signed in successfully!' });
        setAuthForm(initialAuthForm);
        const from = location.state?.from?.pathname || '/';
        navigate(from);
      }
    } catch (error) {
      const authError = error as AuthError;
      setMessage({ type: 'error', text: authError.message });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setMessage(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalInfo?.isNewUser;

      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists() || isNewUser) {
        await setDoc(userDocRef, {
          role: 'user',
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          provider: 'google',
          createdAt: userDoc.exists() ? userDoc.data().createdAt : serverTimestamp(),
          lastLoginAt: serverTimestamp()
        }, { merge: true });

        if (isNewUser) {
          setMessage({
            type: 'success',
            text: 'Account created successfully! Redirecting to profile...'
          });
          navigate('/profile');
        } else {
          setMessage({ type: 'success', text: 'Signed in successfully!' });
          const from = location.state?.from?.pathname || '/';
          navigate(from);
        }
      } else {
        await setDoc(userDocRef, {
          lastLoginAt: serverTimestamp()
        }, { merge: true });
        setMessage({ type: 'success', text: 'Signed in successfully!' });
        const from = location.state?.from?.pathname || '/';
        navigate(from);
      }
    } catch (error) {
      const authError = error as AuthError;
      console.error('Google sign-in error:', authError);

      if (authError.code === 'auth/popup-closed-by-user') {
        setMessage({
          type: 'error',
          text: 'Sign-in was cancelled. Please try again.'
        });
      } else if (authError.message.includes('OAuth operations')) {
        setMessage({
          type: 'error',
          text: 'Google sign-in is not configured for this domain. Please try using email/password sign-in instead, or contact the administrator.'
        });
      } else {
        setMessage({
          type: 'error',
          text: 'An error occurred during sign-in. Please try again.'
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {isSignUp ? 'Create an Account' : 'Sign in to your Account'}
          </h2>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isSignUp ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span>Sign in with Google</span>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}