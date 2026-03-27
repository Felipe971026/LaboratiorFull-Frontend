import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainHome } from './pages/MainHome';
import { HemoderivadosHome } from './pages/hemoderivados/HemoderivadosHome';
import { RecepcionApp } from './pages/hemoderivados/recepcion/RecepcionApp';
import { PreTransfusionalApp } from './pages/hemoderivados/pre-transfusional/PreTransfusionalApp';
import { UsoApp } from './pages/hemoderivados/uso/UsoApp';
import { DisposicionApp } from './pages/hemoderivados/disposicion/DisposicionApp';
import { LaboratorioHome } from './pages/laboratorio/LaboratorioHome';
import { InsumosHome } from './pages/insumos/InsumosHome';
import { Kardex } from './pages/insumos/Kardex';
import { InventoryAudit } from './pages/insumos/InventoryAudit';

/**
 * Main Application Component
 * Handles global routing and layout
 */
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainHome />} />
        <Route path="/hemoderivados" element={<HemoderivadosHome />} />
        <Route path="/hemoderivados/recepcion" element={<RecepcionApp />} />
        <Route path="/hemoderivados/pre-transfusional" element={<PreTransfusionalApp />} />
        <Route path="/hemoderivados/uso" element={<UsoApp />} />
        <Route path="/hemoderivados/disposicion" element={<DisposicionApp />} />
        <Route path="/laboratorio/*" element={<LaboratorioHome />} />
        <Route path="/insumos" element={<InsumosHome />} />
        <Route path="/insumos/kardex" element={<Kardex />} />
        <Route path="/insumos/auditoria" element={<InventoryAudit />} />
      </Routes>
    </Router>
  );
}
