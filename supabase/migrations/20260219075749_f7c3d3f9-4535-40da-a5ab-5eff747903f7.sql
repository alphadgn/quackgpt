
-- Drop overly permissive policy
DROP POLICY "Service role full access to bindings" ON public.nft_token_bindings;

-- Add specific policies for insert/update/delete scoped to user
CREATE POLICY "Users can insert own bindings"
  ON public.nft_token_bindings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bindings"
  ON public.nft_token_bindings FOR DELETE
  USING (auth.uid() = user_id);
