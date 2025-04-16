import React, { useState, useRef, useEffect, useCallback } from 'react';

// Simple SVG icons needed for controls
const ZoomInIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
  </svg>
);

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
}

export default function ImageUploader({ onImageSelect }: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for zoom and pan
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewImageRef = useRef<HTMLImageElement>(null);

  // Block event helper
  const blockEvent = (e: Event | React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // Update scale and position logic - NOW ACCEPTS CURSOR POSITION
  const updateScaleAndPosition = useCallback((newScale: number, cursorX?: number, cursorY?: number) => {
    if (!previewImageRef.current || !previewContainerRef.current) return;

    const img = previewImageRef.current;
    const container = previewContainerRef.current;
    const rect = container.getBoundingClientRect();

    // Calculate image natural dimensions scaled
    // We need naturalWidth/Height to calculate boundaries correctly if using object-contain
    // Let's assume the image element's clientWidth/Height are what we see initially
    const currentImageWidth = img.clientWidth * scale;
    const currentImageHeight = img.clientHeight * scale;
    const nextImageWidth = img.clientWidth * newScale;
    const nextImageHeight = img.clientHeight * newScale;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    let targetX = 0;
    let targetY = 0;

    // If cursor position is provided (wheel zoom), zoom towards cursor
    if (cursorX !== undefined && cursorY !== undefined) {
      // Position of cursor relative to the container
      const cursorRelX = cursorX - rect.left;
      const cursorRelY = cursorY - rect.top;

      // Position of cursor relative to the *image* (top-left corner)
      // Accounts for current scale and translation
      const imgOriginX = (containerWidth - currentImageWidth) / 2 + position.x;
      const imgOriginY = (containerHeight - currentImageHeight) / 2 + position.y;
      const cursorOnImageX = (cursorRelX - imgOriginX) / scale;
      const cursorOnImageY = (cursorRelY - imgOriginY) / scale;

      // Calculate the new origin needed to keep the cursor point stationary
      targetX = cursorRelX - cursorOnImageX * newScale;
      targetY = cursorRelY - cursorOnImageY * newScale;

      // Translate back to center-based positioning
      targetX -= (containerWidth - nextImageWidth) / 2;
      targetY -= (containerHeight - nextImageHeight) / 2;

    } else {
      // Button zoom - zoom towards center. Calculate offset needed due to scale change.
      const scaleRatio = newScale / scale;
      targetX = position.x * scaleRatio;
      targetY = position.y * scaleRatio;
    }

    // Calculate boundaries
    const maxX = Math.max(0, (nextImageWidth - containerWidth) / 2);
    const maxY = Math.max(0, (nextImageHeight - containerHeight) / 2);

    // Apply boundaries
    const boundedX = Math.min(Math.max(-maxX, targetX), maxX);
    const boundedY = Math.min(Math.max(-maxY, targetY), maxY);

    setPosition({ x: boundedX, y: boundedY });
    setScale(newScale);

  }, [scale, position.x, position.y]); // Dependencies for useCallback

  // Zoom handlers (call updateScaleAndPosition without cursor coords)
  const handleZoomIn = (e: React.MouseEvent) => {
    blockEvent(e);
    const newScale = Math.min(scale + 0.2, 3);
    updateScaleAndPosition(newScale);
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    blockEvent(e);
    const newScale = Math.max(scale - 0.2, 0.5);
    updateScaleAndPosition(newScale);
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    blockEvent(e);
    setIsDragging(true);
    setStartPos({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    blockEvent(e);
    const targetX = e.clientX - startPos.x;
    const targetY = e.clientY - startPos.y;

    // Apply boundaries during pan as well
    if (previewImageRef.current && previewContainerRef.current) {
      const img = previewImageRef.current;
      const container = previewContainerRef.current;
      const nextImageWidth = img.clientWidth * scale;
      const nextImageHeight = img.clientHeight * scale;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const maxX = Math.max(0, (nextImageWidth - containerWidth) / 2);
      const maxY = Math.max(0, (nextImageHeight - containerHeight) / 2);

      setPosition({
        x: Math.min(Math.max(-maxX, targetX), maxX),
        y: Math.min(Math.max(-maxY, targetY), maxY),
      });
    } else {
      setPosition({ x: targetX, y: targetY }); // Fallback if refs not ready
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    blockEvent(e);
    setIsDragging(false);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMouseUp(e); // Stop dragging if mouse leaves container
    }
  };


  // Wheel handler - NOW PASSES CURSOR COORDS
  const handleWheel = useCallback((e: WheelEvent) => {
    blockEvent(e);
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(3, scale + delta));
    // Pass cursor coordinates relative to the viewport
    updateScaleAndPosition(newScale, e.clientX, e.clientY);
  }, [scale, updateScaleAndPosition]); // updateScaleAndPosition is now a dependency

  // Reset zoom/pan when a new image is selected
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      onImageSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      onImageSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary for drop to work
  };

  // Effect to attach non-passive wheel listener - UPDATE DEPENDENCIES
  useEffect(() => {
    const container = previewContainerRef.current;

    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
    // Add handleWheel to dependencies. Since handleWheel uses useCallback
    // and depends on scale & updateScaleAndPosition (which depends on scale & position),
    // this ensures the listener is correctly updated when needed.
  }, [handleWheel]);

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed border-gray-300 rounded-lg text-center transition-colors ${!previewUrl ? 'p-6 cursor-pointer hover:border-blue-500' : 'p-0'}`}
        onClick={() => !previewUrl && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
        {previewUrl ? (
          <div className="relative group">
            <div
              ref={previewContainerRef}
              className="relative w-full h-64 bg-gray-100 overflow-hidden rounded-t-lg"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <img
                ref={previewImageRef}
                src={previewUrl}
                alt="Preview"
                // Ensure object-contain is used if image aspect ratio might not match container
                className="absolute top-0 left-0 w-full h-full object-contain"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  transition: isDragging ? 'none' : 'transform 0.1s ease',
                  // transformOrigin: 'center center', // Optional: Explicitly set origin if needed, though translate handles it
                  // Setting width/height explicitly might be needed if object-contain causes issues with boundaries
                  // width: '100%', 
                  // height: '100%',
                }}
                draggable={false}
                onDragStart={blockEvent}
              />
            </div>
            {/* Controls Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 flex justify-center items-center gap-3 transition-opacity opacity-0 group-hover:opacity-100 rounded-b-lg">
              <button
                onClick={handleZoomOut}
                className="p-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                title="Zoom Out"
              >
                <ZoomOutIcon />
              </button>
              <span className="text-white text-xs font-semibold w-10 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                title="Zoom In"
              >
                <ZoomInIcon />
              </button>
            </div>
            {/* Button to change image */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1.5 rounded-full hover:bg-opacity-75 transition-opacity opacity-0 group-hover:opacity-100"
              title="Change Image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0015.357 2m0 0H15" />
              </svg>
            </button>
          </div>
        ) : (
          // Upload prompt
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-gray-600">
              Drag and drop X-ray image here, or click to select
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}