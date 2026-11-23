# Modelos do experimento

_Atualizado em 15/11/2026. Pesquisa completa, com fontes oficiais: `pesquisa/ias-gratuitas-na-maquina.md` (arquivos do projeto)._

## Geradores (cenário A: grátis, agente de linha de comando no PC, com acesso ao repositório e à skill)

| # | Modelo | Fornecedor | Programa | Observações |
|---|---|---|---|---|
| 1 | Gemini 3.8 Flash | Google | Antigravity CLI (`agy`), conta Google grátis | Cota semanal sem número publicado |
| 2 | GLM-5.3-Flash | Zhipu (Z.ai) | OpenCode, modelo Free | Grátis por tempo limitado; retenção zero |
| 3 | DeepSeek V4.1 Flash | DeepSeek | OpenCode, modelo Free | Grátis por tempo limitado; retenção zero |
| 4 | MiniMax M3.1 Flash | MiniMax | OpenCode, modelo Free | Grátis por tempo limitado; retenção zero |

Por que estes: são gratuitos, rodam como agente no PC com acesso ao repositório local, leem skills no padrão Agent Skills (`.agents/skills/`), e são quatro fornecedores diferentes. Todos são versões "Flash" (leves), o que deixa a comparação equilibrada, mas deve ser citado como limitação.

## Excluídos

| Opção | Motivo |
|---|---|
| Codex CLI com login do ChatGPT | Terminal só a partir do plano Plus (pago) |
| Kimi Code | Só em plano pago |
| Gemini CLI | Uso grátis substituído pelo Antigravity CLI |
| GitHub Copilot CLI (Free) | Escolhe o modelo sozinho; não serve para comparar modelos |
| Modelos locais (Ollama) | Os que cabem num PC comum são muito menores que os de nuvem |

## Juiz

O juiz não pode ser de nenhuma das famílias dos geradores (Gemini, GLM, DeepSeek, MiniMax). Ainda a definir.

## Cuidados

- Registre a versão exata do modelo e do programa em `respostas/registro.csv`.
- Os modelos grátis do OpenCode podem sair do ar: gere os três no mesmo dia, se possível.
