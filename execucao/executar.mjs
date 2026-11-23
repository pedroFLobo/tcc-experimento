// Executor do experimento: roda os testes gerados por um modelo contra uma cópia do Clínica+.
//
// Uso:
//   node execucao/executar.mjs --resposta <arquivo.md> --modelo <nome> [--clinica <pasta>] [--sem-e2e]
//   node execucao/executar.mjs --pasta <pasta-de-testes> --modelo <nome> [--clinica <pasta>] [--sem-e2e]
//
// --resposta: resposta de um chat (texto com "### Arquivo: ..." + bloco de código).
// --pasta:    testes que um agente de linha de comando escreveu direto nos arquivos
//             (normalmente respostas/<modelo>/testes, criada por ferramentas/rodada.mjs recolher).
//
// Passos:
//   1. Extrai os arquivos de teste da resposta do modelo (ou lê da pasta, com --pasta).
//   2. Cria uma cópia de trabalho do Clínica+ fora do OneDrive e instala as ferramentas de teste.
//   3. Roda Jest (backend), Vitest (frontend) e Playwright (E2E), com cobertura de código.
//   4. Junta resultado e metadados de cada caso em resultados/<modelo>/casos.csv e resumo.json.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');
const AGORA_E2E = '2026-10-19 08:00';
const PASTAS_PERMITIDAS = ['backend/__testes__/', 'frontend/__testes__/', 'e2e/'];
const FERRAMENTAS = {
  jest: '30.5.2',
  supertest: '7.3.1',
  vitest: '5.0.5',
  '@vitest/coverage-v8': '5.0.5',
  '@testing-library/react': '16.3.3',
  '@testing-library/user-event': '14.6.8',
  '@testing-library/jest-dom': '7.0.1',
  jsdom: '30.1.3',
  '@playwright/test': '1.64.1',
  // Fixa o React da raiz na mesma versão do frontend, senão a Testing Library carrega outra cópia.
  react: '18.3.1',
  // Mesma versão do Vite do frontend, para o plugin do React não misturar versões.
  vite: '7.3.7',
  'react-dom': '18.3.1',
};

const { values: args } = parseArgs({
  options: {
    resposta: { type: 'string' },
    pasta: { type: 'string' },
    modelo: { type: 'string' },
    clinica: { type: 'string', default: join(RAIZ, '..', 'clinica-plus') },
    trabalho: { type: 'string', default: join(tmpdir(), 'clinica-experimento') },
    'sem-e2e': { type: 'boolean', default: false },
    'reaproveitar-instalacao': { type: 'boolean', default: false },
  },
});
if ((!args.resposta === !args.pasta) || !args.modelo) {
  console.error('Uso: node execucao/executar.mjs (--resposta <arquivo.md> | --pasta <pasta-de-testes>) --modelo <nome> [--clinica <pasta>] [--sem-e2e]');
  process.exit(1);
}

const modelo = args.modelo.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
const saida = join(RAIZ, 'resultados', modelo);
const ws = join(args.trabalho, modelo);
mkdirSync(saida, { recursive: true });
const log = (...m) => console.log('›', ...m);

// ---------------------------------------------------------------- 1. Extração

export function extrairArquivos(texto) {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  const arquivos = new Map();
  const rejeitados = [];
  for (let i = 0; i < linhas.length; i++) {
    const cabecalho = linhas[i].match(/^#{2,4}\s*Arquivo:\s*`?([^`\s]+)`?\s*$/);
    if (!cabecalho) continue;
    let j = i + 1;
    while (j < linhas.length && linhas[j].trim() === '') j++;
    if (!linhas[j]?.startsWith('```')) continue;
    const corpo = [];
    let k = j + 1;
    for (; k < linhas.length; k++) {
      if (linhas[k].trim() === '```') {
        let p = k + 1;
        while (p < linhas.length && linhas[p].trim() === '') p++;
        if (p >= linhas.length || /^(#{2,4}\s*Arquivo:|## Resumo|<!--)/.test(linhas[p])) break;
      }
      corpo.push(linhas[k]);
    }
    const caminho = normalize(cabecalho[1]).split(sep).join('/').replace(/^(\.\/|clinica-plus\/)/, '');
    if (caminho.includes('..') || !PASTAS_PERMITIDAS.some((p) => caminho.startsWith(p))) {
      rejeitados.push(caminho);
    } else {
      arquivos.set(caminho, corpo.join('\n') + '\n'); // a última versão de um arquivo prevalece
    }
    i = k;
  }
  return { arquivos, rejeitados };
}

const TAGS = ['caso', 'nivel', 'atributo', 'subatributo', 'requisito', 'objetivo', 'resultadoEsperado'];

export function lerCasos(caminho, conteudo) {
  const casos = [];
  const re = /(?:\/\*\*([\s\S]*?)\*\/\s*)?\b(?:test|it)(?:\.(?:only|skip|concurrent|fixme|fail))?\(\s*(['"`])((?:\\.|(?!\2).)*)\2/g;
  for (const m of conteudo.matchAll(re)) {
    const meta = {};
    for (const tag of TAGS) {
      const t = m[1]?.match(new RegExp(`@${tag}\\s+([^\\n]*?)\\s*(?:\\*\\/)?$`, 'm'));
      meta[tag] = t ? t[1].replace(/\s*\*$/, '').trim() : '';
    }
    casos.push({ arquivo: caminho, titulo: m[3].replace(/\\(.)/g, '$1'), ...meta });
  }
  return casos;
}

// ---------------------------------------------------------------- utilidades

function rodar(comando, opcoes = {}) {
  log(comando);
  const r = spawnSync(comando, { cwd: ws, shell: true, encoding: 'utf8', maxBuffer: 1 << 28, ...opcoes });
  return { status: r.status, saida: (r.stdout ?? '') + (r.stderr ?? '') };
}

async function esperarPorta(url, ms = 60000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    try { await fetch(url); return true; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  return false;
}

function iniciar(comando, cwd, env) {
  const p = spawn(comando, { cwd, env: { ...process.env, ...env }, shell: true, stdio: 'ignore', detached: process.platform !== 'win32' });
  return () => {
    if (process.platform === 'win32') spawnSync(`taskkill /pid ${p.pid} /T /F`, { shell: true });
    else try { process.kill(-p.pid, 'SIGTERM'); } catch { /* já terminou */ }
  };
}

function lerJson(caminho) {
  try { return JSON.parse(readFileSync(caminho, 'utf8')); } catch { return null; }
}

export function lerPasta(pasta) {
  const arquivos = new Map();
  const rejeitados = [];
  const visitar = (dir) => {
    for (const nome of readdirSync(dir, { withFileTypes: true })) {
      if (nome.name === 'node_modules') continue;
      const completo = join(dir, nome.name);
      if (nome.isDirectory()) { visitar(completo); continue; }
      const caminho = relative(pasta, completo).split(sep).join('/');
      if (PASTAS_PERMITIDAS.some((p) => caminho.startsWith(p))) arquivos.set(caminho, readFileSync(completo, 'utf8'));
      else rejeitados.push(caminho);
    }
  };
  visitar(pasta);
  return { arquivos, rejeitados };
}

// ---------------------------------------------------------------- 2. Cópia de trabalho

const esperado = existsSync(join(RAIZ, 'dist', 'VERIFICACAO.txt')) ? readFileSync(join(RAIZ, 'dist', 'VERIFICACAO.txt'), 'utf8').trim() : null;
let informado = null;
let leuTudo = null;
let extraidos;
if (args.resposta) {
  const resposta = readFileSync(args.resposta, 'utf8');
  informado = resposta.match(/Verifica[çc][ãa]o:\s*\**([0-9A-Fa-f]{8})/)?.[1]?.toUpperCase() ?? null;
  leuTudo = esperado ? informado === esperado : null;
  log(`Código de verificação: esperado ${esperado ?? '?'}, informado ${informado ?? 'nenhum'}`);
  extraidos = extrairArquivos(resposta);
} else {
  // Com um agente, o código de verificação não se aplica: ele lê os arquivos da skill direto do disco.
  log(`Lendo os testes da pasta ${args.pasta}`);
  extraidos = lerPasta(args.pasta);
}
const { arquivos, rejeitados } = extraidos;
log(`${arquivos.size} arquivos de teste extraídos${rejeitados.length ? `, ${rejeitados.length} rejeitados (fora das pastas permitidas)` : ''}`);
if (!arquivos.size) { console.error('Nenhum arquivo de teste encontrado na resposta.'); process.exit(1); }

const IGNORAR = new Set(['node_modules', 'data', 'dist', '.env', '__testes__', 'e2e']);
if (!args['reaproveitar-instalacao'] || !existsSync(join(ws, 'node_modules'))) {
  rmSync(ws, { recursive: true, force: true });
  mkdirSync(ws, { recursive: true });
  cpSync(args.clinica, ws, { recursive: true, filter: (src) => !IGNORAR.has(src.split(/[\\/]/).pop()) });
  cpSync(join(AQUI, 'modelo'), ws, { recursive: true });
  const pkg = JSON.parse(readFileSync(join(ws, 'package.json'), 'utf8'));
  pkg.devDependencies = { ...pkg.devDependencies, ...FERRAMENTAS };
  writeFileSync(join(ws, 'package.json'), JSON.stringify(pkg, null, 2));
  // O package-lock.json de execucao/modelo/ fixa todas as dependências (inclusive as indiretas), para
  // que todos os modelos rodem com exatamente as mesmas versões das ferramentas.
  if (!existsSync(join(AQUI, 'modelo', 'package-lock.json'))) rmSync(join(ws, 'package-lock.json'), { force: true });
  const inst = rodar('npm install --no-audit --no-fund');
  if (inst.status !== 0) { console.error(inst.saida); process.exit(1); }
} else {
  for (const pasta of ['backend/__testes__', 'frontend/__testes__', 'e2e', '.cobertura']) rmSync(join(ws, pasta), { recursive: true, force: true });
}
for (const [caminho, conteudo] of arquivos) {
  mkdirSync(dirname(join(ws, caminho)), { recursive: true });
  writeFileSync(join(ws, caminho), conteudo);
}
mkdirSync(join(saida, 'testes'), { recursive: true });
rmSync(join(saida, 'testes'), { recursive: true, force: true });
for (const [caminho, conteudo] of arquivos) {
  mkdirSync(dirname(join(saida, 'testes', caminho)), { recursive: true });
  writeFileSync(join(saida, 'testes', caminho), conteudo);
}

// ---------------------------------------------------------------- 3. Execução

const resultados = new Map(); // "arquivo::titulo" -> [{ status, duracaoMs, erro }]
function registrar(arquivo, titulo, status, duracaoMs, erro = '') {
  const chave = `${arquivo}::${titulo}`;
  if (!resultados.has(chave)) resultados.set(chave, []);
  resultados.get(chave).push({ status, duracaoMs, erro: erro.replace(/\s+/g, ' ').slice(0, 300) });
}
const falhasDeCarga = [];
const STATUS = { passed: 'passou', failed: 'falhou', skipped: 'ignorado', pending: 'ignorado', todo: 'ignorado', timedOut: 'falhou', interrupted: 'falhou' };

function lerRelatorioJest(rel) {
  for (const arq of rel?.testResults ?? []) {
    const caminho = relative(ws, arq.name ?? arq.testFilePath).split(sep).join('/');
    if (!arq.assertionResults?.length && arq.status === 'failed') falhasDeCarga.push({ arquivo: caminho, erro: (arq.message ?? arq.failureMessage ?? '').slice(0, 500) });
    for (const t of arq.assertionResults ?? []) registrar(caminho, t.title, STATUS[t.status] ?? t.status, t.duration ?? 0, (t.failureMessages ?? []).join(' '));
  }
}

const temBackend = [...arquivos.keys()].some((c) => c.startsWith('backend/'));
const temFrontend = [...arquivos.keys()].some((c) => c.startsWith('frontend/'));
const specs = [...arquivos.keys()].filter((c) => c.startsWith('e2e/'));

if (temBackend) {
  rodar('npx jest --config jest.config.cjs --json --outputFile=.jest.json --coverage --forceExit', { env: { ...process.env, CLINICA_AGORA: '' } });
  lerRelatorioJest(lerJson(join(ws, '.jest.json')));
}
if (temFrontend) {
  rodar('npx vitest run --config vitest.config.mjs --reporter=json --outputFile=.vitest.json --coverage');
  lerRelatorioJest(lerJson(join(ws, '.vitest.json')));
}

if (specs.length && !args['sem-e2e']) {
  const env = { PORT: '3000', CLINICA_DB: join(ws, 'backend', 'data', 'e2e.db'), CLINICA_AGORA: AGORA_E2E };
  mkdirSync(join(ws, 'backend', 'data'), { recursive: true });
  const pararFront = iniciar('npx vite --port 5173 --strictPort', join(ws, 'frontend'), {});
  await esperarPorta('http://localhost:5173');
  for (const spec of specs) {
    rmSync(join(ws, '.playwright.json'), { force: true });
    rodar('node backend/src/db/seed.js --reset', { env: { ...process.env, ...env } });
    const pararApi = iniciar('node backend/src/server.js', ws, env);
    await esperarPorta('http://localhost:3000/api/saude');
    const r = rodar(`npx playwright test "${spec}" --config playwright.config.mjs --reporter=json`, { env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: '.playwright.json' } });
    pararApi();
    const rel = lerJson(join(ws, '.playwright.json'));
    if (rel?.errors?.length && !rel.suites?.length) falhasDeCarga.push({ arquivo: spec, erro: rel.errors.map((e) => e.message).join(' ').slice(0, 500) });
    const visitar = (suite) => {
      for (const s of suite.specs ?? []) {
        for (const t of s.tests ?? []) {
          const ultimo = t.results?.at(-1) ?? {};
          registrar(spec, s.title, STATUS[ultimo.status] ?? ultimo.status ?? 'erro', ultimo.duration ?? 0, (ultimo.errors ?? []).map((e) => e.message).join(' '));
        }
      }
      (suite.suites ?? []).forEach(visitar);
    };
    (rel?.suites ?? []).forEach(visitar);
    if (!rel) falhasDeCarga.push({ arquivo: spec, erro: r.saida.slice(-500) });
  }
  pararFront();
}

// ---------------------------------------------------------------- 4. Consolidação

const casos = [...arquivos].flatMap(([caminho, conteudo]) => lerCasos(caminho, conteudo));
const usados = new Map();
const linhas = casos.map((c) => {
  const chave = `${c.arquivo}::${c.titulo}`;
  const indice = usados.get(chave) ?? 0;
  usados.set(chave, indice + 1);
  let r = resultados.get(chave)?.[indice];
  if (!r) {
    const carga = falhasDeCarga.find((f) => f.arquivo === c.arquivo);
    const naoRodou = c.arquivo.startsWith('e2e/') && args['sem-e2e'];
    r = { status: naoRodou ? 'nao-executado' : carga ? 'erro-de-carga' : 'nao-encontrado', duracaoMs: 0, erro: carga?.erro ?? '' };
  }
  return { modelo, ...c, metadadosCompletos: TAGS.every((t) => c[t]) ? 'sim' : 'nao', ...r };
});

const COLUNAS = ['modelo', 'caso', 'nivel', 'atributo', 'subatributo', 'requisito', 'arquivo', 'titulo', 'objetivo', 'resultadoEsperado', 'metadadosCompletos', 'status', 'duracaoMs', 'erro'];
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
writeFileSync(join(saida, 'casos.csv'), '﻿' + [COLUNAS.join(';'), ...linhas.map((l) => COLUNAS.map((k) => csv(l[k])).join(';'))].join('\n'));

const contar = (campo) => linhas.reduce((acc, l) => ({ ...acc, [l[campo] || '(vazio)']: (acc[l[campo] || '(vazio)'] ?? 0) + 1 }), {});
const cobertura = (pasta) => lerJson(join(ws, '.cobertura', pasta, 'coverage-summary.json'))?.total ?? null;
const resumo = {
  modelo,
  data: new Date().toISOString(),
  origem: args.resposta ? 'chat' : 'agente',
  verificacao: { esperado, informado, leuEntradaCompleta: leuTudo },
  totalCasos: linhas.length,
  arquivos: arquivos.size,
  arquivosRejeitados: rejeitados,
  falhasDeCarga,
  porStatus: contar('status'),
  porNivel: contar('nivel'),
  porAtributo: contar('atributo'),
  metadadosCompletos: linhas.filter((l) => l.metadadosCompletos === 'sim').length,
  requisitosCobertos: [...new Set(linhas.flatMap((l) => l.requisito.split(/[,;\s]+/).filter(Boolean)))].sort(),
  cobertura: { backend: cobertura('backend'), frontend: cobertura('frontend') },
};
writeFileSync(join(saida, 'resumo.json'), JSON.stringify(resumo, null, 2));
console.log(JSON.stringify({ totalCasos: resumo.totalCasos, porStatus: resumo.porStatus, porNivel: resumo.porNivel, cobertura: { backend: resumo.cobertura.backend?.lines?.pct, frontend: resumo.cobertura.frontend?.lines?.pct } }, null, 2));
log(`Resultados em ${relative(process.cwd(), saida)}`);
