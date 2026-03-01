-- Drop the CHECK constraint on map_nodes.phase so custom phase strings are allowed
-- Migration 009 only changed the column type but didn't drop the constraint
ALTER TABLE map_nodes DROP CONSTRAINT IF EXISTS map_nodes_phase_check;
