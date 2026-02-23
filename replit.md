# PsychScribe AI - Clinical Intake Specialist

## Overview
PsychScribe AI (Dr. Zelisko Intake) is a clinical synthesis engine for integrative psychiatry. It uses Google Gemini AI to transform raw intake data into exhaustive clinical reports. The app supports three document types: Intake Summary Reports, Treatment Plans, and DARP Session Notes. Uses Supabase PostgreSQL for persistent patient records and report history. Includes Google Drive integration for archival sync, a chatbot assistant, batch processing, and multiple documentation/safety pages. Protected by Supabase Auth with email/password login and optional TOTP two-factor authentication (Google Authenticator).

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite 6
- **Styling**: Tailwind CSS (CDN), Font Awesome
- **AI**: Google Gemini via `@google/genai`
- **Database**: Supabase PostgreSQL (patients + reports tables)
- **PDF**: jspdf
- **Auth**: Supabase Auth (email/password + TOTP MFA)
- **Routing**: react-router-dom v7

## Project Structure
- `/index.html` - Entry HTML
- `/index.tsx` - React entry point
- `/App.tsx` - Main app component with routing and state management
- `/components/Dashboard.tsx` - Home page with 3 document type cards + batch processing + patient database cards
- `/components/DocumentWorkspace.tsx` - Reusable workspace for all document types (summary/treatment/darp)
- `/components/Header.tsx` - Top header with System Ready + Drive Sync indicators, sign-out button, bottom navigation bar
- `/components/Login.tsx` - Email/password sign-in and sign-up form
- `/components/MfaChallenge.tsx` - 6-digit TOTP code entry after login (Google Authenticator)
- `/components/MfaEnroll.tsx` - QR code enrollment for TOTP MFA setup
- `/components/ReportView.tsx` - Report display with tabs and Google Drive save (PatientForms folder structure)
- `/components/Vault.tsx` - Patient archives with search, filters, date range, and sorting
- `/components/BatchProcessing.tsx` - Multi-file batch processing with sequential AI analysis and auto-save
- `/components/ChatBot.tsx` - AI assistant chatbot
- `/components/Preceptor.tsx` - Preceptor case review generator (3 AI perspectives + AI advisor chat)
- `/components/Documentation.tsx` - System documentation page
- `/components/SafetyProtocols.tsx` - Clinical safety standards page
- `/components/HipaaCompliance.tsx` - HIPAA compliance page
- `/components/Support.tsx` - Support page
- `/components/PatientDatabase.tsx` - Patient database page with list view, add/edit, CSV import
- `/components/ProgressBar.tsx` - Processing progress indicator
- `/services/geminiService.ts` - Gemini AI integration with prompts for all 3 document types
- `/services/supabaseService.ts` - Supabase client with CRUD for patients and reports
- `/types.ts` - TypeScript type definitions
- `/vite.config.ts` - Vite configuration (port 5000, all hosts allowed)
- `/supabase_setup.sql` - SQL schema for patients and reports tables

## Routes
- `/` - Dashboard (document type selection)
- `/summary` - Intake Summary Report workspace
- `/treatment` - Treatment Plan workspace
- `/darp` - DARP Session Note workspace
- `/vault` - Patient Archives (search, filter, sort)
- `/batch` - Batch Processing (multi-file queue)
- `/patients` - Patient Database (list, add/edit, CSV import)
- `/preceptor` - Preceptor Case Review Generator
- `/docs` - System Documentation
- `/safety` - Clinical Safety Standards
- `/hipaa` - HIPAA Compliance
- `/support` - Support

## Document Types
1. **Intake Summary** (`/summary`) - Clinical Synthesis Report from intake data (PDF/text input, multiple files)
2. **Treatment Plan** (`/treatment`) - Clinical Mental Health Treatment Plan (PDF/text/audio input, multiple files) - Requires Client ID and Date of Service metadata
3. **Session Note** (`/darp`) - DARP Progress Note (PDF/text/audio/visual input, multiple files) - Full DARP prompt with 6 sections: Data, Assessment, Response, Plan, ICD-10 Codes, CPT Codes

## Database (Supabase)
- **patients** table: id, first_name, last_name, initials, dob, client_id, email, phone, created_at, updated_at
- **reports** table: id, patient_id (FK), document_type (summary/treatment/darp), content (JSONB with sections), metadata (JSONB), source_filename, created_at
- Patient lookup by first_name + last_name with upsert (create-or-find)
- Reports linked to patients via patient_id foreign key

## Patient Database
- Full patient list with search by name, client ID, email, or phone
- Add and edit patient records (first name, last name, client ID, DOB, email, phone)
- Delete patients with confirmation (cascades to reports)
- Merge duplicate patients: select 2+, pick primary, all reports transfer, duplicates removed
- CSV bulk import with smart column detection (first_name, last_name or full name, client_id, email, phone)
- Existing patients matched by name are updated, not duplicated
- Accessible from Dashboard card and bottom nav bar

## Batch Processing
- Upload multiple files, select document type for each
- Sequential AI processing (avoids API rate limits)
- Progress tracking with per-file status indicators
- Completed reports auto-save to Supabase with patient linkage
- Patient selector dropdown to auto-fill from database
- "Same Patient, New Note" button to duplicate job for same patient with fresh files and date
- Each batch group has its own files, date of service, and document type selections

## Google Drive Integration
- Drive token persisted in localStorage (survives page reloads)
- No unlink option - once linked, stays linked
- Folder structure: `/PatientForms/[PatientFullName]/`
- "Quick Save" auto-creates patient folder and saves PDF
- "Choose Patient" shows existing patient folders for manual selection
- Drive status indicator always visible in header

## Environment Variables / Secrets
- `API_KEY` - Google Gemini API key (injected via Vite's `process.env.API_KEY`)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

## Running
- `npm run dev` - Development server on port 5000
- `npm run build` - Production build to `dist/`

## Deployment
- Static deployment, build with `npm run build`, serve from `dist/`

## Preceptor
- Upload a PDF or paste case text from a student
- Generates 3 case reviews from different perspectives: Preceptor Template, Super Preceptor, Pharmacology-First
- Tab-based review viewer with formatted markdown rendering
- AI Advisor chat: compare sections across reviews, pick best elements, compile final review
- Export any review or the final compiled review as PDF
- Quick-suggestion buttons in chat for common actions

## Recent Changes
- 2026-02-22: Split patient name into first_name/last_name, added email and phone fields, removed date added column
- 2026-02-22: Added 60-minute MFA session expiry for enhanced security
- 2026-02-21: Added Patient Database page (/patients) with list, search, add/edit, delete, and CSV import
- 2026-02-21: Enhanced Batch Processing with patient selector dropdown and "Same Patient, New Note" duplicate button
- 2026-02-21: Added Patients tab to bottom nav bar and Dashboard card
- 2026-02-20: Added Preceptor page replacing Docs in nav — 3-perspective AI case review with advisor chat
- 2026-02-20: Fixed auth loading loop with 5s timeout and INITIAL_SESSION handling
- 2026-02-20: Fixed login stuck on "Please wait" by closing SIGNED_IN handler gap
- 2026-02-20: Broadened Google Drive scope from drive.file to drive for full folder visibility
- 2026-02-19: Added Supabase PostgreSQL database for persistent patient records and report history
- 2026-02-19: Built Vault page with search by patient name, document type filters, date range, and sorting
- 2026-02-19: Implemented Batch Processing for sequential multi-file AI analysis with auto-save
- 2026-02-19: Added Client ID and Date of Service metadata to Treatment Plan workspace
- 2026-02-19: Enhanced Treatment Plan PDFs with header table and signature block
- 2026-02-18: Moved System Ready and Drive Sync indicators to header (always visible)
- 2026-02-18: Removed Drive unlink capability, persist Drive token in localStorage
- 2026-02-18: Implemented /PatientForms/[PatientFullName] folder structure with patient folder picker
- 2026-02-18: Added multiple file upload support across all workspaces
- 2026-02-18: Removed legacy Home.tsx and IntakeForm.tsx components
- 2026-02-18: Restructured app with Dashboard home page and 3 document type workspaces
- 2026-02-18: Added Treatment Plan AI prompt (Headway Clinical Team standards)
- 2026-02-18: Created reusable DocumentWorkspace component with configurable input tabs

## Document Workspace Features
- **Per-file document type assignment**: Each uploaded file has checkboxes to assign it to Intake Summary, Treatment Plan, and/or DARP Session Note. Only files tagged for the current report type are sent to the AI.
- **Patient selector**: Searchable dropdown loads patients from the database. Selecting a patient auto-fills the Client ID field and shows patient details (DOB, email, Client ID badges).
- Files default to the current workspace's document type when uploaded.
