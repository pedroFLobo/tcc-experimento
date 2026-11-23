// Gera a ficha de avaliação (planilha Excel) para o painel humano, a partir de avaliacao/casos.csv.
//
// Uso:
//   node ferramentas/ficha-avaliacao.mjs --avaliador <nome> [--por-modelo 30] [--semente <n>] [--nova-amostra] [--todos]
//
// - Sorteia uma amostra estratificada: o mesmo número de casos por modelo, distribuído pelos níveis
//   da pirâmide na proporção em que cada modelo os gerou (no mínimo 1 por nível presente).
//   A amostra fica em avaliacao/painel-humano/amostra.csv e é reaproveitada por todos os avaliadores,
//   para que as notas possam ser comparadas entre si e com as do juiz.
// - Cada avaliador recebe os casos em uma ordem sorteada própria. A coluna Modelo mostra quem gerou cada caso.
// - --todos coloca todos os casos na ficha, sem amostragem.
import ExcelJS from 'exceljs';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { NIVEIS, RAIZ, embaralhar, escreverCsv, extrairBlocos, geradorAleatorio, lerCsvArquivo } from './lib.mjs';
import { CAMPO_DEFEITO, CRITERIOS_RUBRICA, ESCALA, REFERENCIAS } from './rubrica.mjs';

const { values: args } = parseArgs({
  options: {
    avaliador: { type: 'string' },
    'por-modelo': { type: 'string', default: '30' },
    semente: { type: 'string', default: '2026' },
    'nova-amostra': { type: 'boolean', default: false },
    todos: { type: 'boolean', default: false },
  },
});
if (!args.avaliador) {
  console.error('Uso: node ferramentas/ficha-avaliacao.mjs --avaliador <nome> [--por-modelo 30]');
  process.exit(1);
}

const casos = lerCsvArquivo(join(RAIZ, 'avaliacao', 'casos.csv'));
if (!casos.length) {
  console.error('Rode antes: node ferramentas/preparar-avaliacao.mjs');
  process.exit(1);
}
const PAINEL = join(RAIZ, 'avaliacao', 'painel-humano');
mkdirSync(PAINEL, { recursive: true });

// ---------------------------------------------------------------- amostra

const arqAmostra = join(PAINEL, 'amostra.csv');
let ids;
if (args.todos) {
  ids = casos.map((c) => c.idAvaliacao);
} else if (existsSync(arqAmostra) && !args['nova-amostra']) {
  ids = lerCsvArquivo(arqAmostra).map((l) => l.idAvaliacao);
} else {
  const aleatorio = geradorAleatorio(Number(args.semente));
  const alvo = Number(args['por-modelo']);
  ids = [];
  const modelos = [...new Set(casos.map((c) => c.modelo))].sort();
  for (const mod of modelos) {
    const doModelo = casos.filter((c) => c.modelo === mod);
    const estratos = NIVEIS.concat('(outro)').map((n) => ({
      nivel: n,
      casos: doModelo.filter((c) => (NIVEIS.includes(c.nivel) ? c.nivel : '(outro)') === n),
    })).filter((e) => e.casos.length);
    const total = Math.min(alvo, doModelo.length);
    // Alocação proporcional com resto pelo maior resíduo, garantindo 1 por estrato quando possível.
    const cotas = estratos.map((e) => ({ ...e, exato: (total * e.casos.length) / doModelo.length }));
    cotas.forEach((e) => { e.n = Math.max(total >= estratos.length ? 1 : 0, Math.floor(e.exato)); });
    let resto = total - cotas.reduce((a, e) => a + e.n, 0);
    for (const e of [...cotas].sort((a, b) => (b.exato - Math.floor(b.exato)) - (a.exato - Math.floor(a.exato)))) {
      if (resto <= 0) break;
      if (e.n < e.casos.length) { e.n++; resto--; }
    }
    while (resto < 0) { const e = cotas.filter((x) => x.n > 1).sort((a, b) => b.n - a.n)[0]; e.n--; resto++; }
    for (const e of cotas) ids.push(...embaralhar(e.casos, aleatorio).slice(0, Math.min(e.n, e.casos.length)).map((c) => c.idAvaliacao));
  }
  const porId = new Map(casos.map((c) => [c.idAvaliacao, c]));
  writeFileSync(arqAmostra, escreverCsv(ids.map((id) => ({ idAvaliacao: id, nivel: porId.get(id).nivel })), ['idAvaliacao', 'nivel']));
  console.log(`Amostra nova: ${ids.length} casos (semente ${args.semente}) em avaliacao/painel-humano/amostra.csv`);
}

const semAval = parseInt(createHash('sha256').update(args.avaliador.toLowerCase()).digest('hex').slice(0, 8), 16);
const porId = new Map(casos.map((c) => [c.idAvaliacao, c]));
const selecionados = embaralhar(ids, geradorAleatorio(semAval)).map((id) => porId.get(id)).filter(Boolean);

// Trecho de código de cada caso, lido dos testes do modelo.
const cacheBlocos = new Map();
function codigoDoCaso(c) {
  const arq = join(RAIZ, 'resultados', c.modelo, 'testes', c.arquivo);
  if (!cacheBlocos.has(arq)) cacheBlocos.set(arq, existsSync(arq) ? extrairBlocos(readFileSync(arq, 'utf8')) : []);
  const blocos = cacheBlocos.get(arq);
  return (blocos.find((b) => String(b.linha) === String(c.linha) && b.titulo === c.titulo) ?? blocos.find((b) => b.titulo === c.titulo))?.codigo ?? '';
}

// ---------------------------------------------------------------- planilha

const wb = new ExcelJS.Workbook();
wb.creator = 'Experimento Clínica+';
const COR = { cabecalho: 'FF1F1A19', destaque: 'FFF1E4DF', nota: 'FFFFF7D6', borda: 'FFD9CFCB' };
const cab = (ws) => {
  const r = ws.getRow(1);
  r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.cabecalho } };
  r.alignment = { vertical: 'middle', wrapText: true };
  r.height = 32;
};

// Instruções
const ins = wb.addWorksheet('Instruções', { properties: { tabColor: { argb: 'FFB0574D' } } });
ins.columns = [{ width: 110 }];
const linhasIns = [
  ['Ficha de avaliação de casos de teste — Clínica+', { bold: true, size: 14 }],
  [`Avaliador(a): ${args.avaliador}`, { bold: true }],
  [`Casos nesta ficha: ${selecionados.length}`],
  [''],
  ['Como preencher', { bold: true }],
  ['1. Vá para a aba "Avaliação". Cada linha é um caso de teste, já com o código, os metadados e o resultado da execução.'],
  ['2. Leia o caso e, se precisar, o arquivo completo em resultados/<modelo>/testes/ e a especificação em clinica-plus/docs/REQUISITOS.md (contexto geral em clinica-plus/SPEC.md).'],
  ['3. Dê uma nota (2, 4, 6, 8 ou 10) em cada um dos cinco critérios, usando as âncoras da aba "Rubrica". 8 e 4 ficam entre as âncoras vizinhas.'],
  ['4. Responda se o caso revela um defeito do sistema (só quando ele falhou e o teste está certo) e anote observações, se houver.'],
  ['5. A coluna "Nota do caso" é calculada sozinha (média dos cinco critérios).'],
  [''],
  ['Regras', { bold: true }],
  ['• Avalie só o que está escrito. Não presuma passos, dados ou comportamentos que não aparecem no teste.'],
  ['• Avalie sem consultar as notas do juiz nem as de outros avaliadores.'],
  ['• Não altere as colunas de identificação nem a ordem das colunas; o script de métricas lê esta planilha.'],
  [''],
  ['Progresso', { bold: true }],
];
linhasIns.forEach(([t, f]) => { const r = ins.addRow([t]); if (f) r.font = f; r.alignment = { wrapText: true }; });
const linhaProg = ins.addRow([{ formula: `COUNT(Avaliação!S2:S${selecionados.length + 1})&" de ${selecionados.length} casos avaliados"` }]);
linhaProg.font = { bold: true, color: { argb: 'FFB0574D' } };

// Avaliação
const av = wb.addWorksheet('Avaliação', { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
const colunas = [
  ['idAvaliacao', 'ID de avaliação', 13],
  ['modelo', 'Modelo', 16],
  ['nivel', 'Nível', 11],
  ['atributo', 'Atributo ISO', 18],
  ['subatributo', 'Subatributo', 16],
  ['requisito', 'Requisito', 11],
  ['titulo', 'Título', 30],
  ['objetivo', '@objetivo', 30],
  ['resultadoEsperado', '@resultadoEsperado', 30],
  ['status', 'Resultado da execução', 13],
  ['erro', 'Erro (resumo)', 28],
  ['arquivo', 'Arquivo', 26],
  ['codigoTeste', 'Código do caso', 70],
  ['aderencia', 'Aderência', 11],
  ['correcao', 'Correção', 11],
  ['oraculo', 'Oráculo', 11],
  ['clareza', 'Clareza', 11],
  ['relevancia', 'Relevância', 11],
  ['nota', 'Nota do caso', 11],
  ['defeito', CAMPO_DEFEITO.nome, 14],
  ['observacoes', 'Observações', 40],
];
av.columns = colunas.map(([key, header, width]) => ({ key, header, width }));
cab(av);
for (const c of selecionados) {
  const r = av.addRow({ ...c, arquivo: `resultados/${c.modelo}/testes/${c.arquivo}`, erro: c.erro.slice(0, 300), codigoTeste: codigoDoCaso(c) });
  const linhas = Math.min(60, Math.max(4, String(r.getCell('codigoTeste').value).split('\n').length));
  r.height = Math.min(409, linhas * 12);
  r.alignment = { vertical: 'top', wrapText: true };
  r.getCell('codigoTeste').font = { name: 'Consolas', size: 9 };
  const n = r.number;
  r.getCell('nota').value = { formula: `IF(COUNT(N${n}:R${n})=5,ROUND(AVERAGE(N${n}:R${n}),1),"")` };
  for (const k of ['aderencia', 'correcao', 'oraculo', 'clareza', 'relevancia', 'nota', 'defeito']) {
    const cel = r.getCell(k);
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.nota } };
    cel.alignment = { vertical: 'top', horizontal: 'center' };
    cel.border = { left: { style: 'thin', color: { argb: COR.borda } }, right: { style: 'thin', color: { argb: COR.borda } } };
  }
  for (const k of ['aderencia', 'correcao', 'oraculo', 'clareza', 'relevancia']) {
    r.getCell(k).dataValidation = { type: 'list', allowBlank: true, formulae: ['"2,4,6,8,10"'], showErrorMessage: true, errorTitle: 'Nota inválida', error: 'Use 2, 4, 6, 8 ou 10.' };
  }
  r.getCell('defeito').dataValidation = { type: 'list', allowBlank: true, formulae: [`"${CAMPO_DEFEITO.opcoes.join(',')}"`] };
  if (c.status !== 'passou') r.getCell('status').font = { bold: true, color: { argb: 'FF8F443C' } };
}
av.autoFilter = { from: 'A1', to: { row: 1, column: colunas.length } };

// Rubrica
const rb = wb.addWorksheet('Rubrica');
rb.columns = [
  { header: 'Critério', key: 'nome', width: 14 },
  { header: 'Pergunta', key: 'pergunta', width: 40 },
  { header: '10 — Muito alto', key: 'a10', width: 45 },
  { header: '6 — Médio', key: 'a6', width: 40 },
  { header: '2 — Muito baixo', key: 'a2', width: 40 },
  { header: 'Base na literatura', key: 'base', width: 30 },
];
cab(rb);
for (const c of CRITERIOS_RUBRICA) {
  const r = rb.addRow({ nome: c.nome, pergunta: c.pergunta, a10: c.ancoras[10], a6: c.ancoras[6], a2: c.ancoras[2], base: c.base.join('; ') });
  r.alignment = { vertical: 'top', wrapText: true };
  r.getCell('nome').font = { bold: true };
}
rb.addRow([]);
rb.addRow(['Escala']).font = { bold: true };
for (const e of ESCALA) rb.addRow([`${e.nota}`, `${e.rotulo} (${e.sigla})`]);
rb.addRow(['', '8 e 4 ficam entre as âncoras vizinhas. Nota do caso = média dos cinco critérios.']);
rb.addRow([]);
rb.addRow([CAMPO_DEFEITO.nome, CAMPO_DEFEITO.ajuda]).alignment = { wrapText: true };

// Referências
const rf = wb.addWorksheet('Referências');
rf.columns = [{ header: 'Citação', key: 'c', width: 26 }, { header: 'Referência', key: 'r', width: 90 }, { header: 'Uso na rubrica', key: 'u', width: 45 }];
cab(rf);
for (const [c, r, u] of REFERENCIAS) rf.addRow({ c, r, u }).alignment = { vertical: 'top', wrapText: true };

const nomeArq = `ficha-${args.avaliador.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}.xlsx`;
const destino = join(PAINEL, nomeArq);
if (existsSync(destino)) {
  console.error(`Já existe ${nomeArq}. Para não apagar notas, renomeie ou mova o arquivo antes de gerar de novo.`);
  process.exit(1);
}
await wb.xlsx.writeFile(destino);
console.log(`Ficha criada: avaliacao/painel-humano/${nomeArq} (${selecionados.length} casos).`);
