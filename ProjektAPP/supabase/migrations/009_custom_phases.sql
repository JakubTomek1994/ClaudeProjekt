-- Custom phases per project
CREATE TABLE IF NOT EXISTS project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'text-gray-700',
  bg_color TEXT NOT NULL DEFAULT 'bg-gray-50',
  border_color TEXT NOT NULL DEFAULT 'border-gray-200',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON project_phases(project_id);

-- RLS policies
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view phases of their projects"
  ON project_phases FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert phases for their projects"
  ON project_phases FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update phases of their projects"
  ON project_phases FOR UPDATE
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete phases of their projects"
  ON project_phases FOR DELETE
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Drop the CHECK constraint on map_nodes.phase so custom phase strings are allowed
-- The column will store the phase name as a free-text string
ALTER TABLE map_nodes ALTER COLUMN phase TYPE TEXT;

-- Seed default phases for all existing projects
INSERT INTO project_phases (project_id, name, color, bg_color, border_color, sort_order)
SELECT p.id, phase.name, phase.color, phase.bg_color, phase.border_color, phase.sort_order
FROM projects p
CROSS JOIN (VALUES
  ('Nápad', 'text-amber-700', 'bg-amber-50', 'border-amber-200', 0),
  ('Průzkum', 'text-blue-700', 'bg-blue-50', 'border-blue-200', 1),
  ('Návrh', 'text-purple-700', 'bg-purple-50', 'border-purple-200', 2),
  ('Prototyp', 'text-emerald-700', 'bg-emerald-50', 'border-emerald-200', 3),
  ('Testování', 'text-orange-700', 'bg-orange-50', 'border-orange-200', 4),
  ('Výroba', 'text-red-700', 'bg-red-50', 'border-red-200', 5),
  ('Hotovo', 'text-green-700', 'bg-green-50', 'border-green-200', 6)
) AS phase(name, color, bg_color, border_color, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM project_phases pp WHERE pp.project_id = p.id
);
