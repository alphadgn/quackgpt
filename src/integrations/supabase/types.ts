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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          external_user_id: string
          id: string
          is_banned: boolean
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          external_user_id: string
          id?: string
          is_banned?: boolean
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          external_user_id?: string
          id?: string
          is_banned?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_feedback: {
        Row: {
          admin_override: string | null
          admin_reviewed: boolean
          created_at: string
          external_user_id: string
          feedback_type: string
          id: string
          message_content: string
          user_query: string | null
        }
        Insert: {
          admin_override?: string | null
          admin_reviewed?: boolean
          created_at?: string
          external_user_id: string
          feedback_type: string
          id?: string
          message_content: string
          user_query?: string | null
        }
        Update: {
          admin_override?: string | null
          admin_reviewed?: boolean
          created_at?: string
          external_user_id?: string
          feedback_type?: string
          id?: string
          message_content?: string
          user_query?: string | null
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          content: string
          created_at: string
          external_user_id: string
          id: string
          role: string
          session_id: string
          user_deleted: boolean
        }
        Insert: {
          content: string
          created_at?: string
          external_user_id: string
          id?: string
          role: string
          session_id?: string
          user_deleted?: boolean
        }
        Update: {
          content?: string
          created_at?: string
          external_user_id?: string
          id?: string
          role?: string
          session_id?: string
          user_deleted?: boolean
        }
        Relationships: []
      }
      daily_query_usage: {
        Row: {
          created_at: string
          cycle_started_at: string
          external_user_id: string | null
          id: string
          queries_used: number
          query_date: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          cycle_started_at?: string
          external_user_id?: string | null
          id?: string
          queries_used?: number
          query_date?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          cycle_started_at?: string
          external_user_id?: string | null
          id?: string
          queries_used?: number
          query_date?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      incident_logs: {
        Row: {
          acknowledged_by: string | null
          created_at: string
          finding_id: string
          id: string
          resolution_notes: string | null
          resolved_at: string | null
        }
        Insert: {
          acknowledged_by?: string | null
          created_at?: string
          finding_id: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
        }
        Update: {
          acknowledged_by?: string | null
          created_at?: string
          finding_id?: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_logs_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "security_findings"
            referencedColumns: ["id"]
          },
        ]
      }
      indexed_sources: {
        Row: {
          author: string | null
          change_detected: boolean
          chunk_index: number
          content: string
          content_hash: string
          created_at: string
          embedding: string | null
          id: string
          is_current: boolean
          last_scraped: string
          parent_source_id: string | null
          reliability_tier: number
          source_timestamp: string | null
          source_url: string
          title: string | null
          updated_at: string
          version: number
        }
        Insert: {
          author?: string | null
          change_detected?: boolean
          chunk_index?: number
          content: string
          content_hash: string
          created_at?: string
          embedding?: string | null
          id?: string
          is_current?: boolean
          last_scraped?: string
          parent_source_id?: string | null
          reliability_tier?: number
          source_timestamp?: string | null
          source_url: string
          title?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          author?: string | null
          change_detected?: boolean
          chunk_index?: number
          content?: string
          content_hash?: string
          created_at?: string
          embedding?: string | null
          id?: string
          is_current?: boolean
          last_scraped?: string
          parent_source_id?: string | null
          reliability_tier?: number
          source_timestamp?: string | null
          source_url?: string
          title?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      nft_token_bindings: {
        Row: {
          bound_at: string
          expires_at: string
          external_user_id: string | null
          id: string
          token_id: string
          user_id: string
        }
        Insert: {
          bound_at?: string
          expires_at?: string
          external_user_id?: string | null
          id?: string
          token_id: string
          user_id: string
        }
        Update: {
          bound_at?: string
          expires_at?: string
          external_user_id?: string | null
          id?: string
          token_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          external_user_id: string | null
          id: string
          tier: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          external_user_id?: string | null
          id?: string
          tier?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          external_user_id?: string | null
          id?: string
          tier?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      scrape_jobs: {
        Row: {
          completed_at: string | null
          errors: Json
          id: string
          sources_checked: number
          sources_updated: number
          started_at: string
          status: string
          triggered_by: string
        }
        Insert: {
          completed_at?: string | null
          errors?: Json
          id?: string
          sources_checked?: number
          sources_updated?: number
          started_at?: string
          status?: string
          triggered_by?: string
        }
        Update: {
          completed_at?: string | null
          errors?: Json
          id?: string
          sources_checked?: number
          sources_updated?: number
          started_at?: string
          status?: string
          triggered_by?: string
        }
        Relationships: []
      }
      scrape_sources: {
        Row: {
          added_by: string | null
          campaign: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          updated_at: string
          url: string
        }
        Insert: {
          added_by?: string | null
          campaign?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
          url: string
        }
        Update: {
          added_by?: string | null
          campaign?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      security_findings: {
        Row: {
          auto_fix_available: boolean | null
          category: string
          component: string
          confidence_score: number | null
          created_at: string
          description: string
          exploit_vector: string | null
          exploitability_score: number | null
          id: string
          impact_score: number | null
          recommended_fix: string | null
          scan_id: string
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          auto_fix_available?: boolean | null
          category?: string
          component: string
          confidence_score?: number | null
          created_at?: string
          description?: string
          exploit_vector?: string | null
          exploitability_score?: number | null
          id?: string
          impact_score?: number | null
          recommended_fix?: string | null
          scan_id: string
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          auto_fix_available?: boolean | null
          category?: string
          component?: string
          confidence_score?: number | null
          created_at?: string
          description?: string
          exploit_vector?: string | null
          exploitability_score?: number | null
          id?: string
          impact_score?: number | null
          recommended_fix?: string | null
          scan_id?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_findings_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "security_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      security_scans: {
        Row: {
          completed_at: string | null
          findings: Json
          id: string
          ok_count: number
          overall_score: number | null
          scan_type: string
          started_at: string
          status: string
          summary: string | null
          triggered_by: string | null
          vulnerability_count: number
          warning_count: number
        }
        Insert: {
          completed_at?: string | null
          findings?: Json
          id?: string
          ok_count?: number
          overall_score?: number | null
          scan_type?: string
          started_at?: string
          status?: string
          summary?: string | null
          triggered_by?: string | null
          vulnerability_count?: number
          warning_count?: number
        }
        Update: {
          completed_at?: string | null
          findings?: Json
          id?: string
          ok_count?: number
          overall_score?: number | null
          scan_type?: string
          started_at?: string
          status?: string
          summary?: string | null
          triggered_by?: string | null
          vulnerability_count?: number
          warning_count?: number
        }
        Relationships: []
      }
      tweet_audits: {
        Row: {
          brand_alignment_score: number
          composite_score: number
          correctness_score: number
          created_at: string
          detailed_breakdown: Json
          external_user_id: string
          honesty_score: number
          id: string
          relevancy_score: number
          risk_flags: string[] | null
          suggested_improvements: string[] | null
          supporting_sources: string[] | null
          tweet_text: string
        }
        Insert: {
          brand_alignment_score?: number
          composite_score?: number
          correctness_score?: number
          created_at?: string
          detailed_breakdown?: Json
          external_user_id: string
          honesty_score?: number
          id?: string
          relevancy_score?: number
          risk_flags?: string[] | null
          suggested_improvements?: string[] | null
          supporting_sources?: string[] | null
          tweet_text: string
        }
        Update: {
          brand_alignment_score?: number
          composite_score?: number
          correctness_score?: number
          created_at?: string
          detailed_breakdown?: Json
          external_user_id?: string
          honesty_score?: number
          id?: string
          relevancy_score?: number
          risk_flags?: string[] | null
          suggested_improvements?: string[] | null
          supporting_sources?: string[] | null
          tweet_text?: string
        }
        Relationships: []
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
      match_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          reliability_tier: number
          similarity: number
          source_url: string
          title: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "super_admin" | "user"
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
      app_role: ["admin", "super_admin", "user"],
    },
  },
} as const
