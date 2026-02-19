
-- Add external_user_id to all three tables
ALTER TABLE public.profiles ADD COLUMN external_user_id TEXT UNIQUE;
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.daily_query_usage ADD COLUMN external_user_id TEXT;
ALTER TABLE public.daily_query_usage DROP CONSTRAINT daily_query_usage_user_id_query_date_key;
ALTER TABLE public.daily_query_usage ADD CONSTRAINT daily_query_usage_ext_user_date UNIQUE (external_user_id, query_date);

ALTER TABLE public.nft_token_bindings ADD COLUMN external_user_id TEXT;
