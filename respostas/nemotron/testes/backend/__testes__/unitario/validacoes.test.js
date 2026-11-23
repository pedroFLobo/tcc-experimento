// Testes de unidade — domínio: validações de cadastro (RN01, RN02, RN03, RN05, RN06, RN07, RN08, RN09)
// Atributo: Adequação funcional
const v = require('../../src/domain/validacoes');

describe('validacoes de cadastro (domínio puro)', () => {
  describe('emailValido (RN01)', () => {
    test('aceita e-mails válidos', () => {
      expect(v.emailValido('ana@email.com')).toBe(true);
      expect(v.emailValido('recepcao@clinica.com')).toBe(true);
    });
    test('rejeita e-mails inválidos', () => {
      expect(v.emailValido('')).toBe(false);
      expect(v.emailValido('ana@email')).toBe(false);
      expect(v.emailValido('anaemail.com')).toBe(false);
      expect(v.emailValido('ana @email.com')).toBe(false);
      expect(v.emailValido(null)).toBe(false);
      expect(v.emailValido(123)).toBe(false);
    });
    test('ignora espaços nas pontas', () => {
      expect(v.emailValido('  ana@email.com  ')).toBe(true);
    });
  });

  describe('senhaValida (RN02)', () => {
    test('aceita senhas com 8+ chars, letra e número', () => {
      expect(v.senhaValida('Senha123')).toBe(true);
      expect(v.senhaValida('abc12345')).toBe(true);
    });
    test('rejeita senha curta', () => {
      expect(v.senhaValida('Ab1')).toBe(false);
      expect(v.senhaValida('Senha1')).toBe(false);
    });
    test('rejeita sem letra', () => {
      expect(v.senhaValida('12345678')).toBe(false);
    });
    test('rejeita sem número', () => {
      expect(v.senhaValida('SenhaABC')).toBe(false);
    });
    test('rejeita valores não string', () => {
      expect(v.senhaValida(null)).toBe(false);
      expect(v.senhaValida(undefined)).toBe(false);
    });
  });

  describe('cpfValido / normalizarCpf (RN03)', () => {
    test('aceita CPFs válidos com e sem pontuação', () => {
      expect(v.cpfValido('529.982.247-25')).toBe(true);
      expect(v.cpfValido('52998224725')).toBe(true);
      expect(v.cpfValido('111.444.777-35')).toBe(true);
      expect(v.cpfValido('390.533.447-05')).toBe(true);
    });
    test('normaliza removendo pontuação', () => {
      expect(v.normalizarCpf('529.982.247-25')).toBe('52998224725');
      expect(v.normalizarCpf('52998224725')).toBe('52998224725');
    });
    test('rejeita CPF com quantidade errada de dígitos', () => {
      expect(v.cpfValido('123456789')).toBe(false);
      expect(v.cpfValido('123456789012')).toBe(false);
    });
    test('rejeita CPF com todos os dígitos iguais', () => {
      expect(v.cpfValido('111.111.111-11')).toBe(false);
      expect(v.cpfValido('00000000000')).toBe(false);
    });
    test('rejeita dígitos verificadores incorretos', () => {
      expect(v.cpfValido('111.111.111-12')).toBe(false);
      expect(v.cpfValido(null)).toBe(false);
      expect(v.cpfValido(undefined)).toBe(false);
    });
  });

  describe('crmValido (RN07)', () => {
    test('aceita CRM com 4 a 6 dígitos e UF válida', () => {
      expect(v.crmValido('123456/SP')).toBe(true);
      expect(v.crmValido('9876/PR')).toBe(true);
      expect(v.crmValido('11223/MG')).toBe(true);
    });
    test('rejeita CRM com menos de 4 dígitos', () => {
      expect(v.crmValido('123/SP')).toBe(false);
    });
    test('rejeita CRM com mais de 6 dígitos', () => {
      expect(v.crmValido('1234567/SP')).toBe(false);
    });
    test('rejeita UF inválida', () => {
      expect(v.crmValido('123456/XX')).toBe(false);
      expect(v.crmValido('123456/sp')).toBe(false);
    });
    test('rejeita formato inválido', () => {
      expect(v.crmValido('123456SP')).toBe(false);
      expect(v.crmValido('123456/')).toBe(false);
      expect(v.crmValido(null)).toBe(false);
    });
  });

  describe('validarDataNascimento (RN05)', () => {
    const hoje = new Date('2026-10-19');
    test('aceita data válida no passado', () => {
      expect(v.validarDataNascimento('1990-05-14', hoje)).toBe(null);
    });
    test('rejeita data futura', () => {
      expect(v.validarDataNascimento('2027-01-01', hoje)).toBe('Data de nascimento não pode ser futura.');
    });
    test('rejeita formato inválido', () => {
      expect(v.validarDataNascimento('14/05/1990', hoje)).toBe('Data de nascimento inválida. Use o formato AAAA-MM-DD.');
      expect(v.validarDataNascimento('', hoje)).toBe('Data de nascimento inválida. Use o formato AAAA-MM-DD.');
    });
    test('rejeita idade acima de 130 anos', () => {
      expect(v.validarDataNascimento('1890-01-01', hoje)).toBe('Idade não pode ser superior a 130 anos.');
    });
  });

  describe('exigeResponsavel (RN06)', () => {
    const hoje = new Date('2026-10-19');
    test('exige responsável para menor de 18', () => {
      // nascido em 2010 -> 16 anos em 2026
      expect(v.exigeResponsavel(new Date('2010-01-01'), hoje)).toBe(true);
    });
    test('não exige responsável para maior de 18', () => {
      expect(v.exigeResponsavel(new Date('2000-01-01'), hoje)).toBe(false);
      expect(v.exigeResponsavel(new Date('1990-05-14'), hoje)).toBe(false);
    });
  });

  describe('duracaoConsultaValida (RN08)', () => {
    test('aceita durações entre 15 e 60, múltiplo de 15', () => {
      expect(v.duracaoConsultaValida(15)).toBe(true);
      expect(v.duracaoConsultaValida(30)).toBe(true);
      expect(v.duracaoConsultaValida(45)).toBe(true);
      expect(v.duracaoConsultaValida(60)).toBe(true);
    });
    test('rejeita fora do intervalo ou não múltiplo de 15', () => {
      expect(v.duracaoConsultaValida(10)).toBe(false);
      expect(v.duracaoConsultaValida(20)).toBe(false);
      expect(v.duracaoConsultaValida(61)).toBe(false);
      expect(v.duracaoConsultaValida(0)).toBe(false);
    });
  });

  describe('calcularIdade', () => {
    const ref = new Date('2026-05-14');
    test('calcula idade considerando aniversário já feito', () => {
      expect(v.calcularIdade(new Date('1990-05-14'), ref)).toBe(36);
    });
    test('calcula idade considerando aniversário ainda não feito', () => {
      expect(v.calcularIdade(new Date('1990-06-01'), ref)).toBe(35);
    });
  });
});
