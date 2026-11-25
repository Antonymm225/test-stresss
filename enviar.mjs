// Generador + enviador de carga.
// Genera registros al momento y los manda por POST (JSON) a LEAD_URL, a un ritmo parejo.
//
// Variables de entorno (en GitHub van como Secrets):
//   LEAD_URL        URL de destino (obligatoria)
//   BYPASS_HEADER   cabecera extra, formato "Nombre: valor" (opcional)
// Los campos fijos de cada registro están en fijos.json.
//
// Opciones:
//   --total <n>        registros a enviar en esta máquina
//   --duracion <s>     segundos en que se reparten (0 = lo más rápido posible)
//   --paralelo <n>     envíos simultáneos (por defecto 200)
//   --timeout <ms>     tiempo máximo por petición (por defecto 15000)
//   --salida <archivo> archivo .ndjson.gz con el detalle (por defecto resultados.ndjson.gz)
//   --muestra <n>      solo imprime n registros de ejemplo, no envía nada

import { randomUUID, randomBytes } from 'node:crypto';
import { createWriteStream, readFileSync } from 'node:fs';
import { createGzip } from 'node:zlib';

// ---------- opciones ----------
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const TOTAL = Number(opt('total', 100));
const DURACION = Number(opt('duracion', 0));
const PARALELO = Number(opt('paralelo', 200));
const TIMEOUT = Number(opt('timeout', 15000));
const SALIDA = opt('salida', 'resultados.ndjson.gz');
const MUESTRA = opt('muestra', null);

const URL_DESTINO = process.env.LEAD_URL;
// Campos fijos de cada registro: fijos.json (junto a este script)
let FIJOS = {};
try { FIJOS = JSON.parse(readFileSync(new URL('./fijos.json', import.meta.url), 'utf8')); }
catch (e) { console.error('No se pudo leer fijos.json: ' + e.message); process.exit(1); }
const HEADERS = { 'Content-Type': 'application/json' };
if (process.env.BYPASS_HEADER) {
  const i = process.env.BYPASS_HEADER.indexOf(':');
  if (i > 0) HEADERS[process.env.BYPASS_HEADER.slice(0, i).trim()] = process.env.BYPASS_HEADER.slice(i + 1).trim();
}

// ---------- datos ----------
const NOMBRES = ['Jose', 'Juan', 'Luis', 'Carlos', 'Miguel', 'Jorge', 'Pedro', 'Francisco', 'Javier', 'Ramon',
  'Alejandro', 'Ricardo', 'Fernando', 'Roberto', 'Eduardo', 'Mario', 'Sergio', 'Raul', 'Hector', 'Arturo',
  'Manuel', 'Antonio', 'Rafael', 'Oscar', 'Daniel', 'Martin', 'Victor', 'Gerardo', 'Armando', 'Ruben',
  'Maria', 'Guadalupe', 'Rosa', 'Ana', 'Carmen', 'Patricia', 'Veronica', 'Leticia', 'Claudia', 'Laura',
  'Gabriela', 'Silvia', 'Adriana', 'Yolanda', 'Elena', 'Sandra', 'Teresa', 'Monica', 'Lucia', 'Alejandra',
  'Juana', 'Margarita', 'Araceli', 'Norma', 'Isabel', 'Beatriz', 'Diana', 'Karina', 'Maribel', 'Esperanza'];
const APELLIDOS = ['Garcia', 'Hernandez', 'Martinez', 'Lopez', 'Gonzalez', 'Rodriguez', 'Perez', 'Sanchez', 'Ramirez', 'Flores',
  'Gomez', 'Torres', 'Diaz', 'Vazquez', 'Cruz', 'Morales', 'Reyes', 'Gutierrez', 'Ortiz', 'Chavez',
  'Ruiz', 'Mendoza', 'Aguilar', 'Castillo', 'Jimenez', 'Moreno', 'Romero', 'Alvarez', 'Herrera', 'Medina',
  'Vargas', 'Castro', 'Guzman', 'Velazquez', 'Ramos', 'Rojas', 'Salazar', 'Contreras', 'Delgado', 'Estrada',
  'Dominguez', 'Rios', 'Nunez', 'Soto', 'Cervantes', 'Luna', 'Juarez', 'Navarro', 'Cortes', 'Fuentes'];
const AREA_ESTADO = {
  213: 'CA', 323: 'CA', 310: 'CA', 818: 'CA', 626: 'CA', 909: 'CA', 951: 'CA', 714: 'CA', 559: 'CA', 661: 'CA', 760: 'CA', 619: 'CA', 408: 'CA', 510: 'CA',
  713: 'TX', 281: 'TX', 832: 'TX', 210: 'TX', 512: 'TX', 214: 'TX', 469: 'TX', 972: 'TX', 817: 'TX', 915: 'TX', 956: 'TX', 361: 'TX',
  305: 'FL', 786: 'FL', 954: 'FL', 407: 'FL', 813: 'FL', 602: 'AZ', 480: 'AZ', 520: 'AZ', 702: 'NV', 725: 'NV',
  312: 'IL', 773: 'IL', 708: 'IL', 718: 'NY', 347: 'NY', 917: 'NY', 704: 'NC', 919: 'NC', 404: 'GA', 770: 'GA',
  201: 'NJ', 973: 'NJ', 303: 'CO', 720: 'CO',
};
const AREAS = Object.keys(AREA_ESTADO);
const NOMBRE_ESTADO = { CA: 'California', TX: 'Texas', FL: 'Florida', AZ: 'Arizona', NV: 'Nevada', IL: 'Illinois',
  NY: 'New York', NC: 'North Carolina', GA: 'Georgia', NJ: 'New Jersey', CO: 'Colorado' };
const DOMINIOS = [['gmail.com', 55], ['hotmail.com', 15], ['yahoo.com', 12], ['outlook.com', 8], ['icloud.com', 6], ['aol.com', 2], ['live.com', 2]];

const azar = (n) => Math.floor(Math.random() * n);
const uno = (a) => a[azar(a.length)];
const ponderado = (p) => { let r = Math.random() * p.reduce((s, [, w]) => s + w, 0); for (const [v, w] of p) if ((r -= w) < 0) return v; return p[0][0]; };

function generar() {
  const nombre = uno(NOMBRES), ap1 = uno(APELLIDOS);
  let ap2 = uno(APELLIDOS); while (ap2 === ap1) ap2 = uno(APELLIDOS);
  const dos = Math.random() < 0.45;
  const edad = 26 + azar(34);
  const n = nombre.toLowerCase(), a = ap1.toLowerCase(), a2 = ap2.toLowerCase();
  const anio = String(new Date().getFullYear() - edad), corto = anio.slice(2), num = String(10 + azar(990));
  const usuarios = [`${n}.${a}${corto}`, `${n}${a}${anio}`, `${n[0]}${a}${num}`, `${n}_${a}${corto}`, `${a}.${n}${num}`, `${n}${num}`];
  if (dos) usuarios.push(`${n}${a[0]}${a2}${corto}`, `${n}.${a}.${a2}`);
  const area = uno(AREAS);
  let central; do { central = String(2 + azar(8)) + azar(10) + azar(10); } while (central.endsWith('11') || central === '555');
  const phone = `${area}${central}${String(azar(10000)).padStart(4, '0')}`;
  return {
    state: NOMBRE_ESTADO[AREA_ESTADO[area]],
    age: edad,
    goal: 'family',
    budget: uno([100, 150, 200]),
    smoker: uno(['yes', 'no']),
    callTime: uno(['morning', 'afternoon', 'evening']),
    name: dos ? `${nombre} ${ap1} ${ap2}` : `${nombre} ${ap1}`,
    email: `${uno(usuarios)}@${ponderado(DOMINIOS)}`,
    phone,
    eventId: randomUUID(),
    trustedFormCertUrl: `https://cert.trustedform.com/${randomBytes(20).toString('hex')}`,
    clickId: randomUUID().replace(/-/g, ''),
  };
}

const armarCuerpo = (r) => ({ ...FIJOS, ...r, startedAt: String(Date.now()) });

if (MUESTRA) {
  for (let i = 0; i < (Number(MUESTRA) || 3); i++) console.log(JSON.stringify(armarCuerpo(generar()), null, 2));
  process.exit(0);
}
if (!URL_DESTINO) { console.error('Falta la variable LEAD_URL'); process.exit(1); }

// ---------- métricas (sin guardar todo en memoria) ----------
const hist = new Uint32Array(60001);           // histograma de tiempos en ms
const porStatus = {};
let enviados = 0, ok = 0, seguidosMal = 0, errMostrados = 0, maxMs = 0, sumaMs = 0;
const ventana = [];                             // últimos 2000 resultados (1 = ok, 0 = falla)
let malosVentana = 0;
let detener = null;

const percentil = (p) => {
  const meta = Math.ceil((p / 100) * enviados); let acc = 0;
  for (let i = 0; i < hist.length; i++) { acc += hist[i]; if (acc >= meta) return i; }
  return hist.length - 1;
};

const gz = createGzip();
gz.setMaxListeners(0);
gz.pipe(createWriteStream(SALIDA));
const escribir = (linea) => new Promise((r) => (gz.write(linea) ? r() : gz.once('drain', r)));

async function enviarUno() {
  const reg = generar();
  const cuerpo = armarCuerpo(reg);
  const t = performance.now();
  let status = 0, respuesta = '';
  try {
    const r = await fetch(URL_DESTINO, { method: 'POST', headers: HEADERS, body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(TIMEOUT) });
    status = r.status;
    respuesta = await r.text();
  } catch (e) {
    respuesta = e.name === 'TimeoutError' ? 'TIMEOUT' : String(e.message);
  }
  const ms = Math.round(performance.now() - t);
  const bien = status >= 200 && status < 300;

  enviados++; if (bien) ok++;
  sumaMs += ms; if (ms > maxMs) maxMs = ms; hist[Math.min(ms, 60000)]++;
  porStatus[status || 'sin_respuesta'] = (porStatus[status || 'sin_respuesta'] || 0) + 1;
  ventana.push(bien ? 1 : 0); if (!bien) malosVentana++;
  if (ventana.length > 2000 && ventana.shift() === 0) malosVentana--;
  seguidosMal = bien ? 0 : seguidosMal + 1;

  if (!bien && errMostrados < 20) { errMostrados++; console.log(`ERR ${status || '-'} ${ms} ms -> ${respuesta.replace(/\s+/g, ' ').slice(0, 200)}`); }
  await escribir(JSON.stringify({ ...reg, startedAt: cuerpo.startedAt, status, ms, ...(bien ? {} : { respuesta: respuesta.slice(0, 200) }) }) + '\n');

  // Frenos de seguridad
  if (!detener && seguidosMal >= 300) detener = '300 fallos seguidos';
  if (!detener && ventana.length >= 2000 && malosVentana / ventana.length > 0.5) detener = 'más del 50% de fallos en los últimos 2000';
}

// ---------- envío a ritmo parejo ----------
console.log(`Enviando ${TOTAL} registros${DURACION ? ` en ${DURACION} s` : ''}, ${PARALELO} simultáneos`);
const intervalo = DURACION > 0 ? (DURACION * 1000) / TOTAL : 0;
const paso = Math.max(1, Math.round(TOTAL / 50));
const t0 = performance.now();
let siguiente = 0;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function trabajador() {
  while (siguiente < TOTAL && !detener) {
    const i = siguiente++;
    if (intervalo) { const e = t0 + i * intervalo - performance.now(); if (e > 0) await dormir(e); }
    await enviarUno();
    if (enviados % paso === 0) {
      const s = (performance.now() - t0) / 1000;
      console.log(`... ${enviados}/${TOTAL} | ok ${ok} | fallos ${enviados - ok} | ${s.toFixed(0)} s | ${(enviados / s).toFixed(1)}/s`);
    }
  }
}
await Promise.all(Array.from({ length: Math.min(PARALELO, TOTAL) }, trabajador));
await new Promise((r) => gz.end(r));

const seg = (performance.now() - t0) / 1000;
const resumen = {
  enviados, exitosos: ok, fallidos: enviados - ok, porcentaje_ok: +((ok / Math.max(1, enviados)) * 100).toFixed(2),
  por_status: porStatus, segundos: +seg.toFixed(1), por_segundo: +(enviados / seg).toFixed(2),
  ms: { promedio: Math.round(sumaMs / Math.max(1, enviados)), p50: percentil(50), p95: percentil(95), p99: percentil(99), max: maxMs },
  detenido_por: detener,
};
console.log('\n===== RESUMEN =====\n' + JSON.stringify(resumen, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Máquina ${process.env.MAQUINA ?? ''}\n\`\`\`json\n${JSON.stringify(resumen, null, 2)}\n\`\`\`\n`);
}
if (detener) { console.log(`\nDetenido: ${detener}`); process.exit(2); }
