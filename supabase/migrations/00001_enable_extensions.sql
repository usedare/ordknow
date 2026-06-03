-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Note: Supabase Auth automatically manages auth.users table
-- No need to create a separate users table; we reference auth.users directly
