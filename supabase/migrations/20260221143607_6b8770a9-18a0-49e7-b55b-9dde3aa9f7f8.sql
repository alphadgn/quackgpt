
-- Create scrape_sources table for official data sources
CREATE TABLE public.scrape_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  added_by text -- external_user_id of who added it
);

-- Enable RLS
ALTER TABLE public.scrape_sources ENABLE ROW LEVEL SECURITY;

-- Everyone can read active sources (needed by edge functions via service role, but also harmless to expose)
CREATE POLICY "Anyone can read scrape sources"
ON public.scrape_sources FOR SELECT
USING (true);

-- Only super admins can insert/update/delete (enforced via edge functions with service role)
-- Client-side deny all writes
CREATE POLICY "No client writes to scrape sources"
ON public.scrape_sources FOR INSERT
WITH CHECK (false);

CREATE POLICY "No client updates to scrape sources"
ON public.scrape_sources FOR UPDATE
USING (false);

CREATE POLICY "No client deletes to scrape sources"
ON public.scrape_sources FOR DELETE
USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_scrape_sources_updated_at
BEFORE UPDATE ON public.scrape_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with official sources
INSERT INTO public.scrape_sources (url, label) VALUES
  ('https://news.wallchain.xyz/', 'Wallchain News'),
  ('https://docs.wallchain.xyz/faq', 'Wallchain FAQ'),
  ('https://www.wallchain.xyz/', 'Wallchain Official Website'),
  ('https://wikitia.com/wiki/Wallchain_Labs', 'Wallchain Wiki'),
  ('https://docs.wallchain.xyz/intro', 'Wallchain Docs Intro'),
  ('https://app.wallchain.xyz/leaderboards', 'Wallchain Leaderboards'),
  ('https://app.wallchain.xyz/', 'Wallchain App');

-- Add user_query column to chat_feedback for admin review context
ALTER TABLE public.chat_feedback ADD COLUMN IF NOT EXISTS user_query text;
ALTER TABLE public.chat_feedback ADD COLUMN IF NOT EXISTS admin_reviewed boolean NOT NULL DEFAULT false;
ALTER TABLE public.chat_feedback ADD COLUMN IF NOT EXISTS admin_override text;
