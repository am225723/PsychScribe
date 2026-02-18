# PsychScribe AI - Clinical Intake Specialist

## Overview
PsychScribe AI (Dr. Zelisko Intake) is a clinical synthesis engine for integrative psychiatry. It uses Google Gemini AI to transform raw intake data into exhaustive clinical reports. The app includes Google Drive integration for archival sync, a chatbot assistant, and multiple documentation/safety pages.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite 6
- **Styling**: Tailwind CSS (CDN), Font Awesome
- **AI**: Google Gemini via `@google/genai`
- **PDF**: jspdf
- **Routing**: react-router-dom v7

## Project Structure
- `/index.html` - Entry HTML
- `/index.tsx` - React entry point
- `/App.tsx` - Main app component with routing
- `/components/` - React components (Header, Home, Vault, ChatBot, etc.)
- `/services/geminiService.ts` - Gemini AI integration
- `/types.ts` - TypeScript type definitions
- `/vite.config.ts` - Vite configuration (port 5000, all hosts allowed)

## Environment Variables
- `API_KEY` - Google Gemini API key (injected via Vite's `process.env.API_KEY`)

## Running
- `npm run dev` - Development server on port 5000
- `npm run build` - Production build to `dist/`

## Deployment
- Static deployment, build with `npm run build`, serve from `dist/`
