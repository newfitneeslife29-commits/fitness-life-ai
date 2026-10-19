import { l10n, type L10n } from '../i18n';

export type Muscle =
    | 'pecho' | 'espalda' | 'hombros' | 'biceps' | 'triceps'
    | 'cuadriceps' | 'isquios' | 'gluteos' | 'gemelos' | 'core';

export type Equipment = 'barra' | 'mancuernas' | 'maquina' | 'polea' | 'peso corporal' | 'kettlebell';

export interface Exercise {
    id: string;
    name: L10n;
    muscle: Muscle;
    secondary?: Muscle[];
    equipment: Equipment;
    // Load added when the double-progression rule says "go up" (kg).
    // 0 = bodyweight: progress by reps instead.
    stepKg: number;
    // Timed holds (plank...): "reps" are seconds.
    timed?: boolean;
    // Cardio machines (added to home plans that have one) and gentle moves
    // for pregnancy and after giving birth: never swapped in elsewhere.
    kind?: 'cardio' | 'gentle';
    tip: L10n;
}

const MUSCLES: Record<Muscle, L10n> = {
    pecho: { es: 'Pecho', en: 'Chest', pt: 'Peito' },
    espalda: { es: 'Espalda', en: 'Back', pt: 'Costas' },
    hombros: { es: 'Hombros', en: 'Shoulders', pt: 'Ombros' },
    biceps: { es: 'Bíceps', en: 'Biceps', pt: 'Bíceps' },
    triceps: { es: 'Tríceps', en: 'Triceps', pt: 'Tríceps' },
    cuadriceps: { es: 'Cuádriceps', en: 'Quads', pt: 'Quadríceps' },
    isquios: { es: 'Isquiotibiales', en: 'Hamstrings', pt: 'Posteriores' },
    gluteos: { es: 'Glúteos', en: 'Glutes', pt: 'Glúteos' },
    gemelos: { es: 'Gemelos', en: 'Calves', pt: 'Panturrilhas' },
    core: { es: 'Core', en: 'Core', pt: 'Core' },
};

const EQUIPMENT: Record<Equipment, L10n> = {
    barra: { es: 'barra', en: 'barbell', pt: 'barra' },
    mancuernas: { es: 'mancuernas', en: 'dumbbells', pt: 'halteres' },
    maquina: { es: 'máquina', en: 'machine', pt: 'máquina' },
    polea: { es: 'polea', en: 'cable', pt: 'polia' },
    'peso corporal': { es: 'peso corporal', en: 'bodyweight', pt: 'peso corporal' },
    kettlebell: { es: 'kettlebell', en: 'kettlebell', pt: 'kettlebell' },
};

export const MUSCLE_ORDER = Object.keys(MUSCLES) as Muscle[];
export const muscleLabel = (m: Muscle) => l10n(MUSCLES[m]);
export const equipmentLabel = (e: Equipment) => l10n(EQUIPMENT[e]);

const x = (
    id: string, es: string, en: string, pt: string, muscle: Muscle, equipment: Equipment, stepKg: number,
    tip: [string, string, string], extra: { secondary?: Muscle[]; timed?: boolean; kind?: 'cardio' | 'gentle' } = {},
): Exercise => ({ id, name: { es, en, pt }, muscle, equipment, stepKg, tip: { es: tip[0], en: tip[1], pt: tip[2] }, ...extra });

export const EXERCISES: Exercise[] = [
    // Chest
    x('press-banca', 'Press de banca', 'Bench press', 'Supino reto', 'pecho', 'barra', 2.5, [
        'Escápulas juntas y abajo, pies firmes. Baja la barra a la parte baja del pecho.',
        'Squeeze your shoulder blades down and together, feet planted. Lower the bar to your lower chest.',
        'Escápulas juntas e para baixo, pés firmes. Desça a barra até a parte baixa do peito.',
    ], { secondary: ['triceps', 'hombros'] }),
    x('press-inclinado-mancuernas', 'Press inclinado con mancuernas', 'Incline dumbbell press', 'Supino inclinado com halteres', 'pecho', 'mancuernas', 2, [
        'Banco a 30°. Codos a unos 45° del torso; baja hasta notar estiramiento.',
        'Bench at 30°. Elbows about 45° from your torso; lower until you feel a stretch.',
        'Banco a 30°. Cotovelos a uns 45° do tronco; desça até sentir alongar.',
    ], { secondary: ['hombros', 'triceps'] }),
    x('press-banca-mancuernas', 'Press de banca con mancuernas', 'Dumbbell bench press', 'Supino com halteres', 'pecho', 'mancuernas', 2, [
        'Junta las mancuernas arriba sin chocarlas y controla la bajada.',
        'Bring the dumbbells together at the top without clashing them and control the descent.',
        'Junte os halteres em cima sem bater e controle a descida.',
    ], { secondary: ['triceps'] }),
    x('aperturas-polea', 'Aperturas en polea', 'Cable crossover', 'Crucifixo na polia', 'pecho', 'polea', 2.5, [
        'Codos ligeramente flexionados y fijos; cierra como si abrazaras un árbol.',
        'Keep a slight, fixed bend in the elbows; close as if hugging a tree.',
        'Cotovelos levemente flexionados e fixos; feche como se abraçasse uma árvore.',
    ]),
    x('fondos', 'Fondos en paralelas', 'Chest dips', 'Paralelas', 'pecho', 'peso corporal', 0, [
        'Inclina el torso hacia delante para cargar más el pecho.',
        'Lean your torso forward to load the chest more.',
        'Incline o tronco para frente para trabalhar mais o peito.',
    ], { secondary: ['triceps'] }),
    x('flexiones', 'Flexiones', 'Push-ups', 'Flexões', 'pecho', 'peso corporal', 0, [
        'Cuerpo en línea recta, pecho casi al suelo en cada repetición.',
        'Body in a straight line, chest nearly touching the floor every rep.',
        'Corpo em linha reta, peito quase no chão a cada repetição.',
    ], { secondary: ['triceps', 'core'] }),
    x('flexiones-declinadas', 'Flexiones declinadas', 'Decline push-ups', 'Flexões declinadas', 'pecho', 'peso corporal', 0, [
        'Pies sobre un banco o una silla; baja el pecho hacia el suelo con el cuerpo recto.',
        'Feet on a bench or chair; lower your chest to the floor keeping your body straight.',
        'Pés num banco ou cadeira; desça o peito ao chão com o corpo reto.',
    ], { secondary: ['hombros', 'triceps'] }),

    // Back
    x('dominadas', 'Dominadas', 'Pull-ups', 'Barra fixa', 'espalda', 'peso corporal', 0, [
        'Empieza colgado con los brazos estirados y lleva el pecho hacia la barra.',
        'Start from a dead hang and pull your chest towards the bar.',
        'Comece pendurado com braços estendidos e leve o peito até a barra.',
    ], { secondary: ['biceps'] }),
    x('jalon-pecho', 'Jalón al pecho', 'Lat pulldown', 'Puxada frontal', 'espalda', 'polea', 5, [
        'Pecho arriba; tira con los codos hacia las caderas, no con las manos.',
        'Chest up; drive your elbows towards your hips, not your hands.',
        'Peito para cima; puxe com os cotovelos em direção ao quadril, não com as mãos.',
    ], { secondary: ['biceps'] }),
    x('remo-barra', 'Remo con barra', 'Barbell row', 'Remada curvada', 'espalda', 'barra', 2.5, [
        'Torso inclinado unos 45°, espalda neutra. Lleva la barra al ombligo.',
        'Torso hinged about 45°, neutral spine. Pull the bar to your belly button.',
        'Tronco inclinado uns 45°, coluna neutra. Leve a barra ao umbigo.',
    ], { secondary: ['biceps'] }),
    x('remo-mancuerna', 'Remo con mancuerna a una mano', 'One-arm dumbbell row', 'Remada unilateral com halter', 'espalda', 'mancuernas', 2, [
        'Apoya rodilla y mano en el banco; tira hacia la cadera.',
        'Knee and hand on the bench; pull towards your hip.',
        'Apoie joelho e mão no banco; puxe em direção ao quadril.',
    ], { secondary: ['biceps'] }),
    x('remo-polea', 'Remo sentado en polea', 'Seated cable row', 'Remada sentada na polia', 'espalda', 'polea', 5, [
        'No balancees el torso; junta las escápulas al final.',
        'Don’t swing your torso; squeeze your shoulder blades at the end.',
        'Não balance o tronco; junte as escápulas no final.',
    ], { secondary: ['biceps'] }),
    x('remo-invertido', 'Remo invertido', 'Inverted row', 'Remada invertida', 'espalda', 'peso corporal', 0, [
        'Bajo una mesa firme o una barra baja; cuerpo recto, pecho a la barra.',
        'Under a sturdy table or low bar; body straight, chest to the bar.',
        'Sob uma mesa firme ou barra baixa; corpo reto, peito até a barra.',
    ], { secondary: ['biceps'] }),
    x('face-pull', 'Face pull', 'Face pull', 'Face pull', 'hombros', 'polea', 2.5, [
        'Cuerda a la altura de la cara, codos altos; separa las manos al final.',
        'Rope at face height, elbows high; pull your hands apart at the end.',
        'Corda na altura do rosto, cotovelos altos; afaste as mãos no final.',
    ], { secondary: ['espalda'] }),

    // Shoulders
    x('press-militar', 'Press militar', 'Overhead press', 'Desenvolvimento militar', 'hombros', 'barra', 2.5, [
        'Glúteos y abdomen apretados; mete la cabeza bajo la barra al subir.',
        'Glutes and abs tight; move your head under the bar as it passes.',
        'Glúteos e abdômen contraídos; passe a cabeça por baixo da barra ao subir.',
    ], { secondary: ['triceps'] }),
    x('press-hombro-mancuernas', 'Press de hombro con mancuernas', 'Seated dumbbell press', 'Desenvolvimento com halteres', 'hombros', 'mancuernas', 2, [
        'Sentado con respaldo; baja hasta la altura de las orejas.',
        'Seated with back support; lower to ear height.',
        'Sentado com encosto; desça até a altura das orelhas.',
    ], { secondary: ['triceps'] }),
    x('elevaciones-laterales', 'Elevaciones laterales', 'Lateral raises', 'Elevação lateral', 'hombros', 'mancuernas', 1, [
        'Sube hasta la altura de los hombros, guiando con los codos.',
        'Raise to shoulder height, leading with your elbows.',
        'Suba até a altura dos ombros, conduzindo com os cotovelos.',
    ]),

    // Arms
    x('curl-barra', 'Curl con barra', 'Barbell curl', 'Rosca direta com barra', 'biceps', 'barra', 2.5, [
        'Codos pegados al cuerpo; no balancees la espalda.',
        'Elbows tucked in; don’t swing your back.',
        'Cotovelos junto ao corpo; não balance as costas.',
    ]),
    x('curl-mancuernas', 'Curl con mancuernas', 'Dumbbell curl', 'Rosca com halteres', 'biceps', 'mancuernas', 1, [
        'Gira la palma hacia arriba mientras subes.',
        'Turn your palm up as you lift.',
        'Gire a palma para cima enquanto sobe.',
    ]),
    x('curl-martillo', 'Curl martillo', 'Hammer curl', 'Rosca martelo', 'biceps', 'mancuernas', 1, [
        'Palmas enfrentadas durante todo el movimiento.',
        'Palms facing each other the whole time.',
        'Palmas voltadas uma para a outra o tempo todo.',
    ]),
    x('extension-triceps-polea', 'Extensión de tríceps en polea', 'Triceps pushdown', 'Tríceps na polia', 'triceps', 'polea', 2.5, [
        'Codos quietos junto al cuerpo; extiende del todo abajo.',
        'Elbows still by your sides; fully extend at the bottom.',
        'Cotovelos parados junto ao corpo; estenda totalmente embaixo.',
    ]),
    x('press-frances', 'Press francés', 'Skull crusher', 'Tríceps testa', 'triceps', 'barra', 2.5, [
        'Baja la barra hacia la frente con los codos apuntando al techo.',
        'Lower the bar towards your forehead with elbows pointing at the ceiling.',
        'Desça a barra em direção à testa com os cotovelos apontando para o teto.',
    ]),
    x('extension-triceps-mancuerna', 'Extensión de tríceps sobre la cabeza', 'Overhead triceps extension', 'Tríceps francês com halter', 'triceps', 'mancuernas', 1, [
        'Una mancuerna con ambas manos; baja por detrás de la cabeza.',
        'One dumbbell in both hands; lower it behind your head.',
        'Um halter com as duas mãos; desça por trás da cabeça.',
    ]),
    x('fondos-banco', 'Fondos en banco', 'Bench dips', 'Tríceps no banco', 'triceps', 'peso corporal', 0, [
        'Manos en el borde de una silla firme; baja hasta 90° de codo.',
        'Hands on the edge of a sturdy chair; lower until your elbows reach 90°.',
        'Mãos na borda de uma cadeira firme; desça até 90° no cotovelo.',
    ]),

    // Legs
    x('sentadilla', 'Sentadilla con barra', 'Barbell squat', 'Agachamento livre', 'cuadriceps', 'barra', 5, [
        'Pies al ancho de hombros, rodillas en la dirección de los pies; baja al menos a paralelo.',
        'Feet shoulder-width, knees tracking your toes; go at least to parallel.',
        'Pés na largura dos ombros, joelhos na direção dos pés; desça pelo menos até paralelo.',
    ], { secondary: ['gluteos', 'core'] }),
    x('sentadilla-goblet', 'Sentadilla goblet', 'Goblet squat', 'Agachamento goblet', 'cuadriceps', 'mancuernas', 2, [
        'Mancuerna pegada al pecho, codos entre las rodillas al bajar.',
        'Dumbbell against your chest, elbows between your knees at the bottom.',
        'Halter junto ao peito, cotovelos entre os joelhos ao descer.',
    ], { secondary: ['gluteos'] }),
    x('sentadilla-libre', 'Sentadilla sin peso', 'Bodyweight squat', 'Agachamento sem peso', 'cuadriceps', 'peso corporal', 0, [
        'Peso en talones y medio pie; pecho alto.',
        'Weight on heels and mid-foot; chest up.',
        'Peso nos calcanhares e meio do pé; peito erguido.',
    ], { secondary: ['gluteos'] }),
    x('prensa', 'Prensa de piernas', 'Leg press', 'Leg press', 'cuadriceps', 'maquina', 10, [
        'No despegues la zona lumbar del respaldo al bajar.',
        'Keep your lower back on the pad as you lower.',
        'Não tire a lombar do encosto ao descer.',
    ], { secondary: ['gluteos'] }),
    x('zancadas', 'Zancadas con mancuernas', 'Dumbbell lunges', 'Avanço com halteres', 'cuadriceps', 'mancuernas', 2, [
        'Paso largo; la rodilla de atrás casi roza el suelo.',
        'Long step; your back knee nearly touches the floor.',
        'Passo longo; o joelho de trás quase encosta no chão.',
    ], { secondary: ['gluteos'] }),
    x('zancadas-libres', 'Zancadas sin peso', 'Walking lunges', 'Avanço sem peso', 'cuadriceps', 'peso corporal', 0, [
        'Torso recto y control en la bajada.',
        'Upright torso and a controlled descent.',
        'Tronco reto e controle na descida.',
    ], { secondary: ['gluteos'] }),
    x('sentadilla-dividida', 'Sentadilla dividida con mancuernas', 'Dumbbell split squat', 'Agachamento afundo com halteres', 'cuadriceps', 'mancuernas', 2, [
        'Un pie delante y otro detrás, sin moverlos; baja en vertical.',
        'One foot forward, one back, without moving them; lower straight down.',
        'Um pé à frente e outro atrás, sem mexê-los; desça na vertical.',
    ], { secondary: ['gluteos'] }),
    x('extension-cuadriceps', 'Extensión de cuádriceps', 'Leg extension', 'Cadeira extensora', 'cuadriceps', 'maquina', 5, [
        'Sube controlando y aguanta un segundo arriba.',
        'Lift under control and hold for a second at the top.',
        'Suba com controle e segure um segundo em cima.',
    ]),
    x('peso-muerto', 'Peso muerto', 'Deadlift', 'Levantamento terra', 'isquios', 'barra', 5, [
        'Barra pegada a las piernas, espalda neutra; empuja el suelo con los pies.',
        'Bar close to your legs, neutral spine; push the floor away with your feet.',
        'Barra junto às pernas, coluna neutra; empurre o chão com os pés.',
    ], { secondary: ['gluteos', 'espalda'] }),
    x('peso-muerto-rumano', 'Peso muerto rumano', 'Romanian deadlift', 'Levantamento terra romeno', 'isquios', 'barra', 5, [
        'Rodillas casi fijas; lleva la cadera atrás hasta notar los isquios.',
        'Knees nearly locked; push your hips back until you feel your hamstrings.',
        'Joelhos quase fixos; leve o quadril para trás até sentir os posteriores.',
    ], { secondary: ['gluteos'] }),
    x('peso-muerto-rumano-mancuernas', 'Peso muerto rumano con mancuernas', 'Dumbbell Romanian deadlift', 'Terra romeno com halteres', 'isquios', 'mancuernas', 2, [
        'Mancuernas pegadas a los muslos; cadera atrás.',
        'Dumbbells close to your thighs; hips back.',
        'Halteres junto às coxas; quadril para trás.',
    ], { secondary: ['gluteos'] }),
    x('curl-femoral', 'Curl femoral', 'Leg curl', 'Mesa flexora', 'isquios', 'maquina', 5, [
        'Cadera pegada al banco; baja despacio.',
        'Hips pressed into the pad; lower slowly.',
        'Quadril colado no banco; desça devagar.',
    ]),
    x('hip-thrust', 'Hip thrust', 'Hip thrust', 'Elevação pélvica', 'gluteos', 'barra', 5, [
        'Espalda alta en el banco; aprieta glúteos arriba con la barbilla metida.',
        'Upper back on the bench; squeeze your glutes at the top, chin tucked.',
        'Parte alta das costas no banco; contraia os glúteos em cima com o queixo recolhido.',
    ], { secondary: ['isquios'] }),
    x('puente-gluteo', 'Puente de glúteo', 'Glute bridge', 'Ponte de glúteo', 'gluteos', 'peso corporal', 0, [
        'Talones cerca del glúteo; sube la cadera y aguanta un segundo.',
        'Heels close to your glutes; raise your hips and hold for a second.',
        'Calcanhares perto do glúteo; suba o quadril e segure um segundo.',
    ], { secondary: ['isquios'] }),
    x('elevacion-gemelos', 'Elevación de gemelos', 'Calf raise', 'Panturrilha em pé', 'gemelos', 'maquina', 5, [
        'Recorrido completo: estira abajo y sube de puntillas.',
        'Full range: stretch at the bottom and rise onto your toes.',
        'Amplitude completa: alongue embaixo e suba na ponta dos pés.',
    ]),
    x('elevacion-gemelos-libre', 'Elevación de gemelos a una pierna', 'Single-leg calf raise', 'Panturrilha unilateral', 'gemelos', 'peso corporal', 0, [
        'En un escalón, apoyado en la pared para equilibrarte.',
        'On a step, with a hand on the wall for balance.',
        'Num degrau, com a mão na parede para se equilibrar.',
    ]),

    // Core
    x('plancha', 'Plancha', 'Plank', 'Prancha', 'core', 'peso corporal', 0, [
        'Glúteos y abdomen apretados; no dejes caer la cadera.',
        'Glutes and abs tight; don’t let your hips sag.',
        'Glúteos e abdômen contraídos; não deixe o quadril cair.',
    ], { timed: true }),
    x('rueda-abdominal', 'Rueda abdominal', 'Ab wheel rollout', 'Roda abdominal', 'core', 'peso corporal', 0, [
        'Avanza solo hasta donde puedas sin arquear la espalda.',
        'Roll out only as far as you can without arching your back.',
        'Avance só até onde conseguir sem arquear as costas.',
    ]),
    x('elevacion-piernas', 'Elevación de piernas colgado', 'Hanging leg raise', 'Elevação de pernas na barra', 'core', 'peso corporal', 0, [
        'Sin balanceo; sube las rodillas hacia el pecho.',
        'No swinging; bring your knees up towards your chest.',
        'Sem balançar; leve os joelhos em direção ao peito.',
    ]),
    x('pallof', 'Press Pallof', 'Pallof press', 'Pallof press', 'core', 'polea', 2.5, [
        'De lado a la polea; empuja al frente sin dejar que te gire.',
        'Side-on to the cable; press out without letting it rotate you.',
        'De lado para a polia; empurre à frente sem deixar girar.',
    ]),
    // Beginner-friendly machines: the path is guided, so technique is easy.
    x('press-pecho-maquina', 'Press de pecho en máquina', 'Machine chest press', 'Supino na máquina', 'pecho', 'maquina', 5, [
        'Ajusta el asiento para que las asas queden a la altura del pecho; empuja sin bloquear los codos.',
        'Set the seat so the handles are at chest height; press without locking your elbows.',
        'Ajuste o banco para as pegadas ficarem na altura do peito; empurre sem travar os cotovelos.',
    ], { secondary: ['triceps', 'hombros'] }),
    x('remo-maquina', 'Remo en máquina', 'Machine row', 'Remada na máquina', 'espalda', 'maquina', 5, [
        'Pecho apoyado; tira llevando los codos atrás y junta las escápulas.',
        'Chest on the pad; pull your elbows back and squeeze your shoulder blades.',
        'Peito apoiado; puxe levando os cotovelos para trás e junte as escápulas.',
    ], { secondary: ['biceps'] }),
    x('press-hombro-maquina', 'Press de hombro en máquina', 'Machine shoulder press', 'Desenvolvimento na máquina', 'hombros', 'maquina', 5, [
        'Espalda pegada al respaldo; sube sin arquear la zona lumbar.',
        'Back against the pad; press up without arching your lower back.',
        'Costas no encosto; suba sem arquear a lombar.',
    ], { secondary: ['triceps'] }),
    x('abductores-maquina', 'Abductores en máquina', 'Hip abduction machine', 'Abdução na máquina', 'gluteos', 'maquina', 5, [
        'Abre las piernas despacio, aguanta un segundo y vuelve sin dejar caer el peso.',
        'Push your knees out slowly, hold for a second and return without letting the weight drop.',
        'Abra as pernas devagar, segure um segundo e volte sem deixar o peso cair.',
    ]),

    // At home, no equipment.
    x('flexiones-inclinadas', 'Flexiones inclinadas', 'Incline push-up', 'Flexão inclinada', 'pecho', 'peso corporal', 0, [
        'Manos en una mesa o sofá firme: cuanto más alto, más fácil. Cuerpo recto de la cabeza a los pies.',
        'Hands on a sturdy table or sofa: the higher, the easier. Body straight from head to heels.',
        'Mãos numa mesa ou sofá firme: quanto mais alto, mais fácil. Corpo reto da cabeça aos pés.',
    ], { secondary: ['triceps', 'hombros'] }),
    x('puente-gluteo-una-pierna', 'Puente de glúteo a una pierna', 'Single-leg glute bridge', 'Elevação pélvica unilateral', 'gluteos', 'peso corporal', 0, [
        'Una pierna estirada; sube la cadera con la otra sin girar la pelvis.',
        'One leg straight; lift your hips with the other without twisting your pelvis.',
        'Uma perna esticada; suba o quadril com a outra sem girar a pelve.',
    ], { secondary: ['isquios'] }),
    x('patada-gluteo', 'Patada de glúteo', 'Glute kickback', 'Coice de glúteo', 'gluteos', 'peso corporal', 0, [
        'A cuatro patas, lleva el talón hacia el techo sin arquear la espalda.',
        'On all fours, drive your heel towards the ceiling without arching your back.',
        'De quatro apoios, leve o calcanhar em direção ao teto sem arquear as costas.',
    ], { secondary: ['isquios'] }),
    x('gusano', 'Gusano (inchworm)', 'Inchworm', 'Minhoca (inchworm)', 'isquios', 'peso corporal', 0, [
        'Desde de pie, camina con las manos hasta la plancha y vuelve. Buen calentamiento.',
        'From standing, walk your hands out to a plank and back. A good warm-up.',
        'Em pé, caminhe com as mãos até a prancha e volte. Bom aquecimento.',
    ], { secondary: ['core', 'hombros'] }),
    x('crunch', 'Abdominal crunch', 'Crunch', 'Abdominal crunch', 'core', 'peso corporal', 0, [
        'Sube solo los hombros del suelo apretando el abdomen; no tires del cuello.',
        'Lift just your shoulders off the floor by squeezing your abs; don’t pull on your neck.',
        'Tire só os ombros do chão contraindo o abdômen; não puxe o pescoço.',
    ]),
    x('dead-bug', 'Dead bug', 'Dead bug', 'Dead bug', 'core', 'peso corporal', 0, [
        'Espalda baja pegada al suelo; estira brazo y pierna contrarios despacio.',
        'Lower back pressed to the floor; slowly extend the opposite arm and leg.',
        'Lombar colada no chão; estique devagar braço e perna opostos.',
    ]),
    x('giro-ruso', 'Giro ruso', 'Russian twist', 'Giro russo', 'core', 'peso corporal', 0, [
        'Sentado e inclinado atrás, gira el tronco a cada lado; cada lado cuenta como una.',
        'Sitting and leaning back, rotate your torso to each side; each side counts as one.',
        'Sentado e inclinado para trás, gire o tronco para cada lado; cada lado conta uma.',
    ]),
    // Timed: the timer counts out loud.
    x('plancha-lateral', 'Plancha lateral', 'Side plank', 'Prancha lateral', 'core', 'peso corporal', 0, [
        'Codo bajo el hombro y cadera alta, en línea recta. Haz los dos lados.',
        'Elbow under your shoulder and hips up, in a straight line. Do both sides.',
        'Cotovelo abaixo do ombro e quadril alto, em linha reta. Faça os dois lados.',
    ], { timed: true }),
    x('escaladores', 'Escaladores', 'Mountain climbers', 'Escalador', 'core', 'peso corporal', 0, [
        'En plancha, lleva las rodillas al pecho alternando, a un ritmo que puedas mantener.',
        'In a plank, drive your knees to your chest in turn, at a pace you can keep up.',
        'Em prancha, leve os joelhos ao peito alternando, num ritmo que você consiga manter.',
    ], { timed: true, secondary: ['cuadriceps', 'hombros'] }),
    x('superman', 'Superman', 'Superman hold', 'Super-homem', 'espalda', 'peso corporal', 0, [
        'Boca abajo, levanta brazos y piernas a la vez y aguanta mirando al suelo.',
        'Face down, lift your arms and legs together and hold, looking at the floor.',
        'De bruços, levante braços e pernas juntos e segure olhando para o chão.',
    ], { timed: true, secondary: ['gluteos'] }),
    x('subida-banco', 'Subida al banco con mancuernas', 'Dumbbell step-up', 'Subida no banco com halteres', 'cuadriceps', 'mancuernas', 2, [
        'Sube empujando con el talón de la pierna de arriba; baja controlando.',
        'Step up by pushing through the heel of your top leg; lower with control.',
        'Suba empurrando com o calcanhar da perna de cima; desça controlando.',
    ], { secondary: ['gluteos'] }),
    x('swing-kettlebell', 'Swing con kettlebell', 'Kettlebell swing', 'Swing com kettlebell', 'gluteos', 'kettlebell', 4, [
        'Es un empuje de cadera, no una sentadilla; brazos relajados.',
        'It’s a hip hinge, not a squat; arms relaxed.',
        'É um impulso de quadril, não um agachamento; braços relaxados.',
    ], { secondary: ['isquios', 'core'] }),
    // More to do at home with no equipment.
    x('flexiones-abiertas', 'Flexiones abiertas', 'Wide push-ups', 'Flexões abertas', 'pecho', 'peso corporal', 0, [
        'Manos más abiertas que los hombros; cuerpo recto de cabeza a talones.',
        'Hands wider than your shoulders; body straight from head to heels.',
        'Mãos mais abertas que os ombros; corpo reto da cabeça aos calcanhares.',
    ], { secondary: ['hombros', 'triceps'] }),
    x('flexiones-diamante', 'Flexiones diamante', 'Diamond push-ups', 'Flexões diamante', 'triceps', 'peso corporal', 0, [
        'Manos juntas bajo el pecho y codos pegados al cuerpo. Si cuesta, apoya las rodillas.',
        'Hands together under your chest, elbows close to your body. If it’s hard, drop to your knees.',
        'Mãos juntas sob o peito e cotovelos colados ao corpo. Se ficar difícil, apoie os joelhos.',
    ], { secondary: ['pecho'] }),
    x('sentadilla-salto', 'Sentadilla con salto', 'Jump squat', 'Agachamento com salto', 'cuadriceps', 'peso corporal', 0, [
        'Baja a sentadilla y salta; cae suave con las rodillas flexionadas.',
        'Squat down and jump; land softly with your knees bent.',
        'Desça no agachamento e salte; aterrisse suave com os joelhos flexionados.',
    ], { secondary: ['gluteos', 'gemelos'] }),
    x('zancada-salto', 'Zancadas con salto', 'Jumping lunges', 'Afundo com salto', 'cuadriceps', 'peso corporal', 0, [
        'Desde zancada, salta y cambia de pierna en el aire. Empieza despacio.',
        'From a lunge, jump and switch legs in the air. Start slowly.',
        'A partir do afundo, salte e troque de perna no ar. Comece devagar.',
    ], { secondary: ['gluteos'] }),
    x('subida-rodilla', 'Subida a silla con rodilla', 'Step-up with knee raise', 'Subida na cadeira com joelho', 'gluteos', 'peso corporal', 0, [
        'Sube a un escalón o silla firme y eleva la otra rodilla arriba. Alterna piernas.',
        'Step onto a sturdy step or chair and drive the other knee up. Alternate legs.',
        'Suba num degrau ou cadeira firme e eleve o outro joelho. Alterne as pernas.',
    ], { secondary: ['cuadriceps'] }),
    x('crunch-inverso', 'Crunch inverso', 'Reverse crunch', 'Abdominal invertido', 'core', 'peso corporal', 0, [
        'Rodillas al pecho despegando un poco la cadera del suelo; baja sin arquear la espalda.',
        'Bring your knees to your chest lifting your hips slightly; lower without arching your back.',
        'Leve os joelhos ao peito tirando um pouco o quadril do chão; desça sem arquear as costas.',
    ]),
    x('bicicleta-abdominal', 'Bicicleta abdominal', 'Bicycle crunch', 'Abdominal bicicleta', 'core', 'peso corporal', 0, [
        'Lleva el codo a la rodilla contraria mientras estiras la otra pierna, sin tirar del cuello.',
        'Bring your elbow to the opposite knee as the other leg extends, without pulling on your neck.',
        'Leve o cotovelo ao joelho oposto enquanto estica a outra perna, sem puxar o pescoço.',
    ]),
    x('patadas-alternas', 'Patadas alternas', 'Flutter kicks', 'Batidas de pernas', 'core', 'peso corporal', 0, [
        'Boca arriba, piernas estiradas y algo elevadas; patea arriba y abajo con la zona lumbar pegada al suelo.',
        'On your back, legs straight and slightly raised; kick up and down keeping your lower back on the floor.',
        'Deitado de costas, pernas esticadas e um pouco elevadas; bata para cima e para baixo com a lombar no chão.',
    ], { timed: true }),

    // Cardio machines at home (timed: the "reps" are seconds).
    x('bicicleta-estatica', 'Bicicleta estática', 'Stationary bike', 'Bicicleta ergométrica', 'cuadriceps', 'maquina', 0, [
        'Ajusta el sillín a la altura de la cadera. Pedalea a un ritmo en el que puedas hablar, con algún tramo más rápido si te sientes bien.',
        'Set the seat at hip height. Pedal at a pace where you can still talk, with a few faster stretches if you feel good.',
        'Ajuste o selim na altura do quadril. Pedale num ritmo em que ainda dê para conversar, com alguns trechos mais rápidos se estiver bem.',
    ], { secondary: ['gluteos', 'gemelos'], timed: true, kind: 'cardio' }),
    x('caminadora', 'Caminadora', 'Treadmill walk', 'Esteira', 'gluteos', 'maquina', 0, [
        'Camina a paso rápido sin agarrarte a las barras. Sube un poco la inclinación para trabajar más glúteos sin correr.',
        'Walk briskly without holding the rails. Add a little incline to work your glutes more without running.',
        'Caminhe em ritmo rápido sem segurar nas barras. Aumente um pouco a inclinação para trabalhar mais os glúteos sem correr.',
    ], { secondary: ['cuadriceps', 'gemelos'], timed: true, kind: 'cardio' }),
    x('eliptica', 'Elíptica', 'Elliptical', 'Elíptico', 'cuadriceps', 'maquina', 0, [
        'Espalda recta y talones apoyados. Empuja y tira de los brazos para mover todo el cuerpo sin impacto en las rodillas.',
        'Back straight and heels down. Push and pull the handles to move your whole body with no impact on your knees.',
        'Costas retas e calcanhares apoiados. Empurre e puxe os braços para mover o corpo todo sem impacto nos joelhos.',
    ], { secondary: ['gluteos', 'hombros'], timed: true, kind: 'cardio' }),

    // Gentle moves for pregnancy and after giving birth (core, pelvic floor, mobility).
    x('respiracion-diafragmatica', 'Respiración 360° con activación del core', '360° breathing with core activation', 'Respiração 360° com ativação do core', 'core', 'peso corporal', 0, [
        'Tumbada boca arriba o sentada: inhala llevando el aire a las costillas y la espalda; al soltar el aire, sube suave el suelo pélvico y lleva el ombligo hacia dentro.',
        'Lying on your back or seated: breathe in, filling your ribs and back; as you breathe out, gently lift your pelvic floor and draw your belly button in.',
        'Deitada de barriga para cima ou sentada: inspire levando o ar às costelas e às costas; ao soltar o ar, suba suavemente o assoalho pélvico e leve o umbigo para dentro.',
    ], { timed: true, kind: 'gentle' }),
    x('suelo-pelvico', 'Ejercicios de suelo pélvico (Kegel)', 'Pelvic floor exercises (Kegels)', 'Exercícios de assoalho pélvico (Kegel)', 'core', 'peso corporal', 0, [
        'Contrae como si cortaras el pis, mantén 3–5 segundos y suelta del todo otros 5. Sin apretar glúteos ni aguantar la respiración.',
        'Squeeze as if stopping the flow of urine, hold 3–5 seconds and fully relax for 5. Don\'t squeeze your glutes or hold your breath.',
        'Contraia como se fosse segurar o xixi, mantenha 3–5 segundos e solte totalmente por mais 5. Sem apertar os glúteos nem prender a respiração.',
    ], { kind: 'gentle' }),
    x('basculacion-pelvica', 'Basculación pélvica', 'Pelvic tilt', 'Báscula pélvica', 'core', 'peso corporal', 0, [
        'Boca arriba con rodillas dobladas: al soltar el aire, pega la zona lumbar al suelo inclinando la pelvis; vuelve despacio. Sube a puente solo si no hay molestias.',
        'On your back, knees bent: as you breathe out, flatten your lower back to the floor by tilting your pelvis; return slowly. Lift into a bridge only if it feels fine.',
        'De barriga para cima com joelhos dobrados: ao soltar o ar, cole a lombar no chão inclinando a pelve; volte devagar. Suba em ponte só se não houver incômodo.',
    ], { secondary: ['gluteos'], kind: 'gentle' }),
    x('deslizamiento-talon', 'Deslizamiento de talón', 'Heel slides', 'Deslizamento de calcanhar', 'core', 'peso corporal', 0, [
        'Boca arriba, activa el core al soltar el aire y desliza un talón por el suelo hasta estirar la pierna; vuelve sin que la tripa se abombe. Ideal para la diástasis.',
        'On your back, brace your core as you breathe out and slide one heel along the floor until the leg is straight; come back without your belly doming. Great for diastasis.',
        'De barriga para cima, ative o core ao soltar o ar e deslize um calcanhar pelo chão até esticar a perna; volte sem a barriga estufar. Ótimo para a diástase.',
    ], { kind: 'gentle' }),
    x('toques-talon', 'Toques de talón', 'Toe taps', 'Toques de calcanhar', 'core', 'peso corporal', 0, [
        'Boca arriba con las piernas en mesa (rodillas a 90°). Baja un pie a tocar el suelo y vuelve, alternando, con la zona lumbar quieta y la tripa plana.',
        'On your back with legs in tabletop (knees at 90°). Lower one foot to tap the floor and return, alternating, keeping your lower back still and belly flat.',
        'De barriga para cima com as pernas em mesa (joelhos a 90°). Desça um pé até tocar o chão e volte, alternando, com a lombar parada e a barriga plana.',
    ], { kind: 'gentle' }),
    x('bird-dog', 'Cuadrupedia (bird dog)', 'Bird dog', 'Perdigueiro (bird dog)', 'core', 'peso corporal', 0, [
        'A cuatro patas, estira un brazo y la pierna contraria hasta la línea del cuerpo, sin girar la cadera. Vuelve despacio y cambia.',
        'On all fours, reach one arm and the opposite leg out in line with your body without turning your hips. Come back slowly and switch.',
        'De quatro apoios, estique um braço e a perna oposta na linha do corpo, sem girar o quadril. Volte devagar e troque.',
    ], { secondary: ['gluteos', 'espalda'], kind: 'gentle' }),
    x('gato-camello', 'Gato–camello', 'Cat–cow', 'Gato–camelo', 'espalda', 'peso corporal', 0, [
        'A cuatro patas, redondea la espalda al soltar el aire y luego arquéala suave al inhalar. Movimiento lento que alivia la zona lumbar.',
        'On all fours, round your back as you breathe out, then gently arch it as you breathe in. A slow move that eases the lower back.',
        'De quatro apoios, arredonde as costas ao soltar o ar e arqueie suavemente ao inspirar. Movimento lento que alivia a lombar.',
    ], { secondary: ['core'], timed: true, kind: 'gentle' }),
    x('postura-nino', 'Postura del niño', 'Child\'s pose', 'Postura da criança', 'espalda', 'peso corporal', 0, [
        'Rodillas separadas (deja sitio a la tripa si estás embarazada), glúteos hacia los talones y brazos estirados. Respira hondo hacia la espalda.',
        'Knees apart (make room for your belly if pregnant), hips back toward your heels and arms reaching forward. Breathe deep into your back.',
        'Joelhos afastados (deixe espaço para a barriga se estiver grávida), glúteos em direção aos calcanhares e braços esticados. Respire fundo nas costas.',
    ], { timed: true, kind: 'gentle' }),
    x('circulos-cadera', 'Movilidad de cadera de pie', 'Standing hip circles', 'Mobilidade de quadril em pé', 'gluteos', 'peso corporal', 0, [
        'De pie, apoyada en una pared si lo necesitas, sube una rodilla y dibuja círculos amplios con la cadera hacia fuera. Cambia de lado.',
        'Standing, holding a wall if you need to, lift one knee and draw wide circles out to the side with your hip. Switch sides.',
        'Em pé, apoiada na parede se precisar, suba um joelho e desenhe círculos amplos para fora com o quadril. Troque de lado.',
    ], { timed: true, kind: 'gentle' }),
    x('estiramiento-psoas', 'Estiramiento de flexor de cadera', 'Kneeling hip flexor stretch', 'Alongamento do flexor do quadril', 'cuadriceps', 'peso corporal', 0, [
        'Una rodilla en el suelo y el otro pie delante. Aprieta el glúteo de atrás y lleva la cadera un poco hacia delante, sin arquear la espalda.',
        'One knee down, the other foot in front. Squeeze the back glute and shift your hips slightly forward without arching your back.',
        'Um joelho no chão e o outro pé à frente. Contraia o glúteo de trás e leve o quadril um pouco para a frente, sem arquear as costas.',
    ], { secondary: ['gluteos'], timed: true, kind: 'gentle' }),
    // Animated with Gym Visual demos (src/assets/motion).
    x("press-inclinado-maquina", "Press inclinado en máquina", "Machine incline chest press", "Supino inclinado na máquina", "pecho", "maquina", 5, [
        "Espalda pegada al respaldo; empuja hacia arriba y adelante sin bloquear los codos.",
        "Back flat on the pad; press up and forward without locking your elbows.",
        "Costas apoiadas no encosto; empurre para cima e à frente sem travar os cotovelos.",
    ], { secondary: ["hombros", "triceps"] }),
    x("press-declinado-smith", "Press declinado en máquina Smith", "Smith machine decline press", "Supino declinado no Smith", "pecho", "maquina", 5, [
        "Baja la barra a la parte baja del pecho controlando la bajada y empuja sin rebotar.",
        "Lower the bar to your lower chest under control and press without bouncing.",
        "Desça a barra até a parte baixa do peito com controle e empurre sem quicar.",
    ], { secondary: ["triceps"] }),
    x("aperturas-kettlebell", "Aperturas inclinadas con kettlebell", "Kettlebell incline fly", "Crucifixo inclinado com kettlebell", "pecho", "kettlebell", 4, [
        "Codos un poco flexionados y fijos; abre hasta notar el estiramiento en el pecho y cierra apretando.",
        "Elbows slightly bent and fixed; open until you feel a chest stretch, then squeeze back up.",
        "Cotovelos levemente flexionados e fixos; abra até sentir alongar o peito e feche apertando.",
    ]),
    x("pullover-mancuerna", "Pullover con mancuerna", "Dumbbell pullover", "Pullover com halter", "pecho", "mancuernas", 2, [
        "Brazos casi rectos; baja la mancuerna por detrás de la cabeza sin arquear la espalda y vuelve sobre el pecho.",
        "Arms almost straight; lower the dumbbell behind your head without arching your back, then bring it back over your chest.",
        "Braços quase retos; desça o halter atrás da cabeça sem arquear as costas e volte sobre o peito.",
    ], { secondary: ["espalda"] }),
    x("press-una-mano-suelo", "Press a una mano en el suelo", "Single-arm dumbbell floor press", "Supino unilateral no chão", "pecho", "mancuernas", 2, [
        "Tumbado con las rodillas flexionadas; empuja la mancuerna hacia arriba con un brazo y baja hasta que el codo toque el suelo.",
        "Lying with bent knees; press the dumbbell up with one arm and lower until your elbow touches the floor.",
        "Deitado com os joelhos flexionados; empurre o halter com um braço e desça até o cotovelo tocar o chão.",
    ], { secondary: ["triceps"] }),
    x("flexiones-pliometricas", "Flexiones pliométricas", "Plyometric push-ups", "Flexões pliométricas", "pecho", "peso corporal", 0, [
        "Empuja explosivo para que las manos despeguen del suelo y aterriza suave con los codos flexionados.",
        "Push explosively so your hands leave the floor, and land softly with bent elbows.",
        "Empurre explosivo para as mãos saírem do chão e aterrisse suave com os cotovelos flexionados.",
    ], { secondary: ["triceps", "hombros"] }),
    x("flexiones-balon", "Flexiones con balón medicinal", "Medicine ball push-ups", "Flexões com bola medicinal", "pecho", "peso corporal", 0, [
        "Una mano sobre el balón y el cuerpo recto; cambia de lado en cada serie.",
        "One hand on the ball, body straight; switch sides each set.",
        "Uma mão na bola e o corpo reto; troque de lado a cada série.",
    ], { secondary: ["triceps", "core"] }),
    x("press-landmine", "Press landmine de rodillas", "Kneeling landmine press", "Supino landmine ajoelhado", "pecho", "barra", 2.5, [
        "Sujeta el extremo de la barra con las manos juntas y empuja hacia arriba y adelante apretando el pecho.",
        "Hold the end of the bar with your hands together and press up and forward, squeezing your chest.",
        "Segure a ponta da barra com as mãos juntas e empurre para cima e à frente apertando o peito.",
    ], { secondary: ["hombros", "triceps"] }),
    x("press-inclinado-polea", "Press inclinado en polea", "Cable incline press", "Supino inclinado na polia", "pecho", "polea", 2.5, [
        "En un banco inclinado entre las poleas, empuja y junta las manos arriba sin chocarlas.",
        "On an incline bench between the cables, press and bring your hands together at the top.",
        "Num banco inclinado entre as polias, empurre e junte as mãos em cima sem bater.",
    ], { secondary: ["hombros", "triceps"] }),
    x("remo-t-tumbado", "Remo en T con pecho apoyado", "Chest-supported T-bar row", "Remada cavalinho com apoio", "espalda", "maquina", 5, [
        "Pecho apoyado en el soporte; lleva los codos hacia atrás y junta las escápulas arriba.",
        "Chest on the pad; drive your elbows back and squeeze your shoulder blades at the top.",
        "Peito apoiado; leve os cotovelos para trás e junte as escápulas em cima.",
    ], { secondary: ["biceps"] }),
    x("remo-inclinado-maquina", "Remo inclinado en máquina", "Machine incline row", "Remada inclinada na máquina", "espalda", "maquina", 5, [
        "Pecho contra el respaldo; tira con agarre neutro hasta llevar las manos a las costillas.",
        "Chest against the pad; pull with a neutral grip until your hands reach your ribs.",
        "Peito no encosto; puxe com pegada neutra até as mãos chegarem às costelas.",
    ], { secondary: ["biceps"] }),
    x("remo-una-mano-maquina", "Remo a una mano en máquina", "Single-arm machine row", "Remada unilateral na máquina", "espalda", "maquina", 5, [
        "Inclinado y con la espalda recta, tira con un brazo llevando el codo hacia la cadera.",
        "Bent over with a flat back, pull with one arm, driving your elbow toward your hip.",
        "Inclinado e com as costas retas, puxe com um braço levando o cotovelo em direção ao quadril.",
    ], { secondary: ["biceps"] }),
    x("jalon-estrecho", "Jalón con agarre estrecho", "Close-grip lat pulldown", "Puxada com pegada fechada", "espalda", "polea", 2.5, [
        "Agarre estrecho con las palmas hacia ti; baja la barra al pecho llevando los codos hacia abajo.",
        "Narrow underhand grip; pull the bar to your chest, driving your elbows down.",
        "Pegada fechada com as palmas para você; puxe a barra ao peito levando os cotovelos para baixo.",
    ], { secondary: ["biceps"] }),
    x("jalon-una-mano", "Jalón a una mano en máquina", "Single-arm machine pulldown", "Puxada unilateral na máquina", "espalda", "maquina", 5, [
        "Tira con un brazo cada vez, llevando el codo hacia la cadera sin girar el tronco.",
        "Pull with one arm at a time, driving your elbow toward your hip without twisting.",
        "Puxe com um braço por vez, levando o cotovelo em direção ao quadril sem girar o tronco.",
    ], { secondary: ["biceps"] }),
    x("pullover-barra", "Pullover con barra", "Barbell pullover", "Pullover com barra", "espalda", "barra", 2.5, [
        "Tumbado en el banco con los codos flexionados; lleva la barra por detrás de la cabeza y vuelve sobre el pecho.",
        "Lying on the bench with bent elbows; take the bar behind your head and back over your chest.",
        "Deitado no banco com os cotovelos flexionados; leve a barra atrás da cabeça e volte sobre o peito.",
    ], { secondary: ["pecho"] }),
    x("encogimientos", "Encogimientos de hombros", "Shoulder shrugs", "Encolhimento de ombros", "espalda", "maquina", 5, [
        "Brazos rectos; sube los hombros hacia las orejas, aguanta un segundo y baja despacio.",
        "Arms straight; lift your shoulders toward your ears, hold a second and lower slowly.",
        "Braços retos; suba os ombros em direção às orelhas, segure um segundo e desça devagar.",
    ], { secondary: ["hombros"] }),
    x("elevacion-frontal-polea", "Elevación frontal en polea", "Cable front raise", "Elevação frontal na polia", "hombros", "polea", 2.5, [
        "Brazos casi rectos; sube hasta la altura de los hombros sin balancear el cuerpo.",
        "Arms almost straight; raise to shoulder height without swinging.",
        "Braços quase retos; suba até a altura dos ombros sem balançar o corpo.",
    ]),
    x("elevacion-frontal", "Elevación frontal con mancuerna", "Dumbbell front raise", "Elevação frontal com halter", "hombros", "mancuernas", 1, [
        "Un brazo cada vez, casi recto; sube hasta la altura del hombro y baja despacio.",
        "One arm at a time, almost straight; raise to shoulder height and lower slowly.",
        "Um braço por vez, quase reto; suba até a altura do ombro e desça devagar.",
    ]),
    x("remo-menton", "Remo al mentón", "Upright row", "Remada alta", "hombros", "barra", 2.5, [
        "Agarre a la anchura de los hombros; sube la barra pegada al cuerpo hasta el pecho, con los codos por encima de las manos.",
        "Shoulder-width grip; pull the bar up close to your body to chest height, elbows above your hands.",
        "Pegada na largura dos ombros; suba a barra rente ao corpo até o peito, com os cotovelos acima das mãos.",
    ], { secondary: ["espalda"] }),
    x("elevacion-y", "Elevación en Y inclinado", "Bent-over Y raise", "Elevação em Y inclinado", "hombros", "mancuernas", 1, [
        "Inclinado hacia delante con la espalda recta; sube los brazos formando una Y con los pulgares hacia arriba.",
        "Bent forward with a flat back; raise your arms into a Y, thumbs up.",
        "Inclinado à frente com as costas retas; suba os braços formando um Y, polegares para cima.",
    ], { secondary: ["espalda"] }),
    x("pajaros", "Pájaros con mancuernas", "Dumbbell rear delt raise", "Crucifixo inverso com halteres", "hombros", "mancuernas", 1, [
        "Inclinado con la espalda recta; abre los brazos hacia los lados apretando la parte de atrás del hombro.",
        "Bent over with a flat back; open your arms to the sides, squeezing the back of your shoulders.",
        "Inclinado com as costas retas; abra os braços para os lados apertando a parte de trás dos ombros.",
    ], { secondary: ["espalda"] }),
    x("curl-maquina", "Curl de bíceps en máquina", "Machine biceps curl", "Rosca na máquina", "biceps", "maquina", 2.5, [
        "Brazos apoyados en el cojín; sube alternando y baja controlando, sin soltar de golpe.",
        "Arms on the pad; curl alternating and lower under control.",
        "Braços apoiados no apoio; suba alternando e desça com controle.",
    ]),
    x("curl-isometrico", "Curl con pausa isométrica", "Dumbbell curl with isometric hold", "Rosca com pausa isométrica", "biceps", "mancuernas", 1, [
        "Mantén un brazo arriba a 90° mientras el otro hace la repetición completa; luego cambia.",
        "Hold one arm at 90° while the other does full reps, then switch.",
        "Mantenha um braço a 90° enquanto o outro faz a repetição completa; depois troque.",
    ]),
    x("curl-muneca", "Curl de muñeca con barra", "Barbell wrist curl", "Rosca de punho com barra", "biceps", "barra", 1, [
        "Antebrazos apoyados en el banco; mueve solo las muñecas, despacio y en todo el recorrido.",
        "Forearms on the bench; move only your wrists, slowly and through the full range.",
        "Antebraços apoiados no banco; mova só os punhos, devagar e em toda a amplitude.",
    ]),
    x("patada-triceps", "Patada de tríceps en polea", "Cable triceps kickback", "Tríceps coice na polia", "triceps", "polea", 2.5, [
        "Inclinado, con el codo pegado al cuerpo; estira el brazo hacia atrás y aprieta el tríceps.",
        "Bent over, elbow tucked; straighten your arm back and squeeze your triceps.",
        "Inclinado, cotovelo junto ao corpo; estenda o braço para trás e aperte o tríceps.",
    ]),
    x("extension-triceps-una-mano", "Extensión de tríceps a una mano en polea", "Single-arm cable pushdown", "Tríceps unilateral na polia", "triceps", "polea", 2.5, [
        "Codo fijo al costado; empuja la cuerda hacia abajo hasta estirar el brazo del todo.",
        "Elbow fixed at your side; push the rope down until your arm is fully straight.",
        "Cotovelo fixo ao lado; empurre a corda para baixo até estender todo o braço.",
    ]),
    x("extension-triceps-alta", "Extensión de tríceps en polea alta", "High-cable overhead triceps extension", "Tríceps na polia alta", "triceps", "polea", 2.5, [
        "De espaldas a la polea, con los codos junto a la cabeza; estira los brazos hacia delante.",
        "Back to the cable, elbows by your head; straighten your arms forward.",
        "De costas para a polia, cotovelos junto à cabeça; estenda os braços à frente.",
    ]),
    x("sentadilla-sumo", "Sentadilla sumo con barra", "Barbell sumo squat", "Agachamento sumô com barra", "gluteos", "barra", 2.5, [
        "Pies muy abiertos y puntas hacia fuera; baja con el pecho alto y las rodillas siguiendo las puntas.",
        "Wide stance, toes out; sit down with your chest up and knees tracking your toes.",
        "Pés bem afastados e pontas para fora; desça com o peito alto e os joelhos seguindo as pontas.",
    ], { secondary: ["cuadriceps"] }),
    x("prensa-una-pierna", "Prensa a una pierna", "Single-leg press", "Leg press unilateral", "cuadriceps", "maquina", 5, [
        "Una pierna cada vez; baja hasta 90° sin despegar la espalda y empuja con el talón.",
        "One leg at a time; lower to 90° keeping your back down and push through your heel.",
        "Uma perna por vez; desça até 90° sem tirar as costas e empurre com o calcanhar.",
    ], { secondary: ["gluteos"] }),
    x("sentadilla-explosiva", "Sentadilla explosiva", "Explosive squat", "Agachamento explosivo", "cuadriceps", "peso corporal", 0, [
        "Baja rápido a media sentadilla y sube explosivo estirando los brazos hacia arriba.",
        "Drop quickly into a half squat and drive up explosively, reaching your arms overhead.",
        "Desça rápido a meio agachamento e suba explosivo estendendo os braços para cima.",
    ], { secondary: ["gluteos"] }),
    x("salto-cajon", "Salto al cajón", "Box jump", "Salto na caixa", "cuadriceps", "peso corporal", 0, [
        "Impúlsate con los brazos, aterriza suave sobre el cajón con las rodillas flexionadas y baja andando.",
        "Swing your arms, land softly on the box with bent knees and step back down.",
        "Impulsione com os braços, aterrisse suave na caixa com os joelhos flexionados e desça andando.",
    ], { secondary: ["gluteos", "gemelos"] }),
    x("goblet-gemelos", "Sentadilla goblet con elevación de talones", "Goblet squat with calf raise", "Agachamento goblet com panturrilha", "cuadriceps", "mancuernas", 2, [
        "Haz la sentadilla y, al subir, ponte de puntillas un segundo.",
        "Squat, and at the top rise onto your toes for a second.",
        "Agache e, ao subir, fique na ponta dos pés por um segundo.",
    ], { secondary: ["gemelos", "gluteos"] }),
    x("peso-muerto-escalonado", "Peso muerto rumano escalonado", "Staggered-stance Romanian deadlift", "Stiff com base escalonada", "isquios", "barra", 2.5, [
        "Un pie un poco adelantado; baja la barra pegada a las piernas con la espalda recta y sube apretando glúteos.",
        "One foot slightly ahead; lower the bar close to your legs with a flat back and squeeze your glutes to stand.",
        "Um pé levemente à frente; desça a barra rente às pernas com as costas retas e suba apertando os glúteos.",
    ], { secondary: ["gluteos"] }),
    x("curl-femoral-hiperextension", "Curl femoral con hiperextensión", "Leg curl to reverse hyperextension", "Flexora com hiperextensão", "isquios", "maquina", 5, [
        "Lleva los talones hacia los glúteos y al final eleva las piernas apretando glúteos.",
        "Curl your heels in, then lift your legs by squeezing your glutes.",
        "Leve os calcanhares aos glúteos e no final eleve as pernas apertando os glúteos.",
    ], { secondary: ["gluteos"] }),
    x("hip-thrust-maquina", "Hip thrust en máquina", "Machine hip thrust", "Elevação pélvica na máquina", "gluteos", "maquina", 5, [
        "Espalda alta en el respaldo; sube la cadera hasta alinear tronco y muslos y aprieta glúteos arriba.",
        "Upper back on the pad; drive your hips up until torso and thighs line up, squeezing at the top.",
        "Parte alta das costas no encosto; suba o quadril até alinhar tronco e coxas e aperte os glúteos.",
    ], { secondary: ["isquios"] }),
    x("hiperextension-inversa", "Hiperextensión inversa con mancuerna", "Dumbbell reverse hyperextension", "Hiperextensão reversa com halter", "gluteos", "mancuernas", 2, [
        "Boca abajo en el banco con la mancuerna entre los pies; sube las piernas apretando los glúteos.",
        "Face down on the bench with a dumbbell between your feet; lift your legs by squeezing your glutes.",
        "De bruços no banco com o halter entre os pés; suba as pernas apertando os glúteos.",
    ], { secondary: ["isquios"] }),
    x("patada-gluteo-banco", "Patada de glúteo en banco", "Bench glute kickback", "Coice de glúteo no banco", "gluteos", "peso corporal", 0, [
        "Una rodilla y las manos en el banco; lleva la otra pierna hacia atrás y arriba sin arquear la espalda.",
        "One knee and both hands on the bench; drive the other leg back and up without arching your back.",
        "Um joelho e as mãos no banco; leve a outra perna para trás e para cima sem arquear as costas.",
    ], { secondary: ["isquios"] }),
    x("toque-equilibrio", "Toques de equilibrio a tres puntos", "3-point balance toe tap", "Toque de equilíbrio em três pontos", "gluteos", "peso corporal", 0, [
        "Sobre una pierna, toca con la otra delante, al lado y atrás sin perder el equilibrio.",
        "Standing on one leg, tap the other foot in front, to the side and behind without losing balance.",
        "Apoiado numa perna, toque com a outra à frente, ao lado e atrás sem perder o equilíbrio.",
    ], { secondary: ["core"] }),
    x("arrancada", "Arrancada de potencia", "Barbell power snatch", "Arranco de potência", "isquios", "barra", 2.5, [
        "Desde el suelo, extiende la cadera de forma explosiva y recibe la barra arriba con los brazos rectos. Aprende la técnica con poco peso.",
        "From the floor, extend your hips explosively and catch the bar overhead with straight arms. Learn it with light weight.",
        "Do chão, estenda o quadril de forma explosiva e receba a barra acima da cabeça com os braços retos. Aprenda com pouco peso.",
    ], { secondary: ["gluteos", "hombros", "espalda"] }),
    x("bicicleta-aerea", "Bicicleta en el aire", "Air cycling", "Bicicleta no ar", "core", "peso corporal", 0, [
        "Boca arriba con la lumbar pegada al suelo; pedalea en el aire con las piernas, sin prisa.",
        "On your back with your lower back flat; pedal your legs in the air, smoothly.",
        "De barriga para cima com a lombar no chão; pedale as pernas no ar, sem pressa.",
    ], { timed: true }),
    x("l-sit", "L-sit colgado", "Hanging L-sit", "L-sit na barra", "core", "peso corporal", 0, [
        "Colgado de la barra, sube las piernas rectas hasta formar una L y aguanta.",
        "Hang from the bar, lift your straight legs into an L and hold.",
        "Pendurado na barra, suba as pernas retas formando um L e segure.",
    ], { timed: true }),
    x("crunch-polea", "Crunch en polea de rodillas", "Kneeling cable crunch", "Abdominal na polia ajoelhado", "core", "polea", 2.5, [
        "De rodillas con la cuerda junto a la cabeza; enrolla el tronco hacia abajo con el abdomen, no con los brazos.",
        "Kneeling with the rope by your head; curl down with your abs, not your arms.",
        "Ajoelhado com a corda junto à cabeça; enrole o tronco com o abdômen, não com os braços.",
    ]),
    x("elevacion-piernas-suelo", "Elevación de piernas tumbado", "Lying leg raise", "Elevação de pernas deitado", "core", "peso corporal", 0, [
        "Lumbar pegada al suelo; sube las piernas rectas, aguanta un momento y baja despacio.",
        "Lower back flat; raise straight legs, hold a moment and lower slowly.",
        "Lombar no chão; suba as pernas retas, segure um instante e desça devagar.",
    ]),
    x("inclinacion-lateral", "Inclinación lateral sentado", "Seated side bend", "Inclinação lateral sentado", "core", "peso corporal", 0, [
        "Sentado erguido en una silla, inclínate a un lado y al otro sin girar el tronco.",
        "Sit tall on a chair and lean side to side without twisting.",
        "Sentado ereto numa cadeira, incline para um lado e para o outro sem girar o tronco.",
    ]),
    x("rotacion-toracica", "Rotación torácica", "Thoracic rotation", "Rotação torácica", "espalda", "peso corporal", 0, [
        "Piernas abiertas e inclinado hacia delante; gira el tronco llevando una mano al techo y alterna.",
        "Wide stance, bent forward; rotate, reaching one hand to the ceiling, then switch.",
        "Pernas afastadas e inclinado à frente; gire o tronco levando uma mão ao teto e alterne.",
    ], { secondary: ["core"], kind: "gentle" }),
    x("extension-toracica", "Extensión torácica con rodillo", "Foam roller thoracic extension", "Extensão torácica no rolo", "espalda", "peso corporal", 0, [
        "Rodillo bajo la espalda alta y manos tras la cabeza; extiéndete hacia atrás despacio y respira.",
        "Roller under your upper back, hands behind your head; extend back slowly and breathe.",
        "Rolo sob a parte alta das costas e mãos atrás da cabeça; estenda para trás devagar e respire.",
    ], { timed: true, kind: "gentle" }),
    x("estiramiento-flexor-pie", "Estiramiento de flexor de cadera de pie", "Standing hip flexor stretch", "Alongamento do flexor do quadril em pé", "cuadriceps", "peso corporal", 0, [
        "Apoyado en una silla, lleva una pierna atrás y empuja la cadera hacia delante sin arquear la espalda.",
        "Holding a chair, step one leg back and push your hips forward without arching your back.",
        "Apoiado numa cadeira, leve uma perna para trás e empurre o quadril à frente sem arquear as costas.",
    ], { secondary: ["gluteos"], timed: true, kind: "gentle" }),
    x("estiramiento-pretzel", "Estiramiento pretzel", "Lying pretzel stretch", "Alongamento pretzel", "gluteos", "peso corporal", 0, [
        "Tumbado de lado, sujeta el pie de arriba y gira el tronco hacia el otro lado respirando profundo.",
        "Lying on your side, hold your top foot and rotate your torso the other way, breathing deeply.",
        "Deitado de lado, segure o pé de cima e gire o tronco para o outro lado respirando fundo.",
    ], { secondary: ["cuadriceps"], timed: true, kind: "gentle" }),
    x("rodillas-altas-lateral", "Desplazamiento lateral con rodillas altas", "Side shuffle high knees", "Deslocamento lateral com joelhos altos", "cuadriceps", "peso corporal", 0, [
        "Desplázate de lado subiendo las rodillas rápido y con los brazos activos.",
        "Shuffle sideways driving your knees up fast, arms pumping.",
        "Desloque-se de lado subindo os joelhos rápido, com os braços ativos.",
    ], { secondary: ["gemelos"], timed: true }),
];

const BY_ID = new Map(EXERCISES.map(e => [e.id, e]));

export const getExercise = (id: string): Exercise | undefined => BY_ID.get(id);
export const exerciseName = (id: string) => {
    const ex = getExercise(id);
    return ex ? l10n(ex.name) : id;
};
export const exerciseTip = (ex: Exercise) => l10n(ex.tip);

// Two photos per exercise (start and end position), bundled in public/exercises.
// A few gentle moves have no photo; their tip says how to do them.
const NO_PHOTO = new Set(['respiracion-diafragmatica', 'suelo-pelvico', 'deslizamiento-talon', 'toques-talon', 'bird-dog']);
export const exercisePhotos = (id: string): [string, string] | null =>
    BY_ID.has(id) && !NO_PHOTO.has(id) ? [`./exercises/${id}-0.webp`, `./exercises/${id}-1.webp`] : null;

// Same muscle first, then anything that shares a secondary muscle.
export const alternativesFor = (id: string): Exercise[] => {
    const ex = getExercise(id);
    if (!ex) return [];
    return EXERCISES.filter(e => e.id !== id && e.kind !== 'cardio' && (e.muscle === ex.muscle || e.secondary?.includes(ex.muscle)))
        .sort((a, b) => Number(b.muscle === ex.muscle) - Number(a.muscle === ex.muscle));
};

// "Machine taken": the same main muscle with dumbbells or cables first, then
// kettlebell or bodyweight. Closest match (most shared helper muscles) first.
const FREE_WEIGHTS: Equipment[] = ['mancuernas', 'polea', 'kettlebell', 'peso corporal'];
export const busyAlternatives = (id: string, exclude: string[] = [], limit = 4): Exercise[] => {
    const ex = getExercise(id);
    if (!ex) return [];
    const shared = (e: Exercise) => (e.secondary ?? []).filter(m => ex.secondary?.includes(m)).length;
    const rank = (e: Exercise) => FREE_WEIGHTS.indexOf(e.equipment) * 10 - shared(e);
    return EXERCISES
        .filter(e => e.id !== id && !e.kind && !exclude.includes(e.id) && e.muscle === ex.muscle && e.equipment !== ex.equipment
            && FREE_WEIGHTS.includes(e.equipment) && !!e.timed === !!ex.timed)
        .sort((a, b) => rank(a) - rank(b))
        .slice(0, limit);
};
