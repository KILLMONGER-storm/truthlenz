-- Create verification_feedback table to store user feedback
CREATE TABLE public.verification_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_hash TEXT NOT NULL,
  original_content TEXT NOT NULL,
  original_verdict TEXT NOT NULL,
  original_score INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  user_correction TEXT,
  correct_verdict TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.verification_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (public feature, no auth required)
CREATE POLICY "Anyone can submit feedback"
ON public.verification_feedback
FOR INSERT
WITH CHECK (true);

-- Allow reading feedback for AI training (public read for the edge function)
CREATE POLICY "Anyone can read feedback for training"
ON public.verification_feedback
FOR SELECT
USING (true);

-- Create index for faster content hash lookups
CREATE INDEX idx_verification_feedback_content_hash ON public.verification_feedback(content_hash);