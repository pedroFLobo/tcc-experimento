# Técnicas de projeto de casos de teste

Use estas técnicas para derivar cenários de cada requisito. Elas seguem o ISTQB Foundation Level e a ISO/IEC/IEEE 29119-4.

| Técnica | Quando usar | Exemplo |
|---|---|---|
| **Partição de equivalência** | Entradas com classes válidas e inválidas | E-mail válido, sem @, vazio |
| **Análise de valor-limite** | Prazos, idades, tamanhos, quantidades, valores monetários | Limite de 100 caracteres: testar 99, 100 e 101 |
| **Tabela de decisão** | Regras que combinam várias condições | Frete grátis por valor do pedido × região |
| **Transição de estados** | Entidades com ciclo de vida | Pedido criado → pago → enviado; transições proibidas devolvem erro |
| **Autorização por perfil** | Sistemas com papéis ou dono do recurso | Sem token (401), outro perfil (403), dono (200) |
| **Casos de erro e robustez** | Entradas malformadas, dados ausentes, falhas de dependência | JSON inválido, campo obrigatório vazio, id inexistente (404) |
| **Fluxos de uso** | Testes E2E | Login, ação principal e verificação na tela |

## Boas práticas de escrita

- Estrutura **preparar, agir, verificar** visível em cada caso.
- Dados com significado (nomes e valores que expliquem o cenário), sem números mágicos.
- Asserções específicas: status **e** corpo **e**, quando houver, o estado final (o registro mudou mesmo).
- Evite *test smells*: teste sem asserção, asserção trivial, lógica condicional no teste, esperas fixas (`sleep`), testes que dependem uns dos outros.
