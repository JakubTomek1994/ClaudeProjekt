ALTER TABLE map_nodes
  ADD COLUMN status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'done')),
  ADD COLUMN priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high'));
