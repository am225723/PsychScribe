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
- `/components/Dashboard.tsx` - Home page with 3 document type cards + batch processing card
- `/components/DocumentWorkspace.tsx` - Reusable workspace for all document types (summary/treatment/darp)
- `/components/Header.tsx` - Top header with System Ready + Drive Sync indicators, sign-out button, bottom navigation bar
- `/components/Login.tsx` - Email/password sign-in and sign-up form
- `/components/MfaChallenge.tsx` - 6-digit TOTP code entry after login (Google Authenticator)
- `/components/MfaEnroll.tsx` - QR code enrollment for TOTP MFA setup
- `/components/ReportView.tsx` - Report display with tabs and Google Drive save (PatientForms folder structure)
- `/components/Vault.tsx` - Patient archives with search, filters, date range, and sorting
- `/components/BatchProcessing.tsx` - Multi-file batch processing with sequential AI analysis and auto-save
- `/components/ChatBot.tsx` - AI assistant chatbot
- `/components/Documentation.tsx` - System documentation page
- `/components/SafetyProtocols.tsx` - Clinical safety standards page
- `/components/HipaaCompliance.tsx` - HIPAA compliance page
- `/components/Support.tsx` - Support page
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
- `/docs` - System Documentation
- `/safety` - Clinical Safety Standards
- `/hipaa` - HIPAA Compliance
- `/support` - Support

## Document Types
1. **Intake Summary** (`/summary`) - Clinical Synthesis Report from intake data (PDF/text input, multiple files)
2. **Treatment Plan** (`/treatment`) - Clinical Mental Health Treatment Plan (PDF/text/audio input, multiple files) - Requires Client ID and Date of Service metadata
3. **Session Note** (`/darp`) - DARP Progress Note (PDF/text/audio/visual input, multiple files) - Full DARP prompt with 6 sections: Data, Assessment, Response, Plan, ICD-10 Codes, CPT Codes

## Database (Supabase)
- **patients** table: id, full_name, initials, dob, client_id, created_at, updated_at
- **reports** table: id, patient_id (FK), document_type (summary/treatment/darp), content (JSONB with sections), metadata (JSONB), source_filename, created_at
- Patient lookup by name with upsert (create-or-find)
- Reports linked to patients via patient_id foreign key

## Batch Processing
- Upload multiple files, select document type for each
- Sequential AI processing (avoids API rate limits)
- Progress tracking with per-file status indicators
- Completed reports auto-save to Supabase with patient linkage
- Results viewable inline with expand/collapse

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

## Recent Changes
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
