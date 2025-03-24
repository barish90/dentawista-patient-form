import React, { useState, useEffect } from 'react';
import { User, Calendar, Plus, X, LogOut, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TeethDiagram } from './TeethDiagram';
import { ImageUploader } from './ImageUploader';
import { v4 as uuidv4 } from 'uuid';
import { ImageViewer } from './ImageViewer';

interface PatientForm {
  name: string;
  gender: string;
  dateOfBirth: string;
  medicines: string[];
  hasCavity: string;
  needsRootCanal: string;
  needsImplant: string;
  needsExtraction: string;
  missingTooth: string;
  rootTreated: string;
  existingImplant: string;
  hasAmalgam: string;
  hasBrokenTeeth: string;
  hasCrown: string;
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
  medicalConditions: string[];
  previousSurgeries: string[];
  allergies: string[];
  images?: string[];
  model_files?: string[];
}

interface PatientFormData {
  name: string;
  age: number;
  gender: string;
  medical_history: string;
  affected_teeth: string[];
  treatment_plan: string;
  user_id: string;
}

interface FileUpload {
  path: string;
  type: 'image' | 'model';
  originalName: string;
  url?: string;
}

const initialForm: PatientForm = {
  name: '',
  gender: '',
  dateOfBirth: '',
  medicines: [],
  hasCavity: '',
  needsRootCanal: '',
  needsImplant: '',
  needsExtraction: '',
  missingTooth: '',
  rootTreated: '',
  existingImplant: '',
  hasAmalgam: '',
  hasBrokenTeeth: '',
  hasCrown: '',
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
    crown: []
  },
  medicalConditions: [],
  previousSurgeries: [],
  allergies: []
};

const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export default function PatientForm({ session }: { session: any }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<PatientForm>(initialForm);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newMedicine, setNewMedicine] = useState('');
  const [userName, setUserName] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newSurgery, setNewSurgery] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (session?.user?.user_metadata) {
      const name = session.user.user_metadata.name || 
                  session.user.user_metadata.full_name || 
                  session.user.user_metadata.email;
      setUserName(name);
    }
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const addMedicine = () => {
    if (newMedicine.trim()) {
      setForm(prev => ({
        ...prev,
        medicines: [...prev.medicines, newMedicine.trim()]
      }));
      setNewMedicine('');
    }
  };

  const removeMedicine = (index: number) => {
    setForm(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index)
    }));
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      setForm(prev => ({
        ...prev,
        medicalConditions: [...prev.medicalConditions, newCondition.trim()]
      }));
      setNewCondition('');
    }
  };

  const removeCondition = (index: number) => {
    setForm(prev => ({
      ...prev,
      medicalConditions: prev.medicalConditions.filter((_, i) => i !== index)
    }));
  };

  const addSurgery = () => {
    if (newSurgery.trim()) {
      setForm(prev => ({
        ...prev,
        previousSurgeries: [...prev.previousSurgeries, newSurgery.trim()]
      }));
      setNewSurgery('');
    }
  };

  const removeSurgery = (index: number) => {
    setForm(prev => ({
      ...prev,
      previousSurgeries: prev.previousSurgeries.filter((_, i) => i !== index)
    }));
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setForm(prev => ({
        ...prev,
        allergies: [...prev.allergies, newAllergy.trim()]
      }));
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    setForm(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }));
  };

  const toggleTooth = (tooth: number, condition: keyof PatientForm['affectedTeeth']) => {
    setForm(prev => {
      const teeth = prev.affectedTeeth[condition];
      const newTeeth = teeth.includes(tooth)
        ? teeth.filter(t => t !== tooth)
        : [...teeth, tooth];
      
      return {
        ...prev,
        affectedTeeth: {
          ...prev.affectedTeeth,
          [condition]: newTeeth
        }
      };
    });
  };

  const handleFileUpload = async (file: File, type: 'image' | 'model'): Promise<FileUpload | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${uuidv4()}.${fileExt}`;
      const bucketName = type === 'image' ? 'xray-images' : 'model-files';

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;
      if (!data?.path) throw new Error('No path returned from upload');

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      return {
        path: data.path,
        type,
        originalName: file.name,
        url: publicUrl
      };
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Error uploading file' 
      });
      return null;
    }
  };

  const handleImageSelect = async (file: File) => {
    try {
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);

      const upload = await handleFileUpload(file, 'image');
      if (upload) {
        setForm(prev => ({
          ...prev,
          images: [...(prev.images || []), upload.path]
        }));
      }
    } catch (error) {
      console.error('Error handling image selection:', error);
      setMessage({
        type: 'error',
        text: 'Failed to upload image. Please try again.'
      });
    }
  };

  const handleModelSelect = async (file: File) => {
    const upload = await handleFileUpload(file, 'model');
    if (upload) {
      setForm(prev => ({
        ...prev,
        model_files: [...(prev.model_files || []), upload.path]
      }));
    }
  };

  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  const TeethSelector = ({ condition }: { condition: keyof PatientForm['affectedTeeth'] }) => {
    const showSelector = () => {
      switch (condition) {
        case 'cavity': return form.hasCavity === 'yes';
        case 'rootCanal': return form.needsRootCanal === 'yes';
        case 'implant': return form.needsImplant === 'yes';
        case 'extraction': return form.needsExtraction === 'yes';
        case 'missing': return form.missingTooth === 'yes';
        case 'treated': return form.rootTreated === 'yes';
        case 'existingImplant': return form.existingImplant === 'yes';
        case 'amalgam': return form.hasAmalgam === 'yes';
        case 'broken': return form.hasBrokenTeeth === 'yes';
        case 'crown': return form.hasCrown === 'yes';
        default: return false;
      }
    };

    if (!showSelector()) {
      return null;
    }

    return (
      <TeethDiagram
        selectedTeeth={form.affectedTeeth[condition]}
        onToothClick={(tooth) => toggleTooth(tooth, condition)}
        upperTeeth={upperTeeth}
        lowerTeeth={lowerTeeth}
        condition={condition}
        missingTeeth={form.affectedTeeth.missing}
      />
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (form.images?.length === 0 && previewImage) {
        setMessage({ 
          type: 'error', 
          text: 'Please wait for image upload to complete before submitting' 
        });
        return;
      }

      const patientData = {
        name: form.name,
        gender: form.gender,
        date_of_birth: form.dateOfBirth,
        medicines: form.medicines,
        medical_conditions: form.medicalConditions,
        previous_surgeries: form.previousSurgeries,
        allergies: form.allergies,
        affected_teeth: form.affectedTeeth,
        has_cavity: form.hasCavity === 'yes',
        needs_root_canal: form.needsRootCanal === 'yes',
        needs_implant: form.needsImplant === 'yes',
        needs_extraction: form.needsExtraction === 'yes',
        missing_tooth: form.missingTooth === 'yes',
        root_treated: form.rootTreated === 'yes',
        existing_implant: form.existingImplant === 'yes',
        has_amalgam: form.hasAmalgam === 'yes',
        has_broken_teeth: form.hasBrokenTeeth === 'yes',
        has_crown: form.hasCrown === 'yes',
        images: form.images || [],
        model_files: form.model_files || [],
        submitted_by_id: session.user.id
      };

      const { error } = await supabase
        .from('patients')
        .insert([patientData]);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Patient data saved successfully!' });
      setForm(initialForm);
      setPreviewImage(null);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while saving patient data';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-gray-600">
            Logged in as: {userName}
          </div>
          <button
            onClick={handleSignOut}
            className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </button>
        </div>

        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <img 
              src="https://i.imgur.com/umOU4WN.png" 
              alt="DentaWista Logo" 
              className="h-20 w-auto"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">DentaWista Patient Form</h1>
          <p className="text-lg text-gray-600">Please fill in the patient's dental information</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg px-8 pt-6 pb-8 mb-4">
          {/* Patient Information Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Patient Information</h2>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                Patient's Name
              </label>
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Gender
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    required
                    value="male"
                    checked={form.gender === 'male'}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="mr-2"
                  />
                  Male
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    required
                    value="female"
                    checked={form.gender === 'female'}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="mr-2"
                  />
                  Female
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    required
                    value="other"
                    checked={form.gender === 'other'}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="mr-2"
                  />
                  Other
                </label>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Date of Birth
              </label>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <input
                  type="date"
                  required
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Current Medication
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newMedicine}
                  onChange={(e) => setNewMedicine(e.target.value)}
                  className="shadow border rounded flex-1 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter medication"
                />
                <button
                  type="button"
                  onClick={addMedicine}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-md flex items-center"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2">
                {form.medicines.map((medicine, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span>{medicine}</span>
                    <button
                      type="button"
                      onClick={() => removeMedicine(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Medical Conditions
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  className="shadow border rounded flex-1 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter medical condition"
                />
                <button
                  type="button"
                  onClick={addCondition}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-md flex items-center"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2">
                {form.medicalConditions.map((condition, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span>{condition}</span>
                    <button
                      type="button"
                      onClick={() => removeCondition(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Previous Surgeries
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newSurgery}
                  onChange={(e) => setNewSurgery(e.target.value)}
                  className="shadow border rounded flex-1 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter previous surgery"
                />
                <button
                  type="button"
                  onClick={addSurgery}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-md flex items-center"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2">
                {form.previousSurgeries.map((surgery, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span>{surgery}</span>
                    <button
                      type="button"
                      onClick={() => removeSurgery(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Allergies
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  className="shadow border rounded flex-1 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter allergy"
                />
                <button
                  type="button"
                  onClick={addAllergy}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-md flex items-center"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2">
                {form.allergies.map((allergy, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span>{allergy}</span>
                    <button
                      type="button"
                      onClick={() => removeAllergy(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* X-Ray Images Section */}
          <div className="space-y-6 mt-8">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">X-Ray Images</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">X-Ray Images</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
                  className="mt-1 block w-full"
                />
                
                {previewImage && (
                  <div className="mt-4 relative">
                    <div 
                      className="relative w-full h-64 border rounded-lg overflow-hidden bg-gray-100"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      <img
                        src={previewImage}
                        alt="X-ray preview"
                        className="w-full h-full object-contain select-none"
                        style={{
                          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                          transition: isDragging ? 'none' : 'transform 0.1s',
                          cursor: isDragging ? 'grabbing' : 'grab'
                        }}
                        draggable={false}
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          type="button"
                          onClick={handleZoomIn}
                          className="p-1 bg-white rounded-full shadow hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleZoomOut}
                          className="p-1 bg-white rounded-full shadow hover:bg-gray-100 transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewImage(null);
                            setScale(1);
                            setPosition({ x: 0, y: 0 });
                          }}
                          className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">3D Models (.obj, .ply)</label>
                <input
                  type="file"
                  accept=".obj,.ply"
                  onChange={(e) => e.target.files?.[0] && handleModelSelect(e.target.files[0])}
                  className="mt-1 block w-full"
                />
              </div>
            </div>
          </div>

          {/* Diagnosis Section */}
          <div className="space-y-6 mt-8">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Diagnosis</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Missing Tooth
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="yes"
                      checked={form.missingTooth === 'yes'}
                      onChange={(e) => setForm({ ...form, missingTooth: e.target.value })}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="no"
                      checked={form.missingTooth === 'no'}
                      onChange={(e) => setForm({ ...form, missingTooth: e.target.value })}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                <TeethSelector condition="missing" />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Root Treated
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="yes"
                      checked={form.rootTreated === 'yes'}
                      onChange={(e) => setForm({ ...form, rootTreated: e.target.value })}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="no"
                      checked={form.rootTreated === 'no'}
                      onChange={(e) => setForm({ ...form, rootTreated: e.target.value })}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                <TeethSelector condition="treated" />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Existing Implant
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="yes"
                      checked={form.existingImplant === 'yes'}
                      onChange={(e) => setForm({ ...form, existingImplant: e.target.value })}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="no"
                      checked={form.existingImplant === 'no'}
                      onChange={(e) => setForm({ ...form, existingImplant: e.target.value })}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                <TeethSelector condition="existingImplant" />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Has Cavity
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="yes"
                      checked={form.hasCavity === 'yes'}
                      onChange={(e) => setForm({ ...form, hasCavity: e.target.value })}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="no"
                      checked={form.hasCavity === 'no'}
                      onChange={(e) => setForm({ ...form, hasCavity: e.target.value })}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                <TeethSelector condition="cavity" />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Has Amalgam (Filled)
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="yes"
                      checked={form.hasAmalgam === 'yes'}
                      onChange={(e) => setForm({ ...form, hasAmalgam: e.target.value })}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="no"
                      checked={form.hasAmalgam === 'no'}
                      onChange={(e) => setForm({ ...form, hasAmalgam: e.target.value })}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                <TeethSelector condition="amalgam" />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Has Broken Teeth
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="yes"
                      checked={form.hasBrokenTeeth === 'yes'}
                      onChange={(e) => setForm({ ...form, hasBrokenTeeth: e.target.value })}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="no"
                      checked={form.hasBrokenTeeth === 'no'}
                      onChange={(e) => setForm({ ...form, hasBrokenTeeth: e.target.value })}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                <TeethSelector condition="broken" />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Has Crown
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="yes"
                      checked={form.hasCrown === 'yes'}
                      onChange={(e) => setForm({ ...form, hasCrown: e.target.value })}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="no"
                      checked={form.hasCrown === 'no'}
                      onChange={(e) => setForm({ ...form, hasCrown: e.target.value })}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                <TeethSelector condition="crown" />
              </div>
            </div>
          </div>

          {/* Treatment Section */}
          <div className="space-y-6 mt-8">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Treatment</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Needs Root Canal
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="yes"
                      checked={form.needsRootCanal === 'yes'}
                      onChange={(e) => setForm({ ...form, needsRootCanal: e.target.value })}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="no"
                      checked={form.needsRootCanal === 'no'}
                      onChange={(e) => setForm({ ...form, needsRootCanal: e.target.value })}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                <TeethSelector condition="rootCanal" />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Needs Implant
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="yes"
                      checked={form.needsImplant === 'yes'}
                      onChange={(e) => setForm({ ...form, needsImplant: e.target.value })}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="no"
                      checked={form.needsImplant === 'no'}
                      onChange={(e) => setForm({ ...form, needsImplant: e.target.value })}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                <TeethSelector condition="implant" />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Needs Extraction
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="yes"
                      checked={form.needsExtraction === 'yes'}
                      onChange={(e) => setForm({ ...form, needsExtraction: e.target.value })}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      required
                      value="no"
                      checked={form.needsExtraction === 'no'}
                      onChange={(e) => setForm({ ...form, needsExtraction: e.target.value })}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                <TeethSelector condition="extraction" />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}