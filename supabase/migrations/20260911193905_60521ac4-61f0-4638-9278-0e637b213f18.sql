REVOKE ALL ON FUNCTION public.has_role(text, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(text, public.app_role) TO service_role;