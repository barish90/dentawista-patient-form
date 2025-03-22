/*
  # Add submitted_by column to patients table

  1. Changes
    - Add submitted_by column to store the name of the user who submitted the form
    
  2. Security
    - Maintains existing security policies
    - No additional policies needed as this is just an informational field
*/

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS submitted_by text;