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
      bus_route_stops: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          route_id: string
          school_id: string
          stop_order: number
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          route_id: string
          school_id: string
          stop_order?: number
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          route_id?: string
          school_id?: string
          stop_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "bus_route_stops_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_route_stops_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_route_stops_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_route_students: {
        Row: {
          branch_id: string | null
          created_at: string
          deleted_at: string | null
          dropoff_pin: string
          id: string
          route_id: string
          school_id: string
          special_notes: string | null
          stop_id: string | null
          stop_order: number
          student_id: string
          subscription_status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          dropoff_pin?: string
          id?: string
          route_id: string
          school_id: string
          special_notes?: string | null
          stop_id?: string | null
          stop_order?: number
          student_id: string
          subscription_status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          dropoff_pin?: string
          id?: string
          route_id?: string
          school_id?: string
          special_notes?: string | null
          stop_id?: string | null
          stop_order?: number
          student_id?: string
          subscription_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_route_students_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_route_students_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_route_students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_route_students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_route_students_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "bus_route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_route_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_route_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_payments"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "bus_route_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_routes: {
        Row: {
          backup_driver_id: string | null
          branch_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          driver_id: string | null
          id: string
          is_active: boolean
          monthly_fee: number
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          backup_driver_id?: string | null
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          driver_id?: string | null
          id?: string
          is_active?: boolean
          monthly_fee?: number
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          backup_driver_id?: string | null
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          driver_id?: string | null
          id?: string
          is_active?: boolean
          monthly_fee?: number
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_routes_backup_driver_id_fkey"
            columns: ["backup_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_routes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_routes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_routes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_trip_attendance: {
        Row: {
          branch_id: string | null
          id: string
          lat: number | null
          lng: number | null
          pin_verified: boolean
          recorded_at: string
          school_id: string
          state: string
          student_id: string
          trip_id: string
        }
        Insert: {
          branch_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          pin_verified?: boolean
          recorded_at?: string
          school_id: string
          state: string
          student_id: string
          trip_id: string
        }
        Update: {
          branch_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          pin_verified?: boolean
          recorded_at?: string
          school_id?: string
          state?: string
          student_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_trip_attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_trip_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_trip_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_trip_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_trip_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_payments"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "bus_trip_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_trip_attendance_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "bus_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_trips: {
        Row: {
          branch_id: string | null
          created_at: string
          driver_id: string
          end_lat: number | null
          end_lng: number | null
          ended_at: string | null
          id: string
          route_id: string
          school_id: string
          start_lat: number | null
          start_lng: number | null
          started_at: string
          status: string
          trip_date: string
          trip_type: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          driver_id: string
          end_lat?: number | null
          end_lng?: number | null
          ended_at?: string | null
          id?: string
          route_id: string
          school_id: string
          start_lat?: number | null
          start_lng?: number | null
          started_at?: string
          status?: string
          trip_date?: string
          trip_type: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          driver_id?: string
          end_lat?: number | null
          end_lng?: number | null
          ended_at?: string | null
          id?: string
          route_id?: string
          school_id?: string
          start_lat?: number | null
          start_lng?: number | null
          started_at?: string
          status?: string
          trip_date?: string
          trip_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_trips_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_trips_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_trips_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          branch_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          full_name: string
          id: string
          license_expiry: string | null
          license_number: string | null
          national_id: string | null
          notes: string | null
          phone: string | null
          school_id: string
          status: string
          updated_at: string
          user_profile_id: string | null
          vehicle_model: string | null
          vehicle_photo_url: string | null
          vehicle_plate: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          full_name: string
          id?: string
          license_expiry?: string | null
          license_number?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          school_id: string
          status?: string
          updated_at?: string
          user_profile_id?: string | null
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          full_name?: string
          id?: string
          license_expiry?: string | null
          license_number?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          school_id?: string
          status?: string
          updated_at?: string
          user_profile_id?: string | null
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_archives: {
        Row: {
          archive_date: string
          archive_year: number
          branch_id: string | null
          data: Json
          id: string
          school_id: string
          total_amount: number
          total_payments: number
          total_students: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          archive_date?: string
          archive_year: number
          branch_id?: string | null
          data?: Json
          id?: string
          school_id: string
          total_amount?: number
          total_payments?: number
          total_students?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          archive_date?: string
          archive_year?: number
          branch_id?: string | null
          data?: Json
          id?: string
          school_id?: string
          total_amount?: number
          total_payments?: number
          total_students?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_archives_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_archives_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_archives_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_attachments: {
        Row: {
          activity_id: string
          created_at: string | null
          duration_seconds: number | null
          external_url: string | null
          file_extension: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          height: number | null
          id: string
          is_active: boolean | null
          mime_type: string | null
          teacher_id: string
          thumbnail_path: string | null
          url_thumbnail: string | null
          url_title: string | null
          video_thumbnail: string | null
          width: number | null
        }
        Insert: {
          activity_id: string
          created_at?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          file_extension?: string
          file_name: string
          file_path: string
          file_size?: number
          file_type: string
          height?: number | null
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          teacher_id: string
          thumbnail_path?: string | null
          url_thumbnail?: string | null
          url_title?: string | null
          video_thumbnail?: string | null
          width?: number | null
        }
        Update: {
          activity_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          file_extension?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          height?: number | null
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          teacher_id?: string
          thumbnail_path?: string | null
          url_thumbnail?: string | null
          url_title?: string | null
          video_thumbnail?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_attachments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "teacher_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_attachments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action_type: string
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          school_id: string
        }
        Insert: {
          action_type: string
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          school_id: string
        }
        Update: {
          action_type?: string
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_monitoring_settings: {
        Row: {
          alert_inactive_days: number | null
          alert_low_view_percentage: number | null
          branch_id: string
          created_at: string | null
          id: string
          max_attachments_per_activity: number | null
          max_daily_homework: number | null
          max_daily_notifications: number | null
          max_file_size_mb: number | null
          max_image_size_mb: number | null
          max_video_size_mb: number | null
          require_approval_for_files: boolean | null
          require_approval_for_links: boolean | null
          require_approval_for_videos: boolean | null
          review_mode: string | null
          school_id: string
          teacher_storage_limit_mb: number | null
          total_storage_limit_gb: number | null
          updated_at: string | null
          weekly_summary_day: string | null
          weekly_summary_enabled: boolean | null
        }
        Insert: {
          alert_inactive_days?: number | null
          alert_low_view_percentage?: number | null
          branch_id: string
          created_at?: string | null
          id?: string
          max_attachments_per_activity?: number | null
          max_daily_homework?: number | null
          max_daily_notifications?: number | null
          max_file_size_mb?: number | null
          max_image_size_mb?: number | null
          max_video_size_mb?: number | null
          require_approval_for_files?: boolean | null
          require_approval_for_links?: boolean | null
          require_approval_for_videos?: boolean | null
          review_mode?: string | null
          school_id: string
          teacher_storage_limit_mb?: number | null
          total_storage_limit_gb?: number | null
          updated_at?: string | null
          weekly_summary_day?: string | null
          weekly_summary_enabled?: boolean | null
        }
        Update: {
          alert_inactive_days?: number | null
          alert_low_view_percentage?: number | null
          branch_id?: string
          created_at?: string | null
          id?: string
          max_attachments_per_activity?: number | null
          max_daily_homework?: number | null
          max_daily_notifications?: number | null
          max_file_size_mb?: number | null
          max_image_size_mb?: number | null
          max_video_size_mb?: number | null
          require_approval_for_files?: boolean | null
          require_approval_for_links?: boolean | null
          require_approval_for_videos?: boolean | null
          review_mode?: string | null
          school_id?: string
          teacher_storage_limit_mb?: number | null
          total_storage_limit_gb?: number | null
          updated_at?: string | null
          weekly_summary_day?: string | null
          weekly_summary_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_monitoring_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_monitoring_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_monitoring_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_reports: {
        Row: {
          action_taken: string | null
          activity_id: string
          created_at: string | null
          description: string | null
          id: string
          report_type: string
          reported_by: string
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
        }
        Insert: {
          action_taken?: string | null
          activity_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          report_type: string
          reported_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Update: {
          action_taken?: string | null
          activity_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          report_type?: string
          reported_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_reports_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "teacher_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_views: {
        Row: {
          activity_id: string
          created_at: string | null
          device_type: string | null
          grade: number | null
          homework_status: string | null
          id: string
          last_viewed_at: string | null
          student_id: string
          submitted_at: string | null
          view_count: number | null
          viewed_at: string
        }
        Insert: {
          activity_id: string
          created_at?: string | null
          device_type?: string | null
          grade?: number | null
          homework_status?: string | null
          id?: string
          last_viewed_at?: string | null
          student_id: string
          submitted_at?: string | null
          view_count?: number | null
          viewed_at?: string
        }
        Update: {
          activity_id?: string
          created_at?: string | null
          device_type?: string | null
          grade?: number | null
          homework_status?: string | null
          id?: string
          last_viewed_at?: string | null
          student_id?: string
          submitted_at?: string | null
          view_count?: number | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_views_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "teacher_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_views_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_branch_scopes: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          school_id: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          school_id: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_branch_scopes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_branch_scopes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_branch_scopes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_branch_scopes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_kv_store: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      ads: {
        Row: {
          bg_color: string | null
          body: string | null
          created_at: string | null
          created_by: string | null
          doc_pages: number | null
          doc_url: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          school_id: string | null
          social_label: string | null
          social_url: string | null
          starts_at: string | null
          target_date: string | null
          title: string
          type: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          bg_color?: string | null
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          doc_pages?: number | null
          doc_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          school_id?: string | null
          social_label?: string | null
          social_url?: string | null
          starts_at?: string | null
          target_date?: string | null
          title: string
          type: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          bg_color?: string | null
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          doc_pages?: number | null
          doc_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          school_id?: string | null
          social_label?: string | null
          social_url?: string | null
          starts_at?: string | null
          target_date?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string
          author_id: string | null
          author_name: string | null
          body: string
          created_at: string
          id: string
          is_active: boolean
          kind: string
          link_url: string | null
          school_id: string | null
          title: string
        }
        Insert: {
          audience?: string
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          link_url?: string | null
          school_id?: string | null
          title: string
        }
        Update: {
          audience?: string
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          link_url?: string | null
          school_id?: string | null
          title?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          id: string
          key: string
          school_id: string | null
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          school_id?: string | null
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          school_id?: string | null
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      app_features: {
        Row: {
          appId: string
          config: Json | null
          createdAt: string
          id: string
          isEnabled: boolean
          moduleKey: string
          updatedAt: string
        }
        Insert: {
          appId: string
          config?: Json | null
          createdAt?: string
          id: string
          isEnabled?: boolean
          moduleKey: string
          updatedAt?: string
        }
        Update: {
          appId?: string
          config?: Json | null
          createdAt?: string
          id?: string
          isEnabled?: boolean
          moduleKey?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_features_appId_fkey"
            columns: ["appId"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_notifications: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          message: string | null
          metadata: Json | null
          recipient_role: string | null
          recipient_user_id: string | null
          school_id: string | null
          status: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          recipient_role?: string | null
          recipient_user_id?: string | null
          school_id?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          recipient_role?: string | null
          recipient_user_id?: string | null
          school_id?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: []
      }
      app_themes: {
        Row: {
          accentColor: string | null
          appId: string
          borderRadius: string
          createdAt: string
          customCss: string | null
          darkModeEnabled: boolean
          fontFamily: string | null
          id: string
          logoUrl: string | null
          name: string
          presetId: string | null
          primaryColor: string | null
          secondaryColor: string | null
          sidebarColor: string | null
          textColor: string | null
          topbarColor: string | null
          type: string
          updatedAt: string
        }
        Insert: {
          accentColor?: string | null
          appId: string
          borderRadius?: string
          createdAt?: string
          customCss?: string | null
          darkModeEnabled?: boolean
          fontFamily?: string | null
          id: string
          logoUrl?: string | null
          name?: string
          presetId?: string | null
          primaryColor?: string | null
          secondaryColor?: string | null
          sidebarColor?: string | null
          textColor?: string | null
          topbarColor?: string | null
          type?: string
          updatedAt?: string
        }
        Update: {
          accentColor?: string | null
          appId?: string
          borderRadius?: string
          createdAt?: string
          customCss?: string | null
          darkModeEnabled?: boolean
          fontFamily?: string | null
          id?: string
          logoUrl?: string | null
          name?: string
          presetId?: string | null
          primaryColor?: string | null
          secondaryColor?: string | null
          sidebarColor?: string | null
          textColor?: string | null
          topbarColor?: string | null
          type?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_themes_appId_fkey"
            columns: ["appId"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_usage_limits: {
        Row: {
          appId: string
          createdAt: string
          currentBranches: number
          currentClasses: number
          currentStorageMB: number
          currentStudents: number
          currentUsers: number
          id: string
          maxBranches: number
          maxClasses: number
          maxStorageMB: number
          maxStudents: number
          maxUsers: number
          updatedAt: string
        }
        Insert: {
          appId: string
          createdAt?: string
          currentBranches?: number
          currentClasses?: number
          currentStorageMB?: number
          currentStudents?: number
          currentUsers?: number
          id: string
          maxBranches?: number
          maxClasses?: number
          maxStorageMB?: number
          maxStudents?: number
          maxUsers?: number
          updatedAt?: string
        }
        Update: {
          appId?: string
          createdAt?: string
          currentBranches?: number
          currentClasses?: number
          currentStorageMB?: number
          currentStudents?: number
          currentUsers?: number
          id?: string
          maxBranches?: number
          maxClasses?: number
          maxStorageMB?: number
          maxStudents?: number
          maxUsers?: number
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_usage_limits_appId_fkey"
            columns: ["appId"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          appStoreUrl: string | null
          bundleId: string | null
          createdAt: string
          id: string
          isActive: boolean
          name: string
          packageName: string | null
          platform: string
          playStoreUrl: string | null
          schoolId: string
          updatedAt: string
          webUrl: string | null
        }
        Insert: {
          appStoreUrl?: string | null
          bundleId?: string | null
          createdAt?: string
          id: string
          isActive?: boolean
          name: string
          packageName?: string | null
          platform?: string
          playStoreUrl?: string | null
          schoolId: string
          updatedAt?: string
          webUrl?: string | null
        }
        Update: {
          appStoreUrl?: string | null
          bundleId?: string | null
          createdAt?: string
          id?: string
          isActive?: boolean
          name?: string
          packageName?: string | null
          platform?: string
          playStoreUrl?: string | null
          schoolId?: string
          updatedAt?: string
          webUrl?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apps_schoolId_fkey"
            columns: ["schoolId"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apps_schoolId_fkey"
            columns: ["schoolId"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          attachment_bucket: string | null
          attachment_mime_type: string | null
          attachment_name: string | null
          attachment_path: string | null
          attachment_size_bytes: number | null
          branch_id: string | null
          class_id: string | null
          class_name: string | null
          content_kind: string
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          metadata: Json
          school_id: string
          section: string | null
          section_id: string | null
          student_id: string | null
          subject: string | null
          subject_id: string | null
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attachment_bucket?: string | null
          attachment_mime_type?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size_bytes?: number | null
          branch_id?: string | null
          class_id?: string | null
          class_name?: string | null
          content_kind?: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          school_id: string
          section?: string | null
          section_id?: string | null
          student_id?: string | null
          subject?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attachment_bucket?: string | null
          attachment_mime_type?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size_bytes?: number | null
          branch_id?: string | null
          class_id?: string | null
          class_name?: string | null
          content_kind?: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          school_id?: string
          section?: string | null
          section_id?: string | null
          student_id?: string | null
          subject?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          branch_id: string
          created_at: string | null
          date: string
          id: string
          notes: string | null
          recorded_by: string | null
          school_id: string
          status: string
          student_id: string | null
          teacher_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          school_id: string
          status: string
          student_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          school_id?: string
          status?: string
          student_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_audit_log: {
        Row: {
          action: string
          id: string
          new_data: Json | null
          old_data: Json | null
          performed_at: string
          performed_by: string | null
          school_id: string
          teacher_attendance_id: string | null
        }
        Insert: {
          action: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          school_id: string
          teacher_attendance_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          school_id?: string
          teacher_attendance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_audit_log_teacher_attendance_id_fkey"
            columns: ["teacher_attendance_id"]
            isOneToOne: false
            referencedRelation: "teacher_attendance"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_qr_codes: {
        Row: {
          branch_id: string | null
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          label: string | null
          scan_count: number
          school_id: string
        }
        Insert: {
          branch_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          scan_count?: number
          school_id: string
        }
        Update: {
          branch_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          scan_count?: number
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_qr_codes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_qr_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_qr_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_qr_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_date: string
          branch_id: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          note: string | null
          school_id: string | null
          status: string
          student_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          attendance_date?: string
          branch_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          note?: string | null
          school_id?: string | null
          status: string
          student_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          attendance_date?: string
          branch_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          note?: string | null
          school_id?: string | null
          status?: string
          student_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records_audit_log: {
        Row: {
          action: string
          attendance_record_id: string
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          school_id: string
        }
        Insert: {
          action: string
          attendance_record_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          school_id: string
        }
        Update: {
          action?: string
          attendance_record_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_settings: {
        Row: {
          absent_deduction_amount: number | null
          absent_deduction_type: string
          branch_id: string | null
          created_at: string
          id: string
          late_deduction_amount: number | null
          late_deduction_type: string
          late_threshold_minutes: number
          max_late_days_before_absent: number
          school_id: string
          updated_at: string
          work_days: string[]
          work_end_time: string
          work_start_time: string
        }
        Insert: {
          absent_deduction_amount?: number | null
          absent_deduction_type?: string
          branch_id?: string | null
          created_at?: string
          id?: string
          late_deduction_amount?: number | null
          late_deduction_type?: string
          late_threshold_minutes?: number
          max_late_days_before_absent?: number
          school_id: string
          updated_at?: string
          work_days?: string[]
          work_end_time?: string
          work_start_time?: string
        }
        Update: {
          absent_deduction_amount?: number | null
          absent_deduction_type?: string
          branch_id?: string | null
          created_at?: string
          id?: string
          late_deduction_amount?: number | null
          late_deduction_type?: string
          late_threshold_minutes?: number
          max_late_days_before_absent?: number
          school_id?: string
          updated_at?: string
          work_days?: string[]
          work_end_time?: string
          work_start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          error_message: string | null
          id: number
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          resource_id: string | null
          resource_type: string
          status: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          error_message?: string | null
          id?: number
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_type: string
          status?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          error_message?: string | null
          id?: number
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_type?: string
          status?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string | null
          action_type: string
          actor_email: string | null
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          actor_source: string | null
          actor_user_id: string | null
          branch_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          school_id: string | null
          summary: string
          user_agent: string | null
        }
        Insert: {
          action?: string | null
          action_type: string
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          actor_source?: string | null
          actor_user_id?: string | null
          branch_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          school_id?: string | null
          summary: string
          user_agent?: string | null
        }
        Update: {
          action?: string | null
          action_type?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          actor_source?: string | null
          actor_user_id?: string | null
          branch_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          school_id?: string | null
          summary?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          backup_id: string
          error_message: string | null
          id: number
          integrity_verified: boolean | null
          restored_at: string | null
          size_bytes: number | null
          status: string | null
          timestamp: string | null
        }
        Insert: {
          backup_id: string
          error_message?: string | null
          id?: number
          integrity_verified?: boolean | null
          restored_at?: string | null
          size_bytes?: number | null
          status?: string | null
          timestamp?: string | null
        }
        Update: {
          backup_id?: string
          error_message?: string | null
          id?: number
          integrity_verified?: boolean | null
          restored_at?: string | null
          size_bytes?: number | null
          status?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      behavior_logs: {
        Row: {
          behavior_type: string
          created_at: string
          id: string
          note: string | null
          points: number
          school_id: string
          student_id: string | null
          student_name: string
        }
        Insert: {
          behavior_type: string
          created_at?: string
          id?: string
          note?: string | null
          points?: number
          school_id: string
          student_id?: string | null
          student_name: string
        }
        Update: {
          behavior_type?: string
          created_at?: string
          id?: string
          note?: string | null
          points?: number
          school_id?: string
          student_id?: string | null
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_records: {
        Row: {
          created_at: string | null
          id: string
          kind: string | null
          note: string | null
          points: number | null
          school_id: string | null
          student_id: string | null
          teacher_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kind?: string | null
          note?: string | null
          points?: number | null
          school_id?: string | null
          student_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kind?: string | null
          note?: string | null
          points?: number | null
          school_id?: string | null
          student_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavior_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_access_logs: {
        Row: {
          chat_id: string
          command: string | null
          created_at: string
          id: string
          ip: string | null
          is_authorized: boolean
          username: string | null
        }
        Insert: {
          chat_id: string
          command?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          is_authorized?: boolean
          username?: string | null
        }
        Update: {
          chat_id?: string
          command?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          is_authorized?: boolean
          username?: string | null
        }
        Relationships: []
      }
      bot_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      branch_receipt_config: {
        Row: {
          accent_color: string | null
          background_pattern_url: string | null
          branch_id: string
          created_at: string
          decoration_bottom_left: string | null
          decoration_bottom_right: string | null
          decoration_top_left: string | null
          decoration_top_right: string | null
          emblem_url: string | null
          footer_note: string | null
          page_size: string
          primary_color: string | null
          thank_you_text: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accent_color?: string | null
          background_pattern_url?: string | null
          branch_id: string
          created_at?: string
          decoration_bottom_left?: string | null
          decoration_bottom_right?: string | null
          decoration_top_left?: string | null
          decoration_top_right?: string | null
          emblem_url?: string | null
          footer_note?: string | null
          page_size?: string
          primary_color?: string | null
          thank_you_text?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accent_color?: string | null
          background_pattern_url?: string | null
          branch_id?: string
          created_at?: string
          decoration_bottom_left?: string | null
          decoration_bottom_right?: string | null
          decoration_top_left?: string | null
          decoration_top_right?: string | null
          emblem_url?: string | null
          footer_note?: string | null
          page_size?: string
          primary_color?: string | null
          thank_you_text?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_receipt_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          accent_color: string | null
          address: string | null
          card_bg_url: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          deleted_by: string | null
          font_family: string | null
          group_id: string | null
          id: string
          is_active: boolean | null
          is_main: boolean
          logo_url: string | null
          name: string
          phone: string | null
          primary_color: string | null
          receipt_bg_url: string | null
          receipt_footer_text: string | null
          school_id: string
          secondary_color: string | null
          short_name: string | null
          sidebar_color: string | null
          text_color: string | null
          topbar_color: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          card_bg_url?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          font_family?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          receipt_bg_url?: string | null
          receipt_footer_text?: string | null
          school_id: string
          secondary_color?: string | null
          short_name?: string | null
          sidebar_color?: string | null
          text_color?: string | null
          topbar_color?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          card_bg_url?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          font_family?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          receipt_bg_url?: string | null
          receipt_footer_text?: string | null
          school_id?: string
          secondary_color?: string | null
          short_name?: string | null
          sidebar_color?: string | null
          text_color?: string | null
          topbar_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "school_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          branch_id: string | null
          budget_id: string
          category: string
          created_at: string | null
          description: string | null
          id: string
          item_type: string
          notes: string | null
          planned_amount: number
          school_id: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          budget_id: string
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          item_type: string
          notes?: string | null
          planned_amount?: number
          school_id: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          budget_id?: string
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          item_type?: string
          notes?: string | null
          planned_amount?: number
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string | null
          created_by: string | null
          fiscal_year: number
          id: string
          notes: string | null
          school_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          fiscal_year: number
          id?: string
          notes?: string | null
          school_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          fiscal_year?: number
          id?: string
          notes?: string | null
          school_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      cache_stats: {
        Row: {
          cache_hits: number | null
          cache_misses: number | null
          cache_size_bytes: number | null
          hit_ratio: number | null
          id: number
          timestamp: string | null
          total_cached_items: number | null
        }
        Insert: {
          cache_hits?: number | null
          cache_misses?: number | null
          cache_size_bytes?: number | null
          hit_ratio?: number | null
          id?: number
          timestamp?: string | null
          total_cached_items?: number | null
        }
        Update: {
          cache_hits?: number | null
          cache_misses?: number | null
          cache_size_bytes?: number | null
          hit_ratio?: number | null
          id?: number
          timestamp?: string | null
          total_cached_items?: number | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          branch_id: string | null
          color: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          end_date: string | null
          hijri_date: string | null
          id: string
          is_global: boolean
          is_recurring: boolean
          reminder_sent: boolean | null
          school_id: string | null
          target_class: string | null
          target_section: string | null
          title: string
          title_en: string | null
          type: string
        }
        Insert: {
          branch_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          end_date?: string | null
          hijri_date?: string | null
          id?: string
          is_global?: boolean
          is_recurring?: boolean
          reminder_sent?: boolean | null
          school_id?: string | null
          target_class?: string | null
          target_section?: string | null
          title: string
          title_en?: string | null
          type: string
        }
        Update: {
          branch_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          end_date?: string | null
          hijri_date?: string | null
          id?: string
          is_global?: boolean
          is_recurring?: boolean
          reminder_sent?: boolean | null
          school_id?: string | null
          target_class?: string | null
          target_section?: string | null
          title?: string
          title_en?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      changelog_entries: {
        Row: {
          created_at: string
          description: string
          id: string
          notification_sent: boolean
          released_at: string
          sent_to: string | null
          version: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          notification_sent?: boolean
          released_at?: string
          sent_to?: string | null
          version: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          notification_sent?: boolean
          released_at?: string
          sent_to?: string | null
          version?: string
        }
        Relationships: []
      }
      class_fees: {
        Row: {
          branch_id: string | null
          class_name: string
          created_at: string | null
          id: string
          installment_amount: number
          installments: number
          notes: string | null
          school_id: string | null
          total_fee: number
        }
        Insert: {
          branch_id?: string | null
          class_name: string
          created_at?: string | null
          id?: string
          installment_amount: number
          installments?: number
          notes?: string | null
          school_id?: string | null
          total_fee: number
        }
        Update: {
          branch_id?: string | null
          class_name?: string
          created_at?: string | null
          id?: string
          installment_amount?: number
          installments?: number
          notes?: string | null
          school_id?: string | null
          total_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_fees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_fees_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_fees_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          academic_year: string | null
          class_name: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          school_id: string
          section: string | null
          start_time: string
          subject_name: string
          teacher_id: string | null
        }
        Insert: {
          academic_year?: string | null
          class_name: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          school_id: string
          section?: string | null
          start_time: string
          subject_name: string
          teacher_id?: string | null
        }
        Update: {
          academic_year?: string | null
          class_name?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          school_id?: string
          section?: string | null
          start_time?: string
          subject_name?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedules_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          branch_id: string | null
          created_at: string | null
          grade: string
          id: string
          name: string | null
          school_id: string | null
          section: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          grade: string
          id?: string
          name?: string | null
          school_id?: string | null
          section: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          grade?: string
          id?: string
          name?: string | null
          school_id?: string | null
          section?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_pool_metrics: {
        Row: {
          active_connections: number | null
          id: number
          max_connections: number | null
          timestamp: string | null
          usage_percent: number | null
        }
        Insert: {
          active_connections?: number | null
          id?: number
          max_connections?: number | null
          timestamp?: string | null
          usage_percent?: number | null
        }
        Update: {
          active_connections?: number | null
          id?: number
          max_connections?: number | null
          timestamp?: string | null
          usage_percent?: number | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          display_name: string
          id: string
          is_archived: boolean
          joined_at: string
          last_read_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          display_name: string
          id?: string
          is_archived?: boolean
          joined_at?: string
          last_read_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          display_name?: string
          id?: string
          is_archived?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          broadcast_target: Json | null
          created_at: string
          created_by: string
          id: string
          school_id: string
          subject: string | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          broadcast_target?: Json | null
          created_at?: string
          created_by: string
          id?: string
          school_id: string
          subject?: string | null
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          broadcast_target?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          school_id?: string
          subject?: string | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          contact_name: string | null
          created_at: string
          id: string
          last_contact_at: string | null
          notes: string | null
          phone: string | null
          school_name: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          id?: string
          last_contact_at?: string | null
          notes?: string | null
          phone?: string | null
          school_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          id?: string
          last_contact_at?: string | null
          notes?: string | null
          phone?: string | null
          school_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_roles: {
        Row: {
          base_role: string
          created_at: string
          description: string | null
          id: string
          name: string
          permissions: string[] | null
          school_id: string | null
        }
        Insert: {
          base_role: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          permissions?: string[] | null
          school_id?: string | null
        }
        Update: {
          base_role?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions?: string[] | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_lectures: {
        Row: {
          branch_id: string | null
          created_at: string | null
          grade: string | null
          id: string
          lecture_date: string
          period: number | null
          price: number | null
          school_id: string | null
          section: string | null
          session_type: string | null
          teacher_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          grade?: string | null
          id?: string
          lecture_date: string
          period?: number | null
          price?: number | null
          school_id?: string | null
          section?: string | null
          session_type?: string | null
          teacher_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          grade?: string | null
          id?: string
          lecture_date?: string
          period?: number | null
          price?: number | null
          school_id?: string | null
          section?: string | null
          session_type?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_lectures_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_lectures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_lectures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_lectures_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          active_users: number
          avg_response_ms: number | null
          created_at: string
          date: string
          error_count: number
          id: string
          new_users: number
          revenue: number
          total_attendance: number
          total_grades: number
          total_notifications: number
          total_users: number
        }
        Insert: {
          active_users?: number
          avg_response_ms?: number | null
          created_at?: string
          date: string
          error_count?: number
          id?: string
          new_users?: number
          revenue?: number
          total_attendance?: number
          total_grades?: number
          total_notifications?: number
          total_users?: number
        }
        Update: {
          active_users?: number
          avg_response_ms?: number | null
          created_at?: string
          date?: string
          error_count?: number
          id?: string
          new_users?: number
          revenue?: number
          total_attendance?: number
          total_grades?: number
          total_notifications?: number
          total_users?: number
        }
        Relationships: []
      }
      dashboard_homework_monitoring: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          class_name: string | null
          content_kind: string | null
          created_at: string | null
          description: string | null
          due_at: string | null
          id: string
          school_id: string | null
          school_name: string | null
          section: string | null
          status: string | null
          student_id: string | null
          student_name: string | null
          subject: string | null
          teacher_id: string | null
          teacher_name: string | null
          title: string | null
        }
        Insert: {
          branch_id?: string | null
          branch_name?: string | null
          class_name?: string | null
          content_kind?: string | null
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          school_id?: string | null
          school_name?: string | null
          section?: string | null
          status?: string | null
          student_id?: string | null
          student_name?: string | null
          subject?: string | null
          teacher_id?: string | null
          teacher_name?: string | null
          title?: string | null
        }
        Update: {
          branch_id?: string | null
          branch_name?: string | null
          class_name?: string | null
          content_kind?: string | null
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          school_id?: string | null
          school_name?: string | null
          section?: string | null
          status?: string | null
          student_id?: string | null
          student_name?: string | null
          subject?: string | null
          teacher_id?: string | null
          teacher_name?: string | null
          title?: string | null
        }
        Relationships: []
      }
      dashboard_teacher_message_groups: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          created_at: string | null
          group_id: string
          message: string | null
          representative_id: string | null
          school_id: string | null
          school_name: string | null
          status: string | null
          target_count: number | null
          targets: Json | null
          teacher_id: string | null
          teacher_name: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          branch_id?: string | null
          branch_name?: string | null
          created_at?: string | null
          group_id?: string
          message?: string | null
          representative_id?: string | null
          school_id?: string | null
          school_name?: string | null
          status?: string | null
          target_count?: number | null
          targets?: Json | null
          teacher_id?: string | null
          teacher_name?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          branch_id?: string | null
          branch_name?: string | null
          created_at?: string | null
          group_id?: string
          message?: string | null
          representative_id?: string | null
          school_id?: string | null
          school_name?: string | null
          status?: string | null
          target_count?: number | null
          targets?: Json | null
          teacher_id?: string | null
          teacher_name?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: []
      }
      deductions: {
        Row: {
          amount: number | null
          branch_id: string | null
          created_at: string | null
          deduction_date: string | null
          id: string
          notes: string | null
          school_id: string | null
          teacher_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          branch_id?: string | null
          created_at?: string | null
          deduction_date?: string | null
          id?: string
          notes?: string | null
          school_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          branch_id?: string | null
          created_at?: string | null
          deduction_date?: string | null
          id?: string
          notes?: string | null
          school_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deductions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deductions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deductions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deductions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_data_archive: {
        Row: {
          compliance_verified: boolean | null
          deleted_by: string | null
          deletion_request_id: string | null
          deletion_timestamp: string | null
          id: number
          reason: string | null
          record_data: Json
          record_id: string
          table_name: string
        }
        Insert: {
          compliance_verified?: boolean | null
          deleted_by?: string | null
          deletion_request_id?: string | null
          deletion_timestamp?: string | null
          id?: number
          reason?: string | null
          record_data: Json
          record_id: string
          table_name: string
        }
        Update: {
          compliance_verified?: boolean | null
          deleted_by?: string | null
          deletion_request_id?: string | null
          deletion_timestamp?: string | null
          id?: number
          reason?: string | null
          record_data?: Json
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      deleted_records_archive: {
        Row: {
          data: Json
          deleted_at: string
          id: string
          record_id: string
          school_id: string | null
          table_name: string
        }
        Insert: {
          data: Json
          deleted_at?: string
          id?: string
          record_id: string
          school_id?: string | null
          table_name: string
        }
        Update: {
          data?: Json
          deleted_at?: string
          id?: string
          record_id?: string
          school_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      dependency_audits: {
        Row: {
          audit_date: string | null
          current_version: string | null
          id: number
          latest_version: string | null
          package_name: string
          severity: string | null
          status: string | null
          vulnerability_count: number | null
        }
        Insert: {
          audit_date?: string | null
          current_version?: string | null
          id?: number
          latest_version?: string | null
          package_name: string
          severity?: string | null
          status?: string | null
          vulnerability_count?: number | null
        }
        Update: {
          audit_date?: string | null
          current_version?: string | null
          id?: number
          latest_version?: string | null
          package_name?: string
          severity?: string | null
          status?: string | null
          vulnerability_count?: number | null
        }
        Relationships: []
      }
      discounts: {
        Row: {
          approved_by: string | null
          branch_id: string
          created_at: string | null
          discount_type: string
          discount_value: number
          id: string
          is_approved: boolean | null
          reason: string
          school_id: string
          student_id: string
        }
        Insert: {
          approved_by?: string | null
          branch_id: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_approved?: boolean | null
          reason: string
          school_id: string
          student_id: string
        }
        Update: {
          approved_by?: string | null
          branch_id?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_approved?: boolean | null
          reason?: string
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discounts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      encryption_keys: {
        Row: {
          archived_at: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          key_hash: string
          last_rotated: string | null
          rotation_schedule: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          key_hash: string
          last_rotated?: string | null
          rotation_schedule?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          key_hash?: string
          last_rotated?: string | null
          rotation_schedule?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          error_message: string | null
          first_seen_at: string
          id: string
          ip: string | null
          is_resolved: boolean
          last_seen_at: string
          method: string | null
          occurrence_count: number
          request_body: Json | null
          resolved_at: string | null
          resolved_by: string | null
          route: string | null
          school_id: string | null
          stack_trace: string | null
          status_code: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          first_seen_at?: string
          id?: string
          ip?: string | null
          is_resolved?: boolean
          last_seen_at?: string
          method?: string | null
          occurrence_count?: number
          request_body?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          route?: string | null
          school_id?: string | null
          stack_trace?: string | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          first_seen_at?: string
          id?: string
          ip?: string | null
          is_resolved?: boolean
          last_seen_at?: string
          method?: string | null
          occurrence_count?: number
          request_body?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          route?: string | null
          school_id?: string | null
          stack_trace?: string | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      exam_attempts: {
        Row: {
          answers_json: Json | null
          exam_id: string | null
          id: string
          school_id: string | null
          score: number | null
          started_at: string | null
          status: string
          student_id: string | null
          submitted_at: string | null
          time_spent_seconds: number | null
        }
        Insert: {
          answers_json?: Json | null
          exam_id?: string | null
          id?: string
          school_id?: string | null
          score?: number | null
          started_at?: string | null
          status?: string
          student_id?: string | null
          submitted_at?: string | null
          time_spent_seconds?: number | null
        }
        Update: {
          answers_json?: Json | null
          exam_id?: string | null
          id?: string
          school_id?: string | null
          score?: number | null
          started_at?: string | null
          status?: string
          student_id?: string | null
          submitted_at?: string | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_integrity_logs: {
        Row: {
          attempt_id: string
          created_at: string | null
          event_type: string
          exam_id: string | null
          id: string
          metadata: Json | null
          school_id: string | null
          student_id: string | null
        }
        Insert: {
          attempt_id: string
          created_at?: string | null
          event_type: string
          exam_id?: string | null
          id?: string
          metadata?: Json | null
          school_id?: string | null
          student_id?: string | null
        }
        Update: {
          attempt_id?: string
          created_at?: string | null
          event_type?: string
          exam_id?: string | null
          id?: string
          metadata?: Json | null
          school_id?: string | null
          student_id?: string | null
        }
        Relationships: []
      }
      exam_questions: {
        Row: {
          created_at: string | null
          exam_id: string
          id: string
          marks: number | null
          question_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          exam_id: string
          id?: string
          marks?: number | null
          question_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          exam_id?: string
          id?: string
          marks?: number | null
          question_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_rubrics: {
        Row: {
          created_at: string | null
          criteria: string
          id: string
          max_marks: number
          question_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          criteria: string
          id?: string
          max_marks: number
          question_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          criteria?: string
          id?: string
          max_marks?: number
          question_id?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      exam_schedule_notifications: {
        Row: {
          channel: string | null
          exam_id: string
          id: string
          sent_at: string | null
          target_type: string | null
        }
        Insert: {
          channel?: string | null
          exam_id: string
          id?: string
          sent_at?: string | null
          target_type?: string | null
        }
        Update: {
          channel?: string | null
          exam_id?: string
          id?: string
          sent_at?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      exam_settings: {
        Row: {
          allow_review: boolean | null
          auto_submit: boolean | null
          created_at: string | null
          duration_minutes: number | null
          exam_id: string
          id: string
          instructions: string | null
          lock_browser: boolean | null
          max_attempts: number | null
          passing_marks: number | null
          show_results_immediately: boolean | null
          shuffle_options: boolean | null
          shuffle_questions: boolean | null
        }
        Insert: {
          allow_review?: boolean | null
          auto_submit?: boolean | null
          created_at?: string | null
          duration_minutes?: number | null
          exam_id: string
          id?: string
          instructions?: string | null
          lock_browser?: boolean | null
          max_attempts?: number | null
          passing_marks?: number | null
          show_results_immediately?: boolean | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
        }
        Update: {
          allow_review?: boolean | null
          auto_submit?: boolean | null
          created_at?: string | null
          duration_minutes?: number | null
          exam_id?: string
          id?: string
          instructions?: string | null
          lock_browser?: boolean | null
          max_attempts?: number | null
          passing_marks?: number | null
          show_results_immediately?: boolean | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
        }
        Relationships: []
      }
      exam_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          school_id: string
          structure: Json
          type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          school_id: string
          structure?: Json
          type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          school_id?: string
          structure?: Json
          type?: string | null
        }
        Relationships: []
      }
      exams: {
        Row: {
          class_name: string | null
          created_at: string | null
          created_by: string | null
          ends_at: string | null
          id: string
          school_id: string | null
          starts_at: string | null
          subject: string | null
          title: string
          total_marks: number | null
          type: string | null
        }
        Insert: {
          class_name?: string | null
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          school_id?: string | null
          starts_at?: string | null
          subject?: string | null
          title: string
          total_marks?: number | null
          type?: string | null
        }
        Update: {
          class_name?: string | null
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          school_id?: string | null
          starts_at?: string | null
          subject?: string | null
          title?: string
          total_marks?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_types: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          notes: string | null
          school_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
          notes?: string | null
          school_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          school_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          expense_date: string | null
          expense_type_id: string | null
          id: string
          notes: string | null
          receipt_image_url: string | null
          receipt_number: string | null
          recipient: string | null
          school_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          expense_date?: string | null
          expense_type_id?: string | null
          id?: string
          notes?: string | null
          receipt_image_url?: string | null
          receipt_number?: string | null
          recipient?: string | null
          school_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          expense_date?: string | null
          expense_type_id?: string | null
          id?: string
          notes?: string | null
          receipt_image_url?: string | null
          receipt_number?: string | null
          recipient?: string | null
          school_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_expense_type_id_fkey"
            columns: ["expense_type_id"]
            isOneToOne: false
            referencedRelation: "expense_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses_audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          created_at: string
          expense_id: string
          id: string
          new_data: Json | null
          old_data: Json | null
          school_id: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          expense_id: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          school_id: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          expense_id?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          id: string
          is_enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          id?: string
          is_enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          id?: string
          is_enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      fee_notification_recipients: {
        Row: {
          created_at: string
          delivery_status: string
          failure_reason: string | null
          fee_notification_id: string
          id: string
          student_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_status?: string
          failure_reason?: string | null
          fee_notification_id: string
          id?: string
          student_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_status?: string
          failure_reason?: string | null
          fee_notification_id?: string
          id?: string
          student_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_notification_recipients_fee_notification_id_fkey"
            columns: ["fee_notification_id"]
            isOneToOne: false
            referencedRelation: "fee_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_notification_recipients_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_notifications: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          deep_link: string | null
          due_at: string | null
          failed_count: number
          id: string
          message: string
          metadata: Json | null
          note: string | null
          school_id: string
          sent_count: number
          target_filters: Json | null
          target_mode: string
          title: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          deep_link?: string | null
          due_at?: string | null
          failed_count?: number
          id?: string
          message: string
          metadata?: Json | null
          note?: string | null
          school_id: string
          sent_count?: number
          target_filters?: Json | null
          target_mode?: string
          title: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          deep_link?: string | null
          due_at?: string | null
          failed_count?: number
          id?: string
          message?: string
          metadata?: Json | null
          note?: string | null
          school_id?: string
          sent_count?: number
          target_filters?: Json | null
          target_mode?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_summary: {
        Row: {
          branch_id: string
          current_balance: number | null
          id: string
          month: string
          school_id: string
          total_income: number
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          current_balance?: number | null
          id?: string
          month: string
          school_id: string
          total_income?: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          current_balance?: number | null
          id?: string
          month?: string
          school_id?: string
          total_income?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_summary_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_summary_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_summary_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      global_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      grade_audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          field_name: string
          grade_entry_id: string
          id: string
          new_value: string | null
          old_value: string | null
          reason: string | null
          school_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field_name: string
          grade_entry_id: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          school_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field_name?: string
          grade_entry_id?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_audit_log_grade_entry_id_fkey"
            columns: ["grade_entry_id"]
            isOneToOne: false
            referencedRelation: "grade_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_entries: {
        Row: {
          academic_year: string
          certificate_url: string | null
          class_id: string | null
          created_at: string
          created_by: string | null
          exam_photos: string[] | null
          final_score: number | null
          grade_label: string | null
          grade_scheme_id: string | null
          grade_type_id: string | null
          grade_type_name: string | null
          homework_score: number | null
          id: string
          lock_reason: string | null
          locked_at: string | null
          locked_by: string | null
          max_score: number | null
          midterm_score: number | null
          monthly_score: number | null
          note: string | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          oral_score: number | null
          percentage: number | null
          school_id: string
          score: number | null
          section_id: string | null
          semester: number
          status: string
          student_id: string
          subject_id: string
          teacher_id: string | null
          teacher_name: string | null
          total_score: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          certificate_url?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          exam_photos?: string[] | null
          final_score?: number | null
          grade_label?: string | null
          grade_scheme_id?: string | null
          grade_type_id?: string | null
          grade_type_name?: string | null
          homework_score?: number | null
          id?: string
          lock_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_score?: number | null
          midterm_score?: number | null
          monthly_score?: number | null
          note?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          oral_score?: number | null
          percentage?: number | null
          school_id: string
          score?: number | null
          section_id?: string | null
          semester?: number
          status?: string
          student_id: string
          subject_id: string
          teacher_id?: string | null
          teacher_name?: string | null
          total_score?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          certificate_url?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          exam_photos?: string[] | null
          final_score?: number | null
          grade_label?: string | null
          grade_scheme_id?: string | null
          grade_type_id?: string | null
          grade_type_name?: string | null
          homework_score?: number | null
          id?: string
          lock_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_score?: number | null
          midterm_score?: number | null
          monthly_score?: number | null
          note?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          oral_score?: number | null
          percentage?: number | null
          school_id?: string
          score?: number | null
          section_id?: string | null
          semester?: number
          status?: string
          student_id?: string
          subject_id?: string
          teacher_id?: string | null
          teacher_name?: string | null
          total_score?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_grade_scheme_id_fkey"
            columns: ["grade_scheme_id"]
            isOneToOne: false
            referencedRelation: "grade_schemes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_grade_type_id_fkey"
            columns: ["grade_type_id"]
            isOneToOne: false
            referencedRelation: "grade_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_schemes: {
        Row: {
          class_level: string
          created_at: string
          final_is_ministerial: boolean
          final_max: number
          homework_max: number
          id: string
          is_default: boolean
          midterm_max: number
          monthly_max: number
          name: string
          oral_max: number
          pass_score: number
          school_id: string
          total_max: number
          updated_at: string
        }
        Insert: {
          class_level: string
          created_at?: string
          final_is_ministerial?: boolean
          final_max?: number
          homework_max?: number
          id?: string
          is_default?: boolean
          midterm_max?: number
          monthly_max?: number
          name: string
          oral_max?: number
          pass_score?: number
          school_id: string
          total_max?: number
          updated_at?: string
        }
        Update: {
          class_level?: string
          created_at?: string
          final_is_ministerial?: boolean
          final_max?: number
          homework_max?: number
          id?: string
          is_default?: boolean
          midterm_max?: number
          monthly_max?: number
          name?: string
          oral_max?: number
          pass_score?: number
          school_id?: string
          total_max?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_schemes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_schemes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_types: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          max_score: number
          name: string
          pass_score: number
          school_id: string
          sort_order: number | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_score?: number
          name: string
          pass_score?: number
          school_id: string
          sort_order?: number | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_score?: number
          name?: string
          pass_score?: number
          school_id?: string
          sort_order?: number | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          assignment_id: string | null
          branch_id: string | null
          class_id: string | null
          created_at: string
          exam_type: string | null
          graded_at: string
          id: string
          max_score: number | null
          note: string | null
          school_id: string
          score: number | null
          section_id: string | null
          student_id: string
          subject: string | null
          subject_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          branch_id?: string | null
          class_id?: string | null
          created_at?: string
          exam_type?: string | null
          graded_at?: string
          id?: string
          max_score?: number | null
          note?: string | null
          school_id: string
          score?: number | null
          section_id?: string | null
          student_id: string
          subject?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          branch_id?: string | null
          class_id?: string | null
          created_at?: string
          exam_type?: string | null
          graded_at?: string
          id?: string
          max_score?: number | null
          note?: string | null
          school_id?: string
          score?: number | null
          section_id?: string | null
          student_id?: string
          subject?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      group_alerts: {
        Row: {
          branch_id: string | null
          created_at: string | null
          group_id: string | null
          id: string
          is_read: boolean | null
          message: string
          type: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          type: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_alerts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_alerts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "school_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      health_checks: {
        Row: {
          checked_at: string
          error_message: string | null
          id: string
          response_ms: number | null
          service: string
          status: string
        }
        Insert: {
          checked_at?: string
          error_message?: string | null
          id?: string
          response_ms?: number | null
          service: string
          status: string
        }
        Update: {
          checked_at?: string
          error_message?: string | null
          id?: string
          response_ms?: number | null
          service?: string
          status?: string
        }
        Relationships: []
      }
      hourly_stats: {
        Row: {
          active_users_mobile: number
          active_users_web: number
          api_requests: number
          attendance_recorded: number
          avg_response_ms: number | null
          created_at: string
          errors_count: number
          grades_entered: number
          hour: string
          id: string
        }
        Insert: {
          active_users_mobile?: number
          active_users_web?: number
          api_requests?: number
          attendance_recorded?: number
          avg_response_ms?: number | null
          created_at?: string
          errors_count?: number
          grades_entered?: number
          hour: string
          id?: string
        }
        Update: {
          active_users_mobile?: number
          active_users_web?: number
          api_requests?: number
          attendance_recorded?: number
          avg_response_ms?: number | null
          created_at?: string
          errors_count?: number
          grades_entered?: number
          hour?: string
          id?: string
        }
        Relationships: []
      }
      income_types: {
        Row: {
          branch_id: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          name: string
          notes: string | null
          school_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          notes?: string | null
          school_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          school_id?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          income_date: string
          income_type_id: string
          notes: string | null
          receipt_image_url: string | null
          receipt_number: string | null
          school_id: string
          source: string | null
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          income_date: string
          income_type_id: string
          notes?: string | null
          receipt_image_url?: string | null
          receipt_number?: string | null
          school_id: string
          source?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          income_date?: string
          income_type_id?: string
          notes?: string | null
          receipt_image_url?: string | null
          receipt_number?: string | null
          school_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incomes_income_type_id_fkey"
            columns: ["income_type_id"]
            isOneToOne: false
            referencedRelation: "income_types"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string | null
          due_date: string
          id: string
          is_overdue: boolean | null
          is_paid: boolean | null
          notes: string | null
          paid_at: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          is_overdue?: boolean | null
          is_paid?: boolean | null
          notes?: string | null
          paid_at?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          is_overdue?: boolean | null
          is_paid?: boolean | null
          notes?: string | null
          paid_at?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          school_id: string | null
          school_name: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          paid_at?: string | null
          school_id?: string | null
          school_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          school_id?: string | null
          school_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      job_titles: {
        Row: {
          created_at: string | null
          id: string
          name: string
          school_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          school_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_titles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_titles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      key_rotation_log: {
        Row: {
          error_message: string | null
          id: number
          new_key_hash: string
          old_key_hash: string
          records_affected: number | null
          status: string | null
          timestamp: string | null
        }
        Insert: {
          error_message?: string | null
          id?: number
          new_key_hash: string
          old_key_hash: string
          records_affected?: number | null
          status?: string | null
          timestamp?: string | null
        }
        Update: {
          error_message?: string | null
          id?: number
          new_key_hash?: string
          old_key_hash?: string
          records_affected?: number | null
          status?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      lecture_prices: {
        Row: {
          created_at: string | null
          grade: string
          id: string
          price_per_lecture: number | null
          school_id: string | null
        }
        Insert: {
          created_at?: string | null
          grade: string
          id?: string
          price_per_lecture?: number | null
          school_id?: string | null
        }
        Update: {
          created_at?: string | null
          grade?: string
          id?: string
          price_per_lecture?: number | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lecture_prices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_prices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_times: {
        Row: {
          end_time: string | null
          id: string
          period: number
          school_id: string | null
          session_type: string | null
          start_time: string | null
        }
        Insert: {
          end_time?: string | null
          id?: string
          period: number
          school_id?: string | null
          session_type?: string | null
          start_time?: string | null
        }
        Update: {
          end_time?: string | null
          id?: string
          period?: number
          school_id?: string | null
          session_type?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_times_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_times_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      managed_user_credentials: {
        Row: {
          auth_user_id: string
          card_last_printed_at: string | null
          created_at: string
          has_pending_setup: boolean
          login_identifier: string
          password_hash_algorithm: string
          password_last_reset_at: string
          school_id: string
          temporary_password_hash: string
          temporary_password_plain: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          card_last_printed_at?: string | null
          created_at?: string
          has_pending_setup?: boolean
          login_identifier: string
          password_hash_algorithm?: string
          password_last_reset_at?: string
          school_id: string
          temporary_password_hash?: string
          temporary_password_plain?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          card_last_printed_at?: string | null
          created_at?: string
          has_pending_setup?: boolean
          login_identifier?: string
          password_hash_algorithm?: string
          password_last_reset_at?: string
          school_id?: string
          temporary_password_hash?: string
          temporary_password_plain?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "managed_user_credentials_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "managed_user_credentials_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      managed_user_profiles: {
        Row: {
          auth_user_id: string
          branch_id: string | null
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          is_active: boolean
          phone: string | null
          role: string
          school_id: string
          student_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          is_active?: boolean
          phone?: string | null
          role: string
          school_id: string
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          is_active?: boolean
          phone?: string | null
          role?: string
          school_id?: string
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "managed_user_profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "managed_user_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "managed_user_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "managed_user_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "managed_user_profiles_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      message_status: {
        Row: {
          id: string
          message_id: string
          recipient_id: string
          status: string
          status_at: string
        }
        Insert: {
          id?: string
          message_id: string
          recipient_id: string
          status?: string
          status_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          recipient_id?: string
          status?: string
          status_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_status_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          sender_name: string
          sender_role: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          sender_name: string
          sender_role: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          sender_name?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "school_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          school_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          school_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          school_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_alerts: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json
          sent_status: string
          sent_to: string | null
          sent_via: string | null
          severity: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          sent_status: string
          sent_to?: string | null
          sent_via?: string | null
          severity: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          sent_status?: string
          sent_to?: string | null
          sent_via?: string | null
          severity?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      ops_errors: {
        Row: {
          action: string | null
          auth_user_id: string | null
          branch_id: string | null
          created_at: string
          deployment_id: string | null
          environment: string
          error_code: string | null
          error_message: string
          fix_prompt: string | null
          id: string
          last_seen_at: string
          metadata: Json
          method: string | null
          occurrence_count: number
          page_url: string | null
          request_id: string | null
          route: string | null
          safe_stack: string | null
          school_id: string | null
          severity: string
          source: string
          status: string
          status_code: number | null
          user_agent: string | null
          user_role: string | null
        }
        Insert: {
          action?: string | null
          auth_user_id?: string | null
          branch_id?: string | null
          created_at?: string
          deployment_id?: string | null
          environment?: string
          error_code?: string | null
          error_message: string
          fix_prompt?: string | null
          id?: string
          last_seen_at?: string
          metadata?: Json
          method?: string | null
          occurrence_count?: number
          page_url?: string | null
          request_id?: string | null
          route?: string | null
          safe_stack?: string | null
          school_id?: string | null
          severity: string
          source: string
          status?: string
          status_code?: number | null
          user_agent?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string | null
          auth_user_id?: string | null
          branch_id?: string | null
          created_at?: string
          deployment_id?: string | null
          environment?: string
          error_code?: string | null
          error_message?: string
          fix_prompt?: string | null
          id?: string
          last_seen_at?: string
          metadata?: Json
          method?: string | null
          occurrence_count?: number
          page_url?: string | null
          request_id?: string | null
          route?: string | null
          safe_stack?: string | null
          school_id?: string | null
          severity?: string
          source?: string
          status?: string
          status_code?: number | null
          user_agent?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      ops_health_reports: {
        Row: {
          auth_status: Json | null
          created_at: string
          database_status: Json | null
          domain_status: Json | null
          e2e_status: Json | null
          errors: Json
          id: string
          metadata: Json
          score: number | null
          status: string
          storage_status: Json | null
          subscriptions_status: Json | null
          summary: string | null
          supabase_status: Json | null
          upstash_status: Json | null
          vercel_status: Json | null
        }
        Insert: {
          auth_status?: Json | null
          created_at?: string
          database_status?: Json | null
          domain_status?: Json | null
          e2e_status?: Json | null
          errors?: Json
          id?: string
          metadata?: Json
          score?: number | null
          status: string
          storage_status?: Json | null
          subscriptions_status?: Json | null
          summary?: string | null
          supabase_status?: Json | null
          upstash_status?: Json | null
          vercel_status?: Json | null
        }
        Update: {
          auth_status?: Json | null
          created_at?: string
          database_status?: Json | null
          domain_status?: Json | null
          e2e_status?: Json | null
          errors?: Json
          id?: string
          metadata?: Json
          score?: number | null
          status?: string
          storage_status?: Json | null
          subscriptions_status?: Json | null
          summary?: string | null
          supabase_status?: Json | null
          upstash_status?: Json | null
          vercel_status?: Json | null
        }
        Relationships: []
      }
      ops_pending_actions: {
        Row: {
          branch_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          payload: Json | null
          requested_by_chat_id: string | null
          result: Json | null
          school_id: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          payload?: Json | null
          requested_by_chat_id?: string | null
          result?: Json | null
          school_id?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          payload?: Json | null
          requested_by_chat_id?: string | null
          result?: Json | null
          school_id?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: []
      }
      ops_subscription_snapshots: {
        Row: {
          active_count: number | null
          created_at: string
          details: Json
          expired_count: number | null
          expiring_30_days_count: number | null
          expiring_7_days_count: number | null
          id: string
        }
        Insert: {
          active_count?: number | null
          created_at?: string
          details?: Json
          expired_count?: number | null
          expiring_30_days_count?: number | null
          expiring_7_days_count?: number | null
          id?: string
        }
        Update: {
          active_count?: number | null
          created_at?: string
          details?: Json
          expired_count?: number | null
          expiring_30_days_count?: number | null
          expiring_7_days_count?: number | null
          id?: string
        }
        Relationships: []
      }
      parent_student_links: {
        Row: {
          created_at: string | null
          id: string
          parent_user_id: string
          school_id: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          parent_user_id: string
          school_id: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          parent_user_id?: string
          school_id?: string
          student_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          branch_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          installment_id: string | null
          manual_receipt_number: string | null
          notes: string | null
          payment_method: string | null
          qr_code: string | null
          receipt_number: string | null
          school_id: string
          student_id: string
          updated_at: string | null
          verification_token: string | null
        }
        Insert: {
          amount: number
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          installment_id?: string | null
          manual_receipt_number?: string | null
          notes?: string | null
          payment_method?: string | null
          qr_code?: string | null
          receipt_number?: string | null
          school_id: string
          student_id: string
          updated_at?: string | null
          verification_token?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          installment_id?: string | null
          manual_receipt_number?: string | null
          notes?: string | null
          payment_method?: string | null
          qr_code?: string | null
          receipt_number?: string | null
          school_id?: string
          student_id?: string
          updated_at?: string | null
          verification_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          cache_hit: boolean | null
          database_query_time_ms: number | null
          endpoint_path: string | null
          id: number
          response_time_ms: number | null
          status_code: number | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          cache_hit?: boolean | null
          database_query_time_ms?: number | null
          endpoint_path?: string | null
          id?: number
          response_time_ms?: number | null
          status_code?: number | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          cache_hit?: boolean | null
          database_query_time_ms?: number | null
          endpoint_path?: string | null
          id?: number
          response_time_ms?: number | null
          status_code?: number | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      perm_definitions: {
        Row: {
          description_ar: string | null
          id: string
          key: string
          name_ar: string
          page_id: string
          type: string
        }
        Insert: {
          description_ar?: string | null
          id?: string
          key: string
          name_ar: string
          page_id: string
          type: string
        }
        Update: {
          description_ar?: string | null
          id?: string
          key?: string
          name_ar?: string
          page_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "perm_definitions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "perm_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      perm_modules: {
        Row: {
          icon: string | null
          id: string
          key: string
          name_ar: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          id?: string
          key: string
          name_ar: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          id?: string
          key?: string
          name_ar?: string
          sort_order?: number
        }
        Relationships: []
      }
      perm_pages: {
        Row: {
          icon: string | null
          id: string
          is_active: boolean
          key: string
          module_id: string
          name_ar: string
          route: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          module_id: string
          name_ar: string
          route: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          module_id?: string
          name_ar?: string
          route?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "perm_pages_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "perm_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          accent_color: string
          created_at: string
          emphasis_text_color: string
          id: string
          logo_url: string | null
          name_ar: string
          name_en: string
          preset_id: string
          primary_color: string
          secondary_color: string
          sidebar_color: string
          subtitle_ar: string
          subtitle_en: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accent_color: string
          created_at?: string
          emphasis_text_color: string
          id: string
          logo_url?: string | null
          name_ar: string
          name_en: string
          preset_id: string
          primary_color: string
          secondary_color: string
          sidebar_color: string
          subtitle_ar: string
          subtitle_en: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accent_color?: string
          created_at?: string
          emphasis_text_color?: string
          id?: string
          logo_url?: string | null
          name_ar?: string
          name_en?: string
          preset_id?: string
          primary_color?: string
          secondary_color?: string
          sidebar_color?: string
          subtitle_ar?: string
          subtitle_en?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      query_cache: {
        Row: {
          cache_key: string
          cache_value: Json
          created_at: string | null
          expires_at: string | null
          hit_count: number | null
          id: number
          last_accessed: string | null
          ttl_seconds: number | null
        }
        Insert: {
          cache_key: string
          cache_value: Json
          created_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: number
          last_accessed?: string | null
          ttl_seconds?: number | null
        }
        Update: {
          cache_key?: string
          cache_value?: Json
          created_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: number
          last_accessed?: string | null
          ttl_seconds?: number | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer: string | null
          created_at: string
          created_by: string | null
          difficulty: string | null
          id: string
          options: Json | null
          prompt: string
          school_id: string | null
          subject: string | null
          type: string | null
          unit: string | null
        }
        Insert: {
          answer?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          id?: string
          options?: Json | null
          prompt: string
          school_id?: string | null
          subject?: string | null
          type?: string | null
          unit?: string | null
        }
        Update: {
          answer?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          id?: string
          options?: Json | null
          prompt?: string
          school_id?: string | null
          subject?: string | null
          type?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_permissions: {
        Row: {
          action_code: string
          code: string
          created_at: string
          description: string | null
          id: string
          page_code: string
          resource_code: string
        }
        Insert: {
          action_code: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          page_code: string
          resource_code: string
        }
        Update: {
          action_code?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          page_code?: string
          resource_code?: string
        }
        Relationships: []
      }
      rbac_role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_roles: {
        Row: {
          code: string
          created_at: string
          hierarchy_level: number
          id: string
          is_system_template: boolean
          name: string
          school_id: string
          scope_level: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          hierarchy_level?: number
          id?: string
          is_system_template?: boolean
          name: string
          school_id: string
          scope_level: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          hierarchy_level?: number
          id?: string
          is_system_template?: boolean
          name?: string
          school_id?: string
          scope_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      role_perm_assignments: {
        Row: {
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_perm_assignments_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "perm_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_perm_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "school_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      salaries: {
        Row: {
          branch_id: string
          created_at: string | null
          deductions: number
          gross_salary: number
          id: string
          is_paid: boolean | null
          month: string
          net_salary: number | null
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          school_id: string
          teacher_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          deductions?: number
          gross_salary: number
          id?: string
          is_paid?: boolean | null
          month: string
          net_salary?: number | null
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          school_id: string
          teacher_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          deductions?: number
          gross_salary?: number
          id?: string
          is_paid?: boolean | null
          month?: string
          net_salary?: number | null
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          school_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salaries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salaries_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salaries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salaries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salaries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_advances: {
        Row: {
          advance_date: string | null
          amount: number
          branch_id: string | null
          created_at: string | null
          deducted_on: string | null
          id: string
          is_deducted: boolean | null
          notes: string | null
          reason: string | null
          school_id: string
          teacher_id: string | null
        }
        Insert: {
          advance_date?: string | null
          amount?: number
          branch_id?: string | null
          created_at?: string | null
          deducted_on?: string | null
          id?: string
          is_deducted?: boolean | null
          notes?: string | null
          reason?: string | null
          school_id: string
          teacher_id?: string | null
        }
        Update: {
          advance_date?: string | null
          amount?: number
          branch_id?: string | null
          created_at?: string | null
          deducted_on?: string | null
          id?: string
          is_deducted?: boolean | null
          notes?: string | null
          reason?: string | null
          school_id?: string
          teacher_id?: string | null
        }
        Relationships: []
      }
      salary_archives: {
        Row: {
          archive_date: string | null
          created_at: string | null
          data: Json | null
          id: string
          month: string
          school_id: string | null
          total_amount: number | null
          total_teachers: number | null
        }
        Insert: {
          archive_date?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          month: string
          school_id?: string | null
          total_amount?: number | null
          total_teachers?: number | null
        }
        Update: {
          archive_date?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          month?: string
          school_id?: string | null
          total_amount?: number | null
          total_teachers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_archives_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_archives_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_time_slots: {
        Row: {
          branch_id: string | null
          created_at: string
          duration_minutes: number
          end_time: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          school_id: string
          slot_order: number
          slot_type: string
          start_time: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          duration_minutes: number
          end_time: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          school_id: string
          slot_order: number
          slot_type: string
          start_time: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          duration_minutes?: number
          end_time?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          school_id?: string
          slot_order?: number
          slot_type?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_time_slots_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_time_slots_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_time_slots_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_working_days: {
        Row: {
          branch_id: string | null
          day_key: string
          day_order: number
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          school_id: string
        }
        Insert: {
          branch_id?: string | null
          day_key: string
          day_order: number
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          school_id: string
        }
        Update: {
          branch_id?: string | null
          day_key?: string
          day_order?: number
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_working_days_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_working_days_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_working_days_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_announcements: {
        Row: {
          body: string
          branch_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_pinned: boolean
          media_type: string | null
          media_url: string | null
          school_id: string
          title: string
        }
        Insert: {
          body: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          media_type?: string | null
          media_url?: string | null
          school_id: string
          title: string
        }
        Update: {
          body?: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          media_type?: string | null
          media_url?: string | null
          school_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_announcements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_app_features: {
        Row: {
          feature_key: string
          id: string
          is_enabled: boolean
          school_id: string
          updated_at: string
        }
        Insert: {
          feature_key: string
          id?: string
          is_enabled?: boolean
          school_id: string
          updated_at?: string
        }
        Update: {
          feature_key?: string
          id?: string
          is_enabled?: boolean
          school_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_app_versions: {
        Row: {
          app_id: string | null
          created_at: string | null
          force_update: boolean | null
          id: string
          min_version: string | null
          release_notes: string | null
          school_id: string | null
          version: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          force_update?: boolean | null
          id?: string
          min_version?: string | null
          release_notes?: string | null
          school_id?: string | null
          version: string
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          force_update?: boolean | null
          id?: string
          min_version?: string | null
          release_notes?: string | null
          school_id?: string | null
          version?: string
        }
        Relationships: []
      }
      school_apps: {
        Row: {
          app_name: string | null
          bundle_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          platform: string | null
          school_id: string
        }
        Insert: {
          app_name?: string | null
          bundle_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string | null
          school_id: string
        }
        Update: {
          app_name?: string | null
          bundle_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string | null
          school_id?: string
        }
        Relationships: []
      }
      school_branding_settings: {
        Row: {
          accent_color: string
          created_at: string
          emphasis_text_color: string
          logo_url: string | null
          preset_id: string
          primary_color: string
          school_id: string
          secondary_color: string
          sidebar_color: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accent_color: string
          created_at?: string
          emphasis_text_color: string
          logo_url?: string | null
          preset_id: string
          primary_color: string
          school_id: string
          secondary_color: string
          sidebar_color: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accent_color?: string
          created_at?: string
          emphasis_text_color?: string
          logo_url?: string | null
          preset_id?: string
          primary_color?: string
          school_id?: string
          secondary_color?: string
          sidebar_color?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_branding_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_branding_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_data_archives: {
        Row: {
          archive_source: string
          created_at: string
          created_by: string | null
          id: string
          payload: Json
          school_id: string | null
          school_name: string
        }
        Insert: {
          archive_source: string
          created_at?: string
          created_by?: string | null
          id?: string
          payload: Json
          school_id?: string | null
          school_name: string
        }
        Update: {
          archive_source?: string
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json
          school_id?: string | null
          school_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_data_archives_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_data_archives_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_feature_flags: {
        Row: {
          feature_key: string
          id: string
          is_enabled: boolean | null
          metadata: Json | null
          school_id: string
          updated_at: string | null
        }
        Insert: {
          feature_key: string
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          school_id: string
          updated_at?: string | null
        }
        Update: {
          feature_key?: string
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          school_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      school_groups: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      school_notifications: {
        Row: {
          body: string
          branch_id: string | null
          category: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          priority: string
          recipient_count: number
          school_id: string
          sent_at: string | null
          sent_by_user_id: string | null
          status: string
          target_class: string | null
          target_section: string | null
          target_type: string
          target_user_id: string | null
          template: string
          title: string
          type: string
        }
        Insert: {
          body: string
          branch_id?: string | null
          category?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          priority?: string
          recipient_count?: number
          school_id: string
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          target_class?: string | null
          target_section?: string | null
          target_type?: string
          target_user_id?: string | null
          template?: string
          title: string
          type?: string
        }
        Update: {
          body?: string
          branch_id?: string | null
          category?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          priority?: string
          recipient_count?: number
          school_id?: string
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          target_class?: string | null
          target_section?: string | null
          target_type?: string
          target_user_id?: string | null
          template?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_receipt_config: {
        Row: {
          accent_color: string | null
          background_pattern_url: string | null
          created_at: string
          decoration_bottom_left: string | null
          decoration_bottom_right: string | null
          decoration_top_left: string | null
          decoration_top_right: string | null
          emblem_url: string | null
          footer_note: string | null
          page_size: string
          primary_color: string | null
          school_id: string
          thank_you_text: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accent_color?: string | null
          background_pattern_url?: string | null
          created_at?: string
          decoration_bottom_left?: string | null
          decoration_bottom_right?: string | null
          decoration_top_left?: string | null
          decoration_top_right?: string | null
          emblem_url?: string | null
          footer_note?: string | null
          page_size?: string
          primary_color?: string | null
          school_id: string
          thank_you_text?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accent_color?: string | null
          background_pattern_url?: string | null
          created_at?: string
          decoration_bottom_left?: string | null
          decoration_bottom_right?: string | null
          decoration_top_left?: string | null
          decoration_top_right?: string | null
          emblem_url?: string | null
          footer_note?: string | null
          page_size?: string
          primary_color?: string | null
          school_id?: string
          thank_you_text?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_receipt_config_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_receipt_config_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_roles: {
        Row: {
          color: string | null
          created_at: string
          dashboard_sections: Json
          id: string
          is_system: boolean
          key: string
          name_ar: string
          school_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          dashboard_sections?: Json
          id?: string
          is_system?: boolean
          key: string
          name_ar: string
          school_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          dashboard_sections?: Json
          id?: string
          is_system?: boolean
          key?: string
          name_ar?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          academic_year_label: string | null
          address: string | null
          app_name: string | null
          city: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          deleted_by: string | null
          discount_early_pct: number | null
          group_id: string | null
          id: string
          is_active: boolean | null
          late_payment_grace_days: number | null
          late_payment_penalty_pct: number | null
          logo_url: string | null
          max_penalty_pct: number | null
          name: string
          owner_email: string | null
          phone: string | null
          plan: string | null
          primary_color: string | null
          receipt_address: string | null
          receipt_footer_text: string | null
          receipt_tax_number: string | null
          secondary_color: string | null
          semester1_end: string | null
          semester1_start: string | null
          semester2_end: string | null
          semester2_start: string | null
          slug: string | null
          subscription_status: string | null
          theme_preset: string | null
        }
        Insert: {
          academic_year_label?: string | null
          address?: string | null
          app_name?: string | null
          city?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_early_pct?: number | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          late_payment_grace_days?: number | null
          late_payment_penalty_pct?: number | null
          logo_url?: string | null
          max_penalty_pct?: number | null
          name: string
          owner_email?: string | null
          phone?: string | null
          plan?: string | null
          primary_color?: string | null
          receipt_address?: string | null
          receipt_footer_text?: string | null
          receipt_tax_number?: string | null
          secondary_color?: string | null
          semester1_end?: string | null
          semester1_start?: string | null
          semester2_end?: string | null
          semester2_start?: string | null
          slug?: string | null
          subscription_status?: string | null
          theme_preset?: string | null
        }
        Update: {
          academic_year_label?: string | null
          address?: string | null
          app_name?: string | null
          city?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_early_pct?: number | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          late_payment_grace_days?: number | null
          late_payment_penalty_pct?: number | null
          logo_url?: string | null
          max_penalty_pct?: number | null
          name?: string
          owner_email?: string | null
          phone?: string | null
          plan?: string | null
          primary_color?: string | null
          receipt_address?: string | null
          receipt_footer_text?: string | null
          receipt_tax_number?: string | null
          secondary_color?: string | null
          semester1_end?: string | null
          semester1_start?: string | null
          semester2_end?: string | null
          semester2_start?: string | null
          slug?: string | null
          subscription_status?: string | null
          theme_preset?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "school_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          name: string
          school_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          school_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          auth_time: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity: string | null
          token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_time?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_time?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      slow_query_log: {
        Row: {
          duration_ms: number | null
          id: number
          query_text: string
          rows_affected: number | null
          severity: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          duration_ms?: number | null
          id?: number
          query_text: string
          rows_affected?: number | null
          severity?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          duration_ms?: number | null
          id?: number
          query_text?: string
          rows_affected?: number | null
          severity?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      student_answers: {
        Row: {
          attempt_id: string
          created_at: string | null
          flagged: boolean | null
          id: string
          is_correct: boolean | null
          marks_awarded: number | null
          question_id: string
          student_answer: Json | null
          time_spent_seconds: number | null
        }
        Insert: {
          attempt_id: string
          created_at?: string | null
          flagged?: boolean | null
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          question_id: string
          student_answer?: Json | null
          time_spent_seconds?: number | null
        }
        Update: {
          attempt_id?: string
          created_at?: string | null
          flagged?: boolean | null
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          question_id?: string
          student_answer?: Json | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_badges: {
        Row: {
          badge_type: string
          created_at: string
          earned_at: string
          id: string
          metadata: Json
          school_id: string
          student_id: string
          subject_id: string | null
        }
        Insert: {
          badge_type: string
          created_at?: string
          earned_at?: string
          id?: string
          metadata?: Json
          school_id: string
          student_id: string
          subject_id?: string | null
        }
        Update: {
          badge_type?: string
          created_at?: string
          earned_at?: string
          id?: string
          metadata?: Json
          school_id?: string
          student_id?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_badges_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_badges_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_badges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_badges_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_goals: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          school_id: string
          status: string
          student_id: string
          subject_id: string | null
          target_score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          school_id: string
          status?: string
          student_id: string
          subject_id?: string | null
          target_score: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          school_id?: string
          status?: string
          student_id?: string
          subject_id?: string | null
          target_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_goals_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_goals_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_goals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_teacher_links: {
        Row: {
          created_at: string | null
          id: string
          school_id: string
          student_id: string
          subject: string | null
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          school_id: string
          student_id: string
          subject?: string | null
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          school_id?: string
          student_id?: string
          subject?: string | null
          teacher_id?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          address: string | null
          auth_user_id: string | null
          branch_id: string
          class_name: string
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          deleted_at: string | null
          deleted_by: string | null
          discount_value: number
          full_name: string
          gender: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          paid_fee: number
          parent_name: string | null
          parent_phone: string | null
          phone: string | null
          phone2: string | null
          photo_url: string | null
          prev_school: string | null
          previous_school: string | null
          registration_number: string | null
          remaining_fee: number | null
          school_id: string
          section: string | null
          status: string
          total_fee: number
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          branch_id: string
          class_name: string
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_value?: number
          full_name: string
          gender?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          paid_fee?: number
          parent_name?: string | null
          parent_phone?: string | null
          phone?: string | null
          phone2?: string | null
          photo_url?: string | null
          prev_school?: string | null
          previous_school?: string | null
          registration_number?: string | null
          remaining_fee?: number | null
          school_id: string
          section?: string | null
          status?: string
          total_fee?: number
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          branch_id?: string
          class_name?: string
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_value?: number
          full_name?: string
          gender?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          paid_fee?: number
          parent_name?: string | null
          parent_phone?: string | null
          phone?: string | null
          phone2?: string | null
          photo_url?: string | null
          prev_school?: string | null
          previous_school?: string | null
          registration_number?: string | null
          remaining_fee?: number | null
          school_id?: string
          section?: string | null
          status?: string
          total_fee?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_lecture_prices: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          overtime_price: number | null
          price_per_lecture: number | null
          school_id: string
          subject_name: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          overtime_price?: number | null
          price_per_lecture?: number | null
          school_id: string
          subject_name: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          overtime_price?: number | null
          price_per_lecture?: number | null
          school_id?: string
          subject_name?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          max_students: number | null
          max_teachers: number | null
          notes: string | null
          plan: string | null
          price: number | null
          school_id: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          max_students?: number | null
          max_teachers?: number | null
          notes?: string | null
          plan?: string | null
          price?: number | null
          school_id?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          max_students?: number | null
          max_teachers?: number | null
          notes?: string | null
          plan?: string | null
          price?: number | null
          school_id?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          message: string | null
          metadata: Json | null
          page_url: string | null
          school_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          page_url?: string | null
          school_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          page_url?: string | null
          school_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      survey_results: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          responded_at: string | null
          role: string | null
          school_id: string | null
          score: number | null
          survey_sent_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          responded_at?: string | null
          role?: string | null
          school_id?: string | null
          score?: number | null
          survey_sent_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          responded_at?: string | null
          role?: string | null
          school_id?: string | null
          score?: number | null
          survey_sent_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      teacher_activities: {
        Row: {
          activity_type: string
          body: string | null
          branch_id: string
          created_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          delivered_count: number | null
          flag_reason: string | null
          flagged_by: string | null
          homework_due_date: string | null
          homework_graded: boolean | null
          homework_submitted_count: number | null
          id: string
          is_deleted: boolean | null
          is_published: boolean | null
          published_at: string | null
          rejection_reason: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          subject: string | null
          target_class_id: string | null
          target_count: number | null
          target_section_id: string | null
          target_student_id: string | null
          target_students: Json | null
          target_type: string
          teacher_id: string
          title: string
          updated_at: string | null
          viewed_count: number | null
        }
        Insert: {
          activity_type: string
          body?: string | null
          branch_id: string
          created_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          delivered_count?: number | null
          flag_reason?: string | null
          flagged_by?: string | null
          homework_due_date?: string | null
          homework_graded?: boolean | null
          homework_submitted_count?: number | null
          id?: string
          is_deleted?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          rejection_reason?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          subject?: string | null
          target_class_id?: string | null
          target_count?: number | null
          target_section_id?: string | null
          target_student_id?: string | null
          target_students?: Json | null
          target_type: string
          teacher_id: string
          title: string
          updated_at?: string | null
          viewed_count?: number | null
        }
        Update: {
          activity_type?: string
          body?: string | null
          branch_id?: string
          created_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          delivered_count?: number | null
          flag_reason?: string | null
          flagged_by?: string | null
          homework_due_date?: string | null
          homework_graded?: boolean | null
          homework_submitted_count?: number | null
          id?: string
          is_deleted?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          rejection_reason?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          subject?: string | null
          target_class_id?: string | null
          target_count?: number | null
          target_section_id?: string | null
          target_student_id?: string | null
          target_students?: Json | null
          target_type?: string
          teacher_id?: string
          title?: string
          updated_at?: string | null
          viewed_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_activities_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_activities_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_activities_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_activities_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_activities_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_activities_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_activities_target_class_id_fkey"
            columns: ["target_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_activities_target_section_id_fkey"
            columns: ["target_section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_activities_target_student_id_fkey"
            columns: ["target_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_activities_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          is_active: boolean
          school_id: string
          section_id: string | null
          subject_id: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          school_id: string
          section_id?: string | null
          subject_id?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          school_id?: string
          section_id?: string | null
          subject_id?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance: {
        Row: {
          attendance_date: string
          branch_id: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          id: string
          late_minutes: number | null
          notes: string | null
          qr_code_id: string | null
          recorded_by: string | null
          school_id: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          attendance_date: string
          branch_id?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          id?: string
          late_minutes?: number | null
          notes?: string | null
          qr_code_id?: string | null
          recorded_by?: string | null
          school_id: string
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          branch_id?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          id?: string
          late_minutes?: number | null
          notes?: string | null
          qr_code_id?: string | null
          recorded_by?: string | null
          school_id?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_documents: {
        Row: {
          created_at: string | null
          document_type: string
          expiry_date: string | null
          file_path: string | null
          id: string
          image_url: string | null
          notes: string | null
          school_id: string
          teacher_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          document_type: string
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          school_id: string
          teacher_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          document_type?: string
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          school_id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_documents_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_evaluations: {
        Row: {
          academic_year: string | null
          branch_id: string | null
          classroom_mgmt_score: number | null
          cooperation_score: number | null
          created_at: string | null
          creativity_score: number | null
          curriculum_score: number | null
          discipline_score: number | null
          evaluation_date: string
          evaluator_id: string | null
          id: string
          notes: string | null
          overall_grade: string | null
          overall_score: number | null
          recommendations: string | null
          school_id: string
          student_results_score: number | null
          teacher_id: string
          technology_score: number | null
        }
        Insert: {
          academic_year?: string | null
          branch_id?: string | null
          classroom_mgmt_score?: number | null
          cooperation_score?: number | null
          created_at?: string | null
          creativity_score?: number | null
          curriculum_score?: number | null
          discipline_score?: number | null
          evaluation_date: string
          evaluator_id?: string | null
          id?: string
          notes?: string | null
          overall_grade?: string | null
          overall_score?: number | null
          recommendations?: string | null
          school_id: string
          student_results_score?: number | null
          teacher_id: string
          technology_score?: number | null
        }
        Update: {
          academic_year?: string | null
          branch_id?: string | null
          classroom_mgmt_score?: number | null
          cooperation_score?: number | null
          created_at?: string | null
          creativity_score?: number | null
          curriculum_score?: number | null
          discipline_score?: number | null
          evaluation_date?: string
          evaluator_id?: string | null
          id?: string
          notes?: string | null
          overall_grade?: string | null
          overall_score?: number | null
          recommendations?: string | null
          school_id?: string
          student_results_score?: number | null
          teacher_id?: string
          technology_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_evaluations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_leaves: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string | null
          days_count: number
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          school_id: string
          start_date: string
          status: string | null
          substitute_teacher_id: string | null
          teacher_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string | null
          days_count: number
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          school_id: string
          start_date: string
          status?: string | null
          substitute_teacher_id?: string | null
          teacher_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string | null
          days_count?: number
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          school_id?: string
          start_date?: string
          status?: string | null
          substitute_teacher_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_leaves_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_qualifications: {
        Row: {
          created_at: string | null
          date_obtained: string | null
          expiry_date: string | null
          grade: string | null
          id: string
          institution: string | null
          school_id: string
          teacher_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          date_obtained?: string | null
          expiry_date?: string | null
          grade?: string | null
          id?: string
          institution?: string | null
          school_id: string
          teacher_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          date_obtained?: string | null
          expiry_date?: string | null
          grade?: string | null
          id?: string
          institution?: string | null
          school_id?: string
          teacher_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_qualifications_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          address: string | null
          app_last_login: string | null
          app_password_hash: string | null
          app_status: string | null
          app_username: string | null
          auth_user_id: string | null
          bank_account: string | null
          bank_name: string | null
          base_salary: number
          blood_type: string | null
          branch_id: string
          city: string | null
          classes: Json | null
          classes_taught: Json | null
          contract_end_date: string | null
          contract_type: string | null
          created_at: string | null
          date_of_birth: string | null
          department: string | null
          email: string | null
          email_personal: string | null
          email_work: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          employee_id: string | null
          first_name_ar: string | null
          first_name_en: string | null
          full_name: string
          gender: string | null
          graduation_year: number | null
          hire_date: string | null
          housing_allowance: number | null
          id: string
          is_active: boolean
          job_title: string | null
          last_name_ar: string | null
          last_name_en: string | null
          lecture_price: number | null
          marital_status: string | null
          max_periods_daily: number | null
          max_periods_weekly: number | null
          messaging_paused: boolean
          national_id: string | null
          national_id_expiry: string | null
          nationality: string | null
          notes: string | null
          notifications_require_approval: boolean
          other_allowances: number | null
          performance_score: number | null
          phone: string | null
          phone_secondary: string | null
          photo: string | null
          qualification: string | null
          salary_type: string | null
          school_id: string
          second_name_ar: string | null
          specialization: string | null
          status: string | null
          status_reason: string | null
          subject: string | null
          third_name_ar: string | null
          transport_allowance: number | null
          university: string | null
          updated_at: string | null
          weekly_hours: number | null
          years_experience: number | null
        }
        Insert: {
          address?: string | null
          app_last_login?: string | null
          app_password_hash?: string | null
          app_status?: string | null
          app_username?: string | null
          auth_user_id?: string | null
          bank_account?: string | null
          bank_name?: string | null
          base_salary?: number
          blood_type?: string | null
          branch_id: string
          city?: string | null
          classes?: Json | null
          classes_taught?: Json | null
          contract_end_date?: string | null
          contract_type?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          email_personal?: string | null
          email_work?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_id?: string | null
          first_name_ar?: string | null
          first_name_en?: string | null
          full_name: string
          gender?: string | null
          graduation_year?: number | null
          hire_date?: string | null
          housing_allowance?: number | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_name_ar?: string | null
          last_name_en?: string | null
          lecture_price?: number | null
          marital_status?: string | null
          max_periods_daily?: number | null
          max_periods_weekly?: number | null
          messaging_paused?: boolean
          national_id?: string | null
          national_id_expiry?: string | null
          nationality?: string | null
          notes?: string | null
          notifications_require_approval?: boolean
          other_allowances?: number | null
          performance_score?: number | null
          phone?: string | null
          phone_secondary?: string | null
          photo?: string | null
          qualification?: string | null
          salary_type?: string | null
          school_id: string
          second_name_ar?: string | null
          specialization?: string | null
          status?: string | null
          status_reason?: string | null
          subject?: string | null
          third_name_ar?: string | null
          transport_allowance?: number | null
          university?: string | null
          updated_at?: string | null
          weekly_hours?: number | null
          years_experience?: number | null
        }
        Update: {
          address?: string | null
          app_last_login?: string | null
          app_password_hash?: string | null
          app_status?: string | null
          app_username?: string | null
          auth_user_id?: string | null
          bank_account?: string | null
          bank_name?: string | null
          base_salary?: number
          blood_type?: string | null
          branch_id?: string
          city?: string | null
          classes?: Json | null
          classes_taught?: Json | null
          contract_end_date?: string | null
          contract_type?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          email_personal?: string | null
          email_work?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_id?: string | null
          first_name_ar?: string | null
          first_name_en?: string | null
          full_name?: string
          gender?: string | null
          graduation_year?: number | null
          hire_date?: string | null
          housing_allowance?: number | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_name_ar?: string | null
          last_name_en?: string | null
          lecture_price?: number | null
          marital_status?: string | null
          max_periods_daily?: number | null
          max_periods_weekly?: number | null
          messaging_paused?: boolean
          national_id?: string | null
          national_id_expiry?: string | null
          nationality?: string | null
          notes?: string | null
          notifications_require_approval?: boolean
          other_allowances?: number | null
          performance_score?: number | null
          phone?: string | null
          phone_secondary?: string | null
          photo?: string | null
          qualification?: string | null
          salary_type?: string | null
          school_id?: string
          second_name_ar?: string | null
          specialization?: string | null
          status?: string | null
          status_reason?: string | null
          subject?: string | null
          third_name_ar?: string | null
          transport_allowance?: number | null
          university?: string | null
          updated_at?: string | null
          weekly_hours?: number | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_activations: {
        Row: {
          created_at: string
          days: number
          ends_at: string
          id: string
          is_active: boolean
          notes: string | null
          school_id: string | null
          school_name: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          days?: number
          ends_at: string
          id?: string
          is_active?: boolean
          notes?: string | null
          school_id?: string | null
          school_name: string
          starts_at?: string
        }
        Update: {
          created_at?: string
          days?: number
          ends_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          school_id?: string | null
          school_name?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_activations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_activations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          image_url: string | null
          school_id: string
          status: string
          student_id: string | null
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          school_id: string
          status?: string
          student_id?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          school_id?: string
          status?: string
          student_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      user_page_access: {
        Row: {
          branch_id: string | null
          can_approve: boolean
          can_create: boolean
          can_delete: boolean
          can_export: boolean
          can_update: boolean
          can_view: boolean
          created_at: string
          id: string
          page_code: string
          school_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          can_approve?: boolean
          can_create?: boolean
          can_delete?: boolean
          can_export?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          page_code: string
          school_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          can_approve?: boolean
          can_create?: boolean
          can_delete?: boolean
          can_export?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          page_code?: string
          school_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_page_access_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_page_access_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_page_access_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_perm_overrides: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          is_granted: boolean
          permission_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          is_granted: boolean
          permission_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          is_granted?: boolean
          permission_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_perm_overrides_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_perm_overrides_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "perm_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_perm_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          module: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          module: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          module?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          allowed_module: string | null
          avatar_url: string | null
          branch_id: string | null
          created_at: string | null
          custom_permissions: string[] | null
          default_branch_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          full_name: string | null
          group_id: string | null
          hierarchy_level: number | null
          id: string
          is_active: boolean | null
          is_single_page_user: boolean
          job_title: string | null
          permissions: Json | null
          permissions_version: number
          phone: string | null
          role: string | null
          school_id: string | null
          school_role_id: string | null
          scope: string | null
          scope_level: string | null
        }
        Insert: {
          allowed_module?: string | null
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string | null
          custom_permissions?: string[] | null
          default_branch_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          full_name?: string | null
          group_id?: string | null
          hierarchy_level?: number | null
          id: string
          is_active?: boolean | null
          is_single_page_user?: boolean
          job_title?: string | null
          permissions?: Json | null
          permissions_version?: number
          phone?: string | null
          role?: string | null
          school_id?: string | null
          school_role_id?: string | null
          scope?: string | null
          scope_level?: string | null
        }
        Update: {
          allowed_module?: string | null
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string | null
          custom_permissions?: string[] | null
          default_branch_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          full_name?: string | null
          group_id?: string | null
          hierarchy_level?: number | null
          id?: string
          is_active?: boolean | null
          is_single_page_user?: boolean
          job_title?: string | null
          permissions?: Json | null
          permissions_version?: number
          phone?: string | null
          role?: string | null
          school_id?: string | null
          school_role_id?: string | null
          scope?: string | null
          scope_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_default_branch_id_fkey"
            columns: ["default_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "school_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_school_role_id_fkey"
            columns: ["school_role_id"]
            isOneToOne: false
            referencedRelation: "school_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_subscriptions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          platform: string
          school_id: string
          subscription_json: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          platform?: string
          school_id: string
          subscription_json: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          platform?: string
          school_id?: string
          subscription_json?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_push_subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_push_subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          branch_id: string | null
          created_at: string
          hierarchy_level: number | null
          id: string
          is_active: boolean
          role_id: string
          school_id: string
          scope_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          hierarchy_level?: number | null
          id?: string
          is_active?: boolean
          role_id: string
          school_id: string
          scope_level: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          hierarchy_level?: number | null
          id?: string
          is_active?: boolean
          role_id?: string
          school_id?: string
          scope_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          branch_id: string | null
          created_at: string | null
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          permissions: Json | null
          role: string
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role: string
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_schedule: {
        Row: {
          created_at: string | null
          day: string
          grade: string
          id: string
          period: number
          school_id: string | null
          section: string
          session_type: string | null
          subject: string | null
          teacher_id: string | null
        }
        Insert: {
          created_at?: string | null
          day: string
          grade: string
          id?: string
          period: number
          school_id?: string | null
          section: string
          session_type?: string | null
          subject?: string | null
          teacher_id?: string | null
        }
        Update: {
          created_at?: string | null
          day?: string
          grade?: string
          id?: string
          period?: number
          school_id?: string | null
          section?: string
          session_type?: string | null
          subject?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_schedule_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_schedule_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_schedule_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      school_summary_view: {
        Row: {
          active_students: number | null
          created_at: string | null
          id: string | null
          name: string | null
          total_students: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_manage_logo_bucket_object: {
        Args: { bucket_name: string; object_name: string }
        Returns: boolean
      }
      create_payment_atomic: {
        Args: {
          p_amount: number
          p_branch_id: string
          p_created_at: string
          p_manual_receipt_number: string
          p_notes: string
          p_payment_method: string
          p_receipt_number: string
          p_school_id: string
          p_student_id: string
        }
        Returns: {
          amount: number
          branch_id: string
          created_at: string
          error_code: string
          id: string
          manual_receipt_number: string
          notes: string
          paid_fee_after: number
          payment_method: string
          receipt_number: string
          remaining_fee_after: number
          school_id: string
          student_id: string
        }[]
      }
      current_app_role: { Args: never; Returns: string }
      current_managed_branch_id: { Args: never; Returns: string }
      current_school_id: { Args: never; Returns: string }
      current_student_id: { Args: never; Returns: string }
      current_teacher_id: { Args: never; Returns: string }
      current_user_can_access_branch: {
        Args: { p_branch_id: string; p_school_id: string }
        Returns: boolean
      }
      get_current_user_school_id: { Args: never; Returns: string }
      log_audit_action: {
        Args: {
          p_action: string
          p_error_message?: string
          p_new_value?: Json
          p_old_value?: Json
          p_resource_id: string
          p_resource_type: string
        }
        Returns: undefined
      }
      mark_overdue_installments: { Args: never; Returns: undefined }
      promote_year_execute: {
        Args: {
          p_promotions: Json
          p_reset_ids: string[]
          p_school_id: string
          p_terminal_ids: string[]
        }
        Returns: Json
      }
      recompute_student_payment_totals: {
        Args: { target_student_id: string }
        Returns: undefined
      }
      school_payment_students_page: {
        Args: {
          p_branch_ids?: string[]
          p_class_name?: string
          p_dir?: string
          p_page?: number
          p_page_size?: number
          p_quick_filter?: string
          p_school_id: string
          p_search?: string
          p_sort?: string
        }
        Returns: {
          address: string
          class_name: string
          discount_value: number
          full_name: string
          id: string
          paid_fee: number
          payment_count: number
          phone: string
          remaining_fee: number
          school_id: string
          section: string
          status: string
          total_count: number
          total_fee: number
        }[]
      }
      school_payments_summary: {
        Args: { p_school_id: string }
        Returns: {
          collected_count: number
          payment_years: number[]
          total_fee: number
          total_paid: number
          total_payment_count: number
          total_remaining: number
          total_students: number
        }[]
      }
      school_reports_summary: {
        Args: { p_current_month: string; p_school_id: string; p_today: string }
        Returns: {
          active_students: number
          current_month_salary_count: number
          expense_type_count: number
          expense_volume: number
          expenses_count: number
          net_balance: number
          payment_volume: number
          payments_count: number
          salaries_count: number
          salary_volume: number
          students_count: number
          today_payments: number
          total_fees: number
          total_paid: number
          total_remaining: number
        }[]
      }
      seed_default_roles_for_school: {
        Args: { p_school_id: string }
        Returns: undefined
      }
      soft_delete_student: {
        Args: { p_reason?: string; p_student_id: string }
        Returns: undefined
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
    Enums: {},
  },
} as const
