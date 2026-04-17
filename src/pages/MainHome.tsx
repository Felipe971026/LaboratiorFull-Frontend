
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Droplets, FlaskConical, Package, ArrowRight, Settings, LogOut, LogIn, Lock, ShieldAlert } from 'lucide-react';
import { auth, logout, loginWithGoogle, db } from '../firebase';
import { getNowISO } from '../utils/dateUtils';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const MainHome: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    document.title = 'Apoyo Diagnóstico';
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Record user profile for admin management
        try {
          await setDoc(doc(db, 'user_profiles', u.uid), {
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            lastLogin: getNowISO(),
            uid: u.uid
          }, { merge: true });
        } catch (e) {
          console.error("Error recording profile:", e);
        }

        const isSuper = u.email?.toLowerCase() === "ingbiomedico@ucihonda.com.co";
        if (isSuper) {
          setIsAuthorized(true);
          setLoading(false);
        } else {
          // Check if user exists in 'users' collection and is active
          try {
            const userDoc = await getDoc(doc(db, 'users', u.uid));
            if (userDoc.exists() && userDoc.data().active) {
              setIsAuthorized(true);
            } else {
              setIsAuthorized(false);
            }
          } catch (error) {
            console.error("Error checking authorization:", error);
            setIsAuthorized(false);
          }
          setLoading(false);
        }
      } else {
        setIsAuthorized(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const isSuperAdmin = user?.email?.toLowerCase() === "ingbiomedico@ucihonda.com.co";

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-xl border border-zinc-200 text-center"
        >
          <div className="bg-zinc-50 p-6 rounded-[2.5rem] shadow-sm inline-block mb-8">
            <img 
              src="/logo.png" 
              alt="Logo UCI Honda" 
              className="h-20 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-4 tracking-tight">
            Apoyo Diagnóstico
          </h1>
          <p className="text-zinc-500 mb-10 font-medium leading-relaxed">
            Bienvenido al sistema de gestión de UCI Honda. Por favor, inicie sesión para acceder a los módulos.
          </p>
          <button
            onClick={() => loginWithGoogle()}
            className="w-full flex items-center justify-center gap-3 bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 active:scale-[0.98]"
          >
            <LogIn size={20} />
            Iniciar Sesión con Google
          </button>
          <p className="mt-8 text-xs text-zinc-400 font-medium uppercase tracking-widest">
            UCI Honda Tecnología
          </p>
        </motion.div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-xl border border-zinc-200 text-center"
        >
          <div className="bg-rose-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 text-rose-600">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">Acceso No Autorizado</h1>
          <p className="text-zinc-500 mb-8 font-medium leading-relaxed">
            Su cuenta (<span className="text-zinc-900 font-bold">{user.email}</span>) no tiene permisos activos para acceder al sistema.
          </p>
          <div className="bg-zinc-50 p-4 rounded-2xl mb-8 text-left">
            <p className="text-xs text-zinc-400 font-bold uppercase mb-2">Instrucciones:</p>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Contacte al administrador para habilitar su acceso. Proporcione su correo y el siguiente ID si es necesario:
            </p>
            <code className="block mt-2 p-2 bg-white border border-zinc-200 rounded-lg text-[10px] font-mono text-zinc-500 break-all">
              {user.uid}
            </code>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 text-rose-600 font-bold hover:bg-rose-50 py-3 rounded-xl transition-all"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </motion.div>
      </div>
    );
  }

  const mainModules = [
    {
      id: 'hemoderivados',
      title: 'Hemocomponentes',
      description: 'Sistema de Gestión de Hemoderivados y Trazabilidad.',
      icon: <Droplets size={32} />,
      color: 'bg-red-50 text-red-600',
      hoverColor: 'hover:bg-red-600 hover:text-white',
      path: '/hemoderivados'
    },
    {
      id: 'laboratorio',
      title: 'Laboratorio Clínico',
      description: 'Gestión de registros y resultados de laboratorio clínico.',
      icon: <FlaskConical size={32} />,
      color: 'bg-indigo-50 text-indigo-600',
      hoverColor: 'hover:bg-indigo-600 hover:text-white',
      path: '/laboratorio'
    },
    {
      id: 'insumos',
      title: 'Insumos',
      description: 'Control de inventarios y gestión de insumos de apoyo diagnóstico.',
      icon: <Package size={32} />,
      color: 'bg-amber-50 text-amber-600',
      hoverColor: 'hover:bg-amber-600 hover:text-white',
      path: '/insumos'
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <div className="flex justify-end gap-4 mb-8">
          {isSuperAdmin && (
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition-all shadow-sm"
            >
              <Settings size={18} />
              Gestión de Usuarios
            </button>
          )}
          {user && (
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-rose-600 rounded-xl font-bold hover:bg-rose-50 transition-all shadow-sm"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          )}
        </div>

        <div className="text-center mb-16">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm inline-block mb-8">
            <img 
              src="/logo.png" 
              alt="Logo UCI Honda" 
              className="h-24 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 mb-4 tracking-tight">
            Apoyo Diagnóstico
          </h1>
          <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-medium">
            UCI Honda - Excelencia en el cuidado crítico
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {mainModules.map((mod, idx) => (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => navigate(mod.path)}
              className="bg-white rounded-[2rem] p-10 border border-zinc-200 shadow-sm hover:shadow-2xl transition-all cursor-pointer group flex flex-col items-center text-center"
            >
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 transition-colors ${mod.color} ${mod.hoverColor}`}>
                {mod.icon}
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 group-hover:text-zinc-800 transition-colors">
                {mod.title}
              </h2>
              <p className="text-zinc-500 mb-8 leading-relaxed">
                {mod.description}
              </p>
              <div className="mt-auto flex items-center text-sm font-bold text-zinc-400 group-hover:text-zinc-900 transition-colors">
                Ingresar <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-24 text-center text-sm text-zinc-400 font-medium">
          © {new Date().getFullYear()} UCI Honda Tecnología. Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
};
