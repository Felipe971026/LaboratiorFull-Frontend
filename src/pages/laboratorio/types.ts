export interface LabParameter {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'Normal' | 'Alto' | 'Bajo';
  analysis: string;
}

export interface CalibrationPoint {
  concentration: number;
  absorbance: number;
}

export interface CalibrationCurve {
  title?: string;
  points: CalibrationPoint[];
  r2?: number;
  equation?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface LabGraph {
  title: string;
  type: 'histogram' | 'line';
  xAxisLabel?: string;
  yAxisLabel?: string;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  dataPoints: Point[];
  metadata?: Record<string, string>;
}

export interface LabResultData {
  id: string;
  date: string;
  patientName: string;
  clinicalHistoryNumber?: string;
  age?: string;
  eps?: string;
  studyType: string;
  parameters: LabParameter[];
  generalAnalysis: string;
  sourceImage?: string;
  sourceMimeType?: string;
  calibrationCurve?: CalibrationCurve;
  graphs?: LabGraph[];
  validationWarning?: string;
}
