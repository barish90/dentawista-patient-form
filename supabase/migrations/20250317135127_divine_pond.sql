/*
  # Add medical history fields

  1. Changes
    - Add new columns to patients table:
      - `medical_conditions` (text[]) - List of medical conditions
      - `previous_surgeries` (text[]) - List of previous surgeries
      - `allergies` (text[]) - List of allergies

  2. Security
    - No changes to RLS policies (existing policies cover new columns)
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'medical_conditions'
  ) THEN
    ALTER TABLE patients 
    ADD COLUMN medical_conditions text[] DEFAULT '{}'::text[],
    ADD COLUMN previous_surgeries text[] DEFAULT '{}'::text[],
    ADD COLUMN allergies text[] DEFAULT '{}'::text[];
  END IF;
END $$;