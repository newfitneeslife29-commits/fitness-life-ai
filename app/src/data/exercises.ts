export type Muscle =
    | 'pecho' | 'espalda' | 'hombros' | 'biceps' | 'triceps'
    | 'cuadriceps' | 'isquios' | 'gluteos' | 'gemelos' | 'core';

export type Equipment = 'barra' | 'mancuernas' | 'maquina' | 'polea' | 'peso corporal' | 'kettlebell';

export interface Exercise {
    id: string;
    name: string;
    muscle: Muscle;
    secondary?: Muscle[];
    equipment: Equipment;
    // Load added when the double-progression rule says "go up" (kg).
    // 0 = bodyweight: progress by reps instead.
    stepKg: number;
    // Timed holds (plank...): "reps" are seconds.
    timed?: boolean;
    tip: string;
}

export const MUSCLE_LABEL: Record<Muscle, string> = {
    pecho: 'Pecho',
    espalda: 'Espalda',
    hombros: 'Hombros',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    cuadriceps: 'Cuádriceps',
    isquios: 'Isquiotibiales',
    gluteos: 'Glúteos',
    gemelos: 'Gemelos',
    core: 'Core',
};

export const EXERCISES: Exercise[] = [
    // Pecho
    { id: 'press-banca', name: 'Press de banca', muscle: 'pecho', secondary: ['triceps', 'hombros'], equipment: 'barra', stepKg: 2.5, tip: 'Escápulas juntas y abajo, pies firmes. Baja la barra a la parte baja del pecho.' },
    { id: 'press-inclinado-mancuernas', name: 'Press inclinado con mancuernas', muscle: 'pecho', secondary: ['hombros', 'triceps'], equipment: 'mancuernas', stepKg: 2, tip: 'Banco a 30°. Codos a unos 45° del torso, baja hasta notar estiramiento.' },
    { id: 'press-banca-mancuernas', name: 'Press de banca con mancuernas', muscle: 'pecho', secondary: ['triceps'], equipment: 'mancuernas', stepKg: 2, tip: 'Junta las mancuernas arriba sin chocarlas y controla la bajada.' },
    { id: 'aperturas-polea', name: 'Aperturas en polea', muscle: 'pecho', equipment: 'polea', stepKg: 2.5, tip: 'Codos ligeramente flexionados y fijos; cierra como si abrazaras un árbol.' },
    { id: 'fondos', name: 'Fondos en paralelas', muscle: 'pecho', secondary: ['triceps'], equipment: 'peso corporal', stepKg: 0, tip: 'Inclina el torso hacia delante para cargar más el pecho.' },
    { id: 'flexiones', name: 'Flexiones', muscle: 'pecho', secondary: ['triceps', 'core'], equipment: 'peso corporal', stepKg: 0, tip: 'Cuerpo en línea recta, pecho casi al suelo en cada repetición.' },

    // Espalda
    { id: 'dominadas', name: 'Dominadas', muscle: 'espalda', secondary: ['biceps'], equipment: 'peso corporal', stepKg: 0, tip: 'Empieza colgado con brazos estirados y lleva el pecho hacia la barra.' },
    { id: 'jalon-pecho', name: 'Jalón al pecho', muscle: 'espalda', secondary: ['biceps'], equipment: 'polea', stepKg: 5, tip: 'Pecho arriba; tira con los codos hacia las caderas, no con las manos.' },
    { id: 'remo-barra', name: 'Remo con barra', muscle: 'espalda', secondary: ['biceps'], equipment: 'barra', stepKg: 2.5, tip: 'Torso inclinado unos 45°, espalda neutra. Lleva la barra al ombligo.' },
    { id: 'remo-mancuerna', name: 'Remo con mancuerna a una mano', muscle: 'espalda', secondary: ['biceps'], equipment: 'mancuernas', stepKg: 2, tip: 'Apoya rodilla y mano en el banco; tira hacia la cadera.' },
    { id: 'remo-polea', name: 'Remo sentado en polea', muscle: 'espalda', secondary: ['biceps'], equipment: 'polea', stepKg: 5, tip: 'No balancees el torso; junta las escápulas al final.' },
    { id: 'remo-invertido', name: 'Remo invertido', muscle: 'espalda', secondary: ['biceps'], equipment: 'peso corporal', stepKg: 0, tip: 'Bajo una mesa firme o barra baja; cuerpo recto, pecho a la barra.' },
    { id: 'face-pull', name: 'Face pull', muscle: 'hombros', secondary: ['espalda'], equipment: 'polea', stepKg: 2.5, tip: 'Cuerda a la altura de la cara, codos altos, separa las manos al final.' },

    // Hombros
    { id: 'press-militar', name: 'Press militar', muscle: 'hombros', secondary: ['triceps'], equipment: 'barra', stepKg: 2.5, tip: 'Glúteos y abdomen apretados; mete la cabeza bajo la barra al subir.' },
    { id: 'press-hombro-mancuernas', name: 'Press de hombro con mancuernas', muscle: 'hombros', secondary: ['triceps'], equipment: 'mancuernas', stepKg: 2, tip: 'Sentado con respaldo; baja hasta la altura de las orejas.' },
    { id: 'elevaciones-laterales', name: 'Elevaciones laterales', muscle: 'hombros', equipment: 'mancuernas', stepKg: 1, tip: 'Sube hasta la altura de los hombros, guiando con los codos.' },
    { id: 'pike-push-up', name: 'Flexiones pica', muscle: 'hombros', secondary: ['triceps'], equipment: 'peso corporal', stepKg: 0, tip: 'Cadera alta en forma de V invertida; la cabeza baja entre las manos.' },

    // Brazos
    { id: 'curl-barra', name: 'Curl con barra', muscle: 'biceps', equipment: 'barra', stepKg: 2.5, tip: 'Codos pegados al cuerpo; no balancees la espalda.' },
    { id: 'curl-mancuernas', name: 'Curl con mancuernas', muscle: 'biceps', equipment: 'mancuernas', stepKg: 1, tip: 'Gira la palma hacia arriba mientras subes.' },
    { id: 'curl-martillo', name: 'Curl martillo', muscle: 'biceps', equipment: 'mancuernas', stepKg: 1, tip: 'Palmas enfrentadas durante todo el movimiento.' },
    { id: 'extension-triceps-polea', name: 'Extensión de tríceps en polea', muscle: 'triceps', equipment: 'polea', stepKg: 2.5, tip: 'Codos quietos junto al cuerpo; extiende del todo abajo.' },
    { id: 'press-frances', name: 'Press francés', muscle: 'triceps', equipment: 'barra', stepKg: 2.5, tip: 'Baja la barra hacia la frente con los codos apuntando al techo.' },
    { id: 'extension-triceps-mancuerna', name: 'Extensión de tríceps sobre la cabeza', muscle: 'triceps', equipment: 'mancuernas', stepKg: 1, tip: 'Una mancuerna con ambas manos; baja por detrás de la cabeza.' },
    { id: 'fondos-banco', name: 'Fondos en banco', muscle: 'triceps', equipment: 'peso corporal', stepKg: 0, tip: 'Manos en el borde de una silla firme; baja hasta 90° de codo.' },

    // Pierna
    { id: 'sentadilla', name: 'Sentadilla con barra', muscle: 'cuadriceps', secondary: ['gluteos', 'core'], equipment: 'barra', stepKg: 5, tip: 'Pies al ancho de hombros, rodillas en la dirección de los pies, baja al menos a paralelo.' },
    { id: 'sentadilla-goblet', name: 'Sentadilla goblet', muscle: 'cuadriceps', secondary: ['gluteos'], equipment: 'mancuernas', stepKg: 2, tip: 'Mancuerna pegada al pecho, codos entre las rodillas al bajar.' },
    { id: 'sentadilla-libre', name: 'Sentadilla sin peso', muscle: 'cuadriceps', secondary: ['gluteos'], equipment: 'peso corporal', stepKg: 0, tip: 'Peso en talones y medio pie; pecho alto.' },
    { id: 'prensa', name: 'Prensa de piernas', muscle: 'cuadriceps', secondary: ['gluteos'], equipment: 'maquina', stepKg: 10, tip: 'No despegues la zona lumbar del respaldo al bajar.' },
    { id: 'zancadas', name: 'Zancadas con mancuernas', muscle: 'cuadriceps', secondary: ['gluteos'], equipment: 'mancuernas', stepKg: 2, tip: 'Paso largo; la rodilla de atrás casi roza el suelo.' },
    { id: 'zancadas-libres', name: 'Zancadas sin peso', muscle: 'cuadriceps', secondary: ['gluteos'], equipment: 'peso corporal', stepKg: 0, tip: 'Torso recto y control en la bajada.' },
    { id: 'sentadilla-bulgara', name: 'Sentadilla búlgara', muscle: 'cuadriceps', secondary: ['gluteos'], equipment: 'mancuernas', stepKg: 2, tip: 'Pie trasero sobre un banco; baja vertical.' },
    { id: 'extension-cuadriceps', name: 'Extensión de cuádriceps', muscle: 'cuadriceps', equipment: 'maquina', stepKg: 5, tip: 'Sube controlando y aguanta un segundo arriba.' },
    { id: 'peso-muerto', name: 'Peso muerto', muscle: 'isquios', secondary: ['gluteos', 'espalda'], equipment: 'barra', stepKg: 5, tip: 'Barra pegada a las piernas, espalda neutra; empuja el suelo con los pies.' },
    { id: 'peso-muerto-rumano', name: 'Peso muerto rumano', muscle: 'isquios', secondary: ['gluteos'], equipment: 'barra', stepKg: 5, tip: 'Rodillas casi fijas; lleva la cadera atrás hasta notar los isquios.' },
    { id: 'peso-muerto-rumano-mancuernas', name: 'Peso muerto rumano con mancuernas', muscle: 'isquios', secondary: ['gluteos'], equipment: 'mancuernas', stepKg: 2, tip: 'Mancuernas pegadas a los muslos; cadera atrás.' },
    { id: 'curl-femoral', name: 'Curl femoral', muscle: 'isquios', equipment: 'maquina', stepKg: 5, tip: 'Cadera pegada al banco; baja despacio.' },
    { id: 'hip-thrust', name: 'Hip thrust', muscle: 'gluteos', secondary: ['isquios'], equipment: 'barra', stepKg: 5, tip: 'Espalda alta en el banco; aprieta glúteos arriba con la barbilla metida.' },
    { id: 'puente-gluteo', name: 'Puente de glúteo', muscle: 'gluteos', secondary: ['isquios'], equipment: 'peso corporal', stepKg: 0, tip: 'Talones cerca del glúteo; sube la cadera y aguanta un segundo.' },
    { id: 'elevacion-gemelos', name: 'Elevación de gemelos', muscle: 'gemelos', equipment: 'maquina', stepKg: 5, tip: 'Recorrido completo: estira abajo y sube de puntillas.' },
    { id: 'elevacion-gemelos-libre', name: 'Elevación de gemelos a una pierna', muscle: 'gemelos', equipment: 'peso corporal', stepKg: 0, tip: 'En un escalón, apoyado en la pared para equilibrarte.' },

    // Core
    { id: 'plancha', name: 'Plancha', muscle: 'core', equipment: 'peso corporal', stepKg: 0, timed: true, tip: 'Glúteos y abdomen apretados; no dejes caer la cadera.' },
    { id: 'rueda-abdominal', name: 'Rueda abdominal', muscle: 'core', equipment: 'peso corporal', stepKg: 0, tip: 'Avanza solo hasta donde puedas sin arquear la espalda.' },
    { id: 'elevacion-piernas', name: 'Elevación de piernas colgado', muscle: 'core', equipment: 'peso corporal', stepKg: 0, tip: 'Sin balanceo; sube las rodillas hacia el pecho.' },
    { id: 'pallof', name: 'Press Pallof', muscle: 'core', equipment: 'polea', stepKg: 2.5, tip: 'De lado a la polea; empuja al frente sin dejar que te gire.' },
    { id: 'swing-kettlebell', name: 'Swing con kettlebell', muscle: 'gluteos', secondary: ['isquios', 'core'], equipment: 'kettlebell', stepKg: 4, tip: 'Es un empuje de cadera, no una sentadilla; brazos relajados.' },
];

const BY_ID = new Map(EXERCISES.map(e => [e.id, e]));

export const getExercise = (id: string): Exercise | undefined => BY_ID.get(id);

// Same muscle first, then anything that shares a secondary muscle.
export const alternativesFor = (id: string): Exercise[] => {
    const ex = getExercise(id);
    if (!ex) return [];
    return EXERCISES.filter(e => e.id !== id && (e.muscle === ex.muscle || e.secondary?.includes(ex.muscle)))
        .sort((a, b) => Number(b.muscle === ex.muscle) - Number(a.muscle === ex.muscle));
};
