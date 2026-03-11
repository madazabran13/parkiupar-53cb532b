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
      audit_logs: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          tenant_id: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          tenant_id?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          tenant_id?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string
          tenant_id: string
          total_spent: number
          total_visits: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone: string
          tenant_id: string
          total_spent?: number
          total_visits?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
          tenant_id?: string
          total_spent?: number
          total_visits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          tenant_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          tenant_id?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          tenant_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parking_sessions: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          entry_time: string
          exit_time: string | null
          hours_parked: number | null
          id: string
          notes: string | null
          plate: string
          rate_per_hour: number | null
          space_number: string | null
          status: Database["public"]["Enums"]["session_status"]
          tenant_id: string
          total_amount: number | null
          updated_at: string
          vehicle_id: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          entry_time?: string
          exit_time?: string | null
          hours_parked?: number | null
          id?: string
          notes?: string | null
          plate: string
          rate_per_hour?: number | null
          space_number?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          tenant_id: string
          total_amount?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          entry_time?: string
          exit_time?: string | null
          hours_parked?: number | null
          id?: string
          notes?: string | null
          plate?: string
          rate_per_hour?: number | null
          space_number?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "parking_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_sessions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      parking_spaces: {
        Row: {
          created_at: string
          id: string
          label: string | null
          reservation_expires_at: string | null
          reserved_at: string | null
          reserved_by: string | null
          session_id: string | null
          space_number: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          reservation_expires_at?: string | null
          reserved_at?: string | null
          reserved_by?: string | null
          session_id?: string | null
          space_number: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          reservation_expires_at?: string | null
          reserved_at?: string | null
          reserved_by?: string | null
          session_id?: string | null
          space_number?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parking_spaces_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "parking_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_spaces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          months: number
          new_expires_at: string
          notes: string | null
          payment_method: string | null
          plan_id: string | null
          plan_name: string
          previous_expires_at: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          months?: number
          new_expires_at: string
          notes?: string | null
          payment_method?: string | null
          plan_id?: string | null
          plan_name: string
          previous_expires_at?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          months?: number
          new_expires_at?: string
          notes?: string | null
          payment_method?: string | null
          plan_id?: string | null
          plan_name?: string
          previous_expires_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          current_plan_id: string | null
          id: string
          message: string | null
          requested_plan_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          current_plan_id?: string | null
          id?: string
          message?: string | null
          requested_plan_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          current_plan_id?: string | null
          id?: string
          message?: string | null
          requested_plan_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_requests_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_requests_requested_plan_id_fkey"
            columns: ["requested_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_spaces: number
          modules: Json
          name: string
          price_monthly: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_spaces?: number
          modules?: Json
          name: string
          price_monthly?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_spaces?: number
          modules?: Json
          name?: string
          price_monthly?: number
          updated_at?: string
        }
        Relationships: []
      }
      space_reservations: {
        Row: {
          confirmed_at: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          expires_at: string
          id: string
          plate: string | null
          reserved_at: string
          reserved_by: string | null
          space_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          expires_at: string
          id?: string
          plate?: string | null
          reserved_at?: string
          reserved_by?: string | null
          space_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string
          id?: string
          plate?: string | null
          reserved_at?: string
          reserved_by?: string | null
          space_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_reservations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "parking_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_schedules: {
        Row: {
          close_time: string
          created_at: string
          day_group: string
          id: string
          is_active: boolean
          open_time: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          close_time: string
          created_at?: string
          day_group?: string
          id?: string
          is_active?: boolean
          open_time: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          close_time?: string
          created_at?: string
          day_group?: string
          id?: string
          is_active?: boolean
          open_time?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          available_spaces: number
          city: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          plan_expires_at: string | null
          plan_id: string | null
          plan_started_at: string | null
          settings: Json | null
          slug: string
          total_spaces: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          available_spaces?: number
          city?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          plan_expires_at?: string | null
          plan_id?: string | null
          plan_started_at?: string | null
          settings?: Json | null
          slug: string
          total_spaces?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          available_spaces?: number
          city?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          plan_expires_at?: string | null
          plan_id?: string | null
          plan_started_at?: string | null
          settings?: Json | null
          slug?: string
          total_spaces?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_categories: {
        Row: {
          created_at: string
          fraction_minutes: number
          icon: string
          id: string
          is_active: boolean
          minimum_minutes: number
          name: string
          rate_per_hour: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fraction_minutes?: number
          icon?: string
          id?: string
          is_active?: boolean
          minimum_minutes?: number
          name: string
          rate_per_hour?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fraction_minutes?: number
          icon?: string
          id?: string
          is_active?: boolean
          minimum_minutes?: number
          name?: string
          rate_per_hour?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_rates: {
        Row: {
          created_at: string
          fraction_minutes: number
          id: string
          is_active: boolean
          minimum_minutes: number
          rate_per_hour: number
          tenant_id: string
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          created_at?: string
          fraction_minutes?: number
          id?: string
          is_active?: boolean
          minimum_minutes?: number
          rate_per_hour?: number
          tenant_id: string
          updated_at?: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          created_at?: string
          fraction_minutes?: number
          id?: string
          is_active?: boolean
          minimum_minutes?: number
          rate_per_hour?: number
          tenant_id?: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string | null
          color: string | null
          created_at: string
          customer_id: string | null
          id: string
          plate: string
          tenant_id: string
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          brand?: string | null
          color?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          plate: string
          tenant_id: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          brand?: string | null
          color?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          plate?: string
          tenant_id?: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_parking_fee: {
        Args: {
          _entry_time: string
          _exit_time: string
          _fraction_minutes?: number
          _rate_per_hour: number
        }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_sensitive: { Args: { value: string }; Returns: string }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      recalculate_available_spaces: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "operator" | "viewer"
      license_type: "basic" | "pro" | "enterprise"
      session_status: "active" | "completed" | "cancelled"
      vehicle_type: "car" | "motorcycle" | "truck" | "bicycle"
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
      app_role: ["superadmin", "admin", "operator", "viewer"],
      license_type: ["basic", "pro", "enterprise"],
      session_status: ["active", "completed", "cancelled"],
      vehicle_type: ["car", "motorcycle", "truck", "bicycle"],
    },
  },
} as const
