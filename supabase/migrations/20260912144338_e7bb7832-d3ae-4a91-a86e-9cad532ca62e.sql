DROP FUNCTION IF EXISTS public.has_role(text, public.app_role);

DROP TABLE IF EXISTS public.chat_feedback CASCADE;
DROP TABLE IF EXISTS public.chat_history CASCADE;
DROP TABLE IF EXISTS public.daily_query_usage CASCADE;
DROP TABLE IF EXISTS public.nft_token_bindings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.text_verifications CASCADE;
DROP TABLE IF EXISTS public.legacy_backup_tweet_audits CASCADE;
DROP TABLE IF EXISTS public.app_users CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

DROP TYPE IF EXISTS public.app_role;

ALTER TABLE public.scrape_sources DROP COLUMN IF EXISTS added_by;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
