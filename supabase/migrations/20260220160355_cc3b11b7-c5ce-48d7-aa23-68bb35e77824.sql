
-- Drop the foreign key constraint on daily_query_usage.user_id
ALTER TABLE public.daily_query_usage DROP CONSTRAINT IF EXISTS daily_query_usage_user_id_fkey;

-- Make user_id nullable since we use external_user_id (Privy) instead
ALTER TABLE public.daily_query_usage ALTER COLUMN user_id DROP NOT NULL;

-- Drop the foreign key constraint on profiles.user_id  
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
