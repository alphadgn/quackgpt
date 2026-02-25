
-- Add campaign column to scrape_sources (defaults to 'wallchain' for existing rows)
ALTER TABLE public.scrape_sources
ADD COLUMN campaign TEXT NOT NULL DEFAULT 'wallchain';

-- Create index for efficient filtering
CREATE INDEX idx_scrape_sources_campaign ON public.scrape_sources(campaign);
