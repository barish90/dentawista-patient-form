import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import PatientForm from './components/PatientForm';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Add immediate session check
    const currentSession = supabase.auth.getSession();
    console.log('Initial session check:', currentSession);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        checkAdminStatus(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      console.log('Auth state changed:', event, session?.user?.id);
      setSession(session);
      if (session?.user?.id) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      console.log('Checking admin status for user:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        console.log('User role data:', data);
        setIsAdmin(data?.role === 'admin');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
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
  
  // Add more detailed logging
  console.log('Routing Debug:', {
    sessionExists: !!session,
    isAdmin,
    currentPath: location.pathname,
    state: location.state
  });

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
          !session ? (
            <Navigate to="/" state={{ from: location }} replace />
          ) : !isAdmin ? (
            <Navigate to="/" state={{ error: 'Access denied. Admin privileges required.' }} replace />
          ) : (
            <AdminPanel />
          )
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