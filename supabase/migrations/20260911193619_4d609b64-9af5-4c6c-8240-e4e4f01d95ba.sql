CREATE TABLE IF NOT EXISTS public.legacy_backup_tweet_audits AS SELECT * FROM public.tweet_audits;

ALTER TABLE public.legacy_backup_tweet_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to backup tweet audits" ON public.legacy_backup_tweet_audits;
CREATE POLICY "No client access to backup tweet audits"
ON public.legacy_backup_tweet_audits
FOR ALL
USING (false);

GRANT ALL ON public.legacy_backup_tweet_audits TO service_role;

DROP TABLE public.tweet_audits;