// Hand-written from docs/data-model.md.
// numeric(14,2) columns are returned as `string` by the Supabase JS client — intentional.
// Convert to integer paisa with Math.round(parseFloat(value) * 100) before arithmetic.
// Relationships: [] required by supabase-js GenericTable constraint (v2.68+).

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          created_at?: string
        }
        Relationships: []
      }

      app_settings: {
        Row: {
          id: number
          groom_percentage: number
          currency: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          groom_percentage?: number
          currency?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          groom_percentage?: number
          currency?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }

      expenses: {
        Row: {
          id: string
          name: string
          description: string | null
          expected_cost: string
          category: string | null
          vendor_name: string | null
          vendor_phone: string | null
          next_due_amount: string | null
          next_due_date: string | null
          is_archived: boolean
          created_at: string
          created_by: string | null
          created_by_name: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          expected_cost: string
          category?: string | null
          vendor_name?: string | null
          vendor_phone?: string | null
          next_due_amount?: string | null
          next_due_date?: string | null
          is_archived?: boolean
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          expected_cost?: string
          category?: string | null
          vendor_name?: string | null
          vendor_phone?: string | null
          next_due_amount?: string | null
          next_due_date?: string | null
          is_archived?: boolean
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
        }
        Relationships: []
      }

      payments: {
        Row: {
          id: string
          expense_id: string
          amount: string
          paid_on: string
          note: string | null
          receipt_path: string | null
          is_archived: boolean
          created_at: string
          created_by: string | null
          created_by_name: string | null
        }
        Insert: {
          id?: string
          expense_id: string
          amount: string
          paid_on?: string
          note?: string | null
          receipt_path?: string | null
          is_archived?: boolean
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
        }
        Update: {
          id?: string
          expense_id?: string
          amount?: string
          paid_on?: string
          note?: string | null
          receipt_path?: string | null
          is_archived?: boolean
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payments_expense_id_fkey'
            columns: ['expense_id']
            referencedRelation: 'expenses'
            referencedColumns: ['id']
          }
        ]
      }

      contributions: {
        Row: {
          id: string
          side: 'groom' | 'bride'
          amount: string
          contributed_on: string
          note: string | null
          receipt_path: string | null
          is_archived: boolean
          created_at: string
          created_by: string | null
          created_by_name: string | null
        }
        Insert: {
          id?: string
          side: 'groom' | 'bride'
          amount: string
          contributed_on?: string
          note?: string | null
          receipt_path?: string | null
          is_archived?: boolean
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
        }
        Update: {
          id?: string
          side?: 'groom' | 'bride'
          amount?: string
          contributed_on?: string
          note?: string | null
          receipt_path?: string | null
          is_archived?: boolean
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
        }
        Relationships: []
      }

      activity_log: {
        Row: {
          id: string
          entity_type: 'expense' | 'payment' | 'contribution' | 'settings'
          entity_id: string | null
          action: 'created' | 'updated' | 'archived' | 'restored'
          summary: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
        }
        Insert: {
          id?: string
          entity_type: 'expense' | 'payment' | 'contribution' | 'settings'
          entity_id?: string | null
          action: 'created' | 'updated' | 'archived' | 'restored'
          summary: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
        }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience helpers
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
