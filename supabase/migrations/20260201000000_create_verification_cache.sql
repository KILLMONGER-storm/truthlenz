-- Create a new table named "verification_cache"
CREATE TABLE IF NOT EXISTS public.verification_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_hash TEXT UNIQUE NOT NULL,
    content_type TEXT NOT NULL, -- article | url | image
    original_input TEXT NOT NULL,
    api_response JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    hit_count INTEGER DEFAULT 1
);

-- Create index for efficient lookups by hash
CREATE INDEX IF NOT EXISTS idx_verification_cache_hash
ON public.verification_cache(content_hash);

-- Enable Row Level Security (RLS)
ALTER TABLE public.verification_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage everything
CREATE POLICY "Enable all for service-role" ON public.verification_cache
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow public read access (optional, but useful if frontend needs to check cache directly)
CREATE POLICY "Public read access" ON public.verification_cache
FOR SELECT TO anon, authenticated USING (true);

-- Create a function to increment hit count safely
CREATE OR REPLACE FUNCTION increment_cache_hit(target_hash TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.verification_cache
    SET hit_count = hit_count + 1
    WHERE content_hash = target_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
