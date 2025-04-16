import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { ArrowLeftIcon, CheckCircleIcon, ExclamationCircleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import GooglePlacesAutocomplete, { geocodeByAddress } from 'react-google-places-autocomplete';

// Updated interface
interface OrganizationAddress {
    street?: string;
    city?: string;
    state?: string; // State/Province/Region
    postalCode?: string;
    country?: string;
}

interface UserProfileData {
    email: string;
    displayName: string;
    userPhoneNumber?: string;
    organizationName?: string;
    organizationRole?: string;
    organizationTaxId?: string;
    organizationAddress?: OrganizationAddress; // Use the nested type
    organizationPhoneNumber?: string;
}

// Type for form data, making address fields potentially undefined during editing
interface UserProfileFormData extends Omit<Partial<UserProfileData>, 'organizationAddress'> {
    organizationAddress?: Partial<OrganizationAddress>;
}

const UserProfile = () => {
    const [profileData, setProfileData] = useState<UserProfileData | null>(null);
    // Use the new FormData type
    const [formData, setFormData] = useState<UserProfileFormData>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const navigate = useNavigate();
    // State to hold the string representation for the autocomplete input
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedPlaceValue, setSelectedPlaceValue] = useState<any | null>(null);
    // State to track if essential fields are missing for the warning
    const [profileIsIncomplete, setProfileIsIncomplete] = useState<boolean>(false);

    // Helper function to format address object into a string
    const formatAddressToString = (address: Partial<OrganizationAddress> | undefined): string => {
        if (!address) return '';
        // Simple concatenation, can be improved
        return [
            address.street,
            address.city,
            address.state,
            address.postalCode,
            address.country
        ].filter(Boolean).join(', ');
    };

    const fetchUserProfile = useCallback(async () => {
        setLoading(true);
        setError('');
        const user = auth.currentUser;
        if (!user) {
            setError('User not logged in.');
            setLoading(false);
            navigate('/login');
            return;
        }

        try {
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as UserProfileData;
                // Ensure organizationAddress is at least an empty object if it doesn't exist
                const initialAddress = data.organizationAddress || {};
                setProfileData({ ...data, organizationAddress: initialAddress });
                setFormData({
                    displayName: data.displayName || '',
                    organizationName: data.organizationName || '',
                    organizationRole: data.organizationRole || '',
                    userPhoneNumber: data.userPhoneNumber || '',
                    organizationTaxId: data.organizationTaxId || '',
                    // Set initial address state from fetched data
                    organizationAddress: initialAddress,
                    organizationPhoneNumber: data.organizationPhoneNumber || '',
                    email: data.email
                });
                // Set initial autocomplete value based on formatted string
                const initialLabel = formatAddressToString(initialAddress);
                if (initialLabel) {
                    // Create a value object for the component if address exists
                    setSelectedPlaceValue({ label: initialLabel, value: { /* value part often doesn't need pre-fill */ } });
                } else {
                    setSelectedPlaceValue(null);
                }
            } else {
                setError('User profile not found in database.');
                setFormData({
                    displayName: user.displayName || '',
                    email: user.email || '',
                    organizationAddress: {} // Initialize address object
                });
                setSelectedPlaceValue(null);
            }
        } catch (err) {
            console.error("Error fetching user profile:", err);
            setError("Failed to load profile data. Please try again later.");
            setSelectedPlaceValue(null);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    // New useEffect to check profile completeness on load/update
    useEffect(() => {
        if (profileData) {
            const addressComplete = !!(profileData.organizationAddress?.street?.trim() &&
                profileData.organizationAddress?.city?.trim() &&
                profileData.organizationAddress?.postalCode?.trim() &&
                profileData.organizationAddress?.country?.trim());
            const orgDetailsComplete = !!(profileData.organizationName?.trim() &&
                profileData.organizationTaxId?.trim() &&
                profileData.organizationPhoneNumber?.trim());
            setProfileIsIncomplete(!(addressComplete && orgDetailsComplete));
        }
    }, [profileData]);

    useEffect(() => {
        if (!loading) {
            gsap.fromTo('.profile-form-section',
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
            );
        }
    }, [loading]);

    // Remove the old generic handleInputChange or modify it if still needed for other fields
    const handleNonAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- Updated Handler for Google Places Autocomplete ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlePlaceSelect = async (place: any | null) => {
        setSelectedPlaceValue(place);

        if (!place || !place.value) {
            setFormData(prev => ({ ...prev, organizationAddress: {} }));
            return;
        }

        try {
            const results = await geocodeByAddress(place.label);
            if (results && results.length > 0) {
                const addressComponents = results[0].address_components;

                const getAddressComponent = (type: string): string | undefined => {
                    return addressComponents.find(comp => comp.types.includes(type))?.long_name;
                };

                const streetNumber = getAddressComponent('street_number');
                const route = getAddressComponent('route');

                const newAddress: OrganizationAddress = {
                    street: streetNumber ? `${streetNumber} ${route}` : route,
                    // Add administrative_area_level_2 as a fallback for city
                    city: getAddressComponent('locality') || getAddressComponent('postal_town') || getAddressComponent('administrative_area_level_2'),
                    state: getAddressComponent('administrative_area_level_1'),
                    postalCode: getAddressComponent('postal_code'),
                    country: getAddressComponent('country'),
                };

                setFormData(prev => ({ ...prev, organizationAddress: newAddress }));
                setError(''); // Clear validation error if selection is made
            } else {
                // Keep input value but clear structured address? Or show error?
                setFormData(prev => ({ ...prev, organizationAddress: {} }));
            }
        } catch (_error) { // Mark error as unused

            // Keep input value but clear structured address? Or show error?
            setFormData(prev => ({ ...prev, organizationAddress: {} }));
        }
    };

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // --- Re-validate based on formData.organizationAddress components --- 
        const orgName = formData.organizationName?.trim();
        const orgTaxId = formData.organizationTaxId?.trim();
        const orgPhone = formData.organizationPhoneNumber?.trim();
        const orgStreet = formData.organizationAddress?.street?.trim();
        const orgCity = formData.organizationAddress?.city?.trim();
        const orgPostalCode = formData.organizationAddress?.postalCode?.trim();
        const orgCountry = formData.organizationAddress?.country?.trim();

        const missingFields: string[] = [];
        if (!orgName) missingFields.push('Name');
        if (!orgStreet) missingFields.push('Address (Street from selection)');
        if (!orgCity) missingFields.push('Address (City from selection)');
        if (!orgPostalCode) missingFields.push('Address (Postal Code from selection)');
        if (!orgCountry) missingFields.push('Address (Country from selection)');
        if (!orgTaxId) missingFields.push('Tax ID');
        if (!orgPhone) missingFields.push('Phone Number');

        if (missingFields.length > 0) {
            setError(`Please select a valid address using the search and fill other mandatory fields: ${missingFields.join(', ')}.`);
            return;
        }
        // --- End Validation ---

        setSaving(true);
        const user = auth.currentUser;
        if (!user) {
            setError('Authentication error. Please log in again.');
            setSaving(false);
            return;
        }

        try {
            const userDocRef = doc(db, 'users', user.uid);
            const updateData: Partial<UserProfileData> = {};

            // Compare and add fields
            if (formData.displayName !== profileData?.displayName) updateData.displayName = formData.displayName;
            if (formData.organizationName !== profileData?.organizationName) updateData.organizationName = formData.organizationName;
            if (formData.organizationRole !== profileData?.organizationRole) updateData.organizationRole = formData.organizationRole;
            if (formData.userPhoneNumber !== profileData?.userPhoneNumber) updateData.userPhoneNumber = formData.userPhoneNumber;
            if (formData.organizationTaxId !== profileData?.organizationTaxId) updateData.organizationTaxId = formData.organizationTaxId;
            if (formData.organizationPhoneNumber !== profileData?.organizationPhoneNumber) updateData.organizationPhoneNumber = formData.organizationPhoneNumber;

            // Ensure the address object is properly structured before comparing/saving
            const currentAddress = profileData?.organizationAddress || {};
            const newAddress = formData.organizationAddress || {};
            const cleanNewAddress = {
                street: newAddress.street || undefined,
                city: newAddress.city || undefined,
                state: newAddress.state || undefined,
                postalCode: newAddress.postalCode || undefined,
                country: newAddress.country || undefined,
            };

            // Only update address if it has actually changed
            if (JSON.stringify(cleanNewAddress) !== JSON.stringify(currentAddress)) {
                updateData.organizationAddress = cleanNewAddress;
            }

            if (Object.keys(updateData).length > 0) {
                await updateDoc(userDocRef, updateData);
                // Update local profile data state, ensuring address is updated
                setProfileData(prev => ({
                    ...prev!,
                    ...updateData,
                    organizationAddress: updateData.organizationAddress ? { ...updateData.organizationAddress } : { ...currentAddress }
                }));
            }

            if (formData.displayName && formData.displayName !== user.displayName) {
                await updateProfile(user, { displayName: formData.displayName });
            }

            setSuccess('Profile updated successfully!');
            setTimeout(() => setSuccess(''), 3000);

        } catch (err) {
            console.error("Error updating profile:", err);
            setError("Failed to save profile changes. Please try again.");
            setTimeout(() => setError(''), 5000);
        } finally {
            setSaving(false);
        }
    };

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        console.error("ERROR: Google Maps API Key (VITE_GOOGLE_MAPS_API_KEY) is not configured in .env file.");
        // Optionally render an error message to the user
        return <div className="p-8 text-red-600">Google Maps API Key is missing. Please configure VITE_GOOGLE_MAPS_API_KEY in your .env file.</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)} // Go back to previous page
                    className="mb-6 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150 ease-in-out group"
                >
                    <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5 text-indigo-500 group-hover:text-indigo-600" />
                    Back
                </button>

                <div className="bg-white shadow-xl rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 sm:p-8">
                        {/* Add Logo Here */}
                        <div className="flex justify-center mb-4">
                            <img
                                src="/images/logos/logo.png"
                                alt="Dentawista Logo"
                                className="h-20 w-auto" // Increased size from h-16 to h-20
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "/images/logos/logo.png"; // Fallback path just in case
                                }}
                            />
                        </div>
                        <div className="flex items-center">
                            <UserCircleIcon className="h-16 w-16 text-white opacity-90" />
                            <div className="ml-4">
                                <h1 className="text-2xl font-bold text-white">My Profile</h1>
                                <p className="text-sm text-indigo-100">Update your personal and organizational details.</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSaveChanges} className="p-6 sm:p-8 space-y-6">
                        {loading ? (
                            <div className="flex justify-center items-center py-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : (
                            <>
                                {/* Profile Incomplete Warning */}
                                {profileIsIncomplete && (
                                    <div className="profile-form-section rounded-md bg-yellow-50 p-4 border border-yellow-200 mb-6">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-yellow-800">Complete Your Profile</h3>
                                                <p className="mt-1 text-sm text-yellow-700">Please fill in all organization details (Name, Address, Phone, Tax ID) to enable all features, including patient form submission.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Error Message */}
                                {error && (
                                    <div className="profile-form-section rounded-md bg-red-50 p-4 border border-red-200">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-red-800">Error updating profile</h3>
                                                <p className="mt-1 text-sm text-red-700">{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Success Message */}
                                {success && (
                                    <div className="profile-form-section rounded-md bg-green-50 p-4 border border-green-200">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-green-800">{success}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Personal Information Section */}
                                <div className="profile-form-section space-y-4 border-b border-gray-200 pb-6">
                                    <h2 className="text-lg font-semibold text-gray-800">Personal Information</h2>
                                    <div>
                                        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            name="displayName"
                                            id="displayName"
                                            value={formData.displayName || ''}
                                            onChange={handleNonAddressInputChange}
                                            required
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            id="email"
                                            value={formData.email || ''}
                                            readOnly // Email is typically not editable here
                                            disabled
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-100 cursor-not-allowed"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Email cannot be changed from the profile.</p>
                                    </div>
                                    <div>
                                        <label htmlFor="userPhoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                                            Contact Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            name="userPhoneNumber"
                                            id="userPhoneNumber"
                                            value={formData.userPhoneNumber || ''}
                                            onChange={handleNonAddressInputChange}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Organization Information Section - Updated with Autocomplete */}
                                <div className="profile-form-section space-y-4">
                                    <h2 className="text-lg font-semibold text-gray-800">Organization Information</h2>
                                    <div>
                                        <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1">
                                            Organization Name
                                        </label>
                                        <input
                                            type="text"
                                            name="organizationName"
                                            id="organizationName"
                                            value={formData.organizationName || ''}
                                            onChange={handleNonAddressInputChange}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>

                                    {/* --- Google Places Autocomplete --- */}
                                    <div>
                                        <label htmlFor="organizationAddress" className="block text-sm font-medium text-gray-700 mb-1">
                                            Organization Address
                                        </label>
                                        <GooglePlacesAutocomplete
                                            apiKey={apiKey}
                                            selectProps={{
                                                value: selectedPlaceValue,
                                                onChange: handlePlaceSelect,
                                                placeholder: 'Search for address...',
                                                styles: {
                                                    input: (provided) => ({
                                                        ...provided,
                                                        padding: '0.5rem 0.75rem',
                                                        borderWidth: '1px',
                                                        borderColor: '#D1D5DB',
                                                        borderRadius: '0.375rem',
                                                        boxShadow: 'sm',
                                                        '&:focus': {
                                                            borderColor: '#6366F1',
                                                            boxShadow: '0 0 0 1px #6366F1',
                                                            outline: 'none',
                                                        },
                                                    }),
                                                },
                                                classNames: {
                                                    control: () => "border border-gray-300 rounded-md shadow-sm",
                                                    input: () => "sm:text-sm",
                                                },
                                            }}
                                            autocompletionRequest={{
                                            }}
                                        />
                                        {/* Optionally display parsed components for confirmation - read only */}
                                        {formData.organizationAddress && Object.keys(formData.organizationAddress).length > 0 && (
                                            <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200 space-y-1">
                                                <p><strong>Street:</strong> {formData.organizationAddress.street || '-'}</p>
                                                <p><strong>City:</strong> {formData.organizationAddress.city || '-'}</p>
                                                <p><strong>State:</strong> {formData.organizationAddress.state || '-'}</p>
                                                <p><strong>Postal Code:</strong> {formData.organizationAddress.postalCode || '-'}</p>
                                                <p><strong>Country:</strong> {formData.organizationAddress.country || '-'}</p>
                                            </div>
                                        )}
                                    </div>
                                    {/* --- End Google Places Autocomplete --- */}

                                    <div>
                                        <label htmlFor="organizationPhoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                                            Organization Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            name="organizationPhoneNumber"
                                            id="organizationPhoneNumber"
                                            value={formData.organizationPhoneNumber || ''}
                                            onChange={handleNonAddressInputChange}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="organizationRole" className="block text-sm font-medium text-gray-700 mb-1">
                                            Your Role
                                        </label>
                                        <input
                                            type="text"
                                            name="organizationRole"
                                            id="organizationRole"
                                            value={formData.organizationRole || ''}
                                            onChange={handleNonAddressInputChange}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="organizationTaxId" className="block text-sm font-medium text-gray-700 mb-1">
                                            Organization Tax ID / VAT Number
                                        </label>
                                        <input
                                            type="text"
                                            name="organizationTaxId"
                                            id="organizationTaxId"
                                            value={formData.organizationTaxId || ''}
                                            onChange={handleNonAddressInputChange}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Used for generating invoices.</p>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="pt-5">
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={loading || saving}
                                            className="w-full sm:w-auto inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out"
                                        >
                                            {saving ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Saving...
                                                </>
                                            ) : (
                                                'Save Changes'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UserProfile; 