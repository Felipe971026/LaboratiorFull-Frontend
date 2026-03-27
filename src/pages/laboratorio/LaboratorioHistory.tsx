import React, { useState, useEffect } from 'react';
import { History, Trash2, AlertTriangle, Inbox, Paperclip, FileText, Download, Eye } from 'lucide-react';
import { loadResults, clearAllResults, deleteResult, updateResult } from './services/storageService';
import { generatePdf, generateJson } from './services/pdfService';
import { LabResultData } from './types';
import { format } from 'date-fns';
import { LaboratorioDetailModal } from './LaboratorioDetailModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';

export const LaboratorioHistory: React.FC = () => {
  const [results, setResults] = useState<LabResultData[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<LabResultData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resultToDelete, setResultToDelete] = useState<string | null>(null);

  const fetchResults = async () => {
    setIsLoading(true);
    try {
      const data = await loadResults();
      setResults(data);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const getAbnormalParams = (result: LabResultData) => {
    return result.parameters.filter(p => p.status !== 'Normal');
  };

  const confirmClearHistory = async () => {
    await clearAllResults();
    setResults([]);
    setShowClearConfirm(false);
  };

  const handleDeleteClick = (id: string) => {
    setResultToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (resultToDelete) {
      await deleteResult(resultToDelete);
      setResults(results.filter(r => r.id !== resultToDelete));
      setSelectedResult(null);
      setResultToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleUpdate = async (id: string, data: Partial<LabResultData>) => {
    await updateResult(id, data);
    const updatedResults = results.map(r => r.id === id ? { ...r, ...data } as LabResultData : r);
    setResults(updatedResults);
    setSelectedResult(updatedResults.find(r => r.id === id) || null);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          Historial de Resultados
        </h1>
        
        {results.length > 0 && (
          <button 
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <Trash2 size={20} />
            Limpiar Historial
          </button>
        )}
      </div>

      {selectedResult && (
        <LaboratorioDetailModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
          onDelete={handleDeleteClick}
          onUpdate={handleUpdate}
        />
      )}

      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setResultToDelete(null);
        }}
        onConfirm={confirmDelete}
      />

      <DeleteConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={confirmClearHistory}
        title="Limpiar Todo el Historial"
        message="Esta acción eliminará todos los registros de laboratorio. Por favor ingrese las credenciales para confirmar."
      />

      {results.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="bg-slate-50 text-slate-400 p-4 rounded-full inline-block mb-4">
            <Inbox size={48} />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">No hay resultados guardados</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Los resultados de los análisis que realices aparecerán aquí (hasta los últimos 20).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((result) => {
            const abnormalParams = getAbnormalParams(result);
            return (
              <div key={result.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-5 flex-1 cursor-pointer" onClick={() => setSelectedResult(result)}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-brand-50 text-brand-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {result.studyType || 'Estudio'}
                    </div>
                    <div className="flex items-center gap-2">
                      {result.sourceImage && (
                        <Paperclip className="text-slate-400 w-4 h-4" />
                      )}
                      <div className="text-slate-400 text-sm">
                        {format(new Date(result.date), 'dd/MM/yyyy')}
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{result.patientName}</h3>
                  <p className="text-slate-500 text-sm mb-4">
                    {result.parameters.length} parámetros analizados
                  </p>
                  
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Hallazgos principales</div>
                    <div className="flex flex-wrap gap-2">
                      {abnormalParams.slice(0, 3).map((param) => (
                        <span 
                          key={param.name}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            param.status === 'Alto' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {param.name}: {param.status}
                        </span>
                      ))}
                      {abnormalParams.length === 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                          Todos los parámetros normales
                        </span>
                      )}
                      {abnormalParams.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
                          +{abnormalParams.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between items-center">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => generateJson(result)}
                      className="text-slate-600 hover:text-brand-600 transition-colors p-2 rounded-lg hover:bg-brand-50"
                      title="Descargar JSON"
                    >
                      <FileText size={20} />
                    </button>
                    <button 
                      onClick={() => setSelectedResult(result)}
                      className="text-slate-600 hover:text-brand-600 transition-colors p-2 rounded-lg hover:bg-brand-50"
                      title="Ver Detalles"
                    >
                      <Eye size={20} />
                    </button>
                  </div>
                  <button 
                    onClick={() => generatePdf(result)}
                    className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm px-3 py-2 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    <Download size={20} />
                    Descargar PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
