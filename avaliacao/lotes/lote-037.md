# lote-037

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 8 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-0604 | CT-UNI-228 | guarda status, código e mensagem | passou |  |
| deepseek-0605 | CT-UNI-229 | validação responde 400 | passou |  |
| deepseek-0606 | CT-UNI-230 | não autenticado responde 401 com mensagem padrão | passou |  |
| deepseek-0607 | CT-UNI-231 | sem permissão responde 403 | passou |  |
| deepseek-0608 | CT-UNI-232 | não encontrado responde 404 | passou |  |
| deepseek-0609 | CT-UNI-233 | conflito responde 409 | passou |  |
| deepseek-0610 | CT-UNI-234 | regra de negócio responde 422 | passou |  |
| deepseek-0611 | CT-UNI-235 | conta bloqueada responde 423 | passou |  |

## Arquivo: backend/__testes__/unitario/erros-api.test.js

```js
// Classes e fábricas de erro da API, com os códigos da seção 5 dos requisitos.
const {
  AppError,
  validacao,
  naoAutenticado,
  semPermissao,
  naoEncontrado,
  conflito,
  regraNegocio,
  contaBloqueada,
} = require('../../src/utils/errors');

describe('AppError', () => {
  /**
   * @caso CT-UNI-228
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF04
   * @objetivo Preservar status HTTP, código e mensagem no erro da aplicação
   * @resultadoEsperado A instância expõe os três valores informados e é um Error
   */
  test('guarda status, código e mensagem', () => {
    const erro = new AppError(418, 'CODIGO_X', 'Mensagem de teste');
    expect(erro).toBeInstanceOf(Error);
    expect(erro.status).toBe(418);
    expect(erro.codigo).toBe('CODIGO_X');
    expect(erro.message).toBe('Mensagem de teste');
  });
});

describe('fábricas de erro', () => {
  /**
   * @caso CT-UNI-229
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF04
   * @objetivo Criar erro de validação com status 400
   * @resultadoEsperado validacao devolve AppError 400/VALIDACAO com a mensagem recebida
   */
  test('validação responde 400', () => {
    const erro = validacao('Dado inválido.');
    expect([erro.status, erro.codigo, erro.message]).toEqual([400, 'VALIDACAO', 'Dado inválido.']);
  });

  /**
   * @caso CT-UNI-230
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2, RNF02
   * @objetivo Criar erro de autenticação com status 401 e mensagem padrão em português
   * @resultadoEsperado naoAutenticado sem argumento devolve "Autenticação necessária."
   */
  test('não autenticado responde 401 com mensagem padrão', () => {
    const erro = naoAutenticado();
    expect([erro.status, erro.codigo, erro.message]).toEqual([401, 'NAO_AUTENTICADO', 'Autenticação necessária.']);
  });

  /**
   * @caso CT-UNI-231
   * @nivel unitario
   * @atributo seguranca
   * @subatributo responsabilizacao
   * @requisito RN30, RNF02
   * @objetivo Criar erro de permissão com status 403
   * @resultadoEsperado semPermissao devolve 403/SEM_PERMISSAO
   */
  test('sem permissão responde 403', () => {
    const erro = semPermissao('Sem acesso.');
    expect([erro.status, erro.codigo, erro.message]).toEqual([403, 'SEM_PERMISSAO', 'Sem acesso.']);
  });

  /**
   * @caso CT-UNI-232
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN30, RNF04
   * @objetivo Criar erro de recurso inexistente com status 404
   * @resultadoEsperado naoEncontrado devolve 404/NAO_ENCONTRADO
   */
  test('não encontrado responde 404', () => {
    const erro = naoEncontrado('Consulta não encontrada.');
    expect([erro.status, erro.codigo]).toEqual([404, 'NAO_ENCONTRADO']);
  });

  /**
   * @caso CT-UNI-233
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN01, RN03, RN07
   * @objetivo Criar erro de duplicidade com status 409
   * @resultadoEsperado conflito devolve 409/CONFLITO
   */
  test('conflito responde 409', () => {
    expect(conflito('E-mail já cadastrado.').status).toBe(409);
    expect(conflito('E-mail já cadastrado.').codigo).toBe('CONFLITO');
  });

  /**
   * @caso CT-UNI-234
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN16, RN19, RNF04
   * @objetivo Criar erro de regra de negócio com status 422
   * @resultadoEsperado regraNegocio devolve 422/REGRA_NEGOCIO
   */
  test('regra de negócio responde 422', () => {
    const erro = regraNegocio('Limite atingido.');
    expect([erro.status, erro.codigo, erro.message]).toEqual([422, 'REGRA_NEGOCIO', 'Limite atingido.']);
  });

  /**
   * @caso CT-UNI-235
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN04
   * @objetivo Criar erro de conta bloqueada com status 423
   * @resultadoEsperado contaBloqueada devolve 423/CONTA_BLOQUEADA
   */
  test('conta bloqueada responde 423', () => {
    const erro = contaBloqueada('Bloqueada até 08:15.');
    expect([erro.status, erro.codigo, erro.message]).toEqual([423, 'CONTA_BLOQUEADA', 'Bloqueada até 08:15.']);
  });
});
```
