"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type OnNodesChange,
  type NodeChange,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { createClient } from "@/lib/supabase/client";
import { PHASES, PHASE_COLUMN_WIDTH, PHASE_MAP, TASK_STATUSES, PRIORITIES, EDGE_TYPE_MAP } from "@/lib/constants";
import { MapNodeType, type MapNodeData } from "./MapNode";
import { CustomEdge, EdgeMarkerDefs, type CustomEdgeData } from "./CustomEdge";
import { AddNodeDialog } from "./AddNodeDialog";
import { EdgeTypeDialog } from "./EdgeTypeDialog";
import { SearchFilterBar, DEFAULT_FILTERS, type FilterState, type SelectedNodeInfo } from "./SearchFilterBar";
import { Button } from "@/components/ui/button";
import { getDeadlineStatus } from "@/lib/constants";
import { toast } from "sonner";
import type { MapNode, NodeEdge, Phase, TaskStatus, Priority, EdgeType, Tag, NodeTag } from "@/lib/supabase/types";

const nodeTypes = { mapNode: MapNodeType };
const edgeTypes = { custom: CustomEdge };

interface MindMapProps {
  projectId: string;
  onNodeSelect?: (nodeId: string | null) => void;
  refreshKey?: number;
  allTags?: Tag[];
}

export function MindMap(props: MindMapProps) {
  return (
    <ReactFlowProvider>
      <MindMapInner {...props} />
    </ReactFlowProvider>
  );
}

function MindMapInner({ projectId, onNodeSelect, refreshKey, allTags = [] }: MindMapProps) {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([] as Edge[]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [defaultPhase, setDefaultPhase] = useState<Phase>("idea");
  const [diaryCounts, setDiaryCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [draggingNodeIds, setDraggingNodeIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [nodeTagMap, setNodeTagMap] = useState<Map<string, string[]>>(new Map());
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [isEdgeTypeDialogOpen, setIsEdgeTypeDialogOpen] = useState(false);
  const [dbEdges, setDbEdges] = useState<NodeEdge[]>([]);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const supabase = createClient();
  const { fitView } = useReactFlow();

  // Stable callback refs — breaks infinite loadData dependency loop
  const changePhaseRef = useRef<(nodeId: string, newPhase: Phase) => void>(() => {});
  const cycleStatusRef = useRef<(nodeId: string) => void>(() => {});
  const cyclePriorityRef = useRef<(nodeId: string) => void>(() => {});
  const updateLabelRef = useRef<(nodeId: string, newLabel: string) => void>(() => {});
  const duplicateNodeRef = useRef<(nodeId: string) => void>(() => {});
  const deleteEdgeRef = useRef<(edgeId: string) => void>(() => {});

  // Change node phase
  const handleChangePhase = useCallback(
    async (nodeId: string, newPhase: Phase) => {
      const { error } = await supabase
        .from("map_nodes")
        .update({ phase: newPhase })
        .eq("id", nodeId);

      if (error) {
        toast.error("Nepodařilo se změnit fázi");
        return;
      }

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const oldData = n.data as unknown as MapNodeData;
          return {
            ...n,
            data: {
              ...oldData,
              phase: newPhase,
            } satisfies MapNodeData,
          };
        })
      );

      const phaseLabel = PHASE_MAP.get(newPhase)?.label ?? newPhase;
      toast.success(`Fáze změněna na "${phaseLabel}"`);

      // Create diary entry for phase change
      await supabase.from("diary_entries").insert({
        project_id: projectId,
        node_id: nodeId,
        entry_type: "phase_change",
        content: `Fáze uzlu změněna na "${phaseLabel}"`,
      });
    },
    [supabase, setNodes, projectId]
  );

  // Cycle node status: open → in_progress → done → open (with dependency check)
  const handleCycleStatus = useCallback(
    async (nodeId: string) => {
      // Check if node is blocked by unfinished dependencies
      const blockingEdges = dbEdges.filter(
        (e) => e.edge_type === "blocks" && e.target_node_id === nodeId
      );

      if (blockingEdges.length > 0) {
        // Find which source nodes are not done
        const undoneBlockers: string[] = [];
        const currentNodes = nodes;
        for (const be of blockingEdges) {
          const sourceNode = currentNodes.find((n) => n.id === be.source_node_id);
          if (sourceNode) {
            const sd = sourceNode.data as unknown as MapNodeData;
            if (sd.status !== "done") {
              undoneBlockers.push(sd.label);
            }
          }
        }

        // Only check the next status — allow going back to "open"
        let peekNextStatus: TaskStatus = "open";
        const currentNode = currentNodes.find((n) => n.id === nodeId);
        if (currentNode) {
          const cd = currentNode.data as unknown as MapNodeData;
          const currentIndex = TASK_STATUSES.findIndex((s) => s.id === cd.status);
          peekNextStatus = TASK_STATUSES[(currentIndex + 1) % TASK_STATUSES.length].id;
        }

        if (undoneBlockers.length > 0 && peekNextStatus !== "open") {
          toast.error(
            `Uzel je blokován: ${undoneBlockers.join(", ")} ${undoneBlockers.length === 1 ? "musí být hotový" : "musí být hotové"}`,
          );
          return;
        }
      }

      const statusRef: { value: TaskStatus } = { value: "open" };

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const d = n.data as unknown as MapNodeData;
          const currentIndex = TASK_STATUSES.findIndex((s) => s.id === d.status);
          statusRef.value = TASK_STATUSES[(currentIndex + 1) % TASK_STATUSES.length].id;
          return { ...n, data: { ...d, status: statusRef.value } satisfies MapNodeData };
        })
      );

      const nextStatus = statusRef.value;

      const { error } = await supabase
        .from("map_nodes")
        .update({ status: nextStatus })
        .eq("id", nodeId);

      if (error) {
        toast.error("Nepodařilo se změnit stav");
        return;
      }

      // Update edge visuals where this node is source or target
      setEdges((eds) =>
        eds.map((e) => {
          const ed = e.data as unknown as CustomEdgeData | undefined;
          if (!ed) return e;
          if (e.source === nodeId) {
            return { ...e, data: { ...ed, sourceStatus: nextStatus } };
          }
          if (e.target === nodeId) {
            return { ...e, data: { ...ed, targetStatus: nextStatus } };
          }
          return e;
        })
      );

      // Recompute blocked state for target nodes of "blocks" edges from this node
      if (nextStatus === "done") {
        setNodes((nds) =>
          nds.map((n) => {
            const d = n.data as unknown as MapNodeData;
            if (!d.isBlocked) return n;
            // Re-check if still blocked
            const stillBlocked = dbEdges
              .filter((be) => be.edge_type === "blocks" && be.target_node_id === n.id)
              .some((be) => {
                if (be.source_node_id === nodeId) return false; // just became done
                const src = nds.find((s) => s.id === be.source_node_id);
                return src ? (src.data as unknown as MapNodeData).status !== "done" : false;
              });
            if (stillBlocked) return n;
            return { ...n, data: { ...d, isBlocked: false, blockedByCount: 0 } satisfies MapNodeData };
          })
        );
      }
    },
    [supabase, setNodes, setEdges, dbEdges, nodes]
  );

  // Update node label
  const handleUpdateLabel = useCallback(
    async (nodeId: string, newLabel: string) => {
      const { error } = await supabase
        .from("map_nodes")
        .update({ label: newLabel })
        .eq("id", nodeId);

      if (error) {
        toast.error("Nepodařilo se přejmenovat uzel");
        return;
      }

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const d = n.data as unknown as MapNodeData;
          return { ...n, data: { ...d, label: newLabel } satisfies MapNodeData };
        })
      );

      toast.success("Uzel přejmenován");

      await supabase.from("diary_entries").insert({
        project_id: projectId,
        node_id: nodeId,
        entry_type: "node_updated",
        content: `Uzel přejmenován na "${newLabel}"`,
      });
    },
    [supabase, setNodes, projectId]
  );

  // Cycle node priority: low → medium → high → low
  const handleCyclePriority = useCallback(
    async (nodeId: string) => {
      let nextPriority: Priority = "medium";

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const d = n.data as unknown as MapNodeData;
          const currentIndex = PRIORITIES.findIndex((p) => p.id === d.priority);
          nextPriority = PRIORITIES[(currentIndex + 1) % PRIORITIES.length].id;
          return { ...n, data: { ...d, priority: nextPriority } satisfies MapNodeData };
        })
      );

      const { error } = await supabase
        .from("map_nodes")
        .update({ priority: nextPriority })
        .eq("id", nodeId);

      if (error) {
        toast.error("Nepodařilo se změnit prioritu");
      }
    },
    [supabase, setNodes]
  );

  // Direct status setter (for toolbar dropdown)
  const handleSetStatus = useCallback(
    async (nodeId: string, newStatus: TaskStatus) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const d = n.data as unknown as MapNodeData;
          return { ...n, data: { ...d, status: newStatus } satisfies MapNodeData };
        })
      );

      const { error } = await supabase
        .from("map_nodes")
        .update({ status: newStatus })
        .eq("id", nodeId);

      if (error) {
        toast.error("Nepodařilo se změnit stav");
        return;
      }

      // Update edge visuals
      setEdges((eds) =>
        eds.map((e) => {
          const ed = e.data as unknown as CustomEdgeData | undefined;
          if (!ed) return e;
          if (e.source === nodeId) return { ...e, data: { ...ed, sourceStatus: newStatus } };
          if (e.target === nodeId) return { ...e, data: { ...ed, targetStatus: newStatus } };
          return e;
        })
      );
    },
    [supabase, setNodes, setEdges]
  );

  // Direct priority setter (for toolbar dropdown)
  const handleSetPriority = useCallback(
    async (nodeId: string, newPriority: Priority) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const d = n.data as unknown as MapNodeData;
          return { ...n, data: { ...d, priority: newPriority } satisfies MapNodeData };
        })
      );

      const { error } = await supabase
        .from("map_nodes")
        .update({ priority: newPriority })
        .eq("id", nodeId);

      if (error) {
        toast.error("Nepodařilo se změnit prioritu");
      }
    },
    [supabase, setNodes]
  );

  // Duplicate node
  const handleDuplicateNode = useCallback(
    async (nodeId: string) => {
      const sourceNode = nodes.find((n) => n.id === nodeId);
      if (!sourceNode) return;
      const sourceData = sourceNode.data as unknown as MapNodeData;

      const { data, error } = await supabase
        .from("map_nodes")
        .insert({
          project_id: projectId,
          label: `${sourceData.label} (kopie)`,
          description: sourceData.description,
          phase: sourceData.phase,
          status: sourceData.status,
          priority: sourceData.priority,
          deadline: sourceData.deadline,
          position_x: sourceNode.position.x,
          position_y: sourceNode.position.y + 120,
        })
        .select()
        .single();

      if (error) {
        toast.error("Nepodařilo se duplikovat uzel");
        return;
      }

      // Copy tags
      const nodeTagIds = nodeTagMap.get(nodeId);
      if (nodeTagIds && nodeTagIds.length > 0) {
        const tagInserts = nodeTagIds.map((tagId) => ({
          node_id: data.id,
          tag_id: tagId,
        }));
        await supabase.from("node_tags").insert(tagInserts);
      }

      const newNode: Node = {
        id: data.id,
        type: "mapNode",
        position: { x: sourceNode.position.x, y: sourceNode.position.y + 120 },
        data: {
          label: `${sourceData.label} (kopie)`,
          description: sourceData.description,
          phase: sourceData.phase,
          status: sourceData.status,
          priority: sourceData.priority,
          deadline: sourceData.deadline,
          tags: [...sourceData.tags],
          diaryCount: 0,
          subtaskProgress: null,
          isBlocked: false,
          blockedByCount: 0,
          dbId: data.id,
          onChangePhase: (id: string, p: Phase) => changePhaseRef.current(id, p),
          onCycleStatus: (id: string) => cycleStatusRef.current(id),
          onCyclePriority: (id: string) => cyclePriorityRef.current(id),
          onUpdateLabel: (id: string, l: string) => updateLabelRef.current(id, l),
          onDuplicate: (id: string) => duplicateNodeRef.current(id),
        } satisfies MapNodeData,
      };

      setNodes((nds) => [...nds, newNode]);

      await supabase.from("diary_entries").insert({
        project_id: projectId,
        node_id: data.id,
        entry_type: "node_created",
        content: `Vytvořen uzel "${sourceData.label} (kopie)" duplikací`,
      });

      toast.success("Uzel duplikován");
    },
    [nodes, projectId, supabase, setNodes, nodeTagMap]
  );

  // Delete an edge
  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      const { error } = await supabase
        .from("node_edges")
        .delete()
        .eq("id", edgeId);

      if (error) {
        toast.error("Nepodařilo se smazat propojení");
        return;
      }

      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      setDbEdges((prev) => prev.filter((e) => e.id !== edgeId));
      toast.success("Propojení smazáno");
    },
    [supabase, setEdges]
  );

  // Keep refs in sync with latest callbacks
  changePhaseRef.current = handleChangePhase;
  cycleStatusRef.current = handleCycleStatus;
  cyclePriorityRef.current = handleCyclePriority;
  updateLabelRef.current = handleUpdateLabel;
  duplicateNodeRef.current = handleDuplicateNode;
  deleteEdgeRef.current = handleDeleteEdge;

  // Load nodes and edges from DB
  const loadData = useCallback(async () => {
    const [nodesResult, edgesResult, diaryResult, nodeTagsResult, subtasksResult] = await Promise.all([
      supabase.from("map_nodes").select("*").eq("project_id", projectId),
      supabase.from("node_edges").select("*").eq("project_id", projectId),
      supabase
        .from("diary_entries")
        .select("node_id")
        .eq("project_id", projectId)
        .not("node_id", "is", null),
      supabase.from("node_tags").select("*"),
      supabase.from("subtasks").select("node_id, is_done"),
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

    // Build nodeId → Tag[] map and nodeId → tagId[] map
    const tagMap = new Map<string, Array<{ name: string; color: string }>>();
    const nodeTagIdMap = new Map<string, string[]>();
    if (nodeTagsResult.data) {
      const allTagMap = new Map(allTags.map((t) => [t.id, t]));
      for (const nt of nodeTagsResult.data as NodeTag[]) {
        const tag = allTagMap.get(nt.tag_id);
        if (tag) {
          const existing = tagMap.get(nt.node_id) || [];
          existing.push({ name: tag.name, color: tag.color });
          tagMap.set(nt.node_id, existing);
        }
        const ids = nodeTagIdMap.get(nt.node_id) || [];
        ids.push(nt.tag_id);
        nodeTagIdMap.set(nt.node_id, ids);
      }
    }
    setNodeTagMap(nodeTagIdMap);

    // Build subtask progress per node
    const subtaskProgressMap = new Map<string, { done: number; total: number }>();
    if (subtasksResult?.data) {
      for (const st of subtasksResult.data) {
        const existing = subtaskProgressMap.get(st.node_id) || { done: 0, total: 0 };
        existing.total++;
        if (st.is_done) existing.done++;
        subtaskProgressMap.set(st.node_id, existing);
      }
    }

    const dbNodes = nodesResult.data as MapNode[];
    const rfNodes: Node[] = dbNodes.map((n) => ({
      id: n.id,
      type: "mapNode",
      position: { x: n.position_x, y: n.position_y },
      data: {
        label: n.label,
        description: n.description,
        phase: n.phase,
        status: n.status,
        priority: n.priority,
        deadline: n.deadline,
        tags: tagMap.get(n.id) || [],
        diaryCount: counts[n.id] || 0,
        subtaskProgress: subtaskProgressMap.get(n.id) || null,
        dbId: n.id,
        onChangePhase: (id: string, p: Phase) => changePhaseRef.current(id, p),
        onCycleStatus: (id: string) => cycleStatusRef.current(id),
        onCyclePriority: (id: string) => cyclePriorityRef.current(id),
        onUpdateLabel: (id: string, l: string) => updateLabelRef.current(id, l),
        onDuplicate: (id: string) => duplicateNodeRef.current(id),
      } satisfies MapNodeData,
    }));

    // Build a status map for edge rendering
    const statusMap = new Map<string, string>();
    for (const n of dbNodes) {
      statusMap.set(n.id, n.status);
    }

    // Compute blocked state for each node
    const loadedDbEdges = (edgesResult.data ?? []) as NodeEdge[];
    setDbEdges(loadedDbEdges);

    const blockedMap = new Map<string, number>();
    for (const e of loadedDbEdges) {
      if (e.edge_type === "blocks") {
        const sourceStatus = statusMap.get(e.source_node_id);
        if (sourceStatus !== "done") {
          blockedMap.set(e.target_node_id, (blockedMap.get(e.target_node_id) || 0) + 1);
        }
      }
    }

    // Inject blocked state into node data
    const finalNodes: Node[] = rfNodes.map((n) => {
      const blockedByCount = blockedMap.get(n.id) || 0;
      if (blockedByCount === 0) return n;
      const d = n.data as unknown as MapNodeData;
      return {
        ...n,
        data: { ...d, isBlocked: true, blockedByCount } satisfies MapNodeData,
      };
    });

    setNodes(finalNodes);

    if (loadedDbEdges.length > 0) {
      const rfEdges: Edge[] = loadedDbEdges.map((e) => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        type: "custom",
        data: {
          edgeType: e.edge_type,
          sourceStatus: statusMap.get(e.source_node_id) ?? "open",
          targetStatus: statusMap.get(e.target_node_id) ?? "open",
          onDelete: (id: string) => deleteEdgeRef.current(id),
        } satisfies CustomEdgeData,
      }));
      setEdges(rfEdges);
    }

    setIsLoading(false);
  }, [projectId, supabase, setNodes, setEdges, allTags]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload nodes when external data changes (e.g. status/priority changed from DiaryPanel)
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      loadData();
    }
  }, [refreshKey]);

  // Handle new connections — show edge type dialog first
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      setPendingConnection(connection);
      setIsEdgeTypeDialogOpen(true);
    },
    []
  );

  // Actually create the edge after type is selected
  const handleEdgeTypeSelected = useCallback(
    async (edgeType: EdgeType) => {
      setIsEdgeTypeDialogOpen(false);
      if (!pendingConnection?.source || !pendingConnection?.target) return;

      // Try with edge_type first, fallback without it if column doesn't exist
      let insertResult = await supabase.from("node_edges").insert({
        project_id: projectId,
        source_node_id: pendingConnection.source,
        target_node_id: pendingConnection.target,
        edge_type: edgeType,
      }).select().single();

      // Fallback: if edge_type column doesn't exist (migration 007 not applied)
      if (insertResult.error && insertResult.error.message?.includes("edge_type")) {
        console.warn("edge_type column missing — inserting without it. Run migration 007_add_edge_types.sql.");
        insertResult = await supabase.from("node_edges").insert({
          project_id: projectId,
          source_node_id: pendingConnection.source,
          target_node_id: pendingConnection.target,
        }).select().single();
      }

      const { data, error } = insertResult;

      if (error) {
        console.error("Edge creation error:", error);
        toast.error(`Nepodařilo se vytvořit spojení: ${error.message}`);
        setPendingConnection(null);
        return;
      }

      const newDbEdge = data as NodeEdge;
      setDbEdges((prev) => [...prev, newDbEdge]);

      // Get source/target status for edge rendering
      const sourceNode = nodes.find((n) => n.id === pendingConnection.source);
      const targetNode = nodes.find((n) => n.id === pendingConnection.target);
      const sourceStatus = sourceNode ? (sourceNode.data as unknown as MapNodeData).status : "open";
      const targetStatus = targetNode ? (targetNode.data as unknown as MapNodeData).status : "open";

      const newEdge: Edge = {
        id: data.id,
        source: pendingConnection.source,
        target: pendingConnection.target,
        type: "custom",
        data: {
          edgeType,
          sourceStatus,
          targetStatus,
          onDelete: handleDeleteEdge,
        } satisfies CustomEdgeData,
      };

      setEdges((eds) => addEdge(newEdge, eds));

      // If "blocks" edge, check if target becomes blocked and update node data
      if (edgeType === "blocks" && sourceStatus !== "done") {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== pendingConnection.target) return n;
            const d = n.data as unknown as MapNodeData;
            return {
              ...n,
              data: {
                ...d,
                isBlocked: true,
                blockedByCount: (d.blockedByCount || 0) + 1,
              } satisfies MapNodeData,
            };
          })
        );
      }

      // Get label info for diary
      const edgeLabel = EDGE_TYPE_MAP.get(edgeType)?.label ?? edgeType;
      const sourceLabel = sourceNode ? (sourceNode.data as unknown as MapNodeData).label : "?";
      const targetLabel = targetNode ? (targetNode.data as unknown as MapNodeData).label : "?";

      // Create diary entries for both nodes
      await Promise.all([
        supabase.from("diary_entries").insert({
          project_id: projectId,
          node_id: pendingConnection.source,
          entry_type: "node_updated",
          content: `Propojení vytvořeno: "${sourceLabel}" ${edgeLabel.toLowerCase()} "${targetLabel}"`,
        }),
        supabase.from("diary_entries").insert({
          project_id: projectId,
          node_id: pendingConnection.target,
          entry_type: "node_updated",
          content: `Propojení vytvořeno: "${sourceLabel}" ${edgeLabel.toLowerCase()} "${targetLabel}"`,
        }),
      ]);

      toast.success(`Propojení vytvořeno: ${edgeLabel}`);
      setPendingConnection(null);
    },
    [pendingConnection, projectId, supabase, setEdges, setNodes, nodes, handleDeleteEdge]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const data = node.data as unknown as MapNodeData;
      setInternalSelectedId(data.dbId);
      onNodeSelect?.(data.dbId);
    },
    [onNodeSelect]
  );

  // Clear selection on pane click
  const onPaneClick = useCallback(() => {
    setInternalSelectedId(null);
  }, []);

  // Focus (center) map on a specific node
  const handleFocusNode = useCallback(
    (nodeId: string) => {
      fitView({ nodes: [{ id: nodeId }], duration: 400, padding: 0.5 });
    },
    [fitView]
  );

  // Handle node position changes (drag) — save position and detect phase changes
  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeBase(changes);

      for (const change of changes) {
        if (change.type !== "position") continue;

        if (change.dragging) {
          setDraggingNodeIds((prev) => new Set(prev).add(change.id));
          continue;
        }

        if (!draggingNodeIds.has(change.id)) continue;
        setDraggingNodeIds((prev) => {
          const next = new Set(prev);
          next.delete(change.id);
          return next;
        });

        if (!change.position) continue;

        // Save position
        supabase
          .from("map_nodes")
          .update({
            position_x: change.position.x,
            position_y: change.position.y,
          })
          .eq("id", change.id)
          .then(({ error }) => {
            if (error) toast.error("Nepodařilo se uložit pozici");
          });

        // Detect phase change based on X position
        const newPhaseIndex = Math.round(change.position.x / (PHASE_COLUMN_WIDTH + 70));
        const clampedIndex = Math.max(0, Math.min(newPhaseIndex, PHASES.length - 1));
        const newPhase = PHASES[clampedIndex].id;

        // Find current phase of the node
        const currentNode = nodes.find((n) => n.id === change.id);
        if (currentNode) {
          const currentData = currentNode.data as unknown as MapNodeData;
          if (currentData.phase !== newPhase) {
            handleChangePhase(change.id, newPhase);
          }
        }
      }
    },
    [onNodesChangeBase, supabase, draggingNodeIds, nodes, handleChangePhase]
  );

  // Add new node
  const handleAddNode = useCallback(
    async (label: string, description: string, phase: Phase, deadline: string | null = null) => {
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
          deadline,
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
          status: "open" as TaskStatus,
          priority: "medium" as Priority,
          deadline,
          tags: [],
          diaryCount: 0,
          subtaskProgress: null,
          isBlocked: false,
          blockedByCount: 0,
          dbId: data.id,
          onChangePhase: (id: string, p: Phase) => changePhaseRef.current(id, p),
          onCycleStatus: (id: string) => cycleStatusRef.current(id),
          onCyclePriority: (id: string) => cyclePriorityRef.current(id),
          onUpdateLabel: (id: string, l: string) => updateLabelRef.current(id, l),
          onDuplicate: (id: string) => duplicateNodeRef.current(id),
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

  // Compute filtered nodes — apply isDimmed
  const filteredNodes = useMemo(() => {
    const isFilterActive =
      filters.searchQuery !== "" ||
      filters.statusFilter !== "all" ||
      filters.priorityFilter !== "all" ||
      filters.phaseFilter !== "all" ||
      filters.tagFilter !== "all" ||
      filters.deadlineFilter !== "all";

    if (!isFilterActive) {
      return nodes.map((n) => {
        const d = n.data as unknown as MapNodeData;
        if (d.isDimmed) return { ...n, data: { ...d, isDimmed: false } };
        return n;
      });
    }

    return nodes.map((n) => {
      const d = n.data as unknown as MapNodeData;
      let matches = true;

      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const labelMatch = d.label.toLowerCase().includes(q);
        const descMatch = d.description?.toLowerCase().includes(q) ?? false;
        if (!labelMatch && !descMatch) matches = false;
      }

      if (matches && filters.statusFilter !== "all" && d.status !== filters.statusFilter) {
        matches = false;
      }

      if (matches && filters.priorityFilter !== "all" && d.priority !== filters.priorityFilter) {
        matches = false;
      }

      if (matches && filters.phaseFilter !== "all" && d.phase !== filters.phaseFilter) {
        matches = false;
      }

      if (matches && filters.tagFilter !== "all") {
        const tagIds = nodeTagMap.get(d.dbId) || [];
        if (!tagIds.includes(filters.tagFilter)) matches = false;
      }

      if (matches && filters.deadlineFilter !== "all") {
        const ds = getDeadlineStatus(d.deadline);
        switch (filters.deadlineFilter) {
          case "overdue":
            if (!ds || !ds.isOverdue) matches = false;
            break;
          case "today": {
            if (!d.deadline) { matches = false; break; }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dl = new Date(d.deadline + "T00:00:00");
            if (dl.getTime() !== today.getTime()) matches = false;
            break;
          }
          case "week": {
            if (!d.deadline) { matches = false; break; }
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const dl2 = new Date(d.deadline + "T00:00:00");
            if (dl2 < now || dl2 > weekEnd) matches = false;
            break;
          }
          case "none":
            if (d.deadline) matches = false;
            break;
        }
      }

      if (d.isDimmed === !matches) return n;
      return { ...n, data: { ...d, isDimmed: !matches } };
    });
  }, [nodes, filters, nodeTagMap]);

  // Compute selected node info for the toolbar
  const selectedNodeInfo = useMemo<SelectedNodeInfo | null>(() => {
    if (!internalSelectedId) return null;
    const node = nodes.find((n) => n.id === internalSelectedId);
    if (!node) return null;
    const d = node.data as unknown as MapNodeData;
    return { id: d.dbId, label: d.label, phase: d.phase, status: d.status, priority: d.priority };
  }, [internalSelectedId, nodes]);

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
        <p className="text-muted-foreground">Načítání mapy...</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Search & Filter bar */}
      <div className="shrink-0">
        <SearchFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          allTags={allTags}
          selectedNode={selectedNodeInfo}
          onChangePhase={handleChangePhase}
          onSetStatus={handleSetStatus}
          onSetPriority={handleSetPriority}
          onDeleteNode={handleDeleteNode}
          onFocusNode={handleFocusNode}
        />
      </div>

      {/* Phase header bar */}
      <div className="flex shrink-0 gap-0 overflow-x-auto border-b bg-background/80 px-2 py-1 backdrop-blur-sm">
        {PHASES.map((phase) => (
          <button
            key={phase.id}
            onClick={() => {
              setDefaultPhase(phase.id);
              setIsAddDialogOpen(true);
            }}
            className={`flex shrink-0 items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors ${phase.bgColor} ${phase.color} hover:opacity-80`}
          >
            <PlusIcon className="h-3 w-3" />
            {phase.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        <EdgeMarkerDefs />
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
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
          Přidat uzel
        </Button>
      </div>

      <AddNodeDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddNode}
        defaultPhase={defaultPhase}
      />

      <EdgeTypeDialog
        isOpen={isEdgeTypeDialogOpen}
        onClose={() => {
          setIsEdgeTypeDialogOpen(false);
          setPendingConnection(null);
        }}
        onSelect={handleEdgeTypeSelected}
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
