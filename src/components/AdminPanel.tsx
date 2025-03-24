import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Search, Download, LogOut, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Patient {
  id: string;
  name: string;
  gender: string;
  date_of_birth: string;
  created_at: string;
  submitted_by: string;
  medicines: string[];
  medical_conditions: string[];
  previous_surgeries: string[];
  allergies: string[];
  affected_teeth: {
    cavity: number[];
    rootCanal: number[];
    implant: number[];
    extraction: number[];
    missing: number[];
    treated: number[];
    existingImplant: number[];
    amalgam: number[];
    broken: number[];
    crown: number[];
  };
}

export default function AdminPanel() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') { // Table doesn't exist
          setError('No patients found. The patients table may need to be set up.');
        } else {
          setError(error.message);
        }
        return;
      }

      setPatients(data || []);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const makeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.rpc('make_user_admin', {
        user_email: newAdminEmail
      });

      if (error) throw error;
      setMessage({ type: 'success', text: `Successfully made ${newAdminEmail} an admin` });
      setNewAdminEmail('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.submitted_by?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = [
      'Name',
      'Gender',
      'Date of Birth',
      'Submitted By',
      'Submission Date',
      'Medicines',
      'Medical Conditions',
      'Previous Surgeries',
      'Allergies'
    ];

    const csvData = filteredPatients.map(patient => [
      patient.name,
      patient.gender,
      patient.date_of_birth,
      patient.submitted_by || 'N/A',
      format(new Date(patient.created_at), 'yyyy-MM-dd HH:mm:ss'),
      patient.medicines.join('; '),
      patient.medical_conditions.join('; '),
      patient.previous_surgeries.join('; '),
      patient.allergies.join('; ')
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `patients_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (loading) {
    return <div>Loading patients...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h2 className="text-red-800 font-medium">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <img
                src="https://i.imgur.com/umOU4WN.png"
                alt="DentaWista Logo"
                className="h-8 w-auto"
              />
              <h1 className="ml-4 text-xl font-semibold text-gray-900">Admin Panel</h1>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Add Admin Form */}
        <div className="mb-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Add New Admin</h2>
          {message && (
            <div className={`mb-4 p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.text}
            </div>
          )}
          <form onSubmit={makeAdmin} className="flex gap-4">
            <div className="flex-1">
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="Enter user email"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Make Admin
            </button>
          </form>
        </div>

        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by patient name or submitter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={exportToCSV}
              className="ml-4 flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              <Download className="h-5 w-5 mr-2" />
              Export to CSV
            </button>
          </div>

          {patients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No patients found.</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredPatients.map((patient) => (
                  <li key={patient.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{patient.name}</h3>
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-500">
                          <div>
                            <p><span className="font-medium">Gender:</span> {patient.gender}</p>
                            <p><span className="font-medium">Date of Birth:</span> {patient.date_of_birth}</p>
                            <p><span className="font-medium">Submitted By:</span> {patient.submitted_by || 'N/A'}</p>
                          </div>
                          <div>
                            <p><span className="font-medium">Submission Date:</span> {format(new Date(patient.created_at), 'PPP')}</p>
                            <p><span className="font-medium">Medical Conditions:</span> {patient.medical_conditions.length}</p>
                            <p><span className="font-medium">Medications:</span> {patient.medicines.length}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}