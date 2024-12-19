-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create boards table
CREATE TABLE boards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  archived BOOLEAN DEFAULT FALSE
);

-- Create board_members table (replaces the members array in your MongoDB schema)
CREATE TABLE board_members (
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (board_id, user_id)
);

-- Create categories table
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  archived BOOLEAN DEFAULT FALSE
);

-- Create cards table
CREATE TABLE cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  archived BOOLEAN DEFAULT FALSE
);

-- Create indexes for better query performance
CREATE INDEX idx_board_members_board_id ON board_members(board_id);
CREATE INDEX idx_board_members_user_id ON board_members(user_id);
CREATE INDEX idx_categories_board_id ON categories(board_id);
CREATE INDEX idx_cards_board_id ON cards(board_id);
CREATE INDEX idx_cards_category_id ON cards(category_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at
    BEFORE UPDATE ON boards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at
    BEFORE UPDATE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create roles
CREATE ROLE app_user;
CREATE ROLE app_admin;

-- Enable RLS on tables
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;

GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE boards TO app_user;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE categories TO app_user;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE cards TO app_user;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE board_members TO app_user;

GRANT INSERT, SELECT ON TABLE users TO app_admin;

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('jwt.claims.user_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

-- Helper function to check if user is board member
CREATE OR REPLACE FUNCTION is_board_member(board_id UUID) 
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM board_members 
    WHERE board_id = $1 
    AND user_id = current_user_id()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Boards policies
CREATE POLICY board_select_policy ON boards
  FOR SELECT
  USING (is_board_member(id));

CREATE POLICY board_insert_policy ON boards
  FOR INSERT
  WITH CHECK (true);  -- Everyone can create boards

CREATE POLICY board_update_policy ON boards
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM board_members 
    WHERE board_id = id 
    AND user_id = current_user_id()
    AND 'write' = ANY(scopes)
  ));

CREATE POLICY board_members_select ON board_members
  FOR SELECT
  TO app_user
  USING (true);

-- Categories policies
CREATE POLICY category_select_policy ON categories
  FOR SELECT
  USING (is_board_member(board_id));

CREATE POLICY category_modify_policy ON categories
  FOR ALL
  USING (is_board_member(board_id))
  WITH CHECK (is_board_member(board_id));

-- Cards policies
CREATE POLICY card_select_policy ON cards
  FOR SELECT
  USING (is_board_member(board_id));

CREATE POLICY card_modify_policy ON cards
  FOR ALL
  USING (is_board_member(board_id))
  WITH CHECK (is_board_member(board_id));

CREATE OR REPLACE FUNCTION create_board(
  p_title TEXT
) RETURNS boards AS $$
DECLARE
  v_board_id UUID;
  v_board boards;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := current_user_id();

  -- Insert the board
  INSERT INTO boards (title)
  VALUES (p_title)
  RETURNING id INTO v_board_id;

  -- Add the creator as a board member with all permissions
  INSERT INTO board_members (board_id, user_id, scopes)
  VALUES (v_board_id, v_user_id, ARRAY['owner', 'write', 'read']);

  -- Return the created board
  SELECT * INTO v_board FROM boards WHERE id = v_board_id;
  RETURN v_board;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;