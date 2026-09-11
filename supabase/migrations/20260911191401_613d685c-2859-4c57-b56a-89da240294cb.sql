-- 1. Knowledge domain registry
CREATE TABLE public.knowledge_domains (
  id text PRIMARY KEY,
  label text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.knowledge_domains TO authenticated;
GRANT ALL ON public.knowledge_domains TO service_role;
ALTER TABLE public.knowledge_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No client access to knowledge_domains" ON public.knowledge_domains FOR ALL USING (false);

INSERT INTO public.knowledge_domains (id, label, is_public) VALUES
  ('ugly_duck_society', 'Ugly Duck Society', true),
  ('legacy_archive', 'Legacy Archive (internal)', false),
  ('quarantine', 'Quarantine (internal)', false);

-- 2. Backups (pre-change snapshot)
CREATE TABLE public.legacy_backup_indexed_sources AS SELECT * FROM public.indexed_sources;
CREATE TABLE public.legacy_backup_scrape_sources AS SELECT * FROM public.scrape_sources;
GRANT ALL ON public.legacy_backup_indexed_sources TO service_role;
GRANT ALL ON public.legacy_backup_scrape_sources TO service_role;
ALTER TABLE public.legacy_backup_indexed_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_backup_scrape_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No client access to backup indexed sources" ON public.legacy_backup_indexed_sources FOR ALL USING (false);
CREATE POLICY "No client access to backup scrape sources" ON public.legacy_backup_scrape_sources FOR ALL USING (false);

-- 3. indexed_sources: provenance + knowledge domain
ALTER TABLE public.indexed_sources
  ADD COLUMN knowledge_domain text,
  ADD COLUMN normalized_url text,
  ADD COLUMN canonical_url text,
  ADD COLUMN source_family text,
  ADD COLUMN retrieved_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN archived_at timestamptz;

UPDATE public.indexed_sources
SET normalized_url = lower(regexp_replace(regexp_replace(source_url, '^https?://(www\.)?', ''), '/+$', '')),
    canonical_url = source_url;

-- Safely-owned legacy records go to the internal legacy archive; anything unclear is quarantined.
UPDATE public.indexed_sources
SET knowledge_domain = 'legacy_archive',
    source_family = 'legacy',
    is_current = false,
    archived_at = now()
WHERE normalized_url ~ '(wallchain|idos\.network|beyond\.markets)';

UPDATE public.indexed_sources
SET knowledge_domain = 'quarantine',
    source_family = 'unknown',
    is_current = false,
    archived_at = now()
WHERE knowledge_domain IS NULL;

ALTER TABLE public.indexed_sources
  ALTER COLUMN knowledge_domain SET DEFAULT 'quarantine',
  ALTER COLUMN knowledge_domain SET NOT NULL,
  ALTER COLUMN normalized_url SET NOT NULL,
  ADD CONSTRAINT indexed_sources_knowledge_domain_fkey
    FOREIGN KEY (knowledge_domain) REFERENCES public.knowledge_domains(id);

CREATE INDEX idx_indexed_sources_domain_current
  ON public.indexed_sources (knowledge_domain, is_current);
CREATE UNIQUE INDEX idx_indexed_sources_domain_url_chunk_version
  ON public.indexed_sources (knowledge_domain, normalized_url, chunk_index, version);

-- 4. scrape_sources: knowledge domain replaces campaign
ALTER TABLE public.scrape_sources
  ADD COLUMN knowledge_domain text,
  ADD COLUMN normalized_url text,
  ADD COLUMN source_family text;

UPDATE public.scrape_sources
SET knowledge_domain = 'legacy_archive',
    source_family = 'legacy',
    is_active = false,
    normalized_url = lower(regexp_replace(regexp_replace(url, '^https?://(www\.)?', ''), '/+$', ''))
WHERE knowledge_domain IS NULL;

ALTER TABLE public.scrape_sources
  ALTER COLUMN campaign DROP DEFAULT,
  ALTER COLUMN campaign DROP NOT NULL,
  ALTER COLUMN knowledge_domain SET NOT NULL,
  ALTER COLUMN normalized_url SET NOT NULL,
  ADD CONSTRAINT scrape_sources_knowledge_domain_fkey
    FOREIGN KEY (knowledge_domain) REFERENCES public.knowledge_domains(id);

CREATE UNIQUE INDEX idx_scrape_sources_domain_url
  ON public.scrape_sources (knowledge_domain, normalized_url);
CREATE INDEX idx_scrape_sources_domain_active
  ON public.scrape_sources (knowledge_domain, is_active);

-- 5. Evidence-based text verification (no scoring)
CREATE TABLE public.text_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id text NOT NULL,
  knowledge_domain text NOT NULL REFERENCES public.knowledge_domains(id),
  submitted_text text NOT NULL,
  claim_analysis jsonb NOT NULL DEFAULT '[]'::jsonb,
  corrections jsonb NOT NULL DEFAULT '[]'::jsonb,
  supporting_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.text_verifications TO service_role;
ALTER TABLE public.text_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No client access to text_verifications" ON public.text_verifications FOR ALL USING (false);

-- 6. Knowledge-domain-filtered retrieval (filter BEFORE similarity ranking)
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding extensions.vector,
  p_knowledge_domain text,
  match_count integer DEFAULT 5,
  match_threshold double precision DEFAULT 0.7,
  include_archived boolean DEFAULT false
)
RETURNS TABLE(
  id uuid, source_url text, canonical_url text, title text, content text,
  author text, source_timestamp timestamptz, retrieved_at timestamptz,
  reliability_tier integer, knowledge_domain text, version integer,
  is_current boolean, similarity double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  WITH scoped AS (
    SELECT * FROM public.indexed_sources s
    WHERE s.knowledge_domain = p_knowledge_domain
      AND (include_archived OR s.is_current = true)
      AND s.embedding IS NOT NULL
  )
  SELECT
    scoped.id, scoped.source_url, scoped.canonical_url, scoped.title, scoped.content,
    scoped.author, scoped.source_timestamp, scoped.retrieved_at,
    scoped.reliability_tier, scoped.knowledge_domain, scoped.version,
    scoped.is_current,
    1 - (scoped.embedding <=> query_embedding)::float AS similarity
  FROM scoped
  WHERE 1 - (scoped.embedding <=> query_embedding)::float > match_threshold
  ORDER BY scoped.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

-- 7. Seed the three approved Ugly Duck Society sources
INSERT INTO public.scrape_sources (url, label, is_active, campaign, knowledge_domain, normalized_url, source_family)
VALUES
  ('https://uglyducksociety.tech', 'Ugly Duck Society — Official Website', true, NULL, 'ugly_duck_society', 'uglyducksociety.tech', 'website'),
  ('https://www.instagram.com/uglyducksociety/', 'Ugly Duck Society — Official Instagram', true, NULL, 'ugly_duck_society', 'instagram.com/uglyducksociety', 'instagram'),
  ('https://x.com/uglyducklabz', 'Ugly Duck Society — Official X', true, NULL, 'ugly_duck_society', 'x.com/uglyducklabz', 'x')
ON CONFLICT DO NOTHING;