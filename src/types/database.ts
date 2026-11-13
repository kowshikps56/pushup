/**
 * Database schema domain models and Supabase type definitions for PushUp Arena.
 */

export type FitnessLevel = "beginner" | "intermediate" | "advanced" | "elite";

export type TierType =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Master";

export type MatchType = "casual_private" | "ranked_random" | "solo_timed";

export type MatchStatus =
  | "lobby"
  | "in_progress"
  | "completed"
  | "abandoned"
  | "disputed";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_level: FitnessLevel | null;
  is_pro: boolean;
  created_at: string;
  updated_at: string;
};

export type Exercise = {
  id: string;
  name: string;
  rules_version: string;
  is_active: boolean;
};

export type UserRating = {
  user_id: string;
  exercise_id: string;
  mu: number;
  tier: TierType;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  best_rep_count: number;
  updated_at: string;
};

export type MatchSession = {
  id: string;
  exercise_id: string;
  match_type: MatchType;
  status: MatchStatus;
  target_reps: number | null;
  duration_seconds: number;
  server_start_time: string | null;
  server_end_time: string | null;
  winner_id: string | null;
  created_at: string;
};

export type MatchParticipant = {
  match_id: string;
  user_id: string;
  final_score: number;
  rating_delta: number;
  telemetry_summary: unknown[];
  is_ready: boolean;
  has_consented_video: boolean;
};

export type PrivateRoom = {
  code: string;
  match_id: string;
  host_id: string;
  exercise_id: string;
  duration_seconds: number;
  is_active: boolean;
  created_at: string;
  expires_at: string;
};

export type MatchmakingQueueEntry = {
  user_id: string;
  exercise_id: string;
  rating: number;
  queued_at: string;
};

/**
 * Supabase Database interface mapping tables to their row types.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Omit<Profile, "id" | "username">> & Pick<Profile, "id" | "username">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      exercises: {
        Row: Exercise;
        Insert: Exercise;
        Update: Partial<Exercise>;
        Relationships: [];
      };
      ratings: {
        Row: UserRating;
        Insert: Partial<Omit<UserRating, "user_id" | "exercise_id">> & Pick<UserRating, "user_id" | "exercise_id">;
        Update: Partial<UserRating>;
        Relationships: [];
      };
      matches: {
        Row: MatchSession;
        Insert: Partial<Omit<MatchSession, "id" | "exercise_id" | "match_type" | "status">> &
          Pick<MatchSession, "exercise_id" | "match_type" | "status"> & { id?: string };
        Update: Partial<MatchSession>;
        Relationships: [];
      };
      match_participants: {
        Row: MatchParticipant;
        Insert: Partial<Omit<MatchParticipant, "match_id" | "user_id">> & Pick<MatchParticipant, "match_id" | "user_id">;
        Update: Partial<MatchParticipant>;
        Relationships: [];
      };
      private_rooms: {
        Row: PrivateRoom;
        Insert: Partial<Omit<PrivateRoom, "code" | "match_id" | "host_id" | "expires_at">> &
          Pick<PrivateRoom, "code" | "match_id" | "host_id" | "expires_at">;
        Update: Partial<PrivateRoom>;
        Relationships: [];
      };
      matchmaking_queue: {
        Row: MatchmakingQueueEntry;
        Insert: Partial<Omit<MatchmakingQueueEntry, "user_id" | "exercise_id" | "rating">> &
          Pick<MatchmakingQueueEntry, "user_id" | "exercise_id" | "rating">;
        Update: Partial<MatchmakingQueueEntry>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      calculate_elo_exchange: {
        Args: {
          player_a_id: string;
          player_b_id: string;
          score_a: number;
          score_b: number;
        };
        Returns: {
          player_a_delta: number;
          player_b_delta: number;
        };
      };
      finalize_match: {
        Args: {
          p_match_id: string;
        };
        Returns: {
          status: string;
          match_id?: string;
          winner_id?: string | null;
          is_draw?: boolean;
          participant_1?: { id: string; score: number; delta: number };
          participant_2?: { id: string; score: number; delta: number };
          [key: string]: unknown;
        };
      };
      calculate_tier: {
        Args: {
          p_mu: number;
        };
        Returns: TierType;
      };
    };
    Enums: {
      fitness_level: FitnessLevel;
      tier_type: TierType;
      match_type: MatchType;
      match_status: MatchStatus;
    };
  };
};
