import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Droplets, FlaskConical, Package, ArrowRight } from 'lucide-react';

export const MainHome: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Apoyo Diagnóstico';
  }, []);

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
