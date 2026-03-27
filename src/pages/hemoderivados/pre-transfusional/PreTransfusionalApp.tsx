import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BloodTestForm } from '../components/BloodTestForm';
import { generateInterpretation } from '../utils/bloodTestUtils';
import { RecordCard } from '../components/RecordCard';
import { BloodTestRecord } from '../types';
import { Droplets, History, Plus, Search, LogIn, LogOut, User as UserIcon, ShieldCheck, X, FileText, Calendar, UserCheck, Activity, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, loginWithGoogle, logout } from '../../../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { dataService } from '../../../services/dataService';

export const PreTransfusionalApp: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<BloodTestRecord[]>([]);
  const [receivedUnits, setReceivedUnits] = useState<any[]>([]);
  const [transfusionRecords, setTransfusionRecords] = useState<any[]>([]);
  const [dispositionRecords, setDispositionRecords] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BloodTestRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<BloodTestRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [isSystemUnlocked, setIsSystemUnlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncToSheets = async (record: BloodTestRecord) => {
    if (!isGoogleConnected) return;
    
    try {
      const response = await fetch('/api/sync/sheets/pre-transfusional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record }),
      });
      
      if (!response.ok) {
        console.error('Failed to sync to Google Sheets');
      }
    } catch (error) {
      console.error('Error syncing to Google Sheets:', error);
    }
  };

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    document.title = 'Pre-transfusional - Hemocomponentes';
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (!currentUser) {
        setIsSystemUnlocked(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkGoogleStatus = async () => {
      try {
        const response = await fetch('/api/auth/google/status');
        const data = await response.json();
        setIsGoogleConnected(data.connected);
      } catch (error) {
        console.error('Error checking Google status:', error);
      }
    };
    if (user && isSystemUnlocked) {
      checkGoogleStatus();
    }
  }, [user, isSystemUnlocked]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsGoogleConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsGoogleConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const data = await response.json();
      
      if (!response.ok) {
        alert(data.error || 'Error al conectar con Google');
        return;
      }
      
      window.open(data.url, 'google_auth_popup', 'width=600,height=700');
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
      alert('Error de red al intentar conectar con Google');
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await fetch('/api/auth/google/logout', { method: 'POST' });
      setIsGoogleConnected(false);
    } catch (error) {
      console.error('Error logging out of Google:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('El usuario cerró la ventana de inicio de sesión.');
      } else {
        console.error('Error al iniciar sesión con Google:', error);
      }
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Error al conectar con Google');
        return;
      }
      window.open(data.url, 'google_auth_popup', 'width=600,height=700');
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
      alert('Error de red al intentar conectar con Google');
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await fetch('/api/auth/google/logout', { method: 'POST' });
      setIsGoogleConnected(false);
    } catch (error) {
      console.error('Error logging out of Google:', error);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const normalizedUsername = username.trim().toLowerCase();
    if (
      (normalizedUsername === 'lvaleriano' && password === 'LAB2026*') ||
      (normalizedUsername === 'admin' && password === 'admin') ||
      (user?.email === 'ingbiomedico@ucihonda.com.co')
    ) {
      setIsSystemUnlocked(true);
      if (normalizedUsername === 'admin' || user?.email === 'ingbiomedico@ucihonda.com.co') {
        setIsAdmin(true);
      }
    } else {
      setLoginError('Usuario o contraseña incorrectos.');
    }
  };

  const handleLogout = async () => {
    setIsSystemUnlocked(false);
    await logout();
  };

  useEffect(() => {
    if (!isAuthReady || !user || !isSystemUnlocked) {
      setRecords([]);
      return;
    }

    const path = 'bloodTestRecords';

    const fetchAllData = async () => {
      try {
        const [recordsData, receivedUnitsData, transfusionData, dispositionData] = await Promise.all([
          dataService.getRecords<BloodTestRecord>(path),
          dataService.getRecords<any>('receivedUnits'),
          dataService.getRecords<any>('transfusionUse'),
          dataService.getRecords<any>('finalDisposition')
        ]);
        setRecords(recordsData);
        setReceivedUnits(receivedUnitsData);
        setTransfusionRecords(transfusionData);
        setDispositionRecords(dispositionData);
      } catch (error) {
        console.error('Error fetching data via API:', error);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 10000); // Poll every 10s

    return () => clearInterval(interval);
  }, [isAuthReady, user, isSystemUnlocked]);

  const saveRecord = async (recordData: Omit<BloodTestRecord, 'id' | 'createdAt' | 'uid' | 'userEmail'>) => {
    if (!user) return;

    const path = 'bloodTestRecords';
    try {
      let savedRecord: BloodTestRecord;
      
      if (editingRecord?.id) {
        // Update existing record
        const updateData = {
          ...editingRecord,
          ...recordData,
          updatedAt: new Date().toISOString(),
          updatedBy: user.email || user.uid,
        };
        savedRecord = await dataService.saveRecord<any>(path, updateData) as BloodTestRecord;
      } else {
        // Create new record
        const newRecord = {
          ...recordData,
          uid: user.uid,
          userEmail: user.email || '',
          createdAt: new Date().toISOString(),
        };
        savedRecord = await dataService.saveRecord<any>(path, newRecord) as BloodTestRecord;
      }

      // Sync to Google Sheets if connected
      if (isGoogleConnected) {
        setIsSyncing(true);
        try {
          await syncToSheets(savedRecord);
        } catch (syncError) {
          console.error('Error syncing to Google Sheets:', syncError);
        } finally {
          setIsSyncing(false);
        }
      }

      // Refresh local state
      const updatedRecords = await dataService.getRecords<BloodTestRecord>(path);
      setRecords(updatedRecords);

      setEditingRecord(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Error al guardar el registro.');
    }
  };

  const handleEdit = (record: BloodTestRecord) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleNewRecord = () => {
    setEditingRecord(null);
    setShowForm(true);
  };

  const deleteRecord = (id: string) => {
    setRecordToDelete(id);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    const path = 'bloodTestRecords';
    try {
      await dataService.deleteRecord(path, recordToDelete);
      
      // Refresh local state
      const updatedRecords = await dataService.getRecords<BloodTestRecord>(path);
      setRecords(updatedRecords);
      
      setRecordToDelete(null);
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error al eliminar el registro.');
    }
  };

  const filteredRecords = records.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.patientName && r.patientName.toLowerCase().includes(term)) ||
      (r.patientId && r.patientId.includes(term)) ||
      (r.unitId && r.unitId.toLowerCase().includes(term)) ||
      (r.qualitySeal && r.qualitySeal.toLowerCase().includes(term)) ||
      (r.provider && r.provider.toLowerCase().includes(term)) ||
      (r.requestedHemoderivative && r.requestedHemoderivative.toLowerCase().includes(term)) ||
      (r.requestType && r.requestType.toLowerCase().includes(term))
    );
  });

  const groupedRecords = filteredRecords.reduce((acc, record) => {
    const patientKey = `${record.patientId || 'unknown'}_${(record.patientName || '').trim().toLowerCase()}_${record.bloodGroup || ''}${record.rh || ''}`;
    
    if (!acc[patientKey]) {
      acc[patientKey] = {
        patientId: record.patientId || 'Desconocido',
        patientName: record.patientName || 'Desconocido',
        bloodGroup: record.bloodGroup || '',
        rh: record.rh || '',
        hemoderivativeGroups: {}
      };
    }

    const hemoType = record.requestedHemoderivative || 'Otro';
    if (!acc[patientKey].hemoderivativeGroups[hemoType]) {
      acc[patientKey].hemoderivativeGroups[hemoType] = [];
    }
    acc[patientKey].hemoderivativeGroups[hemoType].push(record);
    
    return acc;
  }, {} as Record<string, { 
    patientId: string, 
    patientName: string, 
    bloodGroup: string, 
    rh: string, 
    hemoderivativeGroups: Record<string, BloodTestRecord[]> 
  }>);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Droplets className="text-red-600" size={48} />
          <p className="text-zinc-500 font-medium">Cargando Pruebas Cruzadas UCI Honda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-red-100 selection:text-red-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/hemoderivados')}
              className="p-2 mr-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
              title="Volver al Menú"
            >
              <ArrowLeft size={24} />
            </button>
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-10 w-auto object-contain hidden md:block"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-200 hidden">
              <Droplets className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Pruebas Cruzadas UCI Honda</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user && isSystemUnlocked ? (
              <>
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-full text-sm text-zinc-600">
                  <div className={`w-2 h-2 rounded-full ${isGoogleConnected ? 'bg-green-500' : 'bg-zinc-300'}`} />
                  <span className="font-medium">{isGoogleConnected ? 'Conexión Institucional (Drive)' : 'Drive Desconectado'}</span>
                  <button 
                    onClick={isGoogleConnected ? handleDisconnectGoogle : handleConnectGoogle}
                    className="ml-2 text-xs text-blue-600 hover:underline"
                  >
                    {isGoogleConnected ? 'Desconectar' : 'Conectar'}
                  </button>
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-full text-sm text-zinc-600">
                  <UserIcon size={16} />
                  <span className="font-medium">LVALERIANO</span>
                </div>
                <button
                  onClick={showForm ? () => setShowForm(false) : handleNewRecord}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                    showForm 
                    ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200' 
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-100'
                  }`}
                >
                  {showForm ? <History size={18} /> : <Plus size={18} />}
                  {showForm ? 'Ver Historial' : 'Nuevo Registro'}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : !user ? (
              <button
                onClick={handleGoogleLogin}
                className="flex items-center gap-2 bg-white border border-zinc-200 px-4 py-2 rounded-xl font-medium hover:bg-zinc-50 transition-all shadow-sm"
              >
                <LogIn size={18} />
                Iniciar Sesión
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white border border-zinc-200 px-4 py-2 rounded-xl font-medium hover:bg-zinc-50 transition-all shadow-sm"
              >
                <LogOut size={18} />
                Cancelar
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!user ? (
          <div className="max-w-md mx-auto mt-20 text-center space-y-6">
            <div className="bg-red-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto">
              <ShieldCheck className="text-red-600" size={40} />
            </div>
            <h2 className="text-3xl font-bold text-zinc-900">Paso 1: Autenticación</h2>
            <p className="text-zinc-500">
              Por favor, asocia tu cuenta de correo institucional para gestionar los registros (crear, editar, eliminar).
            </p>
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <LogIn size={24} />
              Continuar con Google
            </button>
          </div>
        ) : !isSystemUnlocked ? (
          <div className="max-w-md mx-auto mt-20 text-center space-y-6">
            <div className="bg-red-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto">
              <ShieldCheck className="text-red-600" size={40} />
            </div>
            <h2 className="text-3xl font-bold text-zinc-900">Paso 2: Acceso Restringido</h2>
            <p className="text-zinc-500">
              Por favor, ingresa tus credenciales de sistema para acceder a la gestión de hemoderivados.
            </p>
            
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Usuario</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  placeholder="Ingrese su usuario"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  placeholder="Ingrese su contraseña"
                  required
                />
              </div>
              
              {loginError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-3 mt-6"
              >
                <LogIn size={24} />
                Desbloquear Sistema
              </button>
            </form>
            <button onClick={handleLogout} className="text-zinc-500 text-sm hover:text-red-600 transition-colors">
              Cambiar cuenta de Google
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {showForm ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto"
              >
                <BloodTestForm 
                  onSave={saveRecord} 
                  userEmail={user.email || ''}
                  existingRecords={records}
                  isSyncing={isSyncing}
                  receivedUnits={receivedUnits}
                  transfusionRecords={transfusionRecords}
                  dispositionRecords={dispositionRecords}
                  initialData={editingRecord || undefined}
                />
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Search and Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-zinc-900">Historial de Pruebas del Dia</h2>
                    <p className="text-zinc-500">Consulta y gestiona los registros de hemoderivados.</p>
                  </div>
                  
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-red-500 transition-colors" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar por paciente o ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 pr-6 py-3 bg-white border border-zinc-200 rounded-2xl w-full md:w-80 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Records Grid */}
                {Object.keys(groupedRecords).length > 0 ? (
                  <div className="space-y-10">
                    {Object.entries(groupedRecords).map(([patientKey, group], idx) => (
                      <motion.div
                        key={patientKey}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm"
                      >
                        <div className="flex items-center gap-3 mb-6 border-b border-zinc-100 pb-4">
                          <div className="bg-zinc-100 p-3 rounded-xl">
                            <UserIcon className="text-zinc-600" size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-zinc-900">{group.patientName}</h3>
                            <p className="text-sm text-zinc-500 font-medium">
                              ID: {group.patientId} • Grupo: <span className="text-red-600 font-bold">{group.bloodGroup}{group.rh}</span>
                            </p>
                          </div>
                        </div>

                        <div className="space-y-8">
                          {Object.entries(group.hemoderivativeGroups).map(([hemoType, records]) => (
                            <div key={hemoType} className="space-y-4">
                              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <Droplets size={14} className="text-red-500" />
                                {hemoType} ({records.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {records.map((record) => {
                                  const isUsed = transfusionRecords.some(t => t.unitId === record.unitId || t.qualitySeal === record.qualitySeal) ||
                                                dispositionRecords.some(d => d.unitId === record.unitId || d.qualitySeal === record.qualitySeal);
                                  return (
                                    <RecordCard 
                                      key={record.id || record.createdAt} 
                                      record={record} 
                                      onView={setSelectedRecord}
                                      onDelete={deleteRecord}
                                      onEdit={handleEdit}
                                      currentUserUid={user?.uid}
                                      isAdmin={isAdmin}
                                      isUsed={isUsed}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-dashed border-zinc-200 rounded-3xl">
                    <div className="bg-zinc-50 p-6 rounded-full mb-4">
                      <History size={48} className="text-zinc-300" />
                    </div>
                    <h3 className="text-xl font-semibold text-zinc-900">No hay registros</h3>
                    <p className="text-zinc-500 max-w-xs mx-auto mt-2">
                      {searchTerm 
                        ? 'No se encontraron resultados para tu búsqueda.' 
                        : 'Comienza creando un nuevo registro de prueba cruzada.'}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-6 text-red-600 font-semibold hover:text-red-700 transition-colors"
                      >
                        Crear primer registro →
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <Droplets size={16} className="text-red-600" />
            <span>© 2026 Pruebas Cruzadas UCI Honda - Creado por UCI Honda Tecnología</span>
          </div>
          <div className="flex gap-8">
            <button onClick={() => setShowPrivacy(true)} className="hover:text-zinc-900 transition-colors">Privacidad</button>
            <button onClick={() => setShowTerms(true)} className="hover:text-zinc-900 transition-colors">Términos</button>
            <a href="mailto:auditoriadecalidad@ucihonda.com.co?subject=Soporte%20App%20Pruebas%20Cruzadas%20UCI%20Honda&body=Hola%20equipo%20de%20soporte,%0A%0ANecesito%20ayuda%20con%20la%20aplicación%20de%20Pruebas%20Cruzadas:%0A%0A" className="hover:text-zinc-900 transition-colors">Soporte</a>
          </div>
        </div>
      </footer>

      {/* View Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedRecord(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-100">
                <h3 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                  <FileText className="text-red-600" />
                  Detalles de Prueba Cruzada
                </h3>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 p-4 rounded-2xl">
                    <p className="text-sm text-zinc-500 mb-1">Paciente</p>
                    <p className="font-bold text-zinc-900">{selectedRecord.patientName}</p>
                    <p className="text-sm text-zinc-600">ID: {selectedRecord.patientId}</p>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-2xl">
                    <p className="text-sm text-zinc-500 mb-1">Grupo Sanguíneo</p>
                    <p className="font-bold text-red-600 text-xl">{selectedRecord.bloodGroup} {selectedRecord.rh}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-500 mb-1 flex items-center gap-1"><Calendar size={14}/> Fecha de Prueba</p>
                    <p className="font-medium text-zinc-900">{new Date(selectedRecord.testDate).toLocaleString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 mb-1 flex items-center gap-1"><Activity size={14}/> Unidad de Hemoderivado</p>
                    <p className="font-medium text-zinc-900">{selectedRecord.unitId || selectedRecord.hemoderivativeUnit || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-zinc-500 mb-1 flex items-center gap-1"><ShieldCheck size={14}/> Proveedor</p>
                    <p className="font-medium text-zinc-900">{selectedRecord.provider || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 mb-1 flex items-center gap-1"><Activity size={14}/> Hemoderivado Solicitado</p>
                    <p className="font-medium text-zinc-900">{selectedRecord.requestedHemoderivative || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 mb-1 flex items-center gap-1"><FileText size={14}/> Tipo de Solicitud</p>
                    <p className="font-medium text-zinc-900">{selectedRecord.requestType || 'N/A'}</p>
                  </div>
                </div>

                <div className="bg-zinc-50 p-4 rounded-2xl">
                  <p className="text-sm text-zinc-500 mb-2">Resultado</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                    selectedRecord.result === 'Compatible' ? 'bg-green-100 text-green-700' : 
                    selectedRecord.result === 'Unidad disponible' ? 'bg-blue-100 text-blue-700' : 
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedRecord.result.toUpperCase()}
                  </span>
                  <div className="mt-3 p-3 bg-white rounded-xl border border-zinc-100 text-sm italic text-zinc-600">
                    {generateInterpretation(selectedRecord)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-500 mb-1 flex items-center gap-1"><ShieldCheck size={14}/> Sello de Calidad</p>
                    <p className="font-medium text-zinc-900">{selectedRecord.qualitySeal || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 mb-1 flex items-center gap-1"><UserCheck size={14}/> Responsable</p>
                    <p className="font-medium text-zinc-900">{selectedRecord.bacteriologist || selectedRecord.responsiblePerson}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 bg-zinc-50 p-4 rounded-2xl">
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">Anticuerpos Irregulares</p>
                    <p className="font-medium text-zinc-900">{selectedRecord.irregularAntibodies || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">Autocontrol</p>
                    <p className="font-medium text-zinc-900">{selectedRecord.autocontrol || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">Temperatura (°C)</p>
                    <p className="font-medium text-zinc-900">{selectedRecord.temperature || 'N/A'}</p>
                  </div>
                </div>

                {/* SIHEVI Section */}
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ShieldCheck size={14} />
                    Información SIHEVI
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-zinc-500 mb-1">Reporte SIHEVI</p>
                      <p className={`font-bold ${selectedRecord.siheviReport === 'Sí' ? 'text-green-600' : 'text-zinc-500'}`}>
                        {selectedRecord.siheviReport || 'No reportado'}
                      </p>
                    </div>
                    {selectedRecord.siheviDescription && (
                      <div>
                        <p className="text-sm text-zinc-500 mb-1">Descripción</p>
                        <p className="text-sm text-zinc-900 font-medium">{selectedRecord.siheviDescription}</p>
                      </div>
                    )}
                  </div>
                  {selectedRecord.siheviPredefinedText && (
                    <div className="mt-3 pt-3 border-t border-blue-100">
                      <p className="text-sm text-zinc-500 mb-1">Comentario Preestablecido</p>
                      <p className="text-sm text-blue-900 italic font-medium">"{selectedRecord.siheviPredefinedText}"</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {recordToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2 text-center">Confirmar Eliminación</h3>
              <p className="text-zinc-600 mb-6 text-center">¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setRecordToDelete(null)} 
                  className="flex-1 px-4 py-3 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete} 
                  className="flex-1 px-4 py-3 bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Modal */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPrivacy(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-100">
                <h3 className="text-2xl font-bold text-zinc-900">Políticas de Privacidad</h3>
                <button onClick={() => setShowPrivacy(false)} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4 text-zinc-600 leading-relaxed">
                <p>
                  <strong>UCI Honda</strong> garantiza la confidencialidad, seguridad y uso adecuado de la información médica y personal registrada en esta aplicación, en estricto cumplimiento de la normativa vigente de protección de datos personales (Ley 1581 de 2012 - Habeas Data).
                </p>
                <p>
                  <strong>1. Uso de la Información:</strong> Los datos ingresados (nombres de pacientes, identificaciones, grupos sanguíneos, resultados de pruebas cruzadas y demás información clínica) son de uso estrictamente interno y están destinados exclusivamente para la gestión pre-transfusional y la seguridad del paciente.
                </p>
                <p>
                  <strong>2. Acceso Restringido:</strong> El acceso a esta plataforma está limitado únicamente a personal médico, de laboratorio y administrativo autorizado por UCI Honda. Todo acceso y modificación de datos queda registrado en el sistema (trazabilidad).
                </p>
                <p>
                  <strong>3. Seguridad:</strong> Se implementan medidas de seguridad técnicas y administrativas para evitar el acceso no autorizado, pérdida, alteración o uso indebido de los datos clínicos.
                </p>
                <p>
                  <strong>4. Contacto:</strong> Para cualquier consulta relacionada con el tratamiento de datos personales, puede contactar al equipo de soporte a través de <em>auditoriadecalidad@ucihonda.com.co</em>.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-end">
                <button onClick={() => setShowPrivacy(false)} className="px-6 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold rounded-xl transition-colors">
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terms Modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTerms(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-100">
                <h3 className="text-2xl font-bold text-zinc-900">Términos y Condiciones</h3>
                <button onClick={() => setShowTerms(false)} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4 text-zinc-600 leading-relaxed">
                <p>
                  Esta aplicación es una herramienta tecnológica de uso interno y exclusivo del personal autorizado de <strong>UCI Honda</strong>. Al acceder y utilizar este sistema, el usuario acepta los siguientes términos:
                </p>
                <p>
                  <strong>1. Responsabilidad de la Información:</strong> El usuario se compromete a ingresar información veraz, precisa y previamente verificada correspondiente a las pruebas de compatibilidad sanguínea (pruebas cruzadas). La exactitud de estos datos es vital para la seguridad del paciente.
                </p>
                <p>
                  <strong>2. Confidencialidad de Credenciales:</strong> Las credenciales de acceso (cuenta de Google institucional) son personales e intransferibles. El usuario es responsable de todas las acciones realizadas bajo su cuenta.
                </p>
                <p>
                  <strong>3. Uso Adecuado:</strong> Los rótulos, reportes en PDF y registros generados por esta plataforma deben utilizarse únicamente para los fines médicos y administrativos establecidos por los protocolos de UCI Honda.
                </p>
                <p>
                  <strong>4. Auditoría:</strong> <em>UCI Honda Tecnología</em> y el departamento de Auditoría de Calidad se reservan el derecho de monitorear y auditar el uso de la plataforma para garantizar el cumplimiento de los protocolos institucionales y la seguridad del paciente.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-end">
                <button onClick={() => setShowTerms(false)} className="px-6 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold rounded-xl transition-colors">
                  Aceptar y Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
