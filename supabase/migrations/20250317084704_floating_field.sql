/*
  # Add new teeth fields to patients table

  1. Changes
    - Add missing_tooth boolean field
    - Add root_treated boolean field
    - Add existing_implant boolean field
    - Update affected_teeth JSONB to include new fields

  2. Security
    - Maintains existing RLS policies
    - No changes to security settings
*/

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS missing_tooth boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS root_treated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS existing_implant boolean DEFAULT false;

-- Update the default structure of affected_teeth to include new fields
ALTER TABLE patients
ALTER COLUMN affected_teeth SET DEFAULT '{
  "cavity": [],
  "rootCanal": [],
  "implant": [],
  "extraction": [],
  "missing": [],
  "treated": [],
  "existingImplant": []
}'::jsonb;