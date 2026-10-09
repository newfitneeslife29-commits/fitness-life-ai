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
    tip: [string, string, string], extra: { secondary?: Muscle[]; timed?: boolean } = {},
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
];

const BY_ID = new Map(EXERCISES.map(e => [e.id, e]));

export const getExercise = (id: string): Exercise | undefined => BY_ID.get(id);
export const exerciseName = (id: string) => {
    const ex = getExercise(id);
    return ex ? l10n(ex.name) : id;
};
export const exerciseTip = (ex: Exercise) => l10n(ex.tip);

// Two photos per exercise (start and end position), bundled in public/exercises.
export const exercisePhotos = (id: string): [string, string] | null =>
    BY_ID.has(id) ? [`./exercises/${id}-0.webp`, `./exercises/${id}-1.webp`] : null;

// Same muscle first, then anything that shares a secondary muscle.
export const alternativesFor = (id: string): Exercise[] => {
    const ex = getExercise(id);
    if (!ex) return [];
    return EXERCISES.filter(e => e.id !== id && (e.muscle === ex.muscle || e.secondary?.includes(ex.muscle)))
        .sort((a, b) => Number(b.muscle === ex.muscle) - Number(a.muscle === ex.muscle));
};
