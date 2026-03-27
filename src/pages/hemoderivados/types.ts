export interface BloodTestRecord {
  id?: string;
  patientName: string;
  patientId: string;
  eps?: string;
  age?: string;
  gender?: string;
  
  bloodGroup: 'A' | 'B' | 'AB' | 'O' | '';
  rh: '+' | '-' | '';
  testDate: string;
  result: 'Compatible' | 'Incompatible' | 'Unidad disponible' | '';
  
  unitId?: string;
  unitGroup?: 'A' | 'B' | 'AB' | 'O' | '';
  unitRh?: '+' | '-' | '';
  unitExpirationDate?: string;
  
  irregularAntibodies?: string;
  autocontrol?: '0' | '+' | '++' | '+++' | '++++' | 'Unidad disponible' | '';
  temperature?: string;
  
  provider?: 'Hemolife' | 'Hemocentro' | 'FUHECO' | '';
  requestedHemoderivative?: 'Globulos Rojos' | 'Plasma Fresco Congelado' | 'Plaquetas (Estándar)' | 'Plaquetas AFERESIS' | '';
  requestType?: 'Reserva' | 'Transfusion' | 'Urgencia Vital' | '';
  qualitySeal?: string;
  
  justification?: string;
  siheviReport?: 'Sí' | 'No' | '';
  siheviDescription?: string;
  siheviPredefinedText?: string;
  
  bacteriologist?: string;
  registryNumber?: string;
  userEmail?: string;
  
  // Legacy fields
  responsiblePerson?: string;
  hemoderivativeUnit?: string;
  observations?: string;
  
  createdAt: string;
  uid?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ReceivedUnitRecord {
  id?: string;
  receptionDate: string;
  receptionTime: string;
  provider: 'Hemolife' | 'Hemocentro' | 'FUHECO' | '';
  
  hemoderivativeType: 'Globulos Rojos' | 'Plasma Fresco Congelado' | 'Plaquetas (Estándar)' | 'Plaquetas AFERESIS' | '';
  unitId: string;
  qualitySeal: string;
  bloodGroup: 'A' | 'B' | 'AB' | 'O' | '';
  rh: '+' | '-' | '';
  volume: string;
  expirationDate: string;
  
  packagingIntegrity: 'Íntegro' | 'Dañado' | '';
  contentAspect: 'Normal' | 'Anormal' | '';
  temperature: string;
  observations: string;
  
  accepted: 'Sí' | 'No' | '';
  receiverName: string;
  supervisorName: string;
  
  rejectionReason?: string;
  actionsTaken?: string;
  reporterName?: string;

  userEmail?: string;
  createdAt: string;
  uid?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface TransfusionUseRecord {
  id?: string;
  service: string;
  patientName: string;
  patientId: string;
  age: string;
  gender: string;
  hemoderivativeType: string;
  bloodGroup: string;
  rh: string;
  orderDate: string;
  orderTime: string;
  transfusionDate: string;
  transfusionTime: string;
  opportunity: string;
  qualitySeal: string;
  unitId: string; // Internal ID
  prescriptionFormat: 'Sí' | 'No' | '';
  informedConsent: 'Sí' | 'No' | '';
  adminChecklist: 'Sí' | 'No' | '';
  nursingNote: 'Sí' | 'No' | '';
  adverseReaction: 'Sí' | 'No' | '';
  safetyEvent: string;
  
  reactionDescription?: string;
  observations?: string;
  userEmail?: string;
  createdAt: string;
  uid?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface FinalDispositionRecord {
  id?: string;
  unitId: string;
  qualitySeal?: string;
  dispositionDate: string;
  dispositionType: 'Transfundido' | 'Descarte' | 'Traslado' | '';
  reason?: string; // e.g., for discard
  responsiblePerson: string;
  observations?: string;
  userEmail?: string;
  createdAt: string;
  uid?: string;
  updatedAt?: string;
  updatedBy?: string;
}
