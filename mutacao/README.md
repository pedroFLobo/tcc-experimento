# Teste de mutação (StrykerJS)

- `logs/`: log completo do Stryker de cada modelo (backend e frontend) e `tempos.txt` com a duração.
- `config/`: o que foi executado (os scripts `.sh` e os que leem relatórios usam a variável `MUT_TRABALHO`; ver o README da raiz).
  - `stryker.back.json` (Jest) e `stryker.front.json` (Vitest): arquivos mutados, runner, timeout, relatórios.
  - `preparar.py`: copia os testes do modelo e marca como `skip` os casos que não passaram na execução original.
  - `rodar-modelo.py`: roda o Stryker de um modelo em blocos por camada (retomável).
  - `orquestrar.sh`: roda os 5 modelos em sequência e depois as 3 repetições de instabilidade.
  - `analisar.py`: consolida os relatórios (score, camadas, exclusivos, normalização, juiz x mutação, instabilidade).
  - `sync.sh`: durante a execução, copiava os logs para esta pasta a cada 30 s.

## Como o ambiente é montado
1. Cópia do clinica-plus + arquivos de `experimento/execucao/modelo` (mesmo package-lock do executor: Jest 30.5.2, Vitest 5.0.5).
2. `npm ci`, depois `npm i -D @stryker-mutator/core@10.1.1 @stryker-mutator/jest-runner@10.1.1 @stryker-mutator/vitest-runner@10.1.1`.
3. `python3 preparar.py <modelo> <pasta>`.
4. Em `backend/src/config.js`, `bcryptCusto: 10` vira `4` (só desempenho; ver contexto-tcc.md).
5. `python3 rodar-modelo.py <pasta>`.

Para reproduzir no Windows, os mesmos comandos funcionam com `npx stryker run stryker.back.json` dentro da pasta preparada.
Ao final, cada modelo gera um relatório HTML navegável (um por bloco, em `resultados/html/`), mostrando cada mutante, se morreu e qual teste o matou.
