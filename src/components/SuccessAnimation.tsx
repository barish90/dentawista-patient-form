import React, { useEffect } from "react";
import { Check } from "lucide-react";

interface SuccessAnimationProps {
  onComplete: () => void;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  onComplete,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center animate-scaleIn">
        <div className="relative mb-4">
          <div className="animate-circle">
            <Check className="w-16 h-16 text-green-500 animate-check" />
          </div>
        </div>
        <p className="text-xl font-semibold text-gray-800 animate-fadeIn">
          Başarıyla Kaydedildi!
        </p>
      </div>
    </div>
  );
};
