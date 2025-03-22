import React from 'react';

interface ToothShapeProps {
  number: number;
  selected: boolean;
  onClick: () => void;
  condition: string;
  isUpper: boolean;
  isMissing: boolean;
}

export const ToothShape: React.FC<ToothShapeProps> = ({ 
  number, 
  selected, 
  onClick, 
  condition,
  isUpper,
  isMissing
}) => {
  const getConditionStyles = () => {
    if (!selected) return 'fill-white';
    
    switch (condition) {
      case 'cavity': return 'fill-red-500';
      case 'rootCanal': return 'fill-blue-500';
      case 'implant': return 'fill-purple-500';
      case 'extraction': return 'fill-orange-500';
      case 'missing': return 'fill-gray-300';
      case 'treated': return 'fill-green-500';
      case 'existingImplant': return 'fill-yellow-500';
      case 'amalgam': return 'fill-indigo-500';
      case 'broken': return 'fill-pink-500';
      case 'crown': return 'fill-teal-500';
      default: return 'fill-white';
    }
  };

  const getRingColor = () => {
    if (!selected) return 'hover:ring-gray-300';
    
    switch (condition) {
      case 'cavity': return 'ring-red-500';
      case 'rootCanal': return 'ring-blue-500';
      case 'implant': return 'ring-purple-500';
      case 'extraction': return 'ring-orange-500';
      case 'missing': return 'ring-gray-500';
      case 'treated': return 'ring-green-500';
      case 'existingImplant': return 'ring-yellow-500';
      case 'amalgam': return 'ring-indigo-500';
      case 'broken': return 'ring-pink-500';
      case 'crown': return 'ring-teal-500';
      default: return 'ring-indigo-600';
    }
  };

  // Check if this is one of the special teeth that uses the molar PNG image
  const isMolarTooth = [18, 16, 48, 46, 28, 26, 38, 36].includes(number);
  
  // Check if this is one of the teeth that uses the premolar PNG image
  const isPremolarTooth = [14, 24, 34, 44].includes(number);
  
  // Check if this is one of the teeth that uses the first premolar PNG image
  const isFirstPremolarTooth = [27, 37, 47, 17].includes(number);
  
  // Check if this is one of the teeth that uses the second premolar PNG image
  const isSecondPremolarTooth = [15, 25, 35, 45].includes(number);

  // Check if this is one of the canine teeth that uses the canine PNG image
  const isCanineTooth = [13, 23, 33, 43].includes(number);

  // Check if this is one of the incisor teeth that uses the new PNG image
  const isIncisorTooth = [12, 11, 21, 22, 42, 41, 31, 32].includes(number);

  // Determine rotation based on tooth number
  const getRotationClass = () => {
    // Teeth that need 180-degree rotation
    if ([15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45, 47, 37, 17, 27].includes(number)) {
      return isUpper ? 'rotate-180' : '';
    }
    // Lower teeth default rotation
    return isUpper ? '' : 'rotate-180';
  };

  // Determine if the tooth should be disabled
  const isDiagnosisSection = ['cavity', 'amalgam', 'broken', 'crown', 'existingImplant'].includes(condition);
  const isDisabled = isMissing && isDiagnosisSection;

  // If the tooth is missing and we're not in the missing section or treatment section, disable it
  const shouldDisable = isMissing && condition !== 'missing' && !['rootCanal', 'implant', 'extraction'].includes(condition);

  return (
    <button
      onClick={onClick}
      disabled={shouldDisable}
      className={`w-12 h-16 relative group ${
        shouldDisable ? 'opacity-50 cursor-not-allowed' : 'transition-transform hover:scale-110'
      } ${
        selected ? `ring-2 ${getRingColor()} rounded-lg` : 'hover:ring-2 hover:ring-gray-300 rounded-lg'
      }`}
    >
      {isMolarTooth ? (
        <div className={`w-full h-full ${getRotationClass()}`}>
          <img 
            src="https://i.imgur.com/VHcT1Ac.png"
            alt={`Tooth ${number}`}
            className={`w-full h-full object-contain ${selected ? 'opacity-75' : ''} ${getConditionStyles()}`}
          />
        </div>
      ) : isPremolarTooth ? (
        <div className={`w-full h-full ${getRotationClass()}`}>
          <img 
            src="https://i.imgur.com/67sP1Ws.png"
            alt={`Tooth ${number}`}
            className={`w-full h-full object-contain ${selected ? 'opacity-75' : ''} ${getConditionStyles()}`}
          />
        </div>
      ) : isFirstPremolarTooth ? (
        <div className={`w-full h-full ${getRotationClass()}`}>
          <img 
            src="https://i.imgur.com/neFsMtv.png"
            alt={`Tooth ${number}`}
            className={`w-full h-full object-contain ${selected ? 'opacity-75' : ''} ${getConditionStyles()}`}
          />
        </div>
      ) : isSecondPremolarTooth ? (
        <div className={`w-full h-full ${getRotationClass()}`}>
          <img 
            src="https://i.imgur.com/db6cUGn.png"
            alt={`Tooth ${number}`}
            className={`w-full h-full object-contain ${selected ? 'opacity-75' : ''} ${getConditionStyles()}`}
          />
        </div>
      ) : isCanineTooth ? (
        <div className={`w-full h-full ${getRotationClass()}`}>
          <img 
            src="https://i.imgur.com/UL2pHlK.png"
            alt={`Tooth ${number}`}
            className={`w-full h-full object-contain ${selected ? 'opacity-75' : ''} ${getConditionStyles()}`}
          />
        </div>
      ) : isIncisorTooth ? (
        <div className={`w-full h-full ${getRotationClass()}`}>
          <img 
            src="https://i.imgur.com/FFu224p.png"
            alt={`Tooth ${number}`}
            className={`w-full h-full object-contain ${selected ? 'opacity-75' : ''} ${getConditionStyles()}`}
          />
        </div>
      ) : (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
        >
          <path
            d="M50,10 C70,10 80,20 80,40 L80,70 C80,90 70,95 50,95 C30,95 20,90 20,70 L20,40 C20,20 30,10 50,10 Z"
            className={`${getConditionStyles()} stroke-gray-400`}
            strokeWidth="2"
          />
        </svg>
      )}
      <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium">
        {number}
      </span>
    </button>
  );
};