import React, { useMemo, useState, useEffect } from 'react';
import { jsPDF } from "jspdf";
import { ReportTab } from '../App';

interface ReportViewProps { 
  report: string; 
  activeTab: ReportTab;
  isDriveLinked: boolean;
  linkedEmail: string | null;
  accessToken: string | null;
  documentType?: 'summary' | 'treatment' | 'darp';
}

export const ReportView: React.FC<ReportViewProps> = ({ 
  report, 
  activeTab,
  isDriveLinked,
  linkedEmail,
  accessToken,
  documentType = 'summary'
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [patientFolders, setPatientFolders] = useState<{ id: string; name: string }[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const isUrgent = report.includes('🚨');
  
  const patientData = useMemo(() => {
    const nameMatch = report.match(/PATIENT_NAME:\s*(.*)/i);
    const fullName = nameMatch ? nameMatch[1].trim().replace(/\*+/g, '') : "Unknown Patient";
    const nameParts = fullName.split(' ').filter(n => n.length > 0);
    const firstInitial = nameParts[0]?.[0]?.toUpperCase() || 'X';
    const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0].toUpperCase() : 'X';
    const initials = firstInitial + lastInitial;
    const clientIdMatch = report.match(/CLIENT_ID:\s*(.*)/i);
    const clientId = clientIdMatch ? clientIdMatch[1].trim().replace(/\*+/g, '') : '';
    const dosMatch = report.match(/DATE_OF_SERVICE:\s*(.*)/i);
    const dateOfService = dosMatch ? dosMatch[1].trim().replace(/\*+/g, '') : '';
    const dobMatch = report.match(/DOB:\s*(.*)/i);
    const dob = dobMatch ? dobMatch[1].trim().replace(/\*+/g, '') : '';
    return { fullName, initials, clientId, dateOfService, dob };
  }, [report]);

  const triggerQuotes = useMemo(() => {
    const match = report.match(/TRIGGER QUOTES:([\s\S]*?)(?=\[SECTION|###|##|$)/i);
    return match ? match[1].trim().replace(/^[:\s-]+/, '') : null;
  }, [report]);

  const sections = useMemo(() => {
    const parts = report.split(/\[SECTION_\d\]/i);
    if (documentType === 'darp') {
      return {
        clinicalReport: parts[1] || '',
        extendedRecord: parts[2] || '',
        impressions: parts[3] || '',
        treatmentPlan: parts[4] || '',
        icd10: parts[5] || '',
        cpt: parts[6] || '',
      };
    }
    return {
      clinicalReport: parts[1] || '',
      extendedRecord: parts[2] || '',
      impressions: parts[3] || '',
      treatmentPlan: parts[4] || '',
      icd10: '',
      cpt: '',
    };
  }, [report, documentType]);

  useEffect(() => {
    const generatePDF = () => {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      
      let y = 0;
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxLineWidth = pageWidth - margin * 2;

      const addHeader = () => {
        doc.setFillColor(15, 60, 60); 
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("INTEGRATIVE PSYCHIATRY", margin, 15);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("CLINICAL SYNTHESIS SYSTEM • CONFIDENTIAL MEDICAL RECORD", margin, 22);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`PATIENT: ${patientData.fullName.toUpperCase()}`, pageWidth - margin, 15, { align: 'right' });
        doc.setFont("helvetica", "normal");
        doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin, 22, { align: 'right' });
        y = 50;
      };

      const addFooter = (pageNum: number) => {
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "italic");
        const footerText = "CONFIDENTIAL: PHI Protected under HIPAA. Unauthorized disclosure is prohibited.";
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      };

      const checkNewPage = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - 25) {
          addFooter(doc.internal.pages.length - 1);
          doc.addPage();
          addHeader();
          return true;
        }
        return false;
      };

      const addText = (text: string, fontSize: number = 10, isBold: boolean = false, isHeader: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(color[0], color[1], color[2]);
        const lines = doc.splitTextToSize(text, maxLineWidth);
        lines.forEach((line: string) => {
          checkNewPage(5);
          doc.text(line, margin, y);
          y += isHeader ? 7 : 5.5;
        });
        if (isHeader) y += 3;
      };

      const addSectionTitle = (title: string) => {
        checkNewPage(15);
        y += 5;
        doc.setFillColor(240, 248, 248);
        doc.rect(margin - 2, y - 6, maxLineWidth + 4, 10, 'F');
        doc.setDrawColor(20, 80, 80);
        doc.setLineWidth(0.5);
        doc.line(margin - 2, y + 4, margin + 20, y + 4);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 60, 60);
        doc.text(title.toUpperCase(), margin, y);
        y += 12;
      };

      addHeader();

      if (documentType === 'treatment' && (patientData.clientId || patientData.dateOfService || patientData.dob)) {
        const headerTableData = [
          [`Patient Name: ${patientData.fullName}`, `DOB: ${patientData.dob || 'Not documented'}`],
          [`Client ID: ${patientData.clientId || 'Not documented'}`, `Provider: Douglas Zelisko, M.D.`],
          [`Date of Service: ${patientData.dateOfService || 'Not documented'}`, `Service Type: Initial Psychiatrist Appointment`],
        ];
        const colWidth = maxLineWidth / 2;
        const rowHeight = 8;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        headerTableData.forEach((row) => {
          checkNewPage(rowHeight + 2);
          row.forEach((cell, ci) => {
            const x = margin + ci * colWidth;
            doc.rect(x, y - 5, colWidth, rowHeight);
            doc.text(cell, x + 3, y);
          });
          y += rowHeight;
        });
        y += 6;
      }

      if (isUrgent) {
        doc.setFillColor(255, 235, 235);
        doc.rect(margin - 2, y - 5, maxLineWidth + 4, 25, 'F');
        doc.setDrawColor(200, 0, 0);
        doc.rect(margin - 2, y - 5, maxLineWidth + 4, 25, 'S');
        doc.setTextColor(200, 0, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("⚠️ URGENT SAFETY ALERT: ACUTE RISK DETECTED", margin + 2, y + 2);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const safetyText = triggerQuotes ? `Trigger Quotes: "${triggerQuotes}"` : "Immediate clinical risk markers identified.";
        const wrappedSafety = doc.splitTextToSize(safetyText, maxLineWidth - 10);
        doc.text(wrappedSafety, margin + 2, y + 8);
        y += 30;
      }

      const processContentBlock = (content: string, sectionPrefix: string) => {
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.includes('PATIENT_NAME') || trimmed.includes('CLIENT_ID') || trimmed.includes('DATE_OF_SERVICE') || trimmed.match(/^DOB:/i) || trimmed.includes('URGENT SAFETY ALERT')) return;

          if (trimmed.startsWith('#')) {
            const h = trimmed.replace(/^#+\s*/, '');
            addText(h, 11, true, true, [15, 60, 60]);
          } else if (/^\d+\.\s/.test(trimmed)) {
            addText(trimmed.replace(/\*\*/g, ''), 10, true, false, [0, 0, 0]);
            y += 1;
          } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
            const clean = trimmed.replace(/^[-*•]\s+/, '').replace(/\*\*/g, '');
            addText("• " + clean, 9.5, false, false, [40, 40, 40]);
          } else {
            addText(trimmed.replace(/\*\*/g, ''), 9.5, trimmed.includes('**'), false, [30, 30, 30]);
          }

          const answerKey = `${sectionPrefix}-${i}`;
          const answer = answers[answerKey];
          if (answer && answer.trim()) {
            checkNewPage(5);
            y += 1;
            doc.setFont("helvetica", "italic");
            doc.setTextColor(20, 80, 80);
            const answerText = `Note: ${answer}`;
            const answerLines = doc.splitTextToSize(answerText, maxLineWidth - 10);
            answerLines.forEach((l: string) => {
               checkNewPage(5);
               doc.text(l, margin + 5, y);
               y += 5;
            });
            y += 2;
          }
        });
      };

      if (documentType === 'darp') {
        addSectionTitle("DATA");
        processContentBlock(sections.clinicalReport, 'darp-data');
        addSectionTitle("ASSESSMENT");
        processContentBlock(sections.extendedRecord, 'darp-assessment');
        addSectionTitle("RESPONSE");
        processContentBlock(sections.impressions, 'darp-response');
        addSectionTitle("PLAN");
        processContentBlock(sections.treatmentPlan, 'darp-plan');
        if (sections.icd10) {
          addSectionTitle("ICD-10 CODE SUGGESTIONS");
          processContentBlock(sections.icd10, 'darp-icd10');
        }
        if (sections.cpt) {
          addSectionTitle("CPT CODE SUGGESTIONS");
          processContentBlock(sections.cpt, 'darp-cpt');
        }
      } else {
        addSectionTitle("1. Clinical Brief & Synthesis");
        processContentBlock(sections.clinicalReport, 'clinical-report');
        addSectionTitle("2. Detailed Review of Systems");
        processContentBlock(sections.extendedRecord, 'extended-record');
        addSectionTitle("3. Impressions & Reasoning");
        processContentBlock(sections.impressions, 'impressions');
        addSectionTitle("4. Proposed Treatment Strategy");
        processContentBlock(sections.treatmentPlan, 'treatment-plan');
      }

      addFooter(doc.internal.pages.length - 1);

      const finalizePdf = (signatureImg?: HTMLImageElement) => {
        if (signatureImg) {
          checkNewPage(40);
          y += 10;
          addText("Provider Signature:", 10, true, false, [15, 60, 60]);
          y += 2;
          try {
            const canvas = document.createElement('canvas');
            canvas.width = signatureImg.naturalWidth;
            canvas.height = signatureImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(signatureImg, 0, 0);
              const sigData = canvas.toDataURL('image/png');
              const sigWidth = 50;
              const sigHeight = (signatureImg.naturalHeight / signatureImg.naturalWidth) * sigWidth;
              doc.addImage(sigData, 'PNG', margin, y, sigWidth, sigHeight);
              y += sigHeight + 5;
            }
          } catch (e) {}
          addText("Douglas Zelisko, M.D.", 10, true, false, [0, 0, 0]);
          addText("Integrative Psychiatry", 9, false, false, [100, 100, 100]);
        }

        const blob = doc.output('blob');
        setPdfBlob(blob);
        setPdfUrl(URL.createObjectURL(blob));
      };

      if (documentType === 'treatment') {
        const sigImg = new Image();
        sigImg.crossOrigin = 'anonymous';
        sigImg.onload = () => finalizePdf(sigImg);
        sigImg.onerror = () => finalizePdf();
        sigImg.src = 'https://hqlqtnjnyhafdnfetjac.supabase.co/storage/v1/object/public/logos/1ddf6eac-dd67-4615-83b7-937d71361e5b/dzsignature.png';
      } else {
        finalizePdf();
      }
    };

    if (sections.clinicalReport) generatePDF();
  }, [sections, patientData, isUrgent, triggerQuotes, answers, documentType]);

  const findOrCreateFolder = async (name: string, parentId?: string): Promise<string> => {
    if (!accessToken) throw new Error("Not authenticated");
    
    let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) query += ` and '${parentId}' in parents`;

    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    const metadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) metadata.parents = [parentId];

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });
    const created = await createRes.json();
    return created.id;
  };

  const loadPatientFolders = async () => {
    if (!accessToken) return;
    setLoadingFolders(true);
    try {
      const storedFolderId = localStorage.getItem('drive_patient_folder_id');
      const patientFormsId = storedFolderId || await findOrCreateFolder('PatientForms', 'root');
      
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${patientFormsId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`)}&fields=files(id,name)&orderBy=name`, {
        headers: { Authorization: 'Bearer ' + accessToken }
      });
      const data = await res.json();
      setPatientFolders(data.files || []);
    } catch (err) {
      console.error("Failed to load patient folders", err);
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleSaveToDrive = async (folderId: string) => {
    if (!accessToken || !pdfBlob) return;
    
    setSelectedFolder(folderId);
    setSaveStatus('saving');

    try {
      const dateStr = patientData.dateOfService || new Date().toISOString().split('T')[0];
      const docLabel = documentType === 'treatment' ? 'TreatmentPlan' : documentType === 'darp' ? 'SessionNote' : 'ClinicalSynthesis';
      const fileName = `${patientData.fullName.replace(/\s+/g, '_')}_${docLabel}_${dateStr}.pdf`;
      const metadata = {
        name: fileName,
        mimeType: 'application/pdf',
        parents: [folderId],
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', pdfBlob);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: formData
      });

      if (!response.ok) throw new Error("Upload Failed");

      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        setShowFolderPicker(false);
        setSelectedFolder(null);
      }, 3000);
    } catch (error) {
      console.error("Drive upload error", error);
      setSaveStatus('idle');
    }
  };

  const handleSaveToPatientFolder = async () => {
    if (!accessToken || !pdfBlob) return;
    setSaveStatus('saving');
    try {
      const storedFolderId = localStorage.getItem('drive_patient_folder_id');
      const patientFormsId = storedFolderId || await findOrCreateFolder('PatientForms', 'root');

      const query = `name='${patientData.fullName}' and mimeType='application/vnd.google-apps.folder' and '${patientFormsId}' in parents and trashed=false`;
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
        headers: { Authorization: 'Bearer ' + accessToken }
      });
      const searchData = await searchRes.json();

      if (searchData.files && searchData.files.length > 0) {
        await handleSaveToDrive(searchData.files[0].id);
      } else {
        setSaveStatus('idle');
        setShowFolderPicker(true);
        await loadPatientFolders();
      }
    } catch (error) {
      console.error("Drive upload error", error);
      setSaveStatus('idle');
    }
  };

  const renderTextWithBold = (text: string, forceNoBold = false, isDark = false) => {
    if (!text.includes('**')) return text;
    const parts = text.split('**');
    return parts.map((part, idx) => (
      idx % 2 === 1 ? (
        <strong 
          key={idx} 
          className={`${forceNoBold ? 'font-medium' : 'font-black'} ${isDark ? 'text-white' : 'text-teal-950'}`}
        >
          {part}
        </strong>
      ) : part
    ));
  };

  const formatContent = (text: string, sectionPrefix: string, isDark = false) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.includes('PATIENT_NAME') || trimmedLine.includes('CLIENT_ID') || trimmedLine.includes('DATE_OF_SERVICE') || trimmedLine.match(/^DOB:/i) || trimmedLine.includes('URGENT SAFETY ALERT')) return null;

      const answerKey = `${sectionPrefix}-${i}`;
      const isQuestion = trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ') || trimmedLine.endsWith('?') || trimmedLine.endsWith(':');

      const indentMatch = line.match(/^(\s+)/);
      const isNested = indentMatch ? indentMatch[0].length >= 2 : false;

      let content = null;

      if (trimmedLine.startsWith('#')) {
        const cleanHeader = trimmedLine.replace(/^#+\s*/, '');
        content = (
          <div className={`font-black uppercase tracking-tight mb-6 mt-12 first:mt-0 text-3xl ${isDark ? 'text-white' : 'text-teal-900'}`}>
            {cleanHeader}
          </div>
        );
      } else if (/^\d+\.\s/.test(trimmedLine)) {
        const [numberPart, ...rest] = trimmedLine.split('**');
        content = (
          <div className="mb-8 mt-10 pl-0 border-l-4 border-teal-500/20 pl-6">
            <span className={`text-sm font-black uppercase tracking-[0.4em] mb-4 inline-block ${isDark ? 'text-emerald-400' : 'text-teal-600'}`}>
              {numberPart}{rest[0]}
            </span>
            <p className={`text-lg leading-relaxed font-normal ${isDark ? 'text-white/90' : 'text-teal-950/80'}`}>
              {rest.length > 1 ? rest[1].replace(/^[:\s-]+/, '') : ''}
            </p>
          </div>
        );
      } else if (trimmedLine.startsWith('**') && trimmedLine.includes('**:')) {
         content = (
          <div className={`${isNested ? 'ml-8' : 'mt-8'} mb-2 font-bold text-lg ${isDark ? 'text-white' : 'text-teal-800'}`}>
            {renderTextWithBold(trimmedLine, false, isDark)}
          </div>
         );
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
        content = (
          <li className={`${isNested ? 'ml-10' : 'ml-6'} list-disc mb-3 text-lg leading-relaxed ${isDark ? 'text-white/80' : 'text-teal-900/80'}`}>
            {renderTextWithBold(trimmedLine.replace(/^[-*•]\s+/, ''), false, isDark)}
          </li>
        );
      } else {
        content = (
          <p className={`mb-6 leading-relaxed font-medium text-lg ${isNested ? 'ml-8' : ''} ${isDark ? 'text-white/80' : 'text-teal-900/80'}`}>
            {renderTextWithBold(trimmedLine, false, isDark)}
          </p>
        );
      }

      return (
        <React.Fragment key={answerKey}>
          {content}
          {isQuestion && (
            <div className={`mb-6 ${isNested ? 'ml-8' : ''}`}>
              <textarea
                value={answers[answerKey] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [answerKey]: e.target.value }))}
                placeholder="Doctor's notes..."
                className={`w-full p-4 rounded-xl border ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-white/30' : 'bg-teal-50/50 border-teal-100 text-teal-900 placeholder-teal-900/30'} focus:ring-2 focus:ring-teal-500/50 outline-none transition-all text-sm font-medium resize-y min-h-[80px]`}
              />
            </div>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24">
      {isUrgent && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-red-600 to-red-800 text-white px-10 py-8 rounded-[2.5rem] shadow-2xl flex items-center gap-8 border-b-8 border-red-900 ring-4 ring-red-100/50">
            <i className="fa-solid fa-triangle-exclamation text-5xl animate-pulse"></i>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-[0.3em]">Critical Safety Alert</h2>
              <p className="font-bold opacity-90 text-lg tracking-wide mt-1">High-priority clinical markers detected for {patientData.fullName}.</p>
            </div>
          </div>
          {triggerQuotes && (
            <div className="bg-white border-2 border-red-50 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden ring-1 ring-red-50">
               <div className="absolute top-0 left-0 w-3 h-full bg-red-600"></div>
               <h4 className="text-sm font-black uppercase tracking-[0.5em] text-red-600 mb-6 flex items-center gap-3">
                 <i className="fa-solid fa-quote-left text-xl opacity-20"></i>
                 Risk Factor Citation
               </h4>
               <p className="text-teal-950 font-black italic text-2xl leading-relaxed bg-red-50/30 p-8 rounded-3xl border border-red-100/50">"{triggerQuotes}"</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-12">
        {activeTab === 'clinical-report' && (
          <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(20,50,50,0.1)] border border-teal-50 p-12 md:p-24 ring-1 ring-teal-50/50 transition-all">
            <div className="mb-16 pb-8 border-b-2 border-teal-50 flex justify-between items-end gap-10">
               <div className="space-y-2">
                  <h1 className="text-5xl font-black text-teal-950 uppercase tracking-tighter lg:text-6xl">Clinical Brief</h1>
                  <p className="text-teal-800/40 font-black uppercase tracking-[0.5em] text-xs flex items-center gap-3">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Patient Record: {patientData.fullName}
                  </p>
               </div>
               <div className="text-right">
                  <div className="text-xs font-black uppercase tracking-[0.4em] text-teal-800/30 mb-1">Generated On</div>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-900 bg-teal-50 px-4 py-2 rounded-lg inline-block">
                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
               </div>
            </div>
            <div className="report-content max-w-5xl">
              {formatContent(sections.clinicalReport, 'clinical-report')}
            </div>
          </div>
        )}

        {activeTab === 'extended-record' && (
          <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(20,50,50,0.1)] border border-teal-50 p-12 md:p-24 ring-1 ring-teal-50/50 transition-all">
             <div className="mb-16 pb-8 border-b-2 border-teal-50 flex justify-between items-end gap-10">
               <div className="space-y-2">
                  <h1 className="text-4xl font-black text-teal-950 uppercase tracking-tighter lg:text-5xl">Review of Systems</h1>
                  <p className="text-teal-800/40 font-black uppercase tracking-[0.5em] text-xs flex items-center gap-3">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Detailed Clinical Record
                  </p>
               </div>
            </div>
            <div className="report-content max-w-5xl">
              {formatContent(sections.extendedRecord, 'extended-record')}
            </div>
          </div>
        )}

        {activeTab === 'treatment-plan' && (
          <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(20,50,50,0.1)] border border-teal-50 p-12 md:p-24 ring-1 ring-teal-50/50 transition-all">
             <div className="mb-16 pb-8 border-b-2 border-teal-50 flex justify-between items-end gap-10">
               <div className="space-y-2">
                  <h1 className="text-4xl font-black text-teal-950 uppercase tracking-tighter lg:text-5xl">Treatment Plan</h1>
                  <p className="text-teal-800/40 font-black uppercase tracking-[0.5em] text-xs flex items-center gap-3">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                    Proposed Strategy
                  </p>
               </div>
            </div>
            <div className="report-content max-w-5xl">
              {formatContent(sections.treatmentPlan, 'treatment-plan')}
            </div>
          </div>
        )}

        {activeTab === 'darp-data' && (
          <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(20,50,50,0.1)] border border-teal-50 p-12 md:p-24 ring-1 ring-teal-50/50 transition-all">
            <div className="mb-16 pb-8 border-b-2 border-teal-50 flex justify-between items-end gap-10">
               <div className="space-y-2">
                  <h1 className="text-5xl font-black text-teal-950 uppercase tracking-tighter lg:text-6xl">Data</h1>
                  <p className="text-teal-800/40 font-black uppercase tracking-[0.5em] text-xs flex items-center gap-3">
                    <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
                    Session Observations: {patientData.fullName}
                  </p>
               </div>
               <div className="text-right">
                  <div className="text-xs font-black uppercase tracking-[0.4em] text-teal-800/30 mb-1">Session Date</div>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-900 bg-teal-50 px-4 py-2 rounded-lg inline-block">
                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
               </div>
            </div>
            <div className="report-content max-w-5xl">
              {formatContent(sections.clinicalReport, 'darp-data')}
            </div>
          </div>
        )}

        {activeTab === 'darp-assessment' && (
          <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(20,50,50,0.1)] border border-teal-50 p-12 md:p-24 ring-1 ring-teal-50/50 transition-all">
             <div className="mb-16 pb-8 border-b-2 border-teal-50 flex justify-between items-end gap-10">
               <div className="space-y-2">
                  <h1 className="text-4xl font-black text-teal-950 uppercase tracking-tighter lg:text-5xl">Assessment</h1>
                  <p className="text-teal-800/40 font-black uppercase tracking-[0.5em] text-xs flex items-center gap-3">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                    Clinical Interpretation
                  </p>
               </div>
            </div>
            <div className="report-content max-w-5xl">
              {formatContent(sections.extendedRecord, 'darp-assessment')}
            </div>
          </div>
        )}

        {activeTab === 'darp-response' && (
          <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(20,50,50,0.1)] border border-teal-50 p-12 md:p-24 ring-1 ring-teal-50/50 transition-all">
             <div className="mb-16 pb-8 border-b-2 border-teal-50 flex justify-between items-end gap-10">
               <div className="space-y-2">
                  <h1 className="text-4xl font-black text-teal-950 uppercase tracking-tighter lg:text-5xl">Response</h1>
                  <p className="text-teal-800/40 font-black uppercase tracking-[0.5em] text-xs flex items-center gap-3">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                    Interventions & Reactions
                  </p>
               </div>
            </div>
            <div className="report-content max-w-5xl">
              {formatContent(sections.impressions, 'darp-response')}
            </div>
          </div>
        )}

        {activeTab === 'darp-plan' && (
          <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(20,50,50,0.1)] border border-teal-50 p-12 md:p-24 ring-1 ring-teal-50/50 transition-all">
             <div className="mb-16 pb-8 border-b-2 border-teal-50 flex justify-between items-end gap-10">
               <div className="space-y-2">
                  <h1 className="text-4xl font-black text-teal-950 uppercase tracking-tighter lg:text-5xl">Plan</h1>
                  <p className="text-teal-800/40 font-black uppercase tracking-[0.5em] text-xs flex items-center gap-3">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    SMART Next Steps
                  </p>
               </div>
            </div>
            <div className="report-content max-w-5xl">
              {formatContent(sections.treatmentPlan, 'darp-plan')}
            </div>
          </div>
        )}

        {activeTab === 'darp-icd10' && (
          <div className="space-y-8">
            <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(20,50,50,0.1)] border border-teal-50 p-12 md:p-24 ring-1 ring-teal-50/50 transition-all">
               <div className="mb-16 pb-8 border-b-2 border-teal-50 flex justify-between items-end gap-10">
                 <div className="space-y-2">
                    <h1 className="text-4xl font-black text-teal-950 uppercase tracking-tighter lg:text-5xl">ICD-10 Codes</h1>
                    <p className="text-teal-800/40 font-black uppercase tracking-[0.5em] text-xs flex items-center gap-3">
                      <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                      Diagnosis Code Suggestions
                    </p>
                 </div>
              </div>
              <div className="report-content max-w-5xl">
                {formatContent(sections.icd10, 'darp-icd10')}
              </div>
            </div>
            <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(20,50,50,0.1)] border border-teal-50 p-12 md:p-24 ring-1 ring-teal-50/50 transition-all">
               <div className="mb-16 pb-8 border-b-2 border-teal-50 flex justify-between items-end gap-10">
                 <div className="space-y-2">
                    <h1 className="text-4xl font-black text-teal-950 uppercase tracking-tighter lg:text-5xl">CPT Codes</h1>
                    <p className="text-teal-800/40 font-black uppercase tracking-[0.5em] text-xs flex items-center gap-3">
                      <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></span>
                      Procedure Code Suggestions
                    </p>
                 </div>
              </div>
              <div className="report-content max-w-5xl">
                {formatContent(sections.cpt, 'darp-cpt')}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pdf-view' && (
          <div className="px-1 space-y-12 max-w-6xl mx-auto">
            <div className="bg-teal-950 rounded-[4rem] border border-teal-900 overflow-hidden shadow-2xl h-[850px] flex flex-col ring-4 ring-teal-900/30">
              <div className="px-12 py-8 border-b border-teal-900 flex items-center justify-between bg-black/30 backdrop-blur-sm">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-red-400">
                    <i className="fa-solid fa-file-pdf text-2xl"></i>
                  </div>
                  <div>
                    <h3 className="text-white font-black uppercase text-sm tracking-[0.3em]">{patientData.initials}_{documentType === 'treatment' ? 'TreatmentPlan' : documentType === 'darp' ? `SessionNote${patientData.dateOfService ? '_' + patientData.dateOfService : ''}` : 'ClinicalSynthesis'}.pdf</h3>
                    <p className="text-[10px] font-bold text-teal-400/50 uppercase tracking-[0.2em]">Ready for medical archival</p>
                  </div>
                </div>
                {pdfUrl && (
                  <a href={pdfUrl} download={`${patientData.initials}_${documentType === 'treatment' ? 'TreatmentPlan' : documentType === 'darp' ? `SessionNote${patientData.dateOfService ? '_' + patientData.dateOfService : ''}` : 'ClinicalSynthesis'}.pdf`} className="bg-emerald-600 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40 active:scale-95 flex items-center gap-3">
                    <i className="fa-solid fa-download"></i>
                    Export PDF
                  </a>
                )}
              </div>
              <div className="flex-grow bg-teal-900/50 p-4 relative">
                 {pdfUrl ? (
                   <iframe src={pdfUrl} className="w-full h-full rounded-3xl border-0 shadow-inner bg-teal-900" title="PDF Preview"></iframe>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center text-teal-400/30">
                     <div className="w-20 h-20 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-8"></div>
                     <p className="font-black uppercase tracking-[0.4em] text-xs">Assembling High-Fidelity Record...</p>
                   </div>
                 )}
              </div>
            </div>

            {isDriveLinked && (
            <div className="bg-white rounded-[3.5rem] border border-teal-50 p-12 md:p-16 shadow-2xl animate-in slide-in-from-bottom-6 duration-700 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                 <i className="fa-brands fa-google-drive text-[150px]"></i>
               </div>
               
               <div className="flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
                 <div className="flex items-center gap-8">
                   <div className="w-20 h-20 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center text-emerald-600 shadow-inner border border-emerald-100">
                     <i className="fa-brands fa-google-drive text-4xl"></i>
                   </div>
                   <div className="space-y-2">
                     <h4 className="font-black text-teal-950 uppercase text-2xl tracking-tight">Save to Google Drive</h4>
                     <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-teal-800/50">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                       Synced: {linkedEmail}
                     </div>
                     <p className="text-[10px] text-teal-800/40 font-bold">
                       <i className="fa-solid fa-folder-tree mr-1"></i>
                       PatientForms / {patientData.fullName}
                     </p>
                   </div>
                 </div>

                 <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <button 
                      onClick={handleSaveToPatientFolder}
                      disabled={saveStatus !== 'idle'}
                      className="flex-grow lg:flex-none px-10 py-5 bg-teal-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-teal-900/20 hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {saveStatus === 'saving' ? (
                        <><i className="fa-solid fa-circle-notch animate-spin"></i> Saving...</>
                      ) : saveStatus === 'success' ? (
                        <><i className="fa-solid fa-check-double"></i> Saved</>
                      ) : (
                        <><i className="fa-solid fa-cloud-arrow-up"></i> Quick Save</>
                      )}
                    </button>
                    <button 
                      onClick={() => { setShowFolderPicker(!showFolderPicker); if (!showFolderPicker) loadPatientFolders(); }}
                      disabled={saveStatus === 'saving'}
                      className="flex-grow lg:flex-none px-10 py-5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      <i className="fa-solid fa-folder-open"></i>
                      {showFolderPicker ? 'Close' : 'Choose Patient'}
                    </button>
                 </div>
               </div>

               {showFolderPicker && (
                  <div className="mt-12 space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between px-4 border-l-4 border-emerald-500">
                      <span className="text-sm font-black uppercase tracking-[0.3em] text-teal-900">Patient Folders</span>
                      <p className="text-xs font-bold text-teal-800/40">PatientForms / ...</p>
                    </div>

                    {loadingFolders ? (
                      <div className="flex items-center justify-center py-12">
                        <i className="fa-solid fa-circle-notch animate-spin text-teal-300 text-2xl mr-4"></i>
                        <span className="text-sm font-bold text-teal-800/40 uppercase tracking-widest">Loading folders...</span>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {patientFolders.map((folder) => (
                          <button
                            key={folder.id}
                            disabled={saveStatus !== 'idle'}
                            onClick={() => handleSaveToDrive(folder.id)}
                            className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all text-center group ${
                              selectedFolder === folder.id 
                                ? 'bg-emerald-600 border-emerald-700 text-white shadow-xl scale-105' 
                                : 'bg-slate-50 border-slate-100 text-teal-900 hover:border-teal-300 hover:bg-white hover:shadow-lg'
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${selectedFolder === folder.id ? 'bg-white/20' : 'bg-teal-100/50 text-teal-700'}`}>
                              <i className="fa-solid fa-folder-open text-xl"></i>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider block leading-tight truncate w-full">{folder.name}</span>
                            {selectedFolder === folder.id && saveStatus === 'saving' && <i className="fa-solid fa-circle-notch animate-spin text-white text-lg"></i>}
                            {selectedFolder === folder.id && saveStatus === 'success' && <i className="fa-solid fa-check-double text-white text-xl animate-bounce"></i>}
                          </button>
                        ))}
                        {patientFolders.length === 0 && !loadingFolders && (
                          <div className="col-span-full text-center py-8 text-teal-800/30">
                            <i className="fa-solid fa-folder-plus text-3xl mb-3 block"></i>
                            <p className="text-xs font-bold uppercase tracking-widest">No patient folders yet</p>
                            <p className="text-[10px] mt-1">Use "Quick Save" to auto-create a folder for this patient</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
               )}
               
               {saveStatus === 'success' && !showFolderPicker && (
                 <div className="mt-8 p-6 bg-emerald-50 border-2 border-emerald-100 rounded-2xl text-center text-emerald-800 text-sm font-black uppercase tracking-[0.3em] animate-in slide-in-from-top-4 shadow-xl">
                   <i className="fa-solid fa-cloud-arrow-up mr-3"></i>
                   Saved to PatientForms / {patientData.fullName}
                 </div>
               )}
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};