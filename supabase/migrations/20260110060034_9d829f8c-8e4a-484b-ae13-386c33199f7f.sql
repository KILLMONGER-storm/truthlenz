-- Add column to store image data for training
ALTER TABLE public.verification_feedback
ADD COLUMN image_base64 TEXT,
ADD COLUMN content_type TEXT DEFAULT 'text';

-- Add index for faster lookup of image feedback
CREATE INDEX idx_verification_feedback_content_type ON public.verification_feedback(content_type);

-- Comment for documentation
COMMENT ON COLUMN public.verification_feedback.image_base64 IS 'Base64 encoded image data for AI training on image verification feedback';
COMMENT ON COLUMN public.verification_feedback.content_type IS 'Type of content: text, image, url, video';