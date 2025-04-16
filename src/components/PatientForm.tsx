import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db, auth } from "../lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { gsap } from 'gsap';
import { TeethDiagram } from "./TeethDiagram";
import SuccessAnimation from "./SuccessAnimation";
import ConfirmationDialog from "./ConfirmationDialog";
import {
  UserIcon,
  PlusIcon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import ImageUploader from './ImageUploader';

interface PatientData {
  name: string;
  gender: string;
  dateOfBirth: string;
  medicalConditions: string[];
  previousSurgeries: string[];
  allergies: string[];
  medicines: string[];
  userId: string;
  createdAt?: Timestamp;
  affectedTeeth: {
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
  xrayImageUrl?: string | null;
}

interface UserOrgProfile {
  organizationName?: string;
  organizationAddress?: string;
  organizationTaxId?: string;
  organizationPhoneNumber?: string;
}

const initialPatientData: PatientData = {
  name: "",
  gender: "",
  dateOfBirth: "",
  medicalConditions: [],
  previousSurgeries: [],
  allergies: [],
  medicines: [],
  userId: "",
  affectedTeeth: {
    cavity: [],
    rootCanal: [],
    implant: [],
    extraction: [],
    missing: [],
    treated: [],
    existingImplant: [],
    amalgam: [],
    broken: [],
    crown: [],
  },
  xrayImageUrl: null
};

const PatientForm = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const [patientData, setPatientData] = useState<PatientData>(initialPatientData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<string>("cavity");
  const [newCondition, setNewCondition] = useState("");
  const [newMedicine, setNewMedicine] = useState("");
  const [xrayPreview, setXrayPreview] = useState<string | null>(null);
  const [modelFiles, setModelFiles] = useState<File[]>([]);

  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(false);
  const [showProfileDialog, setShowProfileDialog] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setProfileLoading(true);
      setShowProfileDialog(false);
      const user = auth.currentUser;
      if (!user) {
        setProfileLoading(false);
        navigate('/login');
        return;
      }
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserOrgProfile & { organizationAddress?: { street?: string; city?: string; postalCode?: string; country?: string; state?: string; } };
          const addressComplete = !!(data.organizationAddress?.street?.trim() &&
            data.organizationAddress?.city?.trim() &&
            data.organizationAddress?.postalCode?.trim() &&
            data.organizationAddress?.country?.trim());
          const complete = !!(data.organizationName?.trim() &&
            addressComplete &&
            data.organizationTaxId?.trim() &&
            data.organizationPhoneNumber?.trim());
          setIsProfileComplete(complete);
        } else {
          setIsProfileComplete(false);
        }
      } catch (_err) {
        setIsProfileComplete(false);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (pageContainerRef.current) {
        const initialDelay = 0.3;

        gsap.from(".form-header > *", {
          opacity: 0,
          y: 30,
          duration: 0.5,
          stagger: 0.15,
          ease: 'power2.out',
          delay: initialDelay
        });

        gsap.from(".form-section", {
          opacity: 0,
          y: 50,
          duration: 0.6,
          stagger: 0.2,
          ease: 'power3.out',
          delay: initialDelay + 0.15
        });
      }
    }, pageContainerRef);

    return () => ctx.revert();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPatientData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      setPatientData(prev => ({
        ...prev,
        medicalConditions: [...prev.medicalConditions, newCondition.trim()]
      }));
      setNewCondition("");
    }
  };

  const removeCondition = (index: number) => {
    setPatientData(prev => ({
      ...prev,
      medicalConditions: prev.medicalConditions.filter((_, i) => i !== index)
    }));
  };

  const addMedicine = () => {
    if (newMedicine.trim()) {
      setPatientData(prev => ({
        ...prev,
        medicines: [...prev.medicines, newMedicine.trim()]
      }));
      setNewMedicine("");
    }
  };

  const removeMedicine = (index: number) => {
    setPatientData(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index)
    }));
  };

  const handleToothClick = (tooth: number, e: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (selectedCondition === "missing") {
      setPatientData(prev => {
        const isMissing = prev.affectedTeeth.missing.includes(tooth);
        const newMissingTeeth = isMissing
          ? prev.affectedTeeth.missing.filter(t => t !== tooth)
          : [...prev.affectedTeeth.missing, tooth];

        const newAffectedTeeth = { ...prev.affectedTeeth };
        if (!isMissing) {
          Object.keys(newAffectedTeeth).forEach(condition => {
            if (condition !== "missing") {
              newAffectedTeeth[condition as keyof typeof newAffectedTeeth] =
                newAffectedTeeth[condition as keyof typeof newAffectedTeeth].filter(t => t !== tooth);
            }
          });
        }

        return {
          ...prev,
          affectedTeeth: {
            ...newAffectedTeeth,
            missing: newMissingTeeth
          }
        };
      });
      return;
    }

    if (patientData.affectedTeeth.missing.includes(tooth) && selectedCondition !== "implant") {
      return;
    }

    setPatientData(prev => {
      const currentTeeth = prev.affectedTeeth[selectedCondition as keyof typeof prev.affectedTeeth];
      const isSelected = currentTeeth.includes(tooth);
      const newTeeth = isSelected
        ? currentTeeth.filter(t => t !== tooth)
        : [...currentTeeth, tooth];

      return {
        ...prev,
        affectedTeeth: {
          ...prev.affectedTeeth,
          [selectedCondition]: newTeeth
        }
      };
    });
  };

  const handleConditionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const condition = e.currentTarget.dataset.condition;
    if (condition) {
      setSelectedCondition(condition);
    }
  };

  const handleXrayImageSelect = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setXrayPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleModelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setModelFiles(files);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isProfileComplete && !profileLoading) {
      setShowProfileDialog(true);
      return;
    }

    setIsSubmitting(true);
    setShowSuccess(false);
    const user = auth.currentUser;

    if (!user) {
      console.error("User not logged in");
      setIsSubmitting(false);
      return;
    }

    try {
      const dataToSubmit: PatientData = {
        ...patientData,
        userId: user.uid,
        createdAt: serverTimestamp() as Timestamp,
        affectedTeeth: patientData.affectedTeeth,
        xrayImageUrl: xrayPreview
      };

      // --- Re-enable Firestore write ---
      // const docRef = await addDoc(collection(db, "patients"), dataToSubmit);
      await addDoc(collection(db, "patients"), dataToSubmit); // Call addDoc without storing the ref
      // console.log("Document written with ID: ", docRef.id); // Remove user-facing log
      // --- End Re-enable ---

      setShowSuccess(true);

      setTimeout(() => {
        setPatientData(initialPatientData);
        setXrayPreview(null);
        setShowSuccess(false);
        setIsSubmitting(false);
        window.scrollTo(0, 0);
      }, 3500);

    } catch (error) {
      console.error("Error adding document: ", error);
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const disableSubmit = isSubmitting || profileLoading;

  return (
    <div ref={pageContainerRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 form-header">
          <div className="flex items-center space-x-2">
            <UserIcon className="h-6 w-6 text-gray-600" />
            <span className="text-gray-700">
              {/* Prioritize displayName, fallback to email, then 'User' */}
              {auth.currentUser?.displayName || auth.currentUser?.email || 'User'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/profile"
              className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors"
              title="Edit My Profile"
            >
              <Cog6ToothIcon className="h-5 w-5 mr-2" />
              My Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
              title="Logout"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>

        <div className="text-center mb-12 form-header">
          <div className="flex justify-center mb-6">
            <img
              src="/images/logos/logo.png"
              alt="Dentawista Logo"
              className="h-32 w-auto"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/logos/logo.png";
              }}
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Dentawista - Patient Registration
          </h1>
          <p className="text-lg text-gray-600">
            Please fill in the patient's information below
          </p>
        </div>

        <form
          ref={formRef}
          onSubmit={handleFormSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          className="bg-white rounded-2xl shadow-xl p-8 space-y-8"
        >
          <section className="space-y-6 form-section">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
              <UserIcon className="h-6 w-6 mr-2 text-blue-600" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={patientData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  value={patientData.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={patientData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6 form-section">
            <h2 className="text-2xl font-semibold text-gray-900">Medical History</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical Conditions
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {patientData.medicalConditions.map((condition, index) => (
                    <div
                      key={index}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center"
                    >
                      {condition}
                      <button
                        type="button"
                        onClick={() => removeCondition(index)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-l-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Add medical condition"
                  />
                  <button
                    type="button"
                    onClick={addCondition}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition duration-200"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medications
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {patientData.medicines.map((medicine, index) => (
                    <div
                      key={index}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center"
                    >
                      {medicine}
                      <button
                        type="button"
                        onClick={() => removeMedicine(index)}
                        className="ml-2 text-green-600 hover:text-green-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newMedicine}
                    onChange={(e) => setNewMedicine(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-l-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Add medication"
                  />
                  <button
                    type="button"
                    onClick={addMedicine}
                    className="px-4 py-2 bg-green-600 text-white rounded-r-lg hover:bg-green-700 transition duration-200"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6 form-section">
            <h2 className="text-2xl font-semibold text-gray-900">Medical Images</h2>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700">X-ray Image</h3>
              <ImageUploader onImageSelect={handleXrayImageSelect} />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700">3D Scan Files</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  type="file"
                  multiple
                  accept=".stl,.obj,.ply"
                  onChange={handleModelFileSelect}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Supported formats: STL, OBJ, PLY
                </p>
                {modelFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700">Selected Files:</h4>
                    <ul className="mt-2 space-y-1">
                      {modelFiles.map((file, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-6 form-section">
            <h2 className="text-2xl font-semibold text-gray-900">Dental Conditions</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-6 rounded-xl">
                <TeethDiagram
                  selectedTeeth={patientData.affectedTeeth[selectedCondition as keyof typeof patientData.affectedTeeth]}
                  onToothClick={handleToothClick}
                  upperTeeth={[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]}
                  lowerTeeth={[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]}
                  condition={selectedCondition}
                  missingTeeth={patientData.affectedTeeth.missing}
                  allSelectedTeeth={patientData.affectedTeeth}
                  shouldDisableTooth={(tooth) => {
                    return patientData.affectedTeeth.missing.includes(tooth) &&
                      selectedCondition !== "missing" &&
                      selectedCondition !== "implant";
                  }}
                  showLabels={false}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                <button
                  type="button"
                  data-condition="cavity"
                  onClick={handleConditionClick}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`p-3 rounded-lg border-2 transition-all ${selectedCondition === "cavity"
                    ? "border-red-500 bg-red-100 shadow-md"
                    : "border-gray-200 hover:border-red-300 hover:bg-red-50"
                    }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <img src="/images/dental/dental-cavity.svg" alt="Cavity" className="w-6 h-6" />
                    <span className="text-sm font-medium">Cavity</span>
                  </div>
                </button>

                <button
                  type="button"
                  data-condition="rootCanal"
                  onClick={handleConditionClick}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`p-3 rounded-lg border-2 transition-all ${selectedCondition === "rootCanal"
                    ? "border-blue-500 bg-blue-100 shadow-md"
                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <img src="/images/dental/root-canal.svg" alt="Root Canal" className="w-6 h-6" />
                    <span className="text-sm font-medium">Root Canal</span>
                  </div>
                </button>

                <button
                  type="button"
                  data-condition="implant"
                  onClick={handleConditionClick}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`p-3 rounded-lg border-2 transition-all ${selectedCondition === "implant"
                    ? "border-purple-500 bg-purple-100 shadow-md"
                    : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                    }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <img src="/images/dental/dental-implant.svg" alt="Implant" className="w-6 h-6" />
                    <span className="text-sm font-medium">Implant</span>
                  </div>
                </button>

                <button
                  type="button"
                  data-condition="extraction"
                  onClick={handleConditionClick}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`p-3 rounded-lg border-2 transition-all ${selectedCondition === "extraction"
                    ? "border-orange-500 bg-orange-100 shadow-md"
                    : "border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                    }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <img src="/images/dental/tooth-extraction.svg" alt="Extraction" className="w-6 h-6" />
                    <span className="text-sm font-medium">Extraction</span>
                  </div>
                </button>

                <button
                  type="button"
                  data-condition="missing"
                  onClick={handleConditionClick}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`p-3 rounded-lg border-2 transition-all ${selectedCondition === "missing"
                    ? "border-gray-500 bg-gray-100 shadow-md"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <img src="/images/dental/tooth-extraction.svg" alt="Missing" className="w-6 h-6 opacity-50" />
                    <span className="text-sm font-medium">Missing</span>
                  </div>
                </button>

                <button
                  type="button"
                  data-condition="treated"
                  onClick={handleConditionClick}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`p-3 rounded-lg border-2 transition-all ${selectedCondition === "treated"
                    ? "border-green-500 bg-green-100 shadow-md"
                    : "border-gray-200 hover:border-green-300 hover:bg-green-50"
                    }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <img src="/images/dental/healthy-tooth.svg" alt="Treated" className="w-6 h-6" />
                    <span className="text-sm font-medium">Treated</span>
                  </div>
                </button>

                <button
                  type="button"
                  data-condition="existingImplant"
                  onClick={handleConditionClick}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`p-3 rounded-lg border-2 transition-all ${selectedCondition === "existingImplant"
                    ? "border-yellow-500 bg-yellow-100 shadow-md"
                    : "border-gray-200 hover:border-yellow-300 hover:bg-yellow-50"
                    }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <img src="/images/dental/dental-implant.svg" alt="Existing Implant" className="w-6 h-6" />
                    <span className="text-sm font-medium">Existing Implant</span>
                  </div>
                </button>

                <button
                  type="button"
                  data-condition="amalgam"
                  onClick={handleConditionClick}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`p-3 rounded-lg border-2 transition-all ${selectedCondition === "amalgam"
                    ? "border-indigo-500 bg-indigo-100 shadow-md"
                    : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                    }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <img src="/images/dental/filling.svg" alt="Amalgam" className="w-6 h-6" />
                    <span className="text-sm font-medium">Amalgam</span>
                  </div>
                </button>

                <button
                  type="button"
                  data-condition="broken"
                  onClick={handleConditionClick}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`p-3 rounded-lg border-2 transition-all ${selectedCondition === "broken"
                    ? "border-pink-500 bg-pink-100 shadow-md"
                    : "border-gray-200 hover:border-pink-300 hover:bg-pink-50"
                    }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <img src="/images/dental/cracked-tooth.svg" alt="Broken" className="w-6 h-6" />
                    <span className="text-sm font-medium">Broken</span>
                  </div>
                </button>

                <button
                  type="button"
                  data-condition="crown"
                  onClick={handleConditionClick}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`p-3 rounded-lg border-2 transition-all ${selectedCondition === "crown"
                    ? "border-teal-500 bg-teal-100 shadow-md"
                    : "border-gray-200 hover:border-teal-300 hover:bg-teal-50"
                    }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <img src="/images/dental/dental-crown.svg" alt="Crown" className="w-6 h-6" />
                    <span className="text-sm font-medium">Crown</span>
                  </div>
                </button>
              </div>
            </div>
          </section>

          <div className="flex justify-center mt-8 form-section">
            {profileLoading ? (
              <button
                type="button"
                disabled
                className="px-8 py-4 rounded-xl text-white font-semibold text-lg bg-gray-400 cursor-wait"
              >
                Checking Profile...
              </button>
            ) : (
              <button
                type="submit"
                disabled={disableSubmit}
                className={`px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${disableSubmit
                  ? 'bg-gray-400 cursor-not-allowed opacity-70'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                  }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </form>
      </div>

      {showSuccess && (
        <SuccessAnimation onComplete={() => setShowSuccess(false)} />
      )}

      <ConfirmationDialog
        isOpen={showProfileDialog}
        onClose={() => setShowProfileDialog(false)}
        onConfirm={() => navigate('/profile')}
        title="Profile Incomplete"
        message={
          <>
            Please complete your organization details (Name, Address, Phone, Tax ID) in your profile before submitting a new patient form.
          </>
        }
        confirmButtonText="Go to Profile"
        cancelButtonText="Close"
      />
    </div>
  );
};

export default PatientForm;
