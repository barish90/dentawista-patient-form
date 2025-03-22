/*
  # Remove tooth condition field

  1. Changes
    - Remove `tooth_condition` column from `patients` table as it's no longer needed

  2. Notes
    - Using IF EXISTS to ensure the migration is safe to run multiple times
    - Using DO block to prevent errors if column doesn't exist
*/

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'patients' 
    AND column_name = 'tooth_condition'
  ) THEN
    ALTER TABLE patients DROP COLUMN tooth_condition;
  END IF;
END $$;