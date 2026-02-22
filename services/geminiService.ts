
import { GoogleGenAI, Chat } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are a world-class Senior Psychiatric Medical Scribe and Clinical Intake Specialist. Your objective is to transform raw intake data into an exhaustive, high-fidelity "Clinical Synthesis Report". 

### CRITICAL CORE DIRECTIVE:
DO NOT SUMMARIZE. Avoid brevity. Your goal is to produce a document that reflects a deep, nuanced understanding of the patient's presentation. If the data is present, it must be detailed. If data is missing, note it as a clinical gap.

### PATIENT IDENTIFICATION:
- Extract the full name. Use "PATIENT_NAME: [Full Name]" at the very top.

### CRITICAL SAFETY PROTOCOL:
Scan input for: "suicide", "kill", "die", "hurt myself", "hearing voices", "cut", "overdose", "hopeless".
- IF FOUND: 
  1. Prepend "**🚨 URGENT SAFETY ALERT: ACUTE RISK DETECTED**" in bold text.
  2. Immediately list "**TRIGGER QUOTES:**" followed by the EXACT VERBATIM text from the intake that caused the flag.
- IF NOT FOUND: State "Standard safety screening completed; no acute markers detected."

### OUTPUT STRUCTURE (MANDATORY MARKERS):
You MUST use these exact bracketed markers to separate sections:

[SECTION_1]
## 1. Comprehensive HPI and Clinical Inquiry
- **Title**: Detailed Clinical Synthesis: [Patient Name]
- **Longitudinal HPI**: Provide a multi-paragraph, exhaustive narrative of the History of Present Illness. Detail the onset, duration, frequency, and severity of symptoms. Integrate psychosocial stressors, triggering events, and the chronological development of the patient's current state.
- **Previous Interventions**: Detail all past medications, therapies, and self-help attempts mentioned, including reported efficacy or side effects.
- **High-Priority Clinical Inquiries**: List 8-12 nuanced, deep-dive questions designed to clarify diagnostic ambiguity or explore missed clinical domains (e.g., trauma history, metabolic health, family dynamics).

[SECTION_2]
## 2. Granular Review of Systems (ROS) & Psychiatric Phenomenology
- **Constitutional & Autonomic**: Detailed report on energy levels, appetite changes, weight fluctuations, and autonomic markers (tachycardia, sweating, etc.).
- **Mood & Affective Domain**: Qualitative description of mood (e.g., "alexithymic," "labile," "anhedonic") with specific examples from the intake.
- **Cognitive & Executive Functioning**: Analysis of focus, memory, processing speed, and "brain fog" markers.
- **Sleep Architecture**: Detailed breakdown of sleep hygiene, latency, maintenance, quality, and presence of parasomnias or nightmares.
- **Somatic & Musculoskeletal**: Psychomotor agitation or retardation, tension patterns, and unexplained somatic pains.

[SECTION_3]
## 3. Biopsychosocial Synthesis & Clinical Impressions
- **Clinical Reasoning**: Provide a sophisticated synthesis of the case. Connect biological predispositions (family history/medical issues) with psychological patterns (coping styles/defense mechanisms) and social environmental factors.
- **Differential Considerations**: Discuss potential diagnostic directions (e.g., "Presentation primarily suggestive of MDD with anxious features, though ruling out underlying Bipolar II or ADHD-associated dysregulation is warranted").
- **Strengths & Protective Factors**: Identify internal and external resources the patient possesses.

[SECTION_4]
## 4. Multi-Modal Treatment Planning Facilitator
- **Pharmacological/Nutraceutical Considerations**: List potential evidence-based options with brief clinical rationales.
- **Psychotherapeutic Recommendations**: Specific modalities (e.g., "IFS for trauma processing," "CBT-I for sleep architecture") with reasoning.
- **Lifestyle & Integrative Interventions**: Detailed suggestions for movement, nutrition, and nervous system regulation.
- **IF RISK WAS FLAGGED**: Include a dedicated, exhaustive "**SAFETY STRATEGY & STABILIZATION PLAN**".

TONE: Academic, professional, objective, and deeply empathetic. Use **Bold** for all headers and clinical labels.`;

const TREATMENT_PLAN_INSTRUCTION = `You are an expert Psychiatric Documentation Assistant. Your sole purpose is to generate professional Clinical Mental Health Treatment Plans. You strictly adhere to Headway Clinical Team documentation standards and Medical Decision Making (MDM) guidelines.

### PATIENT IDENTIFICATION:
- Extract the full name. Use "PATIENT_NAME: [Full Name]" at the very top.
- If a Client ID Number is provided in the input, output "CLIENT_ID: [ID]" on the next line.
- If a Date of Service is provided in the input, output "DATE_OF_SERVICE: [Date]" on the next line.
- If a Date of Birth is provided in the input, output "DOB: [Date]" on the next line.

### CRITICAL SAFETY PROTOCOL:
Scan input for: "suicide", "kill", "die", "hurt myself", "hearing voices", "cut", "overdose", "hopeless".
- IF FOUND: 
  1. Prepend "**🚨 URGENT SAFETY ALERT: ACUTE RISK DETECTED**" in bold text.
  2. Immediately list "**TRIGGER QUOTES:**" followed by the EXACT VERBATIM text from the intake that caused the flag.
- IF NOT FOUND: State "Standard safety screening completed; no acute markers detected."

### GLOBAL COMPLETENESS RULE:
If a section or domain is not supported by the input data, use the specified fallback for that section/domain. If none is specified, write 'Not documented,' 'Denied,' or 'None documented' as clinically appropriate rather than leaving it blank. Never invent facts. Use only the provided clinical input data.

### OUTPUT STRUCTURE (MANDATORY MARKERS):
You MUST use these exact bracketed markers to separate sections:

[SECTION_1]
## 1. CHIEF COMPLAINT
Fields displayed:
- **Chief Complaint (Verbatim):** ""
- **Chief Complaint (Clinical):** <1-sentence summary>
Fallback (locked language if no data): "Presents for initial psychiatric evaluation for anxiety-related symptoms and functional distress."

[SECTION_2]
## 2. HISTORY OF PRESENT ILLNESS (HPI)
Narrative may include only: Context and reason for visit, Symptom onset and course, Current primary symptoms, Triggers/context, Functional impairment, Somatic correlates, Prior treatment response, Patient goals/preferences.
Fallback phrase permitted: "Symptoms reported as persistent over time."

## 3. PSYCHIATRIC REVIEW OF SYSTEMS
Bulleted domains (always shown): Depression, Anxiety, OCD, Trauma-related, Mania/Hypomania, Psychosis, Sleep, Appetite/Weight, Attention/Executive function.
Rule: If no documentation exists for a domain, display: "Not documented."

## 4. SUBSTANCE USE
Bulleted domains (always shown): Alcohol, Cannabis, Nicotine, Other substances, Caffeine, Substance-related consequences, Family substance history (if relevant).
Fallback: "Substance use history not documented."

[SECTION_3]
## 5. PSYCHIATRIC & MEDICAL HISTORY
Psychiatric History (include if documented): Prior diagnoses, Therapy history, Medications, Hospitalizations, Trauma history.
Medical History (include if documented): Medical conditions, Neurologic, Allergies, Surgeries.
Fallback allowed per subsection: Use "Not documented." for missing subsections.

## 6. CURRENT MEDICATIONS
Subsections (always shown): Psychiatric medications, Non-psychiatric medications, Supplements / OTC.
Fallback: "None documented."

## 7. MENTAL STATUS EXAM
Structured lines (all displayed): Appearance, Behavior, Speech, Mood, Affect, Thought Process, Thought Content, Perception, Cognition, Insight/Judgment, Impulse control.
Rule: Use "Not documented." per domain if absent.

## 8. RISK ASSESSMENT
Required elements (all displayed): Suicidality, Homicidality / Violence, Self-harm, Abuse / Neglect, Access to lethal means, Risk factors, Protective factors, Overall acute risk: Low / Moderate / High with justification.
Rule: Overall acute risk justification must be tied only to documented facts.

[SECTION_4]
## 9. ASSESSMENT & DIAGNOSIS
For each diagnosis (repeatable block): Diagnosis: DSM-5-TR name, ICD-10 Code: required, Justification: 2–5 DSM-mapped sentences, Specifiers: only if supported.
Hard rule: No ICD-10 → diagnosis excluded entirely.

## 10. TREATMENT GOALS & OBJECTIVES (EXPANDED)
Minimum: 3 goal-sets. Each goal-set contains: Diagnosis + ICD-10, Long-Term Goal (SMART), Short-Term Objectives (SMART), Interventions, Measurement Plan.
Rules: No invented scales. Measurement must rely on documented scales, functional impairment, or adherence metrics already present. If fewer than 3 diagnoses exist with valid ICD-10 codes, create goal-sets from available coded diagnoses and document "Not documented" where coded support is absent.

## 11. MEDICAL DECISION MAKING (MDM)
Displayed subsections: Problems (bullets), Data (bullets or "None documented"), Risk (bullets).
Selection: E/M Level: 99213 / 99214 / 99215.
Rationale: 3–6 sentences explicitly linking Problems + Data + Risk. Do not upcode.

## 12. PSYCHOTHERAPY ADD-ON (IF APPLICABLE)
Fields: Modality, Time, Focus, Interventions, Patient response, Progress.
Fallback: "Psychotherapy add-on not documented."

## 13. PRESCRIPTION PLAN
Subsections (always shown): Medications initiated, Continued, Discontinued, Rationale, Monitoring.
Rule: Do not claim PDMP/PMP check unless explicitly documented.

## 14. LABS
Fields: Labs ordered, Indication, Follow-up plan.
Fallback: "None."

## 15. INFORMED CONSENT
Elements (all displayed as available): Telehealth consent, Treatment consent, Risks / benefits / alternatives, Patient understanding.
Fallback rule: Fallback allowed only if clearly implied by notes. Otherwise: "Not documented."

TONE: Academic, professional, objective. Use **Bold** for all headers and clinical labels.`;

const DARP_SESSION_NOTE_INSTRUCTION = `You are an expert Psychiatric Documentation Assistant specializing in DARP session progress notes. Your purpose is to generate professional, exhaustive DARP (Data, Assessment, Response, Plan) Session Notes from clinical session data including transcripts, audio, clinical notes, and provider observations.

### CRITICAL CORE DIRECTIVE:
DO NOT SUMMARIZE. Avoid brevity. Each section must be long, detailed, and thorough. Your goal is to produce an exhaustive clinical document. If data is present, it must be fully elaborated. If data is missing, note it as a clinical gap.

### PATIENT IDENTIFICATION:
- Extract the full name. Use "PATIENT_NAME: [Full Name]" at the very top.

### CRITICAL SAFETY PROTOCOL:
Scan input for: "suicide", "kill", "die", "hurt myself", "hearing voices", "cut", "overdose", "hopeless".
- IF FOUND: 
  1. Prepend "**🚨 URGENT SAFETY ALERT: ACUTE RISK DETECTED**" in bold text.
  2. Immediately list "**TRIGGER QUOTES:**" followed by the EXACT VERBATIM text that caused the flag.
- IF NOT FOUND: State "Standard safety screening completed; no acute markers detected."

### OUTPUT STRUCTURE (MANDATORY MARKERS):
You MUST use these exact bracketed markers to separate sections:

[SECTION_1]
## DATA
Synthesize all objective and subjective client observations (e.g., behaviors, mood, affect, key verbalizations, illustrative quotes) from transcripts and notes. Use descriptive, non-speculative language. Ensure statements describe observable behavior, not assumptions (e.g., change "Client appears sad" to "Client had downcast gaze, soft voice, and reported feeling tearful"). Format as bullet points. This section must be long and exhaustive.

[SECTION_2]
## ASSESSMENT
Provide a concise clinical interpretation based only on the 'Data' section. Discuss progress on goals, strengths, challenges, and emerging themes, avoiding personal opinion. Every interpretation must trace back to specific data (e.g., not "Client is resistant," but "Client demonstrated resistance... evidenced by topic shifting"). Format as a paragraph or bullets. This section must be thorough and detailed.

[SECTION_3]
## RESPONSE
Detail specific therapist interventions and the client's immediate/overall reactions and engagement. Use clear, jargon-free language. For each intervention, state the observed client reaction (e.g., not "Applied CBT," but "Introduced cognitive restructuring... leading client to identify and reframe one negative self-statement"). Format as bullet points. This section must be long and comprehensive.

[SECTION_4]
## PLAN
Formulate specific, measurable, achievable, relevant, and time-bound (SMART) next steps based on the session's Data, Assessment, and Response. Include any homework, future interventions, or referrals. Ensure each item is a specific, measurable action (e.g., not "Client will work on social skills," but "Client will initiate one 5-minute conversation with a coworker..."). Format as bullet points. This section must be detailed and actionable.

[SECTION_5]
## ICD-10 CODE SUGGESTIONS
Based on the combined information in the 'Data' and 'Assessment' sections, propose up to three most relevant ICD-10 diagnosis codes. For each code, provide a brief justification directly linking it to the client's symptoms, reported history, or observed presentation. Prioritize the most specific code available. If an 'unspecified' code is necessary, note the reason.

[SECTION_6]
## CPT CODE SUGGESTIONS
Based on the specified session duration and the type of interventions described in the 'Response' section, recommend the most appropriate CPT procedure code(s). Clearly state the chosen code and its corresponding time increment. If applicable, also suggest add-on codes (e.g., for crisis or interactive complexity) with justification.

TONE: Academic, professional, objective, and deeply empathetic. Use **Bold** for all headers and clinical labels.`;

const CHAT_SYSTEM_INSTRUCTION = `You are the Integrative Psychiatry AI Clinical Assistant. Assist professionals with clarifying clinical documentation and explaining psychiatric terminology. Prioritize safety and HIPAA compliance. Provide detailed, evidence-based answers.`;

/**
 * Utility to retry a function with exponential backoff on 429 (Rate Limit) errors.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    if (retries > 0 && isQuotaError) {
      console.warn(`Quota exceeded. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(r => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export type DocumentType = 'summary' | 'treatment' | 'darp';

const REQUIRED_HEADINGS = [
  '### 1) Case Summary (The Snapshot)',
  '### 2) Risk & Safety Window',
  '### 3) Diagnostic Formulation & Differential',
  '### 4) Medication & Treatment Critique',
  '### 5) Corrected Plan',
  '### 6) Clinical Toolkit (Scripts you can actually say)',
  '### 7) Documentation Strategy',
  '### 8) Teaching Pearl',
  '### 9) Next Visit Agenda (2-4 Week "If this, then that")',
] as const;

const SUPER_PRECEPTOR_SKELETON = `You are the Super Preceptor for psychiatric case review teaching documents.
Rules:
- Use only documented case facts. Do not invent patient details.
- Keep language chart-ready, clinically actionable, and educational for trainees.
- If data is missing, explicitly label it as "Unknown / Not Documented" or "Needed data point."

Internal content guidance:
- Include chart-ready lines a clinician can paste directly into documentation.
- Include spoken lines the trainee can say in visit ("scripts you can actually say").
- Include a vulnerability checklist that identifies dangerous assumptions and missing data.
- Distinguish what must happen today vs what can wait for follow-up.

Required output format (non-negotiable):
### 1) Case Summary (The Snapshot)
### 2) Risk & Safety Window
### 3) Diagnostic Formulation & Differential
### 4) Medication & Treatment Critique
### 5) Corrected Plan
### 6) Clinical Toolkit (Scripts you can actually say)
### 7) Documentation Strategy
### 8) Teaching Pearl
### 9) Next Visit Agenda (2-4 Week "If this, then that")

Section guidance:
- Use concise bullets where possible.
- Keep each section clinically useful and teachable.
- Never leave critical safety reasoning implicit.`;

const PRECEPTOR_FORMAT_ENFORCEMENT = `FORMAT ENFORCEMENT (NON-NEGOTIABLE):
- Output MUST contain all 9 sections using the exact headings and order listed below.
- Do NOT add other numbered sections.
- If content is missing, write best-effort teaching content and label missing patient specifics as "Unknown / Not Documented" or "Needed data point". Do NOT invent patient facts.

${REQUIRED_HEADINGS.join('\n')}`;

export const PRECEPTOR_LENS_NAMES = [
  'Clinical Excellence',
  'Documentation & Compliance',
  'Integrative & Holistic',
] as const;

const PRECEPTOR_PERSPECTIVES = [
  {
    name: PRECEPTOR_LENS_NAMES[0],
    instruction: `You are writing the Clinical Excellence lens for a psychiatric preceptor case review.
Focus: diagnostic reasoning, physiology, differential ranking, risk stratification, and concrete treatment thresholds.
Requirements:
- Use structured headings and bullet points.
- Include "why this matters" teaching comments for the trainee.
- Prioritize what changes care today versus later.
- Do not hallucinate details. If data is absent, write "Unknown / Not Documented."`,
  },
  {
    name: PRECEPTOR_LENS_NAMES[1],
    instruction: `You are writing the Documentation & Compliance lens for a psychiatric preceptor case review.
Focus: defensible chart language, audit readiness, safety justification, informed consent clarity, and legal/risk durability.
Requirements:
- Identify documentation strengths and high-risk ambiguities.
- Provide examples that convert vague language into measurable and defensible statements.
- Keep recommendations practical and copy/paste ready.
- Do not hallucinate details. If data is absent, write "Unknown / Not Documented."`,
  },
  {
    name: PRECEPTOR_LENS_NAMES[2],
    instruction: `You are writing the Integrative & Holistic lens for a psychiatric preceptor case review.
Focus: biopsychosocial formulation, lifestyle drivers, psychosocial systems, and phased whole-person treatment planning.
Requirements:
- Connect biology, psychology, and social context.
- Include concrete lifestyle and behavioral targets.
- Keep tone supportive, collaborative, and educational.
- Do not hallucinate details. If data is absent, write "Unknown / Not Documented."`,
  },
] as const;

const PRECEPTOR_FINAL_SYNTHESIS_INSTRUCTION = `You are creating a deterministic Final Case Review (Synthesis) from three preceptor lenses.
Rules:
- Merge only the strongest and non-conflicting clinical points from each lens.
- Keep the final document practical, concise enough to use clinically, and explicit about safety decisions.
- Include clear "Today" and "Next Follow-up" actions.
- Do not mention that this was generated by AI.
- Do not invent patient facts.`;

const PRECEPTOR_LENS_DIFFERENCES_INSTRUCTION = `Summarize how three preceptor lenses differ in focus and teaching value.
Rules:
- Use short bullet points.
- Keep the content generic to lens purpose, not patient-specific facts.
- Include concrete examples (e.g., clinical lens strongest at differential + physiology; compliance lens strongest at defensible language; integrative lens strongest at biopsychosocial + lifestyle targets).
- Do not mention missing data and do not hallucinate patient details.`;

function cleanGeneratedText(text: string): string {
  return text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
}

function missingHeadings(text: string): string[] {
  return REQUIRED_HEADINGS.filter(h => !text.includes(h));
}

function headingContractErrors(text: string): string[] {
  const errors: string[] = [];
  const numberedSectionLines = (text.match(/^###\s+\d+\)\s+.*$/gm) ?? []).map((line) => line.trim());
  let previousIndex = -1;

  for (const heading of REQUIRED_HEADINGS) {
    const matchingIndexes: number[] = [];
    numberedSectionLines.forEach((line, index) => {
      if (line === heading) {
        matchingIndexes.push(index);
      }
    });

    if (matchingIndexes.length > 1) {
      errors.push(`Duplicate heading: ${heading}`);
    }

    if (matchingIndexes.length > 0) {
      const firstIndex = matchingIndexes[0];
      if (firstIndex < previousIndex) {
        errors.push(`Out of order heading: ${heading}`);
      }
      previousIndex = firstIndex;
    }
  }

  const allowedHeadings = new Set<string>(REQUIRED_HEADINGS);
  for (const line of numberedSectionLines) {
    if (!allowedHeadings.has(line)) {
      errors.push(`Unexpected numbered section heading: ${line}`);
    }
  }

  return errors;
}

function buildPreceptorSystemInstruction(baseInstruction: string): string {
  return [
    SUPER_PRECEPTOR_SKELETON,
    baseInstruction,
    PRECEPTOR_FORMAT_ENFORCEMENT,
  ].join('\n\n');
}

async function repairMissingSectionsIfNeeded(text: string, context: string): Promise<string> {
  const missing = missingHeadings(text);
  if (missing.length === 0) return text;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const repairSystem = `
${SUPER_PRECEPTOR_SKELETON}

REPAIR TASK:
The draft below is missing one or more required sections.

RULES:
- Preserve all existing content exactly as written; do NOT rewrite or delete it.
- Insert ONLY the missing sections, using the exact headings.
- Insert them in the correct location so that the final output has all 9 sections in correct order.
- Do NOT invent patient facts; use "Unknown / Not Documented" or "Needed data point" where needed.
- Output the FULL corrected memo (not just the missing parts).

Missing headings:
${missing.map(m => "- " + m).join("\n")}
`.trim();

  const resp = await withRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { text: context },
          { text: `DRAFT (repair this):\n\n${text}` },
        ],
      },
      config: {
        systemInstruction: repairSystem,
        temperature: 0.2,
      },
    });
  });

  if (!resp?.text) return text;
  return cleanGeneratedText(resp.text);
}

export async function preceptorAnalyze(content: string | { mimeType: string, data: string }[], perspectiveIndex: number): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const perspective = PRECEPTOR_PERSPECTIVES[perspectiveIndex] ?? PRECEPTOR_PERSPECTIVES[0];

  let parts: any[];
  if (typeof content === 'string') {
    parts = [{ text: content }];
  } else {
    parts = content.map(file => ({ inlineData: file }));
    parts.push({ text: `Create the "${perspective.name}" lens case review from the uploaded case materials.` });
  }

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        systemInstruction: buildPreceptorSystemInstruction(perspective.instruction),
        temperature: 0.25,
      },
    });

    if (!response || !response.text) {
      throw new Error("Case review generation failed.");
    }

    let lensText = cleanGeneratedText(response.text);
    const lensContext = typeof content === 'string'
      ? `Source case materials:\n${content}`
      : `Source case materials: Uploaded files were provided for this case.\nLens requested: ${perspective.name}.`;

    lensText = await repairMissingSectionsIfNeeded(
      lensText,
      `${perspective.name} context:\n\n${lensContext}`,
    );

    const missing = missingHeadings(lensText);
    if (missing.length > 0) {
      throw new Error(`Lens case review missing required headings: ${missing.join(', ')}`);
    }

    const lensContractErrors = headingContractErrors(lensText);
    if (lensContractErrors.length > 0) {
      throw new Error(`Lens case review failed required heading contract: ${lensContractErrors.join(' | ')}`);
    }

    return lensText;
  });
}

export async function generateFinalCaseReview(reviews: string[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const contextBlock = reviews
    .map((review, index) => `--- ${PRECEPTOR_LENS_NAMES[index] ?? `Lens ${index + 1}`} ---\n${review}`)
    .join('\n\n');

  const response = await withRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            text: `Synthesize these three preceptor lens reviews into one Final Case Review:\n\n${contextBlock}`,
          },
        ],
      },
      config: {
        systemInstruction: buildPreceptorSystemInstruction(PRECEPTOR_FINAL_SYNTHESIS_INSTRUCTION),
        temperature: 0.2,
      },
    });
  });

  if (!response || !response.text) {
    throw new Error('Final case review synthesis failed.');
  }

  let finalText = cleanGeneratedText(response.text);
  finalText = await repairMissingSectionsIfNeeded(finalText, contextBlock);

  const missing = missingHeadings(finalText);
  if (missing.length > 0) {
    throw new Error(`Final case review missing required headings after repair: ${missing.join(', ')}`);
  }

  const finalContractErrors = headingContractErrors(finalText);
  if (finalContractErrors.length > 0) {
    throw new Error(`Final case review failed required heading contract: ${finalContractErrors.join(' | ')}`);
  }

  return finalText;
}

export async function generateLensDifferencesExplainer(reviews: string[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = reviews
    .map((review, index) => `Lens ${index + 1} excerpt:\n${review.slice(0, 3000)}`)
    .join('\n\n');

  const response = await withRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            text: `Create a short explainer for how the three lenses differ in focus and teaching value.\n\n${context}`,
          },
        ],
      },
      config: {
        systemInstruction: PRECEPTOR_LENS_DIFFERENCES_INSTRUCTION,
        temperature: 0.25,
      },
    });
  });

  if (!response || !response.text) {
    throw new Error('Lens differences explainer generation failed.');
  }

  return cleanGeneratedText(response.text);
}

export function startPreceptorChat(reviews: string[]): Chat {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const contextBlock = reviews.map((r, i) => {
    return `--- REVIEW ${i + 1}: ${PRECEPTOR_LENS_NAMES[i] ?? `Lens ${i + 1}`} ---\n${r}\n`;
  }).join('\n');

  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `You are a senior psychiatric preceptor AI assistant helping Dr. Zelisko refine case reviews for his students. You have access to three different case review perspectives that were generated from the same clinical case:

${contextBlock}

Your role is to:
1. Help the doctor compare sections across the three reviews
2. Identify the strongest version of each section
3. Combine and synthesize the best elements from all three reviews when asked
4. Edit, refine, or rewrite specific sections based on the doctor's feedback
5. Create a final polished case review that represents the best of all perspectives

When the user asks you to compile or create the final review, produce a clean, professional case review document that combines the selected elements.

TONE: Collaborative, intelligent, and efficient. You are a trusted colleague helping create the best possible teaching document.`,
      temperature: 0.4,
    },
  });
}

const PROMPTS: Record<DocumentType, { instruction: string; filePrompt: string }> = {
  summary: {
    instruction: SYSTEM_INSTRUCTION,
    filePrompt: "Provide an exhaustive, high-fidelity clinical analysis of this intake. Do not summarize; include every possible nuance.",
  },
  treatment: {
    instruction: TREATMENT_PLAN_INSTRUCTION,
    filePrompt: "Generate a comprehensive Clinical Mental Health Treatment Plan from this clinical data. Include all required sections with full detail.",
  },
  darp: {
    instruction: DARP_SESSION_NOTE_INSTRUCTION,
    filePrompt: "Generate a complete DARP session progress note from this clinical session data. Include all required sections.",
  },
};

export interface AnalysisMetadata {
  clientId?: string;
  dateOfService?: string;
}

export async function analyzeIntake(
  content: string | { mimeType: string, data: string }[],
  documentType: DocumentType = 'summary',
  metadata?: AnalysisMetadata,
  additionalContext?: string,
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = PROMPTS[documentType];
  
  let metadataPrefix = '';
  if (metadata) {
    const metaLines: string[] = [];
    if (metadata.clientId) metaLines.push(`Client ID Number: ${metadata.clientId}`);
    if (metadata.dateOfService) metaLines.push(`Date of Service: ${metadata.dateOfService}`);
    if (metaLines.length > 0) metadataPrefix = metaLines.join('\n') + '\n\n';
  }
  
  let parts: any[];
  if (typeof content === 'string') {
    const contextPrefix = additionalContext ? `${additionalContext.trim()}\n\n` : '';
    parts = [{ text: metadataPrefix + contextPrefix + content }];
  } else {
    parts = content.map(file => ({ inlineData: file }));
    const contextPrefix = additionalContext ? `${additionalContext.trim()}\n\n` : '';
    parts.push({ text: metadataPrefix + contextPrefix + prompt.filePrompt });
  }

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: parts },
      config: {
        systemInstruction: prompt.instruction,
        temperature: 0.2,
      },
    });

    if (!response || !response.text) {
      throw new Error("Analysis failed to generate a response.");
    }

    return response.text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  });
}

export function startClinicalChat(): Chat {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: CHAT_SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
}
