import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, History, LogIn, ShieldCheck, CheckCircle, Truck } from 'lucide-react';
import { DisposicionForm } from '../components/DisposicionForm';
import { FinalDispositionRecord } from '../types';
import { auth, loginWithGoogle } from '../../../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { dataService } from '../../../services/dataService';
import { DeleteConfirmationModal } from '../../laboratorio/components/DeleteConfirmationModal';

export const DisposicionApp: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<FinalDispositionRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [isSystemUnlocked, setIsSystemUnlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinalDispositionRecord | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Disposición Final - Hemocomponentes';
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (!currentUser) setIsSystemUnlocked(false);
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
    if (user && isSystemUnlocked) checkGoogleStatus();
  }, [user, isSystemUnlocked]);

  useEffect(() => {
    if (!isAuthReady || !user || !isSystemUnlocked) return;

    const path = 'finalDisposition';

    const fetchRecords = async () => {
      try {
        const recordsData = await dataService.getRecords<FinalDispositionRecord>(path);
        setRecords(recordsData);
      } catch (error) {
        console.error('Error fetching disposition records:', error);
      }
    };

    fetchRecords();
    const interval = setInterval(fetchRecords, 10000);

    return () => clearInterval(interval);
  }, [isAuthReady, user, isSystemUnlocked]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const normalizedUsername = username.trim().toLowerCase();
    if (
      (normalizedUsername === 'disposicionhemo' && password === 'Disposicionhemo2026*') ||
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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsGoogleConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSubmit = async (formData: Omit<FinalDispositionRecord, 'id' | 'createdAt' | 'uid' | 'userEmail'>) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      let savedRecord: FinalDispositionRecord;
      if (editingRecord) {
        const updateData = {
          ...editingRecord,
          ...formData,
          updatedAt: new Date().toISOString(),
          updatedBy: user.email || 'Desconocido'
        };
        savedRecord = await dataService.saveRecord<any>('finalDisposition', updateData) as FinalDispositionRecord;
        setEditingRecord(null);
      } else {
        const fullRecord = {
          ...formData,
          createdAt: new Date().toISOString(),
          uid: user.uid,
          userEmail: user.email || 'Desconocido'
        };

        savedRecord = await dataService.saveRecord<any>('finalDisposition', fullRecord) as FinalDispositionRecord;
        
        if (isGoogleConnected) {
          await fetch('/api/sync/sheets/disposicion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ record: savedRecord }),
          });
        }
      }
      
      // Refresh local state
      const updatedRecords = await dataService.getRecords<FinalDispositionRecord>('finalDisposition');
      setRecords(updatedRecords);
      
      setShowForm(false);
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Error al guardar el registro.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setRecordToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (recordToDelete) {
      try {
        await dataService.deleteRecord('finalDisposition', recordToDelete);
        
        // Refresh local state
        const updatedRecords = await dataService.getRecords<FinalDispositionRecord>('finalDisposition');
        setRecords(updatedRecords);
        
        setRecordToDelete(null);
        setShowDeleteConfirm(false);
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error al eliminar el registro.');
      }
    }
  };

  const handleEdit = (record: FinalDispositionRecord) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleNewRecord = () => {
    setEditingRecord(null);
    setShowForm(true);
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'Transfundido': return <CheckCircle className="text-emerald-500" size={20} />;
      case 'Descarte': return <Trash2 className="text-rose-500" size={20} />;
      case 'Traslado': return <Truck className="text-blue-500" size={20} />;
      default: return null;
    }
  };

  if (!isAuthReady) return <div className="min-h-screen bg-zinc-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <nav className="bg-white border-b border-zinc-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/hemoderivados')} className="p-2 -ml-2 text-zinc-400 hover:text-zinc-900 transition-colors rounded-xl hover:bg-zinc-100"><ArrowLeft size={24} /></button>
            <div className="flex items-center gap-3">
              <div className="bg-rose-600 p-2.5 rounded-xl shadow-sm"><Trash2 className="text-white" size={24} /></div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 leading-tight">HemoMatch</h1>
                <p className="text-xs font-medium text-zinc-500">Módulo de Disposición</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && isSystemUnlocked && (
              <>
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-full text-sm text-zinc-600">
                  <div className={`w-2 h-2 rounded-full ${isGoogleConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">{isGoogleConnected ? 'Conexión Institucional (Drive)' : 'Drive Desconectado'}</span>
                  <button 
                    onClick={isGoogleConnected ? handleDisconnectGoogle : handleConnectGoogle}
                    className="ml-2 text-xs text-blue-600 hover:underline"
                  >
                    {isGoogleConnected ? 'Conectar' : 'Desconectar'}
                  </button>
                </div>
                <button onClick={showForm ? () => setShowForm(false) : handleNewRecord} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-all shadow-md shadow-rose-100">
                {showForm ? <History size={18} /> : <Trash2 size={18} />}
                {showForm ? 'Ver Historial' : 'Nuevo Registro'}
              </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!user ? (
          <div className="max-w-md mx-auto mt-20 text-center space-y-6">
            <div className="bg-rose-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto"><ShieldCheck className="text-rose-600" size={40} /></div>
            <h2 className="text-3xl font-bold text-zinc-900">Paso 1: Autenticación</h2>
            <button onClick={loginWithGoogle} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all flex items-center justify-center gap-3"><LogIn size={24} />Continuar con Google</button>
          </div>
        ) : !isSystemUnlocked ? (
          <div className="max-w-md mx-auto mt-20 text-center space-y-6">
            <div className="bg-rose-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto"><ShieldCheck className="text-rose-600" size={40} /></div>
            <h2 className="text-3xl font-bold text-zinc-900">Paso 2: Acceso al Sistema</h2>
            <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl border border-zinc-100 space-y-6 text-left">
              {loginError && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">{loginError}</div>}
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Usuario</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="disposicionhemo" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="••••••••" required />
              </div>
              <button type="submit" className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-zinc-800 transition-all">Desbloquear Sistema</button>
            </form>
          </div>
        ) : (
          <>
            {showForm ? (
              <div className="max-w-4xl mx-auto"><DisposicionForm onSubmit={handleSubmit} isSubmitting={isSyncing} initialData={editingRecord || undefined} /></div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-zinc-900">Historial de Disposición</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {records.map((record) => (
                    <div key={record.id} className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 space-y-4 relative group">
                      {isAdmin && (
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => handleEdit(record)}
                            className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                            title="Editar registro"
                          >
                            <History size={18} />
                          </button>
                          <button
                            onClick={() => record.id && handleDeleteClick(record.id)}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                            title="Eliminar registro"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                      <div className="flex justify-between items-start pr-10">
                        <div className="bg-zinc-50 text-zinc-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Unidad: {record.unitId}</div>
                        <span className="text-xs text-zinc-400">{new Date(record.createdAt).toLocaleString()}</span>
                      </div>
                      {record.qualitySeal && (
                        <div className="bg-zinc-50 px-3 py-1 rounded-full text-xs font-medium text-zinc-600 inline-block">
                          Sello: {record.qualitySeal}
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        {getStatusIcon(record.dispositionType)}
                        <h3 className="font-bold text-zinc-900">{record.dispositionType}</h3>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-500"><span className="font-bold">Fecha:</span> {record.dispositionDate}</p>
                        <p className="text-xs text-zinc-500"><span className="font-bold">Responsable:</span> {record.responsiblePerson}</p>
                        {record.reason && <p className="text-xs text-zinc-500 bg-zinc-50 p-2 rounded-lg italic">"{record.reason}"</p>}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-zinc-100">
                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed text-justify">
                          Segregado como residuo anatomopatologico se deja en refrigeracion (2 a 8 °) hasta recepcion por parte de proveedor para manejo final.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
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
        expectedUsername="disposicionhemo"
        expectedPassword="Disposicionhemo2026*"
      />
    </div>
  );
};
