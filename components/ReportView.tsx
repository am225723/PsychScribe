import React, { useMemo, useState, useEffect } from 'react';
import { jsPDF } from "jspdf";
import { ReportTab } from '../App';

interface ReportViewProps { 
  report: string; 
  activeTab: ReportTab;
  isDriveLinked: boolean;
  linkedEmail: string | null;
  onLinkDrive: () => void;
  onUnlinkDrive: () => void;
  isLinking: boolean;
  accessToken: string | null;
}

const DRIVE_FOLDERS = [
  { id: '1', name: 'Clinical Records / 2026', icon: 'fa-folder-medical', path: '/Root/Clinical' },
  { id: '2', name: 'Patient Intake Archives', icon: 'fa-box-archive', path: '/Root/Archives' },
  { id: '3', name: 'PsychScribe - Shared Team Folder', icon: 'fa-users', path: '/Shared/Team' }
];

export const ReportView: React.FC<ReportViewProps> = ({ 
  report, 
  activeTab,
  isDriveLinked,
  linkedEmail,
  onLinkDrive,
  onUnlinkDrive,
  isLinking,
  accessToken
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  
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

      const processContentBlock = (content: string) => {
        const lines = content.split('\n');
        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.includes('PATIENT_NAME') || trimmed.includes('URGENT SAFETY ALERT')) return;
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

      addSectionTitle("1. Clinical Brief & Synthesis");
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

  const handleSaveToDrive = async (folderId: string) => {
    if (!accessToken || !pdfBlob) return;
    
    setSelectedFolder(folderId);
    setSaveStatus('saving');

    try {
      const fileName = `${patientData.initials}_Clinical_Brief_${new Date().getTime()}.pdf`;
      const metadata = {
        name: fileName,
        mimeType: 'application/pdf',
        // In a production app, we would search for the folderId in the user's real Drive
        // but for now we upload to the root 'drive.file' restricted area
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
      if (!trimmedLine || trimmedLine.includes('PATIENT_NAME') || trimmedLine.includes('URGENT SAFETY ALERT')) return null;
      const indentMatch = line.match(/^(\s+)/);
      const isNested = indentMatch ? indentMatch[0].length >= 2 : false;
      if (trimmedLine.startsWith('#')) {
        const cleanHeader = trimmedLine.replace(/^#+\s*/, '');
        return (
          <div key={i} className={`font-black uppercase tracking-tight mb-6 mt-12 first:mt-0 text-3xl ${isDark ? 'text-white' : 'text-teal-900'}`}>
            {cleanHeader}
          </div>
        );
      }
      if (/^\d+\.\s/.test(trimmedLine)) {
        const [numberPart, ...rest] = trimmedLine.split('**');
        return (
          <div key={i} className="mb-8 mt-10 pl-0 border-l-4 border-teal-500/20 pl-6">
            <span className={`text-sm font-black uppercase tracking-[0.4em] mb-4 inline-block ${isDark ? 'text-emerald-400' : 'text-teal-600'}`}>
              {numberPart}{rest[0]}
            </span>
            <p className={`text-lg leading-relaxed font-normal ${isDark ? 'text-white/90' : 'text-teal-950/80'}`}>
              {rest.length > 1 ? rest[1].replace(/^[:\s-]+/, '') : ''}
            </p>
          </div>
        );
      }
      if (trimmedLine.startsWith('**') && trimmedLine.includes('**:')) {
         return (
          <div key={i} className={`${isNested ? 'ml-8' : 'mt-8'} mb-2 font-bold text-lg ${isDark ? 'text-white' : 'text-teal-800'}`}>
            {renderTextWithBold(trimmedLine, false, isDark)}
          </div>
         );
      }
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
        return (
          <li key={i} className={`${isNested ? 'ml-10' : 'ml-6'} list-disc mb-3 text-lg leading-relaxed ${isDark ? 'text-white/80' : 'text-teal-900/80'}`}>
            {renderTextWithBold(trimmedLine.replace(/^[-*•]\s+/, ''), false, isDark)}
          </li>
        );
      }
      return (
        <p key={i} className={`mb-6 leading-relaxed font-medium text-lg ${isNested ? 'ml-8' : ''} ${isDark ? 'text-white/80' : 'text-teal-900/80'}`}>
          {renderTextWithBold(trimmedLine, false, isDark)}
        </p>
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
              {formatContent(sections.clinicalReport)}
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
                    <h3 className="text-white font-black uppercase text-sm tracking-[0.3em]">{patientData.initials}_Clinical_Scribe_Synthesis.pdf</h3>
                    <p className="text-[10px] font-bold text-teal-400/50 uppercase tracking-[0.2em]">Ready for medical archival</p>
                  </div>
                </div>
                {pdfUrl && (
                  <a href={pdfUrl} download={`${patientData.initials}_Psych_Brief.pdf`} className="bg-emerald-600 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40 active:scale-95 flex items-center gap-3">
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

            <div className="bg-white rounded-[3.5rem] border border-teal-50 p-12 md:p-16 shadow-2xl animate-in slide-in-from-bottom-6 duration-700 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                 <i className="fa-brands fa-google-drive text-[150px]"></i>
               </div>
               
               <div className="flex flex-col lg:flex-row items-center justify-between gap-16 relative z-10">
                 <div className="flex items-center gap-10">
                   <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-600 shadow-inner border border-emerald-100">
                     <i className="fa-brands fa-google-drive text-5xl"></i>
                   </div>
                   <div className="space-y-2">
                     <h4 className="font-black text-teal-950 uppercase text-3xl tracking-tight">Sync to Personal Cloud</h4>
                     <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-teal-800/50">
                       <span className={`w-2 h-2 rounded-full ${isDriveLinked ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                       {isDriveLinked ? `Verified Clinical Sync: ${linkedEmail}` : 'Connection required for automated archival.'}
                     </div>
                   </div>
                 </div>

                 <div className="flex flex-wrap items-center gap-6 w-full lg:w-auto">
                   {!isDriveLinked ? (
                     <button 
                      onClick={onLinkDrive}
                      disabled={isLinking}
                      className="w-full lg:w-auto px-12 py-6 bg-teal-950 text-teal-50 rounded-2xl text-sm font-black uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-5 group disabled:opacity-50 shadow-2xl shadow-teal-900/30"
                     >
                       {isLinking ? (
                          <>
                            <i className="fa-solid fa-circle-notch animate-spin text-xl"></i>
                            Authorizing...
                          </>
                       ) : (
                          <>
                            <i className="fa-brands fa-google text-xl group-hover:scale-125 transition-transform"></i>
                            Link My Google Drive
                          </>
                       )}
                     </button>
                   ) : (
                     <div className="flex flex-wrap items-center gap-6 w-full lg:w-auto">
                        <button 
                          onClick={() => setShowFolderPicker(!showFolderPicker)}
                          className="flex-grow lg:flex-none px-12 py-6 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-colors"
                        >
                          {showFolderPicker ? 'Cancel Selection' : 'Choose Target Folder'}
                        </button>
                        <button 
                          onClick={onUnlinkDrive}
                          className="px-8 py-6 border-2 border-red-50 text-red-400 hover:bg-red-50 hover:text-red-600 transition-all rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3"
                          title="Switch or Unlink Account"
                        >
                          <i className="fa-solid fa-link-slash"></i>
                          Change Account
                        </button>
                     </div>
                   )}
                 </div>
               </div>

               {isDriveLinked && showFolderPicker && (
                  <div className="mt-16 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between px-4 border-l-4 border-emerald-500">
                      <span className="text-sm font-black uppercase tracking-[0.4em] text-teal-900">Destination Directory</span>
                      <p className="text-xs font-bold text-teal-800/40 italic">Select the destination folder in your linked clinical storage.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                      {DRIVE_FOLDERS.map((folder) => (
                        <button
                          key={folder.id}
                          disabled={saveStatus !== 'idle'}
                          onClick={() => handleSaveToDrive(folder.id)}
                          className={`p-10 rounded-[2.5rem] border-2 flex flex-col items-center gap-6 transition-all text-center group ${
                            selectedFolder === folder.id 
                              ? 'bg-emerald-600 border-emerald-700 text-white shadow-[0_30px_60px_-15px_rgba(5,150,105,0.4)] scale-105' 
                              : 'bg-slate-50 border-slate-100 text-teal-900 hover:border-teal-300 hover:bg-white hover:shadow-xl'
                          }`}
                        >
                          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-transform group-hover:scale-110 ${selectedFolder === folder.id ? 'bg-white/20' : 'bg-teal-100/50 text-teal-700'}`}>
                            <i className={`fa-solid ${folder.icon} text-2xl`}></i>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-black uppercase tracking-widest block leading-tight">{folder.name}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${selectedFolder === folder.id ? 'text-white/60' : 'text-teal-800/30'}`}>{folder.path}</span>
                          </div>
                          {selectedFolder === folder.id && saveStatus === 'saving' && <i className="fa-solid fa-circle-notch animate-spin text-white text-2xl"></i>}
                          {selectedFolder === folder.id && saveStatus === 'success' && <i className="fa-solid fa-check-double text-white text-3xl animate-bounce"></i>}
                        </button>
                      ))}
                    </div>
                  </div>
               )}
               
               {saveStatus === 'success' && (
                 <div className="mt-12 p-8 bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] text-center text-emerald-800 text-sm font-black uppercase tracking-[0.4em] animate-in slide-in-from-top-6 shadow-xl">
                   <i className="fa-solid fa-cloud-arrow-up mr-4"></i>
                   Cloud Synchronization Finalized.
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};