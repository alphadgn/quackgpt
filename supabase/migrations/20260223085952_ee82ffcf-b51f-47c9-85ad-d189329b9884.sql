
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Indexed sources table with versioning and change detection
CREATE TABLE public.indexed_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  reliability_tier INTEGER NOT NULL DEFAULT 1,
  embedding extensions.vector(1536),
  chunk_index INTEGER NOT NULL DEFAULT 0,
  parent_source_id UUID,
  last_scraped TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_current BOOLEAN NOT NULL DEFAULT true,
  change_detected BOOLEAN NOT NULL DEFAULT false,
  author TEXT,
  source_timestamp TIMESTAMP WITH TIME ZONE
);

-- Index for vector similarity search
CREATE INDEX idx_indexed_sources_embedding ON public.indexed_sources 
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- Index for content hash lookups (change detection)
CREATE INDEX idx_indexed_sources_content_hash ON public.indexed_sources (content_hash);
CREATE INDEX idx_indexed_sources_source_url ON public.indexed_sources (source_url, is_current);

-- Enable RLS
ALTER TABLE public.indexed_sources ENABLE ROW LEVEL SECURITY;

-- Deny all client access (service role only via edge functions)
CREATE POLICY "No client access to indexed_sources"
ON public.indexed_sources
FOR ALL
USING (false);

-- Tweet audits table
CREATE TABLE public.tweet_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_user_id TEXT NOT NULL,
  tweet_text TEXT NOT NULL,
  relevancy_score INTEGER NOT NULL DEFAULT 0,
  honesty_score INTEGER NOT NULL DEFAULT 0,
  correctness_score INTEGER NOT NULL DEFAULT 0,
  brand_alignment_score INTEGER NOT NULL DEFAULT 0,
  composite_score INTEGER NOT NULL DEFAULT 0,
  detailed_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  suggested_improvements TEXT[],
  risk_flags TEXT[],
  supporting_sources TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tweet_audits ENABLE ROW LEVEL SECURITY;

-- Deny all client access (service role only via edge functions)
CREATE POLICY "No client access to tweet_audits"
ON public.tweet_audits
FOR ALL
USING (false);

-- Scrape job log for tracking scheduled scrapes
CREATE TABLE public.scrape_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  sources_checked INTEGER NOT NULL DEFAULT 0,
  sources_updated INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  triggered_by TEXT NOT NULL DEFAULT 'scheduled'
);

ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to scrape_jobs"
ON public.scrape_jobs
FOR ALL
USING (false);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding extensions.vector(1536),
  match_count INTEGER DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  source_url TEXT,
  title TEXT,
  content TEXT,
  reliability_tier INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    is2.id,
    is2.source_url,
    is2.title,
    is2.content,
    is2.reliability_tier,
    1 - (is2.embedding <=> query_embedding)::float AS similarity
  FROM public.indexed_sources is2
  WHERE is2.is_current = true
    AND is2.embedding IS NOT NULL
    AND 1 - (is2.embedding <=> query_embedding)::float > match_threshold
  ORDER BY is2.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_indexed_sources_updated_at
  BEFORE UPDATE ON public.indexed_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
