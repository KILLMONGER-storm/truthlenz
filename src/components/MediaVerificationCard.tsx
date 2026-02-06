import type { MediaVerification, ImageInspectionDetail, VerdictType } from '@/types/verification';
import { Image, AlertTriangle, CheckCircle, Clock, Wand2, Search, Brain, Eye, Fingerprint, ShieldCheck, ShieldAlert, ShieldX, Users, Box, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { VerdictGlowCard } from '@/components/ui/verdict-glow-card';

interface MediaVerificationCardProps {
  verification: MediaVerification;
  verdict: VerdictType;
  score?: number;
}

function getVerdictConfig(verdict: MediaVerification['imageVerdict'], score?: number) {
  // Flag as suspicious/fake if score is very low even if verdict is real
  if (score !== undefined && score < 20) {
    return {
      label: 'Critical Risk',
      icon: ShieldX,
      color: 'text-fake',
      bg: 'bg-fake-bg',
      border: 'border-fake/30'
    };
  }

  switch (verdict) {
    case 'real':
      return {
        label: 'Authentic',
        icon: ShieldCheck,
        color: 'text-reliable',
        bg: 'bg-reliable-bg',
        border: 'border-reliable/30'
      };
    case 'edited':
      return {
        label: 'Edited/Manipulated',
        icon: ShieldAlert,
        color: 'text-misleading',
        bg: 'bg-misleading-bg',
        border: 'border-misleading/30'
      };
    case 'ai_generated':
      return {
        label: 'AI Generated',
        icon: Sparkles,
        color: 'text-fake',
        bg: 'bg-fake-bg',
        border: 'border-fake/30'
      };
    case 'suspicious':
      return {
        label: 'Suspicious',
        icon: ShieldX,
        color: 'text-misleading',
        bg: 'bg-misleading-bg',
        border: 'border-misleading/30'
      };
    default:
      return {
        label: 'Unknown',
        icon: Search,
        color: 'text-muted-foreground',
        bg: 'bg-muted',
        border: 'border-border'
      };
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'high':
      return 'bg-fake/20 text-fake border-fake/30';
    case 'medium':
      return 'bg-misleading/20 text-misleading border-misleading/30';
    case 'low':
      return 'bg-reliable/20 text-reliable border-reliable/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function InspectionCategory({
  title,
  icon: Icon,
  details,
  defaultOpen = false
}: {
  title: string;
  icon: React.ElementType;
  details?: ImageInspectionDetail[];
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!details || details.length === 0) return null;

  const hasHighSeverity = details.some(d => d.severity === 'high');
  const hasMediumSeverity = details.some(d => d.severity === 'medium');

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-3 text-left transition-colors",
          hasHighSeverity ? "bg-fake-bg hover:bg-fake/10" :
            hasMediumSeverity ? "bg-misleading-bg hover:bg-misleading/10" :
              "bg-muted/30 hover:bg-muted/50"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn(
            "w-4 h-4",
            hasHighSeverity ? "text-fake" :
              hasMediumSeverity ? "text-misleading" :
                "text-reliable"
          )} />
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-muted-foreground">({details.length} findings)</span>
        </div>
        <span className="text-xs text-muted-foreground">{isOpen ? '▼' : '▶'}</span>
      </button>

      {isOpen && (
        <div className="p-3 space-y-2 bg-background/50">
          {details.map((detail, idx) => (
            <div
              key={idx}
              className={cn(
                "p-3 rounded-lg border text-sm",
                getSeverityColor(detail.severity)
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{detail.category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-75">
                    {detail.confidence}% confidence
                  </span>
                  <span className={cn(
                    "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                    detail.severity === 'high' ? 'bg-fake text-white' :
                      detail.severity === 'medium' ? 'bg-misleading text-white' :
                        'bg-reliable text-white'
                  )}>
                    {detail.severity}
                  </span>
                </div>
              </div>
              <p className="text-xs opacity-90">{detail.finding}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MediaVerificationCard({ verification, verdict, score }: MediaVerificationCardProps) {
  const effectiveScore = score ?? verification.authenticityScore;
  const isLowScore = effectiveScore !== undefined && effectiveScore < 20;

  const verdictConfig = getVerdictConfig(verification.imageVerdict, effectiveScore);
  const VerdictIcon = verdictConfig.icon;
  const hasEnhancedAnalysis = !!verification.analysisDetails;

  const displayFlags = isLowScore
    ? ['CRITICAL AUTHENTICITY RISK', ...(verification.flags || [])]
    : (verification.flags || []);

  const displayScore = effectiveScore;

  return (
    <VerdictGlowCard className="col-span-full" verdict={verdict} score={score}>
      <div className="space-y-6">
        {/* Header with Verdict */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Image className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Image Forensic Analysis</h3>
          </div>

          {verification.imageVerdict && (
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border",
              verdictConfig.bg,
              verdictConfig.border
            )}>
              <VerdictIcon className={cn("w-5 h-5", verdictConfig.color)} />
              <span className={cn("font-semibold", verdictConfig.color)}>
                {verdictConfig.label}
              </span>
            </div>
          )}
        </div>

        {/* Authenticity Score */}
        {verification.authenticityScore !== undefined && (
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={cn(
                    isLowScore ? "text-fake" :
                      displayScore >= 70 ? "text-reliable" :
                        displayScore >= 40 ? "text-misleading" :
                          "text-fake"
                  )}
                  strokeDasharray={`${displayScore * 2.83} 283`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-xl font-bold", isLowScore && "text-fake")}>{displayScore}%</span>
              </div>
            </div>
            <div>
              <h4 className={cn("font-semibold", isLowScore && "text-fake")}>
                {isLowScore ? "Critical Authenticity Warning" : "Authenticity Score"}
              </h4>
              <p className="text-sm text-muted-foreground">
                {isLowScore
                  ? "Critically low authenticity score - please review reasons below"
                  : displayScore >= 70
                    ? "Image appears genuine with high confidence"
                    : displayScore >= 40
                      ? "Some concerns detected - review findings below"
                      : "Significant authenticity issues detected"
                }
              </p>
            </div>
          </div>
        )}

        {/* Key Highlights */}
        {verification.inspectionHighlights?.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Key Findings
            </h4>
            <div className="grid gap-2">
              {verification.inspectionHighlights.map((highlight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg"
                >
                  <Search className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span className="text-sm">{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model Agreement Status */}
        {verification.analysisDetails?.modelAgreement && (
          <div className={cn(
            "p-4 rounded-xl border",
            verification.analysisDetails.modelAgreement.agreementLevel === 'high'
              ? "bg-reliable-bg border-reliable/30"
              : verification.analysisDetails.modelAgreement.agreementLevel === 'low'
                ? "bg-fake-bg border-fake/30"
                : "bg-misleading-bg border-misleading/30"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4" />
              <span className="font-medium text-sm">Multi-Model Verification</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Primary Model:</span>
                <span className="ml-2 font-medium capitalize">
                  {verification.analysisDetails.modelAgreement.primaryVerdict.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Secondary Model:</span>
                <span className="ml-2 font-medium capitalize">
                  {verification.analysisDetails.modelAgreement.secondaryVerdict.replace('_', ' ')}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {verification.analysisDetails.modelAgreement.confidenceAdjustment}
            </p>
          </div>
        )}

        {/* Detailed Analysis Categories */}
        {hasEnhancedAnalysis && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Fingerprint className="w-4 h-4" />
              Detailed Inspection Results
            </h4>

            <InspectionCategory
              title="Pixel-Level Analysis"
              icon={Eye}
              details={verification.analysisDetails?.pixelAnalysis}
              defaultOpen={isLowScore || verification.analysisDetails?.pixelAnalysis?.some(d => d.severity === 'high')}
            />

            <InspectionCategory
              title="Texture Analysis"
              icon={Fingerprint}
              details={verification.analysisDetails?.textureAnalysis}
              defaultOpen={isLowScore || verification.analysisDetails?.textureAnalysis?.some(d => d.severity === 'high')}
            />

            <InspectionCategory
              title="Semantic Analysis"
              icon={Box}
              details={verification.analysisDetails?.semanticAnalysis}
              defaultOpen={isLowScore || verification.analysisDetails?.semanticAnalysis?.some(d => d.severity === 'high')}
            />

            <InspectionCategory
              title="Brand & Object Authenticity"
              icon={ShieldCheck}
              details={verification.analysisDetails?.brandAuthenticity}
              defaultOpen={isLowScore || verification.analysisDetails?.brandAuthenticity?.some(d => d.severity === 'high')}
            />

            <InspectionCategory
              title="Human Analysis"
              icon={Users}
              details={verification.analysisDetails?.humanAnalysis}
              defaultOpen={isLowScore || verification.analysisDetails?.humanAnalysis?.some(d => d.severity === 'high')}
            />
          </div>
        )}

        {/* Cross-Match Results */}
        {verification.analysisDetails?.crossMatchResults && (
          <div className="p-4 bg-muted/30 rounded-xl">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Internet Cross-Matching
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {verification.analysisDetails.crossMatchResults.hasOnlineMatch ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-misleading" />
                    <span>Similar images found online ({verification.analysisDetails.crossMatchResults.matchConfidence}% confidence)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-reliable" />
                    <span>No matching images found - appears to be original</span>
                  </>
                )}
              </div>
              {verification.analysisDetails.crossMatchResults.possibleSources?.length > 0 && (
                <div className="mt-2 pl-6">
                  <span className="text-muted-foreground">Possible sources:</span>
                  <ul className="list-disc list-inside mt-1">
                    {verification.analysisDetails.crossMatchResults.possibleSources.map((source, idx) => (
                      <li key={idx} className="text-xs">{source}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Legacy Status Indicators */}
        {!hasEnhancedAnalysis && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Content Description</h4>
              <p className="text-sm bg-muted/50 p-3 rounded-lg">
                {verification.description}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Analysis Results</h4>

              <div className="flex items-center gap-3">
                <Clock className={`w-4 h-4 ${verification.isReused ? 'text-misleading' : 'text-reliable'}`} />
                <span className="text-sm">
                  {verification.isReused ? (
                    <>
                      <span className="text-misleading font-medium">Potentially reused</span>
                      {verification.reusedFrom && (
                        <span className="text-muted-foreground"> — {verification.reusedFrom}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-reliable">No reuse detected</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Wand2 className={`w-4 h-4 ${verification.manipulationDetected ? 'text-fake' : 'text-reliable'}`} />
                <span className="text-sm">
                  {verification.manipulationDetected ? (
                    <span className="text-fake font-medium">Signs of manipulation detected</span>
                  ) : (
                    <span className="text-reliable">No manipulation detected</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {verification.matchesClaim ? (
                  <CheckCircle className="w-4 h-4 text-reliable" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-misleading" />
                )}
                <span className="text-sm">
                  {verification.matchesClaim ? (
                    <span className="text-reliable">Media supports the claim</span>
                  ) : (
                    <span className="text-misleading font-medium">Media may not match claim</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Flags */}
        {displayFlags.length > 0 && (
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Warnings & Flags</h4>
            <div className="flex flex-wrap gap-2">
              {displayFlags.map((flag, index) => (
                <span
                  key={index}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full",
                    flag === 'CRITICAL AUTHENTICITY RISK'
                      ? "bg-fake text-white animate-pulse"
                      : "bg-misleading-bg text-misleading"
                  )}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {flag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </VerdictGlowCard>
  );
}
