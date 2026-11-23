# Teste de mutação: resultados (StrykerJS 10.1.1, 2026-11-20)

Escopo: backend (Jest, 1.601 mutantes) e frontend (Vitest, 1.487 mutantes) do Clínica+. E2E fora (limitação).
Só testes aprovados na execução original. Mesmos mutantes, versões e timeout para todos os modelos.
Score = (mortos + timeout) / (mortos + timeout + sobreviventes + sem cobertura).

## Score por modelo

| Modelo | Testes back | Score back | Testes front | Score front | Front sem mutantes de texto | Score geral |
|---|---|---|---|---|---|---|
| DeepSeek | 641 | 91,0% | 446 | 72,3% | 76,4% | 82,0% |
| MiMo | 391 | 91,1% | 122 | 33,6% | 36,7% | 63,4% |
| GLM | 241 | 83,2% | 55 | 20,0% | 22,2% | 52,8% |
| Gemini | 158 | 77,0% | 19 | 8,0% | 6,9% | 43,8% |
| Nemotron | 182 | 71,1% | 1 | 0,6% | 0,3% | 37,1% |

Todos os modelos juntos (união): backend 95,0%, frontend 74,3%.

## Normalização pelo tamanho da suíte (backend)
Score esperado com 158 testes sorteados de cada suíte (200 sorteios, semente 2026):
Gemini 76,9%, GLM 76,3%, MiMo 76,2%, DeepSeek 70,2%, Nemotron 68,5%.
Com o mesmo número de testes, os modelos ficam próximos; a vantagem do DeepSeek no score bruto vem principalmente do volume (Papadakis et al., 2018).
No frontend a normalização (19 testes) é pouco informativa porque três modelos quase não testaram o front.

## Score por camada (backend)

| Camada | DeepSeek | MiMo | GLM | Gemini | Nemotron |
|---|---|---|---|---|---|
| domain | 92,1 | 90,8 | 90,4 | 80,7 | 85,9 |
| services | 95,7 | 94,3 | 85,5 | 73,2 | 58,9 |
| repositories | 95,9 | 95,4 | 88,6 | 81,3 | 68,5 |
| routes | 69,5 | 82,0 | 50,8 | 73,4 | 65,6 |
| middleware | 77,4 | 77,4 | 62,3 | 67,9 | 45,3 |
| utils | 86,9 | 87,6 | 80,9 | 74,5 | 73,0 |

Frontend: só o DeepSeek testa de fato as páginas (69,6%) e os componentes (71,1%); MiMo 26,8 / 37,6; GLM 9,0 / 21,8; Gemini e Nemotron perto de zero.

## Complementaridade
Mutantes detectados por um único modelo, backend: DeepSeek 21, GLM 12, MiMo 9, Gemini 3, Nemotron 1. Frontend: DeepSeek 567, MiMo 21, GLM 5, Gemini 1.

## Juiz (LLM) x mutação — validação independente do juiz
Por teste: nota do juiz x número de mutantes que o teste mata (Spearman, só testes aprovados).
- Geral: rho = 0,21 (n = 2.251). Mas separando por área o sinal some: backend rho = -0,09, frontend rho = 0,09.
- Por modelo: MiMo 0,32; DeepSeek 0,24; Gemini 0,10 (n.s.); GLM -0,07 (n.s.); Nemotron -0,48.
- Critérios (geral): relevância 0,34 e aderência 0,31; oráculo -0,12 e clareza -0,07.
Leitura: a nota do juiz tem relação fraca e inconsistente com a capacidade de detectar defeitos. O juiz mede outras qualidades (aderência ao requisito, clareza), não a força do teste.
Cuidado: mutantes mortos por teste favorece testes amplos (de API e integração passam por muito código); por isso é uma medida de alcance, não de qualidade individual.

## Instabilidade
3 repetições de cada suíte (backend e frontend): nenhum teste mudou de resultado em nenhum modelo. A instabilidade observada antes era só no E2E (fora deste escopo).

## Lacunas do Clínica+
`resultados/lacunas-nenhum-modelo-detectou.csv`: 462 mutantes que nenhum modelo detectou (backend 80, frontend 382), com arquivo, linha, código original e substituição. São candidatos a comportamentos sem teste eficaz; parte pode ser mutante equivalente (não muda o comportamento) e precisa ser conferida.

## Arquivos
- `resultados/mutacao.xlsx`: abas scores, por-camada, exclusivos, conjunto, juiz-x-mutacao, por-teste, instabilidade.
- `resultados/resumo.json`, `resultados/por-teste.csv`.
- `resultados/html/`: relatórios navegáveis do Stryker (um por modelo e bloco).
- `logs/`: logs completos; `logs/orquestrador.log` com a linha do tempo, inclusive os problemas e correções.
- `config/`: todos os scripts e configurações.
