-- PsychScribe AI - Database Setup
-- Run this in your Supabase Dashboard SQL Editor
-- Go to: https://supabase.com/dashboard → Your Project → SQL Editor → New Query

DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS patients;

CREATE TABLE patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  initials TEXT NOT NULL,
  dob TEXT,
  client_id TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('summary', 'treatment', 'darp')),
  content TEXT NOT NULL,
  is_urgent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_patient_id ON reports(patient_id);
CREATE INDEX idx_reports_document_type ON reports(document_type);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_patients_first_name ON patients(first_name);
CREATE INDEX idx_patients_last_name ON patients(last_name);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for patients" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for reports" ON reports FOR ALL USING (true) WITH CHECK (true);
