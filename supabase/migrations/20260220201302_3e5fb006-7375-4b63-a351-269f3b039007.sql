
-- Create chat_feedback table for thumbs up/down on AI responses
CREATE TABLE public.chat_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_user_id TEXT NOT NULL,
  message_content TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;

-- Only service role can read all feedback (for admin/training purposes)
CREATE POLICY "Service role can read all feedback"
ON public.chat_feedback
FOR SELECT
USING (false);

-- Users can insert their own feedback via edge function (service role)
CREATE POLICY "Service role can insert feedback"
ON public.chat_feedback
FOR INSERT
WITH CHECK (false);

-- Create users table for super admin management
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  notes TEXT,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Only accessible via service role (admin edge functions)
CREATE POLICY "No public access to app_users"
ON public.app_users
FOR ALL
USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_app_users_updated_at
BEFORE UPDATE ON public.app_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
