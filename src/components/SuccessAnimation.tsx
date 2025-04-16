import React, { useEffect, useRef } from "react";
import Lottie from "lottie-react";
import { gsap } from 'gsap';
import successAnimationData from './success-animation.json'; // Import the downloaded JSON from src/components/

interface SuccessAnimationProps {
  onComplete: () => void;
}

export default function SuccessAnimation({ onComplete }: SuccessAnimationProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lottieRef = useRef<any>(null); // Add eslint disable for the 'any' type

  useEffect(() => {
    const tl = gsap.timeline({});

    const overlay = overlayRef.current;
    const card = cardRef.current;
    const text = textRef.current;

    if (overlay && card && text) {
      gsap.set([overlay, card, text], { autoAlpha: 0 });
      gsap.set(card, { scale: 0.7, y: 30 });
      gsap.set(text, { y: 10 });

      tl
        .to(overlay, { autoAlpha: 1, duration: 0.4, ease: 'power2.inOut' })
        .to(card, {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          duration: 0.5,
          ease: 'back.out(1.4)'
        }, "-=0.2")
        .to(text, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power1.out' }, "-=0.2");
    }

    return () => {
      tl.kill();
    };
  }, []);

  const handleLottieComplete = () => {
    gsap.delayedCall(0.5, onComplete);
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50"
      style={{ visibility: 'hidden' }}
    >
      <div
        ref={cardRef}
        className="bg-white rounded-2xl p-10 flex flex-col items-center shadow-2xl"
        style={{ visibility: 'hidden' }}
      >
        <Lottie
          lottieRef={lottieRef}
          animationData={successAnimationData} // Use animationData prop with imported JSON
          loop={false}
          autoplay={true}
          onComplete={handleLottieComplete}
          style={{ width: 150, height: 150, marginBottom: '1rem' }}
        />
        <p
          ref={textRef}
          className="text-2xl font-semibold text-gray-800"
          style={{ visibility: 'hidden' }}
        >
          Successfully Submitted!
        </p>
      </div>
    </div>
  );
}
