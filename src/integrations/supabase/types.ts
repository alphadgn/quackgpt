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
      scrape_sources: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          is_active: boolean
          label: string
          updated_at: string
          url: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
          url: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      security_scans: {
        Row: {
          completed_at: string | null
          findings: Json
          id: string
          ok_count: number
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
