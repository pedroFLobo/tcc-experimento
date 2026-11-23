// Funções compartilhadas pelas ferramentas de avaliação (preparar-avaliacao, ficha e métricas).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const NIVEIS = ['unitario', 'integracao', 'api', 'e2e'];
export const PROPORCAO_ALVO = { unitario: 0.45, integracao: 0.25, api: 0.2, e2e: 0.1 };
export const ATRIBUTOS = [
  'adequacao-funcional', 'seguranca', 'confiabilidade', 'usabilidade',
  'eficiencia-de-desempenho', 'compatibilidade', 'manutenibilidade',
];
export const CRITERIOS = ['aderencia', 'correcao', 'oraculo', 'clareza', 'relevancia'];
export const NOTAS = [2, 4, 6, 8, 10];

// ---------------------------------------------------------------- CSV (separador ;)

export function lerCsv(texto) {
  texto = texto.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const linhas = [];
  let linha = [];
  let campo = '';
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ';') { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  const validas = linhas.filter((l) => l.some((v) => v.trim() !== ''));
  if (!validas.length) return [];
  const cab = validas[0].map((h) => h.trim());
  return validas.slice(1).map((l) => Object.fromEntries(cab.map((h, i) => [h, (l[i] ?? '').trim()])));
}

export function escreverCsv(linhas, colunas) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '\uFEFF' + [colunas.join(';'), ...linhas.map((l) => colunas.map((c) => q(l[c])).join(';'))].join('\n') + '\n';
}

export const lerCsvArquivo = (caminho) => (existsSync(caminho) ? lerCsv(readFileSync(caminho, 'utf8')) : []);
export const lerJson = (caminho) => { try { return JSON.parse(readFileSync(caminho, 'utf8')); } catch { return null; } };

// ---------------------------------------------------------------- arquivos

export function listarArquivos(pasta, base = pasta) {
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta).flatMap((nome) => {
    const c = join(pasta, nome);
    return statSync(c).isDirectory() ? listarArquivos(c, base) : [c.slice(base.length + 1).split('\\').join('/')];
  });
}

export function modelosComResultado() {
  const pasta = join(RAIZ, 'resultados');
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta).filter((m) => existsSync(join(pasta, m, 'casos.csv'))).sort();
}

// ---------------------------------------------------------------- testes

// Encontra cada test()/it() com o bloco JSDoc acima dele e devolve o trecho completo do caso.
export function extrairBlocos(conteudo) {
  const re = /(\/\*\*(?:(?!\*\/)[\s\S])*?\*\/\s*)?\b(?:test|it)(\.(?:only|skip|concurrent|fixme|fail))?\(\s*(['"`])((?:\\.|(?!\3).)*)\3/g;
  const blocos = [];
  for (const m of conteudo.matchAll(re)) {
    const inicio = m.index;
    const abre = conteudo.indexOf('(', inicio + (m[1]?.length ?? 0));
    const fim = fecharParenteses(conteudo, abre);
    blocos.push({
      titulo: m[4].replace(/\\(.)/g, '$1'),
      modificador: m[2]?.slice(1) ?? '',
      jsdoc: m[1] ?? '',
      codigo: conteudo.slice(inicio, fim + 1).trim(),
      corpo: conteudo.slice(abre, fim + 1),
      linha: conteudo.slice(0, inicio).split('\n').length + (m[1] ? m[1].split('\n').length - 1 : 0),
    });
  }
  return blocos;
}

function fecharParenteses(s, i) {
  let nivel = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '/') { i = s.indexOf('\n', i); if (i < 0) return s.length - 1; continue; }
    if (c === '/' && s[i + 1] === '*') { i = s.indexOf('*/', i + 2) + 1; if (i <= 0) return s.length - 1; continue; }
    if (c === '"' || c === "'" || c === '`') {
      for (i++; i < s.length && s[i] !== c; i++) if (s[i] === '\\') i++;
      continue;
    }
    if (c === '(' || c === '{' || c === '[') nivel++;
    else if (c === ')' || c === '}' || c === ']') { nivel--; if (nivel === 0) return i; }
  }
  return s.length - 1;
}

// ---------------------------------------------------------------- análise estática (test smells)

const RE_ASSERCAO = /\bexpect(?:\.soft)?\s*\(|\bassert(?:\.\w+)?\s*\(/g;
const RE_FRACA = /\.(?:not\.)?(?:toBeTruthy|toBeDefined|toBeFalsy|toBeUndefined|toBeNull|toBeInstanceOf)\s*\(/g;
export const SMELLS = [
  { id: 'semAssercao', nome: 'Sem asserção (Unknown Test)', teste: (b, n) => n === 0 },
  { id: 'assercaoFraca', nome: 'Só asserções fracas (toBeTruthy, toBeDefined...)', teste: (b, n) => n > 0 && (b.corpo.match(RE_FRACA)?.length ?? 0) >= n },
  { id: 'assercaoRedundante', nome: 'Asserção redundante (Redundant Assertion)', teste: (b) => /expect\(\s*(true|false|-?\d+|'[^']*'|"[^"]*")\s*\)\s*\.(?:toBe|toEqual|toStrictEqual)\(\s*\1\s*\)/.test(b.corpo) },
  { id: 'esperaFixa', nome: 'Espera fixa (Sleepy Test)', teste: (b) => /waitForTimeout\s*\(|\bsetTimeout\s*\(|\bsleep\s*\(/.test(b.corpo) },
  { id: 'logicaCondicional', nome: 'Lógica condicional (Conditional Test Logic)', teste: (b) => /\b(?:if|for|while|switch)\s*\(/.test(semComentarios(b.corpo)) },
  { id: 'capturaExcecao', nome: 'Captura de exceção (Exception Handling)', teste: (b) => /\btry\s*\{/.test(b.corpo) },
  { id: 'impressao', nome: 'Impressão no console (Print Statement)', teste: (b) => /console\.(?:log|info|warn|error)\s*\(/.test(b.corpo) },
  { id: 'ignorado', nome: 'Teste ignorado ou exclusivo (.skip/.only)', teste: (b) => ['skip', 'only', 'fixme'].includes(b.modificador) },
  { id: 'vazio', nome: 'Teste vazio (Empty Test)', teste: (b) => !/[;\w]/.test(semComentarios(b.corpo).replace(/^\(\s*(['"`])(?:\\.|(?!\1).)*\1\s*,\s*(?:async\s*)?(?:\([^)]*\)|\w+)?\s*=>\s*/, '').replace(/^\(\s*(['"`])(?:\\.|(?!\1).)*\1\s*,\s*(?:async\s+)?function\s*\([^)]*\)\s*/, '')) },
];
function semComentarios(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1'); }
function normalizarCorpo(b) {
  return semComentarios(b.corpo).replace(/^\(\s*(['"`])(?:\\.|(?!\1).)*\1/, '(').replace(/\s+/g, '');
}

export function analisarCaso(b) {
  const assercoes = semComentarios(b.corpo).match(RE_ASSERCAO)?.length ?? 0;
  return {
    assercoes,
    smells: SMELLS.filter((s) => s.teste(b, assercoes)).map((s) => s.id),
    assinatura: createHash('sha1').update(normalizarCorpo(b)).digest('hex'),
  };
}

// ---------------------------------------------------------------- aleatoriedade reprodutível

export function geradorAleatorio(semente) {
  let s = semente >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 2 ** 32; };
}

export function embaralhar(lista, aleatorio) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------- estatística

export const media = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
export const arred = (v, casas = 2) => (v == null || Number.isNaN(v) ? null : Math.round(v * 10 ** casas) / 10 ** casas);
export function desvio(v) {
  if (v.length < 2) return null;
  const m = media(v);
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
}
export function mediana(v) {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Kappa de Cohen ponderado (pesos quadráticos) para notas na escala 2-4-6-8-10.
export function kappaPonderado(pares) {
  const k = NOTAS.length;
  const idx = (n) => NOTAS.indexOf(Number(n));
  const validos = pares.filter(([a, b]) => idx(a) >= 0 && idx(b) >= 0);
  const n = validos.length;
  if (n < 2) return null;
  const obs = Array.from({ length: k }, () => Array(k).fill(0));
  for (const [a, b] of validos) obs[idx(a)][idx(b)]++;
  const linha = obs.map((r) => r.reduce((x, y) => x + y, 0));
  const coluna = obs[0].map((_, j) => obs.reduce((x, r) => x + r[j], 0));
  let po = 0;
  let pe = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const w = ((i - j) / (k - 1)) ** 2;
      po += w * obs[i][j] / n;
      pe += w * (linha[i] * coluna[j]) / (n * n);
    }
  }
  return pe === 0 ? null : 1 - po / pe;
}

// Interpretação de Landis e Koch (1977).
export function interpretarKappa(k) {
  if (k == null) return '';
  if (k < 0) return 'pobre';
  if (k <= 0.2) return 'leve';
  if (k <= 0.4) return 'razoável';
  if (k <= 0.6) return 'moderada';
  if (k <= 0.8) return 'substancial';
  return 'quase perfeita';
}

export function spearman(pares) {
  const n = pares.length;
  if (n < 3) return null;
  const postos = (v) => {
    const ord = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
    const r = Array(n);
    for (let i = 0; i < n;) {
      let j = i;
      while (j + 1 < n && ord[j + 1][0] === ord[i][0]) j++;
      for (let t = i; t <= j; t++) r[ord[t][1]] = (i + j) / 2 + 1;
      i = j + 1;
    }
    return r;
  };
  const a = postos(pares.map((p) => Number(p[0])));
  const b = postos(pares.map((p) => Number(p[1])));
  const ma = media(a);
  const mb = media(b);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : null;
}
