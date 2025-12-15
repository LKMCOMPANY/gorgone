-- Migration: Add secure sharing capabilities to chat_reports
-- Uses pgcrypto for password hashing (bcrypt via crypt/gen_salt)

-- Add sharing columns to chat_reports
ALTER TABLE public.chat_reports
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS share_password_hash TEXT,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Create index for fast token lookup on public route
CREATE INDEX IF NOT EXISTS idx_chat_reports_share_token 
ON public.chat_reports(share_token) 
WHERE share_token IS NOT NULL;

-- Create function to verify report password using pgcrypto
-- This keeps password verification in the database layer for security
CREATE OR REPLACE FUNCTION verify_report_password(
  p_share_token TEXT,
  p_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  -- Get the stored hash for this token
  SELECT share_password_hash INTO v_hash
  FROM chat_reports
  WHERE share_token = p_share_token
    AND status = 'published'
    AND share_password_hash IS NOT NULL;
  
  -- If no report found or no password set, return false
  IF v_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify password using pgcrypto crypt function
  RETURN v_hash = extensions.crypt(p_password, v_hash);
END;
$$;

-- Create function to hash password for storage
CREATE OR REPLACE FUNCTION hash_report_password(p_password TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = extensions
AS $$
  SELECT crypt(p_password, gen_salt('bf', 10));
$$;

-- Create function to get published report by token (for public access)
-- Only returns non-sensitive data, never the password hash
CREATE OR REPLACE FUNCTION get_published_report(p_share_token TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content JSONB,
  zone_name TEXT,
  published_at TIMESTAMPTZ,
  has_password BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    r.id,
    r.title,
    r.content,
    z.name as zone_name,
    r.published_at,
    (r.share_password_hash IS NOT NULL) as has_password
  FROM chat_reports r
  LEFT JOIN zones z ON z.id = r.zone_id
  WHERE r.share_token = p_share_token
    AND r.status = 'published'
    AND r.share_token IS NOT NULL;
$$;

-- Grant execute permissions on functions for authenticated and anon users
-- (anon needed for public report access)
GRANT EXECUTE ON FUNCTION verify_report_password(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION hash_report_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_published_report(TEXT) TO authenticated, anon;

-- Add comment for documentation
COMMENT ON COLUMN chat_reports.share_token IS 'Unique URL-safe token for public sharing (22 chars base64url)';
COMMENT ON COLUMN chat_reports.share_password_hash IS 'Bcrypt hash of share password (via pgcrypto)';
COMMENT ON COLUMN chat_reports.published_at IS 'Timestamp when report was published for sharing';
COMMENT ON FUNCTION verify_report_password IS 'Securely verify password for shared report access';
COMMENT ON FUNCTION hash_report_password IS 'Generate bcrypt hash for report password';
COMMENT ON FUNCTION get_published_report IS 'Get published report data by share token (public access)';

