# PsychScribe AI - Clinical Intake Specialist

## Overview
PsychScribe AI (Dr. Zelisko Intake) is a clinical synthesis engine for integrative psychiatry. It uses Google Gemini AI to transform raw intake data into exhaustive clinical reports. The app supports three document types: Intake Summary Reports, Treatment Plans, and DARP Session Notes. Includes Google Drive integration for archival sync, a chatbot assistant, and multiple documentation/safety pages.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite 6
- **Styling**: Tailwind CSS (CDN), Font Awesome
- **AI**: Google Gemini via `@google/genai`
- **PDF**: jspdf
- **Routing**: react-router-dom v7

## Project Structure
- `/index.html` - Entry HTML
- `/index.tsx` - React entry point
- `/App.tsx` - Main app component with routing and state management
- `/components/Dashboard.tsx` - Home page with 3 document type selection cards
- `/components/DocumentWorkspace.tsx` - Reusable workspace for all document types (summary/treatment/darp)
- `/components/Header.tsx` - Top header with System Ready + Drive Sync indicators, bottom navigation bar
- `/components/ReportView.tsx` - Report display with tabs and Google Drive save (PatientForms folder structure)
- `/components/Vault.tsx` - Patient archives / history
- `/components/ChatBot.tsx` - AI assistant chatbot
- `/components/Documentation.tsx` - System documentation page
- `/components/SafetyProtocols.tsx` - Clinical safety standards page
- `/components/HipaaCompliance.tsx` - HIPAA compliance page
- `/components/Support.tsx` - Support page
- `/components/ProgressBar.tsx` - Processing progress indicator
- `/services/geminiService.ts` - Gemini AI integration with prompts for all 3 document types
- `/types.ts` - TypeScript type definitions
- `/vite.config.ts` - Vite configuration (port 5000, all hosts allowed)

## Routes
- `/` - Dashboard (document type selection)
- `/summary` - Intake Summary Report workspace
- `/treatment` - Treatment Plan workspace
- `/darp` - DARP Session Note workspace
- `/vault` - Patient Archives
- `/docs` - System Documentation
- `/safety` - Clinical Safety Standards
- `/hipaa` - HIPAA Compliance
- `/support` - Support

## Document Types
1. **Intake Summary** (`/summary`) - Clinical Synthesis Report from intake data (PDF/text input, multiple files)
2. **Treatment Plan** (`/treatment`) - Clinical Mental Health Treatment Plan (PDF/text/audio input, multiple files)
3. **Session Note** (`/darp`) - DARP Progress Note (PDF/text/audio input, multiple files) - DARP prompt placeholder, awaiting full prompt

## Google Drive Integration
- Drive token persisted in localStorage (survives page reloads)
- No unlink option - once linked, stays linked
- Folder structure: `/PatientForms/[PatientFullName]/`
- "Quick Save" auto-creates patient folder and saves PDF
- "Choose Patient" shows existing patient folders for manual selection
- Drive status indicator always visible in header

## Environment Variables
- `API_KEY` - Google Gemini API key (injected via Vite's `process.env.API_KEY`)

## Running
- `npm run dev` - Development server on port 5000
- `npm run build` - Production build to `dist/`

## Deployment
- Static deployment, build with `npm run build`, serve from `dist/`

## Recent Changes
- 2026-02-18: Moved System Ready and Drive Sync indicators to header (always visible)
- 2026-02-18: Removed Drive unlink capability, persist Drive token in localStorage
- 2026-02-18: Implemented /PatientForms/[PatientFullName] folder structure with patient folder picker
- 2026-02-18: Added multiple file upload support across all workspaces
- 2026-02-18: Removed legacy Home.tsx and IntakeForm.tsx components
- 2026-02-18: Restructured app with Dashboard home page and 3 document type workspaces
- 2026-02-18: Added Treatment Plan AI prompt (Headway Clinical Team standards)
- 2026-02-18: Created reusable DocumentWorkspace component with configurable input tabs
