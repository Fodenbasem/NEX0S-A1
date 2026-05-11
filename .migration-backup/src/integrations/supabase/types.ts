export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          category: Database["public"]["Enums"]["audit_category"]
          created_at: string
          id: string
          metadata: Json | null
          project_id: string | null
          severity: Database["public"]["Enums"]["audit_severity"]
          user_id: string
        }
        Insert: {
          action: string
          category?: Database["public"]["Enums"]["audit_category"]
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          severity?: Database["public"]["Enums"]["audit_severity"]
          user_id: string
        }
        Update: {
          action?: string
          category?: Database["public"]["Enums"]["audit_category"]
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          severity?: Database["public"]["Enums"]["audit_severity"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_requests: {
        Row: {
          content: string
          created_at: string
          id: string
          latency_ms: number | null
          model: string | null
          project_id: string | null
          role: Database["public"]["Enums"]["ai_role"]
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          model?: string | null
          project_id?: string | null
          role: Database["public"]["Enums"]["ai_role"]
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          model?: string | null
          project_id?: string | null
          role?: Database["public"]["Enums"]["ai_role"]
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          live_url: string | null
          logs: string | null
          project_id: string
          status: Database["public"]["Enums"]["deployment_status"]
          steps: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          live_url?: string | null
          logs?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["deployment_status"]
          steps?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          live_url?: string | null
          logs?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["deployment_status"]
          steps?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          blueprint: Json | null
          created_at: string
          description: string | null
          id: string
          language: string
          name: string
          owner_id: string
          stack: string | null
          status: Database["public"]["Enums"]["project_status"]
          synthesis_progress: number
          updated_at: string
        }
        Insert: {
          blueprint?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          language?: string
          name: string
          owner_id: string
          stack?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          synthesis_progress?: number
          updated_at?: string
        }
        Update: {
          blueprint?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          language?: string
          name?: string
          owner_id?: string
          stack?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          synthesis_progress?: number
          updated_at?: string
        }
        Relationships: []
      }
      security_reports: {
        Row: {
          composite_score: number
          created_at: string
          findings: Json
          id: string
          owasp_scores: Json
          project_id: string
          user_id: string
        }
        Insert: {
          composite_score?: number
          created_at?: string
          findings?: Json
          id?: string
          owasp_scores?: Json
          project_id: string
          user_id: string
        }
        Update: {
          composite_score?: number
          created_at?: string
          findings?: Json
          id?: string
          owasp_scores?: Json
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device: string | null
          id: string
          ip_address: string | null
          last_seen_at: string
          location: string | null
          mfa_verified: boolean
          os: string | null
          revoked_at: string | null
          risk_score: number
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          location?: string | null
          mfa_verified?: boolean
          os?: string | null
          revoked_at?: string | null
          risk_score?: number
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          location?: string | null
          mfa_verified?: boolean
          os?: string | null
          revoked_at?: string | null
          risk_score?: number
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      ai_role: "user" | "ai" | "system"
      app_role: "admin" | "user"
      audit_category:
        | "auth"
        | "mfa"
        | "session"
        | "project"
        | "ai"
        | "deployment"
        | "security"
        | "admin"
        | "system"
      audit_severity: "info" | "low" | "medium" | "high" | "critical"
      deployment_status:
        | "queued"
        | "running"
        | "success"
        | "failed"
        | "rolled_back"
      project_status:
        | "consulting"
        | "synthesizing"
        | "scanning"
        | "deployed"
        | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_role: ["user", "ai", "system"],
      app_role: ["admin", "user"],
      audit_category: [
        "auth",
        "mfa",
        "session",
        "project",
        "ai",
        "deployment",
        "security",
        "admin",
        "system",
      ],
      audit_severity: ["info", "low", "medium", "high", "critical"],
      deployment_status: [
        "queued",
        "running",
        "success",
        "failed",
        "rolled_back",
      ],
      project_status: [
        "consulting",
        "synthesizing",
        "scanning",
        "deployed",
        "failed",
      ],
    },
  },
} as const
