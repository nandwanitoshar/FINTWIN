import { TrendingUp, PiggyBank, Shield, Target } from 'lucide-react';

const stats = [
  { label: 'Income',      value: '₹85K',     icon: TrendingUp, accent: false },
  { label: 'Savings',     value: '₹3.2L',    icon: PiggyBank,  accent: false },
  { label: 'Risk',        value: 'LOW',       icon: Shield,     accent: true  },
  { label: 'Future Goal', value: 'ON TRACK',  icon: Target,     accent: true  },
] as const;

export default function HeroStats() {
  return (
    <div className="hero-stats" aria-label="Demo financial preview">
      {stats.map((stat) => (
        <div className="stat-card" key={stat.label}>
          <div className="stat-icon">
            <stat.icon size={14} strokeWidth={2.2} />
          </div>
          <div className="stat-info">
            <span className="stat-label">{stat.label}</span>
            <span className={`stat-value${stat.accent ? ' success' : ''}`}>
              {stat.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
