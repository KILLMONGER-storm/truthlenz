import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeedbackButtonsProps {
  onFeedback: (isCorrect: boolean) => void;
}

export function FeedbackButtons({ onFeedback }: FeedbackButtonsProps) {
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  
  const handleFeedback = (isCorrect: boolean) => {
    setSubmitted(isCorrect);
    onFeedback(isCorrect);
  };
  
  if (submitted !== null) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <div className="inline-flex items-center gap-2 text-reliable">
          <Check className="w-5 h-5" />
          <span className="font-medium">Thank you for your feedback!</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Your input helps us improve our verification accuracy.
        </p>
      </div>
    );
  }
  
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="text-center mb-4">
        <h3 className="font-semibold text-lg mb-1">Was this result helpful?</h3>
        <p className="text-sm text-muted-foreground">
          Your feedback helps improve our verification system
        </p>
      </div>
      
      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={() => handleFeedback(true)}
          className="flex items-center gap-2 px-6 py-5 hover:bg-reliable-bg hover:text-reliable hover:border-reliable transition-colors"
        >
          <ThumbsUp className="w-5 h-5" />
          <span>Correct Result</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={() => handleFeedback(false)}
          className="flex items-center gap-2 px-6 py-5 hover:bg-fake-bg hover:text-fake hover:border-fake transition-colors"
        >
          <ThumbsDown className="w-5 h-5" />
          <span>Incorrect Result</span>
        </Button>
      </div>
    </div>
  );
}
