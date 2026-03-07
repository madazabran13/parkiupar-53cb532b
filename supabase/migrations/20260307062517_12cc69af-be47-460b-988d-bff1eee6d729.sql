
-- Fix available_spaces to match actual active sessions
UPDATE tenants 
SET available_spaces = total_spaces - (
  SELECT COUNT(*) FROM parking_sessions 
  WHERE parking_sessions.tenant_id = tenants.id AND status = 'active'
);

-- Change default value of available_spaces to match total_spaces default
ALTER TABLE tenants ALTER COLUMN available_spaces SET DEFAULT 20;
