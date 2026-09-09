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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accuracy_feedback: {
        Row: {
          accuracy_score: number
          comment: string | null
          created_at: string
          diagnosis_id: string | null
          id: string
        }
        Insert: {
          accuracy_score: number
          comment?: string | null
          created_at?: string
          diagnosis_id?: string | null
          id?: string
        }
        Update: {
          accuracy_score?: number
          comment?: string | null
          created_at?: string
          diagnosis_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accuracy_feedback_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_results"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_rankings: {
        Row: {
          activity_name: string
          category: string
          count: number
          created_at: string
          id: string
          replacement_level: string
          replacement_score: number
          updated_at: string
        }
        Insert: {
          activity_name: string
          category: string
          count?: number
          created_at?: string
          id?: string
          replacement_level: string
          replacement_score: number
          updated_at?: string
        }
        Update: {
          activity_name?: string
          category?: string
          count?: number
          created_at?: string
          id?: string
          replacement_level?: string
          replacement_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      algorithm_config: {
        Row: {
          config_key: string
          config_value: number
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: number
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: number
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          diagnosis_id: string | null
          event_name: string
          id: string
          occurred_at: string
          props: Json
          screen: string
          session_id: string
          target: string | null
        }
        Insert: {
          created_at?: string
          diagnosis_id?: string | null
          event_name: string
          id?: string
          occurred_at?: string
          props?: Json
          screen: string
          session_id: string
          target?: string | null
        }
        Update: {
          created_at?: string
          diagnosis_id?: string | null
          event_name?: string
          id?: string
          occurred_at?: string
          props?: Json
          screen?: string
          session_id?: string
          target?: string | null
        }
        Relationships: []
      }
      challenge_feedback: {
        Row: {
          created_at: string
          diagnosis_id: string | null
          id: string
          reason: string
          type_id: number | null
        }
        Insert: {
          created_at?: string
          diagnosis_id?: string | null
          id?: string
          reason: string
          type_id?: number | null
        }
        Update: {
          created_at?: string
          diagnosis_id?: string | null
          id?: string
          reason?: string
          type_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_feedback_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnoses: {
        Row: {
          created_at: string
          email: string | null
          exposure_index: number
          id: string
          occupation_id: string
          savable_weekly_hours: number
          summary: Json
          tasks: Json
          total_weekly_hours: number
          track: string
          type_id: number
          type_name: string
          usage_index: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          exposure_index: number
          id: string
          occupation_id: string
          savable_weekly_hours: number
          summary?: Json
          tasks?: Json
          total_weekly_hours: number
          track: string
          type_id: number
          type_name: string
          usage_index: number
        }
        Update: {
          created_at?: string
          email?: string | null
          exposure_index?: number
          id?: string
          occupation_id?: string
          savable_weekly_hours?: number
          summary?: Json
          tasks?: Json
          total_weekly_hours?: number
          track?: string
          type_id?: number
          type_name?: string
          usage_index?: number
        }
        Relationships: []
      }
      diagnosis_results: {
        Row: {
          created_at: string
          email: string | null
          id: string
          mbti: string
          result_data: Json
          routines: Json
          shift_index: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          mbti: string
          result_data: Json
          routines: Json
          shift_index: number
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          mbti?: string
          result_data?: Json
          routines?: Json
          shift_index?: number
        }
        Relationships: []
      }
      email_subscribers: {
        Row: {
          created_at: string
          diagnosis_id: string | null
          email: string
          id: string
          mbti: string | null
          occupation_id: string | null
          shift_index: number | null
          type_id: number | null
          wants_recheck: boolean
          wants_weekly: boolean
        }
        Insert: {
          created_at?: string
          diagnosis_id?: string | null
          email: string
          id?: string
          mbti?: string | null
          occupation_id?: string | null
          shift_index?: number | null
          type_id?: number | null
          wants_recheck?: boolean
          wants_weekly?: boolean
        }
        Update: {
          created_at?: string
          diagnosis_id?: string | null
          email?: string
          id?: string
          mbti?: string | null
          occupation_id?: string | null
          shift_index?: number | null
          type_id?: number | null
          wants_recheck?: boolean
          wants_weekly?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "email_subscribers_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      occupation_misses: {
        Row: {
          count: number
          term: string
          updated_at: string
        }
        Insert: {
          count?: number
          term: string
          updated_at?: string
        }
        Update: {
          count?: number
          term?: string
          updated_at?: string
        }
        Relationships: []
      }
      pairing_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          pairing_id: string
          role: string
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          pairing_id: string
          role: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          pairing_id?: string
          role?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairing_emails_pairing_id_fkey"
            columns: ["pairing_id"]
            isOneToOne: false
            referencedRelation: "pairings"
            referencedColumns: ["id"]
          },
        ]
      }
      pairings: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          invitee_diagnosis_id: string | null
          invitee_email: string | null
          inviter_diagnosis_id: string
          inviter_email: string
          reminded_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          invitee_diagnosis_id?: string | null
          invitee_email?: string | null
          inviter_diagnosis_id: string
          inviter_email: string
          reminded_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          invitee_diagnosis_id?: string | null
          invitee_email?: string | null
          inviter_diagnosis_id?: string
          inviter_email?: string
          reminded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairings_invitee_diagnosis_id_fkey"
            columns: ["invitee_diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairings_inviter_diagnosis_id_fkey"
            columns: ["inviter_diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_results: {
        Row: {
          created_at: string
          id: string
          mbti: string
          result_data: Json
        }
        Insert: {
          created_at?: string
          id?: string
          mbti: string
          result_data: Json
        }
        Update: {
          created_at?: string
          id?: string
          mbti?: string
          result_data?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      accept_pairing: {
        Args: { _diagnosis_id: string; _email: string; _pairing_id: string }
        Returns: boolean
      }
      admin_challenge_stats: { Args: never; Returns: Json }
      admin_diagnosis_rankings: { Args: never; Returns: Json }
      admin_screen_funnel: {
        Args: never
        Returns: {
          drop_off_rate: number
          entered: number
          exited: number
          screen: string
        }[]
      }
      attach_diagnosis_email: {
        Args: { _email: string; _id: string }
        Returns: boolean
      }
      attach_email_to_diagnosis: {
        Args: { _email: string; _id: string }
        Returns: boolean
      }
      bump_activity_ranking: {
        Args: {
          _activity_name: string
          _category: string
          _replacement_level: string
          _replacement_score: number
        }
        Returns: undefined
      }
      bump_occupation_miss: { Args: { _term: string }; Returns: undefined }
      create_pairing: {
        Args: { _diagnosis_id: string; _email: string }
        Returns: string
      }
      get_pairing: {
        Args: { _id: string }
        Returns: {
          created_at: string
          id: string
          invitee_summary: Json
          inviter_summary: Json
          status: string
        }[]
      }
      get_public_diagnosis: {
        Args: { _id: string }
        Returns: {
          created_at: string
          id: string
          summary: Json
          track: string
          type_id: number
          type_name: string
        }[]
      }
      get_shared_result: {
        Args: { _id: string }
        Returns: {
          created_at: string
          id: string
          mbti: string
          result_data: Json
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_challenge: {
        Args: { _diagnosis_id: string; _reason: string; _type_id: number }
        Returns: undefined
      }
      save_diagnosis: {
        Args: {
          _exposure: number
          _id: string
          _occupation_id: string
          _savable: number
          _summary: Json
          _tasks: Json
          _total: number
          _track: string
          _type_id: number
          _type_name: string
          _usage: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
