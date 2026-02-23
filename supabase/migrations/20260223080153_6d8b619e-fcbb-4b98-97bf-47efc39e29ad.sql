
-- Drop the overly permissive read policy on scrape_sources
DROP POLICY IF EXISTS "Anyone can read scrape sources" ON public.scrape_sources;

-- Replace with a deny-all SELECT policy consistent with other tables
CREATE POLICY "No client reads on scrape_sources"
ON public.scrape_sources
FOR SELECT
USING (false);
