
-- Fix user_roles public read exposure: restrict to own roles only
-- Since this app uses Privy (external auth) with text user_id field,
-- and edge functions use service role, we restrict direct client reads
DROP POLICY "Users can view own roles" ON public.user_roles;

-- Only allow viewing own roles (no public enumeration)
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (false);

-- Service role (edge functions) bypass RLS automatically
