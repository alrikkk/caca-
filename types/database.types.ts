export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          headline: string | null;
          college: string;
          major: string;
          grad_year: number;
          experience_level: 'freshman' | 'sophomore' | 'junior' | 'senior' | 'grad' | 'alumni';
          bio: string | null;
          phone_number: string | null;
          avatar_url: string | null;
          github_url: string | null;
          portfolio_url: string | null;
          linkedin_url: string | null;
          open_to: string[] | null;
          availability_status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          headline?: string | null;
          college: string;
          major: string;
          grad_year: number;
          experience_level: 'freshman' | 'sophomore' | 'junior' | 'senior' | 'grad' | 'alumni';
          bio?: string | null;
          phone_number?: string | null;
          avatar_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          linkedin_url?: string | null;
          open_to?: string[] | null;
          availability_status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      skills: {
        Row: {
          id: string;
          name: string;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['skills']['Insert']>;
      };
      user_skills: {
        Row: {
          id: string;
          user_id: string;
          skill_id: string;
          proficiency: number;
          years_experience: number;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          skill_id: string;
          proficiency: number;
          years_experience?: number;
          verified?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_skills']['Insert']>;
      };
      interests: {
        Row: {
          id: string;
          name: string;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['interests']['Insert']>;
      };
      user_interests: {
        Row: {
          id: string;
          user_id: string;
          interest_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          interest_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_interests']['Insert']>;
      };
      availability: {
        Row: {
          id: string;
          user_id: string;
          hours_per_week: number;
          timezone: string;
          prefers_remote: boolean;
          weekend_availability: boolean;
          weekday_evenings: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          hours_per_week: number;
          timezone?: string;
          prefers_remote?: boolean;
          weekend_availability?: boolean;
          weekday_evenings?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['availability']['Insert']>;
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          tagline: string;
          description: string;
          category: string;
          status: 'draft' | 'recruiting' | 'in_progress' | 'completed' | 'archived';
          max_team_size: number;
          duration_weeks: number;
          hours_per_week: number;
          banner_url: string | null;
          github_repo: string | null;
          demo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          tagline: string;
          description: string;
          category: string;
          status?: 'draft' | 'recruiting' | 'in_progress' | 'completed' | 'archived';
          max_team_size?: number;
          duration_weeks?: number;
          hours_per_week?: number;
          banner_url?: string | null;
          github_repo?: string | null;
          demo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      project_skills: {
        Row: {
          id: string;
          project_id: string;
          skill_id: string;
          required_proficiency: number;
          importance: 'required' | 'preferred' | 'nice_to_have';
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          skill_id: string;
          required_proficiency?: number;
          importance?: 'required' | 'preferred' | 'nice_to_have';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['project_skills']['Insert']>;
      };
      applications: {
        Row: {
          id: string;
          project_id: string;
          applicant_id: string;
          status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
          pitch_note: string | null;
          compatibility_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          applicant_id: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
          pitch_note?: string | null;
          compatibility_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['applications']['Insert']>;
      };
      teams: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          team_compatibility_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          team_compatibility_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['teams']['Insert']>;
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role_title: string;
          is_lead: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          role_title: string;
          is_lead?: boolean;
          joined_at?: string;
        };
        Update: Partial<Database['public']['Tables']['team_members']['Insert']>;
      };
      team_invitations: {
        Row: {
          id: string;
          team_id: string;
          project_id: string;
          inviter_id: string;
          invitee_id: string;
          role_title: string;
          status: 'pending' | 'accepted' | 'declined';
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          project_id: string;
          inviter_id: string;
          invitee_id: string;
          role_title?: string;
          status?: 'pending' | 'accepted' | 'declined';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['team_invitations']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: 'invitation' | 'application_status' | 'info';
          link: string | null;
          metadata: Json;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: 'invitation' | 'application_status' | 'info';
          link?: string | null;
          metadata?: Json;
          read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      conversations: {
        Row: {
          id: string;
          name: string | null;
          is_group: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          is_group?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: Partial<Database['public']['Tables']['conversation_members']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['follows']['Insert']>;
      };
      clips: {
        Row: {
          id: string;
          creator_id: string;
          project_id: string | null;
          video_url: string;
          thumbnail_url: string | null;
          caption: string;
          tags: string[];
          likes_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          project_id?: string | null;
          video_url: string;
          thumbnail_url?: string | null;
          caption: string;
          tags?: string[];
          likes_count?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['clips']['Insert']>;
      };
      clip_likes: {
        Row: {
          clip_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          clip_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['clip_likes']['Insert']>;
      };
      project_bookmarks: {
        Row: {
          user_id: string;
          project_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          project_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['project_bookmarks']['Insert']>;
      };
    };
  };
}
