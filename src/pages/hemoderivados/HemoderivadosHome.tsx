import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Droplets, Inbox, Activity, CheckCircle, ArrowRight, Cloud, CloudOff, RefreshCw, LogOut, FileText, ArrowLeft } from 'lucide-react';
import { TraceabilityExportModal } from './components/TraceabilityExportModal';
import { SimpleConfirmModal } from '../../components/SimpleConfirmModal';

export const HemoderivadosHome: React.FC = () => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isUsingApiKey, setIsUsingApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTraceabilityModalOpen, setIsTraceabilityModalOpen] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  useEffect(() => {
    document.title = 'Hemocomponentes';
    checkConnectionStatus();
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        checkConnectionStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/auth/google/status');
      const data = await response.json();
      setIsConnected(data.connected);
      setIsUsingApiKey(data.usingApiKey);
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
      setIsUsingApiKey(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/url');
      const data = await response.json();
      if (data.url) {
        window.open(data.url, 'google_auth', 'width=600,height=700');
      }
    } catch (error) {
      console.error('Error connecting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/google/logout', { method: 'POST' });
      setIsConnected(false);
    } catch (error) {
      console.error('Error disconnecting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const modules = [
    {
      id: 'recepcion',
      title: 'Recepción',
      description: 'Gestión de ingreso y registro inicial de hemoderivados.',
      icon: <Inbox size={32} />,
      color: 'bg-blue-50 text-blue-600',
      hoverColor: 'hover:bg-blue-600 hover:text-white',
      path: '/hemoderivados/recepcion'
    },
    {
      id: 'pre-transfusional',
      title: 'Pre-transfusional',
      description: 'Pruebas cruzadas y compatibilidad sanguínea.',
      icon: <Droplets size={32} />,
      color: 'bg-red-50 text-red-600',
      hoverColor: 'hover:bg-red-600 hover:text-white',
      path: '/hemoderivados/pre-transfusional'
    },
    {
      id: 'uso',
      title: 'Uso',
      description: 'Registro de transfusiones y seguimiento de pacientes.',
      icon: <Activity size={32} />,
      color: 'bg-emerald-50 text-emerald-600',
      hoverColor: 'hover:bg-emerald-600 hover:text-white',
      path: '/hemoderivados/uso'
    },
    {
      id: 'disposicion',
      title: 'Disposición Final',
      description: 'Control de unidades descartadas y disposición final.',
      icon: <CheckCircle size={32} />,
      color: 'bg-purple-50 text-purple-600',
      hoverColor: 'hover:bg-purple-600 hover:text-white',
      path: '/hemoderivados/disposicion'
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          Volver al Menú Principal
        </button>
        <div className="text-center mb-12">
          <div className="bg-white p-4 rounded-3xl shadow-sm inline-block mb-6">
            <img 
              src="/logo.png" 
              alt="Logo UCI Honda" 
              className="h-16 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-4 tracking-tight">
            Sistema de Gestión de Hemoderivados
          </h1>
          <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
            Seleccione el módulo al que desea acceder para continuar con la gestión y control de unidades sanguíneas.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={() => setIsTraceabilityModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors shadow-lg"
          >
            <FileText size={20} />
            Exportar Trazabilidad (PDF)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {modules.map((mod, idx) => (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => navigate(mod.path)}
              className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${mod.color} ${mod.hoverColor}`}>
                {mod.icon}
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2 group-hover:text-zinc-800 transition-colors">
                {mod.title}
              </h2>
              <p className="text-zinc-500 mb-6">
                {mod.description}
              </p>
              <div className="flex items-center text-sm font-bold text-zinc-400 group-hover:text-zinc-900 transition-colors">
                Ingresar al módulo <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Google Drive Connection Section */}
        <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${(isConnected || isUsingApiKey) ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
                {(isConnected || isUsingApiKey) ? <Cloud size={32} /> : <CloudOff size={32} />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900">Google Drive & Sheets</h3>
                <p className="text-zinc-500 text-sm">
                  {isConnected 
                    ? 'Conectado (OAuth). Los datos se están sincronizando con la hoja de cálculo unificada.' 
                    : isUsingApiKey 
                      ? 'Conectado (API Key). Sincronización habilitada mediante clave de acceso directa.'
                      : 'Desconectado. Conecte su cuenta para habilitar la sincronización de datos.'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              {isConnected === null ? (
                <div className="flex items-center gap-2 text-zinc-400 px-6 py-3">
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Verificando...</span>
                </div>
              ) : isConnected ? (
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-red-50 hover:text-red-600 text-zinc-600 px-6 py-3 rounded-2xl font-bold transition-all w-full md:w-auto disabled:opacity-50"
                >
                  <LogOut size={18} />
                  Desconectar
                </button>
              ) : isUsingApiKey ? (
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-zinc-200 transition-all w-full md:w-auto disabled:opacity-50"
                >
                  <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                  Cambiar a OAuth
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all w-full md:w-auto disabled:opacity-50"
                >
                  {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Cloud size={18} />}
                  Conectar Google Drive
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-16 text-center text-sm text-zinc-400">
          © {new Date().getFullYear()} UCI Honda Tecnología. Todos los derechos reservados.
        </div>
      </div>

      <TraceabilityExportModal 
        isOpen={isTraceabilityModalOpen} 
        onClose={() => setIsTraceabilityModalOpen(false)} 
      />

      <SimpleConfirmModal
        isOpen={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        onConfirm={handleDisconnect}
        title="Desconectar Google Drive"
        message="¿Está seguro de que desea desconectar Google Drive? La sincronización dejará de funcionar."
        confirmText="Desconectar"
      />
    </div>
  );
};
