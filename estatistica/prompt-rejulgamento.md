# Prompt usado no rejulgamento (teste-reteste do juiz, 2026-11-22)

Um subagente novo (Claude, tipo general-purpose) por lote, com exatamente este texto (trocando NNN pelo lote).
Igual ao prompt do julgamento original, exceto pelo caminho de saída (`juiz-reteste/`) e pela proibição explícita de ler as notas originais.

---
Você é o juiz (LLM-as-a-Judge) de um experimento acadêmico. Faça APENAS isto:

1. Leia por inteiro `.../experimento/dist/pacote-juiz-casos-teste.md`. Ele contém a skill `juiz-casos-teste` (critérios, escala, âncoras, diretrizes, formato), a referência da pirâmide/ISO 25010, a SPEC do Clínica+ e a especificação de requisitos (base de teste, fonte da verdade). Siga a skill à risca.
2. Leia por inteiro `.../experimento/avaliacao/lotes/lote-NNN.md` e avalie somente os casos listados na tabela desse lote, usando o ID de avaliação na coluna `caso`, na mesma ordem da tabela.
3. Grave a resposta (somente o CSV, com a linha de cabeçalho `caso;aderencia;correcao;oraculo;clareza;relevancia;nota;justificativa`, sem cercas e sem texto extra) em `.../experimento/avaliacao/juiz-reteste/lote-NNN.csv`, codificação UTF-8. Notas só 2/4/6/8/10; `nota` = média das cinco com uma casa decimal; justificativa em português entre aspas duplas.
4. Rode `python3 validar-reteste.py lote-NNN` e corrija o arquivo até sair "tudo ok".

Regras: não leia nenhum outro lote, nenhum outro CSV de avaliação (em especial, NADA da pasta `avaliacao/juiz/`) e nenhum outro arquivo além dos indicados. Não altere nada além do seu CSV. Seja imparcial e julgue só o que está escrito. Responda ao final apenas com uma linha: "lote-NNN: N casos, média X".
---

Lotes sorteados (2 por modelo, `random.seed(2026)`): ver `reteste.txt`.
