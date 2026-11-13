-- =============================================================================
-- PUSHUP ARENA: CORE DATABASE MIGRATION & RLS POLICIES
-- File: supabase/migrations/20260101_init.sql
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 2. CORE TABLES & ENUMS
-- =============================================================================

-- 2.1 Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  height_cm numeric(5,2),
  weight_kg numeric(5,2),
  fitness_level text CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
  is_pro boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2.2 Exercises Table
CREATE TABLE IF NOT EXISTS public.exercises (
  id text PRIMARY KEY,
  name text NOT NULL,
  rules_version text NOT NULL,
  is_active boolean DEFAULT true NOT NULL
);

-- Seed standard pushup exercise
INSERT INTO public.exercises (id, name, rules_version, is_active)
VALUES ('pushups', 'Standard Push-up v1.0', '1.0.0', true)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, rules_version = EXCLUDED.rules_version;

-- 2.3 User Ratings Table
CREATE TABLE IF NOT EXISTS public.ratings (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_id text REFERENCES public.exercises(id) ON DELETE CASCADE,
  mu numeric(8,3) DEFAULT 1200.000 NOT NULL,
  tier text DEFAULT 'Bronze' NOT NULL CHECK (tier IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master')),
  matches_played int DEFAULT 0 NOT NULL,
  wins int DEFAULT 0 NOT NULL,
  losses int DEFAULT 0 NOT NULL,
  draws int DEFAULT 0 NOT NULL,
  best_rep_count int DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, exercise_id)
);

-- 2.4 Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  exercise_id text REFERENCES public.exercises(id) NOT NULL,
  match_type text NOT NULL CHECK (match_type IN ('casual_private', 'ranked_random', 'solo_timed')),
  status text NOT NULL CHECK (status IN ('lobby', 'in_progress', 'completed', 'abandoned', 'disputed')),
  target_reps int,
  duration_seconds int DEFAULT 60 NOT NULL,
  server_start_time timestamptz,
  server_end_time timestamptz,
  winner_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2.5 Match Participants Table
CREATE TABLE IF NOT EXISTS public.match_participants (
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  final_score int DEFAULT 0 NOT NULL,
  rating_delta numeric(6,2) DEFAULT 0.00 NOT NULL,
  telemetry_summary jsonb DEFAULT '[]'::jsonb NOT NULL,
  is_ready boolean DEFAULT false NOT NULL,
  has_consented_video boolean DEFAULT false NOT NULL,
  PRIMARY KEY (match_id, user_id)
);

-- 2.6 Private Rooms Table
CREATE TABLE IF NOT EXISTS public.private_rooms (
  code varchar(6) PRIMARY KEY,
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  host_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_id text REFERENCES public.exercises(id) DEFAULT 'pushups' NOT NULL,
  duration_seconds int DEFAULT 60 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL
);

-- 2.7 Matchmaking Queue Table
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  exercise_id text REFERENCES public.exercises(id) NOT NULL,
  rating numeric(8,3) NOT NULL,
  queued_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 3. INDEXES FOR PERFORMANCE & FAST LOOKUPS
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_ratings_leaderboard ON public.ratings(exercise_id, mu DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_tier ON public.ratings(tier);
CREATE INDEX IF NOT EXISTS idx_matches_status_type ON public.matches(status, match_type);
CREATE INDEX IF NOT EXISTS idx_match_participants_user ON public.match_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_private_rooms_active ON public.private_rooms(code, is_active);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_exercise ON public.matchmaking_queue(exercise_id, rating);

-- =============================================================================
-- 4. UTILITY & AUTOMATION FUNCTIONS
-- =============================================================================

-- 4.1 Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_ratings_updated_at ON public.ratings;
CREATE TRIGGER set_ratings_updated_at
BEFORE UPDATE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4.2 Tier calculation function based on Elo rating
CREATE OR REPLACE FUNCTION public.calculate_tier(p_mu numeric)
RETURNS text AS $$
BEGIN
  IF p_mu >= 2100.0 THEN
    RETURN 'Master';
  ELSIF p_mu >= 1900.0 THEN
    RETURN 'Diamond';
  ELSIF p_mu >= 1700.0 THEN
    RETURN 'Platinum';
  ELSIF p_mu >= 1500.0 THEN
    RETURN 'Gold';
  ELSIF p_mu >= 1300.0 THEN
    RETURN 'Silver';
  ELSE
    RETURN 'Bronze';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4.3 Trigger on auth.users for new user onboarding
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username text;
  v_display_name text;
BEGIN
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'athlete_' || substr(NEW.id::text, 1, 8)
  );

  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    'Challenger ' || substr(NEW.id::text, 1, 4)
  );

  -- Create public profile
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    fitness_level,
    is_pro,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_username,
    v_display_name,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'fitness_level', 'intermediate'),
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create default ratings record for pushups
  INSERT INTO public.ratings (
    user_id,
    exercise_id,
    mu,
    tier,
    matches_played,
    wins,
    losses,
    draws,
    best_rep_count,
    updated_at
  ) VALUES (
    NEW.id,
    'pushups',
    1200.000,
    'Bronze',
    0,
    0,
    0,
    0,
    0,
    now()
  )
  ON CONFLICT (user_id, exercise_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 5. MATCH FINALIZATION & ELO RATING SHIFT PROCEDURE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.finalize_match(p_match_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_match record;
  v_p1 record;
  v_p2 record;
  v_winner_id uuid := NULL;
  v_is_draw boolean := false;
  v_k1 numeric := 16.0;
  v_k2 numeric := 16.0;
  v_expected_1 numeric;
  v_expected_2 numeric;
  v_actual_1 numeric := 0.5;
  v_actual_2 numeric := 0.5;
  v_delta_1 numeric := 0.00;
  v_delta_2 numeric := 0.00;
  v_r1 record;
  v_r2 record;
  v_caller uuid;
BEGIN
  v_caller := auth.uid();

  -- Retrieve match details
  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match with ID % not found', p_match_id;
  END IF;

  -- Authorization check: caller must be a participant or service role
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.match_participants
    WHERE match_id = p_match_id AND user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not a participant in this match.';
  END IF;

  -- Prevent duplicate finalization
  IF v_match.status = 'completed' THEN
    RETURN jsonb_build_object(
      'status', 'already_completed',
      'match_id', p_match_id,
      'winner_id', v_match.winner_id
    );
  END IF;

  -- Case A: Solo Timed Practice Match
  IF v_match.match_type = 'solo_timed' THEN
    SELECT * INTO v_p1
    FROM public.match_participants
    WHERE match_id = p_match_id
    LIMIT 1;

    IF FOUND THEN
      -- Update highest score and matches played
      UPDATE public.ratings
      SET 
        matches_played = matches_played + 1,
        best_rep_count = GREATEST(best_rep_count, v_p1.final_score),
        updated_at = now()
      WHERE user_id = v_p1.user_id AND exercise_id = v_match.exercise_id;

      UPDATE public.matches
      SET 
        status = 'completed',
        winner_id = v_p1.user_id,
        server_end_time = COALESCE(server_end_time, now())
      WHERE id = p_match_id;

      RETURN jsonb_build_object(
        'status', 'completed',
        'match_type', 'solo_timed',
        'user_id', v_p1.user_id,
        'final_score', v_p1.final_score
      );
    END IF;
  END IF;

  -- Case B: 1v1 Competitive Matches (ranked_random or casual_private)
  DECLARE
    v_participants record[];
  BEGIN
    SELECT array_agg(mp) INTO v_participants
    FROM (
      SELECT * FROM public.match_participants
      WHERE match_id = p_match_id
      ORDER BY user_id ASC
    ) mp;

    IF array_length(v_participants, 1) < 2 THEN
      -- Single player remaining (forfeit/abandon scenario)
      v_p1 := v_participants[1];
      UPDATE public.matches
      SET 
        status = 'completed',
        winner_id = v_p1.user_id,
        server_end_time = COALESCE(server_end_time, now())
      WHERE id = p_match_id;

      RETURN jsonb_build_object(
        'status', 'completed',
        'winner_id', v_p1.user_id,
        'note', 'forfeit_win'
      );
    END IF;

    v_p1 := v_participants[1];
    v_p2 := v_participants[2];

    -- Determine winner based on reps
    IF v_p1.final_score > v_p2.final_score THEN
      v_winner_id := v_p1.user_id;
      v_actual_1 := 1.0;
      v_actual_2 := 0.0;
    ELSIF v_p2.final_score > v_p1.final_score THEN
      v_winner_id := v_p2.user_id;
      v_actual_1 := 0.0;
      v_actual_2 := 1.0;
    ELSE
      v_is_draw := true;
      v_winner_id := NULL;
      v_actual_1 := 0.5;
      v_actual_2 := 0.5;
    END IF;

    -- Fetch current rating records
    SELECT * INTO v_r1 FROM public.ratings
    WHERE user_id = v_p1.user_id AND exercise_id = v_match.exercise_id
    FOR UPDATE;

    SELECT * INTO v_r2 FROM public.ratings
    WHERE user_id = v_p2.user_id AND exercise_id = v_match.exercise_id
    FOR UPDATE;

    -- Calculate rating shift only for ranked matches (bypassed in casual_private to prevent win-trading)
    IF v_match.match_type = 'ranked_random' THEN
      -- Dynamic K-factor (K=32 for placements/unranked, K=16 for seasoned)
      IF v_r1.matches_played < 20 THEN v_k1 := 32.0; ELSE v_k1 := 16.0; END IF;
      IF v_r2.matches_played < 20 THEN v_k2 := 32.0; ELSE v_k2 := 16.0; END IF;

      -- Standard Elo Expected Score: E_A = 1 / (1 + 10^((R_B - R_A)/400))
      v_expected_1 := 1.0 / (1.0 + power(10.0, (v_r2.mu - v_r1.mu) / 400.0));
      v_expected_2 := 1.0 / (1.0 + power(10.0, (v_r1.mu - v_r2.mu) / 400.0));

      -- Rating shift: Delta = K * (Actual - Expected)
      v_delta_1 := ROUND(v_k1 * (v_actual_1 - v_expected_1), 2);
      v_delta_2 := ROUND(v_k2 * (v_actual_2 - v_expected_2), 2);
    ELSE
      v_delta_1 := 0.00;
      v_delta_2 := 0.00;
    END IF;

    -- Update match participants with individual rating deltas
    UPDATE public.match_participants
    SET rating_delta = v_delta_1
    WHERE match_id = p_match_id AND user_id = v_p1.user_id;

    UPDATE public.match_participants
    SET rating_delta = v_delta_2
    WHERE match_id = p_match_id AND user_id = v_p2.user_id;

    -- Atomically update Participant 1 Ratings
    UPDATE public.ratings
    SET 
      mu = GREATEST(100.000, mu + v_delta_1),
      tier = public.calculate_tier(GREATEST(100.000, mu + v_delta_1)),
      matches_played = matches_played + 1,
      wins = wins + CASE WHEN v_winner_id = v_p1.user_id THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN v_winner_id = v_p2.user_id THEN 1 ELSE 0 END,
      draws = draws + CASE WHEN v_is_draw THEN 1 ELSE 0 END,
      best_rep_count = GREATEST(best_rep_count, v_p1.final_score),
      updated_at = now()
    WHERE user_id = v_p1.user_id AND exercise_id = v_match.exercise_id;

    -- Atomically update Participant 2 Ratings
    UPDATE public.ratings
    SET 
      mu = GREATEST(100.000, mu + v_delta_2),
      tier = public.calculate_tier(GREATEST(100.000, mu + v_delta_2)),
      matches_played = matches_played + 1,
      wins = wins + CASE WHEN v_winner_id = v_p2.user_id THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN v_winner_id = v_p1.user_id THEN 1 ELSE 0 END,
      draws = draws + CASE WHEN v_is_draw THEN 1 ELSE 0 END,
      best_rep_count = GREATEST(best_rep_count, v_p2.final_score),
      updated_at = now()
    WHERE user_id = v_p2.user_id AND exercise_id = v_match.exercise_id;

    -- Complete the match
    UPDATE public.matches
    SET 
      status = 'completed',
      winner_id = v_winner_id,
      server_end_time = COALESCE(server_end_time, now())
    WHERE id = p_match_id;

    RETURN jsonb_build_object(
      'status', 'completed',
      'match_id', p_match_id,
      'match_type', v_match.match_type,
      'winner_id', v_winner_id,
      'is_draw', v_is_draw,
      'participant_1', jsonb_build_object('id', v_p1.user_id, 'score', v_p1.final_score, 'delta', v_delta_1),
      'participant_2', jsonb_build_object('id', v_p2.user_id, 'score', v_p2.final_score, 'delta', v_delta_2)
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- 6.1 Profiles Policies
CREATE POLICY "Profiles are readable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6.2 Exercises Policies
CREATE POLICY "Exercises are viewable by everyone"
  ON public.exercises FOR SELECT
  USING (true);

-- 6.3 Ratings Policies (Client direct mutation forbidden; managed via finalize_match)
CREATE POLICY "Ratings are viewable by everyone"
  ON public.ratings FOR SELECT
  USING (true);

-- 6.4 Matches Policies
CREATE POLICY "Matches visible to participants or ranked lobbies"
  ON public.matches FOR SELECT
  USING (
    match_type = 'ranked_random' 
    OR auth.uid() IN (SELECT user_id FROM public.match_participants WHERE match_id = id)
  );

CREATE POLICY "Authenticated users can create matches"
  ON public.matches FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Participants can update their match state"
  ON public.matches FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.match_participants WHERE match_id = id));

-- 6.5 Match Participants Policies
CREATE POLICY "Participants can view players in their match"
  ON public.match_participants FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM public.match_participants mp WHERE mp.match_id = match_participants.match_id)
  );

CREATE POLICY "Users can join as match participant"
  ON public.match_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participant state"
  ON public.match_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6.6 Private Rooms Policies
CREATE POLICY "Private rooms are queryable by code"
  ON public.private_rooms FOR SELECT
  USING (true);

CREATE POLICY "Hosts can create private rooms"
  ON public.private_rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their private room"
  ON public.private_rooms FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their private room"
  ON public.private_rooms FOR DELETE
  USING (auth.uid() = host_id);

-- 6.7 Matchmaking Queue Policies
CREATE POLICY "Users can inspect their matchmaking status"
  ON public.matchmaking_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can enter the matchmaking queue"
  ON public.matchmaking_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave the matchmaking queue"
  ON public.matchmaking_queue FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 7. REALTIME REPLICATION CONFIGURATION
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_participants;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.private_rooms;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if tables are already in the publication or restricted
END $$;

