REVOKE ALL ON FUNCTION public.match_documents(extensions.vector, text, integer, double precision, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_documents(extensions.vector, text, integer, double precision, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.match_documents(extensions.vector, integer, double precision) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_documents(extensions.vector, integer, double precision) TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;