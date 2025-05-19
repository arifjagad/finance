/*
  # Add Budget and Investment Features

  1. Alter Tables
    - Add budget column to categories table
    - Add recurring transaction fields to transactions table
    
  2. New Tables
    - `investments` table for tracking investment portfolio
    
  3. Security
    - Enable RLS on new table
    - Add policies for authenticated users
*/

-- Add budget column to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS budget NUMERIC;

-- Add recurring transaction fields
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_interval TEXT CHECK (recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS recurring_end_date TEXT;

-- Create investments table
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stocks', 'crypto', 'bonds', 'real_estate', 'other')),
  amount_invested NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL,
  purchase_date TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high'))
);

-- Enable RLS on investments table
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Investment policies
CREATE POLICY "Users can view their own investments"
  ON investments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investments"
  ON investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments"
  ON investments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investments"
  ON investments FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);