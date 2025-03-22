/*
  # Add admin role and policies

  1. Changes
    - Add is_admin column to auth.users
    - Add admin-specific policies for viewing all patient records
    
  2. Security
    - Only admins can view all patient records
    - Regular users can still only view their own records
*/

-- Add is_admin column to auth.users via custom type
CREATE TYPE user_role AS ENUM ('admin', 'user');

ALTER TABLE auth.users
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- Add policy for admins to view all patient records
CREATE POLICY "Admins can view all patient records"
ON patients
FOR SELECT
TO authenticated
USING (
  (SELECT role = 'admin' FROM auth.users WHERE id = auth.uid())
  OR
  auth.uid() = user_id
);