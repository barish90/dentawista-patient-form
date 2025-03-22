/*
  # Add affected teeth column to patients table

  1. Changes
    - Add JSON column for storing affected teeth information
    - Maintain existing table structure and data
    
  2. Security
    - Preserves existing security policies
    - Maintains data integrity
*/

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS affected_teeth jsonb DEFAULT '{
  "cavity": [],
  "rootCanal": [],
  "implant": [],
  "extraction": []
}'::jsonb;