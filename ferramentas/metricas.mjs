// Consolida as métricas do experimento em metricas/metricas.xlsx (e metricas.json).
//
// Uso:
//   node ferramentas/metricas.mjs [--clinica ../clinica-plus]
//
// Lê o que existir, nesta ordem (as etapas que ainda não foram feitas ficam em branco):
//   resultados/<modelo>/           casos.csv, resumo.json e testes/ (do executor)
//   respostas/                     registro.csv e a resposta bruta de cada modelo
//   avaliacao/casos.csv            casos com ID de avaliação (de preparar-avaliacao.mjs)
//   avaliacao/juiz/*.csv           respostas do juiz (coluna caso = ID de avaliação)
//   avaliacao/painel-humano/ficha-*.xlsx   fichas preenchidas
//   avaliacao/pesos.json           pesos dos atributos ISO (criado com pesos iguais se não existir)
import ExcelJS from 'exceljs';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  ATRIBUTOS, CRITERIOS, NIVEIS, SMELLS, analisarCaso, NOTAS, PROPORCAO_ALVO, RAIZ, arred, desvio, escreverCsv, extrairBlocos,
  interpretarKappa, kappaPonderado, lerCsv, lerCsvArquivo, lerJson, listarArquivos, media, mediana,
  modelosComResultado, spearman,
} from './lib.mjs';

const { values: args } = parseArgs({ options: { clinica: { type: 'string', default: join(RAIZ, '..', 'clinica-plus') } } });

const modelos = modelosComResultado();
if (!modelos.length) {
  console.error('Nenhum resultado em resultados/<modelo>/. Rode o executor antes.');
  process.exit(1);
}

// ---------------------------------------------------------------- base de teste

const SUBATRIBUTOS = {
  'adequacao-funcional': ['completude', 'correcao', 'pertinencia'],
  seguranca: ['confidencialidade', 'integridade', 'autenticidade', 'responsabilizacao'],
  confiabilidade: ['maturidade', 'tolerancia-a-falhas', 'recuperabilidade'],
  usabilidade: ['operabilidade', 'protecao-contra-erro-do-usuario', 'reconhecibilidade', 'acessibilidade'],
  'eficiencia-de-desempenho': ['comportamento-no-tempo', 'utilizacao-de-recursos'],
  compatibilidade: ['interoperabilidade', 'coexistencia'],
  manutenibilidade: ['testabilidade', 'modularidade'],
};
const TOTAL_SUB = Object.values(SUBATRIBUTOS).flat().length;
const textoReq = readFileSync(join(args.clinica, 'docs', 'REQUISITOS.md'), 'utf8');
const REQUISITOS = [...new Set(textoReq.match(/\b(?:RNF|RF|RN)\d{2}\b/g))].sort();
const tipoReq = (r) => r.match(/^(RNF|RF|RN)/)[1];
const REQ_POR_TIPO = { RF: REQUISITOS.filter((r) => tipoReq(r) === 'RF'), RN: REQUISITOS.filter((r) => tipoReq(r) === 'RN'), RNF: REQUISITOS.filter((r) => tipoReq(r) === 'RNF') };
const citados = (campo) => (String(campo).toUpperCase().match(/\b(?:RNF|RF|RN)\d{2}(?:\.\d+)?\b/g) ?? []);
const base = (id) => id.replace(/\.\d+$/, '');

// ---------------------------------------------------------------- leitura por modelo

const registro = lerCsvArquivo(join(RAIZ, 'respostas', 'registro.csv'));
const dados = {};
for (const m of modelos) {
  const pasta = join(RAIZ, 'resultados', m);
  const resumo = lerJson(join(pasta, 'resumo.json')) ?? {};
  const casos = lerCsvArquivo(join(pasta, 'casos.csv'));
  const blocosArq = new Map(listarArquivos(join(pasta, 'testes')).map((rel) => [rel, extrairBlocos(readFileSync(join(pasta, 'testes', rel), 'utf8'))]));
  const usados = new Map();
  const vistos = new Set();
  for (const c of casos) {
    const pos = usados.get(c.arquivo) ?? 0;
    usados.set(c.arquivo, pos + 1);
    const blocos = blocosArq.get(c.arquivo) ?? [];
    const b = blocos[pos]?.titulo === c.titulo ? blocos[pos] : blocos.find((x) => x.titulo === c.titulo);
    const an = b ? analisarCaso(b) : null;
    c.assercoes = an?.assercoes ?? null;
    c.smells = an?.smells ?? [];
    const h = an?.assinatura ?? null;
    c.duplicado = h && vistos.has(h) ? 'sim' : 'nao';
    if (h) vistos.add(h);
  }
  const reg = registro.filter((r) => (r.modelo ?? '').toLowerCase().replace(/[^a-z0-9-]+/g, '-') === m).at(-1);
  const arqResp = ['md', 'txt'].map((e) => join(RAIZ, 'respostas', `${m}.${e}`)).find(existsSync);
  dados[m] = { resumo, casos, reg, tamanhoResposta: arqResp ? readFileSync(arqResp, 'utf8').length : null };
}

// ---------------------------------------------------------------- juiz e painel

const casosAvaliados = new Map(lerCsvArquivo(join(RAIZ, 'avaliacao', 'casos.csv')).map((c) => [c.idAvaliacao, c]));
const modeloDoId = (id) => casosAvaliados.get(String(id))?.modelo;
const avisos = [];

function lerJuiz() {
  const pasta = join(RAIZ, 'avaliacao', 'juiz');
  const notas = new Map();
  if (!existsSync(pasta)) return notas;
  for (const arq of readdirSync(pasta).filter((f) => f.endsWith('.csv')).sort()) {
    const linhas = readFileSync(join(pasta, arq), 'utf8').replace(/^﻿/, '').split(/\r?\n/)
      .filter((l) => !l.trim().startsWith('```'));
    const ini = linhas.findIndex((l) => /\baderencia\b/i.test(l));
    const texto = ini >= 0 ? linhas.slice(ini).join('\n') : ['caso;aderencia;correcao;oraculo;clareza;relevancia;nota;justificativa', ...linhas].join('\n');
    for (const l of lerCsv(texto)) {
      const id = l.caso?.replace(/^"|"$/g, '').trim();
      if (!id) continue;
      if (!casosAvaliados.has(id)) { avisos.push(`juiz/${arq}: ID desconhecido ${id}`); continue; }
      const n = Object.fromEntries(CRITERIOS.map((k) => [k, Number(l[k])]));
      if (CRITERIOS.some((k) => !NOTAS.includes(n[k]))) { avisos.push(`juiz/${arq}: nota fora da escala em ${id}`); continue; }
      if (notas.has(id)) avisos.push(`juiz: ${id} avaliado mais de uma vez; vale a última (${arq})`);
      notas.set(id, { ...n, nota: media(CRITERIOS.map((k) => n[k])), justificativa: l.justificativa ?? '' });
    }
  }
  return notas;
}

async function lerPainel() {
  const pasta = join(RAIZ, 'avaliacao', 'painel-humano');
  const lista = [];
  if (!existsSync(pasta)) return lista;
  for (const arq of readdirSync(pasta).filter((f) => /^ficha-.*\.xlsx$/.test(f)).sort()) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(join(pasta, arq));
    const ws = wb.getWorksheet('Avaliação');
    if (!ws) continue;
    const cab = ws.getRow(1).values;
    const col = (nome) => cab.findIndex((v) => v === nome);
    const idx = { id: col('ID de avaliação'), aderencia: col('Aderência'), correcao: col('Correção'), oraculo: col('Oráculo'), clareza: col('Clareza'), relevancia: col('Relevância'), defeito: col('Revela defeito do sistema?') };
    const avaliador = arq.replace(/^ficha-|\.xlsx$/g, '');
    ws.eachRow((r, i) => {
      if (i === 1) return;
      const v = (k) => { const x = r.getCell(idx[k]).value; return x && typeof x === 'object' && 'result' in x ? x.result : x; };
      const n = Object.fromEntries(CRITERIOS.map((k) => [k, Number(v(k))]));
      if (CRITERIOS.some((k) => !NOTAS.includes(n[k]))) return; // linha incompleta
      lista.push({ avaliador, id: String(v('id')), ...n, nota: media(CRITERIOS.map((k) => n[k])), defeito: String(v('defeito') ?? '') });
    });
  }
  return lista;
}

const juiz = lerJuiz();
const painel = await lerPainel();
let pesos = lerJson(join(RAIZ, 'avaliacao', 'pesos.json'));
if (!pesos) {
  pesos = { aviso: 'Pesos provisórios (todos iguais). Defina com o orientador e rode as métricas de novo.', pesos: Object.fromEntries(ATRIBUTOS.map((a) => [a, 1])) };
  writeFileSync(join(RAIZ, 'avaliacao', 'pesos.json'), JSON.stringify(pesos, null, 2));
}

// ---------------------------------------------------------------- cálculo

const pct = (a, b) => (b ? arred((100 * a) / b, 1) : null);
const contar = (lista, f) => lista.filter(f).length;

function notasDoModelo(fonte, m) {
  return fonte.filter((x) => modeloDoId(x.id) === m);
}
const listaJuiz = [...juiz].map(([id, n]) => ({ id, ...n }));

function notaPonderada(lista) {
  const porAtr = {};
  for (const x of lista) {
    const a = casosAvaliados.get(x.id)?.atributo;
    if (!ATRIBUTOS.includes(a)) continue;
    (porAtr[a] ??= []).push(x.nota);
  }
  let soma = 0, somaPesos = 0;
  for (const [a, v] of Object.entries(porAtr)) { const w = Number(pesos.pesos[a] ?? 0); soma += w * media(v); somaPesos += w; }
  return somaPesos ? soma / somaPesos : null;
}

const M = {};
for (const m of modelos) {
  const { resumo, casos, reg, tamanhoResposta } = dados[m];
  const n = casos.length;
  const nivel = Object.fromEntries(NIVEIS.map((x) => [x, contar(casos, (c) => c.nivel === x)]));
  const propor = Object.fromEntries(NIVEIS.map((x) => [x, n ? nivel[x] / n : 0]));
  const atr = Object.fromEntries(ATRIBUTOS.map((a) => [a, contar(casos, (c) => c.atributo === a)]));
  const subs = new Set(casos.filter((c) => SUBATRIBUTOS[c.atributo]?.includes(c.subatributo)).map((c) => `${c.atributo}/${c.subatributo}`));
  const reqsCitados = casos.flatMap((c) => citados(c.requisito));
  const reqsValidos = new Set(reqsCitados.map(base).filter((r) => REQUISITOS.includes(r)));
  const reqsInvalidos = [...new Set(reqsCitados.filter((r) => !REQUISITOS.includes(base(r))))];
  const pAtr = Object.values(atr).map((v) => (n ? v / n : 0)).filter((p) => p > 0);
  const shannon = -pAtr.reduce((a, p) => a + p * Math.log(p), 0);
  const assercoes = casos.map((c) => c.assercoes).filter((v) => v != null);
  const status = (s) => contar(casos, (c) => c.status === s);
  const arquivosCarga = new Set((resumo.falhasDeCarga ?? []).map((f) => f.arquivo)).size;
  const cob = (lado, k) => resumo.cobertura?.[lado]?.[k]?.pct ?? null;
  const j = notasDoModelo(listaJuiz, m);
  const h = notasDoModelo(painel, m);

  M[m] = {
    // geração
    verificacao: resumo.verificacao?.leuEntradaCompleta == null ? '' : resumo.verificacao.leuEntradaCompleta ? 'sim' : 'não',
    continuacoes: reg?.continuacoes ?? '',
    tamanhoResposta,
    tokensResposta: tamanhoResposta ? Math.round(tamanhoResposta / 4) : null,
    arquivos: resumo.arquivos ?? null,
    arquivosRejeitados: resumo.arquivosRejeitados?.length ?? 0,
    casos: n,
    // pirâmide
    ...Object.fromEntries(NIVEIS.map((x) => [`n_${x}`, nivel[x]])),
    ...Object.fromEntries(NIVEIS.map((x) => [`p_${x}`, arred(100 * propor[x], 1)])),
    semNivel: n - Object.values(nivel).reduce((a, b) => a + b, 0),
    distanciaPiramide: arred(0.5 * NIVEIS.reduce((a, x) => a + Math.abs(propor[x] - PROPORCAO_ALVO[x]), 0), 3),
    formaPiramide: nivel.unitario >= nivel.integracao && nivel.integracao >= nivel.api && nivel.api >= nivel.e2e ? 'sim' : 'não',
    niveisCobertos: NIVEIS.filter((x) => nivel[x]).length,
    // ISO
    atributosCobertos: Object.values(atr).filter(Boolean).length,
    subatributosCobertos: subs.size,
    equilibrioAtributos: pAtr.length > 1 ? arred(shannon / Math.log(ATRIBUTOS.length), 3) : 0,
    atributoInvalido: contar(casos, (c) => c.atributo && !ATRIBUTOS.includes(c.atributo)),
    ...Object.fromEntries(ATRIBUTOS.map((a) => [`atr_${a}`, atr[a]])),
    // rastreabilidade
    casosComRequisito: pct(contar(casos, (c) => citados(c.requisito).some((r) => REQUISITOS.includes(base(r)))), n),
    reqRF: reqsValidosPorTipo(reqsValidos, 'RF'),
    reqRN: reqsValidosPorTipo(reqsValidos, 'RN'),
    reqRNF: reqsValidosPorTipo(reqsValidos, 'RNF'),
    reqTotal: pct(reqsValidos.size, REQUISITOS.length),
    reqInexistentes: reqsInvalidos.length,
    metadadosCompletos: pct(contar(casos, (c) => c.metadadosCompletos === 'sim'), n),
    idsRepetidos: casos.length - new Set(casos.filter((c) => c.caso).map((c) => c.caso)).size - contar(casos, (c) => !c.caso),
    // execução
    passou: pct(status('passou'), n),
    falhou: pct(status('falhou'), n),
    erroCarga: pct(status('erro-de-carga'), n),
    outros: pct(n - status('passou') - status('falhou') - status('erro-de-carga'), n),
    arquivosQueCarregaram: pct((resumo.arquivos ?? 0) - arquivosCarga, resumo.arquivos ?? 0),
    tempoExecucao: arred(casos.reduce((a, c) => a + Number(c.duracaoMs || 0), 0) / 1000, 1),
    // cobertura
    cobBackLinhas: cob('backend', 'lines'), cobBackRamos: cob('backend', 'branches'), cobBackFuncoes: cob('backend', 'functions'), cobBackComandos: cob('backend', 'statements'),
    cobFrontLinhas: cob('frontend', 'lines'), cobFrontRamos: cob('frontend', 'branches'), cobFrontFuncoes: cob('frontend', 'functions'), cobFrontComandos: cob('frontend', 'statements'),
    // estática
    assercoesMedia: arred(media(assercoes), 2),
    assercoesMediana: mediana(assercoes),
    ...Object.fromEntries(SMELLS.map((s) => [`smell_${s.id}`, pct(contar(casos, (c) => c.smells.includes(s.id)), n)])),
    casosComSmell: pct(contar(casos, (c) => c.smells.length), n),
    duplicados: pct(contar(casos, (c) => c.duplicado === 'sim'), n),
    // juiz
    juizAvaliados: j.length,
    juizCobertura: pct(j.length, n),
    ...Object.fromEntries(CRITERIOS.map((k) => [`juiz_${k}`, arred(media(j.map((x) => x[k])), 2)])),
    juizNota: arred(media(j.map((x) => x.nota)), 2),
    juizDesvio: arred(desvio(j.map((x) => x.nota)), 2),
    juizPonderada: arred(notaPonderada(j), 2),
    // humano
    humanoAvaliacoes: h.length,
    ...Object.fromEntries(CRITERIOS.map((k) => [`humano_${k}`, arred(media(h.map((x) => x[k])), 2)])),
    humanoNota: arred(media(h.map((x) => x.nota)), 2),
    humanoDesvio: arred(desvio(h.map((x) => x.nota)), 2),
    humanoPonderada: arred(notaPonderada(h), 2),
    defeitosReais: contar(h, (x) => x.defeito === 'sim'),
  };
}
function reqsValidosPorTipo(set, tipo) {
  return `${[...set].filter((r) => tipoReq(r) === tipo).length}/${REQ_POR_TIPO[tipo].length}`;
}

// Concordância juiz × humano (e entre humanos), por critério.
function concordancia(paresPorCriterio) {
  return [...CRITERIOS, 'nota'].map((k) => {
    const pares = paresPorCriterio(k);
    const discretos = k === 'nota' ? pares.map(([a, b]) => [2 * Math.round(a / 2), 2 * Math.round(b / 2)]) : pares;
    const kappa = kappaPonderado(discretos);
    return {
      criterio: k,
      pares: pares.length,
      exata: pct(contar(pares, ([a, b]) => a === b), pares.length),
      ate2: pct(contar(pares, ([a, b]) => Math.abs(a - b) <= 2), pares.length),
      kappa: arred(kappa, 3),
      interpretacao: interpretarKappa(kappa),
      spearman: arred(spearman(pares), 3),
      vies: arred(media(pares.map(([a, b]) => a - b)), 2),
    };
  });
}
const concJuizHumano = concordancia((k) => painel.filter((h) => juiz.has(h.id)).map((h) => [juiz.get(h.id)[k], h[k]]));
const avaliadores = [...new Set(painel.map((h) => h.avaliador))];
const concHumanos = [];
for (let i = 0; i < avaliadores.length; i++) {
  for (let t = i + 1; t < avaliadores.length; t++) {
    const a = new Map(painel.filter((h) => h.avaliador === avaliadores[i]).map((h) => [h.id, h]));
    const b = painel.filter((h) => h.avaliador === avaliadores[t] && a.has(h.id));
    for (const linha of concordancia((k) => b.map((h) => [a.get(h.id)[k], h[k]]))) concHumanos.push({ par: `${avaliadores[i]} × ${avaliadores[t]}`, ...linha });
  }
}

// Sistema-alvo
function sistemaAlvo() {
  const raiz = args.clinica;
  if (!existsSync(raiz)) return null;
  const loc = (pasta, exts) => {
    let arquivos = 0, linhas = 0;
    const visitar = (p) => {
      for (const nome of readdirSync(p)) {
        const c = join(p, nome);
        if (statSync(c).isDirectory()) { if (!['node_modules', 'dist', 'data'].includes(nome)) visitar(c); continue; }
        if (!exts.some((e) => nome.endsWith(e))) continue;
        arquivos++;
        linhas += readFileSync(c, 'utf8').split('\n').filter((l) => l.trim()).length;
      }
    };
    if (existsSync(pasta)) visitar(pasta);
    return { arquivos, linhas };
  };
  const back = loc(join(raiz, 'backend', 'src'), ['.js']);
  const front = loc(join(raiz, 'frontend', 'src'), ['.js', '.jsx']);
  const rotas = listarArquivos(join(raiz, 'backend', 'src'))
    .map((f) => readFileSync(join(raiz, 'backend', 'src', f), 'utf8').match(/\b(?:router|app)\.(?:get|post|put|patch|delete)\s*\(/g)?.length ?? 0)
    .reduce((a, b) => a + b, 0);
  const paginas = listarArquivos(join(raiz, 'frontend', 'src', 'pages')).filter((f) => f.endsWith('.jsx')).length;
  return [
    ['Arquivos de código do backend', back.arquivos],
    ['Linhas de código do backend (não vazias)', back.linhas],
    ['Arquivos de código do frontend', front.arquivos],
    ['Linhas de código do frontend (não vazias, sem CSS)', front.linhas],
    ['Rotas HTTP da API', rotas],
    ['Telas (páginas React)', paginas],
    ['Requisitos funcionais (RF)', REQ_POR_TIPO.RF.length],
    ['Regras de negócio (RN)', REQ_POR_TIPO.RN.length],
    ['Requisitos não funcionais (RNF)', REQ_POR_TIPO.RNF.length],
    ['Atributos ISO/IEC 25010 avaliados', ATRIBUTOS.length],
    ['Subatributos permitidos', TOTAL_SUB],
  ];
}

// ---------------------------------------------------------------- definições das métricas

const D = (grupo, id, nome, definicao, ref = '', formato = '') => ({ grupo, id, nome, definicao, ref, formato });
const DEFS = [
  D('Geração', 'verificacao', 'Leu a entrada inteira?', 'O modelo começou a resposta com o código de verificação correto (prova que a janela comportou o pacote).'),
  D('Geração', 'continuacoes', 'Continuações usadas', 'Quantas vezes foi preciso enviar "continuar" (registro.csv).'),
  D('Geração', 'tokensResposta', 'Tamanho da resposta (≈tokens)', 'Caracteres da resposta bruta ÷ 4 (estimativa).'),
  D('Geração', 'arquivos', 'Arquivos de teste', 'Arquivos extraídos da resposta.'),
  D('Geração', 'arquivosRejeitados', 'Arquivos rejeitados', 'Arquivos fora das pastas permitidas (ignorados).'),
  D('Geração', 'casos', 'Casos de teste', 'Total de test()/it() gerados.', 'Wang et al. (2024)'),
  ...NIVEIS.map((x) => D('Pirâmide', `n_${x}`, `Casos ${x}`, `Casos com @nivel ${x}.`)),
  ...NIVEIS.map((x) => D('Pirâmide', `p_${x}`, `% ${x} (alvo ${PROPORCAO_ALVO[x] * 100}%)`, `Proporção de casos ${x}.`, 'Cohn (2009)', '%')),
  D('Pirâmide', 'semNivel', 'Casos sem nível válido', 'Casos sem @nivel ou com valor fora da lista.'),
  D('Pirâmide', 'distanciaPiramide', 'Distância à pirâmide-alvo', 'Distância de variação total entre a proporção gerada e a indicada (0 = igual; 1 = oposta).', 'Cohn (2009)'),
  D('Pirâmide', 'formaPiramide', 'Tem forma de pirâmide?', 'unitário ≥ integração ≥ API ≥ E2E.'),
  D('Pirâmide', 'niveisCobertos', 'Níveis cobertos (de 4)', 'Níveis com ao menos um caso.'),
  D('ISO/IEC 25010', 'atributosCobertos', 'Atributos cobertos (de 7)', 'Atributos com ao menos um caso.', 'ISO/IEC 25010:2023'),
  D('ISO/IEC 25010', 'subatributosCobertos', `Subatributos cobertos (de ${TOTAL_SUB})`, 'Pares atributo/subatributo válidos com ao menos um caso.', 'ISO/IEC 25010:2023'),
  D('ISO/IEC 25010', 'equilibrioAtributos', 'Equilíbrio entre atributos', 'Equitabilidade de Shannon (Pielou) da distribuição dos casos entre os 7 atributos: 1 = distribuição igual; perto de 0 = concentrada.'),
  D('ISO/IEC 25010', 'atributoInvalido', 'Casos com atributo inválido', 'Valor de @atributo fora da lista.'),
  ...ATRIBUTOS.map((a) => D('ISO/IEC 25010', `atr_${a}`, `Casos de ${a}`, `Casos com @atributo ${a}.`)),
  D('Rastreabilidade', 'casosComRequisito', '% casos ligados a requisito', 'Casos que citam ao menos um requisito existente.', 'ISO/IEC/IEEE 29119-3:2021', '%'),
  D('Rastreabilidade', 'reqRF', 'RF cobertos', 'Requisitos funcionais citados por algum caso.'),
  D('Rastreabilidade', 'reqRN', 'RN cobertas', 'Regras de negócio citadas por algum caso.'),
  D('Rastreabilidade', 'reqRNF', 'RNF cobertos', 'Requisitos não funcionais citados por algum caso.'),
  D('Rastreabilidade', 'reqTotal', '% requisitos cobertos', `Requisitos distintos citados ÷ ${REQUISITOS.length}.`, '', '%'),
  D('Rastreabilidade', 'reqInexistentes', 'Requisitos inexistentes citados', 'IDs que não existem no REQUISITOS.md (alucinação de rastreabilidade).'),
  D('Rastreabilidade', 'metadadosCompletos', '% metadados completos', 'Casos com as 7 tags preenchidas.', '', '%'),
  D('Rastreabilidade', 'idsRepetidos', '@caso repetidos', 'IDs de caso usados mais de uma vez.'),
  D('Execução', 'passou', '% passou', 'Casos que passaram.', 'Schäfer et al. (2024); Siddiq et al. (2024)', '%'),
  D('Execução', 'falhou', '% falhou', 'Casos que rodaram e falharam (erro do teste ou defeito do sistema; o juiz e o painel distinguem).', '', '%'),
  D('Execução', 'erroCarga', '% erro de carga', 'Casos cujo arquivo nem rodou (sintaxe, import, API inexistente).', 'Siddiq et al. (2024)', '%'),
  D('Execução', 'outros', '% outros', 'Ignorados, não encontrados ou não executados.', '', '%'),
  D('Execução', 'arquivosQueCarregaram', '% arquivos que carregaram', 'Arquivos sem falha de carga.', '', '%'),
  D('Execução', 'tempoExecucao', 'Tempo de execução (s)', 'Soma da duração dos casos.'),
  ...[['Back', 'backend'], ['Front', 'frontend']].flatMap(([s, l]) => [['Linhas', 'linhas'], ['Ramos', 'ramos'], ['Funcoes', 'funções'], ['Comandos', 'comandos']].map(([k, nome]) =>
    D('Cobertura', `cob${s}${k}`, `Cobertura ${l}: ${nome} (%)`, `Cobertura de ${nome} do ${l} (Jest/Vitest, v8).`, 'Schäfer et al. (2024); Inozemtseva e Holmes (2014)', '%'))),
  D('Qualidade estática', 'assercoesMedia', 'Asserções por caso (média)', 'Chamadas expect()/assert() por caso.', 'Schäfer et al. (2024)'),
  D('Qualidade estática', 'assercoesMediana', 'Asserções por caso (mediana)', ''),
  ...SMELLS.map((s) => D('Qualidade estática', `smell_${s.id}`, `% ${s.nome}`, 'Detecção heurística por expressão regular.', 'van Deursen et al. (2001); Peruma et al. (2020)', '%')),
  D('Qualidade estática', 'casosComSmell', '% casos com algum smell', '', 'Siddiq et al. (2024)', '%'),
  D('Qualidade estática', 'duplicados', '% casos duplicados', 'Corpo idêntico (sem comentários, espaços e título) a outro caso do mesmo modelo.', '', '%'),
  D('Juiz (LLM)', 'juizAvaliados', 'Casos avaliados pelo juiz', ''),
  D('Juiz (LLM)', 'juizCobertura', '% casos avaliados pelo juiz', '', '', '%'),
  ...CRITERIOS.map((k) => D('Juiz (LLM)', `juiz_${k}`, `Juiz: ${k}`, 'Média das notas (2–10).', 'Zheng et al. (2023)')),
  D('Juiz (LLM)', 'juizNota', 'Juiz: nota média', 'Média da nota do caso.'),
  D('Juiz (LLM)', 'juizDesvio', 'Juiz: desvio-padrão', ''),
  D('Juiz (LLM)', 'juizPonderada', 'Juiz: nota ISO ponderada', 'Σ peso(atributo) × média(atributo) ÷ Σ pesos dos atributos avaliados (avaliacao/pesos.json).'),
  D('Painel humano', 'humanoAvaliacoes', 'Avaliações humanas', 'Linhas preenchidas em todas as fichas.'),
  ...CRITERIOS.map((k) => D('Painel humano', `humano_${k}`, `Humano: ${k}`, 'Média das notas (2–10).')),
  D('Painel humano', 'humanoNota', 'Humano: nota média', ''),
  D('Painel humano', 'humanoDesvio', 'Humano: desvio-padrão', ''),
  D('Painel humano', 'humanoPonderada', 'Humano: nota ISO ponderada', 'Mesma fórmula do juiz.'),
  D('Painel humano', 'defeitosReais', 'Defeitos do sistema revelados', 'Casos marcados "sim" em "Revela defeito do sistema?".'),
];

// ---------------------------------------------------------------- saída

const SAIDA = join(RAIZ, 'metricas');
mkdirSync(SAIDA, { recursive: true });
const wb = new ExcelJS.Workbook();
const ESCURO = 'FF1F1A19';
const cab = (ws) => {
  const r = ws.getRow(1);
  r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ESCURO } };
  r.alignment = { vertical: 'middle', wrapText: true };
};
function aba(nome, colunas, linhas) {
  const ws = wb.addWorksheet(nome, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = colunas.map(([key, header, width = 14]) => ({ key, header, width }));
  cab(ws);
  linhas.forEach((l) => ws.addRow(l));
  return ws;
}

// Resumo: uma linha por métrica, uma coluna por modelo.
const resumoWs = aba('Resumo', [['grupo', 'Grupo', 18], ['nome', 'Métrica', 42], ...modelos.map((m) => [m, m, 14])],
  DEFS.map((d) => ({ grupo: d.grupo, nome: d.nome, ...Object.fromEntries(modelos.map((m) => [m, M[m][d.id] ?? ''])) })));
resumoWs.getColumn('grupo').font = { color: { argb: 'FF8F443C' } };

aba('Pirâmide', [['nivel', 'Nível', 14], ['alvo', 'Alvo (%)', 10], ...modelos.flatMap((m) => [[`${m}_n`, `${m} (n)`, 12], [`${m}_p`, `${m} (%)`, 12]])],
  NIVEIS.map((x) => ({ nivel: x, alvo: PROPORCAO_ALVO[x] * 100, ...Object.fromEntries(modelos.flatMap((m) => [[`${m}_n`, M[m][`n_${x}`]], [`${m}_p`, M[m][`p_${x}`]]])) })));

aba('Atributos ISO', [['atributo', 'Atributo', 26], ['peso', 'Peso', 8], ...modelos.flatMap((m) => [[`${m}_n`, `${m}: casos`, 12], [`${m}_j`, `${m}: juiz`, 12], [`${m}_h`, `${m}: humano`, 12]])],
  ATRIBUTOS.map((a) => {
    const linha = { atributo: a, peso: pesos.pesos[a] };
    for (const m of modelos) {
      linha[`${m}_n`] = M[m][`atr_${a}`];
      linha[`${m}_j`] = arred(media(notasDoModelo(listaJuiz, m).filter((x) => casosAvaliados.get(x.id)?.atributo === a).map((x) => x.nota)), 2);
      linha[`${m}_h`] = arred(media(notasDoModelo(painel, m).filter((x) => casosAvaliados.get(x.id)?.atributo === a).map((x) => x.nota)), 2);
    }
    return linha;
  }));

aba('Requisitos', [['requisito', 'Requisito', 12], ['tipo', 'Tipo', 8], ...modelos.map((m) => [m, `${m} (casos)`, 14])],
  REQUISITOS.map((r) => ({ requisito: r, tipo: tipoReq(r), ...Object.fromEntries(modelos.map((m) => [m, contar(dados[m].casos, (c) => citados(c.requisito).map(base).includes(r))])) })));

aba('Concordância', [['par', 'Comparação', 22], ['criterio', 'Critério', 12], ['pares', 'Pares', 8], ['exata', 'Concordância exata (%)', 14], ['ate2', 'Diferença ≤ 2 (%)', 14],
  ['kappa', 'Kappa ponderado', 12], ['interpretacao', 'Interpretação (Landis e Koch)', 18], ['spearman', 'Spearman', 10], ['vies', 'Viés médio (1º − 2º)', 14]],
[...concJuizHumano.map((l) => ({ par: 'juiz × humano', ...l })), ...concHumanos]);

const consolidados = modelos.flatMap((m) => dados[m].casos.map((c, i) => {
  const id = `${m}-${String(i + 1).padStart(4, '0')}`;
  const j = juiz.get(id);
  const hs = painel.filter((h) => h.id === id);
  return {
    modelo: m, idAvaliacao: id, caso: c.caso, nivel: c.nivel, atributo: c.atributo, subatributo: c.subatributo, requisito: c.requisito, arquivo: c.arquivo, titulo: c.titulo,
    status: c.status, assercoes: c.assercoes, smells: c.smells.join(','), duplicado: c.duplicado,
    ...Object.fromEntries(CRITERIOS.map((k) => [`juiz_${k}`, j?.[k] ?? ''])), juiz_nota: j ? arred(j.nota, 1) : '',
    humano_nota: hs.length ? arred(media(hs.map((h) => h.nota)), 1) : '', humano_avaliacoes: hs.length, justificativa_juiz: j?.justificativa ?? '',
  };
}));
const COL_CONS = Object.keys(consolidados[0] ?? { modelo: '' });
aba('Casos', COL_CONS.map((k) => [k, k, ['titulo', 'justificativa_juiz'].includes(k) ? 40 : 14]), consolidados);

const sis = sistemaAlvo();
if (sis) aba('Sistema-alvo', [['m', 'Medida', 48], ['v', 'Valor', 12]], sis.map(([m, v]) => ({ m, v })));

aba('Definições', [['grupo', 'Grupo', 18], ['nome', 'Métrica', 40], ['definicao', 'Como é calculada', 70], ['ref', 'Referência', 40]], DEFS)
  .eachRow((r) => { r.alignment = { vertical: 'top', wrapText: true }; });
if (avisos.length) aba('Avisos', [['a', 'Aviso', 100]], avisos.map((a) => ({ a })));

await wb.xlsx.writeFile(join(SAIDA, 'metricas.xlsx'));
writeFileSync(join(SAIDA, 'metricas.json'), JSON.stringify({ geradoEm: new Date().toISOString(), pesos: pesos.pesos, modelos: M, concordancia: { juizHumano: concJuizHumano, humanos: concHumanos }, sistemaAlvo: sis, avisos }, null, 2));
writeFileSync(join(SAIDA, 'casos-consolidados.csv'), escreverCsv(consolidados, COL_CONS));

const destaque = ['casos', 'distanciaPiramide', 'atributosCobertos', 'reqTotal', 'passou', 'erroCarga', 'cobBackLinhas', 'cobFrontLinhas', 'casosComSmell', 'juizNota', 'humanoNota'];
console.table(Object.fromEntries(destaque.map((k) => [DEFS.find((d) => d.id === k).nome, Object.fromEntries(modelos.map((m) => [m, M[m][k]]))])));
if (pesos.aviso) console.log(`Aviso: ${pesos.aviso}`);
if (avisos.length) console.log(`${avisos.length} aviso(s): veja a aba "Avisos".`);
console.log('Métricas em metricas/metricas.xlsx, metricas.json e casos-consolidados.csv');
