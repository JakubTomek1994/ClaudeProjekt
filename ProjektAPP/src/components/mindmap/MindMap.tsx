"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type OnNodesChange,
  type NodeChange,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { createClient } from "@/lib/supabase/client";
import { PHASES, PHASE_COLUMN_WIDTH, PHASE_MAP } from "@/lib/constants";
import { MapNodeType, type MapNodeData } from "./MapNode";
import { AddNodeDialog } from "./AddNodeDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { MapNode, NodeEdge, Phase } from "@/lib/supabase/types";

const nodeTypes = { mapNode: MapNodeType };

interface MindMapProps {
  projectId: string;
  onNodeSelect?: (nodeId: string | null) => void;
}

export function MindMap({ projectId, onNodeSelect }: MindMapProps) {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([] as Edge[]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [defaultPhase, setDefaultPhase] = useState<Phase>("idea");
  const [diaryCounts, setDiaryCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Load nodes and edges from DB
  const loadData = useCallback(async () => {
    const [nodesResult, edgesResult, diaryResult] = await Promise.all([
      supabase.from("map_nodes").select("*").eq("project_id", projectId),
      supabase.from("node_edges").select("*").eq("project_id", projectId),
      supabase
        .from("diary_entries")
        .select("node_id")
        .eq("project_id", projectId)
        .not("node_id", "is", null),
    ]);

    if (nodesResult.error) {
      toast.error("Nepodařilo se načíst uzly");
      return;
    }

    // Count diary entries per node
    const counts: Record<string, number> = {};
    if (diaryResult.data) {
      for (const entry of diaryResult.data) {
        if (entry.node_id) {
          counts[entry.node_id] = (counts[entry.node_id] || 0) + 1;
        }
      }
    }
    setDiaryCounts(counts);

    const dbNodes = nodesResult.data as MapNode[];
    const rfNodes: Node[] = dbNodes.map((n) => ({
      id: n.id,
      type: "mapNode",
      position: { x: n.position_x, y: n.position_y },
      data: {
        label: n.label,
        description: n.description,
        phase: n.phase,
        diaryCount: counts[n.id] || 0,
        dbId: n.id,
      } satisfies MapNodeData,
    }));

    setNodes(rfNodes);

    if (edgesResult.data) {
      const dbEdges = edgesResult.data as NodeEdge[];
      const rfEdges: Edge[] = dbEdges.map((e) => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        animated: true,
      }));
      setEdges(rfEdges);
    }

    setIsLoading(false);
  }, [projectId, supabase, setNodes, setEdges]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle new connections
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const { data, error } = await supabase.from("node_edges").insert({
        project_id: projectId,
        source_node_id: connection.source,
        target_node_id: connection.target,
      }).select().single();

      if (error) {
        toast.error("Nepodařilo se vytvořit spojení");
        return;
      }

      setEdges((eds) =>
        addEdge(
          { ...connection, id: data.id, animated: true },
          eds
        )
      );
    },
    [projectId, supabase, setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const data = node.data as unknown as MapNodeData;
      onNodeSelect?.(data.dbId);
    },
    [onNodeSelect]
  );

  // Detect which phase a node belongs to based on its x position
  const getPhaseFromPosition = useCallback((x: number): Phase => {
    const columnWidth = PHASE_COLUMN_WIDTH + 70;
    const index = Math.max(0, Math.min(PHASES.length - 1, Math.round(x / columnWidth)));
    return PHASES[index].id;
  }, []);

  // Handle node position changes (drag)
  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeBase(changes);

      // Save position changes to DB and detect phase changes
      for (const change of changes) {
        if (change.type === "position" && change.position && !change.dragging) {
          const node = nodes.find((n) => n.id === change.id);
          if (!node) continue;

          const nodeData = node.data as unknown as MapNodeData;
          const newPhase = getPhaseFromPosition(change.position.x);
          const oldPhase = nodeData.phase;

          // Save position
          supabase
            .from("map_nodes")
            .update({
              position_x: change.position.x,
              position_y: change.position.y,
              ...(newPhase !== oldPhase ? { phase: newPhase } : {}),
            })
            .eq("id", change.id)
            .then(({ error }) => {
              if (error) toast.error("Nepodařilo se uložit pozici");
            });

          // If phase changed, update node data and create diary entry
          if (newPhase !== oldPhase) {
            setNodes((nds) =>
              nds.map((n) =>
                n.id === change.id
                  ? {
                      ...n,
                      data: { ...n.data, phase: newPhase } as unknown as Record<string, unknown>,
                    }
                  : n
              )
            );

            supabase.from("diary_entries").insert({
              project_id: projectId,
              node_id: change.id,
              entry_type: "phase_change",
              content: `Uzel "${nodeData.label}" přesunut z fáze "${PHASE_MAP.get(oldPhase)?.label}" do "${PHASE_MAP.get(newPhase)?.label}"`,
            });

            toast.success(`Fáze změněna: ${PHASE_MAP.get(newPhase)?.label}`);
          }
        }
      }
    },
    [onNodesChangeBase, supabase, nodes, getPhaseFromPosition, projectId, setNodes]
  );

  // Add new node
  const handleAddNode = useCallback(
    async (label: string, description: string, phase: Phase) => {
      const phaseIndex = PHASES.findIndex((p) => p.id === phase);
      const nodesInPhase = nodes.filter(
        (n) => (n.data as unknown as MapNodeData).phase === phase
      );

      const position = {
        x: phaseIndex * (PHASE_COLUMN_WIDTH + 70) + 20,
        y: nodesInPhase.length * 120 + 50,
      };

      const { data, error } = await supabase
        .from("map_nodes")
        .insert({
          project_id: projectId,
          label,
          description: description || null,
          phase,
          position_x: position.x,
          position_y: position.y,
        })
        .select()
        .single();

      if (error) {
        toast.error("Nepodařilo se přidat uzel");
        return;
      }

      const newNode: Node = {
        id: data.id,
        type: "mapNode",
        position,
        data: {
          label,
          description: description || null,
          phase,
          diaryCount: 0,
          dbId: data.id,
        } satisfies MapNodeData,
      };

      setNodes((nds) => [...nds, newNode]);

      // Create diary entry for node creation
      await supabase.from("diary_entries").insert({
        project_id: projectId,
        node_id: data.id,
        entry_type: "node_created",
        content: `Vytvořen uzel "${label}" ve fázi "${PHASE_MAP.get(phase)?.label}"`,
      });

      toast.success("Uzel přidán");
    },
    [nodes, projectId, supabase, setNodes]
  );

  // Delete node
  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      const { error } = await supabase
        .from("map_nodes")
        .delete()
        .eq("id", nodeId);

      if (error) {
        toast.error("Nepodařilo se smazat uzel");
        return;
      }

      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
      onNodeSelect?.(null);
      toast.success("Uzel smazán");
    },
    [supabase, setNodes, setEdges, onNodeSelect]
  );

  // Background phase columns
  const phaseBackgrounds = useMemo(
    () =>
      PHASES.map((phase, i) => ({
        phase,
        x: i * (PHASE_COLUMN_WIDTH + 70),
      })),
    []
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Nacitani mapy...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Phase header bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex gap-0 border-b bg-background/80 px-2 py-1 backdrop-blur-sm">
        {PHASES.map((phase) => (
          <button
            key={phase.id}
            onClick={() => {
              setDefaultPhase(phase.id);
              setIsAddDialogOpen(true);
            }}
            className={`flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors ${phase.bgColor} ${phase.color} hover:opacity-80`}
            style={{ minWidth: PHASE_COLUMN_WIDTH + 70 }}
          >
            <PlusIcon className="h-3 w-3" />
            {phase.label}
          </button>
        ))}
      </div>

      <div className="h-full pt-8">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          className="bg-gray-50"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as unknown as MapNodeData;
              const phase = PHASE_MAP.get(data.phase);
              return phase?.bgColor ?? "#e5e7eb";
            }}
            zoomable
            pannable
          />
        </ReactFlow>
      </div>

      {/* Floating add button */}
      <div className="absolute bottom-4 right-4 z-10">
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Pridat uzel
        </Button>
      </div>

      <AddNodeDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddNode}
        defaultPhase={defaultPhase}
      />
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  );
}
