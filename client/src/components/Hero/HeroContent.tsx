import { ArrowRight, Compass } from 'lucide-react';
import HeroStats from './HeroStats';

export default function HeroContent() {
  return (
    <div className="hero-content">
      <div className="hero-inner">
        {/* Eyebrow */}
        <div className="hero-eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          <span className="eyebrow-text">AI-Powered Financial Digital Twin</span>
        </div>

        {/* Headline */}
        <h1 className="hero-headline">
          See Your{' '}
          <span className="headline-accent">Financial Future</span>
          <br />
          Before You Decide.
        </h1>

        {/* Subheading */}
        <p className="hero-subheading">
          FinTwin AI lets you simulate major money decisions, compare possible
          futures, and choose the safer path — before you spend.
        </p>

        {/* CTAs */}
        <div className="hero-cta-group">
          <a href="#simulate" className="cta-primary">
            Simulate Your Future
            <ArrowRight size={16} className="cta-arrow" aria-hidden="true" />
          </a>
          <a href="#explore" className="cta-secondary">
            <Compass size={15} aria-hidden="true" />
            Explore FinTwin
          </a>
        </div>

        {/* Stats preview */}
        <HeroStats />
      </div>
    </div>
  );
}
