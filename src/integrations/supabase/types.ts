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
      access_codes: {
        Row: {
          code: string
          course_id: string
          created_at: string
          duration_days: number
          id: string
          note: string | null
          plan: string
          updated_at: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          course_id: string
          created_at?: string
          duration_days?: number
          id?: string
          note?: string | null
          plan?: string
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          course_id?: string
          created_at?: string
          duration_days?: number
          id?: string
          note?: string | null
          plan?: string
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          created_at: string
          id: string
          kind: string
          tokens: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          tokens?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          is_pinned: boolean
          show_as_popup: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_pinned?: boolean
          show_as_popup?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_pinned?: boolean
          show_as_popup?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assignment_questions: {
        Row: {
          assignment_id: string
          correct_index: number
          created_at: string
          id: string
          kind: string
          model_answer: string | null
          options: Json
          points: number
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          assignment_id: string
          correct_index?: number
          created_at?: string
          id?: string
          kind?: string
          model_answer?: string | null
          options?: Json
          points?: number
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          correct_index?: number
          created_at?: string
          id?: string
          kind?: string
          model_answer?: string | null
          options?: Json
          points?: number
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_questions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          answers: Json
          assignment_id: string
          attachment_path: string | null
          auto_graded: boolean
          content: string | null
          created_at: string
          feedback: string | null
          file_url: string | null
          grade: number | null
          id: string
          max_score: number | null
          passed: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          assignment_id: string
          attachment_path?: string | null
          auto_graded?: boolean
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          id?: string
          max_score?: number | null
          passed?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          assignment_id?: string
          attachment_path?: string | null
          auto_graded?: boolean
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          id?: string
          max_score?: number | null
          passed?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          answer_key_text: string | null
          answer_key_url: string | null
          course_id: string | null
          created_at: string
          description: string | null
          due_at: string | null
          duration_minutes: number
          id: string
          instructions: string | null
          is_published: boolean
          lesson_id: string | null
          max_score: number
          pass_score: number
          questions_file_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          answer_key_text?: string | null
          answer_key_url?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string | null
          is_published?: boolean
          lesson_id?: string | null
          max_score?: number
          pass_score?: number
          questions_file_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          answer_key_text?: string | null
          answer_key_url?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string | null
          is_published?: boolean
          lesson_id?: string | null
          max_score?: number
          pass_score?: number
          questions_file_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      course_plans: {
        Row: {
          course_id: string
          created_at: string
          discount_percent: number
          duration_days: number
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          discount_percent?: number
          duration_days?: number
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          discount_percent?: number
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_plans_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_variants: {
        Row: {
          course_id: string
          cover_override: string | null
          created_at: string
          description_override: string | null
          id: string
          is_active: boolean
          name: string
          price_override: number | null
          title_override: string | null
          weight: number
        }
        Insert: {
          course_id: string
          cover_override?: string | null
          created_at?: string
          description_override?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_override?: number | null
          title_override?: string | null
          weight?: number
        }
        Update: {
          course_id?: string
          cover_override?: string | null
          created_at?: string
          description_override?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_override?: number | null
          title_override?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_variants_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          discount_percent: number
          grade: string | null
          id: string
          is_free: boolean
          is_published: boolean
          price: number
          price_term: number | null
          price_year: number | null
          slug: string | null
          sort_order: number
          subject_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number
          grade?: string | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          price?: number
          price_term?: number | null
          price_year?: number | null
          slug?: string | null
          sort_order?: number
          subject_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number
          grade?: string | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          price?: number
          price_term?: number | null
          price_year?: number | null
          slug?: string | null
          sort_order?: number
          subject_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          expires_at: string | null
          id: string
          progress: number
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          progress?: number
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
          watched_seconds: number
        }
        Insert: {
          completed?: boolean
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
          watched_seconds?: number
        }
        Update: {
          completed?: boolean
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          chapter_id: string | null
          course_id: string
          created_at: string
          description: string | null
          duration_min: number | null
          id: string
          is_free: boolean
          is_published: boolean
          max_views: number | null
          sort_order: number
          title: string
          transcript: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          chapter_id?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          max_views?: number | null
          sort_order?: number
          title: string
          transcript?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          chapter_id?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          max_views?: number | null
          sort_order?: number
          title?: string
          transcript?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      live_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          description: string | null
          duration_min: number | null
          id: string
          is_active: boolean
          meeting_url: string | null
          recording_url: string | null
          starts_at: string
          status: string
          stream_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          is_active?: boolean
          meeting_url?: string | null
          recording_url?: string | null
          starts_at?: string
          status?: string
          stream_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          is_active?: boolean
          meeting_url?: string | null
          recording_url?: string | null
          starts_at?: string
          status?: string
          stream_url?: string | null
          title?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          created_at: string
          file_path: string
          file_type: string
          id: string
          lesson_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_type?: string
          id?: string
          lesson_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_type?: string
          id?: string
          lesson_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          course_id: string | null
          created_at: string
          duration_days: number | null
          id: string
          method: string | null
          plan: string | null
          plan_name: string | null
          proof_url: string | null
          reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          course_id?: string | null
          created_at?: string
          duration_days?: number | null
          id?: string
          method?: string | null
          plan?: string | null
          plan_name?: string | null
          proof_url?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          course_id?: string | null
          created_at?: string
          duration_days?: number | null
          id?: string
          method?: string | null
          plan?: string | null
          plan_name?: string | null
          proof_url?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          grade: string | null
          id: string
          is_active: boolean
          parent_phone: string | null
          phone: string | null
          points: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          grade?: string | null
          id: string
          is_active?: boolean
          parent_phone?: string | null
          phone?: string | null
          points?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          grade?: string | null
          id?: string
          is_active?: boolean
          parent_phone?: string | null
          phone?: string | null
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          max_score: number
          passed: boolean
          quiz_id: string
          score: number
          submitted_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          max_score?: number
          passed?: boolean
          quiz_id: string
          score?: number
          submitted_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          max_score?: number
          passed?: boolean
          quiz_id?: string
          score?: number
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string | null
          correct_index: number
          id: string
          kind: string
          model_answer: string | null
          options: Json
          points: number
          prompt: string | null
          question: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          correct_answer?: string | null
          correct_index?: number
          id?: string
          kind?: string
          model_answer?: string | null
          options?: Json
          points?: number
          prompt?: string | null
          question: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          correct_answer?: string | null
          correct_index?: number
          id?: string
          kind?: string
          model_answer?: string | null
          options?: Json
          points?: number
          prompt?: string | null
          question?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          answer_key_text: string | null
          answer_key_url: string | null
          course_id: string | null
          created_at: string
          description: string | null
          duration_min: number | null
          duration_minutes: number | null
          id: string
          is_published: boolean
          lesson_id: string | null
          pass_score: number
          questions_file_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          answer_key_text?: string | null
          answer_key_url?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean
          lesson_id?: string | null
          pass_score?: number
          questions_file_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          answer_key_text?: string | null
          answer_key_url?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean
          lesson_id?: string | null
          pass_score?: number
          questions_file_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          marquee_enabled: boolean
          marquee_text: string | null
          payment_instapay: string | null
          payment_note: string | null
          payment_phone: string | null
          updated_at: string
        }
        Insert: {
          id: string
          marquee_enabled?: boolean
          marquee_text?: string | null
          payment_instapay?: string | null
          payment_note?: string | null
          payment_phone?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          marquee_enabled?: boolean
          marquee_text?: string | null
          payment_instapay?: string | null
          payment_note?: string | null
          payment_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_published: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string
          device_fingerprint: string
          device_name: string
          id: string
          is_blocked: boolean
          last_seen_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          device_name: string
          id?: string
          is_blocked?: boolean
          last_seen_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          device_name?: string
          id?: string
          is_blocked?: boolean
          last_seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      variant_events: {
        Row: {
          course_id: string
          created_at: string
          event: string
          id: string
          session_key: string | null
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          event: string
          id?: string
          session_key?: string | null
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          event?: string
          id?: string
          session_key?: string | null
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: []
      }
      video_views: {
        Row: {
          device_id: string | null
          id: string
          lesson_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          device_id?: string | null
          id?: string
          lesson_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          device_id?: string | null
          id?: string
          lesson_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_views_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_payment: {
        Args: { _payment_id: string; _status: string }
        Returns: undefined
      }
      can_read_assessment_object: { Args: { _name: string }; Returns: boolean }
      can_read_course_object: { Args: { _name: string }; Returns: boolean }
      generate_access_codes:
        | {
            Args: {
              _count: number
              _course_id: string
              _note?: string
              _plan?: string
            }
            Returns: {
              code: string
            }[]
          }
        | {
            Args: {
              _count: number
              _course_id: string
              _duration_days?: number
              _note?: string
              _plan?: string
            }
            Returns: {
              code: string
            }[]
          }
      get_assignment_questions_for_student: {
        Args: { _assignment_id: string }
        Returns: {
          id: string
          kind: string
          options: Json
          points: number
          question: string
          sort_order: number
        }[]
      }
      get_assignments_catalog: {
        Args: never
        Returns: {
          course_id: string
          description: string
          due_at: string
          duration_minutes: number
          id: string
          instructions: string
          lesson_id: string
          max_score: number
          pass_score: number
          question_count: number
          questions_file_url: string
          title: string
        }[]
      }
      get_lessons_catalog: {
        Args: { _course_id: string }
        Returns: {
          chapter_id: string
          description: string
          duration_min: number
          id: string
          is_free: boolean
          sort_order: number
          title: string
        }[]
      }
      get_live_sessions_catalog: {
        Args: never
        Returns: {
          description: string
          duration_min: number
          id: string
          starts_at: string
          title: string
        }[]
      }
      get_playable_lessons: {
        Args: { _course_id: string }
        Returns: {
          current_views: number
          description: string
          id: string
          is_free: boolean
          max_views: number
          title: string
          video_url: string
        }[]
      }
      get_quiz_questions_for_student: {
        Args: { _quiz_id: string }
        Returns: {
          id: string
          kind: string
          options: Json
          points: number
          question: string
          sort_order: number
        }[]
      }
      get_quizzes_catalog: {
        Args: never
        Returns: {
          course_id: string
          description: string
          duration_minutes: number
          id: string
          pass_score: number
          question_count: number
          title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      redeem_access_code: { Args: { _code: string }; Returns: undefined }
      submit_assignment_answers: {
        Args: { _answers: Json; _assignment_id: string }
        Returns: {
          max_score: number
          passed: boolean
          score: number
          submission_id: string
        }[]
      }
      submit_quiz_attempt: {
        Args: { _answers: Json; _quiz_id: string }
        Returns: {
          attempt_id: string
          max_score: number
          passed: boolean
          score: number
        }[]
      }
      track_video_view: { Args: { _lesson_id: string }; Returns: undefined }
      validate_coupon: {
        Args: { _code: string }
        Returns: {
          code: string
          discount_percent: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
