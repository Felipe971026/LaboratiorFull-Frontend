import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox, Plus, History, LogIn, LogOut, ShieldCheck, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { RecepcionForm } from '../components/RecepcionForm';
import { RecepcionRecordCard } from '../components/RecepcionRecordCard';
import { ReceivedUnitRecord } from '../types';
import { auth, loginWithGoogle, logout } from '../../../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { dataService } from '../../../services/dataService';
import { DeleteConfirmationModal } from '../../laboratorio/components/DeleteConfirmationModal';

export const RecepcionApp: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<ReceivedUnitRecord[]>([]);
  const [transfusionRecords, setTransfusionRecords] = useState<any[]>([]);
  const [dispositionRecords, setDispositionRecords] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ReceivedUnitRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'used'>('all');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [isSystemUnlocked, setIsSystemUnlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleStatusError, setGoogleStatusError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Recepción - Hemocomponentes';
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
        setGoogleStatusError(null);
      } catch (error) {
        console.error('Error checking Google status:', error);
        setGoogleStatusError('No se pudo verificar la conexión con Google');
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
    if (!isAuthReady || !user || !isSystemUnlocked) return;

    const path = 'receivedUnits';

    const fetchAllData = async () => {
      try {
        const [recordsData, transfusionData, dispositionData] = await Promise.all([
          dataService.getRecords<ReceivedUnitRecord>(path),
          dataService.getRecords<any>('transfusionUse'),
          dataService.getRecords<any>('finalDisposition')
        ]);
        setRecords(recordsData);
        setTransfusionRecords(transfusionData);
        setDispositionRecords(dispositionData);
      } catch (error) {
        console.error('Error fetching data via API:', error);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 10000); // Poll every 10s for updates

    return () => clearInterval(interval);
  }, [isAuthReady, user, isSystemUnlocked]);

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
      (normalizedUsername === 'resepcionhemo' && password === 'Recepcionhemo2026*') ||
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

  const handleGoogleConnect = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      const authWindow = window.open(url, 'google_auth', 'width=600,height=700');
      if (!authWindow) {
        alert('Por favor, permite las ventanas emergentes para conectar con Google.');
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
      alert('Error al iniciar la conexión con Google');
    }
  };

  const handleLogout = async () => {
    setIsSystemUnlocked(false);
    await logout();
  };

  const syncToSheets = async (recordsToSync: ReceivedUnitRecord[]) => {
    if (!isGoogleConnected) return;
    
    setIsSyncing(true);
    try {
      // Sync each record individually to match existing backend logic
      // or we can update backend to handle multiple. 
      // Let's update backend to handle multiple in the next step.
      // For now, let's keep it simple and loop if needed, 
      // but bulk is better. I'll update backend.
      const response = await fetch('/api/sync/sheets/recepcion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: recordsToSync }),
      });

      if (!response.ok) {
        throw new Error('Error syncing to sheets');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Error al sincronizar con Google Sheets. Asegúrese de haber conectado su cuenta.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async (newRecords: Omit<ReceivedUnitRecord, 'id' | 'createdAt' | 'uid' | 'userEmail'>[]) => {
    if (!user) return;
    setIsSyncing(true);

    try {
      if (editingRecord?.id) {
        // Handle single record update
        const updateData = {
          ...editingRecord,
          ...newRecords[0],
          updatedAt: new Date().toISOString(),
          updatedBy: user.email || 'Desconocido'
        };
        await dataService.saveRecord('receivedUnits', updateData);
        setEditingRecord(null);
      } else {
        // Handle bulk create
        const recordsToSync: ReceivedUnitRecord[] = [];

        for (const record of newRecords) {
          const fullRecord = {
            ...record,
            createdAt: new Date().toISOString(),
            uid: user.uid,
            userEmail: user.email || 'Desconocido'
          };
          const savedRecord = await dataService.saveRecord<any>('receivedUnits', fullRecord);
          recordsToSync.push(savedRecord as ReceivedUnitRecord);
        }
        
        if (isGoogleConnected) {
          await syncToSheets(recordsToSync);
        }
      }
      
      // Refresh local state
      const updatedRecords = await dataService.getRecords<ReceivedUnitRecord>('receivedUnits');
      setRecords(updatedRecords);
      
      setShowForm(false);
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Error al guardar el registro.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEdit = (record: ReceivedUnitRecord) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleNewRecord = () => {
    setEditingRecord(null);
    setShowForm(true);
  };

  const handleDeleteClick = (id: string) => {
    setRecordToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (recordToDelete) {
      try {
        await dataService.deleteRecord('receivedUnits', recordToDelete);
        
        // Refresh local state
        const updatedRecords = await dataService.getRecords<ReceivedUnitRecord>('receivedUnits');
        setRecords(updatedRecords);
        
        setShowDeleteConfirm(false);
        setRecordToDelete(null);
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error al eliminar el registro.');
      }
    }
  };

  const filteredRecords = records.filter(record => {
    const isUsed = transfusionRecords.some(t => t.unitId === record.unitId || t.qualitySeal === record.qualitySeal) ||
                   dispositionRecords.some(d => d.unitId === record.unitId || d.qualitySeal === record.qualitySeal);
    
    if (filter === 'available') return !isUsed;
    if (filter === 'used') return isUsed;
    return true;
  });

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-blue-200">
      <nav className="bg-white border-b border-zinc-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/hemoderivados')}
              className="p-2 -ml-2 text-zinc-400 hover:text-zinc-900 transition-colors rounded-xl hover:bg-zinc-100"
              title="Volver al Menú"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2.5 rounded-xl shadow-sm">
                <Inbox className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 leading-tight">HemoMatch</h1>
                <p className="text-xs font-medium text-zinc-500">Módulo de Recepción</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && isSystemUnlocked ? (
              <>
                <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
                  <div className={`w-2 h-2 rounded-full ${isGoogleConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs font-medium text-zinc-600">
                    {isGoogleConnected ? 'Conexión Institucional (Drive)' : 'Drive Desconectado'}
                  </span>
                  {!isGoogleConnected ? (
                    <button onClick={handleConnectGoogle} className="text-xs text-blue-600 font-bold ml-2 hover:underline">
                      Conectar
                    </button>
                  ) : (
                    <button onClick={handleDisconnectGoogle} className="text-xs text-zinc-400 font-bold ml-2 hover:underline">
                      Desconectar
                    </button>
                  )}
                </div>

                <button
                  onClick={showForm ? () => setShowForm(false) : handleNewRecord}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                    showForm 
                    ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
                  }`}
                >
                  {showForm ? <History size={18} /> : <Plus size={18} />}
                  {showForm ? 'Ver Historial' : 'Nueva Recepción'}
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
            <div className="bg-blue-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto">
              <ShieldCheck className="text-blue-600" size={40} />
            </div>
            <h2 className="text-3xl font-bold text-zinc-900">Paso 1: Autenticación</h2>
            <p className="text-zinc-500">
              Por favor, asocia tu cuenta de correo institucional para gestionar los registros de recepción.
            </p>
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <LogIn size={24} />
              Continuar con Google
            </button>
          </div>
        ) : !isSystemUnlocked ? (
          <div className="max-w-md mx-auto mt-20 text-center space-y-6">
            <div className="bg-blue-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto">
              <ShieldCheck className="text-blue-600" size={40} />
            </div>
            <h2 className="text-3xl font-bold text-zinc-900">Paso 2: Acceso al Sistema</h2>
            <p className="text-zinc-500">
              Ingresa las credenciales del módulo de recepción para continuar.
            </p>
            
            <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl border border-zinc-100 space-y-6 text-left">
              {loginError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                  {loginError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Usuario</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Ingrese el usuario"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-zinc-800 transition-all active:scale-95"
              >
                Desbloquear Sistema
              </button>
            </form>
          </div>
        ) : (
          <>
            {showForm ? (
              <div className="max-w-4xl mx-auto">
                <RecepcionForm 
                  onSubmit={handleSubmit} 
                  isSubmitting={isSyncing} 
                  initialData={editingRecord || undefined}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-zinc-900">Historial de Recepción</h2>
                  
                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filter === 'all' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-50'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFilter('available')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filter === 'available' ? 'bg-green-600 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-50'
                      }`}
                    >
                      Disponibles
                    </button>
                    <button
                      onClick={() => setFilter('used')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filter === 'used' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-50'
                      }`}
                    >
                      Utilizados
                    </button>
                  </div>

                  <div className="text-sm text-zinc-500">
                    Mostrando: <span className="font-bold text-zinc-900">{filteredRecords.length}</span> de <span className="font-bold text-zinc-900">{records.length}</span>
                  </div>
                </div>

                {filteredRecords.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border border-zinc-100 border-dashed">
                    <Inbox className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
                    <h3 className="text-lg font-medium text-zinc-900">No hay registros</h3>
                    <p className="text-zinc-500 mt-1">
                      {filter === 'all' 
                        ? 'Comienza agregando una nueva recepción de hemoderivados.' 
                        : filter === 'available' 
                        ? 'No hay componentes disponibles en este momento.' 
                        : 'No hay componentes marcados como utilizados.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRecords.map((record) => {
                      const isUsed = transfusionRecords.some(t => t.unitId === record.unitId || t.qualitySeal === record.qualitySeal) ||
                                     dispositionRecords.some(d => d.unitId === record.unitId || d.qualitySeal === record.qualitySeal);
                      return (
                        <RecepcionRecordCard
                          key={record.id}
                          record={record}
                          isUsed={isUsed}
                          onDelete={handleDeleteClick}
                          onEdit={handleEdit}
                          currentUserUid={user?.uid}
                          isAdmin={isAdmin}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setRecordToDelete(null);
        }}
        onConfirm={confirmDelete}
        expectedUsername="resepcionhemo"
        expectedPassword="Recepcionhemo2026*"
      />
    </div>
  );
};
