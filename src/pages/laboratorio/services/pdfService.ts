import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LabResultData } from '../types';
import { PROFESSIONALS } from '../../../constants';

// Helper to load image
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (reject);
    img.src = url;
  });
};

export const generatePdf = async (result: LabResultData) => {
  const doc = new jsPDF();
  let currentY = 15;
  
  // Add Logo
  try {
    const logoImg = await loadImage('/logo.png');
    const logoProps = doc.getImageProperties(logoImg);
    const logoWidth = 20; // Reduced from 30
    const logoHeight = (logoProps.height * logoWidth) / logoProps.width;
    doc.addImage(logoImg, 'PNG', 14, 10, logoWidth, logoHeight);
    currentY = Math.max(currentY, 10 + logoHeight + 5);
  } catch (e) {
    console.error('Error loading logo for PDF', e);
    currentY = 30;
  }

  // Header Title
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('Resultados de Laboratorio', 50, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Fecha: ${new Date(result.date).toLocaleDateString()}`, 14, currentY);
  currentY += 10;
  
  // Patient Info
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Información del Paciente', 14, currentY);
  currentY += 5;
  
  autoTable(doc, {
    startY: currentY,
    head: [['Paciente', 'Identificación', 'Edad', 'EPS', 'Estudio']],
    body: [[
      result.patientName,
      result.clinicalHistoryNumber || 'N/A',
      result.age || 'N/A',
      result.eps || 'N/A',
      result.studyType || 'N/A'
    ]],
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59] },
    styles: { fontSize: 9 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Parameters Table
  doc.setFontSize(12);
  doc.text('Parámetros Analizados', 14, currentY);
  currentY += 5;
  
  const tableData = result.parameters.map(p => [
    p.name,
    `${p.value} ${p.unit}`,
    p.referenceRange,
    p.status,
    p.analysis
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Parámetro', 'Valor', 'Rango Ref.', 'Estado', 'Análisis']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59] },
    styles: { fontSize: 9 },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 3) {
        const status = data.cell.raw as string;
        if (status === 'Alto') {
          data.cell.styles.textColor = [220, 38, 38]; // red-600
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'Bajo') {
          data.cell.styles.textColor = [217, 119, 6]; // amber-600
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [5, 150, 105]; // emerald-600
        }
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // General Analysis
  if (result.generalAnalysis) {
    // Check if we need a new page for analysis header
    if (currentY > 260) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Análisis General', 14, currentY);
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // slate-600
    const splitText = doc.splitTextToSize(result.generalAnalysis, 180);
    
    // Check if text fits, if not, move to next page
    if (currentY + 7 + (splitText.length * 5) > 270) {
      doc.addPage();
      currentY = 20;
      doc.text('Análisis General (cont.)', 14, currentY);
      currentY += 7;
    } else {
      currentY += 7;
    }
    
    doc.text(splitText, 14, currentY);
    currentY += (splitText.length * 5) + 10;
  }

  // Signature and Professional Info (Right after analysis)
  const professional = PROFESSIONALS.find(p => p.name === result.bacteriologist) || PROFESSIONALS[0];
  
  let sigWidth = 20; // Reduced from 30
  let sigHeight = 15; // Default height

  try {
    const signature = await loadImage(professional.signaturePath);
    sigHeight = (signature.height * sigWidth) / signature.width;
    
    // Ensure enough space from previous content to avoid overlap
    currentY += sigHeight + 10; 

    // Check if we need a new page for signature
    if (currentY > 270) {
      doc.addPage();
      currentY = 30 + sigHeight;
    }

    doc.addImage(signature, 'PNG', 14, currentY - sigHeight, sigWidth, sigHeight);
  } catch (e) {
    console.error('Error loading signature:', e);
    try {
      const fallbackSignature = await loadImage('/firma1.png');
      sigHeight = (fallbackSignature.height * sigWidth) / fallbackSignature.width;
      currentY += sigHeight + 10;
      
      if (currentY > 270) {
        doc.addPage();
        currentY = 30 + sigHeight;
      }
      
      doc.addImage(fallbackSignature, 'PNG', 14, currentY - sigHeight, sigWidth, sigHeight);
    } catch (fallbackError) {
      console.error('Error loading fallback signature:', fallbackError);
      currentY += 20; // Space for the line if no signature
    }
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY + 1, 74, currentY + 1);
  
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(professional.name, 14, currentY + 6);
  
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Bacteriólogo(a) - Reg. ${professional.registry}`, 14, currentY + 11);
  
  currentY += 20; // Update currentY for next content

  // Original Sample Image (Always on a new page)
  if (result.sourceImage) {
    doc.addPage();
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Documento Original Adjunto', 14, 20);
    
    try {
      const sourceImage = result.sourceImage;
      let format = 'JPEG';
      if (sourceImage.startsWith('data:image/png')) format = 'PNG';
      if (sourceImage.startsWith('data:image/webp')) format = 'WEBP';
      
      const imgProps = doc.getImageProperties(sourceImage);
      const pdfWidth = doc.internal.pageSize.getWidth() - 28;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      const maxPdfHeight = doc.internal.pageSize.getHeight() - 40;
      let finalWidth = pdfWidth;
      let finalHeight = pdfHeight;
      
      if (pdfHeight > maxPdfHeight) {
        finalHeight = maxPdfHeight;
        finalWidth = (imgProps.width * finalHeight) / imgProps.height;
      }
      
      const xOffset = (doc.internal.pageSize.getWidth() - finalWidth) / 2;
      doc.addImage(sourceImage, format, xOffset, 30, finalWidth, finalHeight);
    } catch (e) {
      console.error('Error adding source image to PDF', e);
    }
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Página ${i} de ${pageCount} - Generado por UCI Honda`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  const dateStr = new Date(result.date).toISOString().split('T')[0];
  const safePatientName = result.patientName.replace(/\s+/g, '_');
  doc.save(`${dateStr}_Resultado_Laboratorio_${safePatientName}.pdf`);
};

export const generateJson = (result: LabResultData) => {
  const dateStr = new Date(result.date).toISOString().split('T')[0];
  const safePatientName = result.patientName.replace(/\s+/g, '_');
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", `${dateStr}_Resultado_Laboratorio_${safePatientName}.json`);
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};
