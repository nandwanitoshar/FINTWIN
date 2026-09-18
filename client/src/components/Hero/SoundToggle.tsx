import { useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface SoundToggleProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function SoundToggle({ videoRef }: SoundToggleProps) {
  const [isMuted, setIsMuted] = useState(true);

  const toggleSound = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.muted) {
      video.muted = false;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  }, [videoRef]);

  return (
    <button
      className="sound-toggle"
      onClick={toggleSound}
      aria-label={isMuted ? 'Enable sound' : 'Disable sound'}
      type="button"
    >
      {isMuted ? (
        <VolumeX size={16} className="sound-icon" />
      ) : (
        <Volume2 size={16} className="sound-icon" />
      )}

      {!isMuted && (
        <span className="audio-wave" aria-hidden="true">
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
        </span>
      )}

      <span>{isMuted ? 'Sound On' : 'Sound Off'}</span>
    </button>
  );
}
