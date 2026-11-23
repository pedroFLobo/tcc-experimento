# lote-107

Modelo: glm

Avalie com a skill `juiz-casos-teste` **somente os 12 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| glm-0244 | CT-UNI-074 | cobra preço base para adulto | passou |  |
| glm-0245 | CT-UNI-075 | aplica 10% de desconto para idoso | passou |  |
| glm-0246 | CT-UNI-076 | aplica desconto a partir de exatamente 60 anos | passou |  |
| glm-0247 | CT-UNI-077 | não aplica desconto com 59 anos | passou |  |
| glm-0248 | CT-UNI-078 | arredonda o desconto para o centavo mais próximo | passou |  |
| glm-0249 | CT-UNI-079 | retorno gratuito custa zero | passou |  |
| glm-0250 | CT-UNI-080 | retorno prevalece sobre o desconto de idade | passou |  |
| glm-0251 | CT-UNI-081 | escolhe a consulta realizada mais recente | passou |  |
| glm-0252 | CT-UNI-082 | aceita realizada com exatamente 30 dias | falhou | Error: expect(received).toBe(expected) // Object.is equality Expected: 7 Received: null at Object.toBe (C:\Users\pedro\AppData\Local\Temp\clinica-experimento\gl |
| glm-0253 | CT-UNI-083 | recusa realizada fora da janela de 30 dias | passou |  |
| glm-0254 | CT-UNI-084 | recusa consulta realizada já usada como retorno | passou |  |
| glm-0255 | CT-UNI-085 | ignora consultas que não são anteriores ao novo horário | passou |  |

## Arquivo: backend/__testes__/unitario/consultas-valor.test.js

```js
// Testes unitários do cálculo de valor da consulta e do direito a retorno (RN22, RN23, RN24).
const { calcularValor, encontrarConsultaDeRetorno } = require('../../src/domain/consultas');

describe('calcularValor (RN22, RN23, RN24)', () => {
  /**
   * @caso CT-UNI-074
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN22
   * @objetivo Cobrar o preço base integral para paciente adulto sem direito a retorno
   * @resultadoEsperado calcularValor retorna 15000 centavos para adulto de 36 anos
   */
  test('cobra preço base para adulto', () => {
    expect(calcularValor({ precoBaseCentavos: 15000, idadePaciente: 36, ehRetorno: false })).toBe(15000);
  });

  /**
   * @caso CT-UNI-075
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Aplicar 10% de desconto para paciente com 68 anos na data da consulta
   * @resultadoEsperado calcularValor retorna 13500 centavos (10% de desconto sobre 15000)
   */
  test('aplica 10% de desconto para idoso', () => {
    expect(calcularValor({ precoBaseCentavos: 15000, idadePaciente: 68, ehRetorno: false })).toBe(13500);
  });

  /**
   * @caso CT-UNI-076
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Aplicar desconto no aniversário em que o paciente completa 60 anos (valor-limite)
   * @resultadoEsperado calcularValor retorna valor com desconto para idade 60
   */
  test('aplica desconto a partir de exatamente 60 anos', () => {
    expect(calcularValor({ precoBaseCentavos: 30000, idadePaciente: 60, ehRetorno: false })).toBe(27000);
  });

  /**
   * @caso CT-UNI-077
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Não aplicar desconto para paciente de 59 anos (valor-limite)
   * @resultadoEsperado calcularValor retorna o preço integral para idade 59
   */
  test('não aplica desconto com 59 anos', () => {
    expect(calcularValor({ precoBaseCentavos: 30000, idadePaciente: 59, ehRetorno: false })).toBe(30000);
  });

  /**
   * @caso CT-UNI-078
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Arredondar o desconto para o centavo mais próximo
   * @resultadoEsperado calcularValor retorna 8999 para preço 9999 (8999,1 arredonda para baixo) e 13951 para 15501 (13950,9 arredonda para cima)
   */
  test('arredonda o desconto para o centavo mais próximo', () => {
    expect(calcularValor({ precoBaseCentavos: 9999, idadePaciente: 70, ehRetorno: false })).toBe(8999);
    expect(calcularValor({ precoBaseCentavos: 15501, idadePaciente: 70, ehRetorno: false })).toBe(13951);
  });

  /**
   * @caso CT-UNI-079
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Zerar o valor quando a consulta é retorno gratuito
   * @resultadoEsperado calcularValor retorna 0 quando ehRetorno é true
   */
  test('retorno gratuito custa zero', () => {
    expect(calcularValor({ precoBaseCentavos: 15000, idadePaciente: 36, ehRetorno: true })).toBe(0);
  });

  /**
   * @caso CT-UNI-080
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24, RN23
   * @objetivo Fazer o retorno prevalecer sobre o desconto de idade, sem somar os dois
   * @resultadoEsperado calcularValor retorna 0 para idoso com direito a retorno (e não valor negativo ou desconto duplo)
   */
  test('retorno prevalece sobre o desconto de idade', () => {
    expect(calcularValor({ precoBaseCentavos: 15000, idadePaciente: 68, ehRetorno: true })).toBe(0);
  });
});

describe('encontrarConsultaDeRetorno (RN24)', () => {
  const NOVO_INICIO = new Date(2026, 9, 19, 10, 0); // 2026-10-19 10:00
  const realizada = (id, dia, mes) => ({ id, inicio: new Date(2026, mes - 1, dia, 9, 0) });

  /**
   * @caso CT-UNI-081
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Encontrar a consulta realizada mais recente dentro da janela de 30 dias
   * @resultadoEsperado encontrarConsultaDeRetorno retorna o id 5 (realizada há 9 dias) entre duas candidatas
   */
  test('escolhe a consulta realizada mais recente', () => {
    const realizadas = [realizada(3, 25, 9), realizada(5, 10, 10)];
    expect(encontrarConsultaDeRetorno(realizadas, [], NOVO_INICIO)).toBe(5);
  });

  /**
   * @caso CT-UNI-082
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Incluir consulta realizada com exatamente 30 dias (valor-limite da janela)
   * @resultadoEsperado encontrarConsultaDeRetorno retorna o id da consulta realizada em 2026-09-19
   */
  test('aceita realizada com exatamente 30 dias', () => {
    const realizadas = [realizada(7, 19, 9)];
    expect(encontrarConsultaDeRetorno(realizadas, [], NOVO_INICIO)).toBe(7);
  });

  /**
   * @caso CT-UNI-083
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Excluir consulta realizada há mais de 30 dias do novo horário
   * @resultadoEsperado encontrarConsultaDeRetorno retorna null para realizada em 2026-09-18 (31 dias)
   */
  test('recusa realizada fora da janela de 30 dias', () => {
    const realizadas = [realizada(7, 18, 9)];
    expect(encontrarConsultaDeRetorno(realizadas, [], NOVO_INICIO)).toBeNull();
  });

  /**
   * @caso CT-UNI-084
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Não conceder novo retorno com uma consulta realizada que já foi usada
   * @resultadoEsperado encontrarConsultaDeRetorno retorna null quando o id já está em idsJaUsados
   */
  test('recusa consulta realizada já usada como retorno', () => {
    const realizadas = [realizada(5, 10, 10)];
    expect(encontrarConsultaDeRetorno(realizadas, [5], NOVO_INICIO)).toBeNull();
  });

  /**
   * @caso CT-UNI-085
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Não considerar consulta com início no futuro ou no próprio instante do novo horário
   * @resultadoEsperado encontrarConsultaDeRetorno retorna null quando a realizada começa junto ou depois do novo início
   */
  test('ignora consultas que não são anteriores ao novo horário', () => {
    const realizadas = [
      { id: 9, inicio: new Date(2026, 9, 19, 10, 0) }, // mesma hora do novo início
      { id: 10, inicio: new Date(2026, 9, 25, 9, 0) }, // futura
    ];
    expect(encontrarConsultaDeRetorno(realizadas, [], NOVO_INICIO)).toBeNull();
  });
});
```
