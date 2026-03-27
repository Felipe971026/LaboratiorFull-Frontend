import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';
import { LabResultData, LabGraph } from '../types';

export const generatePdf = async (result: LabResultData) => {
  const doc = new jsPDF();
  
  // Add Logo
  try {
    const logoImg = new Image();
    logoImg.src = '/logo.png';
    await new Promise((resolve, reject) => {
      logoImg.onload = resolve;
      logoImg.onerror = reject;
    });
    doc.addImage(logoImg, 'PNG', 14, 10, 30, 15);
  } catch (e) {
    console.error('Error loading logo for PDF', e);
  }

  // Header
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('Resultados de Laboratorio', 50, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Fecha: ${new Date(result.date).toLocaleDateString()}`, 14, 35);
  
  // Patient Info
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Información del Paciente', 14, 45);
  
  autoTable(doc, {
    startY: 50,
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

  // Parameters Table
  doc.text('Parámetros Analizados', 14, (doc as any).lastAutoTable.finalY + 10);
  
  const tableData = result.parameters.map(p => [
    p.name,
    `${p.value} ${p.unit}`,
    p.referenceRange,
    p.status,
    p.analysis
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 15,
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

  // General Analysis
  if (result.generalAnalysis) {
    let currentY = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Análisis General', 14, currentY);
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // slate-600
    const splitText = doc.splitTextToSize(result.generalAnalysis, 180);
    doc.text(splitText, 14, currentY + 7);
  }

  // Original Sample Image
  if (result.sourceImage) {
    doc.addPage();
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Documento Original Adjunto', 14, 20);
    
    try {
      // Calculate aspect ratio to fit within page
      const sourceImage = result.sourceImage;
      let format = 'JPEG';
      if (sourceImage.startsWith('data:image/png')) format = 'PNG';
      if (sourceImage.startsWith('data:image/webp')) format = 'WEBP';
      
      const imgProps = doc.getImageProperties(sourceImage);
      const pdfWidth = doc.internal.pageSize.getWidth() - 28; // 14px margin on each side
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // If height is greater than page height, scale by height instead
      const maxPdfHeight = doc.internal.pageSize.getHeight() - 40;
      let finalWidth = pdfWidth;
      let finalHeight = pdfHeight;
      
      if (pdfHeight > maxPdfHeight) {
        finalHeight = maxPdfHeight;
        finalWidth = (imgProps.width * finalHeight) / imgProps.height;
      }
      
      // Center horizontally
      const xOffset = (doc.internal.pageSize.getWidth() - finalWidth) / 2;
      
      doc.addImage(sourceImage, format, xOffset, 30, finalWidth, finalHeight);
    } catch (e) {
      console.error('Error adding source image to PDF', e);
      doc.setFontSize(10);
      doc.setTextColor(220, 38, 38);
      doc.text('Error al adjuntar la imagen original', 14, 30);
    }
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Página ${i} de ${pageCount} - Generado automáticamente por UCI Honda AI`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  doc.save(`Resultado_Laboratorio_${result.patientName.replace(/\s+/g, '_')}_${new Date(result.date).getTime()}.pdf`);
};

export const generateJson = (result: LabResultData) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", `Resultado_Laboratorio_${result.patientName.replace(/\s+/g, '_')}_${new Date(result.date).getTime()}.json`);
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};
