import { Shield, FileSearch, CheckCircle } from 'lucide-react';

const steps = [
  { icon: FileSearch, label: 'Analyzing content...' },
  { icon: Shield, label: 'Cross-checking sources...' },
  { icon: CheckCircle, label: 'Generating report...' },
];

export function LoadingState() {
  return (
    <div className="w-full max-w-md mx-auto text-center py-12 animate-fade-in">
      <div className="relative w-24 h-24 mx-auto mb-8">
        {/* Spinning ring */}
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Shield className="w-10 h-10 text-primary animate-pulse-subtle" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold mb-6">Verifying Content</h3>
      
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex items-center justify-center gap-3 text-muted-foreground animate-pulse-subtle"
            style={{ animationDelay: `${index * 0.3}s` }}
          >
            <step.icon className="w-4 h-4" />
            <span className="text-sm">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
