
export interface IntakeReport {
  rawResponse: string;
  hasSafetyAlert: boolean;
  sections: {
    summary: string;
    gapAnalysis: string;
    history: string;
    pythonCode: string;
  };
}

export interface FileData {
  mimeType: string;
  base64: string;
  name: string;
  docTypes?: {
    summary: boolean;
    treatment: boolean;
    darp: boolean;
    preceptor?: boolean;
  };
}

export type ProcessInput = string | FileData[];
