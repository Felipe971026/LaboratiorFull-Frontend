import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, ClipboardList, ChevronRight, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { auth, loginWithGoogle, logout } from '../../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export const InsumosHome: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSystemUnlocked, setIsSystemUnlocked] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    document.title = 'Insumos';
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (!currentUser) {
        setIsSystemUnlocked(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const normalizedUsername = username.trim().toLowerCase();
    if (
      (normalizedUsername === 'insumos' && password === 'insumo2026*') ||
      (normalizedUsername === 'admin' && password === 'admin') ||
      (user?.email === 'ingbiomedico@ucihonda.com.co')
    ) {
      setIsSystemUnlocked(true);
    } else {
      setLoginError('Usuario o contraseña incorrectos.');
    }
  };

  const handleLogout = async () => {
    setIsSystemUnlocked(false);
    await logout();
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.5rem] shadow-xl p-12 max-w-md w-full text-center border border-zinc-100">
          <div className="bg-amber-50 text-amber-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Package size={40} />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Gestión de Insumos</h1>
          <p className="text-amber-600 mb-2 font-bold">Paso 1: Autenticación</p>
          <p className="text-zinc-500 mb-8">
            Para acceder al módulo de gestión de insumos, por favor inicia sesión con tu cuenta institucional.
          </p>
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 text-zinc-700 px-6 py-4 rounded-2xl font-bold hover:bg-zinc-50 transition-all shadow-sm active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Continuar con Google
          </button>
          <button
            onClick={() => navigate('/')}
            className="mt-8 text-zinc-400 hover:text-zinc-900 text-sm font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
          >
            <ArrowLeft size={16} />
            Volver al menú principal
          </button>
        </div>
      </div>
    );
  }

  if (!isSystemUnlocked) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.5rem] shadow-xl p-12 max-w-md w-full text-center border border-zinc-100">
          <div className="bg-zinc-50 text-zinc-900 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Gestión de Insumos</h1>
          <p className="text-amber-600 mb-2 font-bold">Paso 2: Acceso al Sistema</p>
          <p className="text-zinc-500 text-sm mb-8">
            Ingresa las credenciales del módulo de insumos para continuar.
          </p>
          
          <form onSubmit={handleLogin} className="space-y-6 text-left">
            {loginError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                {loginError}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900/5 outline-none transition-all bg-zinc-50"
                placeholder="Ingrese el usuario"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900/5 outline-none transition-all bg-zinc-50"
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

            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-zinc-400 hover:text-red-600 text-sm font-bold transition-colors"
            >
              Cancelar y Cerrar Sesión
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-8 text-zinc-400 hover:text-zinc-900 text-sm font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
            >
              <ArrowLeft size={16} />
              Volver al menú principal
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver al Menú Principal
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-zinc-400 hover:text-red-600 transition-colors font-bold text-sm"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
        
        <div className="bg-white p-12 rounded-3xl shadow-sm border border-zinc-200">
          <div className="bg-amber-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-600">
            <Package size={40} />
          </div>
          <h1 className="text-4xl font-bold text-zinc-900 mb-4">Gestión de Insumos</h1>
          <p className="text-zinc-500 text-lg mb-8">
            Control de inventarios y gestión de insumos de apoyo diagnóstico.
          </p>

          <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
            <button
              onClick={() => navigate('/insumos/kardex')}
              className="bg-zinc-900 text-white p-6 rounded-3xl flex items-center justify-between hover:bg-zinc-800 transition-all group shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <ClipboardList size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg">Control de Inventario</p>
                  <p className="text-xs text-zinc-400">Control de movimientos</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-zinc-500 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
