ALTER TABLE map_nodes ADD COLUMN deadline date;
CREATE INDEX idx_map_nodes_deadline ON map_nodes(deadline) WHERE deadline IS NOT NULL;
