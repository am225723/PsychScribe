
import React, { useMemo, useState, useEffect } from 'react';
import { jsPDF } from "jspdf";
import { ReportTab } from '../App';

interface ReportViewProps { 
  report: string; 
  activeTab: ReportTab;
}

export const ReportView: React.FC<ReportViewProps> = ({ report, activeTab }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
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
        doc.setFillColor(15, 60, 60); // Dark Teal
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

      // Initial Setup
      addHeader(1);

      // 1. Clinical Summary Block (Top)
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
            // It's a numbered point
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

      // Sections
      addSectionTitle("1. Comprehensive Clinical Synthesis");
      processContentBlock(sections.clinicalReport);
      
      addSectionTitle("2. Detailed Review of Systems");
      processContentBlock(sections.extendedRecord);

      addSectionTitle("3. Impressions & Reasoning");
      processContentBlock(sections.impressions);

      addSectionTitle("4. Proposed Treatment Strategy");
      processContentBlock(sections.treatmentPlan);

      // Final Footer for the last page
      addFooter(doc.internal.pages.length - 1);

      const blob = doc.output('blob');
      setPdfBlob(blob);
      setPdfUrl(URL.createObjectURL(blob));
    };

    if (sections.clinicalReport) generatePDF();
  }, [sections, patientData, isUrgent, triggerQuotes]);

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

      // Header rendering
      if (trimmedLine.startsWith('#')) {
        const cleanHeader = trimmedLine.replace(/^#+\s*/, '');
        return (
          <div 
            key={i} 
            className={`font-black uppercase tracking-tight mb-4 mt-8 first:mt-0 text-lg md:text-xl ${isDark ? 'text-white' : 'text-teal-900'}`}
          >
            {cleanHeader}
          </div>
        );
      }

      // Numbered Inquiry rendering
      if (/^\d+\.\s/.test(trimmedLine)) {
        const [numberPart, ...rest] = trimmedLine.split('**');
        return (
          <div key={i} className="mb-4 mt-6 pl-0">
            <span className={`text-[10px] md:text-xs font-bold uppercase tracking-widest border-b-2 pb-0.5 mb-2 inline-block ${isDark ? 'text-white border-white/10' : 'text-teal-950 border-teal-50'}`}>
              {numberPart}{rest[0]}
            </span>
            <p className={`text-[11px] md:text-sm leading-relaxed font-normal mt-1 ${isDark ? 'text-white/80' : 'text-teal-900/70'}`}>
              {rest.length > 1 ? rest[1].replace(/^[:\s-]+/, '') : ''}
            </p>
          </div>
        );
      }

      // Strong labels
      if (trimmedLine.startsWith('**') && trimmedLine.includes('**:')) {
         return (
          <div 
            key={i} 
            className={`${isNested ? 'ml-3 md:ml-4' : 'mt-4'} mb-1 font-bold text-[11px] md:text-sm ${isDark ? 'text-white' : 'text-teal-800'}`}
          >
            {renderTextWithBold(trimmedLine, false, isDark)}
          </div>
         );
      }

      // Bullet points
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
        return (
          <li 
            key={i} 
            className={`${isNested ? 'ml-4 md:ml-6' : 'ml-2 md:ml-4'} list-disc mb-1.5 text-[11px] md:text-sm ${isDark ? 'text-white/80' : 'text-teal-900/80'}`}
          >
            {renderTextWithBold(trimmedLine.replace(/^[-*•]\s+/, ''), false, isDark)}
          </li>
        );
      }

      // Standard paragraphs
      return (
        <p 
          key={i} 
          className={`mb-3 leading-relaxed font-medium text-[11px] md:text-sm ${isNested ? 'ml-3 md:ml-4' : ''} ${isDark ? 'text-white/80' : 'text-teal-900/80'}`}
        >
          {renderTextWithBold(trimmedLine, false, isDark)}
        </p>
      );
    });
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 lg:pb-0">
      {isUrgent && (
        <div className="space-y-3">
          <div className="bg-red-700 text-white px-4 md:px-8 py-4 md:py-6 rounded-[1.2rem] md:rounded-[2rem] shadow-xl flex items-center gap-3 md:gap-6 border-b-4 border-red-900">
            <i className="fa-solid fa-triangle-exclamation text-2xl md:text-3xl animate-pulse"></i>
            <div>
              <h2 className="text-sm md:text-lg font-black uppercase tracking-[0.1em]">Safety Escalation</h2>
              <p className="font-bold opacity-90 text-[10px] md:text-sm">Acute markers for {patientData.fullName}.</p>
            </div>
          </div>
          {triggerQuotes && (
            <div className="bg-white border border-red-100 p-4 md:p-6 rounded-[1.2rem] md:rounded-[1.5rem] shadow-md relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
               <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-red-600 mb-2">Trigger Quotes</h4>
               <p className="text-teal-950 font-bold italic text-[11px] md:text-sm leading-relaxed bg-red-50/50 p-3 md:p-4 rounded-lg">"{triggerQuotes}"</p>
            </div>
          )}
        </div>
      )}

      {/* Desktop Tab Bar */}
      <div className="hidden lg:flex bg-white p-1 rounded-[1.2rem] md:rounded-[1.5rem] border border-teal-50 shadow-xl sticky top-[72px] md:top-24 z-40 overflow-x-auto no-scrollbar gap-1 ring-1 ring-teal-50">
        {(['clinical-report', 'extended-record', 'treatment-plan', 'pdf-view'] as const).map((tab) => (
          <div
            key={tab}
            className={`flex-1 min-w-[120px] md:min-w-[150px] py-2.5 md:py-3 px-3 md:px-6 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === tab ? 'bg-teal-800 text-white shadow-lg' : 'text-teal-800/40'
            }`}
          >
            <i className={`fa-solid ${tab === 'clinical-report' ? 'fa-id-card' : tab === 'extended-record' ? 'fa-dna' : tab === 'treatment-plan' ? 'fa-clipboard-user' : 'fa-file-medical'}`}></i>
            {tab.split('-').join(' ')}
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'clinical-report' && (
          <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-teal-50 p-4 md:p-12 lg:p-20 max-w-[21.5cm] mx-auto min-h-[30cm] ring-1 ring-teal-50/50">
            <div className="mb-6 md:mb-12 pb-3 md:pb-6 border-b border-teal-50 flex justify-between items-end">
               <div>
                  <h1 className="text-lg md:text-2xl font-black text-teal-900 uppercase tracking-tighter">Clinical Brief</h1>
                  <p className="text-teal-800/40 font-bold uppercase tracking-widest text-[8px] md:text-[9px] mt-0.5">{patientData.fullName}</p>
               </div>
               <div className="text-right hidden sm:block">
                  <p className="text-[9px] font-black uppercase tracking-widest text-teal-800/40">{new Date().toLocaleDateString()}</p>
               </div>
            </div>
            <div className="report-content">
              {formatContent(sections.clinicalReport)}
            </div>
          </div>
        )}

        {activeTab === 'extended-record' && (
          <div className="grid gap-4 md:gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-[1.2rem] md:rounded-[2rem] shadow-lg border border-teal-50 overflow-hidden">
              <div className="px-4 md:px-8 py-3 md:py-4 bg-teal-50/30 border-b border-teal-50 flex items-center gap-3">
                <i className="fa-solid fa-notes-medical text-teal-800 text-xs"></i>
                <h3 className="font-black text-teal-900 uppercase text-[9px] tracking-[0.2em]">Review of Systems</h3>
              </div>
              <div className="p-4 md:p-8 text-teal-900">{formatContent(sections.extendedRecord)}</div>
            </div>
            <div className="bg-teal-900 text-teal-50 rounded-[1.2rem] md:rounded-[2rem] shadow-xl overflow-hidden">
              <div className="px-4 md:px-8 py-3 md:py-4 bg-white/5 border-b border-white/10 flex items-center gap-3">
                <i className="fa-solid fa-microscope text-teal-400 text-xs"></i>
                <h3 className="font-black text-white uppercase text-[9px] tracking-[0.2em]">Clinical Synthesis</h3>
              </div>
              <div className="p-4 md:p-8 font-medium text-[11px] md:text-base leading-relaxed">
                {formatContent(sections.impressions, true)}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'treatment-plan' && (
          <div className="bg-white rounded-[1.2rem] md:rounded-[2rem] shadow-lg border border-teal-50 overflow-hidden max-w-5xl mx-auto">
            <div className="px-4 md:px-8 py-3 md:py-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center gap-3">
              <i className="fa-solid fa-vial-circle-check text-emerald-700 text-xs"></i>
              <h3 className="font-black text-emerald-900 uppercase text-[9px] tracking-[0.2em]">Treatment Strategy</h3>
            </div>
            <div className="p-4 md:p-8 text-teal-900">
              {formatContent(sections.treatmentPlan)}
            </div>
          </div>
        )}

        {activeTab === 'pdf-view' && (
          <div className="max-w-6xl mx-auto px-1">
            <div className="bg-teal-950 rounded-[1.5rem] md:rounded-[2.5rem] border border-teal-900 overflow-hidden shadow-2xl h-[500px] md:h-[800px] flex flex-col">
              <div className="px-4 md:px-8 py-3 md:py-4 border-b border-teal-900 flex flex-col sm:flex-row items-center justify-between bg-black/20 gap-3">
                <h3 className="text-white font-black uppercase text-[9px] tracking-[0.2em] flex items-center gap-2">
                  <i className="fa-solid fa-file-pdf text-emerald-500 text-base"></i> {patientData.initials}_Intake_Synthesis.pdf
                </h3>
                {pdfUrl && (
                  <a href={pdfUrl} download={`${patientData.initials}_Intake_Synthesis.pdf`} className="w-full sm:w-auto text-center bg-emerald-600 text-white px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all">
                    Download Official Report
                  </a>
                )}
              </div>
              <div className="flex-grow bg-teal-900/50 p-2 md:p-8">
                 {pdfUrl ? (
                   <iframe src={pdfUrl} className="w-full h-full rounded-lg md:rounded-2xl" title="PDF Preview"></iframe>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center text-teal-400/50">
                     <i className="fa-solid fa-dna animate-spin text-2xl mb-3"></i>
                     <p className="font-black uppercase tracking-[0.2em] text-[9px]">Building Clinical Document...</p>
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
