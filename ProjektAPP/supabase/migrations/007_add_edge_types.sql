-- Add edge_type column with default 'relates_to' for existing rows
ALTER TABLE node_edges
  ADD COLUMN edge_type text NOT NULL DEFAULT 'relates_to';

-- Constrain to allowed values
ALTER TABLE node_edges
  ADD CONSTRAINT node_edges_edge_type_check
  CHECK (edge_type IN ('blocks', 'relates_to', 'is_part_of'));
