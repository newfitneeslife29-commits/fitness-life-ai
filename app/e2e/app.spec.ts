import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const fixture = (name: string) => path.join(import.meta.dirname, 'fixtures', name);

// New users get a tour of the app once; tests skip it, except the one about it.
// Workout tests use the list of sets, except the ones about the guided mode.
test.beforeEach(async ({ page }, info) => {
    if (!info.title.startsWith('guided:')) await page.addInitScript(() => localStorage.setItem('fitness-life:workout-view', 'list'));
    if (info.title.startsWith('tour:')) return;
    await page.addInitScript(() => localStorage.setItem('fitness-life:guide-seen', '1'));
});

// Full journey on a phone viewport against the production build.

interface PlanAnswers { days?: string; setup?: RegExp; level?: RegExp; limits?: string[]; loseToKg?: string }

const onboard = async (page: Page, opts: PlanAnswers = {}) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Empezar gratis' }).click();
    await page.getByRole('button', { name: 'Continuar sin cuenta' }).click();
    await answerPlanQuestions(page, opts);
};

const answerPlanQuestions = async (page: Page, opts: PlanAnswers = {}) => {
    await expect(page.getByRole('heading', { name: 'Tu plan de fuerza en 1 minuto' })).toBeVisible();
    await page.getByLabel('¿Cómo te llamas? (opcional)').fill('Sebas');
    await page.getByRole('radio', { name: /Ganar músculo/ }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    // About you: nothing goes on until it is filled in.
    await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    await page.getByRole('radio', { name: 'Hombre' }).click();
    await page.getByLabel('Edad').fill('30');
    await page.getByLabel('Peso actual').fill('80');
    await page.getByLabel('Altura').fill('180');
    await page.getByRole('button', { name: 'Siguiente' }).click();
    for (const limit of opts.limits ?? []) await page.getByRole('checkbox', { name: limit }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('radio', { name: opts.level ?? /Intermedio/ }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('radio', { name: opts.days ?? '3', exact: true }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('radio', { name: opts.setup ?? /Gimnasio/ }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    if (opts.loseToKg) {
        await page.getByRole('radio', { name: 'Bajar' }).click();
        await page.getByLabel('Peso objetivo').fill(opts.loseToKg);
    } else {
        await page.getByRole('radio', { name: 'Mantener' }).click();
    }
    await page.getByRole('button', { name: 'Siguiente' }).click();
};

// Every exercise demo shows real photos, not broken images.
const expectPhotosLoaded = async (page: Page) => {
    const demo = page.getByRole('img', { name: /^Cómo se hace/ }).first();
    await expect(demo.locator('img').first()).toHaveJSProperty('complete', true);
    expect(await demo.locator('img').first().evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
};

test('onboarding builds a plan that matches the answers', async ({ page }) => {
    await onboard(page, { days: '4' });
    await expect(page.getByRole('heading', { name: 'Torso / Pierna' })).toBeVisible();
    await expect(page.getByText('Día 4')).toBeVisible();
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await expect(page.getByRole('heading', { name: '0 de 4 entrenos esta semana' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Torso fuerza' })).toBeVisible();
});

test('home setup gets a bodyweight plan', async ({ page }) => {
    await onboard(page, { setup: /En casa sin material/ });
    await expect(page.getByRole('heading', { name: 'En casa sin material' })).toBeVisible();
});

test('beginner at home with sore knees: guided plan, guides, programs and the voice timer', async ({ page }) => {
    // Record what the voice says instead of speaking.
    await page.addInitScript(() => {
        const spoken: string[] = [];
        (window as unknown as { spoken: string[] }).spoken = spoken;
        class Utterance { lang = ''; rate = 1; constructor(public text: string) {} }
        Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance });
        Object.defineProperty(window, 'speechSynthesis', { value: { speak: (u: Utterance) => spoken.push(u.text), cancel: () => {} } });
    });
    await onboard(page, { setup: /En casa sin material/, level: /Principiante/, limits: ['Rodillas'], loseToKg: '75' });
    await expect(page.getByRole('heading', { name: 'Primeros pasos en casa' })).toBeVisible();
    // Squats and lunges are swapped for knee-friendly moves.
    await expect(page.getByText(/Sentadilla sin peso/)).toHaveCount(0);
    await expect(page.getByText(/Puente de glúteo/).first()).toBeVisible();
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();

    // Home: the beginner guide and the weight goal.
    await expect(page.getByText('Te faltan 5 kg')).toBeVisible();
    await page.getByRole('link', { name: /¿Empiezas a entrenar\?/ }).click();
    await expect(page.getByRole('heading', { name: 'Empieza desde cero' })).toBeVisible();
    await page.getByRole('link', { name: /Cómo funciona un entreno/ }).click();
    await expect(page.getByRole('heading', { name: 'Cómo funciona un entreno' })).toBeVisible();

    // Programs: Premium ones are locked for free users.
    await page.goto('/#/programas');
    await page.getByRole('button', { name: /Quema grasa en casa/ }).click();
    await expect(page.getByRole('link', { name: 'Desbloquear con Premium' })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await page.getByRole('button', { name: /^En casa sin material/ }).click();
    await page.getByRole('button', { name: 'Usar este programa' }).click();
    await page.getByRole('button', { name: 'Crear plan' }).click();
    await expect(page.getByRole('heading', { name: 'Tu plan · En casa sin material' })).toBeVisible();

    // Timed exercise: the voice counts in and the seconds go into the set.
    await page.goto('/#/');
    await page.getByRole('button', { name: 'Empezar entreno' }).click();
    const plank = page.getByRole('region', { name: 'Plancha', exact: true });
    await plank.getByRole('button', { name: 'Iniciar cronómetro' }).click();
    await expect(plank.getByText('Prepárate')).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as unknown as { spoken: string[] }).spoken), { timeout: 8000 }).toEqual(['3', '2', '1', '¡Ya!']);
    await page.waitForTimeout(1200);
    await plank.getByRole('button', { name: 'Terminar serie' }).click();
    await expect(plank.getByLabel('Marcar serie 1 como hecha')).toHaveAttribute('aria-pressed', 'true');
    expect(Number(await plank.getByLabel('Repeticiones serie 1').inputValue())).toBeGreaterThanOrEqual(1);
});

test('log a workout, get a heavier suggestion next time, and keep data after reload', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('button', { name: 'Empezar entreno' }).click();

    // First exercise of "Cuerpo completo A" for an intermediate: squat 3 x 6-10.
    const squat = page.getByRole('region', { name: 'Sentadilla con barra' });
    await expect(squat.getByText(/Primera vez/)).toBeVisible();
    // How-to photos while training.
    await squat.getByRole('button', { name: 'Cómo se hace' }).last().click();
    await expect(squat.getByRole('img', { name: 'Cómo se hace: Sentadilla con barra' }).last()).toBeVisible();
    await expectPhotosLoaded(page);
    await squat.getByRole('button', { name: 'Ocultar' }).click();
    for (let i = 1; i <= 3; i++) {
        await squat.getByLabel(`Peso serie ${i}`).fill('80');
        await squat.getByLabel(`Repeticiones serie ${i}`).fill('10');
        await squat.getByLabel(`Marcar serie ${i} como hecha`).click();
    }
    await expect(page.getByRole('timer')).toBeVisible();
    await page.getByRole('button', { name: 'Saltar' }).click();
    await expect(page.getByRole('timer')).toHaveCount(0);
    await expect(page.getByText('3/', { exact: false })).toBeVisible();

    // The workout survives leaving the screen and a full reload.
    await page.getByRole('button', { name: /Volver/ }).click();
    await expect(page.getByRole('button', { name: /Entreno en curso/ })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: /Entreno en curso/ }).click();
    await expect(page.getByRole('region', { name: 'Sentadilla con barra' }).getByLabel('Peso serie 1')).toHaveValue('80');

    await page.getByRole('button', { name: 'Terminar' }).click();
    // Unmarked sets are not saved: confirm in the app's own dialog.
    await page.getByRole('alertdialog').getByRole('button', { name: 'Terminar' }).click();
    await expect(page.getByText('Entreno guardado')).toBeVisible();
    await expect(page.getByText('80 × 10').first()).toBeVisible();
    await page.getByRole('link', { name: 'Listo' }).click();

    await expect(page.getByRole('heading', { name: '1 de 3 entrenos esta semana' })).toBeVisible();
    // The plan rotated to day B.
    await expect(page.getByRole('heading', { name: 'Cuerpo completo B' })).toBeVisible();

    // Repeat day A: every set hit the top of the range, so +5 kg and back to 6 reps.
    await page.getByRole('link', { name: 'Rutinas', exact: true }).click();
    await page.getByRole('button', { name: 'Empezar Cuerpo completo A' }).click();
    const again = page.getByRole('region', { name: 'Sentadilla con barra' });
    await expect(again.getByText('Toca subir: 85 kg × 6 (+5 kg)')).toBeVisible();
    await expect(again.getByLabel('Peso serie 1')).toHaveValue('85');
    await expect(again.getByLabel('Repeticiones serie 1')).toHaveValue('6');
    await expect(again.getByText('80 × 10').first()).toBeVisible(); // "Anterior" column

    await page.getByRole('button', { name: 'Descartar entreno' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Descartar' }).click();
    await expect(page.getByRole('heading', { name: '1 de 3 entrenos esta semana' })).toBeVisible();

    await page.reload();
    await page.getByRole('link', { name: 'Progreso', exact: true }).click();
    await expect(page.getByText('1 entreno registrado')).toBeVisible();
    await expect(page.getByRole('link', { name: /Sentadilla con barra/ }).first()).toBeVisible();
});

test('create a custom routine and train it', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Rutinas', exact: true }).click();
    await page.getByRole('link', { name: 'Nueva' }).click();
    await page.getByLabel('Nombre').fill('Brazos');
    await page.getByRole('button', { name: 'Añadir ejercicio' }).click();
    await page.getByLabel('Buscar ejercicio').fill('martillo');
    await page.getByRole('button', { name: /Curl martillo/ }).click();
    await page.getByLabel('Series').fill('4');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Mis rutinas')).toBeVisible();
    await page.getByRole('button', { name: 'Empezar Brazos' }).click();
    const curl = page.getByRole('region', { name: 'Curl martillo' });
    await expect(curl.getByLabel('Peso serie 4')).toBeVisible();
});

test('export a backup from settings', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^fitness-life-\d{4}-\d{2}-\d{2}\.json$/);
});

test('exercise library search and detail', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Rutinas', exact: true }).click();
    await page.getByRole('link', { name: /^Ejercicios/ }).click();
    await page.getByLabel('Buscar ejercicio').fill('dominada');
    await page.getByRole('link', { name: /Dominadas/ }).click();
    await expect(page.getByRole('heading', { name: 'Dominadas' })).toBeVisible();
    // Start and end photos of the movement.
    await expect(page.getByRole('img', { name: 'Cómo se hace: Dominadas' })).toBeVisible();
    await expectPhotosLoaded(page);
    await expect(page.getByText('la app te sugerirá una repetición más')).toBeVisible();
    await expect(page.getByText('Todavía no has hecho este ejercicio.')).toBeVisible();
});

test('plate calculator, achievements, notes and body weight', async ({ page }) => {
    // Daytime, so the night-owl medal does not unlock too.
    await page.clock.setFixedTime(new Date('2026-10-07T10:00:00'));
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('button', { name: 'Empezar entreno' }).click();

    const squat = page.getByRole('region', { name: 'Sentadilla con barra' });
    await squat.getByLabel('Peso serie 1').fill('100');
    await squat.getByRole('button', { name: 'Discos y calentamiento' }).click();
    const sheet = page.getByRole('dialog', { name: /Discos/ });
    await expect(sheet.getByText('25 + 15', { exact: true })).toBeVisible();
    await expect(sheet.getByText('85 kg × 1')).toBeVisible();
    await sheet.getByRole('button', { name: 'Cerrar' }).click();
    await expect(sheet).toHaveCount(0);

    await squat.getByLabel('Marcar serie 1 como hecha').click();
    await page.getByRole('button', { name: 'Terminar' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Terminar' }).click();

    // First workout unlocks the first medal.
    await expect(page.getByText('Logro nuevo')).toBeVisible();
    await expect(page.getByText('Primer paso')).toBeVisible();
    await page.getByLabel('Notas del entreno').fill('Buenas sensaciones');
    await page.getByRole('link', { name: 'Listo' }).click();
    // Plus the first weigh-in, logged at sign-up.
    await expect(page.getByText(/^2 de \d+ conseguidos$/)).toBeVisible();

    await page.getByRole('link', { name: 'Último entreno' }).or(page.getByRole('link', { name: /Cuerpo completo A/ })).first().click();
    await expect(page.getByLabel('Notas del entreno')).toHaveValue('Buenas sensaciones');

    await page.getByRole('link', { name: 'Progreso', exact: true }).click();
    await page.getByLabel('Peso corporal de hoy').fill('78,4');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('78,4 kg').first()).toBeVisible();
    await expect(page.getByRole('img', { name: /días entrenados/ })).toBeVisible();
});

test('switch language in onboarding and settings', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Idioma: Español' }).click();
    await page.getByRole('radio', { name: /English/ }).click();
    await expect(page.getByText('Language changed to English')).toBeVisible();
    await page.getByRole('button', { name: 'Start for free' }).click();
    await page.getByRole('button', { name: 'Continue without an account' }).click();
    await expect(page.getByRole('heading', { name: 'Your strength plan in 1 minute' })).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    // In English, pounds and feet.
    await page.getByRole('radio', { name: 'Female' }).click();
    await page.getByLabel('Age').fill('28');
    await page.getByLabel('Current weight').fill('150');
    await page.getByLabel('Height').fill('5');
    await page.locator('#about-in').fill('6');
    for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('radio', { name: 'Maintain' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'First steps at the gym' })).toBeVisible();
    await page.getByRole('button', { name: 'Start with this plan' }).click();
    await expect(page.getByRole('heading', { name: '0 of 3 workouts this week' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nutrition', exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: /English/ }).click();
    await page.getByRole('radio', { name: /Português/ }).click();
    await expect(page.getByText('Idioma alterado para Português')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Início', exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole('link', { name: 'Início', exact: true }).click();
    await expect(page.getByRole('heading', { name: '0 de 3 treinos nesta semana' })).toBeVisible();
    // Names of generated routines follow the language too.
    await expect(page.getByRole('heading', { name: 'Início A' })).toBeVisible();
});

test('welcome screen leads to onboarding and back', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Entrena con un plan/ })).toBeVisible();
    await page.getByRole('button', { name: 'Empezar gratis' }).click();
    await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar sin cuenta' }).click();
    await expect(page.getByRole('heading', { name: 'Tu plan de fuerza en 1 minuto' })).toBeVisible();
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByRole('button', { name: 'Empezar gratis' })).toBeVisible();
});

test('light and dark mode follow the phone and can be chosen in settings', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    const html = page.locator('html');
    await expect(html).toHaveClass(/light/);

    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await page.getByRole('radio', { name: 'Oscuro' }).click();
    await expect(html).not.toHaveClass(/light/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0b0d10');
    await page.reload();
    await expect(html).not.toHaveClass(/light/);

    await page.getByRole('radio', { name: 'Claro' }).click();
    await expect(html).toHaveClass(/light/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f4f5f7');

    await page.getByRole('radio', { name: 'Sistema' }).click();
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(html).not.toHaveClass(/light/);
});

// Fake Supabase: anonymous sign-in plus the nutrition-coach function.
// Free users get no AI (the server answers 402); Premium users get 300 uses a month.
const mockAi = async (page: Page, calls: Record<string, unknown>[], opts: { premium?: boolean; reports?: Record<string, unknown>[]; feedback?: Record<string, unknown>[] } = {}) => {
    // RevenueCat is not reachable in tests: the paywall falls back to the default price.
    await page.route('https://api.revenuecat.com/**', route => route.abort());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    await page.route('http://ai.test/**', async route => {
        const req = route.request();
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        const url = req.url();
        if (url.includes('/auth/v1/signup')) {
            return route.fulfill({
                headers: cors, json: {
                    access_token: 'token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
                    refresh_token: 'refresh', user: { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', is_anonymous: true },
                },
            });
        }
        if (url.includes('/functions/v1/nutrition-coach')) {
            const body = req.postDataJSON();
            const usage = opts.premium ? { used: calls.length, limit: 300, premium: true } : { used: 0, limit: 0, premium: false };
            if (body.action === 'status') return route.fulfill({ headers: cors, json: { usage } });
            calls.push(body);
            if (!opts.premium) return route.fulfill({ status: 402, headers: cors, json: { error: 'premium required', usage } });
            if (body.action === 'estimate' || body.action === 'photo') {
                return route.fulfill({
                    headers: cors, json: {
                        name: 'Desayuno de huevos', note: 'Supuse huevos grandes.',
                        items: [
                            { name: 'Huevos revueltos', grams: 120, kcal: 180, protein: 13, carbs: 1, fat: 13 },
                            { name: 'Tostada integral', grams: 40, kcal: 100, protein: 4, carbs: 18, fat: 1 },
                        ],
                    },
                });
            }
            if (body.action === 'routine') {
                return route.fulfill({
                    headers: cors, json: {
                        name: 'Pierna express', note: 'Pierna y glúteo en 30 minutos.',
                        exercises: [
                            { exerciseId: 'prensa', sets: 3, repMin: 10, repMax: 12, restSec: 90 },
                            { exerciseId: 'hip-thrust', sets: 3, repMin: 8, repMax: 12, restSec: 90 },
                            { exerciseId: 'curl-femoral', sets: 3, repMin: 10, repMax: 15, restSec: 60 },
                            { exerciseId: 'plancha', sets: 3, repMin: 30, repMax: 45, restSec: 45 },
                        ],
                    },
                });
            }
            if (body.action === 'trainer') return route.fulfill({ headers: cors, json: { text: 'Hoy toca Cuerpo completo A: sentadilla 3×6–10 con 80 kg.' } });
            if (body.action === 'mealplan' && body.text === 'falla') {
                // Long answers arrive as HTTP 200 and carry their error inside.
                return route.fulfill({ headers: cors, body: `   ${JSON.stringify({ error: 'truncated', status: 502, usage })}` });
            }
            if (body.action === 'mealplan') {
                // Each day's dishes carry the day number, so the test can tell the days apart.
                const days = Array.from({ length: 7 }, (_, d) => ({
                    meals: [
                        { slot: 'desayuno', time: '07:30', name: `Avena con huevos ${d + 1}`, foods: ['60 g de avena', '2 huevos revueltos'], kcal: 520, protein: 32, carbs: 55, fat: 18 },
                        { slot: 'almuerzo', time: '13:30', name: `Pollo con arroz ${d + 1}`, foods: ['150 g de pechuga de pollo', '1 taza de arroz'], kcal: 750, protein: 55, carbs: 85, fat: 15 },
                        { slot: 'cena', time: '20:00', name: `Atún con papas ${d + 1}`, foods: ['1 lata de atún', '200 g de papa'], kcal: 600, protein: 40, carbs: 60, fat: 20 },
                    ],
                }));
                return route.fulfill({ headers: cors, json: { name: 'Plan para ganar músculo', note: 'Cocina el arroz para tres días.', days } });
            }
            return route.fulfill({ headers: cors, json: { text: 'Prueba pechuga de pollo (150 g, unos 45 g de proteína) con arroz y verduras.' } });
        }
        if (url.includes('/rest/v1/app_feedback') && req.method() === 'POST') {
            opts.feedback?.push(req.postDataJSON());
            return route.fulfill({ status: 201, headers: cors, body: '' });
        }
        if (url.includes('/rest/v1/ai_reports') && req.method() === 'POST') {
            opts.reports?.push(req.postDataJSON());
            return route.fulfill({ status: 201, headers: cors, body: '' });
        }
        return route.fulfill({ status: 404, headers: cors, body: '' });
    });
};

test('tour: new users see the app guide once, and Ajustes has it, feedback, privacy and every language', async ({ page }) => {
    const feedback: Record<string, unknown>[] = [];
    await mockAi(page, [], { feedback });
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();

    // The tour, right after setting up the plan.
    const tour = page.getByRole('dialog', { name: 'Guía de la app' });
    await expect(tour.getByRole('heading', { name: '¡Bienvenido a Fitness Life!' })).toBeVisible();
    await tour.getByRole('button', { name: 'Siguiente' }).click();
    await expect(tour.getByRole('heading', { name: 'Inicio: tu entreno de hoy' })).toBeVisible();
    for (let i = 0; i < 7; i++) await tour.getByRole('button', { name: 'Siguiente' }).click();
    await expect(tour.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
    await tour.getByRole('button', { name: '¡A entrenar!' }).click();
    await expect(tour).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: '0 de 3 entrenos esta semana' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Guía de la app' })).toHaveCount(0);

    // Ajustes → the guide again, any time.
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await page.getByRole('link', { name: /Guía de la app/ }).click();
    await expect(page.getByRole('heading', { name: '¡Bienvenido a Fitness Life!' })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).click();

    // Privacy policy, inside the app.
    await page.getByRole('link', { name: /Política de privacidad/ }).click();
    await expect(page.getByRole('heading', { name: 'Política de privacidad' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tus comentarios' })).toBeVisible();
    await page.getByRole('button', { name: 'Volver' }).click();

    // Feedback straight from the app.
    await page.getByRole('link', { name: /Enviar comentarios/ }).click();
    await page.getByRole('radio', { name: 'Un problema' }).click();
    await page.getByRole('radio', { name: '4 de 5 estrellas' }).click();
    await page.getByRole('textbox', { name: 'Tu mensaje' }).fill('El temporizador no suena con el móvil en silencio');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText('¡Gracias! Recibimos tu mensaje')).toBeVisible();
    expect(feedback[0]).toMatchObject({ kind: 'problem', rating: 4, message: 'El temporizador no suena con el móvil en silencio', lang: 'es', platform: 'web' });

    // Every language, with a notice in the new one.
    await page.getByRole('button', { name: /Español/ }).click();
    const languages = page.getByRole('dialog', { name: 'Idioma' });
    await expect(languages.getByRole('radio')).toHaveCount(15);
    await languages.getByRole('textbox', { name: 'Buscar idioma' }).fill('fren');
    await languages.getByRole('radio', { name: /Français/ }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('button', { name: /Français/ })).toBeVisible();
    await page.getByRole('button', { name: /Français/ }).click();
    await page.getByRole('radio', { name: /Español/ }).click();
    await expect(page.getByText('Idioma cambiado a Español')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});

test('nutrition: targets, meals by hand and with AI, and the AI coach (Premium)', async ({ page }) => {
    const calls: Record<string, unknown>[] = [];
    const reports: Record<string, unknown>[] = [];
    await mockAi(page, calls, { premium: true, reports });
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Nutrición', exact: true }).click();

    // From the sign-up answers (man, 30, 180 cm, 80 kg, a bit active, "Ganar músculo"):
    // Mifflin-St Jeor 1780 × 1.5 + 250 → 2900 kcal, 2 g/kg → 160 g protein.
    await expect(page.getByText('0 de 2900 kcal')).toBeVisible();
    await expect(page.getByText('0 / 160 g')).toBeVisible();

    // By hand: calories worked out from the macros.
    await page.getByRole('button', { name: 'Añadir comida' }).click();
    await page.getByRole('tab', { name: 'Manual' }).click();
    await page.getByLabel('Nombre').fill('Batido de proteína');
    await page.getByLabel('Proteína (g)').fill('25');
    await page.getByLabel('Carbohidratos (g)').fill('5');
    await page.getByLabel('Grasa (g)').fill('2');
    await page.getByRole('dialog').getByRole('button', { name: 'Añadir' }).click();
    await expect(page.getByText('Batido de proteína')).toBeVisible();
    await expect(page.getByText('138 de 2900 kcal')).toBeVisible();

    // With AI: describe it, review the estimate, add it.
    await page.getByRole('button', { name: 'Añadir comida' }).click();
    await page.getByLabel('Describe lo que comiste').fill('2 huevos revueltos y una tostada');
    await page.getByRole('button', { name: 'Calcular con IA' }).click();
    await expect(page.getByText('Desayuno de huevos')).toBeVisible();
    await expect(page.getByText('280 kcal · P 17 g · C 19 g · G 14 g')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reportar este resultado' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Añadir' }).click();
    await expect(page.getByText('418 de 2900 kcal')).toBeVisible();
    expect(calls[0]).toMatchObject({ action: 'estimate', lang: 'es', text: '2 huevos revueltos y una tostada' });

    // The coach gets the user's goal and what they ate today.
    await page.getByRole('button', { name: '¿Qué ceno para llegar a mi proteína?' }).click();
    await expect(page.getByText(/pechuga de pollo/)).toBeVisible();
    expect(calls[1]).toMatchObject({
        action: 'chat', lang: 'es',
        context: { goal: 'musculo', weightKg: 80, targets: { kcal: 2900, protein: 160 }, today: { kcal: 418, protein: 42 }, sex: 'hombre', age: 30, heightCm: 180, activity: 'ligero' },
        messages: [{ role: 'user', text: '¿Qué ceno para llegar a mi proteína?' }],
    });

    // Any AI answer can be reported, with a reason and optional details.
    await page.getByRole('button', { name: 'Reportar esta respuesta' }).click();
    const sheet = page.getByRole('dialog', { name: 'Reportar respuesta de la IA' });
    await expect(sheet.getByRole('button', { name: 'Enviar reporte' })).toBeDisabled();
    await sheet.getByRole('radio', { name: 'Peligrosa para la salud' }).click();
    await sheet.getByLabel('Detalles (opcional)').fill('No tiene en cuenta mi alergia');
    await sheet.getByRole('button', { name: 'Enviar reporte' }).click();
    await expect(page.getByText('Gracias, lo revisaremos')).toBeVisible();
    await expect(sheet).toBeHidden();
    expect(reports).toEqual([expect.objectContaining({
        kind: 'coach', reason: 'harmful', note: 'No tiene en cuenta mi alergia',
        question: '¿Qué ceno para llegar a mi proteína?', content: expect.stringContaining('pechuga de pollo'),
    })]);

    // Everything stays after a reload.
    await page.reload();
    await expect(page.getByText(/pechuga de pollo/)).toBeVisible();
    await expect(page.getByText('418 de 2900 kcal')).toBeVisible();
});

const AI_FAILED = 'Algo falló al consultar al asistente. Inténtalo de nuevo.';

test('AI meal plan (Premium): made for the user, shown by day in order, and logged with one tap', async ({ page }) => {
    const calls: Record<string, unknown>[] = [];
    await mockAi(page, calls, { premium: true });
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Nutrición', exact: true }).click();

    await page.getByRole('button', { name: /Crea tu plan de comidas con IA/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Plan de comidas con IA' });
    // A failure on the server is told, and nothing is saved.
    await sheet.getByLabel('¿Algo que debamos saber? (opcional)').fill('falla');
    await sheet.getByRole('button', { name: 'Crear mi plan' }).click();
    await expect(page.getByText(AI_FAILED)).toBeVisible();
    await expect(sheet).toBeVisible();
    await sheet.getByRole('radio', { name: '3 comidas' }).click();
    await sheet.getByLabel('¿Algo que debamos saber? (opcional)').fill('no como cerdo');
    await sheet.getByRole('button', { name: 'Comida económica' }).click();
    await sheet.getByRole('button', { name: 'Crear mi plan' }).click();
    await expect(page.getByText('Plan de comidas guardado')).toBeVisible();
    expect(calls.filter(c => c.action === 'mealplan').at(-1)).toMatchObject({
        action: 'mealplan', lang: 'es', mealsPerDay: 3, text: 'no como cerdo, Comida económica',
        context: { goal: 'musculo', targets: { kcal: 2900, protein: 160 } },
    });

    // Today's menu, in order, with the amounts.
    const today = (new Date().getDay() + 6) % 7 + 1;
    await expect(page.getByText('Plan para ganar músculo')).toBeVisible();
    await expect(page.getByText('Hoy te toca')).toBeVisible();
    await expect(page.getByText(`Avena con huevos ${today}`)).toBeVisible();
    await expect(page.getByText('150 g de pechuga de pollo').first()).toBeVisible();
    await expect(page.getByText('Total del día: 1870 kcal · P 127 g · C 200 g · G 53 g')).toBeVisible();
    const times = await page.locator('ol li > span.tabular-nums').allTextContents();
    expect(times).toEqual(['07:30', '13:30', '20:00']);

    // One tap logs a meal of today; it counts toward the day's calories.
    await page.getByRole('button', { name: `Anotar Pollo con arroz ${today} como comido` }).click();
    await expect(page.getByText(`Anotado: Pollo con arroz ${today}`)).toBeVisible();
    await expect(page.getByText('750 de 2900 kcal')).toBeVisible();
    await expect(page.getByText('Anotado', { exact: true })).toBeVisible();

    // Other days show their own menu, without logging buttons.
    const other = today === 7 ? 1 : today + 1;
    await page.getByRole('tablist', { name: 'Días de la semana' }).getByRole('tab').nth(other - 1).click();
    await expect(page.getByText(`Cena`).first()).toBeVisible();
    await expect(page.getByText(`Atún con papas ${other}`)).toBeVisible();
    await expect(page.getByRole('button', { name: /como comido/ })).toHaveCount(0);

    // Reminders can be turned off; the plan stays after a reload.
    const reminders = page.getByRole('switch', { name: 'Avisos de cada comida' });
    await expect(reminders).toHaveAttribute('aria-checked', 'true');
    await reminders.click();
    await expect(reminders).toHaveAttribute('aria-checked', 'false');
    await page.reload();
    await expect(page.getByText(`Avena con huevos ${today}`)).toBeVisible();
    await expect(page.getByText('Anotado', { exact: true })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Avisos de cada comida' })).toHaveAttribute('aria-checked', 'false');

    // It can be deleted.
    await page.getByRole('button', { name: 'Borrar plan de comidas' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Borrar' }).click();
    await expect(page.getByRole('button', { name: /Crea tu plan de comidas con IA/ })).toBeVisible();
});

test('nutrition: water for the day and saved recipes', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Nutrición', exact: true }).click();

    // 80 kg × 35 ml = 2800 → 3 L (12 glasses); the "muscle" diet is 2 g/kg of protein: +250 ml.
    await expect(page.getByLabel('Agua: 0 de 3,25 litros')).toBeVisible();
    await expect(page.getByText('+ 250 ml por tu dieta alta en proteína')).toBeVisible();
    await page.getByRole('button', { name: 'Añadir un vaso de agua (250 ml)' }).click();
    await page.getByRole('button', { name: 'Añadir un vaso de agua (250 ml)' }).click();
    await expect(page.getByLabel('Agua: 0,5 de 3,25 litros')).toBeVisible();
    await expect(page.getByText('Te faltan 11 vasos para tu meta de hoy')).toBeVisible();
    await page.getByRole('button', { name: 'Quitar un vaso' }).click();
    await expect(page.getByLabel('Agua: 0,25 de 3,25 litros')).toBeVisible();

    // A recipe with its macros per serving, logged with one tap.
    await page.getByRole('button', { name: /Guarda tus recetas/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Nueva receta' });
    await sheet.getByLabel('Nombre').fill('Pancakes de avena');
    await sheet.getByLabel('Porciones que salen').fill('2');
    await sheet.getByLabel('Ingredientes (uno por línea)').fill('80 g de avena\n1 plátano\n2 huevos');
    await sheet.getByLabel('Proteína (g)').fill('15');
    await sheet.getByLabel('Carbohidratos (g)').fill('40');
    await sheet.getByLabel('Grasa (g)').fill('8');
    await sheet.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Receta guardada')).toBeVisible();
    await page.getByRole('button', { name: 'Anotar una porción de Pancakes de avena' }).click();
    await expect(page.getByText('292 de 2900 kcal')).toBeVisible();
    await page.locator('button[aria-expanded]', { hasText: 'Pancakes de avena' }).click();
    await expect(page.getByText('Salen 2 porciones', { exact: false })).toBeVisible();
    await expect(page.getByText('1 plátano')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Agua: 0,25 de 3,25 litros')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Anotar una porción de Pancakes de avena' })).toBeVisible();
});

test('movement: a walk of the walking plan with GPS, a ride by hand, steps and sleep', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 40.4168, longitude: -3.7038, accuracy: 5 });
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: /Movimiento/ }).click();
    await expect(page.getByRole('heading', { name: 'Movimiento' })).toBeVisible();
    await expect(page.getByLabel('0 pasos hoy')).toBeVisible();

    // A walking plan, and its first walk recorded with the GPS.
    await page.getByRole('button', { name: /¿Solo quieres caminar\?/ }).click();
    await page.getByRole('button', { name: /Empieza a caminar/ }).click();
    await expect(page.getByText('Semana 1 de 4')).toBeVisible();
    await expect(page.getByText('Caminata 1: 15 minutos')).toBeVisible();
    await expect(page.getByText('de 5000')).toBeVisible(); // the plan's step goal
    await page.getByRole('button', { name: 'Empezar caminata' }).click();
    await expect(page.getByText('Meta: 15 minutos')).toBeVisible();
    await expect(page.getByText('GPS listo')).toBeVisible();
    // About 27 m north at a walking pace (3.3 m a second); faster would be a GPS jump.
    for (let i = 1; i <= 8; i++) {
        await page.waitForTimeout(1100);
        await context.setGeolocation({ latitude: 40.4168 + i * 0.00003, longitude: -3.7038, accuracy: 5 });
    }
    await expect(page.getByLabel(/Distancia: 0\.0[23] km/)).toBeVisible();
    await page.getByRole('button', { name: 'Terminar' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Terminar' }).click();
    // Saved, but a few seconds of a 15-minute walk don't count for the plan.
    await expect(page.getByText('Guardado. Para que cuente en tu plan, camina al menos el 80 % de los 15 min.')).toBeVisible();
    await expect(page.getByText('0 de 3 caminatas esta semana', { exact: false }).or(page.getByLabel('0 de 3 caminatas esta semana'))).toBeVisible();
    await expect(page.getByText(/0,0[23] km/).first()).toBeVisible();
    // Without a step counter, the walk's steps count for the day (27 m / 74.7 cm ≈ 36).
    await expect(page.getByLabel(/^[23]\d pasos hoy$/)).toBeVisible();

    // A ride typed in, in km.
    await page.getByRole('button', { name: 'Añadir a mano' }).click();
    const sheet = page.getByRole('dialog', { name: 'Añadir a mano' });
    await sheet.getByRole('radio', { name: 'Bicicleta' }).click();
    await sheet.getByLabel('Distancia (km)').fill('12,5');
    await sheet.getByLabel('Minutos').fill('40');
    await sheet.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('12,50 km')).toBeVisible();
    await expect(page.getByText(/18,8 km\/h/)).toBeVisible();

    // Sleep typed in.
    await page.getByRole('button', { name: 'Anotar sueño' }).click();
    const sleep = page.getByRole('dialog', { name: 'Anotar sueño' });
    await sleep.getByLabel('Me dormí').fill('23:30');
    await sleep.getByLabel('Me desperté').fill('07:00');
    await expect(sleep.getByText('7,5 h')).toBeVisible();
    await sleep.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('¡Buen descanso!', { exact: false })).toBeVisible();

    // Everything stays.
    await page.reload();
    await expect(page.getByText('12,50 km')).toBeVisible();
    await expect(page.getByText('7,5 h').first()).toBeVisible();
});

test('AI personal trainer (Premium): chat with the plan as context and a routine saved from AI', async ({ page }) => {
    const calls: Record<string, unknown>[] = [];
    const reports: Record<string, unknown>[] = [];
    await mockAi(page, calls, { premium: true, reports });
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: /Entrenador IA/ }).click();
    await expect(page.getByRole('heading', { name: /Entrenador IA/ })).toBeVisible();

    await page.getByRole('button', { name: '¿Qué entreno hoy y con cuánto peso?' }).click();
    await expect(page.getByText('Hoy toca Cuerpo completo A: sentadilla 3×6–10 con 80 kg.')).toBeVisible();
    const chat = calls.find(c => c.action === 'trainer') as { context: { goal: string; level: string; setup: string; plan: string; history: string }; messages: unknown[] };
    expect(chat.context).toMatchObject({ goal: 'musculo', level: 'intermedio', setup: 'gimnasio' });
    expect(chat.context.plan).toContain('Cuerpo completo A');
    expect(chat.context.history).toContain('Workouts logged: 0');
    expect(chat.messages).toEqual([{ role: 'user', text: '¿Qué entreno hoy y con cuánto peso?' }]);

    // Answers can be reported.
    await page.getByRole('button', { name: 'Reportar esta respuesta' }).click();
    const report = page.getByRole('dialog', { name: 'Reportar respuesta de la IA' });
    await report.getByRole('radio', { name: /Incorrecta/ }).click();
    await report.getByRole('button', { name: 'Enviar reporte' }).click();
    await expect.poll(() => reports.length).toBe(1);
    expect(reports[0]).toMatchObject({ kind: 'trainer' });

    // A routine from AI, saved to "my routines".
    await page.getByRole('button', { name: /Crear rutina con IA/ }).click();
    await page.getByLabel('¿Qué rutina quieres?').fill('30 minutos de pierna');
    await page.getByRole('button', { name: 'Crear rutina', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Pierna express')).toBeVisible();
    await expect(dialog.getByText('Hip thrust')).toBeVisible();
    const routine = calls.find(c => c.action === 'routine') as { text: string; exercises: { id: string }[] };
    expect(routine.text).toBe('30 minutos de pierna');
    expect(routine.exercises.map(e => e.id)).toContain('prensa');
    await dialog.getByRole('button', { name: 'Guardar en mis rutinas' }).click();
    await expect(page.getByText('Rutina guardada: Pierna express')).toBeVisible();
    await expect(page.getByRole('link', { name: /Pierna express/ })).toBeVisible();
});

test('the AI trainer is Premium-only', async ({ page }) => {
    const calls: Record<string, unknown>[] = [];
    await mockAi(page, calls);
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: /Entrenador IA/ }).click();
    await expect(page.getByText(/Tu entrenador personal con IA es parte de Premium/)).toBeVisible();
    await expect(page.getByLabel('Pregúntale a tu entrenador…')).toHaveCount(0);
});

test('free users: AI is Premium-only, with yearly and monthly plans', async ({ page }) => {
    const calls: Record<string, unknown>[] = [];
    await mockAi(page, calls);
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Nutrición', exact: true }).click();

    // The coach shows what Premium unlocks instead of the chat.
    await expect(page.getByText(/Pregúntale qué comer según tu objetivo/)).toBeVisible();
    await expect(page.getByText('Desde 3,33 US$/mes')).toBeVisible();
    await expect(page.getByLabel('Escribe tu pregunta')).toHaveCount(0);

    // Meals open by hand; the AI tab leads to Premium.
    await page.getByRole('button', { name: 'Añadir comida' }).click();
    await expect(page.getByRole('tab', { name: 'Manual' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: 'Con IA' }).click();
    await expect(page.getByText(/Es parte de Premium/)).toBeVisible();
    await page.getByRole('dialog').getByRole('link', { name: 'Desbloquear con Premium' }).click();

    await expect(page.getByRole('heading', { name: 'Fitness Life Premium' })).toBeVisible();
    const yearly = page.getByRole('radio', { name: /Anual/ });
    await expect(yearly).toHaveAttribute('aria-checked', 'true');
    await expect(yearly).toContainText('39,99 US$');
    await expect(yearly).toContainText('Ahorra 33%');
    await expect(yearly).toContainText('Solo 3,33 US$/mes');
    await expect(page.getByText(/Suscripción anual de 39,99\sUS\$/)).toBeVisible();
    await page.getByRole('radio', { name: /Mensual/ }).click();
    await expect(page.getByText(/Suscripción mensual de 4,99\sUS\$/)).toBeVisible();
    await expect(page.getByRole('row', { name: /Coach de nutrición con IA/ }).getByLabel('No incluido')).toBeVisible();
    await expect(page.getByText(/hasta 300 consultas de IA al mes/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Términos de uso' })).toHaveAttribute('href', './legal.html#terminos');

    // No store reachable in tests: the purchase fails gracefully.
    await page.getByRole('button', { name: 'Suscribirme' }).click();
    await expect(page.getByText('No se pudo completar. Inténtalo de nuevo.')).toBeVisible();
    expect(calls).toHaveLength(0); // free users never reach the AI

    // Settings links to Premium too.
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await page.getByRole('link', { name: /Fitness Life Premium/ }).click();
    await expect(page.getByRole('button', { name: 'Restaurar compras' })).toBeVisible();
});

// A Premium status the store no longer confirms: the server still says no.
test('AI refused by the server opens Premium and keeps the question', async ({ page }) => {
    await mockAi(page, []);
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('fitness-life:v1')!);
        s.premium = { active: true, expiresAt: null, willRenew: false, manageUrl: null, checkedAt: new Date().toISOString() };
        localStorage.setItem('fitness-life:v1', JSON.stringify(s));
    });
    await page.reload();
    await page.getByRole('link', { name: 'Nutrición', exact: true }).click();
    await page.getByRole('button', { name: '¿Qué ceno para llegar a mi proteína?' }).click();
    await expect(page.getByRole('heading', { name: 'Fitness Life Premium' })).toBeVisible();
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByLabel('Escribe tu pregunta')).toHaveValue('¿Qué ceno para llegar a mi proteína?');
});

test('food table: search, filter, details and add to today', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Nutrición', exact: true }).click();
    await page.getByRole('link', { name: /Ver los \d+ alimentos/ }).click();
    await expect(page.getByRole('heading', { name: 'Tabla de alimentos' })).toBeVisible();

    // Fish only.
    await page.getByRole('radio', { name: /Pescados y mariscos/ }).click();
    await expect(page.getByRole('button', { name: /Salmón cocido/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Huevo entero/ })).toHaveCount(0);
    await page.getByRole('radio', { name: 'Todos' }).click();

    // Accents and case don't matter.
    await page.getByLabel('Buscar alimento (huevo, pollo, arroz…)').fill('HUEVO');
    await page.getByRole('button', { name: /Huevo entero/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Huevo entero' });
    await expect(sheet).toContainText('72 kcal');
    await expect(sheet.getByText('6,3 g')).toBeVisible();
    await expect(sheet.getByText('Bajo en carbohidratos')).toBeVisible();
    await sheet.getByRole('radio', { name: '100 g' }).click();
    await expect(sheet).toContainText('143 kcal');
    await sheet.getByRole('button', { name: 'Añadir a mis comidas de hoy' }).click();

    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByText('Huevo entero (100 g)')).toBeVisible();
    await expect(page.getByText('143 kcal').first()).toBeVisible();
});

// Fake Supabase Auth and the cloud copy table.
const mockAccount = async (page: Page, cloud: { row: Record<string, unknown> | null; pushed: Record<string, unknown>[] }) => {
    await page.route('https://api.revenuecat.com/**', route => route.abort());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const user = {
        id: '00000000-0000-0000-0000-0000000000aa', aud: 'authenticated', role: 'authenticated', email: 'sebas@example.com', is_anonymous: false,
        app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [{ id: 'i1', provider: 'email' }],
        created_at: '2026-10-08T10:00:00Z',
    };
    const session = () => ({ access_token: 'token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'refresh', user });
    await page.route('http://ai.test/**', async route => {
        const req = route.request();
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        const url = req.url();
        if (url.includes('/auth/v1/settings')) return route.fulfill({ headers: cors, json: { external: { email: true, google: true, facebook: true, apple: false } } });
        // Anonymous sign-in (a sign-up without e-mail) gets an anonymous user, like Supabase.
        if (url.includes('/auth/v1/signup') && !(req.postDataJSON() as { email?: string } | null)?.email) {
            return route.fulfill({ headers: cors, json: { ...session(), user: { ...user, id: '00000000-0000-0000-0000-0000000000bb', email: null, is_anonymous: true, app_metadata: { provider: 'anonymous' }, identities: [] } } });
        }
        if (url.includes('/auth/v1/signup') || url.includes('/auth/v1/token')) return route.fulfill({ headers: cors, json: session() });
        if (url.includes('/rest/v1/user_data')) {
            if (req.method() === 'GET') return route.fulfill({ headers: cors, json: cloud.row ? [cloud.row] : [] });
            cloud.pushed.push(req.postDataJSON());
            return route.fulfill({ status: 201, headers: cors, body: '' });
        }
        if (url.includes('/functions/v1/nutrition-coach')) return route.fulfill({ headers: cors, json: { usage: { used: 0, limit: 0, premium: false } } });
        return route.fulfill({ status: 404, headers: cors, body: '' });
    });
};

test('a new account can start from scratch instead of keeping this phone\'s data', async ({ page }) => {
    const cloud: { row: Record<string, unknown> | null; pushed: Record<string, unknown>[] } = { row: null, pushed: [] };
    await mockAccount(page, cloud);
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await page.getByRole('link', { name: /Crear cuenta o iniciar sesión/ }).click();
    await page.getByLabel('Correo electrónico').fill('sebas@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('secreto123');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    // The account is new and the phone has a plan: the user chooses.
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByText('Tu cuenta es nueva')).toBeVisible();
    await dialog.getByRole('button', { name: 'Empezar de cero' }).click();
    await expect(page.getByRole('heading', { name: 'Tu plan de fuerza en 1 minuto' })).toBeVisible();
});

test('account: sign up, cloud copy, and sign in on another phone', async ({ page, browser }) => {
    const cloud: { row: Record<string, unknown> | null; pushed: Record<string, unknown>[] } = { row: null, pushed: [] };
    await mockAccount(page, cloud);
    await page.goto('/');
    await page.getByRole('button', { name: 'Empezar gratis' }).click();
    await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar con Facebook' })).toBeVisible();
    await page.getByLabel('Correo electrónico').fill('sebas@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('secreto123');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    // A new account has nothing in the cloud yet: the plan questions follow.
    await answerPlanQuestions(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await expect(page.getByText('sebas@example.com').first()).toBeVisible();
    await expect(page.getByText('Sesión iniciada con correo')).toBeVisible();

    // The data goes to the account a moment later.
    await expect.poll(() => cloud.pushed.length, { timeout: 10_000 }).toBeGreaterThan(0);
    const pushed = cloud.pushed.at(-1)! as { user_id: string; data: { profile: unknown; routines: unknown[] }; updated_at: string };
    expect(pushed.user_id).toBe('00000000-0000-0000-0000-0000000000aa');
    expect(pushed.data.profile).toBeTruthy();
    expect(pushed.data.routines.length).toBeGreaterThan(0);

    // Signing out keeps the data in the account and leaves this phone clean.
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByText('Sesión cerrada')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /Entrena con un plan/ })).toBeVisible();

    // Another phone: sign in and the plan comes back, no questions.
    const other = await (await browser.newContext({ locale: 'es-ES' })).newPage();
    const cloud2 = { row: { data: pushed.data, updated_at: pushed.updated_at }, pushed: [] };
    await mockAccount(other, cloud2);
    await other.goto('/');
    await other.getByRole('button', { name: '¿Ya tienes cuenta? Inicia sesión' }).click();
    await expect(other.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
    await other.getByLabel('Correo electrónico').fill('sebas@example.com');
    await other.getByLabel('Contraseña', { exact: true }).fill('secreto123');
    await other.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(other.getByRole('heading', { name: '0 de 3 entrenos esta semana' })).toBeVisible();
    await other.close();
});

test('meal from a photo (Premium) and a profile picture', async ({ page }) => {
    const calls: Record<string, unknown>[] = [];
    await mockAi(page, calls, { premium: true });
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Nutrición', exact: true }).click();

    await page.getByRole('button', { name: 'Añadir comida' }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('dialog').getByRole('button', { name: 'Galería' }).click();
    await (await chooser).setFiles(fixture('meal.jpg'));
    await expect(page.getByRole('img', { name: 'Foto de tu comida' })).toBeVisible();
    await page.getByLabel('Detalles (opcional)').fill('con aceite');
    await page.getByRole('button', { name: 'Calcular con IA' }).click();
    await expect(page.getByText('Desayuno de huevos')).toBeVisible();
    const photoCall = calls.at(-1) as { action: string; mediaType: string; image: string; text: string };
    expect(photoCall).toMatchObject({ action: 'photo', mediaType: 'image/jpeg', text: 'con aceite' });
    expect(photoCall.image.length).toBeGreaterThan(500);
    await page.getByRole('dialog').getByRole('button', { name: 'Añadir' }).click();
    await expect(page.getByText('Desayuno de huevos')).toBeVisible();

    // Profile picture: shown in Ajustes and on Inicio.
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await page.getByRole('button', { name: 'Foto de perfil' }).click();
    const chooser2 = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Elegir de la galería' }).click();
    await (await chooser2).setFiles(fixture('face.jpg'));
    await expect(page.getByText('Foto de perfil actualizada')).toBeVisible();
    await expect(page.locator('img[src^="data:image/jpeg"]').first()).toBeVisible();
    await page.getByRole('link', { name: 'Inicio', exact: true }).click();
    await expect(page.locator('header img[src^="data:image/jpeg"]')).toBeVisible();
});

test('community: read, like, comment and post', async ({ page }) => {
    const cloud = { row: null, pushed: [] as Record<string, unknown>[] };
    await mockAccount(page, cloud);
    const sent: { url: string; method: string; body: unknown }[] = [];
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const posts = [{
        id: 'p1', body: '¡Nuevo récord en sentadilla! 100 kg', image_path: null, created_at: new Date(Date.now() - 3600_000).toISOString(),
        user_id: 'ana', author: { name: 'Ana', avatar_path: null, updated_at: '2026-10-08T10:00:00Z' },
        community_likes: [{ count: 2 }], community_comments: [{ count: 1 }],
    }];
    await page.route(/http:\/\/ai\.test\/(rest\/v1\/community_|storage\/v1\/)/, async route => {
        const req = route.request();
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        const url = req.url();
        if (req.method() !== 'GET') {
            sent.push({ url, method: req.method(), body: req.postData() ? (() => { try { return req.postDataJSON(); } catch { return null; } })() : null });
            return route.fulfill({ status: url.includes('/storage/') ? 200 : 201, headers: cors, json: url.includes('/storage/') ? { Key: 'k' } : [] });
        }
        // Like the real database: posts and profiles are linked directly and
        // through likes and comments, so the author embed must name its key.
        if (/author:community_profiles\(/.test(decodeURIComponent(url))) {
            return route.fulfill({ status: 300, headers: cors, json: { code: 'PGRST201', message: "Could not embed because more than one relationship was found for 'community_posts' and 'community_profiles'" } });
        }
        if (url.includes('community_posts')) return route.fulfill({ headers: cors, json: posts });
        if (url.includes('community_likes')) return route.fulfill({ headers: cors, json: [] });
        if (url.includes('community_comments')) {
            return route.fulfill({ headers: cors, json: [{ id: 'c1', body: '¡Bestia!', created_at: new Date().toISOString(), user_id: 'leo', author: { name: 'Leo', avatar_path: null, updated_at: '2026-10-08T10:00:00Z' } }] });
        }
        return route.fulfill({ headers: cors, json: [] });
    });

    // Without an account: read only.
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Comunidad', exact: true }).click();
    await expect(page.getByText('¡Nuevo récord en sentadilla! 100 kg')).toBeVisible();
    await expect(page.getByText('Únete a la comunidad')).toBeVisible();

    // Sign up from there.
    await page.getByRole('link', { name: 'Crear cuenta o iniciar sesión' }).click();
    await page.getByRole('button', { name: '¿No tienes cuenta? Créala gratis' }).click();
    await page.getByLabel('Correo electrónico').fill('sebas@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('secreto123');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    // The new account keeps the plan this phone already has.
    await page.getByRole('alertdialog').getByRole('button', { name: 'Guardar mis datos' }).click();
    await page.getByRole('link', { name: 'Comunidad', exact: true }).click();

    // Like.
    const like = page.getByRole('button', { name: 'Me gusta' });
    await expect(like).toContainText('2');
    await like.click();
    await expect(like).toContainText('3');
    await expect.poll(() => sent.some(r => r.url.includes('community_likes') && r.method === 'POST')).toBe(true);

    // Comment (the rules are accepted once).
    await page.getByRole('button', { name: 'Comentarios' }).click();
    await expect(page.getByText('¡Bestia!')).toBeVisible();
    await page.getByLabel('Escribe un comentario…').fill('¡Vamos!');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByRole('alertdialog', { name: 'Normas de la comunidad' })).toBeVisible();
    await page.getByRole('button', { name: 'Acepto' }).click();
    await expect.poll(() => sent.find(r => r.url.includes('community_comments'))?.body).toMatchObject({ post_id: 'p1', body: '¡Vamos!' });
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();

    // A new post with a photo; the profile is published first.
    await page.getByRole('button', { name: /Comparte tu progreso/ }).click();
    await page.getByRole('textbox', { name: /Comparte tu progreso/ }).fill('Semana 1 completada 💪');
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('dialog').getByRole('button', { name: 'Galería' }).click();
    await (await chooser).setFiles(fixture('meal.jpg'));
    await page.getByRole('button', { name: 'Publicar' }).click();
    await expect(page.getByText('¡Publicado!')).toBeVisible();
    expect(sent.some(r => r.url.includes('community_profiles'))).toBe(true);
    expect(sent.some(r => r.url.includes('/storage/v1/object/community/'))).toBe(true);
    expect(sent.find(r => r.url.includes('community_posts'))?.body).toMatchObject({ body: 'Semana 1 completada 💪' });

    // Report and block someone else's post.
    await page.getByRole('button', { name: 'Opciones' }).first().click();
    await page.getByRole('button', { name: /Bloquear a Ana/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Bloquear a' }).click();
    await expect(page.getByText('¡Nuevo récord en sentadilla! 100 kg')).toHaveCount(0);
});

// Onboarding, then an account made from the community (keeping this phone's plan).
const signUpWithAccount = async (page: Page) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Comunidad', exact: true }).click();
    await page.getByRole('link', { name: 'Crear cuenta o iniciar sesión' }).click();
    await page.getByRole('button', { name: '¿No tienes cuenta? Créala gratis' }).click();
    await page.getByLabel('Correo electrónico').fill('sebas@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('secreto123');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Guardar mis datos' }).click();
};

test('community: stories, following someone with a private profile, and my own private profile', async ({ page }) => {
    const ME = '00000000-0000-0000-0000-0000000000aa';
    const cloud = { row: null, pushed: [] as Record<string, unknown>[] };
    await mockAccount(page, cloud);
    const sent: { url: string; method: string; body: unknown }[] = [];
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range' };
    const ana = { name: 'Ana', avatar_path: null, updated_at: '2026-10-08T10:00:00Z' };
    let anaFollow: string | null = null; // my follow of Ana: null, 'pending' or 'accepted'
    let myPrivate = false;
    const leoRequest = [{ follower: 'leo', created_at: new Date().toISOString(), author: { name: 'Leo', avatar_path: null, updated_at: '2026-10-08T10:00:00Z' } }];
    let requests = leoRequest;
    const anaPost = {
        id: 'p1', body: 'Día de pierna 🦵', image_path: null, created_at: new Date(Date.now() - 3600_000).toISOString(),
        user_id: 'ana', author: ana, community_likes: [{ count: 0 }], community_comments: [{ count: 0 }],
    };
    await page.route(/http:\/\/ai\.test\/(rest\/v1\/(rpc\/)?community_|storage\/v1\/)/, async route => {
        const req = route.request();
        const method = req.method();
        if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        const url = decodeURIComponent(req.url());
        // The "Following" feed, matched on the server.
        if (url.includes('/rpc/community_following_posts')) return route.fulfill({ headers: cors, json: anaFollow === 'accepted' ? [anaPost] : [] });
        if (method === 'HEAD') {
            const n = url.includes('community_follows') && url.includes('following=eq.ana') ? (anaFollow === 'accepted' ? 13 : 12)
                : url.includes('community_follows') && url.includes('follower=eq.ana') ? 7
                    : url.includes('community_posts') ? 1 : 0;
            return route.fulfill({ status: 200, headers: { ...cors, 'content-range': `0-0/${n}` }, body: '' });
        }
        if (method !== 'GET') {
            const body = req.postData() ? (() => { try { return req.postDataJSON(); } catch { return null; } })() : null;
            sent.push({ url, method, body });
            if (url.includes('community_follows') && method === 'POST') anaFollow = 'pending';
            if (url.includes('community_follows') && method === 'PATCH') requests = [];
            if (url.includes('community_profiles') && method === 'PATCH') {
                myPrivate = (body as { is_private: boolean }).is_private;
                return route.fulfill({ status: 200, headers: cors, json: [{ id: ME }] }); // the updated row
            }
            return route.fulfill({ status: url.includes('/storage/') ? 200 : 201, headers: cors, json: url.includes('/storage/') ? { Key: 'k' } : [] });
        }
        if (url.includes('community_stories')) {
            return route.fulfill({ headers: cors, json: [
                { id: 's1', user_id: 'ana', image_path: 'ana/stories/s1.jpg', caption: 'Rumbo al gym 💪', created_at: new Date(Date.now() - 7200_000).toISOString(), author: ana },
            ] });
        }
        if (url.includes('/rest/v1/community_profiles') && url.includes('id=eq.ana')) return route.fulfill({ headers: cors, json: [{ ...ana, id: 'ana', is_private: true }] });
        if (url.includes('/rest/v1/community_profiles') && url.includes(`id=eq.${ME}`)) return route.fulfill({ headers: cors, json: [{ is_private: myPrivate }] });
        if (url.includes('community_follows')) {
            if (url.includes('following=eq.ana') && url.includes(`follower=eq.${ME}`)) return route.fulfill({ headers: cors, json: anaFollow ? [{ status: anaFollow }] : [] });
            if (url.includes(`following=eq.${ME}`) && url.includes('status=eq.pending')) return route.fulfill({ headers: cors, json: requests });
            return route.fulfill({ headers: cors, json: [] });
        }
        if (url.includes('community_posts')) return route.fulfill({ headers: cors, json: url.includes('user_id=eq.ana') && anaFollow !== 'accepted' ? [] : [anaPost] });
        return route.fulfill({ headers: cors, json: [] });
    });
    await page.route('http://ai.test/storage/v1/object/public/**', route => route.fulfill({ path: fixture('meal.jpg') }));

    await signUpWithAccount(page);
    await page.getByRole('link', { name: 'Comunidad', exact: true }).click();

    // A story at the top: opens full screen, with its caption.
    await page.getByRole('button', { name: 'Historia de Ana' }).click();
    const viewer = page.getByRole('dialog', { name: 'Historia de Ana' });
    await expect(viewer.getByText('Rumbo al gym 💪')).toBeVisible();
    await viewer.getByRole('button', { name: 'Cerrar' }).click();
    await expect(viewer).toBeHidden();

    // My own story: a photo and a caption.
    await page.getByRole('button', { name: 'Nueva historia' }).click();
    const composer = page.getByRole('dialog', { name: 'Nueva historia' });
    const chooser = page.waitForEvent('filechooser');
    await composer.getByRole('button', { name: 'Galería' }).click();
    await (await chooser).setFiles(fixture('meal.jpg'));
    await composer.getByLabel('Escribe algo (opcional)').fill('Mi primera historia');
    await composer.getByRole('button', { name: 'Compartir historia' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Acepto' }).click();
    await expect(page.getByText('¡Historia publicada! Dura 24 horas')).toBeVisible();
    expect(sent.find(r => r.url.includes('community_stories'))?.body).toMatchObject({ user_id: ME, caption: 'Mi primera historia' });
    expect(sent.some(r => r.url.includes('/storage/v1/object/community/') && r.url.includes('/stories/'))).toBe(true);

    // Ana's profile is private: ask to follow.
    await page.getByRole('link', { name: /Ana/ }).first().click();
    await expect(page.getByText('Esta cuenta es privada')).toBeVisible();
    await expect(page.getByText('12', { exact: true })).toBeVisible(); // followers
    await page.getByRole('button', { name: 'Seguir' }).click();
    await expect(page.getByText(/Solicitud enviada/)).toBeVisible();
    expect(sent.find(r => r.url.includes('community_follows') && r.method === 'POST')?.body).toMatchObject({ follower: ME, following: 'ana' });
    await expect(page.getByRole('button', { name: 'Solicitado' })).toBeVisible();

    // Once Ana accepts, her posts show.
    anaFollow = 'accepted';
    await page.reload();
    await expect(page.getByText('Día de pierna 🦵')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Siguiendo' })).toBeVisible();

    // The "Following" feed has her post.
    await page.getByRole('link', { name: 'Comunidad', exact: true }).click();
    await page.getByRole('tab', { name: 'Siguiendo' }).click();
    await expect(page.getByText('Día de pierna 🦵')).toBeVisible();
    await page.getByRole('tab', { name: 'Siguiendo' }).click(); // the same tab again keeps the posts
    await expect(page.getByText('Día de pierna 🦵')).toBeVisible();

    // My profile: private, and Leo's request accepted.
    await expect(page.getByText('1 solicitudes para seguirte')).toBeVisible();
    await page.getByRole('link', { name: 'Mi perfil' }).click();
    await page.getByRole('switch', { name: 'Perfil privado' }).click();
    await expect(page.getByText('Tu perfil ahora es privado')).toBeVisible();
    expect(sent.find(r => r.url.includes('community_profiles') && r.method === 'PATCH')?.body).toEqual({ is_private: true });
    await page.getByRole('button', { name: 'Aceptar a Leo' }).click();
    await expect(page.getByText('Leo ahora te sigue')).toBeVisible();
    expect(sent.find(r => r.url.includes('community_follows') && r.method === 'PATCH')).toMatchObject({ body: { status: 'accepted' } });
    expect(sent.find(r => r.url.includes('community_follows') && r.method === 'PATCH')!.url).toContain('follower=eq.leo');
});

// Newer Chrome (Android, 2026) returns a Promise from window.scrollTo. An
// effect that returned it broke every tab change with "is not a function".
test('tabs work when scrollTo returns a Promise, like newer Chrome', async ({ page }) => {
    await page.addInitScript(() => {
        const scrollTo = window.scrollTo.bind(window) as (...args: unknown[]) => void;
        window.scrollTo = ((...args: unknown[]) => {
            scrollTo(...args);
            return Promise.resolve();
        }) as unknown as typeof window.scrollTo;
    });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    for (const tab of ['Rutinas', 'Progreso', 'Nutrición', 'Ajustes', 'Inicio']) {
        await page.getByRole('link', { name: tab, exact: true }).click();
        await expect(page.getByRole('navigation').getByRole('link', { name: tab, exact: true })).toHaveClass(/text-brand/);
    }
    await expect(page.getByText('Algo salió mal en esta pantalla')).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('legal page has terms and privacy in three languages', async ({ page }) => {
    await page.goto('/legal.html#privacy');
    await expect(page.getByRole('heading', { name: 'Términos de uso' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Política de privacidade' })).toBeVisible();
});

test('workout extras: repeat the last set, machine taken, then recovery, activity, BMI and share cards', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('button', { name: 'Empezar entreno' }).click();

    const squat = page.getByRole('region', { name: 'Sentadilla con barra' });
    await squat.getByLabel('Peso serie 1').fill('80');
    await squat.getByLabel('Repeticiones serie 1').fill('8');
    await squat.getByLabel('Marcar serie 1 como hecha').click();
    // One tap logs the same set again and starts the rest.
    await squat.getByRole('button', { name: 'Repetir la serie anterior' }).click();
    await expect(squat.getByLabel('Marcar serie 2 como hecha')).toHaveAttribute('aria-pressed', 'true');
    await expect(squat.getByLabel('Peso serie 2')).toHaveValue('80');
    await expect(squat.getByLabel('Repeticiones serie 2')).toHaveValue('8');
    await expect(page.getByRole('timer')).toBeVisible();
    await page.getByRole('button', { name: 'Saltar' }).click();

    // The bench is taken: same muscle with dumbbells instead.
    const bench = page.getByRole('region', { name: 'Press de banca', exact: true });
    await bench.getByRole('button', { name: 'Máquina ocupada' }).click();
    const sheet = page.getByRole('dialog', { name: 'Máquina ocupada' });
    await expect(sheet.getByText('Press de banca con mancuernas')).toBeVisible();
    await sheet.getByRole('button', { name: /Press de banca con mancuernas/ }).click();
    await expect(page.getByText('Cambiado por Press de banca con mancuernas')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Press de banca con mancuernas' })).toBeVisible();

    await page.getByRole('button', { name: 'Terminar' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Terminar' }).click();
    await page.getByRole('link', { name: 'Listo' }).click();

    // Legs were trained hard: they are recovering.
    await expect(page.getByRole('heading', { name: 'Recuperación muscular' })).toBeVisible();
    await expect(page.getByText(/piernas/i).first()).toBeVisible();

    await page.getByRole('link', { name: /Tu actividad/ }).click();
    await expect(page.getByRole('heading', { name: 'Tu actividad' })).toBeVisible();
    await expect(page.getByText(/Este mes: entrenaste 1 día/)).toBeVisible();

    await page.getByRole('link', { name: 'Nutrición', exact: true }).click();
    await expect(page.getByText('24,7')).toBeVisible();
    await expect(page.getByText('Peso saludable', { exact: true })).toBeVisible();

    await page.goto('/#/wrapped');
    await expect(page.getByRole('img', { name: 'Vista previa de la tarjeta' })).toBeVisible();
    await page.getByRole('radio', { name: 'Récords' }).click();
    await expect(page.getByRole('img', { name: 'Vista previa de la tarjeta' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compartir en Instagram' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Compartir en Facebook' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Compartir en TikTok' })).toBeEnabled();
});

test('women\'s section builds her own plan to lose or keep weight', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Rutinas', exact: true }).click();
    await page.getByRole('link', { name: /Entrenamiento para mujeres/ }).click();
    await page.getByRole('radio', { name: 'Mantener y tonificar' }).click();
    await page.getByRole('radio', { name: 'Casa' }).click();
    await expect(page.getByText('Mujer: tonifica en casa')).toBeVisible();
    await page.getByRole('button', { name: 'Empezar este plan' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Empezar' }).click();
    await expect(page.getByRole('heading', { name: 'Glúteos', exact: true })).toBeVisible();
});

test('before and after: two photos together with the watermark', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.goto('/#/antes-despues');
    for (const which of ['Antes', 'Después']) {
        const chooser = page.waitForEvent('filechooser');
        await page.getByRole('button', { name: which, exact: true }).click();
        await (await chooser).setFiles(fixture('face.jpg'));
    }
    await expect(page.getByRole('img', { name: 'Vista previa del antes y después' })).toBeVisible();
    await page.getByRole('radio', { name: 'Superpuestas' }).click();
    await expect(page.getByRole('slider', { name: 'Mover la división' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compartir en Facebook' })).toBeVisible();
});

test('offline: says nothing is lost, and the rest sound can be turned off', async ({ page, context }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await context.setOffline(true);
    await expect(page.getByText(/Sin conexión: todo se guarda en el teléfono/)).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText(/Sin conexión: todo se guarda en el teléfono/)).toHaveCount(0);

    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    const sound = page.getByRole('switch', { name: 'Sonido del cronómetro y del descanso' });
    await expect(sound).toHaveAttribute('aria-checked', 'true');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('switch', { name: 'Alertas de recuperación' })).toHaveAttribute('aria-checked', 'true');
});

test('completing the week refreshes the plan\'s routines', async ({ page }) => {
    await onboard(page, { days: '2' });
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    for (let i = 0; i < 2; i++) {
        await page.getByRole('button', { name: 'Empezar entreno' }).click();
        await page.getByLabel('Marcar serie 1 como hecha').first().click();
        await page.getByRole('button', { name: 'Terminar' }).click();
        await page.getByRole('alertdialog').getByRole('button', { name: 'Terminar' }).click();
        await page.getByRole('link', { name: 'Listo' }).click();
    }
    await expect(page.getByText('¡Semana completada!')).toBeVisible();
    await expect(page.getByText(/semana 2 \(más volumen\)/)).toBeVisible();
    await page.getByRole('link', { name: 'Ver mis rutinas' }).click();
    await expect(page.getByText(/Semana 2 de tu plan · más volumen/)).toBeVisible();
    await page.getByRole('link', { name: 'Inicio', exact: true }).click();
    await expect(page.getByText('¡Semana completada!')).toHaveCount(0);
});

test('Gym Wrapped: gym background by default, or the user\'s own photo', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.goto('/#/wrapped');
    await expect(page.getByRole('radio', { name: 'Gym' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('img', { name: 'Vista previa de la tarjeta' })).toBeVisible();
    const before = await page.getByRole('img', { name: 'Vista previa de la tarjeta' }).getAttribute('src');
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('radio', { name: 'Tu foto' }).click();
    await (await chooser).setFiles(fixture('face.jpg'));
    await expect(page.getByRole('button', { name: 'Tomar foto' })).toBeVisible();
    await expect.poll(() => page.getByRole('img', { name: 'Vista previa de la tarjeta' }).getAttribute('src')).not.toBe(before);
});

test('the app icon color can be changed in Settings', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    const icons = page.getByRole('radiogroup', { name: 'Ícono de la app' });
    await expect(icons.getByRole('radio')).toHaveCount(9);
    await expect(icons.getByRole('radio', { name: 'Naranja' })).toHaveAttribute('aria-checked', 'true');
    await icons.getByRole('radio', { name: 'Morado' }).click();
    await expect(icons.getByRole('radio', { name: 'Morado' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('Ícono Morado listo')).toBeVisible();
    // On the web the tab icon changes, and the choice is kept.
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /^data:image\/svg\+xml,.*%237c3aed/);
    await page.reload();
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /%237c3aed/);
    await expect(icons.getByRole('radio', { name: 'Morado' })).toHaveAttribute('aria-checked', 'true');
});

test('workout: switch to pounds, adjust with the − / + buttons, and the next set starts from the weight lifted', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('button', { name: 'Empezar entreno' }).click();
    await expect(page.getByText('Ejercicio 1 de 6')).toBeVisible();

    const squat = page.getByRole('region', { name: 'Sentadilla con barra' });
    await squat.getByLabel('Peso serie 1').fill('80');
    await squat.getByRole('button', { name: 'Subir el peso de la serie 1' }).click();
    await expect(squat.getByLabel('Peso serie 1')).toHaveValue('82,5');
    await squat.getByRole('button', { name: 'Una repetición más serie 1' }).click();
    await squat.getByLabel('Marcar serie 1 como hecha').click();
    // The next set starts from the weight just lifted; the rest shows what comes next.
    await expect(squat.getByLabel('Peso serie 2')).toHaveValue('82,5');
    await expect(page.getByRole('timer')).toContainText('Sentadilla con barra · serie 2');
    await page.getByRole('button', { name: 'Saltar' }).click();

    // Pounds right from the workout: the same weights, now in lbs, and the whole app follows.
    await page.getByRole('radio', { name: 'lb', exact: true }).click();
    await expect(squat.getByLabel('Peso serie 1')).toHaveValue('182');
    await expect(squat.getByRole('button', { name: 'Subir el peso de la serie 2' })).toHaveText('+5');
    await page.getByRole('button', { name: 'Ir a Press de banca' }).click();
    await page.getByRole('button', { name: /Volver/ }).click();
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await expect(page.getByRole('radio', { name: 'lb', exact: true })).toHaveAttribute('aria-checked', 'true');
});

test('online trainers: languages, hiring through the app, and the owner sets the price', async ({ page }) => {
    const cloud = { row: null, pushed: [] as Record<string, unknown>[] };
    await mockAccount(page, cloud);
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const ana = {
        id: 't1', user_id: 'ana', name: 'Ana Coach', specialty: 'Fuerza', bio: 'Diez años entrenando fuerza con gente real.', experience_years: 10,
        certifications: 'NSCA', languages: 'es,en', country: 'España', price: '30 $/mes', contact: '+34600111222', status: 'pending',
        app_price: '', payment_url: '', profile: null,
    };
    const updates: Record<string, unknown>[] = [];
    await page.route(/http:\/\/ai\.test\/rest\/v1\/(rpc\/trainers_listed|app_admins|trainer_applications)/, async route => {
        const req = route.request();
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        const url = req.url();
        if (url.includes('trainers_listed')) {
            return route.fulfill({ headers: cors, json: [
                { ...ana, status: undefined, app_price: '49 $/mes', payment_url: 'https://buy.stripe.com/test', contact: '', avatar_path: null, profile_updated_at: null },
                { ...ana, id: 't2', user_id: 'leo', name: 'Leo Fit', languages: 'pt', app_price: '', payment_url: '', avatar_path: null, profile_updated_at: null },
            ] });
        }
        if (url.includes('app_admins')) return route.fulfill({ headers: cors, json: { user_id: '00000000-0000-0000-0000-0000000000aa' } });
        if (req.method() === 'PATCH') {
            updates.push(req.postDataJSON());
            return route.fulfill({ status: 204, headers: cors });
        }
        return route.fulfill({ headers: cors, json: [ana] });
    });
    await signUpWithAccount(page);
    await expect(page.getByText(/Copia en la nube/)).toBeVisible();
    await page.goto('/#/entrenadores');

    // Each trainer shows the languages they speak; filter by one.
    const anaCard = page.getByRole('article', { name: 'Ana Coach' });
    await expect(anaCard.getByText('Español')).toBeVisible();
    await expect(anaCard.getByText('English')).toBeVisible();
    await expect(anaCard.getByText('49 $/mes')).toBeVisible();
    // Hired through the app: pay with the link, the contact stays private.
    await expect(anaCard.getByRole('link', { name: 'Contratar' })).toHaveAttribute('href', 'https://buy.stripe.com/test');
    await expect(page.getByRole('article', { name: 'Leo Fit' }).getByRole('link', { name: 'Contactar' })).toBeVisible();
    await page.getByRole('radio', { name: /Português/ }).click();
    await expect(page.getByRole('article', { name: 'Ana Coach' })).toHaveCount(0);
    await expect(page.getByRole('article', { name: 'Leo Fit' })).toBeVisible();

    // The owner approves an application and sets the price and payment link.
    await page.getByRole('button', { name: /Gestionar entrenadores/ }).click();
    const app = page.getByRole('article', { name: 'Ana Coach' });
    await expect(app.getByText('30 $/mes')).toBeVisible(); // what the trainer asks for
    await app.getByLabel('Precio en la app').fill('49 $/mes');
    await app.getByLabel('Enlace de pago (Stripe)').fill('http://not-secure');
    await app.getByRole('button', { name: 'Aprobar y publicar' }).click();
    await expect(page.getByText('El enlace de pago debe empezar por https://')).toBeVisible();
    await app.getByLabel('Enlace de pago (Stripe)').fill('https://buy.stripe.com/test');
    await app.getByRole('button', { name: 'Aprobar y publicar' }).click();
    await expect(page.getByText('Entrenador publicado')).toBeVisible();
    expect(updates).toEqual([{ status: 'approved', app_price: '49 $/mes', payment_url: 'https://buy.stripe.com/test' }]);
});

test('guided: cover, get ready, the exercise full screen, a full-screen rest, then save', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('button', { name: 'Empezar entreno' }).click();

    // The cover of the session with its exercises.
    await expect(page.getByRole('heading', { name: 'Cuerpo completo A' })).toBeVisible();
    await expect(page.getByText('Ejercicios')).toBeVisible();
    await expect(page.getByText('Intermedio')).toBeVisible();
    await page.getByRole('button', { name: '¡Empezar!' }).click();

    // Get ready, then the exercise.
    await expect(page.getByText('¡Prepárate!')).toBeVisible();
    await page.getByRole('button', { name: '¡Empezar ya!' }).click();
    const squat = page.getByRole('region', { name: 'Sentadilla con barra' });
    await expect(squat.getByText('Serie 1 de 3')).toBeVisible();
    await squat.getByLabel('Peso serie 1').fill('60');
    await squat.getByRole('button', { name: 'Subir el peso de la serie 1' }).click();
    await expect(squat.getByLabel('Peso serie 1')).toHaveValue('62,5');
    await squat.getByRole('button', { name: 'Una repetición más serie 1' }).click();
    await squat.getByRole('button', { name: 'Serie hecha' }).click();

    // Full-screen rest with the next set.
    const rest = page.getByRole('timer');
    await expect(rest).toContainText('Descanso');
    await expect(rest).toContainText('Serie 2 de 3');
    await expect(rest).toContainText('62,5 kg');
    await rest.getByRole('button', { name: 'Saltar' }).click();
    await expect(page.getByRole('region', { name: 'Sentadilla con barra' }).getByText('Serie 2 de 3')).toBeVisible();

    // The list shows the same workout; back to guided and finish.
    await page.getByRole('button', { name: 'Ver como lista' }).click();
    await expect(page.getByRole('region', { name: 'Sentadilla con barra' }).getByLabel('Peso serie 1')).toHaveValue('62,5');
    await page.getByRole('button', { name: 'Modo guiado' }).click();
    for (let i = 0; i < 6; i++) {
        const go = page.getByRole('button', { name: '¡Empezar ya!' });
        const skip = page.getByRole('button', { name: 'Saltar ejercicio' });
        await expect(go.or(skip)).toBeVisible();
        if (await go.isVisible()) await go.click();
        await skip.click();
    }
    await expect(page.getByRole('heading', { name: '¡Entreno completado!' })).toBeVisible();
    await page.getByRole('button', { name: 'Guardar entreno' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Terminar' }).click();
    await expect(page.getByText('Entreno guardado')).toBeVisible();
    await expect(page.getByText('60 × 7').or(page.getByText('62,5 × 7')).first()).toBeVisible();
});
