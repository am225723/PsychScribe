
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

function cleanGeneratedText(text: string): string {
  return text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
}

const ZELISKO_SUPER_PRECEPTOR_V1 = `PASTE VERBATIM PROMPT #1 FROM USER MESSAGE`;
const ZELISKO_SUPER_PRECEPTOR_V2 = `PASTE VERBATIM PROMPT #2 FROM USER MESSAGE`;

const V1_V2_DIFFERENCES_INSTRUCTION = `Explain how v1 differs from v2: v1 includes [Taper Brakes + Risk Escalation Thresholds], v2 is slightly more compact and uses a different section layout. Keep generic.
Rules:
- Use short bullet points.
- Keep conceptual and teaching-focused.
- Do not mention patient-specific details.
- Do not mention missing data.`;

const PERFECT_CASE_REVIEW_EDITS_INSTRUCTION = `You are a psychiatric preceptor editor.
Task:
- From the two draft notes (v1 and v2), list the specific edits needed to make a final case review maximally strong and defensible.

Rules:
- Use concise bullet points only.
- Prioritize risk/safety, diagnostic clarity, medication rationale, plan specificity, and documentation durability.
- Do not invent patient facts.
- If data gaps exist, state "Needed data point" explicitly.
- Keep output short and practical for immediate revision.`;

export async function generateZeliskoSuperPreceptorNotes(
  content: string | { mimeType: string; data: string }[],
): Promise<{ v1: string; v2: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let parts: any[];
  if (typeof content === 'string') {
    parts = [{ text: content }];
  } else {
    parts = content.map((file) => ({ inlineData: file }));
    parts.push({ text: 'Generate the preceptor case review now.' });
  }

  const v1Response = await withRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        systemInstruction: ZELISKO_SUPER_PRECEPTOR_V1,
        temperature: 0.3,
      },
    });
  });

  if (!v1Response?.text) {
    throw new Error('Zelisko Super Preceptor v1 generation failed.');
  }

  const v2Response = await withRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        systemInstruction: ZELISKO_SUPER_PRECEPTOR_V2,
        temperature: 0.3,
      },
    });
  });

  if (!v2Response?.text) {
    throw new Error('Zelisko Super Preceptor v2 generation failed.');
  }

  return {
    v1: cleanGeneratedText(v1Response.text),
    v2: cleanGeneratedText(v2Response.text),
  };
}

export async function generateV1V2DifferencesExplainer(): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await withRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [{ text: 'Create a short conceptual differences explainer for Zelisko Super Preceptor v1 vs v2.' }],
      },
      config: {
        systemInstruction: V1_V2_DIFFERENCES_INSTRUCTION,
        temperature: 0.2,
      },
    });
  });

  if (!response?.text) {
    throw new Error('v1/v2 differences explainer generation failed.');
  }

  return cleanGeneratedText(response.text);
}

export async function generatePerfectCaseReviewEdits(v1Text: string, v2Text: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await withRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { text: `Zelisko Super Preceptor v1:\n${v1Text}` },
          { text: `Zelisko Super Preceptor v2:\n${v2Text}` },
          { text: 'List the edits needed to make this a perfect case review.' },
        ],
      },
      config: {
        systemInstruction: PERFECT_CASE_REVIEW_EDITS_INSTRUCTION,
        temperature: 0.2,
      },
    });
  });

  if (!response?.text) {
    throw new Error('Perfect case review edits generation failed.');
  }

  return cleanGeneratedText(response.text);
}

export function startZeliskoPreceptorChat(v1Text: string, v2Text: string, differencesExplainer = ''): Chat {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `You are a senior psychiatric preceptor AI assistant helping Dr. Zelisko refine two Super Preceptor note variants.

You have access to:
--- Zelisko Super Preceptor v1 ---
${v1Text}

--- Zelisko Super Preceptor v2 ---
${v2Text}

--- Differences Explainer ---
${differencesExplainer || 'Not provided.'}

Your role is to:
1. Compare v1 and v2 by section and identify tradeoffs.
2. Tighten language for chart-readiness and teaching clarity.
3. Rewrite specific sections on request.
4. Keep outputs practical, clinically actionable, and source-grounded.
5. Do not invent patient facts.

TONE: Collaborative, intelligent, and efficient.`,
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
