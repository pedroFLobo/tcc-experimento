# Protocolo do experimento

Este protocolo garante que **todos os modelos recebem exatamente a mesma entrada**: a mesma skill genérica, o mesmo `SPEC.md` do projeto e o mesmo pedido. Qualquer desvio deve ser anotado no registro de geração.

## Entradas

| Item | Onde | Papel |
|---|---|---|
| Skill `gerador-casos-teste` | `skills/gerador-casos-teste/` | Genérica: diz **como** escrever casos de teste para qualquer projeto que tenha um `SPEC.md` |
| `SPEC.md` | raiz do `clinica-plus` | Spec do projeto: visão geral, arquitetura, stack, como rodar e a seção **Testes** (ferramentas, pastas, ganchos, restrições) |
| `docs/REQUISITOS.md` | `clinica-plus` | Base de teste (RF, RN, RNF, códigos de erro) |
| Pedido | `prompts/1-mensagem-inicial.md` | Texto enviado ao agente, igual para todos |

## 1. Preparar a entrada

```bash
node ferramentas/empacotar.mjs ../clinica-plus
```

Copia as skills para `dist/`, monta `dist/pacote-juiz-casos-teste.md` (skill do juiz + `SPEC.md` + requisitos, para usar em chat) e grava `dist/SHA256.txt` com o hash de cada arquivo que o gerador recebe. Anote esses hashes no registro: provam que todos receberam a mesma entrada. Rode de novo sempre que mudar a skill, o `SPEC.md` ou os requisitos.

## 2. Gerar com cada modelo (agente de linha de comando)

| Modelo | Programa | Nome da rodada |
|---|---|---|
| Gemini 3.8 Flash | Antigravity CLI (`agy`) | `gemini` |
| GLM-5.3-Flash | OpenCode (modelo Free) | `glm` |
| DeepSeek V4.1 Flash | OpenCode (modelo Free) | `deepseek` |
| MiniMax M3.1 Flash | OpenCode (modelo Free) | `minimax` |

Para cada modelo (exemplo com `glm`):

```bash
node ferramentas/rodada.mjs preparar --modelo glm
cd C:\tcc-rodadas\glm\clinica-plus
opencode            # ou agy, para o Gemini
```

1. `preparar` copia o `clinica-plus` (com o `SPEC.md`, sem `node_modules`, banco e `.env`) para `C:\tcc-rodadas\<modelo>\clinica-plus`, instala a skill em `.agents/skills/` e grava uma foto dos arquivos para comparar depois. O original nunca é aberto pelo agente.
2. No agente, escolha o modelo (`/models` no OpenCode) e envie o texto de `prompts/1-mensagem-inicial.md`, sem alterar nada.
3. Se o agente parar antes de terminar, envie `continuar` (`prompts/2-mensagem-continuar.md`). **Máximo de 10 continuações.**
4. Saia do agente e, na pasta `experimento`:

```bash
node ferramentas/rodada.mjs recolher --modelo glm
```

`recolher` copia só os testes novos (`backend/__testes__/`, `frontend/__testes__/`, `e2e/`) para `respostas/<modelo>/testes/` e grava em `respostas/<modelo>/alteracoes.json` tudo o que o agente mexeu fora dessas pastas (violação das restrições do `SPEC.md`).

Os modelos grátis do OpenCode são "por tempo limitado": se possível, gere os três no mesmo dia.

## 3. Registro de geração

Para cada modelo, anote em `respostas/registro.csv`: modelo, versão, programa (OpenCode ou Antigravity CLI) e versão do programa, data e hora, número de continuações, hashes de `dist/SHA256.txt` e observações (recusas, cortes, erros, itens de `alteracoes.json`).

## 4. Executar os testes gerados

Pré-requisito, uma única vez: `npx playwright install chromium`.

Para cada modelo:

```bash
node execucao/executar.mjs --pasta respostas/<modelo>/testes --modelo <modelo>
```

O executor:
- aceita só arquivos em `backend/__testes__/`, `frontend/__testes__/` e `e2e/`;
- copia o Clínica+ para uma pasta temporária **fora do OneDrive**, sem tocar no original nem na cópia do agente;
- instala as ferramentas de teste em versões fixas;
- roda Jest, Vitest e Playwright, com cobertura de código (`--sem-e2e` pula o Playwright);
- grava em `resultados/<modelo>/`: `casos.csv` (um caso por linha, com metadados e status), `resumo.json` (totais, cobertura, requisitos cobertos) e `testes/`.

O modo antigo, de resposta de chat (`--resposta respostas/<modelo>.md`), continua disponível.

## 5. Preparar a avaliação

Depois de executar **todos** os modelos, e antes de qualquer avaliação:

```bash
npm install            # uma vez, na pasta experimento (instala o gerador de planilhas)
node ferramentas/preparar-avaliacao.mjs
```

- Junta os casos de todos os modelos em `avaliacao/casos.csv`, com a coluna `modelo`.
- Cada caso ganha um **ID de avaliação** único com o nome do modelo (ex.: `glm-0042`).
- Os lotes do juiz ficam em `avaliacao/lotes/`, agrupados por modelo; cada lote informa de qual modelo são os casos.

## 6. Avaliar com o juiz

1. Use um modelo **que não esteja entre os comparados nem seja da mesma família** (nem Gemini, GLM, DeepSeek ou MiniMax).
2. Para cada lote, em **chat novo**: anexe `dist/pacote-juiz-casos-teste.md` e cole o conteúdo de `avaliacao/lotes/lote-NNN.md`.
3. Salve a resposta (o bloco CSV) em `avaliacao/juiz/lote-NNN.csv`. Pode colar junto com as linhas de cerca do bloco de código; o script as ignora.

## 7. Avaliar com o painel humano

```bash
node ferramentas/ficha-avaliacao.mjs --avaliador "Pedro"
```

- Gera `avaliacao/painel-humano/ficha-pedro.xlsx`, com o código de cada caso, a rubrica e as referências.
- A amostra é estratificada: o mesmo número de casos por modelo (padrão 30, mude com `--por-modelo`), distribuído pelos níveis da pirâmide. Ela fica em `amostra.csv` e é a mesma para todos os avaliadores; cada um recebe os casos em ordem própria.
- Para outro avaliador, rode de novo com outro nome. Use `--todos` para avaliar todos os casos.
- A rubrica, com âncoras e base na literatura, está em [`avaliacao/RUBRICA.md`](avaliacao/RUBRICA.md). O juiz usa exatamente a mesma.

## 8. Calcular as métricas

```bash
node ferramentas/metricas.mjs
```

Gera `metricas/metricas.xlsx` (com o nome real dos modelos), `metricas.json` e `casos-consolidados.csv`. Pode ser rodado a qualquer momento; o que ainda não foi feito fica em branco. Antes da versão final, defina os pesos dos atributos em `avaliacao/pesos.json` (o padrão é peso igual para todos).

| Grupo | Métricas |
|---|---|
| Geração | continuações, arquivos, casos (no modo chat, também se leu a entrada inteira) |
| Pirâmide | casos e % por nível, distância à pirâmide-alvo, forma de pirâmide |
| ISO/IEC 25010 | atributos e subatributos cobertos, equilíbrio entre atributos, casos por atributo |
| Rastreabilidade | % casos ligados a requisito, RF/RN/RNF cobertos, requisitos inexistentes citados, metadados completos |
| Execução | % passou, falhou, erro de carga; arquivos que carregaram; tempo |
| Cobertura | linhas, ramos, funções e comandos do backend e do frontend |
| Qualidade estática | asserções por caso, test smells (sem asserção, asserção fraca ou redundante, espera fixa, lógica condicional etc.), duplicados |
| Juiz e painel | média por critério, nota média, nota ISO ponderada, defeitos reais revelados |
| Concordância | juiz × humano e entre humanos: concordância exata, kappa ponderado (Cohen, 1968; Landis e Koch, 1977), Spearman e viés |
| Sistema-alvo | tamanho do Clínica+ (arquivos, linhas, rotas, telas, requisitos) |

A aba **Definições** da planilha explica o cálculo de cada métrica e a referência que a sustenta.
