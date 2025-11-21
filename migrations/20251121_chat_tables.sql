-- Chat System Tables
-- Created: 2025-11-21
-- Purpose: AI-powered chat interface for data analysis and reporting

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_conversations_zone ON chat_conversations(zone_id);
CREATE INDEX idx_chat_conversations_client ON chat_conversations(client_id);
CREATE INDEX idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_updated ON chat_conversations(updated_at DESC);

-- RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Users can only see conversations from their own zones
CREATE POLICY chat_conversations_select ON chat_conversations
  FOR SELECT
  USING (
    zone_id IN (
      SELECT z.id FROM zones z
      INNER JOIN profiles p ON p.client_id = z.client_id
      WHERE p.id = auth.uid()
    )
  );

-- Users can create conversations in their zones
CREATE POLICY chat_conversations_insert ON chat_conversations
  FOR INSERT
  WITH CHECK (
    zone_id IN (
      SELECT z.id FROM zones z
      INNER JOIN profiles p ON p.client_id = z.client_id
      WHERE p.id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can update their own conversations
CREATE POLICY chat_conversations_update ON chat_conversations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own conversations
CREATE POLICY chat_conversations_delete ON chat_conversations
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_conversation_created ON chat_messages(conversation_id, created_at DESC);

-- RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages from conversations they have access to
CREATE POLICY chat_messages_select ON chat_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE zone_id IN (
        SELECT z.id FROM zones z
        INNER JOIN profiles p ON p.client_id = z.client_id
        WHERE p.id = auth.uid()
      )
    )
  );

-- Users can insert messages in their conversations
CREATE POLICY chat_messages_insert ON chat_messages
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- USAGE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  prompt_tokens INT NOT NULL,
  completion_tokens INT NOT NULL,
  total_tokens INT NOT NULL,
  cost_usd NUMERIC(10, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_usage_conversation ON chat_usage(conversation_id);
CREATE INDEX idx_chat_usage_zone ON chat_usage(zone_id);
CREATE INDEX idx_chat_usage_client ON chat_usage(client_id);
CREATE INDEX idx_chat_usage_user ON chat_usage(user_id);
CREATE INDEX idx_chat_usage_created ON chat_usage(created_at DESC);

-- RLS
ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;

-- Super admins can see all usage
CREATE POLICY chat_usage_select_super_admin ON chat_usage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Users can see their own usage
CREATE POLICY chat_usage_select_own ON chat_usage
  FOR SELECT
  USING (user_id = auth.uid());

-- System can insert usage records
CREATE POLICY chat_usage_insert ON chat_usage
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- SAVED REPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  content JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_reports_conversation ON chat_reports(conversation_id);
CREATE INDEX idx_chat_reports_zone ON chat_reports(zone_id);
CREATE INDEX idx_chat_reports_client ON chat_reports(client_id);
CREATE INDEX idx_chat_reports_created_by ON chat_reports(created_by);
CREATE INDEX idx_chat_reports_created ON chat_reports(created_at DESC);

-- RLS
ALTER TABLE chat_reports ENABLE ROW LEVEL SECURITY;

-- Users can see reports from their client's zones
CREATE POLICY chat_reports_select ON chat_reports
  FOR SELECT
  USING (
    zone_id IN (
      SELECT z.id FROM zones z
      INNER JOIN profiles p ON p.client_id = z.client_id
      WHERE p.id = auth.uid()
    )
  );

-- Users can create reports in their zones
CREATE POLICY chat_reports_insert ON chat_reports
  FOR INSERT
  WITH CHECK (
    zone_id IN (
      SELECT z.id FROM zones z
      INNER JOIN profiles p ON p.client_id = z.client_id
      WHERE p.id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Users can update their own reports
CREATE POLICY chat_reports_update ON chat_reports
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete their own reports
CREATE POLICY chat_reports_delete ON chat_reports
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on conversations
CREATE OR REPLACE FUNCTION update_chat_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_conversation_updated_at();

-- Auto-generate conversation title from first message
CREATE OR REPLACE FUNCTION generate_conversation_title()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for first user message in conversation
  IF NEW.role = 'user' AND NOT EXISTS (
    SELECT 1 FROM chat_messages
    WHERE conversation_id = NEW.conversation_id
    AND role = 'user'
    AND id != NEW.id
  ) THEN
    -- Update conversation title with truncated message (max 60 chars)
    UPDATE chat_conversations
    SET title = CASE
      WHEN LENGTH(NEW.content) > 60
      THEN LEFT(NEW.content, 57) || '...'
      ELSE NEW.content
    END
    WHERE id = NEW.conversation_id
    AND title IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_messages_generate_title
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION generate_conversation_title();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE chat_conversations IS 'Chat conversations between users and AI assistant';
COMMENT ON TABLE chat_messages IS 'Individual messages in chat conversations';
COMMENT ON TABLE chat_usage IS 'Token usage and cost tracking for AI API calls';
COMMENT ON TABLE chat_reports IS 'Saved reports generated from chat conversations';

COMMENT ON COLUMN chat_conversations.title IS 'Auto-generated from first message or user-defined';
COMMENT ON COLUMN chat_messages.role IS 'Message role: user, assistant, system, or tool';
COMMENT ON COLUMN chat_messages.tool_calls IS 'Function calls made by the assistant (JSON)';
COMMENT ON COLUMN chat_messages.tool_results IS 'Results from tool executions (JSON)';
COMMENT ON COLUMN chat_usage.cost_usd IS 'Calculated cost based on token usage and model pricing';
COMMENT ON COLUMN chat_reports.content IS 'Report content in structured JSON format (markdown + data)';

