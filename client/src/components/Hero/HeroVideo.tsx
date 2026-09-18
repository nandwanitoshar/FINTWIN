import { useEffect, useRef, useState, useCallback } from 'react';

interface HeroVideoProps {
  onReady: () => void;
  onError: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  children?: React.ReactNode;
}

export default function HeroVideo({ onReady, onError, videoRef, children }: HeroVideoProps) {
  const [hasError, setHasError] = useState(false);
  const readyFired = useRef(false);

  const handleCanPlay = useCallback(() => {
    if (!readyFired.current) {
      readyFired.current = true;
      onReady();
    }
  }, [onReady]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError();
  }, [onError]);

  /* Intersection Observer — pause/resume when Hero scrolls out of view */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [videoRef]);

  /* Attempt autoplay (muted first to comply with browser policy) */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Try muted autoplay first — this is always allowed
    video.muted = true;
    video.play().catch(() => {
      // If even muted autoplay fails, do nothing — the video just won't play
    });
  }, [videoRef]);

  if (hasError) {
    return <div className="hero-fallback" />;
  }

  return (
    <div className="hero-video-container">
      <div className="hero-video-glow" aria-hidden="true" />
      <div className="hero-video-stage">
        <video
          ref={videoRef}
          className="hero-video"
          autoPlay
          playsInline
          loop
          muted
          preload="auto"
          onCanPlay={handleCanPlay}
          onError={handleError}
        >
          <source src="/videos/fintwin-hero.mp4" type="video/mp4" />
        </video>

        {/* Layer 2: Dark cinematic overlay */}
        <div className="hero-overlay" />

        {/* Layer 3: Vignette for text readability */}
        <div className="hero-vignette" />

        {/* Nested controls (e.g. SoundToggle) */}
        {children}
      </div>
    </div>
  );
}
