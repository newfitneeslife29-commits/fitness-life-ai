import { expect, test, type Page } from '@playwright/test';

// Full journey on a phone viewport against the production build.

const onboard = async (page: Page, opts: { days?: string; setup?: RegExp } = {}) => {
    await page.goto('/');
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

    page.once('dialog', d => d.accept()); // unmarked sets are not saved
    await page.getByRole('button', { name: 'Terminar' }).click();
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

    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Descartar entreno' }).click();

    await page.reload();
    await page.getByRole('link', { name: 'Progreso' }).click();
    await expect(page.getByText('1 entrenos registrados')).toBeVisible();
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
    await page.getByRole('link', { name: 'Ejercicios', exact: true }).click();
    await page.getByLabel('Buscar ejercicio').fill('dominada');
    await page.getByRole('link', { name: /Dominadas/ }).click();
    await expect(page.getByRole('heading', { name: 'Dominadas' })).toBeVisible();
    await expect(page.getByText('la app te sugerirá una repetición más')).toBeVisible();
    await expect(page.getByText('Todavía no has hecho este ejercicio.')).toBeVisible();
});
