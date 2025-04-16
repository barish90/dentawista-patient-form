import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, isValid } from 'date-fns';
import gsap from 'gsap';
import { Transition } from '@headlessui/react';
import ConfirmationDialog from './ConfirmationDialog';
import {
  UserIcon,
  EnvelopeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserPlusIcon,
  UserMinusIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  EyeIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import SuccessAnimation from "./SuccessAnimation";

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  userPhoneNumber?: string;
  organizationName?: string;
  organizationRole?: string;
  organizationTaxId?: string;
  organizationAddress?: {
    street?: string;
    city?: string;
    state?: string; // State/Province/Region
    postalCode?: string;
    country?: string;
  };
  organizationPhoneNumber?: string;
}

interface Patient {
  id: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  createdAt: string;
  medicalConditions?: string[];
  previousSurgeries?: string[];
  allergies?: string[];
  medicines?: string[];
  xrayImage?: string;
  model_files?: string[];
  hasCavity?: boolean;
  needsRootCanal?: boolean;
  needsImplant?: boolean;
  needsExtraction?: boolean;
  missingTooth?: boolean;
  rootTreated?: boolean;
  existingImplant?: boolean;
  hasAmalgam?: boolean;
  hasBrokenTeeth?: boolean;
  hasCrown?: boolean;
  affectedTeeth?: {
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

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userPatients, setUserPatients] = useState<Record<string, Patient[]>>({});
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [patientToDeleteInfo, setPatientToDeleteInfo] = useState<{ userId: string; patientId: string; patientName: string } | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (cardRefs.current.length > 0) {
      gsap.from(cardRefs.current.filter(el => el !== null), {
        duration: 0.5,
        y: 50,
        opacity: 0,
        stagger: 0.1,
        ease: "power2.out"
      });
    }
  }, [users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      usersData.sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
      setUsers(usersData);
    } catch (err) {
      setError('Error fetching users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPatients = async (userId: string) => {
    try {
      const patientsRef = collection(db, 'patients');
      const q = query(patientsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const patientsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];

      setUserPatients(prev => ({
        ...prev,
        [userId]: patientsData
      }));
    } catch (err) {
      console.error('Error fetching user patients:', err);
      setUserPatients(prev => ({
        ...prev,
        [userId]: []
      }));
    }
  };

  const toggleUserExpansion = async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!userPatients[userId] || userPatients[userId].length === 0) {
        setUserPatients(prev => ({ ...prev, [userId]: [] }));
        await fetchUserPatients(userId);
      }
    }
  };

  const toggleAdminRole = async (userId: string, currentRole: string) => {
    try {
      setError('');
      setSuccess('');
      const userRef = doc(db, 'users', userId);
      const newRole = currentRole === 'admin' ? 'user' : 'admin';

      await updateDoc(userRef, {
        role: newRole
      });

      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ));

      setSuccess(`User role updated to ${newRole}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error updating user role');
      console.error('Error updating user role:', err);
      setTimeout(() => setError(''), 3000);
    }
  };

  const togglePatientExpansion = (patientId: string) => {
    setExpandedPatient(expandedPatient === patientId ? null : patientId);
  };

  const openDeleteConfirmation = (userId: string, patientId: string, patientName: string) => {
    setPatientToDeleteInfo({ userId, patientId, patientName });
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!patientToDeleteInfo) return;

    const { userId, patientId, patientName } = patientToDeleteInfo;

    try {
      setError('');
      setSuccess('');
      const patientRef = doc(db, 'patients', patientId);
      await deleteDoc(patientRef);

      setUserPatients(prev => ({
        ...prev,
        [userId]: prev[userId]?.filter(p => p.id !== patientId) || [],
      }));

      setSuccess(`Successfully deleted patient record for ${patientName}.`);
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error("Error deleting patient:", err);
      setError("Failed to delete patient record. Please try again.");
      setTimeout(() => setError(''), 3000);
    } finally {
      setPatientToDeleteInfo(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
          <p className="mt-2 text-sm text-gray-600">Manage user roles and view patient submissions</p>
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

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {users.map((user, index) => (
              <div
                key={user.id}
                ref={el => cardRefs.current[index] = el}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <UserIcon className="h-8 w-8 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{user.displayName || 'No name set'}</h3>
                        <p className="text-sm text-gray-500 flex items-center">
                          <EnvelopeIcon className="h-4 w-4 mr-1" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {user.role}
                      </span>
                      <button
                        onClick={() => toggleAdminRole(user.id, user.role)}
                        className={`p-1 rounded-full transition-colors duration-200 ${user.role === 'admin'
                          ? 'text-red-600 hover:bg-red-100'
                          : 'text-green-600 hover:bg-green-100'
                          }`}
                        title={user.role === 'admin' ? 'Remove Admin Role' : 'Make Admin'}
                      >
                        {user.role === 'admin' ? (
                          <UserMinusIcon className="h-5 w-5" />
                        ) : (
                          <UserPlusIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => toggleUserExpansion(user.id)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center"
                      >
                        {expandedUser === user.id ? (
                          <>
                            <ChevronUpIcon className="h-5 w-5 mr-1" />
                            Hide Patients
                          </>
                        ) : (
                          <>
                            <ChevronDownIcon className="h-5 w-5 mr-1" />
                            Show Patients
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <Transition
                  show={expandedUser === user.id}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Patient Submissions:</h4>
                    {userPatients[user.id] === undefined && (
                      <p className="text-sm text-gray-500 italic">Loading patients...</p>
                    )}
                    {userPatients[user.id] && userPatients[user.id].length === 0 && (
                      <p className="text-sm text-gray-500 italic">No patient submissions found for this user.</p>
                    )}
                    {userPatients[user.id] && userPatients[user.id].length > 0 && (
                      <div className="space-y-3">
                        {userPatients[user.id].map(patient => (
                          <div key={patient.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-3">
                              <p className="text-sm font-medium text-gray-800">{patient.name}</p>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => togglePatientExpansion(patient.id)}
                                  className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                                >
                                  {expandedPatient === patient.id ? 'Hide Details' : 'Show Details'}
                                </button>
                                <button
                                  onClick={() => openDeleteConfirmation(user.id, patient.id, patient.name)}
                                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
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
                              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-700 space-y-3">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                  <p><span className="font-medium text-gray-500">Gender:</span> {patient.gender}</p>
                                  <p><span className="font-medium text-gray-500">DOB:</span> {formatDate(patient.dateOfBirth)}</p>
                                  <p><span className="font-medium text-gray-500">Submitted:</span> {formatDate(patient.createdAt)}</p>
                                </div>

                                {(patient.medicalConditions && patient.medicalConditions.length > 0) && (
                                  <p><span className="font-medium text-gray-500">Conditions:</span> {patient.medicalConditions.join(', ')}</p>
                                )}
                                {(patient.previousSurgeries && patient.previousSurgeries.length > 0) && (
                                  <p><span className="font-medium text-gray-500">Surgeries:</span> {patient.previousSurgeries.join(', ')}</p>
                                )}
                                {(patient.allergies && patient.allergies.length > 0) && (
                                  <p><span className="font-medium text-gray-500">Allergies:</span> {patient.allergies.join(', ')}</p>
                                )}
                                {(patient.medicines && patient.medicines.length > 0) && (
                                  <p><span className="font-medium text-gray-500">Medications:</span> {patient.medicines.join(', ')}</p>
                                )}

                                {patient.affectedTeeth && (
                                  <div className="pt-2 border-t border-gray-100 mt-2">
                                    <h5 className="font-medium text-gray-500 mb-1 flex items-center"><ShieldCheckIcon className="h-4 w-4 mr-1.5" />Dental Summary:</h5>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                      {Object.entries(patient.affectedTeeth)
                                        .filter(([, teeth]) => Array.isArray(teeth) && teeth.length > 0)
                                        .map(([condition, teeth]) => (
                                          <div key={condition} className="flex items-center space-x-1.5">
                                            <img
                                              src={conditionIcons[condition] || '/images/dental/question-mark.svg'}
                                              alt={condition}
                                              className="h-4 w-4 flex-shrink-0"
                                              title={condition}
                                            />
                                            <span className="text-gray-600 capitalize text-xs">{condition.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                            <span className="text-gray-900 font-medium text-xs">{teeth.join(', ')}</span>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}

                                {(patient.xrayImage || (patient.model_files && patient.model_files.length > 0)) && (
                                  <div className="pt-2 border-t border-gray-100 mt-2">
                                    <h5 className="font-medium text-gray-500 mb-1 flex items-center"><EyeIcon className="h-4 w-4 mr-1.5" />Medical Images:</h5>
                                    {patient.xrayImage && (
                                      <div className="mb-2">
                                        <p className="font-medium text-gray-500 mb-1">X-Ray:</p>
                                        <img src={patient.xrayImage} alt={`${patient.name} X-Ray`} className="max-w-xs h-auto rounded border border-gray-200" />
                                      </div>
                                    )}
                                    {(patient.model_files && patient.model_files.length > 0) && (
                                      <div>
                                        <p className="font-medium text-gray-500 mb-1">3D Scan Files:</p>
                                        <ul className="list-disc list-inside">
                                          {patient.model_files.map((fileUrl, index) => (
                                            <li key={index}>
                                              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Model File {index + 1}</a>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}

                              </div>
                            </Transition>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Transition>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Patient Submission?"
        message={
          <>Are you sure you want to delete the submission for <strong className="text-gray-900">{patientToDeleteInfo?.patientName || 'this patient'}</strong>? This action cannot be undone.</>
        }
        confirmButtonText="Delete"
      />
    </div>
  );
} 