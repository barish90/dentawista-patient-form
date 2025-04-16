import React, { useState, useRef, useEffect } from 'react';

// Simple SVG icons
const ZoomInIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
  </svg>
);

interface ImageViewerProps {
  imageUrl: string;
  onClose: () => void;
}

export default function ImageViewer({ imageUrl, onClose }: ImageViewerProps) {
  console.log("ImageViewer rendered with URL:", imageUrl);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Block all events
  const blockEvent = (e: React.SyntheticEvent) => {
    console.log("blockEvent triggered by:", e.type);
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // Handle zoom in
  const handleZoomIn = (e: React.MouseEvent) => {
    console.log("handleZoomIn called");
    blockEvent(e);
    const newScale = Math.min(scale + 0.25, 3);
    console.log("New scale (zoom in):", newScale);
    updateScaleAndPosition(newScale);
  };

  // Handle zoom out
  const handleZoomOut = (e: React.MouseEvent) => {
    console.log("handleZoomOut called");
    blockEvent(e);
    const newScale = Math.max(scale - 0.25, 0.5);
    console.log("New scale (zoom out):", newScale);
    updateScaleAndPosition(newScale);
  };

  // Update scale and adjust position to keep image centered
  const updateScaleAndPosition = (newScale: number) => {
    console.log(`updateScaleAndPosition called with newScale: ${newScale}`);
    if (imageRef.current && containerRef.current) {
      const imageWidth = imageRef.current.naturalWidth * newScale;
      const imageHeight = imageRef.current.naturalHeight * newScale;
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const maxX = Math.max(0, (imageWidth - containerWidth) / 2);
      const maxY = Math.max(0, (imageHeight - containerHeight) / 2);

      const scaleRatio = newScale / scale;
      const newX = position.x * scaleRatio;
      const newY = position.y * scaleRatio;

      const nextPosition = {
        x: Math.min(Math.max(-maxX, newX), maxX),
        y: Math.min(Math.max(-maxY, newY), maxY)
      };
      console.log("Setting position:", nextPosition);
      setPosition(nextPosition);
    } else {
      console.log("Image or container ref not available in updateScaleAndPosition");
    }
    console.log("Setting scale:", newScale);
    setScale(newScale);
  };

  // Handle mouse down for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    console.log("handleMouseDown called");
    blockEvent(e);
    setIsDragging(true);
    const nextStartPos = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    console.log("Setting startPos:", nextStartPos);
    setStartPos(nextStartPos);
  };

  // Handle mouse move for panning
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    console.log("handleMouseMove called while dragging");
    blockEvent(e);

    const newX = e.clientX - startPos.x;
    const newY = e.clientY - startPos.y;

    if (imageRef.current && containerRef.current) {
      const imageWidth = imageRef.current.naturalWidth * scale;
      const imageHeight = imageRef.current.naturalHeight * scale;
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const maxX = Math.max(0, (imageWidth - containerWidth) / 2);
      const maxY = Math.max(0, (imageHeight - containerHeight) / 2);

      const nextPosition = {
        x: Math.min(Math.max(-maxX, newX), maxX),
        y: Math.min(Math.max(-maxY, newY), maxY)
      };
      console.log("Setting position (mousemove):", nextPosition);
      setPosition(nextPosition);
    } else {
      console.log("Image or container ref not available in handleMouseMove");
    }
  };

  // Handle mouse up
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    console.log("handleMouseUp called");
    blockEvent(e);
    console.log("Setting isDragging to false");
    setIsDragging(false);
  };

  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent) => {
    console.log("handleWheel called, deltaY:", e.deltaY);
    blockEvent(e);
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(3, scale + delta));
    console.log("New scale (wheel):", newScale);
    updateScaleAndPosition(newScale);
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Add event listeners with capture phase
    document.addEventListener('keydown', handleKeyDown, true);

    // These prevent scrolling on the body while viewing the image
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('wheel', preventDefault, { passive: false });
    document.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('wheel', preventDefault);
      document.removeEventListener('touchmove', preventDefault);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff'
      }}
      onContextMenu={blockEvent}
      onDragStart={blockEvent}
      onDrag={blockEvent}
      onDragEnd={blockEvent}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: 1,
            overflow: 'hidden'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Patient X-ray"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.1s ease',
              maxWidth: 'none',
              maxHeight: 'none',
              cursor: isDragging ? 'grabbing' : 'grab',
              border: '2px solid #3b82f6'
            }}
            draggable={false}
            onDragStart={blockEvent}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.75rem',
            backgroundColor: '#f3f4f6'
          }}
        >
          <button
            onClick={handleZoomIn}
            style={{
              padding: '0.5rem',
              color: '#4b5563',
              border: 'none',
              background: '#e5e7eb',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            <ZoomInIcon />
          </button>
          <button
            onClick={handleZoomOut}
            style={{
              padding: '0.5rem',
              color: '#4b5563',
              border: 'none',
              background: '#e5e7eb',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            <ZoomOutIcon />
          </button>
          <span style={{ color: '#4b5563', fontSize: '0.875rem', fontWeight: 'bold' }}>
            {Math.round(scale * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
} 