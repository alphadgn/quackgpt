-- Fix 1: Drop the overly broad "Service role can read all profiles" policy
-- This RESTRICTIVE policy with USING(true) is unnecessary since edge functions 
-- use service role key which bypasses RLS entirely.
DROP POLICY IF EXISTS "Service role can read all profiles" ON public.profiles;