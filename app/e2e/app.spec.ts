import { expect, test, type Page } from '@playwright/test';

// Full journey on a phone viewport against the production build.

const onboard = async (page: Page, opts: { days?: string; setup?: RegExp } = {}) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Empezar gratis' }).click();
    await expect(page.getByRole('heading', { name: 'Tu plan de fuerza en 1 minuto' })).toBeVisible();
    await page.getByLabel('¿Cómo te llamas? (opcional)').fill('Sebas');
    await page.getByRole('radio', { name: /Ganar músculo/ }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('radio', { name: /Intermedio/ }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('radio', { name: opts.days ?? '3', exact: true }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('radio', { name: opts.setup ?? /Gimnasio/ }).click();
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
    await page.getByRole('link', { name: 'Rutinas' }).click();
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
    await page.getByRole('link', { name: 'Progreso' }).click();
    await expect(page.getByText('1 entreno registrado')).toBeVisible();
    await expect(page.getByRole('link', { name: /Sentadilla con barra/ }).first()).toBeVisible();
});

test('create a custom routine and train it', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Rutinas' }).click();
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
    await page.getByRole('link', { name: 'Ajustes' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^fitness-life-\d{4}-\d{2}-\d{2}\.json$/);
});

test('exercise library search and detail', async ({ page }) => {
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Rutinas' }).click();
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
    await expect(page.getByText('1 de 14 conseguidos')).toBeVisible();

    await page.getByRole('link', { name: 'Último entreno' }).or(page.getByRole('link', { name: /Cuerpo completo A/ })).first().click();
    await expect(page.getByLabel('Notas del entreno')).toHaveValue('Buenas sensaciones');

    await page.getByRole('link', { name: 'Progreso' }).click();
    await page.getByLabel('Peso corporal de hoy').fill('78,4');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('78,4 kg').first()).toBeVisible();
    await expect(page.getByRole('img', { name: /días entrenados/ })).toBeVisible();
});

test('switch language in onboarding and settings', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'English' }).click();
    await page.getByRole('button', { name: 'Start for free' }).click();
    await expect(page.getByRole('heading', { name: 'Your strength plan in 1 minute' })).toBeVisible();
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Full body A/B' })).toBeVisible();
    await page.getByRole('button', { name: 'Start with this plan' }).click();
    await expect(page.getByRole('heading', { name: '0 of 3 workouts this week' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nutrition' })).toBeVisible();

    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('radio', { name: 'Português' }).click();
    await expect(page.getByRole('link', { name: 'Hoje' })).toBeVisible();
    await page.reload();
    await page.getByRole('link', { name: 'Hoje' }).click();
    await expect(page.getByRole('heading', { name: '0 de 3 treinos nesta semana' })).toBeVisible();
    // Names of generated routines follow the language too.
    await expect(page.getByRole('heading', { name: 'Corpo inteiro A' })).toBeVisible();
});

test('welcome screen leads to onboarding and back', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Entrena con un plan/ })).toBeVisible();
    await page.getByRole('button', { name: 'Empezar gratis' }).click();
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

    await page.getByRole('link', { name: 'Ajustes' }).click();
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
const mockAi = async (page: Page, calls: Record<string, unknown>[], opts: { freeUsesSpent?: boolean } = {}) => {
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
            const usage = { used: opts.freeUsesSpent ? 5 : calls.length, limit: 5, premium: false };
            if (body.action === 'status') return route.fulfill({ headers: cors, json: { usage } });
            calls.push(body);
            if (opts.freeUsesSpent) return route.fulfill({ status: 402, headers: cors, json: { error: 'free uses spent', usage } });
            if (body.action === 'estimate') {
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
            return route.fulfill({ headers: cors, json: { text: 'Prueba pechuga de pollo (150 g, unos 45 g de proteína) con arroz y verduras.' } });
        }
        return route.fulfill({ status: 404, headers: cors, body: '' });
    });
};

test('nutrition: targets, meals by hand and with AI, and the AI coach', async ({ page }) => {
    const calls: Record<string, unknown>[] = [];
    await mockAi(page, calls);
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Nutrición' }).click();

    // Targets need a body weight: 80 kg and "Ganar músculo" → 2800 kcal, 160 g protein.
    await page.getByLabel('Peso corporal de hoy').fill('80');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('0 de 2800 kcal')).toBeVisible();
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
    await expect(page.getByText('138 de 2800 kcal')).toBeVisible();

    // With AI: describe it, review the estimate, add it.
    await page.getByRole('button', { name: 'Añadir comida' }).click();
    await page.getByLabel('Describe lo que comiste').fill('2 huevos revueltos y una tostada');
    await page.getByRole('button', { name: 'Calcular con IA' }).click();
    await expect(page.getByText('Desayuno de huevos')).toBeVisible();
    await expect(page.getByText('280 kcal · P 17 g · C 19 g · G 14 g')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Añadir' }).click();
    await expect(page.getByText('418 de 2800 kcal')).toBeVisible();
    expect(calls[0]).toMatchObject({ action: 'estimate', lang: 'es', text: '2 huevos revueltos y una tostada' });

    // The coach gets the user's goal and what they ate today.
    await page.getByRole('button', { name: '¿Qué ceno para llegar a mi proteína?' }).click();
    await expect(page.getByText(/pechuga de pollo/)).toBeVisible();
    expect(calls[1]).toMatchObject({
        action: 'chat', lang: 'es',
        context: { goal: 'musculo', weightKg: 80, targets: { kcal: 2800, protein: 160 }, today: { kcal: 418, protein: 42 } },
        messages: [{ role: 'user', text: '¿Qué ceno para llegar a mi proteína?' }],
    });

    // Everything stays after a reload.
    await page.reload();
    await expect(page.getByText(/pechuga de pollo/)).toBeVisible();
    await expect(page.getByText('418 de 2800 kcal')).toBeVisible();
});

test('free AI uses spent: the coach offers Premium at 4.99 a month', async ({ page }) => {
    await mockAi(page, [], { freeUsesSpent: true });
    await onboard(page);
    await page.getByRole('button', { name: 'Empezar con este plan' }).click();
    await page.getByRole('link', { name: 'Nutrición' }).click();
    await expect(page.getByText('Te quedan 0 de 5 consultas de IA gratis este mes').first()).toBeVisible();

    await page.getByRole('button', { name: '¿Qué ceno para llegar a mi proteína?' }).click();
    await expect(page.getByRole('heading', { name: 'Fitness Life Premium' })).toBeVisible();
    await expect(page.getByText('4,99 US$ / mes')).toBeVisible();
    await expect(page.getByRole('cell', { name: '100 al mes' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Términos de uso' })).toHaveAttribute('href', './legal.html#terminos');

    // No store reachable in tests: the purchase fails gracefully.
    await page.getByRole('button', { name: 'Suscribirme' }).click();
    await expect(page.getByText('No se pudo completar. Inténtalo de nuevo.')).toBeVisible();

    // The question is not lost.
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByLabel('Escribe tu pregunta')).toHaveValue('¿Qué ceno para llegar a mi proteína?');

    // Settings links to Premium too.
    await page.getByRole('link', { name: 'Ajustes' }).click();
    await page.getByRole('link', { name: /Fitness Life Premium/ }).click();
    await expect(page.getByRole('button', { name: 'Restaurar compras' })).toBeVisible();
});

test('legal page has terms and privacy in three languages', async ({ page }) => {
    await page.goto('/legal.html#privacy');
    await expect(page.getByRole('heading', { name: 'Términos de uso' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Política de privacidade' })).toBeVisible();
});
