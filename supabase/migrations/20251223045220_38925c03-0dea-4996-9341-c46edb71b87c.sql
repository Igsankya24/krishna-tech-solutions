-- Create sessions table to track user login history
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  logout_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
ON public.sessions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
ON public.sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Anyone authenticated can insert their own session
CREATE POLICY "Users can insert their own session"
ON public.sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions (for logout)
CREATE POLICY "Users can update their own sessions"
ON public.sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_login_at ON public.sessions(login_at DESC);