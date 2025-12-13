-- ============================================================================
-- REPORTS ENHANCEMENTS
-- Add status, updated_at, and improve indexes for the reports feature
-- ============================================================================

-- Add status column for draft/published workflow
ALTER TABLE chat_reports 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
CHECK (status IN ('draft', 'published'));

-- Add updated_at column for auto-save tracking
ALTER TABLE chat_reports 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_chat_reports_status ON chat_reports(status);

-- Add composite index for listing reports (client + status + date)
CREATE INDEX IF NOT EXISTS idx_chat_reports_client_status_date 
ON chat_reports(client_id, status, created_at DESC);

-- Add composite index for zone-based listing
CREATE INDEX IF NOT EXISTS idx_chat_reports_zone_date 
ON chat_reports(zone_id, created_at DESC);

-- ============================================================================
-- AUTO-UPDATE TRIGGER FOR updated_at
-- ============================================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_chat_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS trigger_update_chat_report_updated_at ON chat_reports;

CREATE TRIGGER trigger_update_chat_report_updated_at
  BEFORE UPDATE ON chat_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_report_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN chat_reports.status IS 'Report status: draft (work in progress) or published (finalized)';
COMMENT ON COLUMN chat_reports.updated_at IS 'Last modification timestamp, auto-updated on each change';

