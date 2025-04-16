import React from "react";
import { ToothShape } from "./ToothShape";

interface TeethDiagramProps {
  selectedTeeth: number[];
  onToothClick: (tooth: number, e: React.MouseEvent) => void;
  upperTeeth: number[];
  lowerTeeth: number[];
  condition: string;
  missingTeeth: number[];
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
  showLabels?: boolean;
}

export const TeethDiagram: React.FC<TeethDiagramProps> = ({
  selectedTeeth,
  onToothClick,
  upperTeeth,
  lowerTeeth,
  condition,
  missingTeeth,
  allSelectedTeeth,
  shouldDisableTooth,
  showLabels = true,
}) => {
  return (
    <div className="mt-4 p-6 bg-gray-50 rounded-lg">
      <div className="flex flex-col gap-12">
        {/* Upper teeth row */}
        <div className="flex justify-center gap-1">
          {upperTeeth.map((tooth) => (
            <ToothShape
              key={tooth}
              number={tooth}
              selected={selectedTeeth.includes(tooth)}
              onClick={(e) => onToothClick(tooth, e)}
              condition={condition}
              isUpper={true}
              isMissing={missingTeeth.includes(tooth)}
              allSelectedTeeth={allSelectedTeeth}
              shouldDisableTooth={shouldDisableTooth}
            />
          ))}
        </div>

        {/* Lower teeth row */}
        <div className="flex justify-center gap-1">
          {lowerTeeth.map((tooth) => (
            <ToothShape
              key={tooth}
              number={tooth}
              selected={selectedTeeth.includes(tooth)}
              onClick={(e) => onToothClick(tooth, e)}
              condition={condition}
              isUpper={false}
              isMissing={missingTeeth.includes(tooth)}
              allSelectedTeeth={allSelectedTeeth}
              shouldDisableTooth={shouldDisableTooth}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      {showLabels && (
        <div className="mt-8 grid grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Cavity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Root Canal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span>Implant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Extraction</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <span>Missing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Treated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Existing Implant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-indigo-500 rounded"></div>
            <span>Amalgam</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-pink-500 rounded"></div>
            <span>Broken</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-teal-500 rounded"></div>
            <span>Crown</span>
          </div>
        </div>
      )}
    </div>
  );
};
