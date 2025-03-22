/*
  # Make User Admin

  1. Changes
    - Updates a specific user's role to 'admin'
    - Adds function to safely update user roles
    
  2. Security
    - Only updates specified user
    - Maintains existing security policies
*/

-- Create a function to safely update user role
CREATE OR REPLACE FUNCTION make_user_admin(user_email text)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET role = 'admin'
  WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION make_user_admin TO authenticated;