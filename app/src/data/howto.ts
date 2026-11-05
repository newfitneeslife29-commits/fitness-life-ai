// How each exercise is done, in two short steps: how to get in position and
// the movement itself. The exercise's tip (exercises.ts) is shown after them
// as the key point. Steps in es, en and pt; other languages use English.

type Steps = { es: [string, string]; en: [string, string]; pt: [string, string] };
const s = (es: [string, string], en: [string, string], pt: [string, string]): Steps => ({ es, en, pt });

export const HOW_TO: Record<string, Steps> = {
    'press-banca': s(
        ['Acuéstate en el banco con los ojos bajo la barra y los pies firmes en el suelo. Agarra la barra un poco más abierto que los hombros.', 'Baja la barra despacio hasta rozar el pecho y empújala hacia arriba hasta estirar los brazos.'],
        ['Lie on the bench with your eyes under the bar and feet flat on the floor. Grip the bar a bit wider than your shoulders.', 'Lower the bar slowly to touch your chest, then press it up until your arms are straight.'],
        ['Deite no banco com os olhos sob a barra e os pés firmes no chão. Segure a barra um pouco mais aberto que os ombros.', 'Desça a barra devagar até encostar no peito e empurre para cima até esticar os braços.'],
    ),
    'press-inclinado-mancuernas': s(
        ['Siéntate en un banco inclinado con una mancuerna en cada mano a la altura del pecho.', 'Empuja las mancuernas hacia arriba hasta estirar los brazos y bájalas despacio al pecho.'],
        ['Sit on an incline bench with a dumbbell in each hand at chest height.', 'Press the dumbbells up until your arms are straight, then lower them slowly to your chest.'],
        ['Sente-se em um banco inclinado com um halter em cada mão na altura do peito.', 'Empurre os halteres para cima até esticar os braços e desça devagar até o peito.'],
    ),
    'press-banca-mancuernas': s(
        ['Acuéstate en el banco plano con una mancuerna en cada mano a los lados del pecho.', 'Empuja las mancuernas hacia arriba hasta casi juntarlas y bájalas despacio a los lados del pecho.'],
        ['Lie on a flat bench with a dumbbell in each hand at the sides of your chest.', 'Press the dumbbells up until they almost touch, then lower them slowly to the sides of your chest.'],
        ['Deite no banco reto com um halter em cada mão ao lado do peito.', 'Empurre os halteres para cima até quase se tocarem e desça devagar ao lado do peito.'],
    ),
    'aperturas-polea': s(
        ['Ponte en medio de dos poleas altas con un agarre en cada mano y un pie un paso adelante.', 'Con los codos un poco doblados, junta las manos delante del pecho en un arco y vuelve despacio.'],
        ['Stand between two high pulleys with a handle in each hand and one foot a step forward.', 'With elbows slightly bent, bring your hands together in front of your chest in an arc, then go back slowly.'],
        ['Fique entre duas polias altas com uma alça em cada mão e um pé um passo à frente.', 'Com os cotovelos levemente dobrados, junte as mãos à frente do peito em arco e volte devagar.'],
    ),
    'fondos': s(
        ['Apóyate en las barras paralelas con los brazos estirados y el cuerpo un poco inclinado hacia adelante.', 'Baja doblando los codos hasta que los hombros queden a la altura de los codos y sube empujando.'],
        ['Hold yourself on the parallel bars with straight arms and your body leaning slightly forward.', 'Bend your elbows to lower until your shoulders are level with your elbows, then push back up.'],
        ['Apoie-se nas barras paralelas com os braços esticados e o corpo um pouco inclinado para frente.', 'Desça dobrando os cotovelos até os ombros ficarem na altura dos cotovelos e suba empurrando.'],
    ),
    'flexiones': s(
        ['Apoya las manos en el suelo un poco más abiertas que los hombros, con el cuerpo recto de la cabeza a los pies.', 'Baja el pecho hasta casi tocar el suelo y empuja hasta estirar los brazos.'],
        ['Put your hands on the floor a bit wider than your shoulders, body straight from head to heels.', 'Lower your chest until it almost touches the floor, then push up until your arms are straight.'],
        ['Apoie as mãos no chão um pouco mais abertas que os ombros, com o corpo reto da cabeça aos pés.', 'Desça o peito até quase tocar o chão e empurre até esticar os braços.'],
    ),
    'flexiones-declinadas': s(
        ['Pon los pies sobre un banco o escalón y las manos en el suelo, con el cuerpo recto.', 'Baja el pecho hacia el suelo doblando los codos y empuja hasta estirar los brazos.'],
        ['Put your feet on a bench or step and your hands on the floor, body straight.', 'Bend your elbows to lower your chest toward the floor, then push up until your arms are straight.'],
        ['Coloque os pés em um banco ou degrau e as mãos no chão, com o corpo reto.', 'Desça o peito em direção ao chão dobrando os cotovelos e empurre até esticar os braços.'],
    ),
    'dominadas': s(
        ['Cuélgate de la barra con las palmas hacia adelante, las manos un poco más abiertas que los hombros.', 'Tira hacia arriba hasta pasar la barbilla por encima de la barra y baja despacio hasta estirar los brazos.'],
        ['Hang from the bar with palms facing forward, hands a bit wider than your shoulders.', 'Pull yourself up until your chin is over the bar, then lower slowly until your arms are straight.'],
        ['Pendure-se na barra com as palmas para frente e as mãos um pouco mais abertas que os ombros.', 'Puxe o corpo até o queixo passar a barra e desça devagar até esticar os braços.'],
    ),
    'jalon-pecho': s(
        ['Siéntate en la máquina con las rodillas bajo el soporte y agarra la barra más abierto que los hombros.', 'Tira de la barra hasta la parte alta del pecho, sacando pecho, y súbela despacio.'],
        ['Sit at the machine with your knees under the pad and grip the bar wider than your shoulders.', 'Pull the bar down to your upper chest, chest up, then let it rise slowly.'],
        ['Sente-se na máquina com os joelhos sob o apoio e segure a barra mais aberto que os ombros.', 'Puxe a barra até a parte alta do peito, peito aberto, e deixe subir devagar.'],
    ),
    'remo-barra': s(
        ['De pie con la barra en las manos, dobla un poco las rodillas e inclina el torso hacia adelante con la espalda recta.', 'Tira de la barra hacia el ombligo llevando los codos atrás y bájala despacio.'],
        ['Standing with the bar in your hands, bend your knees slightly and lean forward with a straight back.', 'Pull the bar to your belly button, elbows going back, then lower it slowly.'],
        ['Em pé com a barra nas mãos, dobre um pouco os joelhos e incline o tronco para frente com as costas retas.', 'Puxe a barra até o umbigo levando os cotovelos para trás e desça devagar.'],
    ),
    'remo-mancuerna': s(
        ['Apoya una rodilla y una mano en un banco, con la espalda recta y la mancuerna en la otra mano.', 'Tira de la mancuerna hacia la cadera llevando el codo atrás y bájala despacio.'],
        ['Rest one knee and one hand on a bench, back straight, dumbbell in the other hand.', 'Pull the dumbbell toward your hip, elbow going back, then lower it slowly.'],
        ['Apoie um joelho e uma mão no banco, com as costas retas e o halter na outra mão.', 'Puxe o halter em direção ao quadril levando o cotovelo para trás e desça devagar.'],
    ),
    'remo-polea': s(
        ['Siéntate frente a la polea con los pies en el apoyo, las rodillas un poco dobladas y la espalda recta.', 'Tira del agarre hacia el abdomen juntando los omóplatos y vuelve despacio con los brazos estirados.'],
        ['Sit facing the cable with feet on the platform, knees slightly bent and back straight.', 'Pull the handle to your stomach, squeezing your shoulder blades, then return slowly with straight arms.'],
        ['Sente-se de frente para a polia com os pés no apoio, joelhos levemente dobrados e costas retas.', 'Puxe a alça até o abdômen juntando as escápulas e volte devagar com os braços esticados.'],
    ),
    'remo-invertido': s(
        ['Acuéstate bajo una barra baja y agárrala con el cuerpo recto y los talones en el suelo.', 'Tira del pecho hacia la barra y baja despacio hasta estirar los brazos.'],
        ['Lie under a low bar and hold it with your body straight and heels on the floor.', 'Pull your chest up to the bar, then lower slowly until your arms are straight.'],
        ['Deite sob uma barra baixa e segure-a com o corpo reto e os calcanhares no chão.', 'Puxe o peito até a barra e desça devagar até esticar os braços.'],
    ),
    'face-pull': s(
        ['Pon la polea a la altura de la cara con una cuerda y agárrala con las palmas hacia abajo.', 'Tira de la cuerda hacia la cara separando las manos y llevando los codos altos, y vuelve despacio.'],
        ['Set the pulley at face height with a rope and hold it palms down.', 'Pull the rope toward your face, hands apart and elbows high, then return slowly.'],
        ['Coloque a polia na altura do rosto com uma corda e segure com as palmas para baixo.', 'Puxe a corda em direção ao rosto separando as mãos com os cotovelos altos e volte devagar.'],
    ),
    'press-militar': s(
        ['De pie, con la barra apoyada en la parte alta del pecho y las manos un poco más abiertas que los hombros.', 'Empuja la barra por encima de la cabeza hasta estirar los brazos y bájala despacio al pecho.'],
        ['Stand with the bar resting on your upper chest, hands a bit wider than your shoulders.', 'Press the bar overhead until your arms are straight, then lower it slowly to your chest.'],
        ['Em pé, com a barra apoiada na parte alta do peito e as mãos um pouco mais abertas que os ombros.', 'Empurre a barra acima da cabeça até esticar os braços e desça devagar até o peito.'],
    ),
    'press-hombro-mancuernas': s(
        ['Siéntate con la espalda apoyada y una mancuerna en cada mano a la altura de los hombros.', 'Empuja las mancuernas hacia arriba hasta estirar los brazos y bájalas despacio a los hombros.'],
        ['Sit with your back supported and a dumbbell in each hand at shoulder height.', 'Press the dumbbells up until your arms are straight, then lower them slowly to your shoulders.'],
        ['Sente-se com as costas apoiadas e um halter em cada mão na altura dos ombros.', 'Empurre os halteres para cima até esticar os braços e desça devagar até os ombros.'],
    ),
    'elevaciones-laterales': s(
        ['De pie con una mancuerna en cada mano a los lados y los codos un poco doblados.', 'Sube los brazos hacia los lados hasta la altura de los hombros y bájalos despacio.'],
        ['Stand with a dumbbell in each hand at your sides, elbows slightly bent.', 'Raise your arms out to the sides to shoulder height, then lower them slowly.'],
        ['Em pé com um halter em cada mão ao lado do corpo e os cotovelos levemente dobrados.', 'Eleve os braços para os lados até a altura dos ombros e desça devagar.'],
    ),
    'curl-barra': s(
        ['De pie con la barra en las manos, palmas hacia adelante y codos pegados al cuerpo.', 'Sube la barra doblando los codos hasta los hombros y bájala despacio hasta estirar los brazos.'],
        ['Stand holding the bar, palms facing forward and elbows close to your body.', 'Curl the bar up to your shoulders, then lower it slowly until your arms are straight.'],
        ['Em pé com a barra nas mãos, palmas para frente e cotovelos junto ao corpo.', 'Suba a barra dobrando os cotovelos até os ombros e desça devagar até esticar os braços.'],
    ),
    'curl-mancuernas': s(
        ['De pie con una mancuerna en cada mano, palmas hacia adelante y codos pegados al cuerpo.', 'Sube las mancuernas doblando los codos y bájalas despacio hasta estirar los brazos.'],
        ['Stand with a dumbbell in each hand, palms forward and elbows close to your body.', 'Curl the dumbbells up, then lower them slowly until your arms are straight.'],
        ['Em pé com um halter em cada mão, palmas para frente e cotovelos junto ao corpo.', 'Suba os halteres dobrando os cotovelos e desça devagar até esticar os braços.'],
    ),
    'curl-martillo': s(
        ['De pie con una mancuerna en cada mano y las palmas mirándose entre sí.', 'Sube las mancuernas doblando los codos sin girar las muñecas y bájalas despacio.'],
        ['Stand with a dumbbell in each hand, palms facing each other.', 'Curl the dumbbells up without turning your wrists, then lower them slowly.'],
        ['Em pé com um halter em cada mão e as palmas viradas uma para a outra.', 'Suba os halteres dobrando os cotovelos sem girar os punhos e desça devagar.'],
    ),
    'extension-triceps-polea': s(
        ['De pie frente a la polea alta, agarra la barra o cuerda con los codos pegados al cuerpo.', 'Empuja hacia abajo hasta estirar los brazos y sube despacio sin mover los codos.'],
        ['Stand facing the high pulley and hold the bar or rope with elbows close to your body.', 'Push down until your arms are straight, then let it up slowly without moving your elbows.'],
        ['Em pé de frente para a polia alta, segure a barra ou corda com os cotovelos junto ao corpo.', 'Empurre para baixo até esticar os braços e suba devagar sem mover os cotovelos.'],
    ),
    'press-frances': s(
        ['Acuéstate en el banco con la barra sobre el pecho y los brazos estirados hacia el techo.', 'Dobla solo los codos para bajar la barra hacia la frente y estira los brazos para subirla.'],
        ['Lie on the bench with the bar over your chest and arms straight up.', 'Bend only your elbows to lower the bar toward your forehead, then straighten your arms.'],
        ['Deite no banco com a barra sobre o peito e os braços esticados para cima.', 'Dobre só os cotovelos para descer a barra em direção à testa e estique os braços para subir.'],
    ),
    'extension-triceps-mancuerna': s(
        ['Sentado o de pie, sujeta una mancuerna con las dos manos por encima de la cabeza.', 'Baja la mancuerna detrás de la cabeza doblando los codos y súbela hasta estirar los brazos.'],
        ['Sitting or standing, hold one dumbbell with both hands above your head.', 'Bend your elbows to lower it behind your head, then straighten your arms to lift it.'],
        ['Sentado ou em pé, segure um halter com as duas mãos acima da cabeça.', 'Desça o halter atrás da cabeça dobrando os cotovelos e suba até esticar os braços.'],
    ),
    'fondos-banco': s(
        ['Apoya las manos en el borde de un banco detrás de ti, con las piernas estiradas delante.', 'Baja la cadera doblando los codos hasta unos 90° y empuja para subir.'],
        ['Put your hands on the edge of a bench behind you, legs stretched out in front.', 'Bend your elbows to about 90° to lower your hips, then push back up.'],
        ['Apoie as mãos na borda de um banco atrás de você, com as pernas esticadas à frente.', 'Desça o quadril dobrando os cotovelos até uns 90° e empurre para subir.'],
    ),
    'sentadilla': s(
        ['Con la barra sobre la parte alta de la espalda, pies al ancho de los hombros y puntas un poco hacia afuera.', 'Baja como si te sentaras en una silla hasta que los muslos queden paralelos al suelo y sube empujando con los talones.'],
        ['With the bar on your upper back, feet shoulder-width apart and toes slightly out.', 'Sit down as if into a chair until your thighs are parallel to the floor, then stand up pushing through your heels.'],
        ['Com a barra na parte alta das costas, pés na largura dos ombros e pontas um pouco para fora.', 'Desça como se fosse sentar em uma cadeira até as coxas ficarem paralelas ao chão e suba empurrando com os calcanhares.'],
    ),
    'sentadilla-goblet': s(
        ['Sujeta una mancuerna vertical pegada al pecho, con los pies al ancho de los hombros.', 'Baja como si te sentaras hasta que los codos rocen las rodillas y sube empujando con los talones.'],
        ['Hold a dumbbell upright against your chest, feet shoulder-width apart.', 'Sit down until your elbows brush your knees, then stand up pushing through your heels.'],
        ['Segure um halter na vertical junto ao peito, com os pés na largura dos ombros.', 'Desça como se fosse sentar até os cotovelos tocarem os joelhos e suba empurrando com os calcanhares.'],
    ),
    'sentadilla-libre': s(
        ['De pie con los pies al ancho de los hombros y los brazos al frente para equilibrarte.', 'Baja como si te sentaras en una silla y sube empujando con los talones.'],
        ['Stand with feet shoulder-width apart and arms in front of you for balance.', 'Sit down as if into a chair, then stand up pushing through your heels.'],
        ['Em pé com os pés na largura dos ombros e os braços à frente para se equilibrar.', 'Desça como se fosse sentar em uma cadeira e suba empurrando com os calcanhares.'],
    ),
    'prensa': s(
        ['Siéntate en la máquina con la espalda apoyada y los pies en la plataforma al ancho de los hombros.', 'Quita el seguro, baja la plataforma doblando las rodillas hasta unos 90° y empuja hasta casi estirar las piernas.'],
        ['Sit in the machine with your back on the pad and feet on the platform shoulder-width apart.', 'Release the safety, bend your knees to about 90° to lower the platform, then push until your legs are almost straight.'],
        ['Sente-se na máquina com as costas apoiadas e os pés na plataforma na largura dos ombros.', 'Solte a trava, desça a plataforma dobrando os joelhos até uns 90° e empurre até quase esticar as pernas.'],
    ),
    'zancadas': s(
        ['De pie con una mancuerna en cada mano a los lados del cuerpo.', 'Da un paso largo al frente y baja hasta que las dos rodillas queden a 90°; empuja con el pie de adelante para volver.'],
        ['Stand with a dumbbell in each hand at your sides.', 'Take a long step forward and lower until both knees are at 90°, then push off the front foot to come back.'],
        ['Em pé com um halter em cada mão ao lado do corpo.', 'Dê um passo longo à frente e desça até os dois joelhos ficarem a 90°; empurre com o pé da frente para voltar.'],
    ),
    'zancadas-libres': s(
        ['De pie con las manos en la cintura y la espalda recta.', 'Da un paso largo al frente, baja hasta que las dos rodillas queden a 90° y sigue caminando con la otra pierna.'],
        ['Stand with your hands on your hips and back straight.', 'Take a long step forward, lower until both knees are at 90°, then keep walking with the other leg.'],
        ['Em pé com as mãos na cintura e as costas retas.', 'Dê um passo longo à frente, desça até os dois joelhos ficarem a 90° e siga caminhando com a outra perna.'],
    ),
    'sentadilla-dividida': s(
        ['Con una mancuerna en cada mano, pon un pie adelante y el otro atrás, a un paso largo de distancia.', 'Baja recto hasta que la rodilla de atrás casi toque el suelo y sube; cambia de pierna en la siguiente serie.'],
        ['With a dumbbell in each hand, put one foot forward and one back, a long step apart.', 'Lower straight down until your back knee almost touches the floor, then rise; switch legs next set.'],
        ['Com um halter em cada mão, coloque um pé à frente e o outro atrás, a um passo longo de distância.', 'Desça reto até o joelho de trás quase tocar o chão e suba; troque de perna na próxima série.'],
    ),
    'extension-cuadriceps': s(
        ['Siéntate en la máquina con la espalda apoyada y el rodillo sobre los tobillos.', 'Estira las piernas hasta arriba y bájalas despacio.'],
        ['Sit in the machine with your back on the pad and the roller on your ankles.', 'Straighten your legs all the way up, then lower them slowly.'],
        ['Sente-se na máquina com as costas apoiadas e o rolo sobre os tornozelos.', 'Estique as pernas até em cima e desça devagar.'],
    ),
    'peso-muerto': s(
        ['Pies al ancho de la cadera bajo la barra; agárrala con las manos justo fuera de las piernas y la espalda recta.', 'Levántate empujando el suelo con las piernas, con la barra pegada al cuerpo, y bájala igual de controlado.'],
        ['Feet hip-width under the bar; grip it just outside your legs with a straight back.', 'Stand up by pushing the floor away with your legs, bar close to your body, then lower it under control.'],
        ['Pés na largura do quadril sob a barra; segure-a com as mãos logo fora das pernas e as costas retas.', 'Levante-se empurrando o chão com as pernas, com a barra junto ao corpo, e desça com o mesmo controle.'],
    ),
    'peso-muerto-rumano': s(
        ['De pie con la barra en las manos, rodillas un poco dobladas y espalda recta.', 'Lleva la cadera atrás bajando la barra por las piernas hasta sentir los isquios y sube apretando glúteos.'],
        ['Stand holding the bar, knees slightly bent and back straight.', 'Push your hips back, sliding the bar down your legs until you feel your hamstrings, then stand up squeezing your glutes.'],
        ['Em pé com a barra nas mãos, joelhos levemente dobrados e costas retas.', 'Leve o quadril para trás descendo a barra pelas pernas até sentir os posteriores e suba contraindo os glúteos.'],
    ),
    'peso-muerto-rumano-mancuernas': s(
        ['De pie con una mancuerna en cada mano delante de los muslos, rodillas un poco dobladas.', 'Lleva la cadera atrás bajando las mancuernas por las piernas con la espalda recta y sube apretando glúteos.'],
        ['Stand with a dumbbell in each hand in front of your thighs, knees slightly bent.', 'Push your hips back, lowering the dumbbells along your legs with a straight back, then stand up squeezing your glutes.'],
        ['Em pé com um halter em cada mão à frente das coxas, joelhos levemente dobrados.', 'Leve o quadril para trás descendo os halteres pelas pernas com as costas retas e suba contraindo os glúteos.'],
    ),
    'curl-femoral': s(
        ['Acuéstate o siéntate en la máquina con el rodillo detrás de los tobillos.', 'Dobla las rodillas llevando los talones hacia los glúteos y vuelve despacio.'],
        ['Lie or sit in the machine with the roller behind your ankles.', 'Bend your knees bringing your heels toward your glutes, then return slowly.'],
        ['Deite ou sente-se na máquina com o rolo atrás dos tornozelos.', 'Dobre os joelhos levando os calcanhares em direção aos glúteos e volte devagar.'],
    ),
    'hip-thrust': s(
        ['Apoya la parte alta de la espalda en un banco, con la barra sobre la cadera y los pies firmes en el suelo.', 'Sube la cadera hasta que el cuerpo quede recto de hombros a rodillas, aprieta glúteos y baja despacio.'],
        ['Rest your upper back on a bench, bar over your hips and feet flat on the floor.', 'Drive your hips up until your body is straight from shoulders to knees, squeeze your glutes and lower slowly.'],
        ['Apoie a parte alta das costas em um banco, com a barra sobre o quadril e os pés firmes no chão.', 'Suba o quadril até o corpo ficar reto dos ombros aos joelhos, contraia os glúteos e desça devagar.'],
    ),
    'puente-gluteo': s(
        ['Acuéstate boca arriba con las rodillas dobladas y los pies apoyados en el suelo.', 'Sube la cadera apretando los glúteos hasta formar una línea recta y bájala despacio.'],
        ['Lie on your back with knees bent and feet flat on the floor.', 'Lift your hips by squeezing your glutes until your body forms a straight line, then lower slowly.'],
        ['Deite de barriga para cima com os joelhos dobrados e os pés apoiados no chão.', 'Suba o quadril contraindo os glúteos até formar uma linha reta e desça devagar.'],
    ),
    'elevacion-gemelos': s(
        ['Ponte en la máquina con las puntas de los pies en el borde y los talones en el aire.', 'Sube de puntillas lo más alto que puedas y baja los talones despacio por debajo del borde.'],
        ['Stand in the machine with the balls of your feet on the edge and heels hanging off.', 'Rise onto your toes as high as you can, then lower your heels slowly below the edge.'],
        ['Fique na máquina com as pontas dos pés na borda e os calcanhares no ar.', 'Suba na ponta dos pés o mais alto que puder e desça os calcanhares devagar abaixo da borda.'],
    ),
    'elevacion-gemelos-libre': s(
        ['Ponte sobre un pie en el borde de un escalón, sujetándote a la pared para no perder el equilibrio.', 'Sube de puntillas lo más alto que puedas y baja despacio; cambia de pie al terminar.'],
        ['Stand on one foot on the edge of a step, holding a wall for balance.', 'Rise onto your toes as high as you can, then lower slowly; switch feet when done.'],
        ['Fique em um pé na borda de um degrau, segurando na parede para manter o equilíbrio.', 'Suba na ponta do pé o mais alto que puder e desça devagar; troque de pé ao terminar.'],
    ),
    'plancha': s(
        ['Apoya los antebrazos en el suelo con los codos bajo los hombros y las piernas estiradas.', 'Sube la cadera hasta que el cuerpo quede recto de la cabeza a los pies y mantén la posición.'],
        ['Rest your forearms on the floor, elbows under your shoulders and legs straight.', 'Lift your hips until your body is straight from head to heels and hold.'],
        ['Apoie os antebraços no chão com os cotovelos sob os ombros e as pernas esticadas.', 'Suba o quadril até o corpo ficar reto da cabeça aos pés e mantenha a posição.'],
    ),
    'rueda-abdominal': s(
        ['De rodillas, agarra la rueda con las dos manos debajo de los hombros.', 'Rueda hacia adelante estirando el cuerpo hasta donde controles y vuelve tirando con el abdomen.'],
        ['Kneel and hold the wheel with both hands under your shoulders.', 'Roll forward, stretching your body as far as you can control, then pull back with your abs.'],
        ['De joelhos, segure a roda com as duas mãos abaixo dos ombros.', 'Role para frente esticando o corpo até onde controlar e volte puxando com o abdômen.'],
    ),
    'elevacion-piernas': s(
        ['Cuélgate de una barra con los brazos estirados y las piernas juntas.', 'Sube las piernas hasta la altura de la cadera o más y bájalas despacio sin balancearte.'],
        ['Hang from a bar with straight arms and legs together.', 'Raise your legs to hip height or higher, then lower them slowly without swinging.'],
        ['Pendure-se em uma barra com os braços esticados e as pernas juntas.', 'Suba as pernas até a altura do quadril ou mais e desça devagar sem balançar.'],
    ),
    'pallof': s(
        ['Ponte de lado a la polea, con el agarre en las dos manos pegado al pecho.', 'Estira los brazos al frente sin dejar que la polea te gire, aguanta un segundo y vuelve al pecho.'],
        ['Stand side-on to the cable, holding the handle with both hands at your chest.', 'Press your arms straight out without letting the cable twist you, hold a second, then bring it back.'],
        ['Fique de lado para a polia, com a alça nas duas mãos junto ao peito.', 'Estique os braços à frente sem deixar a polia te girar, segure um segundo e volte ao peito.'],
    ),
    'press-pecho-maquina': s(
        ['Siéntate con la espalda apoyada y ajusta el asiento para que los agarres queden a la altura del pecho.', 'Empuja los agarres hacia adelante hasta estirar los brazos y vuelve despacio.'],
        ['Sit with your back on the pad and set the seat so the handles are at chest height.', 'Push the handles forward until your arms are straight, then return slowly.'],
        ['Sente-se com as costas apoiadas e ajuste o banco para as alças ficarem na altura do peito.', 'Empurre as alças para frente até esticar os braços e volte devagar.'],
    ),
    'remo-maquina': s(
        ['Siéntate con el pecho contra el apoyo y agarra los mangos con los brazos estirados.', 'Tira de los mangos hacia ti llevando los codos atrás y vuelve despacio.'],
        ['Sit with your chest against the pad and hold the handles with straight arms.', 'Pull the handles toward you, elbows going back, then return slowly.'],
        ['Sente-se com o peito contra o apoio e segure as alças com os braços esticados.', 'Puxe as alças em sua direção levando os cotovelos para trás e volte devagar.'],
    ),
    'press-hombro-maquina': s(
        ['Siéntate con la espalda apoyada y los agarres a la altura de los hombros.', 'Empuja hacia arriba hasta estirar los brazos y baja despacio.'],
        ['Sit with your back on the pad and the handles at shoulder height.', 'Press up until your arms are straight, then lower slowly.'],
        ['Sente-se com as costas apoiadas e as alças na altura dos ombros.', 'Empurre para cima até esticar os braços e desça devagar.'],
    ),
    'abductores-maquina': s(
        ['Siéntate en la máquina con la espalda apoyada y las almohadillas por fuera de las rodillas.', 'Abre las piernas hacia afuera lo más que puedas y ciérralas despacio.'],
        ['Sit in the machine with your back on the pad and the pads on the outside of your knees.', 'Push your legs out as far as you can, then bring them back slowly.'],
        ['Sente-se na máquina com as costas apoiadas e as almofadas por fora dos joelhos.', 'Abra as pernas para fora o máximo que puder e feche devagar.'],
    ),
    'flexiones-inclinadas': s(
        ['Apoya las manos en un banco o mesa firme, con el cuerpo recto y los pies atrás.', 'Baja el pecho hacia el banco doblando los codos y empuja hasta estirar los brazos.'],
        ['Put your hands on a bench or sturdy table, body straight and feet back.', 'Bend your elbows to lower your chest to the bench, then push up until your arms are straight.'],
        ['Apoie as mãos em um banco ou mesa firme, com o corpo reto e os pés para trás.', 'Desça o peito até o banco dobrando os cotovelos e empurre até esticar os braços.'],
    ),
    'puente-gluteo-una-pierna': s(
        ['Acuéstate boca arriba con una rodilla doblada y la otra pierna estirada en el aire.', 'Sube la cadera empujando con el talón apoyado, aprieta el glúteo y baja despacio; cambia de lado.'],
        ['Lie on your back with one knee bent and the other leg straight up in the air.', 'Lift your hips by pushing through the planted heel, squeeze your glute and lower slowly; switch sides.'],
        ['Deite de barriga para cima com um joelho dobrado e a outra perna esticada no ar.', 'Suba o quadril empurrando com o calcanhar apoiado, contraia o glúteo e desça devagar; troque de lado.'],
    ),
    'patada-gluteo': s(
        ['Ponte a cuatro patas con las manos bajo los hombros y las rodillas bajo la cadera.', 'Lleva una pierna hacia atrás y arriba apretando el glúteo, vuelve despacio y cambia de pierna.'],
        ['Get on all fours, hands under your shoulders and knees under your hips.', 'Kick one leg back and up while squeezing your glute, return slowly and switch legs.'],
        ['Fique de quatro apoios com as mãos sob os ombros e os joelhos sob o quadril.', 'Leve uma perna para trás e para cima contraindo o glúteo, volte devagar e troque de perna.'],
    ),
    'gusano': s(
        ['De pie, dobla la cadera y apoya las manos en el suelo delante de los pies.', 'Camina con las manos hacia adelante hasta quedar en plancha y vuelve caminando con las manos hasta los pies.'],
        ['Standing, bend at the hips and put your hands on the floor in front of your feet.', 'Walk your hands forward into a plank, then walk them back to your feet.'],
        ['Em pé, dobre o quadril e apoie as mãos no chão à frente dos pés.', 'Caminhe com as mãos para frente até ficar em prancha e volte caminhando com as mãos até os pés.'],
    ),
    'crunch': s(
        ['Acuéstate boca arriba con las rodillas dobladas y las manos junto a la cabeza.', 'Despega los hombros del suelo contrayendo el abdomen y baja despacio.'],
        ['Lie on your back with knees bent and hands by your head.', 'Lift your shoulders off the floor by tightening your abs, then lower slowly.'],
        ['Deite de barriga para cima com os joelhos dobrados e as mãos junto à cabeça.', 'Tire os ombros do chão contraindo o abdômen e desça devagar.'],
    ),
    'dead-bug': s(
        ['Acuéstate boca arriba con los brazos hacia el techo y las rodillas dobladas en el aire a 90°.', 'Estira un brazo atrás y la pierna contraria al frente sin despegar la espalda del suelo; vuelve y cambia.'],
        ['Lie on your back, arms up and knees bent in the air at 90°.', 'Extend one arm back and the opposite leg forward without lifting your back; return and switch.'],
        ['Deite de barriga para cima com os braços para o teto e os joelhos dobrados no ar a 90°.', 'Estique um braço para trás e a perna oposta à frente sem tirar as costas do chão; volte e troque.'],
    ),
    'giro-ruso': s(
        ['Siéntate con las rodillas dobladas, inclina el torso un poco atrás y junta las manos delante.', 'Gira el torso de un lado al otro llevando las manos junto a la cadera.'],
        ['Sit with knees bent, lean back a little and clasp your hands in front of you.', 'Twist your torso from side to side, bringing your hands next to your hips.'],
        ['Sente-se com os joelhos dobrados, incline o tronco um pouco para trás e junte as mãos à frente.', 'Gire o tronco de um lado para o outro levando as mãos ao lado do quadril.'],
    ),
    'plancha-lateral': s(
        ['Túmbate de lado apoyado en un antebrazo, con el codo bajo el hombro y las piernas estiradas.', 'Sube la cadera hasta que el cuerpo quede recto y mantén; luego cambia de lado.'],
        ['Lie on your side on one forearm, elbow under your shoulder and legs straight.', 'Lift your hips until your body is straight and hold; then switch sides.'],
        ['Deite de lado apoiado em um antebraço, com o cotovelo sob o ombro e as pernas esticadas.', 'Suba o quadril até o corpo ficar reto e mantenha; depois troque de lado.'],
    ),
    'escaladores': s(
        ['Ponte en posición de flexión con los brazos estirados y el cuerpo recto.', 'Lleva una rodilla al pecho y cámbiala rápido por la otra, como si corrieras en el sitio.'],
        ['Get into a push-up position with straight arms and a straight body.', 'Drive one knee to your chest and switch quickly to the other, like running in place.'],
        ['Fique em posição de flexão com os braços esticados e o corpo reto.', 'Leve um joelho ao peito e troque rápido pelo outro, como se corresse no lugar.'],
    ),
    'superman': s(
        ['Acuéstate boca abajo con los brazos estirados por delante de la cabeza.', 'Despega a la vez brazos, pecho y piernas del suelo y mantén la posición.'],
        ['Lie face down with your arms stretched out in front of your head.', 'Lift your arms, chest and legs off the floor at the same time and hold.'],
        ['Deite de barriga para baixo com os braços esticados à frente da cabeça.', 'Tire ao mesmo tempo braços, peito e pernas do chão e mantenha a posição.'],
    ),
    'subida-banco': s(
        ['De pie frente a un banco o cajón firme, con una mancuerna en cada mano.', 'Sube apoyando todo el pie en el banco y empujando con esa pierna, y baja despacio; alterna las piernas.'],
        ['Stand facing a sturdy bench or box with a dumbbell in each hand.', 'Step up placing your whole foot on the bench and pushing with that leg, then step down slowly; alternate legs.'],
        ['Em pé de frente para um banco ou caixa firme, com um halter em cada mão.', 'Suba apoiando o pé inteiro no banco e empurrando com essa perna, e desça devagar; alterne as pernas.'],
    ),
    'swing-kettlebell': s(
        ['Pies algo más abiertos que la cadera, agarra la pesa rusa con las dos manos delante de ti.', 'Llévala entre las piernas doblando la cadera y lánzala al frente hasta el pecho con un empujón de cadera.'],
        ['Feet a little wider than your hips, hold the kettlebell with both hands in front of you.', 'Swing it back between your legs by bending at the hips, then snap your hips to swing it to chest height.'],
        ['Pés um pouco mais abertos que o quadril, segure o kettlebell com as duas mãos à sua frente.', 'Leve-o entre as pernas dobrando o quadril e lance para frente até o peito com um impulso do quadril.'],
    ),
    'flexiones-abiertas': s(
        ['Apoya las manos en el suelo bastante más abiertas que los hombros, con el cuerpo recto.', 'Baja el pecho hacia el suelo y empuja hasta estirar los brazos.'],
        ['Put your hands on the floor well wider than your shoulders, body straight.', 'Lower your chest toward the floor, then push up until your arms are straight.'],
        ['Apoie as mãos no chão bem mais abertas que os ombros, com o corpo reto.', 'Desça o peito em direção ao chão e empurre até esticar os braços.'],
    ),
    'flexiones-diamante': s(
        ['Junta las manos bajo el pecho formando un rombo con los pulgares e índices, con el cuerpo recto.', 'Baja el pecho hacia las manos con los codos pegados al cuerpo y empuja hasta estirar los brazos.'],
        ['Put your hands together under your chest, thumbs and index fingers forming a diamond, body straight.', 'Lower your chest to your hands with elbows close to your body, then push up until your arms are straight.'],
        ['Junte as mãos sob o peito formando um losango com os polegares e indicadores, com o corpo reto.', 'Desça o peito até as mãos com os cotovelos junto ao corpo e empurre até esticar os braços.'],
    ),
    'sentadilla-salto': s(
        ['De pie con los pies al ancho de los hombros.', 'Baja en sentadilla y salta hacia arriba con fuerza; cae suave con las rodillas dobladas y repite.'],
        ['Stand with feet shoulder-width apart.', 'Squat down, then jump up explosively; land softly with bent knees and repeat.'],
        ['Em pé com os pés na largura dos ombros.', 'Desça em agachamento e salte para cima com força; caia suave com os joelhos dobrados e repita.'],
    ),
    'zancada-salto': s(
        ['Colócate en posición de zancada, con un pie adelante y otro atrás.', 'Salta y cambia las piernas en el aire, cayendo suave en zancada con la otra pierna adelante.'],
        ['Get into a lunge position with one foot forward and one back.', 'Jump and switch legs in the air, landing softly in a lunge with the other leg forward.'],
        ['Fique em posição de avanço, com um pé à frente e outro atrás.', 'Salte e troque as pernas no ar, caindo suave em avanço com a outra perna à frente.'],
    ),
    'subida-rodilla': s(
        ['De pie frente a un escalón o banco firme.', 'Sube con una pierna y lleva la rodilla contraria hacia el pecho; baja despacio y alterna.'],
        ['Stand facing a sturdy step or bench.', 'Step up with one leg and drive the other knee toward your chest; step down slowly and alternate.'],
        ['Em pé de frente para um degrau ou banco firme.', 'Suba com uma perna e leve o joelho oposto em direção ao peito; desça devagar e alterne.'],
    ),
    'crunch-inverso': s(
        ['Acuéstate boca arriba con los brazos a los lados y las rodillas dobladas en el aire.', 'Lleva las rodillas hacia el pecho despegando un poco la cadera del suelo y baja despacio.'],
        ['Lie on your back, arms at your sides and knees bent in the air.', 'Bring your knees to your chest, lifting your hips slightly off the floor, then lower slowly.'],
        ['Deite de barriga para cima com os braços ao lado do corpo e os joelhos dobrados no ar.', 'Leve os joelhos ao peito tirando um pouco o quadril do chão e desça devagar.'],
    ),
    'bicicleta-abdominal': s(
        ['Acuéstate boca arriba con las manos junto a la cabeza y las piernas en el aire.', 'Lleva un codo hacia la rodilla contraria mientras estiras la otra pierna, y alterna como si pedalearas.'],
        ['Lie on your back with hands by your head and legs in the air.', 'Bring one elbow toward the opposite knee while straightening the other leg, and alternate as if pedaling.'],
        ['Deite de barriga para cima com as mãos junto à cabeça e as pernas no ar.', 'Leve um cotovelo em direção ao joelho oposto enquanto estica a outra perna, e alterne como se pedalasse.'],
    ),
    'patadas-alternas': s(
        ['Acuéstate boca arriba con las piernas estiradas y las manos bajo la cadera.', 'Sube un poco las piernas del suelo y muévelas arriba y abajo alternando, con pasos cortos y rápidos.'],
        ['Lie on your back with legs straight and hands under your hips.', 'Lift your legs slightly off the floor and kick them up and down in small, quick alternating moves.'],
        ['Deite de barriga para cima com as pernas esticadas e as mãos sob o quadril.', 'Suba um pouco as pernas do chão e mova para cima e para baixo alternando, com movimentos curtos e rápidos.'],
    ),
    'bicicleta-estatica': s(
        ['Ajusta el asiento para que la rodilla quede apenas doblada con el pedal abajo.', 'Pedalea a un ritmo que te deje hablar con algo de esfuerzo, con la espalda recta.'],
        ['Set the seat so your knee is only slightly bent with the pedal at the bottom.', 'Pedal at a pace where you can talk with some effort, back straight.'],
        ['Ajuste o banco para o joelho ficar só um pouco dobrado com o pedal embaixo.', 'Pedale em um ritmo que permita falar com algum esforço, com as costas retas.'],
    ),
    'caminadora': s(
        ['Súbete a la cinta parado y empieza a una velocidad baja, agarrado si lo necesitas.', 'Sube la velocidad hasta caminar a buen paso con los brazos sueltos y la mirada al frente.'],
        ['Step onto the belt and start at a slow speed, holding on if you need to.', 'Raise the speed until you walk at a brisk pace, arms swinging and eyes forward.'],
        ['Suba na esteira e comece em velocidade baixa, segurando se precisar.', 'Aumente a velocidade até caminhar em bom ritmo, com os braços soltos e o olhar à frente.'],
    ),
    'eliptica': s(
        ['Súbete con los pies en los pedales y agarra las manijas.', 'Mueve piernas y brazos a la vez a un ritmo constante, con la espalda recta.'],
        ['Step on with your feet on the pedals and hold the handles.', 'Move your legs and arms together at a steady pace, back straight.'],
        ['Suba com os pés nos pedais e segure as alças.', 'Mova pernas e braços ao mesmo tempo em ritmo constante, com as costas retas.'],
    ),
    'respiracion-diafragmatica': s(
        ['Acuéstate boca arriba con las rodillas dobladas y las manos en las costillas.', 'Inhala por la nariz llenando costillas y abdomen y, al soltar el aire, mete suavemente el ombligo.'],
        ['Lie on your back with knees bent and hands on your ribs.', 'Breathe in through your nose filling your ribs and belly, then draw your belly button in gently as you breathe out.'],
        ['Deite de barriga para cima com os joelhos dobrados e as mãos nas costelas.', 'Inspire pelo nariz enchendo costelas e abdômen e, ao soltar o ar, puxe o umbigo suavemente para dentro.'],
    ),
    'suelo-pelvico': s(
        ['Siéntate o acuéstate cómoda, con la respiración tranquila.', 'Aprieta los músculos que usarías para cortar la orina, mantén unos segundos y suelta despacio.'],
        ['Sit or lie down comfortably, breathing calmly.', 'Squeeze the muscles you would use to stop peeing, hold a few seconds and release slowly.'],
        ['Sente-se ou deite-se confortável, com a respiração tranquila.', 'Contraia os músculos que usaria para segurar o xixi, mantenha alguns segundos e solte devagar.'],
    ),
    'basculacion-pelvica': s(
        ['Acuéstate boca arriba con las rodillas dobladas y los pies apoyados.', 'Pega la zona lumbar al suelo inclinando la pelvis y vuelve suave a la posición inicial.'],
        ['Lie on your back with knees bent and feet flat.', 'Press your lower back into the floor by tilting your pelvis, then gently return.'],
        ['Deite de barriga para cima com os joelhos dobrados e os pés apoiados.', 'Encoste a lombar no chão inclinando a pelve e volte suavemente à posição inicial.'],
    ),
    'deslizamiento-talon': s(
        ['Acuéstate boca arriba con las rodillas dobladas y el abdomen suavemente activado.', 'Desliza un talón por el suelo hasta estirar la pierna y vuelve; alterna las piernas.'],
        ['Lie on your back with knees bent and your belly gently engaged.', 'Slide one heel along the floor until the leg is straight, then bring it back; alternate legs.'],
        ['Deite de barriga para cima com os joelhos dobrados e o abdômen levemente ativado.', 'Deslize um calcanhar pelo chão até esticar a perna e volte; alterne as pernas.'],
    ),
    'toques-talon': s(
        ['Acuéstate boca arriba con las rodillas dobladas en el aire a 90°.', 'Baja un pie hasta tocar el suelo con la punta sin mover la espalda y vuelve; alterna.'],
        ['Lie on your back with knees bent in the air at 90°.', 'Lower one foot to tap the floor with your toes without moving your back, then return; alternate.'],
        ['Deite de barriga para cima com os joelhos dobrados no ar a 90°.', 'Desça um pé até tocar o chão com a ponta sem mexer as costas e volte; alterne.'],
    ),
    'bird-dog': s(
        ['Ponte a cuatro patas con las manos bajo los hombros y las rodillas bajo la cadera.', 'Estira un brazo al frente y la pierna contraria atrás, aguanta un segundo y cambia de lado.'],
        ['Get on all fours, hands under your shoulders and knees under your hips.', 'Reach one arm forward and the opposite leg back, hold a second and switch sides.'],
        ['Fique de quatro apoios com as mãos sob os ombros e os joelhos sob o quadril.', 'Estique um braço à frente e a perna oposta para trás, segure um segundo e troque de lado.'],
    ),
    'gato-camello': s(
        ['Ponte a cuatro patas con las manos bajo los hombros y las rodillas bajo la cadera.', 'Redondea la espalda hacia arriba mirando al ombligo y luego húndela despacio mirando al frente.'],
        ['Get on all fours, hands under your shoulders and knees under your hips.', 'Round your back up looking at your belly, then slowly let it sink while looking forward.'],
        ['Fique de quatro apoios com as mãos sob os ombros e os joelhos sob o quadril.', 'Arredonde as costas para cima olhando para o umbigo e depois afunde devagar olhando para frente.'],
    ),
    'circulos-cadera': s(
        ['De pie con los pies al ancho de los hombros y las manos en la cintura.', 'Dibuja círculos amplios con la cadera hacia un lado y luego hacia el otro.'],
        ['Stand with feet shoulder-width apart and hands on your hips.', 'Draw wide circles with your hips one way, then the other.'],
        ['Em pé com os pés na largura dos ombros e as mãos na cintura.', 'Faça círculos amplos com o quadril para um lado e depois para o outro.'],
    ),
    'postura-nino': s(
        ['Arrodíllate con las rodillas algo separadas y siéntate sobre los talones.', 'Inclínate hacia adelante estirando los brazos en el suelo, apoya la frente y respira tranquilo.'],
        ['Kneel with your knees a little apart and sit back on your heels.', 'Lean forward stretching your arms along the floor, rest your forehead and breathe calmly.'],
        ['Ajoelhe com os joelhos um pouco afastados e sente sobre os calcanhares.', 'Incline-se para frente esticando os braços no chão, apoie a testa e respire tranquilo.'],
    ),
    'estiramiento-psoas': s(
        ['Arrodíllate con una rodilla en el suelo y el otro pie adelante, como en una zancada.', 'Lleva la cadera suavemente hacia adelante hasta sentir el estiramiento delante del muslo y mantén; cambia de lado.'],
        ['Kneel on one knee with the other foot forward, like a lunge.', 'Gently push your hips forward until you feel a stretch at the front of your thigh and hold; switch sides.'],
        ['Ajoelhe com um joelho no chão e o outro pé à frente, como em um avanço.', 'Leve o quadril suavemente para frente até sentir o alongamento na frente da coxa e mantenha; troque de lado.'],
    ),
};

// The steps in the app's language (English for the languages without them).
export const howToSteps = (id: string, lang: string): string[] => {
    const steps = HOW_TO[id];
    if (!steps) return [];
    return lang === 'es' || lang === 'pt' ? steps[lang] : steps.en;
};
