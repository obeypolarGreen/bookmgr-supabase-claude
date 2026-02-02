-- ============================================================================
-- BOOKMARK MANAGER - SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor to set up the database
-- https://app.supabase.com/project/_/sql

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- Folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_private BOOLEAN DEFAULT FALSE,
  share_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: One URL per user (prevent duplicates)
  UNIQUE(user_id, url)
);

-- ============================================================================
-- 2. CREATE INDEXES FOR BETTER PERFORMANCE
-- ============================================================================

-- Bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder_id ON bookmarks(folder_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_share_id ON bookmarks(share_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_tags ON bookmarks USING GIN(tags);

-- Folders indexes
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_created_at ON folders(created_at);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Folders Policies: Users can only manage their own folders
CREATE POLICY "Users can view own folders" 
  ON folders FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders" 
  ON folders FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" 
  ON folders FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" 
  ON folders FOR DELETE 
  USING (auth.uid() = user_id);

-- Bookmarks Policies: Users can manage own bookmarks, anyone can view shared
CREATE POLICY "Users can view own bookmarks" 
  ON bookmarks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view shared bookmarks" 
  ON bookmarks FOR SELECT 
  USING (share_id IS NOT NULL);

CREATE POLICY "Users can create own bookmarks" 
  ON bookmarks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks" 
  ON bookmarks FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" 
  ON bookmarks FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. CREATE FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. CREATE TRIGGERS
-- ============================================================================

-- Trigger to update updated_at on folders
CREATE TRIGGER update_folders_updated_at 
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on bookmarks
CREATE TRIGGER update_bookmarks_updated_at 
  BEFORE UPDATE ON bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. CREATE DEFAULT FOLDER FOR NEW USERS (OPTIONAL)
-- ============================================================================

-- Function to create default folder for new users
CREATE OR REPLACE FUNCTION create_default_folder()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO folders (user_id, name, is_default)
  VALUES (NEW.id, 'All Bookmarks', TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default folder when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_folder();

-- ============================================================================
-- 8. HELPER VIEWS (OPTIONAL)
-- ============================================================================

-- View to get bookmark counts per folder
CREATE OR REPLACE VIEW folder_bookmark_counts AS
SELECT 
  f.id AS folder_id,
  f.name AS folder_name,
  f.user_id,
  COUNT(b.id) AS bookmark_count
FROM folders f
LEFT JOIN bookmarks b ON f.id = b.folder_id
GROUP BY f.id, f.name, f.user_id;

-- View to get tag statistics
CREATE OR REPLACE VIEW tag_statistics AS
SELECT 
  user_id,
  UNNEST(tags) AS tag,
  COUNT(*) AS usage_count
FROM bookmarks
GROUP BY user_id, tag
ORDER BY usage_count DESC;

-- ============================================================================
-- 9. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================================================

-- Uncomment to insert sample data (replace 'your-user-id' with actual UUID)
/*
INSERT INTO folders (user_id, name, is_default) VALUES
  ('your-user-id', 'Work', FALSE),
  ('your-user-id', 'Personal', FALSE),
  ('your-user-id', 'Learning', FALSE);

INSERT INTO bookmarks (user_id, folder_id, url, title, description, tags) VALUES
  ('your-user-id', 
   (SELECT id FROM folders WHERE name = 'Work' AND user_id = 'your-user-id'), 
   'https://github.com', 
   'GitHub', 
   'Code hosting platform',
   ARRAY['development', 'git']
  );
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify your setup:

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('folders', 'bookmarks');

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('folders', 'bookmarks');

-- Check policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('folders', 'bookmarks');

-- Count indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('folders', 'bookmarks');

-- ============================================================================
-- DONE! Your database is ready to use.
-- ============================================================================
-- Next steps:
-- 1. Copy your Supabase URL and anon key to .env.local
-- 2. Run: npm install
-- 3. Run: npm run dev
-- 4. Start bookmarking!
-- ============================================================================
