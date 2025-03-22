import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, MoveHorizontal, RotateCcw } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelect(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-8 h-8 mb-4 text-gray-500"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 16"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
              />
            </svg>
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX. 800x400px)</p>
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {previewUrl && (
        <div className="relative border rounded-lg overflow-hidden bg-gray-100">
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            centerOnInit={true}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <button
                    onClick={(e) => handleButtonClick(e, zoomIn)}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                    title="Zoom In"
                    type="button"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleButtonClick(e, zoomOut)}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                    title="Zoom Out"
                    type="button"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleButtonClick(e, resetTransform)}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                    title="Reset"
                    type="button"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-4 right-4 z-10">
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-full shadow-md">
                    <MoveHorizontal className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Pan to move</span>
                  </div>
                </div>
                <TransformComponent>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full h-auto"
                    style={{ maxHeight: '400px' }}
                  />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
      )}
    </div>
  );
};