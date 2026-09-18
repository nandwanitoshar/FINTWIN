import { ChevronDown } from 'lucide-react';

export default function ScrollIndicator() {
  return (
    <button
      className="scroll-indicator"
      onClick={() => {
        // Scroll to the next section (or bottom of hero for now)
        window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
      }}
      aria-label="Scroll to explore"
      type="button"
    >
      <span className="scroll-text">Scroll to Explore</span>
      <ChevronDown size={16} className="scroll-arrow" aria-hidden="true" />
    </button>
  );
}
