# Dados brutos do teste de mutação (StrykerJS 10.1.1, 20/11/2026)

Tudo o que foi usado para gerar `mutacao/RESULTADOS.md` e `estatistica/`.

## Por modelo (`deepseek/`, `mimo/`, `glm/`, `nemotron/`, `gemini/`)
- `relatorios-stryker/*.json`: relatório completo do Stryker por bloco (backend-domain, -services, -repositories, -routes, -outros; frontend-pages, -components, -outros), no formato mutation-testing-report-schema. Cada mutante tem arquivo, posição, operador, substituição, status (Killed, Survived, Timeout, NoCoverage), `killedBy` (todos os testes que o mataram) e `coveredBy`. É a fonte de todos os scores, dos testes de Cochran Q/McNemar e do bootstrap.
- `configs/`: os arquivos de configuração do Stryker exatamente como executados (um por bloco).
- `testes-executados/`: os testes do modelo como foram rodados (os reprovados marcados com `.skip`).
- `testes-desativados.csv`: lista de cada caso desativado e o motivo.
- `diferencas-testes-originais-x-executados.diff`: diff entre os testes originais do modelo e os executados (só troca de `test(` por `test.skip(`; arquivos com erro de carga removidos).
- `tempos.txt`: duração de cada bloco em segundos.

## `ambiente/`
- `package.json` e `package-lock.json`: versões exatas (Jest 30.5.2, Vitest 5.0.5, Stryker 10.1.1); `versoes.txt` com Node e árvore de dependências.
- `jest.config.cjs`, `vitest.config.mjs`, `vitest.setup.mjs`: iguais aos do executor.
- `config.js-bcryptCusto.diff`: a única alteração no Clínica+ (custo do hash de senha 10 -> 4, só desempenho).

## `piloto-stryker-9.6.1-descartado/`
Relatórios e logs do primeiro piloto do DeepSeek com StrykerJS 9.6.1, descartado porque o vitest-runner 9.6.1 não executava testes nos mutantes com Vitest 5 (ver contexto-tcc.md). Mantido para transparência.

## Para refazer as análises
`mutacao/config/analisar.py` e `estatistica/estatistica.py` leem estes JSONs (ajuste a variável SP para a pasta onde estiverem).

## Catálogo legível dos mutantes (`catalogo-mutantes.csv`)
Uma linha por mutante (3.088: backend + frontend), separador `;`, UTF-8 com BOM (abre no Excel). Colunas: id, area, arquivo, linha, coluna, operador (mutator do Stryker), codigo_original (trecho alterado), mutante (substituição aplicada), linha_original_completa, e para cada modelo `status_<modelo>` e `testes_que_mataram_<modelo>` (quantidade de testes que mataram o mutante).
O Stryker não grava uma cópia do arquivo por mutante: ele usa *mutant switching* (todos os mutantes entram numa única cópia instrumentada e são ativados um por vez durante os testes). Por isso o registro completo de cada mutante está nos JSONs de `relatorios-stryker/`; este CSV só os torna legíveis lado a lado entre os modelos.
Exemplo: `backend/src/domain/agenda.js`, linha 8 (`return inicioA < fimB && inicioB < fimA;`). O mutante `inicioA < fimB` → `inicioA <= fimB` sobreviveu nos 5 modelos (nenhum testou horários encostados), enquanto `&&` → `||` foi morto por todos.

## Caminhos
Os caminhos absolutos da máquina onde a mutação rodou foram trocados por `{trabalho}` (pasta de trabalho com as cópias por modelo) e `{experimento}` (raiz deste repositório). Nenhum outro conteúdo dos relatórios e logs foi alterado.
