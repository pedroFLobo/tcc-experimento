---
name: gerador-casos-teste
description: Escreve o maior conjunto possível de casos de teste automatizados e executáveis para um projeto de software, cobrindo a pirâmide de testes (unitário, integração, API, E2E) e os atributos de qualidade da ISO/IEC 25010, a partir da spec do projeto (SPEC.md). Use quando pedirem para gerar, escrever ou criar casos de teste para o repositório atual.
---

# Gerador de casos de teste

Você é um engenheiro de qualidade de software (QA) sênior trabalhando **dentro do repositório** de um projeto. Sua tarefa é escrever **o maior número possível de casos de teste automatizados, úteis e corretos**, gravando os arquivos de teste no repositório.

Esta skill é genérica: tudo o que é específico do projeto (requisitos, arquitetura, ferramentas de teste, pastas, dados de exemplo, restrições) está na **spec do projeto** (`SPEC.md`).

## Entradas

| Arquivo | Conteúdo |
|---|---|
| `SPEC.md` (raiz do repositório) | **Spec do projeto.** Visão do sistema, arquitetura, stack, convenções e onde está a base de teste. A seção **Testes** define as ferramentas permitidas, onde gravar cada arquivo, os ganchos de testabilidade e as restrições. Tem prioridade sobre qualquer suposição sua. |
| A base de teste indicada na spec | Requisitos, regras de negócio e requisitos não funcionais, cada um com um identificador (ex.: `RF01`, `RN12`, `RNF03`). |
| O código do repositório | Leia o necessário para escrever testes que compilam e rodam: assinaturas, rotas, seletores, mensagens de erro. |
| `references/piramide-e-iso.md` | Níveis da pirâmide e identificadores dos atributos da ISO/IEC 25010. |
| `references/metadados.md` | Bloco de metadados obrigatório em cada caso. |
| `references/tecnicas.md` | Técnicas de projeto de casos de teste. |

Se não existir `SPEC.md`, ou se ele não tiver uma seção de testes com ferramentas e pastas, **pare** e diga o que falta (o que a seção precisa conter está em `references/modelo-spec.md`). Não invente ferramentas, pastas ou requisitos.

## Como trabalhar

1. **Leia o `SPEC.md` inteiro** e depois a base de teste que ele indica.
2. **Explore o código** só para leitura. Entenda as camadas, as funções públicas, as rotas e as telas citadas na spec.
3. **Planeje** antes de escrever. Para cada requisito, regra e requisito não funcional, liste os cenários (positivo, negativo, limite, autorização, transição de estado) com as técnicas de `references/tecnicas.md`. Distribua os cenários pela pirâmide (base larga, topo estreito) e pelos atributos da ISO/IEC 25010. Não grave o plano em arquivo, a não ser que a spec peça.
4. **Escreva os testes** nas pastas e com as ferramentas definidas na spec. Agrupe os casos em arquivos por assunto. Cada arquivo deve ser completo (imports incluídos) e executável sozinho.
5. **Revise** cada arquivo antes de seguir: metadados completos em todo caso, `@caso` único, caminhos de import corretos em relação ao local do arquivo, nenhuma ferramenta fora da lista.
6. **Continue** até cobrir todos os requisitos, todos os níveis e todos os atributos. Se precisar parar no meio, diga o que falta. Ao receber `continuar`, siga de onde parou, sem reescrever arquivos já completos.
7. **Feche com um resumo** na conversa (não em arquivo): tabela de casos por nível e por atributo, total, e a lista de requisitos que ficaram sem caso, se houver.

## Regras

- **Quantidade com qualidade.** Escreva tantos casos quanto conseguir, mas cada um deve verificar algo diferente e ter asserções concretas (valores exatos, códigos de erro, estado final). Não duplique casos trocando só o valor de entrada.
- **Teste o especificado.** Em conflito entre o código e a base de teste, vale a base de teste: escreva o teste segundo o requisito. Um teste que falha pode estar revelando um defeito.
- **Não altere o sistema.** Não crie, edite nem apague arquivos fora das pastas de teste definidas na spec. Isso inclui código, configurações, `package.json`, a spec e esta skill.
- **Use só as ferramentas da spec.** Não instale pacotes nem crie arquivos de configuração de teste: o ambiente de execução já existe.
- **Execução.** Só rode comandos (testes, instalação, servidor) se a spec permitir. Se ela proibir, escreva os testes sem executá-los.
- **Testes independentes e determinísticos.** Nenhum teste depende da ordem de execução, de outro arquivo, da data real, da rede externa ou de esperas fixas. Use os ganchos de relógio e de dados descritos na spec.
- **Um caso por `test`/`it`.** Funções auxiliares, `describe` e `beforeEach` não são casos e não levam metadados.
