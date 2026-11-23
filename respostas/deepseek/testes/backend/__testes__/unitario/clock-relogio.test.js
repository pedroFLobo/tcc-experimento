// Relógio injetável do sistema (RNF07): permite fixar "agora" nos testes.
const clock = require('../../src/utils/clock');

const AMBIENTE_ORIGINAL = process.env.CLINICA_AGORA;

afterEach(() => {
  clock.definirAgora(null);
  if (AMBIENTE_ORIGINAL === undefined) delete process.env.CLINICA_AGORA;
  else process.env.CLINICA_AGORA = AMBIENTE_ORIGINAL;
});

describe('definirAgora', () => {
  /**
   * @caso CT-UNI-221
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Fixar o instante atual usado pelas regras de negócio
   * @resultadoEsperado clock.agora devolve exatamente 19/10/2026 08:00 após definirAgora
   */
  test('fixa o instante atual', () => {
    clock.definirAgora(new Date(2026, 9, 19, 8, 0));
    expect(clock.agora().getTime()).toBe(new Date(2026, 9, 19, 8, 0).getTime());
  });

  /**
   * @caso CT-UNI-222
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RNF07
   * @objetivo Impedir que alterações na data devolvida modifiquem o relógio fixo
   * @resultadoEsperado Duas chamadas seguidas devolvem o mesmo instante mesmo após mutar a primeira
   */
  test('agora devolve uma cópia independente', () => {
    clock.definirAgora(new Date(2026, 9, 19, 8, 0));
    const primeira = clock.agora();
    primeira.setFullYear(1999);
    expect(clock.agora().getFullYear()).toBe(2026);
  });

  /**
   * @caso CT-UNI-223
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Restaurar o relógio real ao limpar o instante fixo
   * @resultadoEsperado clock.agora fica a menos de 5 segundos do horário do sistema
   */
  test('limpar o instante fixo volta ao relógio real', () => {
    clock.definirAgora(new Date(2026, 9, 19, 8, 0));
    clock.definirAgora(null);
    expect(Math.abs(clock.agora().getTime() - Date.now())).toBeLessThan(5000);
  });

  /**
   * @caso CT-UNI-224
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RNF07
   * @objetivo Manter dois instantes fixos independentes em chamadas consecutivas
   * @resultadoEsperado Após refixar o relógio, a data anterior não é reaproveitada
   */
  test('permite refixar o relógio', () => {
    clock.definirAgora(new Date(2026, 9, 19, 8, 0));
    clock.definirAgora(new Date(2027, 0, 1, 12, 0));
    expect(clock.agora().getFullYear()).toBe(2027);
    expect(clock.agora().getMonth()).toBe(0);
  });
});

describe('carregarDoAmbiente', () => {
  /**
   * @caso CT-UNI-225
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Ler CLINICA_AGORA do ambiente no formato AAAA-MM-DD HH:mm
   * @resultadoEsperado clock.agora devolve o instante definido na variável
   */
  test('carrega o instante da variável de ambiente', () => {
    process.env.CLINICA_AGORA = '2026-10-19 08:00';
    clock.carregarDoAmbiente();
    expect(clock.agora().getHours()).toBe(8);
    expect(clock.agora().getDate()).toBe(19);
  });

  /**
   * @caso CT-UNI-226
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF07, RNF04
   * @objetivo Falhar cedo e com mensagem clara quando CLINICA_AGORA é inválido
   * @resultadoEsperado carregarDoAmbiente lança erro citando o formato AAAA-MM-DD HH:mm
   */
  test('recusa CLINICA_AGORA inválido', () => {
    process.env.CLINICA_AGORA = '19/10/2026 08:00';
    expect(() => clock.carregarDoAmbiente()).toThrow(/CLINICA_AGORA inválido.*AAAA-MM-DD HH:mm/);
  });

  /**
   * @caso CT-UNI-227
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Voltar ao relógio real quando a variável não está definida
   * @resultadoEsperado clock.agora fica próximo do horário do sistema
   */
  test('sem variável de ambiente usa o relógio real', () => {
    delete process.env.CLINICA_AGORA;
    clock.carregarDoAmbiente();
    expect(Math.abs(clock.agora().getTime() - Date.now())).toBeLessThan(5000);
  });
});
