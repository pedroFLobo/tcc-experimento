// Gera dist/ a partir das skills genéricas e da spec do projeto.
// Uso: node ferramentas/empacotar.mjs [caminho-do-clinica-plus]
// Saídas:
//   dist/gerador-casos-teste/         skill de geração pronta para importar (genérica)
//   dist/juiz-casos-teste/            skill do juiz pronta para importar (genérica)
//   dist/pacote-juiz-casos-teste.md   arquivo único para o juiz em chat: skill + referências + SPEC.md + requisitos
//   dist/SHA256.txt                   hash de cada arquivo que os modelos recebem (prova de entrada idêntica)
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const clinica = process.argv[2] ?? join(raiz, '..', 'clinica-plus');
const dist = join(raiz, 'dist');
const spec = join(clinica, 'SPEC.md');
const requisitos = join(clinica, 'docs', 'REQUISITOS.md');
for (const f of [spec, requisitos]) {
  if (!existsSync(f)) { console.error(`Não encontrei ${f}. Informe o caminho do clinica-plus.`); process.exit(1); }
}

const listar = (pasta) => readdirSync(pasta).sort().flatMap((n) => (statSync(join(pasta, n)).isDirectory() ? listar(join(pasta, n)) : [join(pasta, n)]));
const ler = (f) => readFileSync(f, 'utf8').replace(/\r\n/g, '\n').trimEnd();

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const nome of ['gerador-casos-teste', 'juiz-casos-teste']) cpSync(join(raiz, 'skills', nome), join(dist, nome), { recursive: true });

// Juiz em arquivo único: SKILL.md, referências, spec e base de teste.
const juiz = join(raiz, 'skills', 'juiz-casos-teste');
const partes = [ler(join(juiz, 'SKILL.md'))];
for (const f of listar(join(juiz, 'references'))) partes.push('---', `<!-- ===== references/${relative(join(juiz, 'references'), f).split(sep).join('/')} ===== -->`, ler(f));
partes.push('---', '<!-- ===== SPEC.md (spec do projeto) ===== -->', ler(spec));
partes.push('---', '<!-- ===== docs/REQUISITOS.md (base de teste) ===== -->', ler(requisitos));
writeFileSync(join(dist, 'pacote-juiz-casos-teste.md'), partes.join('\n\n') + '\n');

// Hash de tudo o que o gerador recebe: a skill e os arquivos do projeto que ela manda ler.
const entrada = [
  ...listar(join(raiz, 'skills', 'gerador-casos-teste')).map((f) => [f, `skills/${relative(join(raiz, 'skills'), f).split(sep).join('/')}`]),
  [spec, 'clinica-plus/SPEC.md'],
  [requisitos, 'clinica-plus/docs/REQUISITOS.md'],
];
const linhas = entrada.map(([f, nome]) => `${createHash('sha256').update(ler(f)).digest('hex')}  ${nome}`);
writeFileSync(join(dist, 'SHA256.txt'), linhas.join('\n') + '\n');

console.log(`Skills copiadas para dist/. Pacote do juiz: ${(partes.join('').length / 1024).toFixed(0)} KB.`);
console.log(linhas.join('\n'));
