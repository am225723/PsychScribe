-- Migration: Split full_name into first_name/last_name, add email/phone
-- Run this in Supabase Dashboard → SQL Editor → New Query

ALTER TABLE patients ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone TEXT;

UPDATE patients SET
  first_name = CASE
    WHEN array_length(string_to_array(trim(full_name), ' '), 1) = 1 THEN trim(full_name)
    ELSE array_to_string((string_to_array(trim(full_name), ' '))[1:array_length(string_to_array(trim(full_name), ' '), 1)-1], ' ')
  END,
  last_name = CASE
    WHEN array_length(string_to_array(trim(full_name), ' '), 1) = 1 THEN ''
    ELSE (string_to_array(trim(full_name), ' '))[array_length(string_to_array(trim(full_name), ' '), 1)]
  END
WHERE first_name IS NULL;

ALTER TABLE patients ALTER COLUMN first_name SET NOT NULL;  

CREATE INDEX IF NOT EXISTS idx_patients_first_name ON patients(first_name);
CREATE INDEX IF NOT EXISTS idx_patients_last_name ON patients(last_name);
