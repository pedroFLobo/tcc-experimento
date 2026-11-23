// Prepara a avaliação (juiz e painel humano) a partir dos resultados de todos os modelos.
//
// Uso:
//   node ferramentas/preparar-avaliacao.mjs [--tamanho-lote 40]
//
// O que faz:
//   1. Junta o casos.csv de cada pasta resultados/<modelo>/ em avaliacao/casos.csv, com a coluna modelo.
//   2. Dá a cada caso um ID de avaliação com o nome do modelo (ex.: glm-0042), único entre todos.
//   3. Monta os lotes do juiz em avaliacao/lotes/, um arquivo de teste por lote (ou parte dele),
//      agrupados por modelo. Cada lote informa de qual modelo são os casos.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { RAIZ, escreverCsv, extrairBlocos, lerCsvArquivo, listarArquivos, modelosComResultado } from './lib.mjs';

const { values: args } = parseArgs({
  options: { 'tamanho-lote': { type: 'string', default: '40' } },
});

const modelos = modelosComResultado();
if (!modelos.length) {
  console.error('Nenhum resultado encontrado em resultados/<modelo>/casos.csv. Rode o executor antes.');
  process.exit(1);
}

// ---------------------------------------------------------------- 1 e 2. Casos com ID

const destino = join(RAIZ, 'avaliacao');
const todos = [];
const relatorio = [];
const COLUNAS = ['idAvaliacao', 'modelo', 'caso', 'nivel', 'atributo', 'subatributo', 'requisito', 'arquivo', 'linha', 'titulo', 'objetivo', 'resultadoEsperado', 'metadadosCompletos', 'status', 'duracaoMs', 'erro'];

for (const modelo of modelos) {
  const origem = join(RAIZ, 'resultados', modelo);
  const blocosPorArquivo = new Map(listarArquivos(join(origem, 'testes')).map((rel) => [rel, extrairBlocos(readFileSync(join(origem, 'testes', rel), 'utf8'))]));
  const usados = new Map();
  const casos = lerCsvArquivo(join(origem, 'casos.csv')).map((c, i) => {
    const pos = usados.get(c.arquivo) ?? 0;
    usados.set(c.arquivo, pos + 1);
    const blocos = blocosPorArquivo.get(c.arquivo) ?? [];
    const bloco = blocos[pos]?.titulo === c.titulo ? blocos[pos] : blocos.find((b) => b.titulo === c.titulo);
    return { ...c, modelo, idAvaliacao: `${modelo}-${String(i + 1).padStart(4, '0')}`, linha: bloco?.linha ?? '' };
  });
  todos.push(...casos);
  relatorio.push({ modelo, casos: casos.length, arquivos: blocosPorArquivo.size });
}

mkdirSync(destino, { recursive: true });
writeFileSync(join(destino, 'casos.csv'), escreverCsv(todos, COLUNAS));

// ---------------------------------------------------------------- 3. Lotes do juiz

const tamanho = Math.max(1, Number(args['tamanho-lote']));
const porArquivo = new Map();
for (const c of todos) {
  const k = `${c.modelo}::${c.arquivo}`;
  if (!porArquivo.has(k)) porArquivo.set(k, []);
  porArquivo.get(k).push(c);
}
const grupos = [];
for (const casos of porArquivo.values()) {
  for (let i = 0; i < casos.length; i += tamanho) grupos.push({ casos: casos.slice(i, i + tamanho), parte: i / tamanho + 1, partes: Math.ceil(casos.length / tamanho) });
}
const celula = (v, max = 160) => String(v ?? '').replace(/\s+/g, ' ').replace(/\|/g, '\\|').slice(0, max);
const indice = [];
rmSync(join(destino, 'lotes'), { recursive: true, force: true });
mkdirSync(join(destino, 'lotes'), { recursive: true });

grupos.forEach((g, i) => {
  const nome = `lote-${String(i + 1).padStart(3, '0')}`;
  const { modelo, arquivo } = g.casos[0];
  const conteudo = readFileSync(join(RAIZ, 'resultados', modelo, 'testes', arquivo), 'utf8');
  const parte = g.partes > 1 ? ` (parte ${g.parte} de ${g.partes})` : '';
  const texto = [
    `# ${nome}`,
    '',
    `Modelo: ${modelo}`,
    '',
    `Avalie com a skill \`juiz-casos-teste\` **somente os ${g.casos.length} casos listados na tabela**${parte}. Na coluna \`caso\` da sua resposta, use o **ID de avaliação** da tabela, não o \`@caso\` do arquivo.`,
    '',
    '| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |',
    '|---|---|---|---|---|',
    ...g.casos.map((c) => `| ${c.idAvaliacao} | ${celula(c.caso, 30) || '(sem @caso)'} | ${celula(c.titulo, 120)} | ${c.status} | ${celula(c.erro)} |`),
    '',
    `## Arquivo: ${arquivo}`,
    '',
    '```js',
    conteudo.trimEnd(),
    '```',
    '',
  ].join('\n');
  writeFileSync(join(destino, 'lotes', `${nome}.md`), texto);
  indice.push({ lote: nome, modelo, arquivo, casos: g.casos.length, primeiroId: g.casos[0].idAvaliacao, ultimoId: g.casos.at(-1).idAvaliacao });
});
writeFileSync(join(destino, 'lotes', 'indice.csv'), escreverCsv(indice, ['lote', 'modelo', 'arquivo', 'casos', 'primeiroId', 'ultimoId']));

console.table(relatorio);
console.log(`${todos.length} casos em avaliacao/casos.csv; ${grupos.length} lotes para o juiz em avaliacao/lotes/.`);
if (existsSync(join(destino, 'juiz')) && listarArquivos(join(destino, 'juiz')).some((f) => f.endsWith('.csv'))) {
  console.log('Atenção: já existem notas em avaliacao/juiz/. Se os lotes mudaram, confira se os IDs ainda correspondem.');
}
