import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { VerdictType } from '@/types/verification';

interface FeedbackButtonsProps {
  onFeedback: (isCorrect: boolean, correction?: string, correctVerdict?: VerdictType) => void;
  currentVerdict: VerdictType;
}

export function FeedbackButtons({ onFeedback, currentVerdict }: FeedbackButtonsProps) {
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correction, setCorrection] = useState('');
  const [correctVerdict, setCorrectVerdict] = useState<VerdictType | ''>('');
  
  const handleCorrectClick = () => {
    setSubmitted(true);
    onFeedback(true);
  };
  
  const handleIncorrectClick = () => {
    setShowCorrectionForm(true);
  };
  
  const handleSubmitCorrection = () => {
    if (!correction.trim() || !correctVerdict) return;
    setSubmitted(false);
    onFeedback(false, correction, correctVerdict as VerdictType);
  };
  
  if (submitted !== null) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <div className="inline-flex items-center gap-2 text-reliable">
          <Check className="w-5 h-5" />
          <span className="font-medium">Thank you for your feedback!</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {submitted 
            ? "We're glad the result was helpful!" 
            : "Your correction will help improve our AI's accuracy for similar content."}
        </p>
      </div>
    );
  }
  
  if (showCorrectionForm) {
    return (
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="text-center">
          <h3 className="font-semibold text-lg mb-1">Help us improve</h3>
          <p className="text-sm text-muted-foreground">
            Tell us why this result was incorrect so our AI can learn
          </p>
        </div>
        
        <div className="space-y-3">
          <Label className="text-sm font-medium">What should the correct verdict be?</Label>
          <RadioGroup 
            value={correctVerdict} 
            onValueChange={(value) => setCorrectVerdict(value as VerdictType)}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem 
                value="reliable" 
                id="reliable" 
                disabled={currentVerdict === 'reliable'}
              />
              <Label 
                htmlFor="reliable" 
                className={`cursor-pointer ${currentVerdict === 'reliable' ? 'text-muted-foreground' : 'text-reliable'}`}
              >
                Reliable
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem 
                value="misleading" 
                id="misleading"
                disabled={currentVerdict === 'misleading'}
              />
              <Label 
                htmlFor="misleading" 
                className={`cursor-pointer ${currentVerdict === 'misleading' ? 'text-muted-foreground' : 'text-misleading'}`}
              >
                Misleading
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem 
                value="fake" 
                id="fake"
                disabled={currentVerdict === 'fake'}
              />
              <Label 
                htmlFor="fake" 
                className={`cursor-pointer ${currentVerdict === 'fake' ? 'text-muted-foreground' : 'text-fake'}`}
              >
                Fake
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="correction" className="text-sm font-medium">
            Why is this incorrect? (required)
          </Label>
          <Textarea
            id="correction"
            placeholder="Please explain why the AI's verdict was wrong. For example: 'This is actually from a verified news source' or 'The image is real, I was there when it happened'..."
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {correction.length}/1000 characters
          </p>
        </div>
        
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => setShowCorrectionForm(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitCorrection}
            disabled={!correction.trim() || !correctVerdict}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            Submit Correction
          </Button>
        </div>
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
          onClick={handleCorrectClick}
          className="flex items-center gap-2 px-6 py-5 hover:bg-reliable-bg hover:text-reliable hover:border-reliable transition-colors"
        >
          <ThumbsUp className="w-5 h-5" />
          <span>Correct Result</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={handleIncorrectClick}
          className="flex items-center gap-2 px-6 py-5 hover:bg-fake-bg hover:text-fake hover:border-fake transition-colors"
        >
          <ThumbsDown className="w-5 h-5" />
          <span>Incorrect Result</span>
        </Button>
      </div>
    </div>
  );
}