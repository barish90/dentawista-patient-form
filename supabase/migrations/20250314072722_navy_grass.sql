/*
  # Create Dental Patients Table

  1. New Tables
    - `patients`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `name` (text)
      - `gender` (text)
      - `date_of_birth` (date)
      - `medicines` (text[])
      - `tooth_condition` (text)
      - `has_cavity` (boolean)
      - `needs_root_canal` (boolean)
      - `needs_implant` (boolean)
      - `needs_extraction` (boolean)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `patients` table
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  gender text NOT NULL,
  date_of_birth date NOT NULL,
  medicines text[] DEFAULT '{}',
  tooth_condition text NOT NULL,
  has_cavity boolean DEFAULT false,
  needs_root_canal boolean DEFAULT false,
  needs_implant boolean DEFAULT false,
  needs_extraction boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own patient records"
  ON patients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own patient records"
  ON patients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own patient records"
  ON patients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patient records"
  ON patients
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);