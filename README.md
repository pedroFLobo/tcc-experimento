# Experimento: LLMs gerando casos de teste para o Clínica+

Inspirado no VR-Testing (github.com/crescenciolima/VR-Testing). As skills, a rubrica e o executor foram desenvolvidos para este trabalho.

**Ideia central:** todo modelo recebe a **mesma entrada padronizada**: uma skill genérica de escrita de testes e o `SPEC.md` do projeto (na raiz do `clinica-plus`). Cada modelo roda como agente de linha de comando numa cópia própria do repositório e deve escrever o **máximo de casos de teste automatizados** em toda a pirâmide (unitário, integração, API, E2E), classificados pelos atributos da ISO/IEC 25010. Os testes são **executados de verdade** contra o Clínica+, avaliados por um juiz LLM e medidos por teste de mutação (StrykerJS).

O sistema-alvo fica em um repositório separado: `clinica-plus` (tag `v1.0-experimento`, a versão exata usada nas rodadas).

```
experimento/
├── skills/
│   ├── gerador-casos-teste/   skill genérica de geração (serve para qualquer projeto com SPEC.md)
│   └── juiz-casos-teste/      skill do LLM-as-a-Judge
├── ferramentas/
│   ├── empacotar.mjs          copia as skills para dist/, monta o pacote do juiz e os hashes
│   ├── rodada.mjs             prepara a cópia de cada modelo e recolhe os testes
│   ├── preparar-avaliacao.mjs junta os casos de todos os modelos e monta os lotes do juiz
│   ├── ficha-avaliacao.mjs    gera a planilha do painel humano (painel descartado, ver abaixo)
│   └── metricas.mjs           consolida todas as métricas em metricas/metricas.xlsx
├── dist/                      skills prontas para importar + versões em arquivo único
├── prompts/                   mensagens fixas enviadas aos agentes
├── respostas/<modelo>/        testes recolhidos e alteracoes.json + registro.csv
├── execucao/executar.mjs      roda os testes de um modelo e mede resultado e cobertura
├── resultados/<modelo>/       casos.csv, resumo.json e os testes extraídos
├── avaliacao/                 rubrica, casos de todos os modelos, lotes e notas do juiz, reteste do juiz
├── metricas/                  planilha final com todas as métricas (e a versão anterior à mutação)
├── mutacao/                   teste de mutação: resultados, logs, configuração e dados brutos
├── estatistica/               testes estatísticos entre modelos e consistência do juiz
└── PROTOCOLO.md               passo a passo da geração, execução e avaliação
```

## Métricas que o experimento produz

Todas ficam em `metricas/metricas.xlsx`; a lista completa está no [PROTOCOLO.md](PROTOCOLO.md#8-calcular-as-métricas).

## Painel humano

Estava previsto um painel humano, mas ele foi substituído pelo teste de mutação, porque validar manualmente milhares de casos não era viável. A amostra e a ficha (`avaliacao/painel-humano/`, `avaliacao/ficha-pedro.xlsx`) ficam no repositório só como registro.

## Reproduzir as análises

Os scripts de `mutacao/config/` e `estatistica/` usam caminhos relativos ao repositório. Os que leem os relatórios do Stryker precisam da variável `MUT_TRABALHO` apontando para a pasta de trabalho com uma cópia do Clínica+ por modelo (`$MUT_TRABALHO/mut/<modelo>`). Nos dados brutos, os caminhos absolutos da máquina onde a mutação rodou foram trocados por `{trabalho}` e `{experimento}`.

Requer Node 22.22.2+ para executar os testes (as versões fixadas de jsdom e undici exigem). Comece pelo [PROTOCOLO.md](PROTOCOLO.md).
