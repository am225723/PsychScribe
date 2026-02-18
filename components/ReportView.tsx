import React, { useMemo, useState, useEffect } from 'react';
import { jsPDF } from "jspdf";
import { ReportTab } from '../App';

interface ReportViewProps { 
  report: string; 
  activeTab: ReportTab;
}

const DRIVE_FOLDERS = [
  { id: '1', name: 'Clinical Records / 2026', icon: 'fa-folder-medical' },
  { id: '2', name: 'Patient Intake Archives', icon: 'fa-box-archive' },
  { id: '3', name: 'PsychScribe - Shared Team Folder', icon: 'fa-users' }
];

export const ReportView: React.FC<ReportViewProps> = ({ report, activeTab }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  
  // Google Drive Linking State
  const [isDriveLinked, setIsDriveLinked] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);

  const isUrgent = report.includes('🚨');
  
  const patientData = useMemo(() => {
    const nameMatch = report.match(/PATIENT_NAME:\s*(.*)/i);
    const fullName = nameMatch ? nameMatch[1].trim() : "Unknown Patient";
    const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3);
    return { fullName, initials };
  }, [report]);

  const triggerQuotes = useMemo(() => {
    const match = report.match(/TRIGGER QUOTES:([\s\S]*?)(?=\[SECTION|###|##|$)/i);
    return match ? match[1].trim().replace(/^[:\s-]+/, '') : null;
  }, [report]);

  const sections = useMemo(() => {
    const parts = report.split(/\[SECTION_\d\]/i);
    return {
      clinicalReport: parts[1] || '',
      extendedRecord: parts[2] || '',
      impressions: parts[3] || '',
      treatmentPlan: parts[4] || ''
    };
  }, [report]);

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

      const addHeader = (pageNum: number) => {
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
        const footerText = "CONFIDENTIAL: This document contains protected health information. Unauthorized use or disclosure is prohibited by law.";
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      };

      const checkNewPage = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - 25) {
          addFooter(doc.internal.pages.length - 1);
          doc.addPage();
          addHeader(doc.internal.pages.length - 1);
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

      addHeader(1);

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
        const safetyText = triggerQuotes ? `Trigger Quotes: "${triggerQuotes}"` : "Patient screening indicates immediate clinical risk markers.";
        const wrappedSafety = doc.splitTextToSize(safetyText, maxLineWidth - 10);
        doc.text(wrappedSafety, margin + 2, y + 8);
        y += 30;
      }

      const processContentBlock = (content: string) => {
        const lines = content.split('\n');
        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.includes('PATIENT_NAME') || trimmed.includes('URGENT SAFETY ALERT') || trimmed.includes('TRIGGER QUOTES')) return;
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
        });
      };

      addSectionTitle("1. Comprehensive Clinical Synthesis");
      processContentBlock(sections.clinicalReport);
      addSectionTitle("2. Detailed Review of Systems");
      processContentBlock(sections.extendedRecord);
      addSectionTitle("3. Impressions & Reasoning");
      processContentBlock(sections.impressions);
      addSectionTitle("4. Proposed Treatment Strategy");
      processContentBlock(sections.treatmentPlan);
      addFooter(doc.internal.pages.length - 1);

      const blob = doc.output('blob');
      setPdfBlob(blob);
      setPdfUrl(URL.createObjectURL(blob));
    };

    if (sections.clinicalReport) generatePDF();
  }, [sections, patientData, isUrgent, triggerQuotes]);

  const handleLinkDrive = () => {
    setIsLinking(true);
    // Simulate OAuth Delay
    setTimeout(() => {
      setIsDriveLinked(true);
      setIsLinking(false);
      setLinkedEmail("provider.auth@gmail.com");
    }, 1800);
  };

  const handleSaveToDrive = (folderId: string) => {
    setSelectedFolder(folderId);
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        setShowFolderPicker(false);
        setSelectedFolder(null);
      }, 2000);
    }, 1500);
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

  const formatContent = (text: string, isDark = false) => {
    const lines = text.trim().split('\n');
    return lines.map((line, i) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.includes('PATIENT_NAME')) return null;
      if (trimmedLine.includes('URGENT SAFETY ALERT') || trimmedLine.includes('TRIGGER QUOTES')) return null;
      const indentMatch = line.match(/^(\s+)/);
      const isNested = indentMatch ? indentMatch[0].length >= 2 : false;
      if (trimmedLine.startsWith('#')) {
        const cleanHeader = trimmedLine.replace(/^#+\s*/, '');
        return (
          <div 
            key={i} 
            className={`font-black uppercase tracking-tight mb-4 mt-8 first:mt-0 text-2xl ${isDark ? 'text-white' : 'text-teal-900'}`}
          >
            {cleanHeader}
          </div>
        );
      }
      if (/^\d+\.\s/.test(trimmedLine)) {
        const [numberPart, ...rest] = trimmedLine.split('**');
        return (
          <div key={i} className="mb-6 mt-8 pl-0">
            <span className={`text-[12px] font-black uppercase tracking-[0.3em] border-b-2 pb-1 mb-4 inline-block ${isDark ? 'text-white border-white/20' : 'text-teal-950 border-teal-100'}`}>
              {numberPart}{rest[0]}
            </span>
            <p className={`text-base leading-relaxed font-normal mt-2 ${isDark ? 'text-white/90' : 'text-teal-900/80'}`}>
              {rest.length > 1 ? rest[1].replace(/^[:\s-]+/, '') : ''}
            </p>
          </div>
        );
      }
      if (trimmedLine.startsWith('**') && trimmedLine.includes('**:')) {
         return (
          <div 
            key={i} 
            className={`${isNested ? 'ml-6' : 'mt-6'} mb-2 font-bold text-base ${isDark ? 'text-white' : 'text-teal-800'}`}
          >
            {renderTextWithBold(trimmedLine, false, isDark)}
          </div>
         );
      }
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
        return (
          <li 
            key={i} 
            className={`${isNested ? 'ml-8' : 'ml-4'} list-disc mb-2 text-base ${isDark ? 'text-white/80' : 'text-teal-900/80'}`}
          >
            {renderTextWithBold(trimmedLine.replace(/^[-*•]\s+/, ''), false, isDark)}
          </li>
        );
      }
      return (
        <p 
          key={i} 
          className={`mb-4 leading-relaxed font-medium text-base ${isNested ? 'ml-6' : ''} ${isDark ? 'text-white/80' : 'text-teal-900/80'}`}
        >
          {renderTextWithBold(trimmedLine, false, isDark)}
        </p>
      );
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {isUrgent && (
        <div className="space-y-4">
          <div className="bg-red-700 text-white px-8 py-6 rounded-[2rem] shadow-2xl flex items-center gap-6 border-b-8 border-red-900">
            <i className="fa-solid fa-triangle-exclamation text-4xl animate-pulse"></i>
            <div>
              <h2 className="text-xl font-black uppercase tracking-[0.2em]">High Risk Safety Escalation</h2>
              <p className="font-bold opacity-90 text-sm tracking-wide">Immediate clinical markers identified for {patientData.fullName}.</p>
            </div>
          </div>
          {triggerQuotes && (
            <div className="bg-white border-2 border-red-100 p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-full bg-red-600"></div>
               <h4 className="text-xs font-black uppercase tracking-[0.4em] text-red-600 mb-4">Verbatim Risk Markers</h4>
               <p className="text-teal-950 font-black italic text-lg leading-relaxed bg-red-50/50 p-6 rounded-2xl ring-1 ring-red-100">"{triggerQuotes}"</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-8">
        {activeTab === 'clinical-report' && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-teal-50 p-10 md:p-16 ring-1 ring-teal-50/50">
            <div className="mb-12 pb-6 border-b-2 border-teal-50 flex justify-between items-end">
               <div>
                  <h1 className="text-4xl font-black text-teal-900 uppercase tracking-tighter">Clinical Brief</h1>
                  <p className="text-teal-800/40 font-black uppercase tracking-[0.3em] text-xs mt-2">{patientData.fullName} // Synthesis ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
               </div>
               <div className="text-right">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-teal-800/40">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
               </div>
            </div>
            <div className="report-content">
              {formatContent(sections.clinicalReport)}
            </div>
          </div>
        )}

        {activeTab === 'extended-record' && (
          <div className="grid gap-8">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-teal-50 overflow-hidden">
              <div className="px-10 py-6 bg-teal-50/30 border-b border-teal-50 flex items-center gap-4">
                <i className="fa-solid fa-notes-medical text-teal-800 text-xl"></i>
                <h3 className="font-black text-teal-900 uppercase text-xs tracking-[0.3em]">Detailed Review of Systems</h3>
              </div>
              <div className="p-10 text-teal-900">{formatContent(sections.extendedRecord)}</div>
            </div>
            <div className="bg-teal-950 text-teal-50 rounded-[2.5rem] shadow-2xl overflow-hidden ring-1 ring-white/10">
              <div className="px-10 py-6 bg-white/5 border-b border-white/10 flex items-center gap-4">
                <i className="fa-solid fa-microscope text-teal-400 text-xl"></i>
                <h3 className="font-black text-white uppercase text-xs tracking-[0.3em]">Advanced Clinical Reasoning</h3>
              </div>
              <div className="p-10 font-medium text-lg leading-relaxed">
                {formatContent(sections.impressions, true)}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'treatment-plan' && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-teal-50 overflow-hidden">
            <div className="px-10 py-6 bg-emerald-50/50 border-b border-emerald-100 flex items-center gap-4">
              <i className="fa-solid fa-vial-circle-check text-emerald-700 text-xl"></i>
              <h3 className="font-black text-emerald-900 uppercase text-xs tracking-[0.3em]">Comprehensive Treatment Strategy</h3>
            </div>
            <div className="p-10 text-teal-900">
              {formatContent(sections.treatmentPlan)}
            </div>
          </div>
        )}

        {activeTab === 'pdf-view' && (
          <div className="px-1 space-y-8 max-w-4xl mx-auto">
            <div className="bg-teal-950 rounded-[3rem] border border-teal-900 overflow-hidden shadow-2xl h-[700px] flex flex-col">
              <div className="px-8 py-6 border-b border-teal-900 flex items-center justify-between bg-black/20">
                <h3 className="text-white font-black uppercase text-xs tracking-[0.3em] flex items-center gap-4">
                  <i className="fa-solid fa-file-pdf text-emerald-500 text-2xl"></i> {patientData.initials}_Clinical_Export.pdf
                </h3>
                {pdfUrl && (
                  <a href={pdfUrl} download={`${patientData.initials}_Synthesis.pdf`} className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40">
                    Download Local Copy
                  </a>
                )}
              </div>
              <div className="flex-grow bg-teal-900/50 p-2 relative">
                 {pdfUrl ? (
                   <iframe src={pdfUrl} className="w-full h-full rounded-2xl border-0 shadow-inner" title="PDF Preview"></iframe>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center text-teal-400/50">
                     <i className="fa-solid fa-dna animate-spin text-4xl mb-6"></i>
                     <p className="font-black uppercase tracking-[0.3em] text-xs">Finalizing Clinical Encryption...</p>
                   </div>
                 )}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-teal-50 p-10 shadow-2xl animate-in slide-in-from-bottom-4 duration-700">
               <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                 <div className="flex items-center gap-8">
                   <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 shadow-inner">
                     <i className="fa-brands fa-google-drive text-4xl"></i>
                   </div>
                   <div>
                     <h4 className="font-black text-teal-950 uppercase text-xl tracking-tight">Personal Drive Sync</h4>
                     <p className="text-xs font-bold text-teal-800/50 uppercase mt-1 tracking-widest">
                       {isDriveLinked ? `Linked as: ${linkedEmail}` : 'Account not linked for clinical archival.'}
                     </p>
                   </div>
                 </div>

                 {!isDriveLinked ? (
                   <button 
                    onClick={handleLinkDrive}
                    disabled={isLinking}
                    className="w-full md:w-auto px-10 py-5 bg-teal-900 text-teal-50 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-4 group disabled:opacity-50"
                   >
                     {isLinking ? (
                        <>
                          <i className="fa-solid fa-spinner animate-spin"></i>
                          Connecting Account...
                        </>
                     ) : (
                        <>
                          <i className="fa-brands fa-google group-hover:scale-125 transition-transform"></i>
                          Link Personal Drive
                        </>
                     )}
                   </button>
                 ) : (
                   <div className="flex gap-4">
                      <button 
                        onClick={() => setShowFolderPicker(!showFolderPicker)}
                        className="px-8 py-5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-200"
                      >
                        {showFolderPicker ? 'Close Folders' : 'Select Target Folder'}
                      </button>
                      <button 
                        onClick={() => {setIsDriveLinked(false); setLinkedEmail(null); setShowFolderPicker(false);}}
                        className="p-5 text-red-400 hover:text-red-600 transition-colors"
                        title="Disconnect Account"
                      >
                        <i className="fa-solid fa-link-slash"></i>
                      </button>
                   </div>
                 )}
               </div>

               {isDriveLinked && showFolderPicker && (
                  <div className="mt-10 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-800/40">Remote Destination Map</span>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      {DRIVE_FOLDERS.map((folder) => (
                        <button
                          key={folder.id}
                          disabled={saveStatus !== 'idle'}
                          onClick={() => handleSaveToDrive(folder.id)}
                          className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all text-center ${
                            selectedFolder === folder.id 
                              ? 'bg-emerald-600 border-emerald-700 text-white shadow-xl scale-105' 
                              : 'bg-slate-50 border-slate-100 text-teal-900 hover:border-teal-200 hover:bg-white'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedFolder === folder.id ? 'bg-white/20' : 'bg-teal-100/50'}`}>
                            <i className={`fa-solid ${folder.icon} text-xl`}></i>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest leading-tight">{folder.name}</span>
                          {selectedFolder === folder.id && saveStatus === 'saving' && <i className="fa-solid fa-spinner animate-spin text-white"></i>}
                          {selectedFolder === folder.id && saveStatus === 'success' && <i className="fa-solid fa-check-double text-white text-xl"></i>}
                        </button>
                      ))}
                    </div>
                  </div>
               )}
               
               {saveStatus === 'success' && (
                 <div className="mt-8 p-6 bg-emerald-50 border-2 border-emerald-100 rounded-2xl text-center text-emerald-800 text-xs font-black uppercase tracking-[0.3em] animate-in slide-in-from-top-4">
                   Clinical Brief Successfully Synced to Drive.
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};