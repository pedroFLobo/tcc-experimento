// Rodada de um modelo via agente de linha de comando (OpenCode, Antigravity CLI etc.).
//
// O Clínica+ original nunca é aberto pelo agente: cada modelo trabalha numa cópia própria,
// fora do OneDrive, com a skill já instalada. Depois, só os testes criados voltam para o experimento.
//
// Uso:
//   node ferramentas/rodada.mjs preparar --modelo <nome> [--destino <pasta>] [--clinica <pasta>]
//   (rode o agente dentro da cópia indicada)
//   node ferramentas/rodada.mjs recolher --modelo <nome> [--destino <pasta>]
//   node execucao/executar.mjs --pasta respostas/<modelo>/testes --modelo <nome>
//
// preparar: copia o Clínica+ (sem node_modules, banco e .env, com o SPEC.md) para <destino>/<modelo>/clinica-plus,
//           instala a skill em .agents/skills/gerador-casos-teste e grava a "foto" inicial dos arquivos
//           (base.json, fora da cópia, para o agente não ver nem alterar). Se o git existir, também
//           faz um commit "base" dentro da cópia, para você poder usar `git status` e `git diff`.
// recolher: compara a cópia com a foto inicial, copia os arquivos de teste novos ou alterados para
//           respostas/<modelo>/testes e registra em respostas/<modelo>/alteracoes.json tudo o que o
//           agente criou, alterou ou apagou fora das pastas de teste (por exemplo, código do sistema).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTAS_DE_TESTE = ['backend/__testes__/', 'frontend/__testes__/', 'e2e/'];
// Não entram na cópia nem na comparação: dependências, banco, segredos e lixo gerado por ferramentas.
const IGNORAR = new Set(['node_modules', '.git', 'data', 'dist', '.env', 'coverage', '.cobertura', 'test-results', 'playwright-report', '.vite']);
const SKILL = 'gerador-casos-teste';

const [acao] = process.argv.slice(2);
const { values: args } = parseArgs({
  args: process.argv.slice(3),
  options: {
    modelo: { type: 'string' },
    destino: { type: 'string', default: process.platform === 'win32' ? 'C:\\tcc-rodadas' : join(tmpdir(), 'tcc-rodadas') },
    clinica: { type: 'string', default: join(RAIZ, '..', 'clinica-plus') },
    forcar: { type: 'boolean', default: false },
  },
});
if (!['preparar', 'recolher'].includes(acao) || !args.modelo) {
  console.error('Uso: node ferramentas/rodada.mjs preparar|recolher --modelo <nome> [--destino <pasta>] [--clinica <pasta>] [--forcar]');
  process.exit(1);
}

const destinoPadrao = !process.argv.includes('--destino') && !process.argv.some((a) => a.startsWith('--destino='));
const modelo = args.modelo.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
const pastaModelo = join(args.destino, modelo);
const copia = join(pastaModelo, 'clinica-plus');
const arquivoBase = join(pastaModelo, 'base.json');
const log = (...m) => console.log('›', ...m);

function listar(pasta, base = pasta, saida = {}) {
  for (const nome of readdirSync(pasta)) {
    if (IGNORAR.has(nome)) continue;
    const caminho = join(pasta, nome);
    const rel = relative(base, caminho).split(sep).join('/');
    if (rel === `.agents/skills/${SKILL}` || rel.startsWith(`.agents/skills/${SKILL}/`)) continue;
    if (statSync(caminho).isDirectory()) listar(caminho, base, saida);
    else saida[rel] = createHash('sha256').update(readFileSync(caminho)).digest('hex');
  }
  return saida;
}

function git(...a) {
  return spawnSync('git', a, { cwd: copia, encoding: 'utf8' });
}

if (acao === 'preparar') {
  if (existsSync(copia) && !args.forcar) {
    console.error(`Já existe uma cópia em ${copia}. Use --forcar para apagá-la e começar de novo.`);
    process.exit(1);
  }
  if (!existsSync(join(args.clinica, 'package.json'))) {
    console.error(`Não encontrei o Clínica+ em ${args.clinica}. Informe com --clinica <pasta>.`);
    process.exit(1);
  }
  if (!existsSync(join(args.clinica, 'SPEC.md'))) {
    console.error(`O projeto não tem SPEC.md na raiz (${args.clinica}). A skill gerador-casos-teste precisa dele.`);
    process.exit(1);
  }
  rmSync(pastaModelo, { recursive: true, force: true });
  mkdirSync(pastaModelo, { recursive: true });
  cpSync(args.clinica, copia, { recursive: true, filter: (src) => !IGNORAR.has(src.split(/[\\/]/).pop()) });
  cpSync(join(RAIZ, 'skills', SKILL), join(copia, '.agents', 'skills', SKILL), { recursive: true });

  const base = listar(copia);
  const skill = listar(join(copia, '.agents', 'skills', SKILL));
  writeFileSync(arquivoBase, JSON.stringify({ modelo, data: new Date().toISOString(), origem: args.clinica, arquivos: base, skill }, null, 2));

  let comGit = false;
  if (spawnSync('git', ['--version'], { encoding: 'utf8' }).status === 0) {
    git('init', '-q');
    // Ignora dependências e lixo sem tocar no .gitignore do Clínica+ (que entraria na comparação).
    writeFileSync(join(copia, '.git', 'info', 'exclude'), [...IGNORAR].filter((n) => n !== '.git').join('\n') + '\n', { flag: 'a' });
    git('add', '-A');
    comGit = git('-c', 'user.name=experimento', '-c', 'user.email=experimento@local', 'commit', '-q', '-m', 'base').status === 0;
  }

  log(`Cópia pronta: ${copia}`);
  log(`Skill instalada em .agents/skills/${SKILL} (${Object.keys(skill).length} arquivos)`);
  log(`Foto inicial: ${Object.keys(base).length} arquivos, em ${arquivoBase}`);
  log(comGit ? 'Commit "base" feito; `git status` dentro da cópia mostra o que o agente mudar.' : 'git não encontrado: a comparação usa só a foto inicial.');
  log('Agora abra o agente dentro da cópia:');
  console.log(`    cd "${copia}"`);
  console.log('    opencode        (ou: agy)');
  log(`Ao terminar, volte à pasta experimento e rode: node ferramentas/rodada.mjs recolher --modelo ${modelo}${destinoPadrao ? '' : ` --destino "${args.destino}"`}`);
}

if (acao === 'recolher') {
  if (!existsSync(arquivoBase) || !existsSync(copia)) {
    console.error(`Não encontrei a rodada em ${pastaModelo}. Rode antes: node ferramentas/rodada.mjs preparar --modelo ${modelo}`);
    process.exit(1);
  }
  const base = JSON.parse(readFileSync(arquivoBase, 'utf8'));
  const agora = listar(copia);

  const novos = [], alterados = [], apagados = [];
  for (const [rel, hash] of Object.entries(agora)) {
    if (!(rel in base.arquivos)) novos.push(rel);
    else if (base.arquivos[rel] !== hash) alterados.push(rel);
  }
  for (const rel of Object.keys(base.arquivos)) if (!(rel in agora)) apagados.push(rel);

  const ehTeste = (rel) => PASTAS_DE_TESTE.some((p) => rel.startsWith(p));
  const testes = [...novos, ...alterados].filter(ehTeste).sort();
  const skillAlterada = JSON.stringify(listar(join(copia, '.agents', 'skills', SKILL))) !== JSON.stringify(base.skill);

  const saida = join(RAIZ, 'respostas', modelo);
  rmSync(join(saida, 'testes'), { recursive: true, force: true });
  mkdirSync(join(saida, 'testes'), { recursive: true });
  for (const rel of testes) {
    mkdirSync(dirname(join(saida, 'testes', rel)), { recursive: true });
    cpSync(join(copia, rel), join(saida, 'testes', rel));
  }

  const alteracoes = {
    modelo,
    data: new Date().toISOString(),
    copia,
    arquivosDeTeste: testes,
    foraDasPastasDeTeste: {
      novos: novos.filter((r) => !ehTeste(r)).sort(),
      alterados: alterados.filter((r) => !ehTeste(r)).sort(),
      apagados: apagados.sort(),
    },
    skillAlterada,
  };
  writeFileSync(join(saida, 'alteracoes.json'), JSON.stringify(alteracoes, null, 2));

  const fora = alteracoes.foraDasPastasDeTeste;
  log(`${testes.length} arquivos de teste copiados para ${relative(process.cwd(), join(saida, 'testes')) || '.'}`);
  if (fora.novos.length + fora.alterados.length + fora.apagados.length) {
    log(`Atenção: o agente mexeu fora das pastas de teste (${fora.novos.length} novos, ${fora.alterados.length} alterados, ${fora.apagados.length} apagados). Detalhes em alteracoes.json.`);
    for (const r of fora.alterados) console.log(`    alterado: ${r}`);
    for (const r of fora.apagados) console.log(`    apagado:  ${r}`);
    for (const r of fora.novos) console.log(`    novo:     ${r}`);
  }
  if (skillAlterada) log('Atenção: o agente alterou a skill dentro da cópia.');
  if (!testes.length) { console.error('Nenhum arquivo de teste encontrado em backend/__testes__, frontend/__testes__ ou e2e/.'); process.exit(1); }
  log(`Próximo passo: node execucao/executar.mjs --pasta respostas/${modelo}/testes --modelo ${modelo}`);
}
