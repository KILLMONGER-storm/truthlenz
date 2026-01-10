import type { ClaimExtraction, VerdictType } from '@/types/verification';
import { Search, CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { VerdictGlowCard } from '@/components/ui/verdict-glow-card';

interface FactCheckCardProps {
  claim: ClaimExtraction;
  verdict: VerdictType;
  score?: number;
}

const resultConfig = {
  confirmed: {
    icon: CheckCircle,
    label: 'Confirmed',
    colorClass: 'text-reliable',
    bgClass: 'bg-reliable-bg',
  },
  disputed: {
    icon: AlertTriangle,
    label: 'Disputed',
    colorClass: 'text-misleading',
    bgClass: 'bg-misleading-bg',
  },
  false: {
    icon: XCircle,
    label: 'False',
    colorClass: 'text-fake',
    bgClass: 'bg-fake-bg',
  },
  unverified: {
    icon: HelpCircle,
    label: 'Unverified',
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
  },
};

export function FactCheckCard({ claim, verdict, score }: FactCheckCardProps) {
  const config = resultConfig[claim.factCheckResult];
  const Icon = config.icon;
  
  return (
    <VerdictGlowCard verdict={verdict} score={score}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Search className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">Fact Check</h3>
      </div>
      
      <div className="space-y-4">
        {/* Main Claim */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Main Claim</h4>
          <p className="text-sm bg-muted/50 p-3 rounded-lg italic">
            "{claim.mainClaim}"
          </p>
        </div>
        
        {/* Fact Check Result */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Verification Status</h4>
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full ${config.bgClass}`}>
            <Icon className={`w-4 h-4 ${config.colorClass}`} />
            <span className={`font-semibold text-sm ${config.colorClass}`}>
              {config.label}
            </span>
          </div>
        </div>
        
        {/* Sources */}
        {claim.sources.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Sources Checked</h4>
            <ul className="space-y-1">
              {claim.sources.map((source, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  {source}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </VerdictGlowCard>
  );
}
