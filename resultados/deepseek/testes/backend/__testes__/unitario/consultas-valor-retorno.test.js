// Cálculo de valor (RN22–RN24) e direito a retorno gratuito.
const { calcularValor, encontrarConsultaDeRetorno, REGRAS } = require('../../src/domain/consultas');

describe('calcularValor', () => {
  /**
   * @caso CT-UNI-165
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN22
   * @objetivo Cobrar o preço base da especialidade para adulto
   * @resultadoEsperado calcularValor devolve 15000 para 36 anos
   */
  test('cobra o preço base para adulto', () => {
    expect(calcularValor({ precoBaseCentavos: 15000, idadePaciente: 36, ehRetorno: false })).toBe(15000);
  });

  /**
   * @caso CT-UNI-166
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Não aplicar desconto um ano antes dos 60
   * @resultadoEsperado calcularValor devolve 15000 para 59 anos
   */
  test('não aplica desconto aos 59 anos', () => {
    expect(calcularValor({ precoBaseCentavos: 15000, idadePaciente: 59, ehRetorno: false })).toBe(15000);
  });

  /**
   * @caso CT-UNI-167
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Aplicar 10% de desconto na idade mínima de 60 anos
   * @resultadoEsperado calcularValor devolve 13500 para 60 anos
   */
  test('aplica 10% de desconto aos 60 anos', () => {
    expect(calcularValor({ precoBaseCentavos: 15000, idadePaciente: 60, ehRetorno: false })).toBe(13500);
  });

  /**
   * @caso CT-UNI-168
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Manter o desconto para idades acima de 60
   * @resultadoEsperado calcularValor devolve 27000 para 30000 aos 68 anos
   */
  test('aplica desconto acima dos 60 anos', () => {
    expect(calcularValor({ precoBaseCentavos: 30000, idadePaciente: 68, ehRetorno: false })).toBe(27000);
  });

  /**
   * @caso CT-UNI-169
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Arredondar o desconto para o centavo mais próximo
   * @resultadoEsperado 15555 com 10% de desconto resulta em 14000
   */
  test('arredonda o desconto para o centavo mais próximo', () => {
    expect(calcularValor({ precoBaseCentavos: 15555, idadePaciente: 70, ehRetorno: false })).toBe(14000);
  });

  /**
   * @caso CT-UNI-170
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Arredondar para baixo quando a fração é menor que meio centavo
   * @resultadoEsperado 19999 com 10% de desconto resulta em 17999
   */
  test('arredonda fração abaixo de meio centavo para baixo', () => {
    expect(calcularValor({ precoBaseCentavos: 19999, idadePaciente: 61, ehRetorno: false })).toBe(17999);
  });

  /**
   * @caso CT-UNI-171
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Zerar o valor quando a consulta é retorno
   * @resultadoEsperado calcularValor devolve 0 para ehRetorno true
   */
  test('retorno custa zero', () => {
    expect(calcularValor({ precoBaseCentavos: 30000, idadePaciente: 30, ehRetorno: true })).toBe(0);
  });

  /**
   * @caso CT-UNI-172
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Fazer o retorno prevalecer sobre o desconto de idade
   * @resultadoEsperado calcularValor devolve 0 e não 90% do preço para idoso em retorno
   */
  test('retorno prevalece sobre o desconto de idade', () => {
    expect(calcularValor({ precoBaseCentavos: 20000, idadePaciente: 75, ehRetorno: true })).toBe(0);
  });

  /**
   * @caso CT-UNI-173
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN23
   * @objetivo Preservar o preço base quando o valor é pequeno
   * @resultadoEsperado 100 centavos com 10% de desconto resulta em 90
   */
  test('aplica desconto a valores pequenos', () => {
    expect(calcularValor({ precoBaseCentavos: 100, idadePaciente: 65, ehRetorno: false })).toBe(90);
  });

  /**
   * @caso CT-UNI-174
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RN23, RNF07
   * @objetivo Expor os parâmetros da regra de desconto
   * @resultadoEsperado REGRAS declara 60 anos e 10%
   */
  test('parâmetros do desconto são declarados', () => {
    expect(REGRAS.DESCONTO_IDOSO_IDADE).toBe(60);
    expect(REGRAS.DESCONTO_IDOSO_PERCENTUAL).toBe(10);
  });
});

describe('encontrarConsultaDeRetorno', () => {
  const NOVA = new Date(2026, 9, 19, 10, 0);

  /**
   * @caso CT-UNI-175
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Reconhecer consulta realizada 10 dias antes como direito a retorno
   * @resultadoEsperado encontrarConsultaDeRetorno devolve o id da consulta
   */
  test('encontra retorno dentro de 30 dias', () => {
    const realizadas = [{ id: 7, inicio: new Date(2026, 9, 9, 9, 0) }];
    expect(encontrarConsultaDeRetorno(realizadas, [], NOVA)).toBe(7);
  });

  /**
   * @caso CT-UNI-176
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Reconhecer retorno exatamente no limite de 30 dias
   * @resultadoEsperado encontrarConsultaDeRetorno devolve o id para consulta em 19/09/2026 10:00
   */
  test('aceita retorno no limite exato de 30 dias', () => {
    const realizadas = [{ id: 9, inicio: new Date(2026, 8, 19, 10, 0) }];
    expect(encontrarConsultaDeRetorno(realizadas, [], NOVA)).toBe(9);
  });

  /**
   * @caso CT-UNI-177
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Recusar retorno com 31 dias
   * @resultadoEsperado encontrarConsultaDeRetorno devolve null para consulta em 18/09/2026
   */
  test('recusa retorno fora da janela de 30 dias', () => {
    const realizadas = [{ id: 9, inicio: new Date(2026, 8, 18, 9, 0) }];
    expect(encontrarConsultaDeRetorno(realizadas, [], NOVA)).toBeNull();
  });

  /**
   * @caso CT-UNI-178
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Ignorar consulta realizada depois do novo horário
   * @resultadoEsperado encontrarConsultaDeRetorno devolve null quando a realizada é posterior
   */
  test('ignora consulta posterior ao novo horário', () => {
    const realizadas = [{ id: 11, inicio: new Date(2026, 9, 19, 11, 0) }];
    expect(encontrarConsultaDeRetorno(realizadas, [], NOVA)).toBeNull();
  });

  /**
   * @caso CT-UNI-179
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Não conceder retorno quando o direito já foi usado
   * @resultadoEsperado encontrarConsultaDeRetorno devolve null se o id está em idsJaUsados
   */
  test('não reutiliza o direito ao retorno', () => {
    const realizadas = [{ id: 7, inicio: new Date(2026, 9, 9, 9, 0) }];
    expect(encontrarConsultaDeRetorno(realizadas, [7], NOVA)).toBeNull();
  });

  /**
   * @caso CT-UNI-180
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Escolher a realização mais recente quando há várias elegíveis
   * @resultadoEsperado encontrarConsultaDeRetorno devolve o id da consulta mais próxima do novo horário
   */
  test('escolhe a consulta realizada mais recente', () => {
    const realizadas = [
      { id: 3, inicio: new Date(2026, 8, 25, 9, 0) },
      { id: 8, inicio: new Date(2026, 9, 15, 9, 0) },
    ];
    expect(encontrarConsultaDeRetorno(realizadas, [], NOVA)).toBe(8);
  });

  /**
   * @caso CT-UNI-181
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Ignorar realizações antigas e escolher apenas a elegível
   * @resultadoEsperado encontrarConsultaDeRetorno devolve o id da consulta de 10 dias atrás
   */
  test('ignora realizações fora da janela', () => {
    const realizadas = [
      { id: 2, inicio: new Date(2026, 6, 1, 9, 0) },
      { id: 5, inicio: new Date(2026, 9, 9, 9, 0) },
    ];
    expect(encontrarConsultaDeRetorno(realizadas, [], NOVA)).toBe(5);
  });

  /**
   * @caso CT-UNI-182
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RN24
   * @objetivo Não conceder retorno quando não existe consulta realizada
   * @resultadoEsperado encontrarConsultaDeRetorno devolve null para lista vazia
   */
  test('sem realizações não há retorno', () => {
    expect(encontrarConsultaDeRetorno([], [], NOVA)).toBeNull();
  });

  /**
   * @caso CT-UNI-183
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN24
   * @objetivo Ignorar retorno cujo direito já foi consumido por outra consulta
   * @resultadoEsperado encontrarConsultaDeRetorno devolve o segundo id disponível
   */
  test('usa o próximo direito disponível', () => {
    const realizadas = [
      { id: 4, inicio: new Date(2026, 8, 28, 9, 0) },
      { id: 6, inicio: new Date(2026, 9, 12, 9, 0) },
    ];
    expect(encontrarConsultaDeRetorno(realizadas, [6], NOVA)).toBe(4);
  });

  /**
   * @caso CT-UNI-184
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RN24, RNF07
   * @objetivo Expor a janela de retorno em dias
   * @resultadoEsperado REGRAS.JANELA_RETORNO_DIAS é 30
   */
  test('janela de retorno declarada em 30 dias', () => {
    expect(REGRAS.JANELA_RETORNO_DIAS).toBe(30);
  });
});
