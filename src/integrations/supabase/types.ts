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
          archived_at: string | null
          author: string | null
          canonical_url: string | null
          change_detected: boolean
          chunk_index: number
          content: string
          content_hash: string
          created_at: string
          embedding: string | null
          id: string
          is_current: boolean
          knowledge_domain: string
          last_scraped: string
          normalized_url: string
          parent_source_id: string | null
          reliability_tier: number
          retrieved_at: string
          source_family: string | null
          source_timestamp: string | null
          source_url: string
          title: string | null
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          author?: string | null
          canonical_url?: string | null
          change_detected?: boolean
          chunk_index?: number
          content: string
          content_hash: string
          created_at?: string
          embedding?: string | null
          id?: string
          is_current?: boolean
          knowledge_domain?: string
          last_scraped?: string
          normalized_url: string
          parent_source_id?: string | null
          reliability_tier?: number
          retrieved_at?: string
          source_family?: string | null
          source_timestamp?: string | null
          source_url: string
          title?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          author?: string | null
          canonical_url?: string | null
          change_detected?: boolean
          chunk_index?: number
          content?: string
          content_hash?: string
          created_at?: string
          embedding?: string | null
          id?: string
          is_current?: boolean
          knowledge_domain?: string
          last_scraped?: string
          normalized_url?: string
          parent_source_id?: string | null
          reliability_tier?: number
          retrieved_at?: string
          source_family?: string | null
          source_timestamp?: string | null
          source_url?: string
          title?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "indexed_sources_knowledge_domain_fkey"
            columns: ["knowledge_domain"]
            isOneToOne: false
            referencedRelation: "knowledge_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_domains: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          label: string
        }
        Insert: {
          created_at?: string
          id: string
          is_public?: boolean
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          label?: string
        }
        Relationships: []
      }
      legacy_backup_indexed_sources: {
        Row: {
          author: string | null
          change_detected: boolean | null
          chunk_index: number | null
          content: string | null
          content_hash: string | null
          created_at: string | null
          embedding: string | null
          id: string | null
          is_current: boolean | null
          last_scraped: string | null
          parent_source_id: string | null
          reliability_tier: number | null
          source_timestamp: string | null
          source_url: string | null
          title: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          author?: string | null
          change_detected?: boolean | null
          chunk_index?: number | null
          content?: string | null
          content_hash?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string | null
          is_current?: boolean | null
          last_scraped?: string | null
          parent_source_id?: string | null
          reliability_tier?: number | null
          source_timestamp?: string | null
          source_url?: string | null
          title?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          author?: string | null
          change_detected?: boolean | null
          chunk_index?: number | null
          content?: string | null
          content_hash?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string | null
          is_current?: boolean | null
          last_scraped?: string | null
          parent_source_id?: string | null
          reliability_tier?: number | null
          source_timestamp?: string | null
          source_url?: string | null
          title?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      legacy_backup_scrape_sources: {
        Row: {
          added_by: string | null
          campaign: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          label: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          added_by?: string | null
          campaign?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          label?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          added_by?: string | null
          campaign?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          label?: string | null
          updated_at?: string | null
          url?: string | null
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
          campaign: string | null
          created_at: string
          id: string
          is_active: boolean
          knowledge_domain: string
          label: string
          normalized_url: string
          source_family: string | null
          updated_at: string
          url: string
        }
        Insert: {
          campaign?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          knowledge_domain: string
          label: string
          normalized_url: string
          source_family?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          campaign?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          knowledge_domain?: string
          label?: string
          normalized_url?: string
          source_family?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_sources_knowledge_domain_fkey"
            columns: ["knowledge_domain"]
            isOneToOne: false
            referencedRelation: "knowledge_domains"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_documents:
        | {
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
        | {
            Args: {
              include_archived?: boolean
              match_count?: number
              match_threshold?: number
              p_knowledge_domain: string
              query_embedding: string
            }
            Returns: {
              author: string
              canonical_url: string
              content: string
              id: string
              is_current: boolean
              knowledge_domain: string
              reliability_tier: number
              retrieved_at: string
              similarity: number
              source_timestamp: string
              source_url: string
              title: string
              version: number
            }[]
          }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
