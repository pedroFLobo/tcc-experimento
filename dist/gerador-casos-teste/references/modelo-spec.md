# O que o SPEC.md do projeto precisa ter

A skill lê o `SPEC.md` da raiz do repositório. Ele descreve o projeto inteiro (não só os testes) e deve ter, no mínimo, as seções abaixo. Seja concreto: caminhos, versões e comandos reais.

| Seção | Conteúdo |
|---|---|
| Visão geral | O que o sistema faz, perfis de usuário, estado atual dos testes |
| Requisitos | Onde está a base de teste e o formato dos identificadores (ex.: `RF01`, `RN12`, `RNF03`); regra de conflito entre código e requisito |
| Stack | Linguagens, frameworks, versões, sistema de módulos |
| Arquitetura | Árvore de pastas com o papel de cada camada; rotas ou telas principais |
| Convenções | Idioma, formatos de data e dinheiro, formato dos erros |
| Como rodar | Comandos, portas, variáveis de ambiente, dados de exemplo |
| **Testes** | As subseções abaixo |

## Seção Testes

| Subseção | Conteúdo |
|---|---|
| Ferramentas | Bibliotecas permitidas, versões, como importar. Diga que não se deve instalar nada nem criar configuração |
| Onde gravar | Tabela nível → pasta → extensão → exemplo de import relativo; convenção de nomes |
| Ganchos de testabilidade | Banco em memória, app sem porta, relógio fixo, seletores estáveis |
| Ambiente de execução | URLs, como o banco é recriado, relógio dos testes ponta a ponta |
| Restrições para agentes | Pastas que podem ser alteradas, se pode executar comandos, se pode usar a rede |
| Atributos de qualidade | Para cada atributo da ISO/IEC 25010, que requisitos do projeto se relacionam com ele |
