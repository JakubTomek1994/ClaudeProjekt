import { createClient } from "@/lib/supabase/client";
import { PHASE_MAP } from "@/lib/constants";
import type { Phase } from "@/lib/supabase/types";

const supabase = createClient();

export async function createPhaseChangeEntry(
  projectId: string,
  nodeId: string,
  nodeLabel: string,
  fromPhase: Phase,
  toPhase: Phase,
  fromLabel?: string,
  toLabel?: string
) {
  const resolvedFromLabel = fromLabel ?? PHASE_MAP.get(fromPhase)?.label ?? fromPhase;
  const resolvedToLabel = toLabel ?? PHASE_MAP.get(toPhase)?.label ?? toPhase;

  return supabase.from("diary_entries").insert({
    project_id: projectId,
    node_id: nodeId,
    entry_type: "phase_change" as const,
    content: `Uzel "${nodeLabel}" přesunut z fáze "${resolvedFromLabel}" do "${resolvedToLabel}"`,
  });
}

export async function createNodeCreatedEntry(
  projectId: string,
  nodeId: string,
  nodeLabel: string,
  phase: Phase,
  phaseLabel?: string
) {
  const resolvedLabel = phaseLabel ?? PHASE_MAP.get(phase)?.label ?? phase;

  return supabase.from("diary_entries").insert({
    project_id: projectId,
    node_id: nodeId,
    entry_type: "node_created" as const,
    content: `Vytvořen uzel "${nodeLabel}" ve fázi "${resolvedLabel}"`,
  });
}
