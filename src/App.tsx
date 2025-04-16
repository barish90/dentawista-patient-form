import React, { useState, useEffect } from 'react';
import { Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import PatientForm from './components/PatientForm';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import { ErrorBoundary } from 'react-error-boundary';
import SuccessAnimation from './components/SuccessAnimation';
import UserProfile from './components/UserProfile';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="text-center p-4">
        <h1 className="text-red-600 text-xl mb-2">Something went wrong</h1>
        <p className="text-gray-600">{error.message}</p>
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={resetErrorBoundary}
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading application...</p>
      </div>
    </div>
  );
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && requireAdmin) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          setIsAdmin(userDoc.exists() && userDoc.data().role === 'admin');
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [requireAdmin]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    console.warn('Admin access required, redirecting...');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    const checkFirebaseConnection = async () => {
      try {
        const testDocRef = doc(db, 'test', 'connection');
        const testDoc = await getDoc(testDocRef);

        if (!testDoc.exists()) {
          try {
            await setDoc(testDocRef, {
              lastChecked: new Date().toISOString()
            });
          } catch (writeError) {
            console.warn('Could not create test document:', writeError);
          }
        }

        setFirebaseConnected(true);
        setError('');
      } catch (err: unknown) {
        console.error('Firebase connection error:', err);

        let errorCode = 'unknown';
        let errorMessage = 'An unknown error occurred';
        if (typeof err === 'object' && err !== null && 'code' in err) {
          errorCode = (err as { code: string }).code;
        }
        if (typeof err === 'object' && err !== null && 'message' in err) {
          errorMessage = (err as { message: string }).message;
        }

        if (errorCode === 'failed-precondition' || errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
          setError('Network request blocked. Please disable ad-blocker for this site.');
        } else if (errorCode === 'permission-denied') {
          setError('Firebase permissions error. Please check your security rules.');
        } else {
          setError('Failed to connect to Firebase. Please check your internet connection.');
        }

        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkFirebaseConnection, 1000 * retryCount);
        } else {
          setFirebaseConnected(false);
        }
      }
    };

    checkFirebaseConnection();

    return () => {
      retryCount = maxRetries;
    };
  }, []);

  const router = createBrowserRouter([
    {
      path: "/login",
      element: <Login />
    },
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <PatientForm />
        </ProtectedRoute>
      )
    },
    {
      path: "/admin",
      element: (
        <ProtectedRoute requireAdmin>
          <AdminPanel />
        </ProtectedRoute>
      )
    },
    {
      path: "/success",
      element: <SuccessAnimation onComplete={() => { }} />
    },
    {
      path: "/profile",
      element: <ProtectedRoute><UserProfile /></ProtectedRoute>
    },
    {
      path: "*",
      element: <Navigate replace to="/login" />
    }
  ], {
    future: {
      v7_relativeSplatPath: true
    }
  });

  if (!firebaseConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          {error && (
            <p className="text-red-600 text-sm mt-4">{error}</p>
          )}
          {error && error.includes('ad-blocker') && (
            <p className="mt-2 text-sm text-gray-600">
              Please disable your ad-blocker or add this site to your allowlist to continue.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;