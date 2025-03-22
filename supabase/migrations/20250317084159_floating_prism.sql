/*
  # Add affected teeth tracking

  1. Changes
    - Add affected_teeth column to patients table to track which teeth are affected by each condition
    - Uses JSONB type for flexible storage of teeth numbers
    - Default empty arrays for each condition

  2. Security
    - Maintains existing RLS policies
    - No data loss - adds new column with default value
*/

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS affected_teeth jsonb DEFAULT '{
  "cavity": [],
  "rootCanal": [],
  "implant": [],
  "extraction": []
}'::jsonb;