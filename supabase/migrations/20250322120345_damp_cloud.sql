/*
  # Fix Admin Access and Policies

  1. Changes
    - Add policy for admins to manage users
    - Update make_user_admin function with proper checks
    - Add policy for admins to manage all patient records
    
  2. Security
    - Ensure proper role-based access control
    - Add validation to prevent unauthorized role changes
*/

-- Drop existing make_user_admin function
DROP FUNCTION IF EXISTS make_user_admin;

-- Create improved make_user_admin function with proper checks
CREATE OR REPLACE FUNCTION make_user_admin(user_email text)
RETURNS boolean AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  -- Check if the caller is an admin
  SELECT (role = 'admin') INTO caller_is_admin
  FROM users
  WHERE id = auth.uid();

  -- Only allow admins to make other users admin
  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Only administrators can promote users to admin role';
  END IF;

  -- Update the user's role
  UPDATE users
  SET role = 'admin'::user_role
  WHERE email = user_email;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;

-- Create comprehensive policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    (SELECT role = 'admin' FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    (SELECT role = 'admin' FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT role = 'admin' FROM users WHERE id = auth.uid())
  );

-- Ensure proper policies for patients table
DROP POLICY IF EXISTS "Admins can view all patient records" ON patients;

CREATE POLICY "Admins can view all patient records"
  ON patients
  FOR ALL
  TO authenticated
  USING (
    (SELECT role = 'admin' FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT role = 'admin' FROM users WHERE id = auth.uid())
  );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION make_user_admin TO authenticated;