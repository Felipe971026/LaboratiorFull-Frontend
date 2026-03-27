import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, FlaskConical, History, FileSearch, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { LaboratorioAnalysis } from './LaboratorioAnalysis';
import { LaboratorioHistory } from './LaboratorioHistory';
import { auth, loginWithGoogle, logout } from '../../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export const LaboratorioHome: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSystemUnlocked, setIsSystemUnlocked] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    document.title = 'Laboratorio Clínico - UCI Honda';
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
      (normalizedUsername === 'laboratorio' && password === 'laboratorio2026*') ||
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="bg-brand-50 text-brand-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FlaskConical size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Laboratorio Clínico</h1>
          <p className="text-slate-600 mb-2 font-bold text-brand-600">Paso 1: Autenticación</p>
          <p className="text-slate-600 mb-8">
            Para acceder al módulo de análisis de laboratorio, por favor inicia sesión con tu cuenta institucional.
          </p>
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Continuar con Google
          </button>
          <button
            onClick={() => navigate('/')}
            className="mt-6 text-slate-500 hover:text-brand-600 text-sm font-medium flex items-center justify-center gap-2 mx-auto"
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="bg-brand-50 text-brand-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Laboratorio Clínico</h1>
          <p className="text-slate-600 mb-2 font-bold text-brand-600">Paso 2: Acceso al Sistema</p>
          <p className="text-slate-500 text-sm mb-8">
            Ingresa las credenciales del módulo de laboratorio para continuar.
          </p>
          
          <form onSubmit={handleLogin} className="space-y-6 text-left">
            {loginError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                {loginError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="Ingrese el usuario"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-slate-800 transition-all active:scale-95"
            >
              Desbloquear Sistema
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-slate-500 hover:text-red-600 text-sm font-medium transition-colors"
            >
              Cancelar y Cerrar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-slate-500 hover:text-brand-600 transition-colors"
                title="Volver al Menú Principal"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="UCI Honda Logo" className="h-10 object-contain" onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const nextSibling = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextSibling) nextSibling.style.display = 'block';
                }} />
                <FlaskConical className="text-brand-600 hidden w-8 h-8" />
                <span className="font-bold text-xl tracking-tight text-slate-800">UCI Honda - Laboratorio</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <NavLink
                to="/laboratorio"
                end
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                    isActive
                      ? 'text-brand-600 bg-brand-50 font-semibold'
                      : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'
                  }`
                }
              >
                <FileSearch size={20} />
                Analizar
              </NavLink>
              <NavLink
                to="/laboratorio/history"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                    isActive
                      ? 'text-brand-600 bg-brand-50 font-semibold'
                      : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'
                  }`
                }
              >
                <History size={20} />
                Historial
              </NavLink>
              <div className="h-8 w-px bg-slate-200 mx-2"></div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-8">
        <Routes>
          <Route path="/" element={<LaboratorioAnalysis />} />
          <Route path="/history" element={<LaboratorioHistory />} />
        </Routes>
      </main>
    </div>
  );
};
