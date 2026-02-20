
-- Add cycle_started_at column to track when the user's 24h cycle began
ALTER TABLE public.daily_query_usage 
ADD COLUMN IF NOT EXISTS cycle_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
