export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Board {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  archived: boolean;
}

export interface BoardMember {
  board_id: string;
  user_id: string;
  scopes: string[];
  created_at: Date;
}

export interface Category {
  id: string;
  title: string;
  board_id: string;
  position: number;
  created_at: Date;
  updated_at: Date;
  archived: boolean;
}

export interface Card {
  id: string;
  title: string;
  description?: string;
  category_id: string;
  board_id: string;
  position: number;
  created_at: Date;
  updated_at: Date;
  archived: boolean;
}
