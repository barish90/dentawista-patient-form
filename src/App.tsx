import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, UNSAFE_DataRouterContext, UNSAFE_DataRouterStateContext } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import PatientForm from './components/PatientForm';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';

const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        setSession(session);

        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (userError) {
          setIsAdmin(false);
        } else {
          setIsAdmin(userData?.role === 'admin');
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
        clearTimeout(loadingTimeout);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
      
      if (!newSession) {
        setIsAdmin(false);
        setIsLoading(false);
      } else {
        checkSession();
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-4">
          <h1 className="text-red-600 text-xl mb-2">Error</h1>
          <p className="text-gray-600">{error.message}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
          <p className="text-sm text-gray-500">If this takes too long, click below to retry</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router {...router}>
      <AppRoutes session={session} isAdmin={isAdmin} />
    </Router>
  );
}

interface AppRoutesProps {
  session: Session | null;
  isAdmin: boolean;
}

function AppRoutes({ session, isAdmin }: AppRoutesProps) {
  const location = useLocation();

  return (
    <Routes>
      <Route
        path="/"
        element={
          session ? <PatientForm session={session} /> : <Login />
        }
      />
      <Route
        path="/admin"
        element={
          (() => {
            if (!session) {
              return <Navigate to="/" state={{ from: location }} replace />;
            }

            if (!isAdmin) {
              return <Navigate to="/" state={{ error: 'Access denied. Admin privileges required.' }} replace />;
            }

            return <AdminPanel />;
          })()
        }
      />
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;