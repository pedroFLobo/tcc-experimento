# Pirâmide de testes e atributos da ISO/IEC 25010

## Níveis da pirâmide (`@nivel`)

Cubra **todos** os níveis que a spec do projeto prevê. A proporção é uma orientação: o importante é que a base seja larga e o topo estreito. A spec diz qual ferramenta e qual pasta corresponde a cada nível.

| `@nivel` | O que testa | Proporção indicativa |
|---|---|---|
| `unitario` | Uma função, classe ou componente isolado, sem banco, rede ou sistema de arquivos | ~45% |
| `integracao` | Várias unidades juntas com uma dependência real ou em memória: serviço + repositório + banco em memória; componente de interface com seus filhos e hooks | ~25% |
| `api` | A interface pública do sistema por HTTP (ou equivalente): status, corpo, códigos de erro, autenticação e autorização | ~20% |
| `e2e` | Fluxos completos do usuário pela interface, com o sistema inteiro rodando | ~10% |

## Atributos de qualidade (`@atributo` e `@subatributo`)

Cada caso declara **um** atributo principal e **um** subatributo, usando exatamente os identificadores abaixo. Cubra todos os atributos que façam sentido para o projeto (a spec pode indicar exemplos).

| `@atributo` | `@subatributo` permitidos | O que um caso desse atributo costuma verificar |
|---|---|---|
| `adequacao-funcional` | `completude`, `correcao`, `pertinencia` | Regras de negócio, cálculos, transições de estado, resultados esperados |
| `seguranca` | `confidencialidade`, `integridade`, `autenticidade`, `responsabilizacao` | Acesso negado (401/403), dados de outro usuário, senha nunca exposta, injeção, validação de token, registro de quem fez o quê |
| `confiabilidade` | `maturidade`, `tolerancia-a-falhas`, `recuperabilidade` | Entradas malformadas, erro tratado sem derrubar o sistema, estado consistente após falha |
| `usabilidade` | `operabilidade`, `protecao-contra-erro-do-usuario`, `reconhecibilidade`, `acessibilidade` | Mensagens claras, campos com rótulo, ações perigosas com confirmação, botões desabilitados, navegação por teclado |
| `eficiencia-de-desempenho` | `comportamento-no-tempo`, `utilizacao-de-recursos` | Tempo de resposta medido contra um limite da base de teste, volume de dados |
| `compatibilidade` | `interoperabilidade`, `coexistencia` | Contrato entre partes do sistema (formato JSON, cabeçalhos, CORS) |
| `manutenibilidade` | `testabilidade`, `modularidade` | Regras isoladas de infraestrutura, dependências injetáveis (relógio, banco) |

## Rastreabilidade (`@requisito`)

Todo caso cita ao menos um identificador da base de teste indicada na spec (ex.: `RN19`, `RF08.2`, `RNF04`). Use vírgula para mais de um.
