import React from "react";

interface ToothShapeProps {
  number: number;
  selected: boolean;
  onClick: () => void;
  condition: string;
  isUpper: boolean;
  isMissing: boolean;
  allSelectedTeeth: {
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
  shouldDisableTooth: (toothNumber: number) => boolean;
}

export const ToothShape: React.FC<ToothShapeProps> = ({
  number,
  selected,
  onClick,
  condition,
  isUpper,
  isMissing,
  allSelectedTeeth,
  shouldDisableTooth,
}) => {
  const getConditionColor = (conditionType: string) => {
    switch (conditionType) {
      case "cavity":
        return "ring-red-500";
      case "rootCanal":
        return "ring-blue-500";
      case "implant":
        return "ring-purple-500";
      case "extraction":
        return "ring-orange-500";
      case "missing":
        return "ring-gray-500";
      case "treated":
        return "ring-green-500";
      case "existingImplant":
        return "ring-yellow-500";
      case "amalgam":
        return "ring-indigo-500";
      case "broken":
        return "ring-pink-500";
      case "crown":
        return "ring-teal-500";
      default:
        return "";
    }
  };

  const getToothHighlight = () => {
    if (selected) {
      return `ring-4 ring-offset-2 ${getConditionColor(condition)}`;
    }
    if (allSelectedTeeth.cavity.includes(number))
      return `ring-2 ${getConditionColor("cavity")}`;
    if (allSelectedTeeth.rootCanal.includes(number))
      return `ring-2 ${getConditionColor("rootCanal")}`;
    if (allSelectedTeeth.implant.includes(number))
      return `ring-2 ${getConditionColor("implant")}`;
    if (allSelectedTeeth.extraction.includes(number))
      return `ring-2 ${getConditionColor("extraction")}`;
    if (allSelectedTeeth.missing.includes(number))
      return `ring-2 ${getConditionColor("missing")}`;
    if (allSelectedTeeth.treated.includes(number))
      return `ring-2 ${getConditionColor("treated")}`;
    if (allSelectedTeeth.existingImplant.includes(number))
      return `ring-2 ${getConditionColor("existingImplant")}`;
    if (allSelectedTeeth.amalgam.includes(number))
      return `ring-2 ${getConditionColor("amalgam")}`;
    if (allSelectedTeeth.broken.includes(number))
      return `ring-2 ${getConditionColor("broken")}`;
    if (allSelectedTeeth.crown.includes(number))
      return `ring-2 ${getConditionColor("crown")}`;
    return "";
  };

  // Check tooth types
  const isMolarTooth = [18, 16, 48, 46, 28, 26, 38, 36].includes(number);
  const isPremolarTooth = [14, 24, 34, 44].includes(number);
  const isFirstPremolarTooth = [27, 37, 47, 17].includes(number);
  const isSecondPremolarTooth = [15, 25, 35, 45].includes(number);
  const isCanineTooth = [13, 23, 33, 43].includes(number);
  const isIncisorTooth = [12, 11, 21, 22, 42, 41, 31, 32].includes(number);

  // Determine rotation based on tooth number
  const getRotationClass = () => {
    if (
      [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45, 47, 37, 17, 27].includes(
        number
      )
    ) {
      return isUpper ? "rotate-180" : "";
    }
    return isUpper ? "" : "rotate-180";
  };

  const isDisabled = shouldDisableTooth(number);

  const getToothImage = () => {
    if (isMolarTooth) return "https://i.imgur.com/VHcT1Ac.png";
    if (isPremolarTooth) return "https://i.imgur.com/67sP1Ws.png";
    if (isFirstPremolarTooth) return "https://i.imgur.com/neFsMtv.png";
    if (isSecondPremolarTooth) return "https://i.imgur.com/db6cUGn.png";
    if (isCanineTooth) return "https://i.imgur.com/UL2pHlK.png";
    if (isIncisorTooth) return "https://i.imgur.com/FFu224p.png";
    return "";
  };

  return (
    <div className="relative w-10 h-14">
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`
          absolute inset-0 z-10
          ${
            selected
              ? `ring-4 ring-offset-2 ${getConditionColor(condition)}`
              : ""
          }
          ${getToothHighlight()}
          ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          rounded-lg transition-all duration-200
        `}
      >
        <div className={`relative w-full h-full ${getRotationClass()}`}>
          <img
            src={getToothImage()}
            alt={`Tooth ${number}`}
            className="w-full h-full object-contain"
          />
        </div>
      </button>
    </div>
  );
};
