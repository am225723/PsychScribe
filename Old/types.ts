
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
}
