// TEMAN Supabase database type reference.
// Snapshot of public schema inspected on 2026-11-18.
// For a fully regenerated official type file, run:
// supabase gen types typescript --project-id xibgmucfyfvxllnajutg
// This compact reference is intentionally readable for AI Studio context.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "owner" | "member";
export type CompetitionMode = "online" | "offline";
export type CompetitionStatus =
  | "planning" | "active" | "submitted" | "completed" | "cancelled";
export type EventType = "meeting" | "presentation" | "other";
export type FeeType = "free" | "paid";
export type NotificationType = "mention" | "assignment" | "comment" | "deadline";
export type ProgressMode = "auto" | "manual";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

type Timestamp = string;
type UUID = string;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: UUID; username: string; full_name: string; is_active: boolean; created_at: Timestamp; updated_at: Timestamp };
        Insert: { id: UUID; username: string; full_name: string; is_active?: boolean; created_at?: Timestamp; updated_at?: Timestamp };
        Update: { id?: UUID; username?: string; full_name?: string; is_active?: boolean; created_at?: Timestamp; updated_at?: Timestamp };
      };
      user_roles: {
        Row: { id: UUID; user_id: UUID; role: AppRole; created_at: Timestamp };
        Insert: { id?: UUID; user_id: UUID; role: AppRole; created_at?: Timestamp };
        Update: { id?: UUID; user_id?: UUID; role?: AppRole; created_at?: Timestamp };
      };
      competitions: {
        Row: { id: UUID; name: string; organizer: string | null; mode: CompetitionMode; objective: string | null; team_name: string | null; deadline: Timestamp | null; fee_type: FeeType; fee_amount: number; instagram_url: string | null; guidebook_url: string | null; github_url: string | null; figma_url: string | null; other_links: Json; status: CompetitionStatus; progress_mode: ProgressMode; manual_progress: number | null; created_by: UUID | null; created_at: Timestamp; updated_at: Timestamp };
        Insert: { id?: UUID; name: string; organizer?: string | null; mode?: CompetitionMode; objective?: string | null; team_name?: string | null; deadline?: Timestamp | null; fee_type?: FeeType; fee_amount?: number; instagram_url?: string | null; guidebook_url?: string | null; github_url?: string | null; figma_url?: string | null; other_links?: Json; status?: CompetitionStatus; progress_mode?: ProgressMode; manual_progress?: number | null; created_by?: UUID | null; created_at?: Timestamp; updated_at?: Timestamp };
        Update: { id?: UUID; name?: string; organizer?: string | null; mode?: CompetitionMode; objective?: string | null; team_name?: string | null; deadline?: Timestamp | null; fee_type?: FeeType; fee_amount?: number; instagram_url?: string | null; guidebook_url?: string | null; github_url?: string | null; figma_url?: string | null; other_links?: Json; status?: CompetitionStatus; progress_mode?: ProgressMode; manual_progress?: number | null; created_by?: UUID | null; created_at?: Timestamp; updated_at?: Timestamp };
      };
      competition_members: {
        Row: { id: UUID; competition_id: UUID; user_id: UUID; created_at: Timestamp };
        Insert: { id?: UUID; competition_id: UUID; user_id: UUID; created_at?: Timestamp };
        Update: { id?: UUID; competition_id?: UUID; user_id?: UUID; created_at?: Timestamp };
      };
      tasks: {
        Row: { id: UUID; competition_id: UUID; title: string; description: string | null; status: TaskStatus; assignee_id: UUID | null; due_date: Timestamp | null; position: number; completed_at: Timestamp | null; created_by: UUID | null; created_at: Timestamp; updated_at: Timestamp };
        Insert: { id?: UUID; competition_id: UUID; title: string; description?: string | null; status?: TaskStatus; assignee_id?: UUID | null; due_date?: Timestamp | null; position?: number; completed_at?: Timestamp | null; created_by?: UUID | null; created_at?: Timestamp; updated_at?: Timestamp };
        Update: { id?: UUID; competition_id?: UUID; title?: string; description?: string | null; status?: TaskStatus; assignee_id?: UUID | null; due_date?: Timestamp | null; position?: number; completed_at?: Timestamp | null; created_by?: UUID | null; created_at?: Timestamp; updated_at?: Timestamp };
      };
      task_comments: {
        Row: { id: UUID; task_id: UUID; author_id: UUID | null; content: string; created_at: Timestamp; updated_at: Timestamp };
        Insert: { id?: UUID; task_id: UUID; author_id?: UUID | null; content: string; created_at?: Timestamp; updated_at?: Timestamp };
        Update: { id?: UUID; task_id?: UUID; author_id?: UUID | null; content?: string; created_at?: Timestamp; updated_at?: Timestamp };
      };
      task_attachments: {
        Row: { id: UUID; task_id: UUID; uploaded_by: UUID | null; file_name: string; file_path: string; file_size: number; mime_type: string | null; created_at: Timestamp };
        Insert: { id?: UUID; task_id: UUID; uploaded_by?: UUID | null; file_name: string; file_path: string; file_size?: number; mime_type?: string | null; created_at?: Timestamp };
        Update: { id?: UUID; task_id?: UUID; uploaded_by?: UUID | null; file_name?: string; file_path?: string; file_size?: number; mime_type?: string | null; created_at?: Timestamp };
      };
      calendar_events: {
        Row: { id: UUID; competition_id: UUID | null; title: string; description: string | null; event_type: EventType; starts_at: Timestamp; ends_at: Timestamp | null; location: string | null; created_by: UUID | null; created_at: Timestamp; updated_at: Timestamp };
        Insert: { id?: UUID; competition_id?: UUID | null; title: string; description?: string | null; event_type?: EventType; starts_at: Timestamp; ends_at?: Timestamp | null; location?: string | null; created_by?: UUID | null; created_at?: Timestamp; updated_at?: Timestamp };
        Update: { id?: UUID; competition_id?: UUID | null; title?: string; description?: string | null; event_type?: EventType; starts_at?: Timestamp; ends_at?: Timestamp | null; location?: string | null; created_by?: UUID | null; created_at?: Timestamp; updated_at?: Timestamp };
      };
      activity_logs: {
        Row: { id: UUID; competition_id: UUID; task_id: UUID | null; actor_id: UUID | null; action: string; details: Json; created_at: Timestamp };
        Insert: { id?: UUID; competition_id: UUID; task_id?: UUID | null; actor_id?: UUID | null; action: string; details?: Json; created_at?: Timestamp };
        Update: { id?: UUID; competition_id?: UUID; task_id?: UUID | null; actor_id?: UUID | null; action?: string; details?: Json; created_at?: Timestamp };
      };
      notifications: {
        Row: { id: UUID; user_id: UUID; actor_id: UUID | null; type: NotificationType; title: string; body: string | null; competition_id: UUID | null; task_id: UUID | null; read_at: Timestamp | null; pushed_at: Timestamp | null; dedupe_key: string | null; created_at: Timestamp };
        Insert: { id?: UUID; user_id: UUID; actor_id?: UUID | null; type: NotificationType; title: string; body?: string | null; competition_id?: UUID | null; task_id?: UUID | null; read_at?: Timestamp | null; pushed_at?: Timestamp | null; dedupe_key?: string | null; created_at?: Timestamp };
        Update: { id?: UUID; user_id?: UUID; actor_id?: UUID | null; type?: NotificationType; title?: string; body?: string | null; competition_id?: UUID | null; task_id?: UUID | null; read_at?: Timestamp | null; pushed_at?: Timestamp | null; dedupe_key?: string | null; created_at?: Timestamp };
      };
      push_subscriptions: {
        Row: { id: UUID; user_id: UUID; endpoint: string; p256dh: string; auth: string; user_agent: string | null; created_at: Timestamp };
        Insert: { id?: UUID; user_id: UUID; endpoint: string; p256dh: string; auth: string; user_agent?: string | null; created_at?: Timestamp };
        Update: { id?: UUID; user_id?: UUID; endpoint?: string; p256dh?: string; auth?: string; user_agent?: string | null; created_at?: Timestamp };
      };
    };
    Views: Record<string, never>;
    Functions: {
      can_access_attachment_path: { Args: { _name: string; _user_id: UUID }; Returns: boolean };
      can_access_competition: { Args: { _competition_id: UUID; _user_id: UUID }; Returns: boolean };
      can_access_task: { Args: { _task_id: UUID; _user_id: UUID }; Returns: boolean };
      generate_deadline_notifications: { Args: Record<PropertyKey, never>; Returns: number };
      get_competition_stats: { Args: Record<PropertyKey, never>; Returns: { competition_id: UUID; done_tasks: number; overdue_tasks: number; progress: number; total_tasks: number }[] };
      has_role: { Args: { _role: AppRole; _user_id: UUID }; Returns: boolean };
      is_active_user: { Args: { _user_id: UUID }; Returns: boolean };
      is_competition_member: { Args: { _competition_id: UUID; _user_id: UUID }; Returns: boolean };
      is_owner: { Args: { _user_id: UUID }; Returns: boolean };
    };
    Enums: {
      app_role: AppRole;
      competition_mode: CompetitionMode;
      competition_status: CompetitionStatus;
      event_type: EventType;
      fee_type: FeeType;
      notification_type: NotificationType;
      progress_mode: ProgressMode;
      task_status: TaskStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
