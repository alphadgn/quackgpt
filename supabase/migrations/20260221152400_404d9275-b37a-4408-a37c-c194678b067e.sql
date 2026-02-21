
-- Chat history table
CREATE TABLE public.chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_chat_history_user ON public.chat_history (external_user_id, created_at DESC);
CREATE INDEX idx_chat_history_session ON public.chat_history (session_id, created_at);

-- RLS
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Deny all client access (edge functions use service role)
CREATE POLICY "No direct client access" ON public.chat_history FOR ALL USING (false);
