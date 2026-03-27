import React, { useState, useRef } from 'react';
import { UploadCloud, X, RefreshCw, Activity, FileText, Download, AlertTriangle, Info } from 'lucide-react';
import { analyzeLabResult } from './services/aiService';
import { saveResult } from './services/storageService';
import { generatePdf, generateJson } from './services/pdfService';
import { convertPdfToImage } from './services/pdfConverter';
import { compressImage } from './services/imageUtils';
import { LabResultData } from './types';

export const LaboratorioAnalysis: React.FC = () => {
  const [patientName, setPatientName] = useState('');
  const [clinicalHistoryNumber, setClinicalHistoryNumber] = useState('');
  const [age, setAge] = useState('');
  const [eps, setEps] = useState('');
  const [studyType, setStudyType] = useState('');

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<LabResultData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePatientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPatientName(e.target.value.toUpperCase());
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      
      let currentMimeType = '';
      let currentBase64 = '';

      const parts = result.split(',');
      if (parts.length === 2) {
        const match = parts[0].match(/:(.*?);/);
        if (match) {
          currentMimeType = match[1];
          currentBase64 = parts[1];
        }
      }

      try {
        setIsAnalyzing(true);
        let finalDataUrl = result;
        
        if (currentMimeType === 'application/pdf') {
          finalDataUrl = await convertPdfToImage(result);
        }
        
        // Always compress to JPEG to stay under Firestore 1MB limit
        const compressed = await compressImage(finalDataUrl);
        
        setPreviewUrl(compressed.fullDataUrl);
        setMimeType(compressed.mimeType);
        setBase64Image(compressed.base64);
        setError(null);
      } catch (err) {
        setError('Error al procesar el archivo: ' + (err instanceof Error ? err.message : String(err)));
        setPreviewUrl(null);
        setBase64Image(null);
        setMimeType(null);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      processFile(file);
    }
  };

  const clearImage = (event: React.MouseEvent) => {
    event.stopPropagation();
    setPreviewUrl(null);
    setBase64Image(null);
    setMimeType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !base64Image || !mimeType) return;

    setIsAnalyzing(true);
    setError(null);
    setCurrentResult(null);

    try {
      const result = await analyzeLabResult(
        base64Image,
        mimeType,
        patientName,
        studyType,
        clinicalHistoryNumber,
        age,
        eps
      );
      
      setCurrentResult(result);
      await saveResult(result);
      
      // Clear form for next use
      setPatientName('');
      setClinicalHistoryNumber('');
      setAge('');
      setEps('');
      setStudyType('');
      setPreviewUrl(null);
      setBase64Image(null);
      setMimeType(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al analizar la imagen.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-8 flex items-center gap-3">
        Análisis de Laboratorio - UCI Honda
      </h1>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <form onSubmit={analyze} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="patientName" className="block text-sm font-medium text-slate-700 mb-2">Nombre del Paciente *</label>
              <input 
                id="patientName"
                type="text" 
                value={patientName}
                onChange={handlePatientNameChange}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="Ej. JUAN PÉREZ"
              />
            </div>
            <div>
              <label htmlFor="clinicalHistoryNumber" className="block text-sm font-medium text-slate-700 mb-2">Cédula / Historia Clínica (Opcional)</label>
              <input 
                id="clinicalHistoryNumber"
                type="text" 
                value={clinicalHistoryNumber}
                onChange={(e) => setClinicalHistoryNumber(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="Ej. 123456789"
              />
            </div>
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-slate-700 mb-2">Edad (Opcional)</label>
              <input 
                id="age"
                type="text" 
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="Ej. 45 años"
              />
            </div>
            <div>
              <label htmlFor="eps" className="block text-sm font-medium text-slate-700 mb-2">EPS (Opcional)</label>
              <input 
                id="eps"
                type="text" 
                value={eps}
                onChange={(e) => setEps(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="Ej. Nueva EPS"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="studyType" className="block text-sm font-medium text-slate-700 mb-2">Tipo de Estudio (Opcional / Guía)</label>
              <input 
                id="studyType"
                type="text" 
                value={studyType}
                onChange={(e) => setStudyType(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="Ej. Cuadro Hemático (Si lo conoce)"
              />
            </div>
          </div>

          <div>
            <label htmlFor="fileInput" className="block text-sm font-medium text-slate-700 mb-2">Documento del Resultado (Imagen o PDF) *</label>
            <div 
              className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
              tabIndex={0}
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              <input 
                id="fileInput"
                ref={fileInputRef}
                type="file" 
                accept="image/*,application/pdf" 
                className="hidden" 
                onChange={onFileSelected}
              />
              
              {previewUrl ? (
                <div className="relative inline-block">
                  {mimeType === 'application/pdf' ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-100 rounded-lg shadow-sm">
                      <FileText className="w-16 h-16 text-red-500" />
                      <span className="mt-2 text-sm font-medium text-slate-700">Documento PDF Seleccionado</span>
                    </div>
                  ) : (
                    <img src={previewUrl} alt="Preview" className="max-h-64 rounded-lg shadow-sm mx-auto" />
                  )}
                  <button 
                    type="button"
                    onClick={clearImage}
                    className="absolute -top-3 -right-3 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="bg-brand-50 text-brand-600 p-3 rounded-full">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div className="text-slate-600">
                    <span className="font-semibold text-brand-600">Haz clic para subir</span> o arrastra y suelta
                  </div>
                  <p className="text-xs text-slate-500">PNG, JPG, JPEG o PDF hasta 10MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button 
              type="button"
              onClick={() => {
                setPatientName('');
                setClinicalHistoryNumber('');
                setAge('');
                setEps('');
                setStudyType('');
                setPreviewUrl(null);
                setBase64Image(null);
                setMimeType(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-all"
            >
              Limpiar
            </button>
            <button 
              type="submit" 
              disabled={!patientName || !base64Image || isAnalyzing}
              className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 focus:ring-4 focus:ring-brand-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-brand-200"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="animate-spin" size={20} />
                  Analizando...
                </>
              ) : (
                <>
                  <Activity size={20} />
                  Analizar Resultados
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-8 flex items-start gap-3 border border-red-200">
          <AlertTriangle className="shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold">Error al analizar</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {currentResult?.validationWarning && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl mb-8 flex items-start gap-3 border border-amber-200">
          <AlertTriangle className="shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold">Advertencia de Coincidencia de Datos</h3>
            <p className="text-sm mt-1">{currentResult.validationWarning}</p>
          </div>
        </div>
      )}

      {currentResult && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Resultados del Análisis</h2>
              <p className="text-slate-500 text-sm mt-1">
                Paciente: <span className="font-medium text-slate-700">{currentResult.patientName}</span> | 
                Estudio: <span className="font-medium text-slate-700">{currentResult.studyType}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => generateJson(currentResult)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                <FileText size={20} />
                JSON
              </button>
              <button 
                onClick={() => generatePdf(currentResult)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
              >
                <Download size={20} />
                Descargar PDF
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Parámetro</th>
                    <th className="pb-3 font-semibold">Valor</th>
                    <th className="pb-3 font-semibold">Rango Ref.</th>
                    <th className="pb-3 font-semibold">Estado</th>
                    <th className="pb-3 font-semibold">Análisis</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {currentResult.parameters.map((param) => (
                    <tr key={param.name} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-4 pr-4 font-medium text-slate-800">{param.name}</td>
                      <td className="py-4 pr-4">
                        <span className={param.status !== 'Normal' ? 'font-bold text-red-600' : ''}>
                          {param.value} {param.unit}
                          {param.status !== 'Normal' && ' *'}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-slate-500">{param.referenceRange}</td>
                      <td className="py-4 pr-4">
                        {param.status === 'Normal' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Normal
                          </span>
                        ) : param.status === 'Alto' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Alto *
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Bajo *
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-slate-600">{param.analysis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 bg-brand-50 rounded-xl p-6 border border-brand-100">
              <h3 className="text-brand-900 font-semibold mb-2 flex items-center gap-2">
                <Info size={20} />
                Análisis General
              </h3>
              <p className="text-brand-800 leading-relaxed">{currentResult.generalAnalysis}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
