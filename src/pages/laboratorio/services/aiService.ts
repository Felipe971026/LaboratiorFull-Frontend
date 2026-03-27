import { GoogleGenAI, Type } from '@google/genai';
import { LabResultData } from '../types';

// Support both AI Studio environment and standard Vite deployments
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. Please configure it in your environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-to-prevent-crash' });

export async function analyzeLabResult(
  base64Image: string,
  mimeType: string,
  patientName: string,
  studyType: string,
  clinicalHistoryNumber?: string,
  age?: string,
  eps?: string
): Promise<LabResultData> {
  const studyTypeContext = studyType 
    ? `El usuario ha indicado que el tipo de estudio es "${studyType}", pero esta información puede ser inexacta o incompleta. Usa esa información solo como guía.`
    : `El usuario no ha especificado el tipo de estudio.`;

  const patientContext = `
    El usuario ha ingresado la siguiente información del paciente:
    - Nombre: ${patientName}
    ${clinicalHistoryNumber ? `- Identificación (Historia Clínica / Cédula): ${clinicalHistoryNumber}` : ''}
    ${age ? `- Edad: ${age}` : ''}
    ${eps ? `- EPS: ${eps}` : ''}
    
    Tu tarea es extraer la información del paciente directamente de la imagen (nombre, identificación, edad, eps) y compararla con la información ingresada por el usuario.
    Si notas que el nombre o la identificación extraídos de la imagen NO coinciden con los ingresados, debes generar una advertencia en el campo 'mismatchWarning'.
  `;

  const prompt = `
    Eres un experto analista de laboratorio clínico trabajando para "UCI Honda".
    Analiza el documento adjunto que contiene resultados de laboratorio del paciente "${patientName}".
    ${studyTypeContext}
    ${patientContext}
    
    Tu tarea es determinar y especificar los exámenes o análisis reales que se realizaron basándote en los parámetros encontrados en la imagen (ej. Cuadro Hemático, Química Sanguínea, Perfil Lipídico, Uroanálisis, etc.) y colocarlo en el campo 'detectedStudyType'.
    
    El documento puede contener cuadros hemáticos (CBC) y pruebas de química sanguínea como UREA y CREATININA (CREAT).
    Extrae los parámetros medidos, su valor, unidad, rango de referencia y determina su estado (Normal, Alto o Bajo).
    Además, proporciona un análisis clínico inicial breve para cada parámetro.
    
    IMPORTANTE: Si el documento incluye gráficas o curvas (ej. "Curva de calibración", "Curv rea" para Urea o Creatinina, o histogramas de WBC/RBC/PLT),
    incluye en el 'generalAnalysis' una interpretación de estas curvas y su comportamiento (si es normal o anómalo).
    Si hay una tabla de datos de una curva de calibración (ej. Concentración vs Absorbancia), extrae los puntos de la curva, el valor de R2 y la ecuación si están presentes.
    
    IMPORTANTE SOBRE LAS GRÁFICAS:
    - NO grafiques en barras, todas las gráficas (incluyendo WBC, RBC, PLT) deben ser extraídas como líneas continuas.
    - REVALIDA cada gráfica con su imagen original, prestando especial atención a los valores de los ejes y a los puntos (X, Y).
    - Extrae los puntos (x, y) con la mayor precisión posible leyendo los valores de la cuadrícula (grid) en la imagen original.
    - Identifica los valores mínimos y máximos de los ejes X e Y que se muestran en la gráfica original y plásmalos en xMin, xMax, yMin, yMax.
    - Para las gráficas WBC, RBC, PLT (histogramas de líneas), extrae suficientes puntos para que la curva sea suave y represente fielmente los picos y valles originales (MÁXIMO 30 PUNTOS por gráfica para no exceder límites).
    - Para las curvas de reacción (UREA, CREAT), revalida que los puntos X (periodo) y Y (absorbancia) coincidan exactamente con la escala de la imagen (MÁXIMO 30 PUNTOS).
    
    Finalmente, proporciona un análisis general de todos los resultados combinados.
    
    Asegúrate de extraer todos los datos de la imagen con precisión.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      extractedPatientName: { type: Type.STRING, description: "Nombre del paciente extraído de la imagen" },
      extractedClinicalHistoryNumber: { type: Type.STRING, description: "Número de historia clínica o cédula extraído de la imagen" },
      extractedAge: { type: Type.STRING, description: "Edad extraída de la imagen" },
      extractedEps: { type: Type.STRING, description: "EPS extraída de la imagen" },
      mismatchWarning: { type: Type.STRING, description: "Advertencia si el nombre o identificación de la imagen no coinciden con los ingresados. Vacío si coinciden o no se ingresaron." },
      detectedStudyType: { type: Type.STRING, description: "El tipo de estudio o exámenes reales detectados en el documento (ej. Cuadro Hemático, Química Sanguínea, etc.)." },
      parameters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Nombre del parámetro (ej. Glucosa, Hemoglobina, UREA, CREAT)" },
            value: { type: Type.STRING, description: "Valor medido" },
            unit: { type: Type.STRING, description: "Unidad de medida" },
            referenceRange: { type: Type.STRING, description: "Rango de referencia" },
            status: { type: Type.STRING, description: "Estado: 'Normal', 'Alto' o 'Bajo'" },
            analysis: { type: Type.STRING, description: "Breve interpretación clínica de este parámetro específico" }
          },
          required: ["name", "value", "unit", "referenceRange", "status", "analysis"]
        }
      },
      generalAnalysis: { type: Type.STRING, description: "Análisis general incluyendo la interpretación de las curvas/gráficas si están presentes." },
      calibrationCurve: {
        type: Type.OBJECT,
        description: "Datos de la curva de calibración si está presente en la imagen.",
        properties: {
          title: { type: Type.STRING, description: "Título de la curva (ej. Curva de calibración)" },
          points: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                concentration: { type: Type.NUMBER, description: "Concentración (ej. ppm)" },
                absorbance: { type: Type.NUMBER, description: "Absorbancia promedio o valor Y" }
              },
              required: ["concentration", "absorbance"]
            }
          },
          r2: { type: Type.NUMBER, description: "Valor de R2 o coeficiente de correlación" },
          equation: { type: Type.STRING, description: "Ecuación de la recta (ej. y = mx + b)" }
        },
        required: ["points"]
      },
      graphs: {
        type: Type.ARRAY,
        description: "Gráficas adicionales (histogramas de líneas o curvas de reacción) para ser redibujadas.",
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Título de la gráfica (ej. WBC, RBC, PLT, UREA, CREAT)" },
            type: { type: Type.STRING, description: "Tipo de gráfica: 'histogram' o 'line' (ambas se dibujarán como líneas)" },
            xAxisLabel: { type: Type.STRING, description: "Etiqueta del eje X (ej. fL, X(periodo))" },
            yAxisLabel: { type: Type.STRING, description: "Etiqueta del eje Y (ej. mg/dL, Y(absorbencia))" },
            xMin: { type: Type.NUMBER, description: "Valor mínimo del eje X visible en la gráfica original" },
            xMax: { type: Type.NUMBER, description: "Valor máximo del eje X visible en la gráfica original" },
            yMin: { type: Type.NUMBER, description: "Valor mínimo del eje Y visible en la gráfica original" },
            yMax: { type: Type.NUMBER, description: "Valor máximo del eje Y visible en la gráfica original" },
            dataPoints: {
              type: Type.ARRAY,
              description: "Puntos (x,y) precisos extraídos de la cuadrícula de la imagen original. Extrae suficientes puntos para recrear la forma exacta, pero no más de 30 puntos por gráfica para no exceder el límite de respuesta.",
              items: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER }
                },
                required: ["x", "y"]
              }
            },
            metadata: {
              type: Type.OBJECT,
              description: "Metadatos asociados a la gráfica (ej. Test: UREA, Long onda: 340)"
            }
          },
          required: ["title", "type", "dataPoints"]
        }
      }
    },
    required: ["detectedStudyType", "parameters", "generalAnalysis"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.2,
        maxOutputTokens: 8192
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('No se recibió respuesta de la IA.');
    }

    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch {
      console.error('Error parsing JSON from AI response. Raw text:', text);
      throw new Error('La respuesta de la IA fue incompleta o inválida. Por favor, intenta de nuevo.');
    }
    
    return {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      patientName: (parsedData.extractedPatientName || patientName).toUpperCase(),
      clinicalHistoryNumber: parsedData.extractedClinicalHistoryNumber || clinicalHistoryNumber,
      age: parsedData.extractedAge || age,
      eps: parsedData.extractedEps || eps,
      studyType: parsedData.detectedStudyType || studyType || 'Análisis de Laboratorio',
      parameters: parsedData.parameters,
      generalAnalysis: parsedData.generalAnalysis,
      sourceImage: `data:${mimeType};base64,${base64Image}`,
      sourceMimeType: mimeType,
      calibrationCurve: parsedData.calibrationCurve,
      graphs: parsedData.graphs,
      validationWarning: parsedData.mismatchWarning
    };
  } catch (error) {
    console.error('Error analyzing lab result:', error);
    throw error;
  }
}
