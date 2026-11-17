// scripts/build-marketing-package.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync, execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const MKT = path.join(ROOT, 'marketing');
const RECORD_VIDEOS_ONLY = process.argv.includes('--record-videos-only');

if (process.argv.includes('--videos-only')) {
    throw new Error('The old --videos-only mode is unsupported. Use --record-videos-only to record and encode only the videos.');
}

const DIRS = [
    'brand',
'screenshots',
'sections',
'social',
'commercial',
'tutorial',
];

if (!RECORD_VIDEOS_ONLY) {
    for (const d of DIRS) {
        fs.mkdirSync(path.join(MKT, d), { recursive: true });
    }
}

function writeText(rel, content) {
    const full = path.join(MKT, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content.trimStart(), 'utf8');
}

if (RECORD_VIDEOS_ONLY) {
    const existingRecording = [
        path.join(MKT, 'commercial', 'raw-commercial.webm'),
        path.join(MKT, 'tutorial', 'raw-tutorial.webm'),
    ].find((recordingPath) => fs.existsSync(recordingPath));
    if (existingRecording) throw new Error(`Refusing to overwrite existing recording: ${existingRecording}`);
}

// ============================================================================
// 1. BRAND KIT, SCRIPTS, SRT SUBTITLES & README
// ============================================================================
if (!RECORD_VIDEOS_ONLY) {
writeText('brand/brand-kit-spec.md', `
# MONEYBANK — Brand Kit & Especificaciones Visuales

- **Producto:** MONEYBANK
- **Tagline oficial:** "Your Money. Your Control." / "Tu Dinero. Tu Control."
- **Tipografía:** Inter (400 Regular, 500 Medium, 600 SemiBold, 700 Bold) empaquetada localmente.
- **Paleta Light Mode (Principal):**
- Canvas: \`#F7F8FA\`
- Surface: \`#FFFFFF\`
- Texto Principal: \`#172033\`
- Texto Secundario: \`#737D8F\`
- Acento Primario: \`#3559D8\`
- Positivo: \`#16865B\` | Advertencia: \`#D99A32\` | Peligro: \`#D94B4B\`
- Borde Sutil: \`#E8EBF0\`
- **Paleta Dark Mode:**
- Canvas: \`#11151D\` | Surface: \`#191F2A\` | Elevated: \`#202837\`
- Texto Principal: \`#F1F4F9\` | Secundario: \`#98A3B5\` | Acento: \`#7794FF\`
- **Reglas de Autenticidad:**
- Todas las capturas provienen de la aplicación real renderizada en Chromium.
- Nunca se muestran contraseñas reales, claves criptográficas ni datos personales.
`);

writeText('commercial/commercial-script-es.md', `
# Guion Comercial — MONEYBANK (75 segundos)
**Concepto:** "Toma el control de tu vida financiera."
**Tagline:** "Your Money. Your Control."

La locución acompaña el recorrido grabado: creación de la bóveda, Resumen, inspección del disponible seguro, Cuentas, Transacciones, Pagos Recurrentes, Deudas, Ahorros, Analítica, Salud Financiera, Simulador y Configuración.

**Locución completa (ES):**

"Llevar tus finanzas no debería exigir hojas de cálculo ni entregar tus datos a terceros. MONEYBANK empieza con una bóveda cifrada que permanece en tu dispositivo. En el Resumen puedes ver tu patrimonio, el flujo del mes y el disponible seguro para gastar. Al abrir su cálculo, compruebas cómo se consideran los compromisos próximos y el ahorro reservado. Después, reúne tus cuentas y registra cada movimiento para entender de dónde viene y a dónde va tu dinero. Programa pagos recurrentes para anticipar sus fechas y controlar sus importes. Si tienes deudas, compara estrategias de pago y observa cómo cambia el plazo. Define metas de ahorro y consulta su avance junto con tus cuentas. La Analítica muestra la evolución de tus hábitos; Salud Financiera explica los factores detrás de sus alertas. En el Simulador puedes explorar una decisión antes de incorporarla a tu presupuesto. Y en Configuración encuentras el control de una herramienta local, diseñada para funcionar sin enviar tus finanzas a un servidor. MONEYBANK. Your Money. Your Control. Tu dinero, siempre bajo tu control."
`);

writeText('commercial/commercial-subtitles.srt', `
1
00:00:00,200 --> 00:00:06,200
Llevar tus finanzas no debería exigir hojas de cálculo ni entregar tus datos a terceros.

2
00:00:06,200 --> 00:00:11,200
MONEYBANK empieza con una bóveda cifrada que permanece en tu dispositivo.

3
00:00:11,200 --> 00:00:17,500
En el Resumen puedes ver tu patrimonio, el flujo del mes y el disponible seguro para gastar.

4
00:00:17,500 --> 00:00:24,300
Comprueba cómo se consideran los compromisos próximos y el ahorro reservado.

5
00:00:24,300 --> 00:00:31,400
Después, reúne tus cuentas y registra cada movimiento para entender de dónde viene y a dónde va tu dinero.

6
00:00:31,400 --> 00:00:36,900
Programa pagos recurrentes para anticipar sus fechas y controlar sus importes.

7
00:00:36,900 --> 00:00:42,600
Si tienes deudas, compara estrategias de pago y observa cómo cambia el plazo.

8
00:00:42,600 --> 00:00:47,200
Define metas de ahorro y consulta su avance junto con tus cuentas.

9
00:00:47,200 --> 00:00:54,900
La Analítica muestra la evolución de tus hábitos; Salud Financiera explica los factores detrás de sus alertas.

10
00:00:54,900 --> 00:01:00,600
En el Simulador puedes explorar una decisión antes de incorporarla a tu presupuesto.

11
00:01:00,600 --> 00:01:09,400
En Configuración encuentras el control de una herramienta local, diseñada para funcionar sin enviar tus finanzas a un servidor.

12
00:01:09,400 --> 00:01:16,800
MONEYBANK. Your Money. Your Control. Tu dinero, siempre bajo tu control.
`);

writeText('tutorial/tutorial-script-es.md', `
# Guion Tutorial — Primeros pasos con MONEYBANK (70 segundos)

La locución sigue la grabación existente: apertura y bóveda, Resumen, Cuentas, Ingresos, Gastos, Pagos Recurrentes, Deudas, Ahorros, Presupuestos, Calendario, Salud Financiera y Reportes.

**Locución completa (ES):**

"Empecemos por la bóveda local. Crea una contraseña maestra segura y MONEYBANK cifra tus datos en este dispositivo. Al entrar, el Resumen te muestra una vista general de tu situación financiera. En Cuentas, organiza bancos, efectivo, ahorro y tarjetas para saber qué saldo corresponde a cada lugar. En Ingresos, separa el dinero que ya recibiste de lo que esperas cobrar. En Gastos, registra cada compra con una categoría para revisar después en qué se fue el dinero. Añade pagos recurrentes para anticipar las próximas fechas y mantener sus importes a la vista. Si tienes un préstamo, registra el saldo y consulta cómo se distribuye entre capital e intereses. Crea metas para reservar dinero y prepara presupuestos mensuales por categoría. El Calendario reúne vencimientos y movimientos próximos. Revisa Salud Financiera para entender tus compromisos y alertas. Por último, desde Reportes puedes descargar un respaldo cifrado para conservar una copia. Tu información permanece bajo tu control local. MONEYBANK."
`);

writeText('tutorial/tutorial-subtitles.srt', `
1
00:00:00,200 --> 00:00:08,300
Empecemos por la bóveda local. Crea una contraseña maestra segura y MONEYBANK cifra tus datos en este dispositivo.

2
00:00:08,300 --> 00:00:13,700
Al entrar, el Resumen te muestra una vista general de tu situación financiera.

3
00:00:13,700 --> 00:00:21,400
En Cuentas, organiza bancos, efectivo, ahorro y tarjetas para saber qué saldo corresponde a cada lugar.

4
00:00:21,400 --> 00:00:26,300
En Ingresos, separa el dinero que ya recibiste de lo que esperas cobrar.

5
00:00:26,300 --> 00:00:32,900
En Gastos, registra cada compra con una categoría para revisar después en qué se fue el dinero.

6
00:00:32,900 --> 00:00:39,400
Añade pagos recurrentes para anticipar las próximas fechas y mantener sus importes a la vista.

7
00:00:39,400 --> 00:00:46,200
Si tienes un préstamo, registra el saldo y consulta cómo se distribuye entre capital e intereses.

8
00:00:46,200 --> 00:00:51,500
Crea metas para reservar dinero y prepara presupuestos mensuales por categoría.

9
00:00:51,500 --> 00:00:55,600
El Calendario reúne vencimientos y movimientos próximos.

10
00:00:55,600 --> 00:01:00,100
Revisa Salud Financiera para entender tus compromisos y alertas.

11
00:01:00,100 --> 00:01:06,500
Por último, desde Reportes puedes descargar un respaldo cifrado para conservar una copia.

12
00:01:06,500 --> 00:01:10,100
Tu información permanece bajo tu control local.

13
00:01:10,100 --> 00:01:11,500
MONEYBANK.
`);
}

// ============================================================================
// 2. SECTION DEFINITIONS (MATCHING REAL IMPLEMENTED ROUTES)
// ============================================================================
const SECTIONS = [
    { slug: '01-vault-seguridad', navLabel: null, title: 'Bóveda Cifrada Local', subtitle: 'Tus finanzas protegidas con AES-GCM 256-bit directamente en tu dispositivo.' },
{ slug: '02-resumen-dashboard', navLabel: 'Resumen', title: 'Tu Dinero de un Vistazo', subtitle: 'Patrimonio neto, flujo mensual y disponible seguro para gastar en tiempo real.' },
{ slug: '03-cuentas-tarjetas', navLabel: 'Cuentas', title: 'Cuentas y Tarjetas', subtitle: 'Administra efectivo, bancos, billeteras y tarjetas con conciliación auditable.' },
{ slug: '04-transacciones', navLabel: 'Transacciones', title: 'Cada Movimiento Bajo Control', subtitle: 'Registro rápido con precisión decimal y detección automática de duplicados.' },
{ slug: '05-ingresos', navLabel: 'Ingresos', title: 'Control de Ingresos', subtitle: 'Diferencia ingresos cobrados de ingresos esperados sin inflar tu liquidez.' },
{ slug: '06-gastos', navLabel: 'Gastos', title: 'Entiende a Dónde Va Tu Dinero', subtitle: 'Clasifica tus gastos por categoría y etiqueta con total claridad.' },
{ slug: '07-pagos-recurrentes', navLabel: 'Pagos Recurrentes', title: 'Nunca Pierdas un Pago', subtitle: 'Suscripciones y servicios con costo mensual, anualizado y marcas locales.' },
{ slug: '08-deudas-amortizacion', navLabel: 'Deudas', title: 'Toma el Control de Tus Deudas', subtitle: 'Desglose de capital e intereses con comparador Bola de Nieve vs Avalancha.' },
{ slug: '09-metas-ahorro', navLabel: 'Ahorros', title: 'Convierte Planes en Logros', subtitle: 'Reserva fondos para tus metas sin contarlos dos veces ni confundirlos con gastos.' },
{ slug: '10-presupuestos', navLabel: 'Presupuestos', title: 'Dale un Propósito a Cada Dólar', subtitle: 'Límites mensuales generales y por categoría con alertas al 70%, 90% y 100%.' },
{ slug: '11-calendario-financiero', navLabel: 'Calendario', title: 'Anticípate a Cada Vencimiento', subtitle: 'Visualiza cobros, gastos y pagos recurrentes día por día en un calendario claro.' },
{ slug: '12-analitica', navLabel: 'Analítica', title: 'Descubre Tus Hábitos Financieros', subtitle: 'Evolución histórica de ingresos, gastos y flujo de caja sobre datos reales.' },
{ slug: '13-salud-financiera', navLabel: 'Salud Financiera', title: 'Detecta Riesgos a Tiempo', subtitle: 'Diagnóstico explicable de 100 puntos basado en liquidez, deuda y compromisos.' },
{ slug: '14-simulador-whatif', navLabel: 'Simulador', title: 'Explora Escenarios Antes de Decidir', subtitle: 'Simula compras, préstamos o ahorros extra sin alterar tus datos reales.' },
{ slug: '15-reportes-configuracion', navLabel: 'Reportes', title: 'Tu Privacidad, Tus Reglas', subtitle: 'Exporta en CSV, PDF o respaldo cifrado .mbk.json y personaliza tu entorno.' },
];

// ============================================================================
// 3. BUILD APP IF NEEDED & LAUNCH PREVIEW SERVER
// ============================================================================
if (!RECORD_VIDEOS_ONLY) {
    console.log('1/5 Compilando MONEYBANK para captura real...');
    execSync('npm run build', { stdio: 'inherit' });
} else if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    throw new Error('Recording-only mode requires an existing dist/index.html and will not build the app.');
}

const server = spawn('npx', ['vite', 'preview', '--port', '4179', '--host', '127.0.0.1', '--strictPort'], {
    stdio: 'ignore',
});
let previewError;
server.on('error', (error) => { previewError = error; });

const BASE_URL = 'http://127.0.0.1:4179';

async function recordFlow(browser, outDir, outWebmName, stepsFn) {
    const recCtx = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } },
    });
    let video;
    try {
        const page = await recCtx.newPage();
        video = page.video();
        await stepsFn(page);
        await recCtx.close();
        const rawVideoPath = await video.path();
        const targetWebm = path.join(outDir, outWebmName);
        fs.renameSync(rawVideoPath, targetWebm);
        return targetWebm;
    } catch (error) {
        await recCtx.close().catch(() => {});
        throw error;
    }
}

async function recordVideoWorkflows(browser, directories) {
    const commercial = await recordFlow(browser, directories.commercial, 'raw-commercial.webm', async (page) => {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        await page.waitForTimeout(4000);
        const inputs = page.locator('input[type="password"]');
        await inputs.nth(0).fill('FictionalDemoKey#2026');
        await inputs.nth(1).fill('FictionalDemoKey#2026');
        await page.locator('input[type="checkbox"]').check();
        await page.getByRole('button', { name: /Crear Bóveda Cifrada/i }).click();
        await page.waitForSelector('text=Disponible seguro para gastar');
        await page.waitForTimeout(7000);
        await page.getByRole('button', { name: /Inspeccionar cálculo/i }).click();
        await page.waitForTimeout(7000);
        await page.getByRole('button', { name: /Cerrar/i }).click();
        await page.waitForTimeout(3000);
        const tour = ['Cuentas', 'Transacciones', 'Pagos Recurrentes', 'Deudas', 'Ahorros', 'Analítica', 'Salud Financiera', 'Simulador', 'Configuración'];
        for (const label of tour) {
            await page.getByRole('button', { name: label, exact: true }).click();
            await page.waitForTimeout(6000);
        }
    });

    const tutorial = await recordFlow(browser, directories.tutorial, 'raw-tutorial.webm', async (page) => {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);
        const inputs = page.locator('input[type="password"]');
        await inputs.nth(0).fill('FictionalDemoKey#2026');
        await inputs.nth(1).fill('FictionalDemoKey#2026');
        await page.locator('input[type="checkbox"]').check();
        await page.getByRole('button', { name: /Crear Bóveda Cifrada/i }).click();
        await page.waitForSelector('text=Disponible seguro para gastar');
        await page.waitForTimeout(5000);
        const steps = ['Cuentas', 'Ingresos', 'Gastos', 'Pagos Recurrentes', 'Deudas', 'Ahorros', 'Presupuestos', 'Calendario', 'Resumen', 'Salud Financiera', 'Reportes'];
        for (const label of steps) {
            await page.getByRole('button', { name: label, exact: true }).click();
            await page.waitForTimeout(5500);
        }
    });
    return { commercial, tutorial };
}

function validateRecording(filePath, label, minDuration, maxDuration) {
    const probe = JSON.parse(execFileSync('ffprobe', [
        '-v', 'error', '-show_streams', '-show_format', '-of', 'json', filePath,
    ], { encoding: 'utf8' }));
    const video = probe.streams.find((stream) => stream.codec_type === 'video');
    const duration = Number(video?.duration ?? probe.format?.duration);
    if (!video || video.width !== 1920 || video.height !== 1080 || !Number.isFinite(duration) || duration <= 0) {
        throw new Error(`${label} WebM failed FFprobe video stream or 1920×1080 validation.`);
    }
    if (duration < minDuration || duration > maxDuration) {
        throw new Error(`${label} WebM duration ${duration.toFixed(2)}s is outside ${minDuration}–${maxDuration}s.`);
    }
    console.log(`${label} WebM validated: ${duration.toFixed(2)}s, 1920×1080.`);
}

async function recordAndEncodeOnly(browser) {
    const destinations = {
        commercial: path.join(MKT, 'commercial', 'raw-commercial.webm'),
        tutorial: path.join(MKT, 'tutorial', 'raw-tutorial.webm'),
    };
    for (const destination of Object.values(destinations)) {
        if (fs.existsSync(destination)) {
            throw new Error(`Refusing to overwrite existing recording: ${destination}`);
        }
    }

    const stageRoot = path.join(MKT, `.recording-stage-${process.pid}-${Date.now()}`);
    const stageDirs = {
        commercial: path.join(stageRoot, 'commercial'),
        tutorial: path.join(stageRoot, 'tutorial'),
    };
    fs.mkdirSync(stageRoot);
    fs.mkdirSync(stageDirs.commercial);
    fs.mkdirSync(stageDirs.tutorial);
    console.log(`Recording to staging directory ${stageRoot}`);
    const staged = await recordVideoWorkflows(browser, stageDirs);

    validateRecording(staged.commercial, 'Commercial', 70, 80);
    validateRecording(staged.tutorial, 'Tutorial', 65, 75);

    const promoted = [];
    try {
        for (const [key, destination] of Object.entries(destinations)) {
            if (fs.existsSync(destination)) throw new Error(`Refusing to overwrite existing recording: ${destination}`);
            fs.linkSync(staged[key], destination);
            promoted.push(destination);
        }
    } catch (error) {
        for (const destination of promoted) fs.unlinkSync(destination);
        throw error;
    }
    for (const stagedPath of Object.values(staged)) fs.unlinkSync(stagedPath);

    console.log('Both validated WebM recordings are in place.');
}

function cardHtml({ width, height, title, subtitle, screenshotDataUrl, badge }) {
    const isSquare = width === height;
    return `<!doctype html>
    <html lang="es">
    <head>
    <meta charset="utf-8" />
    <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
        width: ${width}px; height: ${height}px;
        font-family: "Inter", system-ui, -apple-system, sans-serif;
        background: #F7F8FA; color: #172033;
        display: flex; flex-direction: column; justify-content: space-between;
        padding: ${isSquare ? '54px' : '56px 72px'};
        overflow: hidden;
    }
    .top {
        display: flex; align-items: center; justify-content: space-between;
    }
    .brand {
        display: flex; align-items: center; gap: 14px;
    }
    .logo {
        width: 44px; height: 44px; border-radius: 12px;
        background: #3559D8; color: #FFFFFF;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 16px;
    }
    .brand-name { font-weight: 700; font-size: 20px; letter-spacing: -0.02em; }
    .tagline { font-size: 13px; color: #737D8F; font-weight: 500; }
    .pill {
        background: rgba(53, 89, 216, 0.10); color: #3559D8;
        padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 600;
    }
    .copy {
        margin-top: ${isSquare ? '24px' : '22px'};
        max-width: ${isSquare ? '100%' : '1150px'};
    }
    h1 {
        font-size: ${isSquare ? '40px' : '46px'};
        font-weight: 700; letter-spacing: -0.03em; line-height: 1.12;
    }
    p.sub {
        margin-top: 10px;
        font-size: ${isSquare ? '19px' : '21px'};
        color: #737D8F; line-height: 1.4;
    }
    .frame {
        margin-top: ${isSquare ? '26px' : '28px'};
        flex: 1;
        background: #FFFFFF;
        border: 1px solid #E8EBF0;
        border-radius: 18px;
        box-shadow: 0 20px 50px rgba(23, 32, 51, 0.08);
        overflow: hidden;
        display: flex; align-items: flex-start; justify-content: center;
    }
    .frame img {
        width: 100%; height: 100%; object-fit: cover; object-position: top left;
    }
    </style>
    </head>
    <body>
    <div class="top">
    <div class="brand">
    <div class="logo">MB</div>
    <div>
    <div class="brand-name">MONEYBANK</div>
    <div class="tagline">Your Money. Your Control.</div>
    </div>
    </div>
    <div class="pill">${badge}</div>
    </div>
    <div class="copy">
    <h1>${title}</h1>
    <p class="sub">${subtitle}</p>
    </div>
    <div class="frame">
    <img src="${screenshotDataUrl}" alt="${title}" />
    </div>
    </body>
    </html>`;
}

let browser;
try {
    let previewReady = false;
    for (let attempt = 0; attempt < 40; attempt++) {
        if (previewError) throw previewError;
        if (server.exitCode !== null) throw new Error(`Vite preview exited with code ${server.exitCode}.`);
        try {
            const response = await fetch(BASE_URL);
            if (response.ok) {
                previewReady = true;
                break;
            }
        } catch {
            // Preview server is still starting.
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!previewReady) throw new Error('Vite preview did not become ready on port 4179.');

    browser = await chromium.launch({ headless: true });
    if (RECORD_VIDEOS_ONLY) {
        await recordAndEncodeOnly(browser);
        await browser.close();
        browser = undefined;
        console.log('Encoding and validating the two recordings; existing MP4s remain until both pass.');
        execSync('node scripts/build-marketing-videos.mjs --preserve-readme', { stdio: 'inherit' });
    } else {
    console.log('2/5 Capturando pantallas reales de MONEYBANK con Playwright...');

    // Context 1: Screenshots + Promo Cards
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Capture 01: Vault Gate (before password entry, zero sensitive data)
    const vaultShotPath = path.join(MKT, 'screenshots', '01-vault-seguridad.png');
    await page.screenshot({ path: vaultShotPath });

    // Initialize vault with demo dataset for realistic fictional screenshots
    const pwInputs = page.locator('input[type="password"]');
    await pwInputs.nth(0).fill('FictionalDemoKey#2026');
    await pwInputs.nth(1).fill('FictionalDemoKey#2026');
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: /Crear Bóveda Cifrada/i }).click();
    await page.waitForSelector('text=Disponible seguro para gastar');

    // Capture remaining 14 real views
    for (const sec of SECTIONS.slice(1)) {
        if (sec.navLabel) {
            await page.getByRole('button', { name: sec.navLabel, exact: true }).click();
            await page.waitForTimeout(450);
        }
        const rawPath = path.join(MKT, 'screenshots', `${sec.slug}.png`);
        await page.screenshot({ path: rawPath });
    }

    console.log('3/5 Generando 15 tarjetas 1920x1080, 15 tarjetas 1080x1080 y miniaturas...');
    const renderPage = await browser.newPage();

    for (const sec of SECTIONS) {
        const rawPath = path.join(MKT, 'screenshots', `${sec.slug}.png`);
        const b64 = fs.readFileSync(rawPath).toString('base64');
        const dataUrl = `data:image/png;base64,${b64}`;

        // 16:9 Landscape (1920x1080)
        await renderPage.setViewportSize({ width: 1920, height: 1080 });
        await renderPage.setContent(
            cardHtml({
                width: 1920,
                height: 1080,
                title: sec.title,
                subtitle: sec.subtitle,
                screenshotDataUrl: dataUrl,
                badge: 'Local-First · Cifrado AES-GCM',
            }),
            { waitUntil: 'load' }
        );
        await renderPage.screenshot({ path: path.join(MKT, 'sections', `${sec.slug}-1920x1080.png`) });

        // 1:1 Social (1080x1080)
        await renderPage.setViewportSize({ width: 1080, height: 1080 });
        await renderPage.setContent(
            cardHtml({
                width: 1080,
                height: 1080,
                title: sec.title,
                subtitle: sec.subtitle,
                screenshotDataUrl: dataUrl,
                badge: 'MONEYBANK · Local-First',
            }),
            { waitUntil: 'load' }
        );
        await renderPage.screenshot({ path: path.join(MKT, 'social', `${sec.slug}-1080x1080.png`) });
    }

    // Video thumbnails (1920x1080)
    fs.copyFileSync(
        path.join(MKT, 'sections', '02-resumen-dashboard-1920x1080.png'),
                    path.join(MKT, 'commercial', 'commercial-thumbnail-1920x1080.png')
    );
    fs.copyFileSync(
        path.join(MKT, 'sections', '01-vault-seguridad-1920x1080.png'),
                    path.join(MKT, 'tutorial', 'tutorial-thumbnail-1920x1080.png')
    );

    // ============================================================================
    // 4. RECORD REAL INTERACTIVE WORKFLOWS FOR COMMERCIAL & TUTORIAL VIDEOS
    // ============================================================================
    console.log('4/5 Grabando flujos reales en vídeo con Playwright...');
    await recordVideoWorkflows(browser, {
        commercial: path.join(MKT, 'commercial'),
        tutorial: path.join(MKT, 'tutorial'),
    });
    await browser.close();
    browser = undefined;

    // WebM recordings remain available for future encoding and are never deleted here.

    writeText('README.md', `
    # MONEYBANK — Visual Marketing & Product Showcase

    Paquete completo de activos promocionales generados directamente sobre la interfaz real de **MONEYBANK** (*Your Money. Your Control.*).

    ## Estructura y Manifiesto de Archivos

    - \`brand/brand-kit-spec.md\`: Paleta oficial Light/Dark, tipografía Inter y reglas de marca.
    - \`screenshots/\`: 15 capturas originales en alta resolución (2x) de cada módulo real de la aplicación.
    - \`sections/\`: 15 tarjetas promocionales en formato panorámico **1920 × 1080** (\`01-vault-seguridad-1920x1080.png\` hasta \`15-reportes-configuracion-1920x1080.png\`).
    - \`social/\`: 15 tarjetas cuadradas **1080 × 1080** optimizadas para redes sociales.
    - \`commercial/\`:
    - \`moneybank-commercial-es.mp4\`: Vídeo comercial 1080p con subtítulos en español incrustados.
    - \`commercial-thumbnail-1920x1080.png\`: Miniatura oficial.
    - \`commercial-script-es.md\` y \`commercial-subtitles.srt\`: Guion y subtítulos sincronizados.
    - \`tutorial/\`:
    - \`moneybank-tutorial-es.mp4\`: Vídeo tutorial paso a paso en 1080p.
    - \`tutorial-thumbnail-1920x1080.png\`: Miniatura oficial.
    - \`tutorial-script-es.md\` y \`tutorial-subtitles.srt\`: Guion y subtítulos sincronizados.

    ## Regeneración

    \`\`\`bash
    node scripts/build-marketing-package.mjs
    \`\`\`
    `);

    execSync('node scripts/build-marketing-videos.mjs', { stdio: 'inherit' });

    // ============================================================================
    // 6. AUTOMATED PACKAGE INTEGRITY VERIFICATION
    // ============================================================================
    const expectedFiles = [
        'README.md',
        'brand/brand-kit-spec.md',
        'commercial/commercial-script-es.md',
        'commercial/commercial-subtitles.srt',
        'commercial/commercial-thumbnail-1920x1080.png',
        'commercial/moneybank-commercial-es.mp4',
        'tutorial/tutorial-script-es.md',
        'tutorial/tutorial-subtitles.srt',
        'tutorial/tutorial-thumbnail-1920x1080.png',
        'tutorial/moneybank-tutorial-es.mp4',
        ...SECTIONS.flatMap((s) => [
            `screenshots/${s.slug}.png`,
            `sections/${s.slug}-1920x1080.png`,
            `social/${s.slug}-1080x1080.png`,
        ]),
    ];

    let okCount = 0;
    for (const rel of expectedFiles) {
        const full = path.join(MKT, rel);
        const stat = fs.statSync(full);
        if (!stat.isFile() || stat.size === 0) {
            throw new Error(`Fallo de verificación en entregable: ${rel}`);
        }
        okCount++;
    }

    console.log(`\nVERIFICACIÓN COMPLETADA: ${okCount}/${expectedFiles.length} entregables válidos en marketing/`);
    }
} finally {
    if (browser) await browser.close().catch(() => {});
    server.kill();
}
