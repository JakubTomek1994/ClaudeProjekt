-- Poznámky ke krokům
ALTER TABLE subtasks ADD COLUMN notes text DEFAULT '';

-- Přílohy ke krokům
CREATE TABLE subtask_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subtask_id uuid NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subtask_attachments_subtask ON subtask_attachments(subtask_id);
ALTER TABLE subtask_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subtask attachments" ON subtask_attachments FOR ALL
  USING (subtask_id IN (
    SELECT s.id FROM subtasks s
    JOIN map_nodes mn ON s.node_id = mn.id
    JOIN projects p ON mn.project_id = p.id
    WHERE p.user_id = auth.uid()
  ))
  WITH CHECK (subtask_id IN (
    SELECT s.id FROM subtasks s
    JOIN map_nodes mn ON s.node_id = mn.id
    JOIN projects p ON mn.project_id = p.id
    WHERE p.user_id = auth.uid()
  ));
