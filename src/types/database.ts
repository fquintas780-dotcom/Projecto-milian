export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      app_settings: {
        Row: { id: boolean; super_admin_email: string }
        Insert: { id?: boolean; super_admin_email: string }
        Update: { id?: boolean; super_admin_email?: string }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          icon: string | null
          id: string
          name: string
          workspace_id: string | null
        }
        Insert: {
          color?: string
          icon?: string | null
          id?: string
          name: string
          workspace_id?: string | null
        }
        Update: {
          color?: string
          icon?: string | null
          id?: string
          name?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'categories_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          id: string
          status: string
          used_at: string | null
          used_by: string | null
          workspace_id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          id?: string
          status?: string
          used_at?: string | null
          used_by?: string | null
          workspace_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          used_at?: string | null
          used_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invites_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invites_used_by_fkey'
            columns: ['used_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invites_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      payments: {
        Row: {
          ai_result: Json | null
          amount: number
          created_at: string
          id: string
          payer_name_override: string | null
          plan: string
          proof_path: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subscription_id: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          ai_result?: Json | null
          amount: number
          created_at?: string
          id?: string
          payer_name_override?: string | null
          plan: string
          proof_path: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subscription_id?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          ai_result?: Json | null
          amount?: number
          created_at?: string
          id?: string
          payer_name_override?: string | null
          plan?: string
          proof_path?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payments_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_subscription_id_fkey'
            columns: ['subscription_id']
            isOneToOne: false
            referencedRelation: 'subscriptions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          monthly_income: number | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          monthly_income?: number | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          monthly_income?: number | null
          phone?: string | null
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          created_at: string
          created_by: string
          id: string
          monthly_contribution: number
          name: string
          target_amount: number
          target_date: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          monthly_contribution?: number
          name: string
          target_amount: number
          target_date: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          monthly_contribution?: number
          name?: string
          target_amount?: number
          target_date?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'savings_goals_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'savings_goals_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan: string
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          type: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          type: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          free_tier: boolean
          id: string
          name: string
          owner_id: string
          status: string
        }
        Insert: {
          created_at?: string
          free_tier?: boolean
          id?: string
          name: string
          owner_id: string
          status?: string
        }
        Update: {
          created_at?: string
          free_tier?: boolean
          id?: string
          name?: string
          owner_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspaces_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_of: { Args: { ws_id: string }; Returns: boolean }
      is_member_of: { Args: { ws_id: string }; Returns: boolean }
      is_super_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      owner_active_plan: { Args: { owner: string }; Returns: string }
      workspace_is_active: { Args: { ws_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
