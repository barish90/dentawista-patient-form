/*
  # Add User Fields

  1. Changes
    - Add email column to users table
    - Add username column to users table
    - Update trigger function to populate email from auth.users
    - Update existing users with their email addresses
    
  2. Security
    - Maintains existing RLS policies
    - Email addresses are copied from auth.users
*/

-- Add new columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS username text;

-- Update the trigger function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.email
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing users with their email addresses
UPDATE users
SET 
  email = auth.email,
  username = COALESCE(
    auth.raw_user_meta_data->>'name',
    auth.raw_user_meta_data->>'full_name',
    auth.email
  )
FROM auth.users as auth
WHERE users.id = auth.id;

-- Add a unique constraint on email
ALTER TABLE users
ADD CONSTRAINT users_email_key UNIQUE (email);