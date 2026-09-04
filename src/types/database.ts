export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Tables = Database["public"]["Tables"]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'manager' | 'member' | 'client'
          client_id: string | null
          must_change_password: boolean
          avatar_url: string | null
          phone: string | null
          totp_secret: string | null
          totp_enabled: boolean
          totp_recovery: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'manager' | 'member' | 'client'
          client_id?: string | null
          must_change_password?: boolean
          avatar_url?: string | null
          phone?: string | null
          totp_secret?: string | null
          totp_enabled?: boolean
          totp_recovery?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'manager' | 'member' | 'client'
          client_id?: string | null
          must_change_password?: boolean
          avatar_url?: string | null
          phone?: string | null
          totp_secret?: string | null
          totp_enabled?: boolean
          totp_recovery?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey",
            columns: ["client_id"],
            isOneToOne: false,
            referencedRelation: "clients",
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          id: string
          business_name: string
          contact_name: string
          email: string
          phone: string | null
          website: string | null
          address: string | null
          city: string | null
          province: string | null
          postal_code: string | null
          nif_cif: string | null
          industry: string | null
          google_maps_url: string | null
          notes: string | null
          status: 'active' | 'paused' | 'churned' | 'prospect'
          lead_source: string | null
          monthly_budget: number
          stripe_customer_id: string | null
          stripe_default_payment_method_id: string | null
          drive_folder_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_name: string
          contact_name: string
          email: string
          phone?: string | null
          website?: string | null
          address?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          nif_cif?: string | null
          industry?: string | null
          google_maps_url?: string | null
          notes?: string | null
          status?: 'active' | 'paused' | 'churned' | 'prospect'
          lead_source?: string | null
          monthly_budget?: number
          stripe_customer_id?: string | null
          stripe_default_payment_method_id?: string | null
          drive_folder_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_name?: string
          contact_name?: string
          email?: string
          phone?: string | null
          website?: string | null
          address?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          nif_cif?: string | null
          industry?: string | null
          google_maps_url?: string | null
          notes?: string | null
          status?: 'active' | 'paused' | 'churned' | 'prospect'
          lead_source?: string | null
          monthly_budget?: number
          stripe_customer_id?: string | null
          stripe_default_payment_method_id?: string | null
          drive_folder_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          id: string
          name: string
          description: string | null
          category: 'reviews' | 'social_media' | 'seo' | 'ads' | 'email' | 'branding' | 'web' | null
          base_price: number
          billing_cycle: 'one_time' | 'monthly' | 'quarterly' | 'yearly'
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category?: 'reviews' | 'social_media' | 'seo' | 'ads' | 'email' | 'branding' | 'web' | null
          base_price?: number
          billing_cycle?: 'one_time' | 'monthly' | 'quarterly' | 'yearly'
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: 'reviews' | 'social_media' | 'seo' | 'ads' | 'email' | 'branding' | 'web' | null
          base_price?: number
          billing_cycle?: 'one_time' | 'monthly' | 'quarterly' | 'yearly'
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      client_services: {
        Row: {
          id: string
          client_id: string
          service_id: string
          custom_price: number | null
          status: 'active' | 'paused' | 'cancelled'
          start_date: string
          end_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          service_id: string
          custom_price?: number | null
          status?: 'active' | 'paused' | 'cancelled'
          start_date?: string
          end_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          service_id?: string
          custom_price?: number | null
          status?: 'active' | 'paused' | 'cancelled'
          start_date?: string
          end_date?: string | null
          created_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'client_services_client_id_fkey',
            columns: ['client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_services_service_id_fkey',
            columns: ['service_id'],
            referencedRelation: 'services',
            referencedColumns: ['id']
          }
        ]
      }
      contracts: {
        Row: {
          id: string
          client_id: string
          contract_number: string
          title: string
          content: string | null
          status: 'draft' | 'sent' | 'signed' | 'expired' | 'terminated'
          value: number
          start_date: string
          end_date: string | null
          signed_at: string | null
          pdf_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          contract_number: string
          title: string
          content?: string | null
          status?: 'draft' | 'sent' | 'signed' | 'expired' | 'terminated'
          value?: number
          start_date: string
          end_date?: string | null
          signed_at?: string | null
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          contract_number?: string
          title?: string
          content?: string | null
          status?: 'draft' | 'sent' | 'signed' | 'expired' | 'terminated'
          value?: number
          start_date?: string
          end_date?: string | null
          signed_at?: string | null
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'contracts_client_id_fkey',
            columns: ['client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          }
        ]
      }
      invoices: {
        Row: {
          id: string
          client_id: string
          invoice_number: string
          status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          subtotal: number
          tax_rate: number
          tax_amount: number
          total: number
          issue_date: string
          due_date: string | null
          paid_at: string | null
          notes: string | null
          pdf_url: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method: string | null
          payment_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          invoice_number: string
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          issue_date: string
          due_date?: string | null
          paid_at?: string | null
          notes?: string | null
          pdf_url?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method?: string | null
          payment_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          invoice_number?: string
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          issue_date?: string
          due_date?: string | null
          paid_at?: string | null
          notes?: string | null
          pdf_url?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method?: string | null
          payment_token?: string | null
          created_at?: string
          updated_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'invoices_client_id_fkey',
            columns: ['client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          }
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          total: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          unit_price?: number
          total?: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          total?: number
          created_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'invoice_items_invoice_id_fkey',
            columns: ['invoice_id'],
            referencedRelation: 'invoices',
            referencedColumns: ['id']
          }
        ]
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          amount: number
          payment_method: 'bank_transfer' | 'card' | 'cash' | 'paypal' | 'other' | null
          payment_date: string
          reference: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          amount: number
          payment_method?: 'bank_transfer' | 'card' | 'cash' | 'paypal' | 'other' | null
          payment_date?: string
          reference?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          amount?: number
          payment_method?: 'bank_transfer' | 'card' | 'cash' | 'paypal' | 'other' | null
          payment_date?: string
          reference?: string | null
          notes?: string | null
          created_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'payments_invoice_id_fkey',
            columns: ['invoice_id'],
            referencedRelation: 'invoices',
            referencedColumns: ['id']
          }
        ]
      }
      reviews: {
        Row: {
          id: string
          client_id: string
          platform: 'google' | 'trustpilot' | 'facebook' | 'yelp'
          reviewer_name: string | null
          rating: number | null
          review_text: string | null
          review_date: string | null
          response_text: string | null
          response_date: string | null
          status: 'new' | 'responded' | 'flagged' | 'archived'
          review_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          platform: 'google' | 'trustpilot' | 'facebook' | 'yelp'
          reviewer_name?: string | null
          rating?: number | null
          review_text?: string | null
          review_date?: string | null
          response_text?: string | null
          response_date?: string | null
          status?: 'new' | 'responded' | 'flagged' | 'archived'
          review_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          platform?: 'google' | 'trustpilot' | 'facebook' | 'yelp'
          reviewer_name?: string | null
          rating?: number | null
          review_text?: string | null
          review_date?: string | null
          response_text?: string | null
          response_date?: string | null
          status?: 'new' | 'responded' | 'flagged' | 'archived'
          review_url?: string | null
          created_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'reviews_client_id_fkey',
            columns: ['client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          }
        ]
      }
      review_requests: {
        Row: {
          id: string
          client_id: string
          review_id: string | null
          platform: 'google' | 'trustpilot' | 'facebook' | 'yelp'
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          message: string | null
          status: 'pending' | 'sent' | 'opened' | 'completed' | 'failed'
          sent_at: string | null
          opened_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          review_id?: string | null
          platform?: 'google' | 'trustpilot' | 'facebook' | 'yelp'
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          message?: string | null
          status?: 'pending' | 'sent' | 'opened' | 'completed' | 'failed'
          sent_at?: string | null
          opened_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          review_id?: string | null
          platform?: 'google' | 'trustpilot' | 'facebook' | 'yelp'
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          message?: string | null
          status?: 'pending' | 'sent' | 'opened' | 'completed' | 'failed'
          sent_at?: string | null
          opened_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'review_requests_client_id_fkey',
            columns: ['client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'review_requests_review_id_fkey',
            columns: ['review_id'],
            referencedRelation: 'reviews',
            referencedColumns: ['id']
          }
        ]
      }
      social_accounts: {
        Row: {
          id: string
          client_id: string
          platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok'
          account_name: string | null
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          followers_count: number | null
          is_active: boolean
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok'
          account_name?: string | null
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          followers_count?: number | null
          is_active?: boolean
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          platform?: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok'
          account_name?: string | null
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          followers_count?: number | null
          is_active?: boolean
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'social_accounts_client_id_fkey',
            columns: ['client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          }
        ]
      }
      social_posts: {
        Row: {
          id: string
          client_id: string
          social_account_id: string | null
          content: string
          media_urls: string[] | null
          scheduled_at: string | null
          published_at: string | null
          platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok'
          status: 'draft' | 'scheduled' | 'published' | 'failed' | 'deleted'
          engagement_likes: number | null
          engagement_comments: number | null
          engagement_shares: number | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          social_account_id?: string | null
          content: string
          media_urls?: string[] | null
          scheduled_at?: string | null
          published_at?: string | null
          platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok'
          status?: 'draft' | 'scheduled' | 'published' | 'failed' | 'deleted'
          engagement_likes?: number | null
          engagement_comments?: number | null
          engagement_shares?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          social_account_id?: string | null
          content?: string
          media_urls?: string[] | null
          scheduled_at?: string | null
          published_at?: string | null
          platform?: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok'
          status?: 'draft' | 'scheduled' | 'published' | 'failed' | 'deleted'
          engagement_likes?: number | null
          engagement_comments?: number | null
          engagement_shares?: number | null
          created_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'social_posts_client_id_fkey',
            columns: ['client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'social_posts_social_account_id_fkey',
            columns: ['social_account_id'],
            referencedRelation: 'social_accounts',
            referencedColumns: ['id']
          }
        ]
      }
      seo_audits: {
        Row: {
          id: string
          client_id: string
          url: string
          score: number | null
          issues_found: number | null
          results: Json | null
          recommendations: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          url: string
          score?: number | null
          issues_found?: number | null
          results?: Json | null
          recommendations?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          url?: string
          score?: number | null
          issues_found?: number | null
          results?: Json | null
          recommendations?: string | null
          created_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'seo_audits_client_id_fkey',
            columns: ['client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          }
        ]
      }
      leads: {
        Row: {
          id: string
          business_name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          website: string | null
          city: string | null
          industry: string | null
          source: 'google_maps' | 'directory' | 'website' | 'referral' | 'cold_outreach' | 'social' | 'auto_scraped' | null
          status: 'new' | 'contacted' | 'interested' | 'proposal_sent' | 'negotiation' | 'won' | 'lost'
          score: number
          notes: string | null
          last_contact_at: string | null
          next_follow_up_at: string | null
          converted_client_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          city?: string | null
          industry?: string | null
          source?: 'google_maps' | 'directory' | 'website' | 'referral' | 'cold_outreach' | 'social' | 'auto_scraped' | null
          status?: 'new' | 'contacted' | 'interested' | 'proposal_sent' | 'negotiation' | 'won' | 'lost'
          score?: number
          notes?: string | null
          last_contact_at?: string | null
          next_follow_up_at?: string | null
          converted_client_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          city?: string | null
          industry?: string | null
          source?: 'google_maps' | 'directory' | 'website' | 'referral' | 'cold_outreach' | 'social' | 'auto_scraped' | null
          status?: 'new' | 'contacted' | 'interested' | 'proposal_sent' | 'negotiation' | 'won' | 'lost'
          score?: number
          notes?: string | null
          last_contact_at?: string | null
          next_follow_up_at?: string | null
          converted_client_id?: string | null
          created_at?: string
          updated_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'leads_converted_client_id_fkey',
            columns: ['converted_client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          }
        ]
      }
      email_templates: {
        Row: {
          id: string
          name: string
          subject: string
          body: string
          category: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          subject: string
          body: string
          category?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          subject?: string
          body?: string
          category?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_sends: {
        Row: {
          id: string
          to: string
          from: string
          subject: string
          template: string
          client_id: string | null
          lead_id: string | null
          resend_id: string | null
          data: any
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          to: string
          from: string
          subject: string
          template: string
          client_id?: string | null
          lead_id?: string | null
          resend_id?: string | null
          data?: any
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          to?: string
          from?: string
          subject?: string
          template?: string
          client_id?: string | null
          lead_id?: string | null
          resend_id?: string | null
          data?: any
          status?: string
          created_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'email_sends_client_id_fkey',
            columns: ['client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'email_sends_lead_id_fkey',
            columns: ['lead_id'],
            referencedRelation: 'leads',
            referencedColumns: ['id']
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          client_id: string | null
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'review' | 'done'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to: string | null
          due_date: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          title: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'review' | 'done'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to?: string | null
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          title?: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'review' | 'done'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to?: string | null
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'tasks_client_id_fkey',
            columns: ['client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_assigned_to_fkey',
            columns: ['assigned_to'],
            referencedRelation: 'profiles',
            referencedColumns: ['id']
          }
        ]
      }
      reports: {
        Row: {
          id: string
          client_id: string | null
          title: string
          report_type: 'monthly' | 'quarterly' | 'custom' | 'seo' | 'social' | 'review'
          period_start: string | null
          period_end: string | null
          content: Json | null
          pdf_url: string | null
          status: 'draft' | 'generated' | 'sent'
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          title: string
          report_type?: 'monthly' | 'quarterly' | 'custom' | 'seo' | 'social' | 'review'
          period_start?: string | null
          period_end?: string | null
          content?: Json | null
          pdf_url?: string | null
          status?: 'draft' | 'generated' | 'sent'
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          title?: string
          report_type?: 'monthly' | 'quarterly' | 'custom' | 'seo' | 'social' | 'review'
          period_start?: string | null
          period_end?: string | null
          content?: Json | null
          pdf_url?: string | null
          status?: 'draft' | 'generated' | 'sent'
          created_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'reports_client_id_fkey',
            columns: ['client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          }
        ]
      }
      lead_status_changes: {
        Row: {
          id: string
          lead_id: string
          old_status: string | null
          new_status: string
          changed_by: string | null
          notes: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          old_status?: string | null
          new_status: string
          changed_by?: string | null
          notes?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          old_status?: string | null
          new_status?: string
          changed_by?: string | null
          notes?: string | null
          changed_at?: string
        }
                Relationships: [
          {
            foreignKeyName: 'lead_status_changes_lead_id_fkey',
            columns: ['lead_id'],
            referencedRelation: 'leads',
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lead_status_changes_changed_by_fkey',
            columns: ['changed_by'],
            referencedRelation: 'profiles',
            referencedColumns: ['id']
          }
        ]
      }
      automation_logs: {
        Row: {
          id: string
          action: string
          entity_type: string
          entity_id: string | null
          details: Json | null
          status: 'success' | 'error' | 'pending'
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          action: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json | null
          status?: 'success' | 'error' | 'pending'
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          details?: Json | null
          status?: 'success' | 'error' | 'pending'
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          id: string
          provider: string
          model: string | null
          category: string | null
          input_tokens: number
          output_tokens: number
          estimated_tokens: number
          client_id: string | null
          lead_id: string | null
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider?: string
          model?: string | null
          category?: string | null
          input_tokens?: number
          output_tokens?: number
          estimated_tokens?: number
          client_id?: string | null
          lead_id?: string | null
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider?: string
          model?: string | null
          category?: string | null
          input_tokens?: number
          output_tokens?: number
          estimated_tokens?: number
          client_id?: string | null
          lead_id?: string | null
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'usage_logs_client_id_fkey',
            columns: ['client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usage_logs_lead_id_fkey',
            columns: ['lead_id'],
            referencedRelation: 'leads',
            referencedColumns: ['id']
          }
        ]
      }
      client_tools: {
        Row: {
          id: string
          client_id: string
          tool_type: 'gbp' | 'social_media' | 'ads' | 'web' | 'email' | 'other'
          tool_name: string
          url: string | null
          username: string | null
          password_enc: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          tool_type: 'gbp' | 'social_media' | 'ads' | 'web' | 'email' | 'other'
          tool_name: string
          url?: string | null
          username?: string | null
          password_enc?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          tool_type?: 'gbp' | 'social_media' | 'ads' | 'web' | 'email' | 'other'
          tool_name?: string
          url?: string | null
          username?: string | null
          password_enc?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_tools_client_id_fkey',
            columns: ['client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          }
        ]
      }
      ai_tasks: {
        Row: {
          id: string
          client_id: string
          client_service_id: string | null
          service_category: 'reviews' | 'seo' | 'email' | 'social_media' | 'ads' | 'branding' | 'web'
          status: 'queued' | 'waiting' | 'processing' | 'done' | 'failed'
          request_note: string | null
          result: string | null
          error: string | null
          client_read: boolean
          created_at: string
          started_at: string | null
          processed_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          client_service_id?: string | null
          service_category: 'reviews' | 'seo' | 'email' | 'social_media' | 'ads' | 'branding' | 'web'
          status?: 'queued' | 'waiting' | 'processing' | 'done' | 'failed'
          request_note?: string | null
          result?: string | null
          error?: string | null
          client_read?: boolean
          created_at?: string
          started_at?: string | null
          processed_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          client_service_id?: string | null
          service_category?: 'reviews' | 'seo' | 'email' | 'social_media' | 'ads' | 'branding' | 'web'
          status?: 'queued' | 'waiting' | 'processing' | 'done' | 'failed'
          request_note?: string | null
          result?: string | null
          error?: string | null
          client_read?: boolean
          created_at?: string
          started_at?: string | null
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ai_tasks_client_id_fkey',
            columns: ['client_id'],
            referencedRelation: 'clients',
            referencedColumns: ['id']
          }
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          value: Json
          category: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          category?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          category?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          details: Json | null
          ip: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          details?: Json | null
          ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          details?: Json | null
          ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"]
          }
        ]
      }
    lead_scraper_log: {
        Row: {
          id: string
          run_date: string
          leads_found: number | null
          leads_created: number | null
          leads_skipped: number | null
          errors: string | null
          config_snapshot: Json | null
          duration_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          run_date?: string
          leads_found?: number | null
          leads_created?: number | null
          leads_skipped?: number | null
          errors?: string | null
          config_snapshot?: Json | null
          duration_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          run_date?: string
          leads_found?: number | null
          leads_created?: number | null
          leads_skipped?: number | null
          errors?: string | null
          config_snapshot?: Json | null
          duration_ms?: number | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<
      string,
      { Row: Record<string, unknown>; Relationships: [] }
    >
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>
    Enums: Record<string, string[]>
    CompositeTypes: Record<string, Record<string, unknown>>
  }
  __InternalSupabase: { PostgrestVersion: '14' }
}
