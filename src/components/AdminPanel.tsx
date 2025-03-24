import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Search, Download, LogOut, UserPlus, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Patient {
  id: string;
  name: string;
  gender: string;
  date_of_birth: string;
  medicines: string[];
  medical_conditions: string[];
  previous_surgeries: string[];
  allergies: string[];
  affected_teeth: Record<string, number[]>;
  submitted_by_id: string;
  created_at: string;
  submitter_name?: string;
  images?: string[];
  model_files?: string[];
}

export default function AdminPanel() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, [pageSize, currentPage]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      
      const { count } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });
      
      setTotalPatients(count || 0);

      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select(`
          *,
          user_profiles!patients_submitted_by_id_fkey (
            email,
            raw_user_meta_data
          )
        `)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (patientsError) throw patientsError;

      const patientsWithSubmitters = patients?.map(patient => ({
        ...patient,
        submitter_name: patient.user_profiles?.raw_user_meta_data?.name || 
                       patient.user_profiles?.raw_user_meta_data?.full_name ||
                       patient.user_profiles?.email ||
                       'Unknown'
      })) || [];

      setPatients(patientsWithSubmitters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred fetching patients');
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

  const togglePatientDetails = (patientId: string) => {
    setExpandedPatient(expandedPatient === patientId ? null : patientId);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const totalPages = Math.ceil(totalPatients / pageSize);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.submitter_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
      patient.submitter_name || 'N/A',
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

  const handlePageSizeChange = async (newSize: number) => {
    setLoading(true);
    setPageSize(newSize);
    setCurrentPage(1);
    await fetchPatients();
    setLoading(false);
  };

  const getFileUrl = async (path: string) => {
    try {
      const bucketName = path.startsWith('xray-images/') ? 'xray-images' : 'model-files';
      const { data } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(path, 3600); // URL valid for 1 hour

      return data?.signedUrl;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  };

  const getImageUrl = (path: string) => {
    try {
      if (!path) {
        return null;
      }

      if (path.startsWith('http')) {
        return path;
      }

      const cleanPath = path.replace(/^xray-images\//, '');
      const { data: { publicUrl } } = supabase.storage
        .from('xray-images')
        .getPublicUrl(cleanPath);

      return publicUrl;
    } catch (error) {
      return null;
    }
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Patient List</h1>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Back to Main Page
          </button>
        </div>

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

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <div className="flex items-center space-x-4">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entries</span>
              </div>
              <div>
                Total Patients: {totalPatients}
              </div>
            </div>

            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date of Birth
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Added
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                        <span>Loading patients...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-red-600">{error}</td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <React.Fragment key={patient.id}>
                      <tr
                        onClick={() => togglePatientDetails(patient.id)}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          expandedPatient === patient.id ? 'bg-gray-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">{patient.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap capitalize">{patient.gender}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{formatDate(patient.date_of_birth)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{patient.submitter_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap flex items-center justify-between">
                          <span>{formatDate(patient.created_at)}</span>
                          {expandedPatient === patient.id ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </td>
                      </tr>
                      {expandedPatient === patient.id && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              <div>
                                <h3 className="font-semibold">Medical Information</h3>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                  <div>
                                    <h4 className="font-medium">Medicines</h4>
                                    <ul className="list-disc list-inside">
                                      {patient.medicines.map((med, i) => (
                                        <li key={i}>{med}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Medical Conditions</h4>
                                    <ul className="list-disc list-inside">
                                      {patient.medical_conditions.map((condition, i) => (
                                        <li key={i}>{condition}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h3 className="font-semibold">Dental Information</h3>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                  {Object.entries(patient.affected_teeth).map(([condition, teeth]) => (
                                    <div key={condition}>
                                      <h4 className="font-medium capitalize">
                                        {condition.replace(/([A-Z])/g, ' $1').trim()}
                                      </h4>
                                      <p>{teeth.join(', ') || 'None'}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="mt-4">
                                <h3 className="font-semibold">Uploaded Files</h3>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                  <div>
                                    <h4 className="font-medium">X-Ray Images</h4>
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                      {patient.images && patient.images.length > 0 ? (
                                        patient.images.map((imagePath, index) => {
                                          const imageUrl = getImageUrl(imagePath);
                                          return imageUrl ? (
                                            <div key={index} className="relative group">
                                              <img
                                                src={imageUrl}
                                                alt={`X-ray ${index + 1}`}
                                                className="w-full h-40 object-cover rounded cursor-pointer"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  window.open(imageUrl, '_blank');
                                                }}
                                                onError={(e) => {
                                                  const imgElement = e.target as HTMLImageElement;
                                                  imgElement.src = '/images/placeholder-image.png';
                                                }}
                                              />
                                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                                                <button
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    window.open(imageUrl, '_blank');
                                                  }}
                                                  className="opacity-0 group-hover:opacity-100 bg-white text-gray-800 px-4 py-2 rounded shadow"
                                                >
                                                  View Full Size
                                                </button>
                                              </div>
                                            </div>
                                          ) : null;
                                        })
                                      ) : (
                                        <p className="text-gray-500 italic">No X-ray images uploaded</p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-medium">3D Models</h4>
                                    <div className="space-y-2 mt-2">
                                      {patient.model_files && patient.model_files.length > 0 ? (
                                        patient.model_files.map((path, index) => {
                                          const modelUrl = getImageUrl(path);
                                          return modelUrl ? (
                                            <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                                              <span>{path.split('/').pop()}</span>
                                              <button
                                                onClick={() => window.open(modelUrl, '_blank')}
                                                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                                              >
                                                <Download className="h-4 w-4" />
                                              </button>
                                            </div>
                                          ) : null;
                                        })
                                      ) : (
                                        <p className="text-gray-500 italic">No 3D models uploaded</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>

            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div>
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalPatients)} of {totalPatients} entries
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}