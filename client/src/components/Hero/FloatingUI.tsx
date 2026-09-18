import { ShoppingCart, TrendingDown, AlertTriangle, Brain } from 'lucide-react';

const floats = [
  { label: '₹70,000 Purchase',    icon: ShoppingCart,  pos: 'float-pos-1' },
  { label: 'Savings Impact ↓',    icon: TrendingDown,  pos: 'float-pos-2' },
  { label: 'EMI Risk',            icon: AlertTriangle, pos: 'float-pos-3' },
  { label: 'AI Risk Analysis',    icon: Brain,         pos: 'float-pos-4' },
] as const;

export default function FloatingUI() {
  return (
    <>
      {floats.map((item) => (
        <div
          key={item.label}
          className={`hero-floating ${item.pos}`}
          aria-hidden="true"
        >
          <div className="float-card">
            <item.icon size={13} className="float-icon" />
            <span>{item.label}</span>
          </div>
        </div>
      ))}
    </>
  );
}
