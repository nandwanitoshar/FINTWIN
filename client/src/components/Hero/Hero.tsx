import { useRef, useState, useCallback, useEffect } from 'react';
import HeroVideo from './HeroVideo';
import HeroContent from './HeroContent';
import SoundToggle from './SoundToggle';
import FloatingUI from './FloatingUI';
import ScrollIndicator from './ScrollIndicator';
import './Hero.css';

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const handleVideoReady = useCallback(() => {
    setVideoReady(true);
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoFailed(true);
    setVideoReady(true); // dismiss loader even on error
  }, []);

  /* Safety fallback: guarantee loader dismisses after 2.5s even if canplay is delayed */
  useEffect(() => {
    const timer = setTimeout(() => {
      setVideoReady(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className={`hero${videoReady ? ' hero-animate' : ''}`} id="hero" aria-label="FinTwin AI Hero">
      {/* Loading state */}
      <div className={`hero-loader ${videoReady ? 'hidden' : ''}`}>
        <div className="loader-brand">
          Fin<span>Twin</span> AI
        </div>
        <div className="loader-bar-track">
          <div className="loader-bar-fill" />
        </div>
      </div>

      {/* Layer 1–3: Video + Overlays (or Fallback) + Sound control */}
      {!videoFailed ? (
        <HeroVideo
          videoRef={videoRef}
          onReady={handleVideoReady}
          onError={handleVideoError}
        >
          <SoundToggle videoRef={videoRef} />
        </HeroVideo>
      ) : (
        <div className="hero-fallback" />
      )}

      {/* Layer 4: Content */}
      <HeroContent />

      {/* Floating UI decorations (desktop only via CSS) */}
      <FloatingUI />

      {/* Layer 6: Scroll indicator */}
      <ScrollIndicator />
    </section>
  );
}
