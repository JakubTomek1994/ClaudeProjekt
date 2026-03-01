CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE node_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id uuid NOT NULL REFERENCES map_nodes(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(node_id, tag_id)
);

CREATE INDEX idx_tags_project ON tags(project_id);
CREATE INDEX idx_node_tags_node ON node_tags(node_id);
CREATE INDEX idx_node_tags_tag ON node_tags(tag_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tags" ON tags FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own node_tags" ON node_tags FOR ALL
  USING (node_id IN (SELECT mn.id FROM map_nodes mn JOIN projects p ON mn.project_id = p.id WHERE p.user_id = auth.uid()))
  WITH CHECK (node_id IN (SELECT mn.id FROM map_nodes mn JOIN projects p ON mn.project_id = p.id WHERE p.user_id = auth.uid()));
