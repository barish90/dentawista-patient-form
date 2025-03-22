/*
  # Add new dental fields

  1. New Columns
    - `has_amalgam` (boolean) - For filled teeth with amalgam
    - `has_broken_teeth` (boolean) - For broken teeth
    - `has_crown` (boolean) - For teeth with crowns
    - Add new arrays to affected_teeth for these conditions

  2. Changes
    - Update affected_teeth JSONB default to include new arrays
*/

ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS has_amalgam boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_broken_teeth boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_crown boolean DEFAULT false;

-- Update the default value of affected_teeth to include new arrays
ALTER TABLE patients 
  ALTER COLUMN affected_teeth SET DEFAULT '{
    "cavity": [], 
    "implant": [], 
    "missing": [], 
    "treated": [], 
    "rootCanal": [], 
    "extraction": [], 
    "existingImplant": [],
    "amalgam": [],
    "broken": [],
    "crown": []
  }'::jsonb;