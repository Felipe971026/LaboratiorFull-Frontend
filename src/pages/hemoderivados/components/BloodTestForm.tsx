import React, { useState, useEffect } from 'react';
import { BloodTestRecord, ReceivedUnitRecord } from '../types';
import { generateInterpretation } from '../utils/bloodTestUtils';
import { PROFESSIONALS } from '../../../constants';
import { Save, User, IdCard, Calendar, Droplets, ShieldCheck, UserCheck, FileText, Activity, AlertTriangle, MapPin, Hash, CheckCircle, XCircle, Search, Package } from 'lucide-react';

interface BloodTestFormProps {
  onSave: (record: BloodTestRecord) => void;
  userEmail?: string;
  existingRecords: BloodTestRecord[];
  receivedUnits?: ReceivedUnitRecord[];
  transfusionRecords?: any[];
  dispositionRecords?: any[];
  isSyncing?: boolean;
  initialData?: BloodTestRecord;
}

export const BloodTestForm: React.FC<BloodTestFormProps> = ({ 
  onSave, 
  userEmail, 
  existingRecords, 
  receivedUnits = [], 
  transfusionRecords = [],
  dispositionRecords = [],
  isSyncing,
  initialData
}) => {
  const [formData, setFormData] = useState<Partial<BloodTestRecord>>(initialData || {
    bloodGroup: 'O',
    rh: '+',
    testDate: new Date().toISOString().slice(0, 19), // YYYY-MM-DDTHH:mm:ss
    result: 'Compatible',
    patientName: '',
    patientId: '',
    eps: '',
    age: '',
    gender: 'M',
    unitId: '',
    unitGroup: 'O',
    unitRh: '+',
    unitExpirationDate: '',
    irregularAntibodies: 'NEGATIVO',
    autocontrol: '0',
    temperature: '',
    provider: 'Hemolife',
    requestedHemoderivative: 'Globulos Rojos',
    requestType: 'Reserva',
    qualitySeal: '',
    justification: '',
    siheviReport: 'No',
    siheviDescription: '',
    siheviPredefinedText: '',
    bacteriologist: PROFESSIONALS[0].name,
    registryNumber: PROFESSIONALS[0].registry,
  });

  const receptores = [
    "Andrés Fernando Villegas Quintero",
    "Carmenza Suarez Martinez",
    "Leidy Katherine Rubiano Rico",
    "Margie Lizeth Moreno Reyes",
    "María Alejandra Figueroa Delgado",
    "Olivia Lozano Vásquez",
    "Silvia María López Ávila",
    "Luis Israel Valeriano Rodríguez",
    "Omadis Emelda Meza González"
  ].sort((a, b) => a.localeCompare(b));

  const JUSTIFICATION_OPTIONS: Record<string, string[]> = {
    'Globulos Rojos': [
      'Hb < 7 Sepsis severa o choque séptico.',
      'Paciente coronario con Hb < 10',
      'Paciente con dobutamina > 8 mcg/kg/min e hipoperfusión tisular',
      'Sospecha de hipercoagulabilidad',
      'Anemia o pérdida activa por choque hipovolémico'
    ],
    'Plaquetas (Estándar)': [
      'Paciente con plaquetas < 50000 y requiere cirugía',
      'Paciente con plaquetas < 10000',
      'Paciente con plaquetas < 20000 y patología de HTA, DM, Ancianos, Coronarios',
      'Paciente con plaquetas < 50000 y descenso del 50 % en 24 horas'
    ],
    'Plaquetas AFERESIS': [
      'Paciente con plaquetas < 50000 y requiere cirugía',
      'Paciente con plaquetas < 10000',
      'Paciente con plaquetas < 20000 y patología de HTA, DM, Ancianos, Coronarios',
      'Paciente con plaquetas < 50000 y descenso del 50 % en 24 horas'
    ],
    'Plasma Fresco Congelado': [
      'INR > 20',
      'INR? Sangrado con antecedente de Warfarina ambulatoria',
      'INR > 12 requiere cirugía'
    ]
  };

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{message: string, onConfirm: () => void} | null>(null);
  const [validationMessage, setValidationMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [unitValidationMessage, setUnitValidationMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [searchingUnit, setSearchingUnit] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleValidatePatient = async () => {
    const patientId = formData.patientId?.trim();
    if (!patientId) {
      setValidationMessage({ text: 'Ingrese un ID para validar', type: 'error' });
      setTimeout(() => setValidationMessage(null), 3000);
      return;
    }

    setSearchingPatient(true);
    // Simulate a small delay for better UX feedback
    await new Promise(resolve => setTimeout(resolve, 500));

    // Sort by createdAt descending to get the most recent record for this patient
    const patientRecords = existingRecords
      .filter(r => r.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (patientRecords.length > 0) {
      const latestRecord = patientRecords[0];
      setFormData(prev => ({
        ...prev,
        patientName: latestRecord.patientName,
        eps: latestRecord.eps || '',
        age: latestRecord.age || '',
        gender: latestRecord.gender || 'M',
        bloodGroup: latestRecord.bloodGroup || 'O',
        rh: latestRecord.rh || '+',
      }));
      setValidationMessage({ text: 'Paciente encontrado. Datos cargados.', type: 'success' });
    } else {
      setAlertMessage(`NOVEDAD: El paciente con ID "${patientId}" no se encuentra en los registros previos.`);
    }
    
    setSearchingPatient(false);
    setTimeout(() => setValidationMessage(null), 3000);
  };

  const handleValidateUnit = async () => {
    const unitId = formData.unitId?.trim();
    if (!unitId) {
      setUnitValidationMessage({ text: 'Ingrese un Número de Bolsa para validar', type: 'error' });
      setTimeout(() => setUnitValidationMessage(null), 3000);
      return;
    }

    setSearchingUnit(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const unitRecord = receivedUnits.find(u => u.unitId === unitId || u.qualitySeal === unitId);
    const isUsed = transfusionRecords.some(t => t.unitId === unitId || t.qualitySeal === unitId) ||
                   dispositionRecords.some(d => d.unitId === unitId || d.qualitySeal === unitId);
    const isReturned = existingRecords.some(r => (r.unitId === unitId || r.qualitySeal === unitId) && r.returned);

    if (unitRecord) {
      if (isUsed && !isReturned) {
        setAlertMessage(`NOVEDAD: La unidad "${unitId}" ya ha sido UTILIZADA o tiene una DISPOSICIÓN FINAL.`);
        setUnitValidationMessage({ text: 'Unidad no disponible (Ya utilizada)', type: 'error' });
        return;
      }
      setFormData(prev => ({
        ...prev,
        unitGroup: unitRecord.bloodGroup,
        unitRh: unitRecord.rh,
        unitExpirationDate: unitRecord.expirationDate,
        provider: unitRecord.provider,
        requestedHemoderivative: unitRecord.hemoderivativeType,
        qualitySeal: unitRecord.qualitySeal || prev.qualitySeal,
      }));
      setUnitValidationMessage({ text: 'Unidad encontrada en Recepción. Datos cargados.', type: 'success' });
    } else {
      setAlertMessage(`NOVEDAD: La unidad "${unitId}" no se encuentra en los registros de RECEPCIÓN.`);
    }
    
    setSearchingUnit(false);
    setTimeout(() => setUnitValidationMessage(null), 3000);
  };

  const proceedToSave = (finalPatientName: string) => {
    const newRecord: BloodTestRecord = {
      ...(formData as BloodTestRecord),
      patientName: finalPatientName,
      patientId: formData.patientId?.trim() || '',
      userEmail: userEmail || '',
      createdAt: new Date().toISOString(),
    };

    onSave(newRecord);
    // Reset form
    setFormData({
      bloodGroup: 'O',
      rh: '+',
      testDate: new Date().toISOString().slice(0, 19),
      result: 'Compatible',
      patientName: '',
      patientId: '',
      eps: '',
      age: '',
      gender: 'M',
      unitId: '',
      unitGroup: 'O',
      unitRh: '+',
      unitExpirationDate: '',
      irregularAntibodies: 'NEGATIVO',
      autocontrol: '0',
      temperature: '',
      provider: 'Hemolife',
      requestedHemoderivative: 'Globulos Rojos',
      requestType: 'Reserva',
      qualitySeal: '',
      bacteriologist: PROFESSIONALS[0].name,
      registryNumber: PROFESSIONALS[0].registry,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que la unidad exista en recepción antes de permitir el registro
    const unitExists = receivedUnits.some(
      u => u.unitId === formData.unitId || u.qualitySeal === formData.qualitySeal
    );

    if (!unitExists) {
      setAlertMessage('ERROR: No se puede registrar la prueba. La unidad no se encuentra en los registros de recepción. Por favor, valide la unidad primero.');
      return;
    }

    if (!formData.patientName || !formData.patientId || !formData.testDate) {
      setAlertMessage('Por favor complete los campos obligatorios.');
      return;
    }

    const patientNameUpper = formData.patientName.toUpperCase().trim();
    const patientId = formData.patientId.trim();

    // Validate ID uniqueness / name match
    const existingPatient = existingRecords.find(r => r.patientId === patientId);
    if (existingPatient) {
      if (existingPatient.patientName.toUpperCase().trim() !== patientNameUpper) {
        setAlertMessage(`El ID ${patientId} ya está registrado con el nombre "${existingPatient.patientName}". Los nombres deben coincidir para el mismo ID.`);
        return;
      }
    }

    // Validate Unit Reuse
    const isUnitAlreadyTransfused = existingRecords.some(record => {
      if (record.id === formData.id) return false;
      
      const sameUnitId = formData.unitId && record.unitId === formData.unitId;
      const sameQualitySeal = formData.qualitySeal && record.qualitySeal === formData.qualitySeal;
      
      const isTransfusedOrUrgent = record.requestType === 'Transfusion' || record.requestType === 'Urgencia Vital';
      const isReturned = record.returned === true;
      
      return (sameUnitId || sameQualitySeal) && isTransfusedOrUrgent && !isReturned;
    });

    if (isUnitAlreadyTransfused) {
      setAlertMessage('El Número de Unidad o Sello de Calidad ya ha sido utilizado (Transfusión o Urgencia Vital) y está bloqueado. No puede ser utilizado para nuevas reservas ni transfusiones.');
      return;
    }

    proceedToSave(patientNameUpper);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { 
        ...prev, 
        [name]: name === 'patientName' ? value.toUpperCase() : name === 'patientId' ? value.trim() : value 
      };
      
      if (name === 'unitId' && updated.provider === 'Hemocentro') {
        updated.qualitySeal = value;
      } else if (name === 'provider' && value === 'Hemocentro') {
        updated.qualitySeal = updated.unitId;
      }

      // Logic for non-RBC hemoderivatives
      if (name === 'requestedHemoderivative') {
        if (value !== 'Globulos Rojos') {
          updated.autocontrol = 'Unidad disponible';
          updated.result = 'Unidad disponible';
          updated.irregularAntibodies = 'NO APLICA';
        } else {
          updated.autocontrol = '0';
          updated.result = 'Compatible';
          updated.irregularAntibodies = 'NEGATIVO';
        }
        // Reset justification when hemoderivative changes
        updated.justification = '';
      }

      // SIHEVI Logic
      if (['siheviReport', 'siheviDescription', 'patientId', 'patientName'].includes(name)) {
        const report = name === 'siheviReport' ? value : updated.siheviReport;
        const desc = name === 'siheviDescription' ? value : updated.siheviDescription;
        const pId = name === 'patientId' ? value : updated.patientId;
        const pName = name === 'patientName' ? value : updated.patientName;

        if (report === 'Sí') {
          updated.siheviPredefinedText = `Paciente (${pId} y ${pName}) presenta reporte en SIHEVI mostrando lo siguiente: ${desc || ''}`;
        } else if (report === 'No') {
          updated.siheviPredefinedText = `El paciente (${pId} y ${pName}) no tiene reportes a la fecha de IH registrados ni RAT reportadas asociados`;
        } else {
          updated.siheviPredefinedText = '';
        }
      }

      // Professional Logic
      if (name === 'bacteriologist') {
        const professional = PROFESSIONALS.find(p => p.name === value);
        if (professional) {
          updated.registryNumber = professional.registry;
        }
      }
      
      return updated;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-8">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
        <FileText className="text-red-600" size={24} />
        <h2 className="text-xl font-bold text-zinc-900">{initialData ? 'Editar Prueba de Compatibilidad' : 'Nueva Prueba de Compatibilidad'}</h2>
      </div>

      {/* Patient Info Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <User size={16} /> Información del Paciente
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-medium text-zinc-700">Nombre del Paciente *</label>
            <input type="text" name="patientName" value={formData.patientName} onChange={handleChange} required className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder="Nombre completo" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">CC / Identificación *</label>
            <div className="flex gap-2">
              <input type="text" name="patientId" value={formData.patientId} onChange={handleChange} required className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder="ID" />
              <button 
                type="button" 
                onClick={handleValidatePatient}
                disabled={searchingPatient}
                className="shrink-0 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
              >
                <Search size={16} className={searchingPatient ? 'animate-spin' : ''} />
                {searchingPatient ? 'Buscando...' : 'Validar'}
              </button>
            </div>
            {validationMessage && (
              <p className={`text-xs font-medium ${validationMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {validationMessage.text}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">EPS</label>
            <input type="text" name="eps" value={formData.eps} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder="Ej: PARTICULAR" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">Edad</label>
            <input type="text" name="age" value={formData.age} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder="Ej: 68 A" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">Sexo</label>
            <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm">
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Test Details Section */}
      <div className="space-y-4 pt-4 border-t border-zinc-100">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <Activity size={16} /> Detalles del Examen
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">Fecha y Hora del Examen *</label>
            <input type="datetime-local" step="1" name="testDate" value={formData.testDate} onChange={handleChange} required className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">Resultado Final *</label>
            <select 
              name="result" 
              value={formData.result} 
              onChange={handleChange} 
              required 
              disabled={formData.requestedHemoderivative !== 'Globulos Rojos'}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm font-bold ${formData.result === 'Compatible' ? 'bg-green-50 text-green-700 border-green-200' : formData.result === 'Unidad disponible' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}
            >
              <option value="Compatible">COMPATIBLE</option>
              <option value="Incompatible">INCOMPATIBLE</option>
              <option value="Unidad disponible">UNIDAD DISPONIBLE</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
          {/* Patient Blood Group */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-700 uppercase">Grupo del Paciente</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-600">Grupo</label>
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm">
                  <option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-600">Rh</label>
                <select name="rh" value={formData.rh} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm">
                  <option value="+">POSITIVO (+)</option><option value="-">NEGATIVO (-)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Unit Blood Group */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-700 uppercase">Grupo de la Unidad</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-600">Grupo</label>
                <select name="unitGroup" value={formData.unitGroup} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm">
                  <option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-600">Rh</label>
                <select name="unitRh" value={formData.unitRh} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm">
                  <option value="+">POSITIVO (+)</option><option value="-">NEGATIVO (-)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">Proveedor</label>
            <select name="provider" value={formData.provider} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm">
              <option value="Hemolife">Hemolife</option>
              <option value="Hemocentro">Hemocentro</option>
              <option value="FUHECO">FUHECO</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">Hemoderivado Solicitado</label>
            <select name="requestedHemoderivative" value={formData.requestedHemoderivative} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm">
              <option value="Globulos Rojos">Glóbulos Rojos</option>
              <option value="Plasma Fresco Congelado">Plasma Fresco Congelado</option>
              <option value="Plaquetas (Estándar)">Plaquetas (Estándar)</option>
              <option value="Plaquetas AFERESIS">Plaquetas AFERESIS</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">Tipo de Solicitud</label>
            <select name="requestType" value={formData.requestType} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm">
              <option value="Reserva">Reserva</option>
              <option value="Transfusion">Transfusion</option>
              <option value="Urgencia Vital">Urgencia Vital</option>
            </select>
          </div>
        </div>

        {/* Justification and SIHEVI Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-50">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700 uppercase">Justificación Clínica</label>
            <select 
              name="justification" 
              value={formData.justification} 
              onChange={handleChange} 
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
            >
              <option value="">Seleccione una justificación...</option>
              {formData.requestedHemoderivative && JUSTIFICATION_OPTIONS[formData.requestedHemoderivative]?.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700 uppercase">¿Paciente presenta IH o RAT en SIHEVI?</label>
            <select 
              name="siheviReport" 
              value={formData.siheviReport} 
              onChange={handleChange} 
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
            >
              <option value="No">No</option>
              <option value="Sí">Sí</option>
            </select>
          </div>
        </div>

        {formData.siheviReport === 'Sí' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">Descripción del Reporte SIHEVI</label>
            <textarea
              name="siheviDescription"
              value={formData.siheviDescription}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm h-20 resize-none"
              placeholder="Describa el reporte encontrado..."
            />
          </div>
        )}

        {formData.siheviPredefinedText && (
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
            <p className="text-xs font-bold text-zinc-400 uppercase mb-2 tracking-wider">Vista Previa de Reporte</p>
            <p className="text-sm text-zinc-600 italic leading-relaxed">
              {formData.siheviPredefinedText}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">Número de Unidad</label>
            <div className="flex gap-2 items-center">
              <input 
                type="text" 
                name="unitId" 
                value={formData.unitId} 
                onChange={handleChange} 
                className="flex-1 min-w-0 px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm font-mono" 
                placeholder="Ej: 2331044178" 
              />
              <button 
                type="button" 
                onClick={handleValidateUnit}
                disabled={searchingUnit}
                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium disabled:opacity-50 h-[38px]"
                title="Validar en Recepción"
              >
                <Search size={14} className={searchingUnit ? 'animate-spin' : ''} />
                {searchingUnit ? '...' : 'Validar'}
              </button>
            </div>
            {unitValidationMessage && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${unitValidationMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {unitValidationMessage.type === 'success' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {unitValidationMessage.text}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">Sello de Calidad</label>
            <input type="text" name="qualitySeal" value={formData.qualitySeal} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm font-mono" placeholder="Ej: SC-12345" readOnly={formData.provider === 'Hemocentro'} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">Fecha de Vencimiento Unidad</label>
            <input type="date" name="unitExpirationDate" value={formData.unitExpirationDate} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" />
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-bold text-zinc-700 uppercase">Rastreo de Anticuerpos Irregulares</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-600">General</label>
              <input type="text" name="irregularAntibodies" value={formData.irregularAntibodies} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder="NEGATIVO" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-600">Autocontrol</label>
              <select 
                name="autocontrol" 
                value={formData.autocontrol} 
                onChange={handleChange} 
                disabled={formData.requestedHemoderivative !== 'Globulos Rojos'}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
              >
                <option value="0">0</option>
                <option value="+">+</option>
                <option value="++">++</option>
                <option value="+++">+++</option>
                <option value="++++">++++</option>
                <option value="Unidad disponible">Unidad disponible</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-600">Temperatura (°C)</label>
              <input type="text" name="temperature" value={formData.temperature} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder="Ej: 37" />
            </div>
          </div>
        </div>
      </div>

      {/* Interpretation Section */}
      <div className="space-y-4 pt-4 border-t border-zinc-100">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <FileText size={16} /> Interpretación
        </h3>
        
        <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-sm italic border border-blue-100">
          {generateInterpretation(formData)}
        </div>
      </div>

      {/* Professional Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-100">
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-700">Bacteriólogo Responsable *</label>
          <select 
            name="bacteriologist" 
            value={formData.bacteriologist} 
            onChange={handleChange} 
            required
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
          >
            {PROFESSIONALS.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-700">Registro</label>
          <input type="text" name="registryNumber" value={formData.registryNumber} onChange={handleChange} className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-zinc-50" readOnly />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-700">Usuario (Email)</label>
          <input type="text" value={userEmail || 'No disponible'} className="w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none text-sm bg-zinc-50 text-zinc-500" readOnly />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          type="submit" 
          disabled={isSyncing}
          className={`bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-red-100 transition-all active:scale-95 ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSyncing ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <Save size={20} />
          )}
          {isSyncing ? 'Sincronizando...' : initialData ? 'Actualizar Registro' : 'Guardar Registro'}
        </button>
      </div>

      {/* Custom Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Atención</h3>
            <p className="text-zinc-600 mb-6">{alertMessage}</p>
            <button type="button" onClick={() => setAlertMessage(null)} className="w-full px-4 py-3 bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold transition-colors">
              Entendido
            </button>
          </div>
        </div>
      )}
    </form>
  );
};
