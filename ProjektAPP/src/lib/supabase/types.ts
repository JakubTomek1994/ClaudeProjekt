export type Phase = "idea" | "research" | "design" | "prototype" | "testing" | "production" | "done";
export type ProjectStatus = "active" | "archived" | "completed";
export type EntryType = "note" | "phase_change" | "node_created" | "node_updated" | "milestone";
export type TaskStatus = "open" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high";
export type EdgeType = "blocks" | "relates_to" | "is_part_of";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface MapNode {
  id: string;
  project_id: string;
  label: string;
  description: string | null;
  phase: Phase;
  status: TaskStatus;
  priority: Priority;
  deadline: string | null;
  position_x: number;
  position_y: number;
  parent_node_id: string | null;
  created_at: string;
}

export interface NodeEdge {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: EdgeType;
  created_at: string;
}

export interface DiaryEntry {
  id: string;
  project_id: string;
  node_id: string | null;
  entry_type: EntryType;
  content: string;
  next_step: string | null;
  status: TaskStatus;
  priority: Priority;
  created_at: string;
}

export interface Attachment {
  id: string;
  diary_entry_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface Tag {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface NodeTag {
  id: string;
  node_id: string;
  tag_id: string;
  created_at: string;
}

export interface Subtask {
  id: string;
  node_id: string;
  content: string;
  is_done: boolean;
  sort_order: number;
  created_at: string;
}

// Supabase Database type (manual definition matching our schema)
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Project;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          status?: ProjectStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          status?: ProjectStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      map_nodes: {
        Row: MapNode;
        Insert: {
          id?: string;
          project_id: string;
          label: string;
          description?: string | null;
          phase: Phase;
          status?: TaskStatus;
          priority?: Priority;
          deadline?: string | null;
          position_x?: number;
          position_y?: number;
          parent_node_id?: string | null;
          created_at?: string;
        };
        Update: {
          label?: string;
          description?: string | null;
          phase?: Phase;
          status?: TaskStatus;
          priority?: Priority;
          deadline?: string | null;
          position_x?: number;
          position_y?: number;
          parent_node_id?: string | null;
        };
        Relationships: [];
      };
      node_edges: {
        Row: NodeEdge;
        Insert: {
          id?: string;
          project_id: string;
          source_node_id: string;
          target_node_id: string;
          edge_type?: EdgeType;
          created_at?: string;
        };
        Update: {
          source_node_id?: string;
          target_node_id?: string;
          edge_type?: EdgeType;
        };
        Relationships: [];
      };
      diary_entries: {
        Row: DiaryEntry;
        Insert: {
          id?: string;
          project_id: string;
          node_id?: string | null;
          entry_type?: EntryType;
          content: string;
          next_step?: string | null;
          status?: TaskStatus;
          priority?: Priority;
          created_at?: string;
        };
        Update: {
          node_id?: string | null;
          entry_type?: EntryType;
          content?: string;
          next_step?: string | null;
          status?: TaskStatus;
          priority?: Priority;
        };
        Relationships: [];
      };
      attachments: {
        Row: Attachment;
        Insert: {
          id?: string;
          diary_entry_id: string;
          file_name: string;
          file_path: string;
          file_type: string;
          file_size: number;
          created_at?: string;
        };
        Update: {
          file_name?: string;
          file_path?: string;
          file_type?: string;
          file_size?: number;
        };
        Relationships: [];
      };
      tags: {
        Row: Tag;
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
        };
        Relationships: [];
      };
      node_tags: {
        Row: NodeTag;
        Insert: {
          id?: string;
          node_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          node_id?: string;
          tag_id?: string;
        };
        Relationships: [];
      };
      subtasks: {
        Row: Subtask;
        Insert: {
          id?: string;
          node_id: string;
          content: string;
          is_done?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          content?: string;
          is_done?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<
      string,
      { Row: Record<string, unknown>; Relationships: [] }
    >;
    Functions: Record<string, never>;
  };
}
