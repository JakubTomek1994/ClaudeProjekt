CREATE TABLE subtasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id uuid NOT NULL REFERENCES map_nodes(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subtasks_node ON subtasks(node_id);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subtasks" ON subtasks FOR ALL
  USING (node_id IN (SELECT mn.id FROM map_nodes mn JOIN projects p ON mn.project_id = p.id WHERE p.user_id = auth.uid()))
  WITH CHECK (node_id IN (SELECT mn.id FROM map_nodes mn JOIN projects p ON mn.project_id = p.id WHERE p.user_id = auth.uid()));
