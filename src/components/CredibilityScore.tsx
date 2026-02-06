import { useEffect, useState } from 'react';
import type { VerdictType } from '@/types/verification';
import { Shield, AlertTriangle, XCircle } from 'lucide-react';

interface CredibilityScoreProps {
  score: number;
  verdict: VerdictType;
  size?: 'sm' | 'md' | 'lg';
}

const verdictConfig = {
  reliable: {
    label: 'Likely Reliable',
    icon: Shield,
    colorClass: 'text-reliable',
    bgClass: 'bg-reliable-bg',
    strokeClass: 'stroke-reliable',
  },
  misleading: {
    label: 'Possibly Misleading',
    icon: AlertTriangle,
    colorClass: 'text-misleading',
    bgClass: 'bg-misleading-bg',
    strokeClass: 'stroke-misleading',
  },
  fake: {
    label: 'Likely Fake',
    icon: XCircle,
    colorClass: 'text-fake',
    bgClass: 'bg-fake-bg',
    strokeClass: 'stroke-fake',
  },
};

const sizeConfig = {
  sm: { container: 'w-24 h-24', text: 'text-xl', label: 'text-xs' },
  md: { container: 'w-36 h-36', text: 'text-3xl', label: 'text-sm' },
  lg: { container: 'w-48 h-48', text: 'text-4xl', label: 'text-base' },
};

export function CredibilityScore({ score, verdict, size = 'md' }: CredibilityScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const isLowScore = score < 20;
  const config = isLowScore ? verdictConfig.fake : verdictConfig[verdict];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  // Calculate stroke dashoffset for the circular progress
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative ${sizes.container}`}>
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            className="stroke-muted"
          />
          {/* Animated progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={`${config.strokeClass} transition-all duration-1000 ease-out`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${sizes.text} ${config.colorClass}`}>
            {animatedScore}%
          </span>
        </div>
      </div>

      {/* Verdict badge */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${config.bgClass}`}>
        <Icon className={`w-4 h-4 ${config.colorClass}`} />
        <span className={`font-semibold ${sizes.label} ${config.colorClass}`}>
          {config.label}
        </span>
      </div>
    </div>
  );
}
