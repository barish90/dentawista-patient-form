import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, orderBy, query, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { format, isValid } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import AdminUsers from './AdminUsers';
import gsap from 'gsap';
import { Transition } from '@headlessui/react';
import ConfirmationDialog from './ConfirmationDialog';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ArrowLeftOnRectangleIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  EyeIcon,
  CubeIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface Patient {
  id: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  createdAt: string;
  medicalConditions: string[];
  previousSurgeries: string[];
  allergies: string[];
  medicines: string[];
  xrayImage?: string;
  model_files: string[];
  hasCavity: boolean;
  needsRootCanal: boolean;
  needsImplant: boolean;
  needsExtraction: boolean;
  missingTooth: boolean;
  rootTreated: boolean;
  existingImplant: boolean;
  hasAmalgam: boolean;
  hasBrokenTeeth: boolean;
  hasCrown: boolean;
  affectedTeeth?: {
    cavity?: number[];
    rootCanal?: number[];
    implant?: number[];
    extraction?: number[];
    missing?: number[];
    treated?: number[];
    existingImplant?: number[];
    amalgam?: number[];
    broken?: number[];
    crown?: number[];
  };
  submittedBy: string;
  userId: string;
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return isValid(date) ? format(date, 'MM/dd/yyyy') : 'Invalid date';
  } catch {
    return 'Invalid date';
  }
};

const conditionIcons: Record<string, string> = {
  cavity: '/images/dental/dental-cavity.svg',
  rootCanal: '/images/dental/root-canal.svg',
  implant: '/images/dental/dental-implant.svg',
  extraction: '/images/dental/tooth-extraction.svg',
  missing: '/images/dental/tooth-extraction.svg',
  treated: '/images/dental/healthy-tooth.svg',
  existingImplant: '/images/dental/dental-implant.svg',
  amalgam: '/images/dental/filling.svg',
  broken: '/images/dental/cracked-tooth.svg',
  crown: '/images/dental/dental-crown.svg',
};

const AdminPanel = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Patient>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'patients' | 'users'>('patients');
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<{ id: string; name: string } | null>(null);
  const navigate = useNavigate();
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fetchPatients = async () => {
    try {
      setError('');
      setLoading(true);
      const patientsRef = collection(db, 'patients');
      const q = query(patientsRef, orderBy(sortField as string, sortDirection));
      const querySnapshot = await getDocs(q);
      const patientsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];

      const uniqueUserIds = [...new Set(patientsData.map(p => p.userId))];
      const userNamesMap: Record<string, string> = {};

      for (const userId of uniqueUserIds) {
        if (userId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userNamesMap[userId] = userData.displayName || userData.email || 'Unknown User';
            } else {
              userNamesMap[userId] = 'Deleted User';
            }
          } catch (userFetchError) {
            console.error(`Failed to fetch user ${userId}:`, userFetchError);
            userNamesMap[userId] = 'Error Fetching User';
          }
        }
      }

      setUserNames(userNamesMap);
      setPatients(patientsData);
    } catch (err) {
      setError('Error fetching patients');
      console.error('Error fetching patients:', err);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'patients') {
      fetchPatients();
    }
  }, [sortField, sortDirection, activeTab]);

  useEffect(() => {
    if (!loading && activeTab === 'patients' && cardRefs.current.length > 0) {
      const visibleCards = cardRefs.current.filter(el => el !== null);
      if (visibleCards.length > 0) {
        gsap.from(visibleCards, {
          duration: 0.5,
          y: 30,
          opacity: 0,
          stagger: 0.05,
          ease: "power2.out"
        });
      }
    }
  }, [patients, loading, activeTab]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const filteredPatients = patients.filter(patient => {
    const searchableValues = Object.values(patient || {}).filter(value => value !== null && value !== undefined);
    return searchableValues.some(value =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const togglePatientExpansion = (patientId: string) => {
    setExpandedPatient(prev => (prev === patientId ? null : patientId));
  };

  const openDeleteConfirmation = (patientId: string, patientName: string) => {
    setPatientToDelete({ id: patientId, name: patientName });
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;

    const { id: patientId, name: patientName } = patientToDelete;

    try {
      setError('');
      setSuccess('');
      const patientRef = doc(db, 'patients', patientId);
      await deleteDoc(patientRef);

      setPatients(prevPatients => prevPatients.filter(p => p.id !== patientId));

      setSuccess(`Successfully deleted patient record for ${patientName}.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error("Error deleting patient:", err);
      setError("Failed to delete patient record. Please try again.");
      setTimeout(() => setError(''), 3000);
    } finally {
      setPatientToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>

        <div className="mb-8">
          <nav className="flex space-x-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('patients')}
              className={`${activeTab === 'patients'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Patient Records
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`${activeTab === 'users'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <UserGroupIcon className="h-5 w-5 mr-2" />
              Manage Users
            </button>
          </nav>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'patients' ? (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search patients..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex items-center space-x-4 ml-4">
                <span className="text-sm font-medium text-gray-500">Sort by:</span>
                <select
                  value={`${sortField}-${sortDirection}`}
                  onChange={(e) => {
                    const [field, direction] = e.target.value.split('-');
                    setSortField(field as keyof Patient);
                    setSortDirection(direction as 'asc' | 'desc');
                  }}
                  className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                >
                  <option value="createdAt-desc">Date Submitted (Newest)</option>
                  <option value="createdAt-asc">Date Submitted (Oldest)</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredPatients.map((patient, index) => (
                  <div
                    key={patient.id}
                    ref={el => cardRefs.current[index] = el}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{patient.name}</h3>
                          <p className="text-sm text-gray-500 flex items-center mt-1">
                            <UserCircleIcon className="h-4 w-4 mr-1 text-gray-400" />
                            Submitted by: {userNames[patient.userId] || 'Loading user...'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => togglePatientExpansion(patient.id)}
                            className="text-xs px-3 py-1 rounded-full font-medium flex items-center transition-colors duration-200 "
                            style={{
                              backgroundColor: expandedPatient === patient.id ? '#eef2ff' : 'transparent',
                              color: expandedPatient === patient.id ? '#4f46e5' : '#6b7280',
                            }}
                          >
                            {expandedPatient === patient.id
                              ? <ChevronUpIcon className="h-4 w-4 mr-1" />
                              : <ChevronDownIcon className="h-4 w-4 mr-1" />
                            }
                            {expandedPatient === patient.id ? 'Hide' : 'Details'}
                          </button>
                          <button
                            onClick={() => openDeleteConfirmation(patient.id, patient.name)}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-100 transition-colors duration-200"
                            title="Delete Patient Record"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <Transition
                        show={expandedPatient === patient.id}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <dt className="text-gray-500 font-medium">Gender</dt>
                              <dd className="text-gray-900 mt-1">{patient.gender}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-500 font-medium">Date of Birth</dt>
                              <dd className="text-gray-900 mt-1">{formatDate(patient.dateOfBirth)}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-500 font-medium">Submitted</dt>
                              <dd className="text-gray-900 mt-1">{formatDate(patient.createdAt)}</dd>
                            </div>
                          </div>

                          {(patient.medicalConditions?.length > 0 || patient.previousSurgeries?.length > 0 || patient.allergies?.length > 0 || patient.medicines?.length > 0) && (
                            <div className="pt-4 border-t border-gray-200 text-sm">
                              <h4 className="font-medium text-gray-900 mb-2 flex items-center"><ClipboardDocumentListIcon className="h-5 w-5 mr-2 text-gray-400" />Medical History</h4>
                              <dl className="space-y-2">
                                {patient.medicalConditions?.length > 0 && (
                                  <div className="flex">
                                    <dt className="w-1/4 text-gray-500 font-medium flex-shrink-0">Conditions</dt>
                                    <dd className="text-gray-900">{patient.medicalConditions.join(', ')}</dd>
                                  </div>
                                )}
                                {patient.previousSurgeries?.length > 0 && (
                                  <div className="flex">
                                    <dt className="w-1/4 text-gray-500 font-medium flex-shrink-0">Surgeries</dt>
                                    <dd className="text-gray-900">{patient.previousSurgeries.join(', ')}</dd>
                                  </div>
                                )}
                                {patient.allergies?.length > 0 && (
                                  <div className="flex">
                                    <dt className="w-1/4 text-gray-500 font-medium flex-shrink-0">Allergies</dt>
                                    <dd className="text-gray-900">{patient.allergies.join(', ')}</dd>
                                  </div>
                                )}
                                {patient.medicines?.length > 0 && (
                                  <div className="flex">
                                    <dt className="w-1/4 text-gray-500 font-medium flex-shrink-0">Medications</dt>
                                    <dd className="text-gray-900">{patient.medicines.join(', ')}</dd>
                                  </div>
                                )}
                              </dl>
                            </div>
                          )}

                          {patient.affectedTeeth && Object.values(patient.affectedTeeth).some(arr => arr?.length > 0) && (
                            <div className="pt-4 border-t border-gray-200 text-sm">
                              <h4 className="font-medium text-gray-900 mb-2 flex items-center"><ShieldCheckIcon className="h-5 w-5 mr-2 text-gray-400" />Dental Chart Summary</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                                {Object.entries(patient.affectedTeeth)
                                  .filter(([, teeth]) => Array.isArray(teeth) && teeth.length > 0)
                                  .map(([condition, teeth]) => {
                                    const conditionName = condition.replace(/([A-Z])/g, ' $1').trim();
                                    return (
                                      <div key={condition} className="flex items-center space-x-1.5">
                                        <img
                                          src={conditionIcons[condition] || '/images/dental/question-mark.svg'}
                                          alt={conditionName}
                                          className="h-5 w-5 flex-shrink-0"
                                          title={conditionName}
                                        />
                                        <span className="text-gray-600 capitalize">{conditionName}:</span>
                                        <span className="text-gray-900 font-medium">{teeth.join(', ')}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {(patient.xrayImage || patient.model_files?.length > 0) && (
                            <div className="pt-4 border-t border-gray-200 text-sm">
                              <h4 className="font-medium text-gray-900 mb-2 flex items-center"><EyeIcon className="h-5 w-5 mr-2 text-gray-400" />Medical Images</h4>
                              <div className="space-y-4">
                                {patient.xrayImage && (
                                  <div>
                                    <h6 className="text-xs font-medium text-gray-500 mb-1">X-Ray Image</h6>
                                    <img
                                      src={patient.xrayImage}
                                      alt={`${patient.name} X-Ray`}
                                      className="max-w-full h-auto rounded-lg shadow-md border border-gray-200"
                                    />
                                  </div>
                                )}
                                {patient.model_files?.length > 0 && (
                                  <div>
                                    <h6 className="text-xs font-medium text-gray-500 mb-1">3D Scan Files</h6>
                                    <div className="space-y-1">
                                      {patient.model_files.map((file, index) => (
                                        <a
                                          key={index}
                                          href={file}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center text-sm text-indigo-600 hover:text-indigo-900"
                                        >
                                          <CubeIcon className="h-4 w-4 mr-2" />
                                          Model File {index + 1}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </Transition>
                    </div>
                  </div>
                ))}
                {!loading && filteredPatients.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No patients found matching your search criteria.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <AdminUsers />
        )}
      </div>

      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Patient Record?"
        message={
          <>Are you sure you want to delete the patient record for <strong className="text-gray-900">{patientToDelete?.name || 'this patient'}</strong>? This action cannot be undone.</>
        }
        confirmButtonText="Delete"
      />
    </div>
  );
};

export default AdminPanel;