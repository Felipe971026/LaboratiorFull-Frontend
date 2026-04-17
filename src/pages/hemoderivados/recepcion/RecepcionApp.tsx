import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox, Plus, History, LogIn, LogOut, ShieldCheck, ClipboardCheck, X, AlertTriangle, Info, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RecepcionForm } from '../components/RecepcionForm';
import { RecepcionRecordCard } from '../components/RecepcionRecordCard';
import { ReceivedUnitRecord } from '../types';
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType } from '../../../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { DeleteConfirmationModal } from '../../laboratorio/components/DeleteConfirmationModal';
import { saveRecord, deleteRecord as apiDeleteRecord } from '../../../lib/api';

export const RecepcionApp: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<ReceivedUnitRecord[]>([]);
  const [transfusionRecords, setTransfusionRecords] = useState<any[]>([]);
  const [dispositionRecords, setDispositionRecords] = useState<any[]>([]);
  const [bloodTestRecords, setBloodTestRecords] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ReceivedUnitRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'used'>('all');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [isSystemUnlocked, setIsSystemUnlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [backendStatus, setBackendStatus] = useState<{ status: string; firebase: any; sheets: any } | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setBackendStatus(data))
      .catch(err => console.error('Error fetching health:', err));
  }, []);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  const [showReclassifyModal, setShowReclassifyModal] = useState(false);
  const [recordToReclassify, setRecordToReclassify] = useState<ReceivedUnitRecord | null>(null);
  const [reclassifyOption, setReclassifyOption] = useState<'Sí' | 'Novedad' | ''>('');
  const [reclassifyBloodGroup, setReclassifyBloodGroup] = useState<'A' | 'B' | 'AB' | 'O' | ''>('');
  const [reclassifyRh, setReclassifyRh] = useState<'+' | '-' | ''>('');
  const [reclassifyComment, setReclassifyComment] = useState('');

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
    if (!isAuthReady || !user || !isSystemUnlocked) return;

    const path = 'receivedUnits';

    // Auto-cleanup: Delete records older than 30 days
    const cleanupOldRecords = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffTimestamp = thirtyDaysAgo.toISOString();

        const cleanupQuery = query(
          collection(db, path),
          where('createdAt', '<', cutoffTimestamp)
        );
        
        const snapshot = await getDocs(cleanupQuery);
        
        if (!snapshot.empty) {
          console.log(`Auto-limpieza: Borrando ${snapshot.size} registros antiguos...`);
          const deletePromises = snapshot.docs.map(docSnapshot => 
            apiDeleteRecord(path, docSnapshot.id)
          );
          await Promise.all(deletePromises);
          console.log('Auto-limpieza completada.');
        }
      } catch (error) {
        console.error('Error en auto-limpieza de registros antiguos:', error);
      }
    };

    cleanupOldRecords();

    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordsData: ReceivedUnitRecord[] = [];
      snapshot.forEach((doc) => {
        recordsData.push({ id: doc.id, ...doc.data() } as ReceivedUnitRecord);
      });
      setRecords(recordsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    // Fetch transfusion and disposition records to check availability
    const transfusionQuery = query(collection(db, 'transfusionUse'));
    const unsubscribeTransfusion = onSnapshot(transfusionQuery, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setTransfusionRecords(data);
    }, (error) => {
      console.error('Error fetching transfusion records for availability:', error);
    });

    const dispositionQuery = query(collection(db, 'finalDisposition'));
    const unsubscribeDisposition = onSnapshot(dispositionQuery, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setDispositionRecords(data);
    }, (error) => {
      console.error('Error fetching disposition records for availability:', error);
    });

    const bloodTestQuery = query(collection(db, 'bloodTestRecords'));
    const unsubscribeBloodTest = onSnapshot(bloodTestQuery, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setBloodTestRecords(data);
    }, (error) => {
      console.error('Error fetching blood test records for availability:', error);
    });

    return () => {
      unsubscribe();
      unsubscribeTransfusion();
      unsubscribeDisposition();
      unsubscribeBloodTest();
    };
  }, [isAuthReady, user, isSystemUnlocked]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const normalizedUsername = username.trim().toLowerCase();
    const isSuperAdminEmail = user?.email?.toLowerCase() === 'ingbiomedico@ucihonda.com.co' || 
                             user?.email?.toLowerCase() === 'apoyodiagnostico@hemosheet.iam.gserviceaccount.com';

    if (
      (normalizedUsername === 'resepcionhemo' && password === 'Recepcionhemo2026*') ||
      (normalizedUsername === 'admin' && password === 'admin') ||
      isSuperAdminEmail
    ) {
      setIsSystemUnlocked(true);
      if (normalizedUsername === 'admin' || isSuperAdminEmail) {
        setIsAdmin(true);
      }
    } else {
      setLoginError('Usuario o contraseña incorrectos.');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();
      console.log('Sync result:', data);
      alert('Sincronización completada. Revise la consola para detalles.');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Error en la sincronización.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    setIsSystemUnlocked(false);
    await logout();
  };

  const handleSubmit = async (newRecords: Omit<ReceivedUnitRecord, 'id' | 'createdAt' | 'uid' | 'userEmail'>[]) => {
    if (!user) return;
    setIsSyncing(true);

    try {
      console.log('Submitting records:', newRecords);
      if (editingRecord?.id) {
        // Handle single record update
        const updateData = {
          ...editingRecord,
          ...newRecords[0],
          updatedAt: new Date().toISOString(),
          updatedBy: user.email || 'Desconocido'
        };
        console.log('Updating record:', updateData);
        await saveRecord('receivedUnits', updateData, user.email || 'Desconocido');
        setEditingRecord(null);
      } else {
        // Handle bulk create
        console.log(`Creating ${newRecords.length} new records`);
        for (const record of newRecords) {
          const fullRecord = {
            ...record,
            status: record.accepted === 'Sí' ? 'Disponible' : 'Rechazado',
            createdAt: new Date().toISOString(),
            uid: user.uid,
            userEmail: user.email || 'Desconocido'
          };
          console.log('Saving new record:', fullRecord);
          const result = await saveRecord('receivedUnits', fullRecord, user.email || 'Desconocido');
          console.log('Save result:', result);
        }
      }
      
      setShowForm(false);
      console.log('Form submission complete');
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      handleFirestoreError(error, editingRecord ? OperationType.UPDATE : OperationType.CREATE, 'receivedUnits');
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
        await apiDeleteRecord('receivedUnits', recordToDelete);
        setRecordToDelete(null);
        setShowDeleteConfirm(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `receivedUnits/${recordToDelete}`);
      }
    }
  };

  const handleReclassifyClick = (record: ReceivedUnitRecord) => {
    setRecordToReclassify(record);
    setReclassifyOption('Sí');
    setReclassifyBloodGroup('');
    setReclassifyRh('');
    setReclassifyComment('');
    setShowReclassifyModal(true);
  };

  const handleReclassifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordToReclassify || !recordToReclassify.id || !user) return;

    try {
      const updateData: ReceivedUnitRecord = {
        ...recordToReclassify,
        reclassified: reclassifyOption,
        updatedAt: new Date().toISOString(),
        updatedBy: user.email || 'Desconocido'
      };

      if (reclassifyOption === 'Novedad') {
        updateData.reclassifiedBloodGroup = reclassifyBloodGroup;
        updateData.reclassifiedRh = reclassifyRh;
        updateData.reclassifiedComment = reclassifyComment || `No cumple con pruebas de reclasificación y se identifica novedad con el grupo sanguíneo o rh, teniendo como resultado ${reclassifyBloodGroup} ${reclassifyRh}`;
      }

      await saveRecord('receivedUnits', updateData, user.email || 'Desconocido');
      setShowReclassifyModal(false);
      setRecordToReclassify(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `receivedUnits/${recordToReclassify.id}`);
    }
  };

  const filteredRecords = records.filter(record => {
    const isTransfused = transfusionRecords.some(t => t.unitId === record.unitId || t.qualitySeal === record.qualitySeal) ||
                        dispositionRecords.some(d => d.unitId === record.unitId || d.qualitySeal === record.qualitySeal);
    
    // An active cross-match blocks the unit too
    const hasActiveCrossmatch = bloodTestRecords.some(r => 
      (r.unitId === record.unitId || r.qualitySeal === record.qualitySeal) && 
      r.acceptedBy && 
      !r.returned
    );
    
    const isUsed = isTransfused || hasActiveCrossmatch;
    
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
            {backendStatus && (
              <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[10px] font-medium text-zinc-600">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${backendStatus.firebase.dbInitialized ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  Firestore: {backendStatus.firebase.dbInitialized ? 'OK' : 'Error'}
                </div>
                <div className="w-px h-3 bg-zinc-200" />
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${backendStatus.sheets.hasEmail && backendStatus.sheets.hasKey && backendStatus.sheets.hasSheetId ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  Sheets: {backendStatus.sheets.hasEmail && backendStatus.sheets.hasKey && backendStatus.sheets.hasSheetId ? 'OK' : 'Error'}
                </div>
              </div>
            )}
            {user && isSystemUnlocked ? (
              <>
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-medium hover:bg-emerald-100 transition-all disabled:opacity-50"
                  title="Sincronizar datos locales con la nube"
                >
                  <Layers size={18} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </button>
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
                onClick={loginWithGoogle}
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
              onClick={loginWithGoogle}
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
                      const isTransfused = transfusionRecords.some(t => t.unitId === record.unitId || t.qualitySeal === record.qualitySeal) ||
                                          dispositionRecords.some(d => d.unitId === record.unitId || d.qualitySeal === record.qualitySeal);
                      
                      const hasActiveCrossmatch = bloodTestRecords.some(r => 
                        (r.unitId === record.unitId || r.qualitySeal === record.qualitySeal) && 
                        r.acceptedBy && 
                        !r.returned
                      );

                      const isUsed = isTransfused || hasActiveCrossmatch;

                      return (
                        <RecepcionRecordCard
                          key={record.id}
                          record={record}
                          isUsed={isUsed}
                          onDelete={handleDeleteClick}
                          onEdit={handleEdit}
                          onReclassify={handleReclassifyClick}
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

      <AnimatePresence>
        {showReclassifyModal && recordToReclassify && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="bg-blue-600 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardCheck size={24} />
                  <h3 className="text-xl font-bold">Reclasificar Unidad</h3>
                </div>
                <button
                  onClick={() => setShowReclassifyModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleReclassifySubmit} className="p-6 space-y-6">
                <div>
                  <p className="text-sm text-zinc-500 mb-1">Bolsa seleccionada</p>
                  <p className="font-bold text-lg text-zinc-900">{recordToReclassify.unitId}</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">¿Reclasificar?</label>
                  <select
                    value={reclassifyOption}
                    onChange={(e) => setReclassifyOption(e.target.value as 'Sí' | 'Novedad')}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  >
                    <option value="Sí">Sí</option>
                    <option value="Novedad">Novedad</option>
                  </select>
                </div>

                {reclassifyOption === 'Novedad' && (
                  <div className="space-y-4 bg-orange-50 p-4 rounded-2xl border border-orange-100">
                    <div className="flex items-center gap-2 text-orange-800 font-bold mb-2">
                      <AlertTriangle size={20} /> Detalles de la Novedad
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-orange-800 mb-2">Grupo Sanguíneo</label>
                        <select
                          value={reclassifyBloodGroup}
                          onChange={(e) => {
                            setReclassifyBloodGroup(e.target.value as 'A' | 'B' | 'AB' | 'O');
                            setReclassifyComment(`No cumple con pruebas de reclasificación y se identifica novedad con el grupo sanguíneo o rh, teniendo como resultado ${e.target.value} ${reclassifyRh}`);
                          }}
                          className="w-full px-4 py-3 rounded-xl border border-orange-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                          required
                        >
                          <option value="">Seleccione...</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="AB">AB</option>
                          <option value="O">O</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-orange-800 mb-2">Factor Rh</label>
                        <select
                          value={reclassifyRh}
                          onChange={(e) => {
                            setReclassifyRh(e.target.value as '+' | '-');
                            setReclassifyComment(`No cumple con pruebas de reclasificación y se identifica novedad con el grupo sanguíneo o rh, teniendo como resultado ${reclassifyBloodGroup} ${e.target.value}`);
                          }}
                          className="w-full px-4 py-3 rounded-xl border border-orange-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                          required
                        >
                          <option value="">Seleccione...</option>
                          <option value="+">Positivo (+)</option>
                          <option value="-">Negativo (-)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-orange-800 mb-2">Comentario</label>
                      <textarea
                        value={reclassifyComment}
                        onChange={(e) => setReclassifyComment(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-orange-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                        rows={3}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReclassifyModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
