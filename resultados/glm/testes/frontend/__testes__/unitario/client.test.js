// @vitest-environment jsdom
// Testes unitários do cliente HTTP do frontend (RF01.2, RNF02, RNF04, RNF08).
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { request, ApiError, tokenStorage, registrarExpiracaoSessao } from '../../src/api/client.js';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const respostaOk = (dados) => ({ ok: true, status: 200, json: async () => dados });

describe('tokenStorage (RF01.2)', () => {
  /**
   * @caso CT-UNI-132
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.2
   * @objetivo Persistir e recuperar o token na chave 'clinica.token'
   * @resultadoEsperado salvar grava a chave, obter devolve o valor e remover apaga o token
   */
  test('salva, lê e remove o token', () => {
    tokenStorage.salvar('token-abc');
    expect(localStorage.getItem('clinica.token')).toBe('token-abc');
    expect(tokenStorage.obter()).toBe('token-abc');
    tokenStorage.remover();
    expect(tokenStorage.obter()).toBeNull();
  });
});

describe('request — requisição (RF01.2, RNF08)', () => {
  /**
   * @caso CT-UNI-133
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2
   * @objetivo Incluir o cabeçalho Authorization Bearer quando há token armazenado
   * @resultadoEsperado fetch recebe Authorization 'Bearer token-abc'
   */
  test('envia Bearer token quando autenticado', async () => {
    tokenStorage.salvar('token-abc');
    fetchMock.mockResolvedValue(respostaOk({}));
    await request('/consultas');
    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/consultas');
    expect(opcoes.headers.Authorization).toBe('Bearer token-abc');
  });

  /**
   * @caso CT-UNI-134
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2
   * @objetivo Omitir Authorization quando não há token
   * @resultadoEsperado headers não contém Authorization
   */
  test('não envia Authorization sem token', async () => {
    fetchMock.mockResolvedValue(respostaOk({}));
    await request('/especialidades');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  /**
   * @caso CT-UNI-135
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Serializar o corpo como JSON com o Content-Type correto
   * @resultadoEsperado fetch recebe body em JSON e 'Content-Type: application/json'
   */
  test('serializa o corpo em JSON', async () => {
    fetchMock.mockResolvedValue(respostaOk({}));
    await request('/consultas', { metodo: 'POST', corpo: { medicoId: 1 } });
    const opcoes = fetchMock.mock.calls[0][1];
    expect(opcoes.method).toBe('POST');
    expect(opcoes.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opcoes.body)).toEqual({ medicoId: 1 });
  });

  /**
   * @caso CT-UNI-136
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo pertinencia
   * @requisito RF10.3
   * @objetivo Converter o objeto params em query string ignorando valores vazios
   * @resultadoEsperado URL recebe status e dataFim, mas ignora filtro nulo e vazio
   */
  test('monta query string ignorando vazios', async () => {
    fetchMock.mockResolvedValue(respostaOk([]));
    await request('/consultas', { params: { status: 'AGENDADA', dataInicio: '', dataFim: null, medicoId: undefined, pacienteId: 2 } });
    const url = fetchMock.mock.calls[0][0];
    expect(url.searchParams.get('status')).toBe('AGENDADA');
    expect(url.searchParams.get('pacienteId')).toBe('2');
    expect(url.searchParams.get('dataInicio')).toBeNull();
    expect(url.searchParams.get('dataFim')).toBeNull();
  });

  /**
   * @caso CT-UNI-137
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08, RF06.2
   * @objetivo Tratar resposta 204 sem corpo como sucesso nulo
   * @resultadoEsperado request devolve null para o DELETE de bloqueio
   */
  test('resposta 204 devolve null', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    const dados = await request('/medicos/1/bloqueios/5', { metodo: 'DELETE' });
    expect(dados).toBeNull();
  });

  /**
   * @caso CT-UNI-138
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Usar a URL base da API configurada por padrão
   * @resultadoEsperado fetch é chamado com http://localhost:3000/api/... 
   */
  test('usa a URL base padrão da API', async () => {
    fetchMock.mockResolvedValue(respostaOk({}));
    await request('/consultas');
    expect(String(fetchMock.mock.calls[0][0])).toBe('http://localhost:3000/api/consultas');
  });
});

describe('request — respostas de erro (RNF04, RNF02)', () => {
  /**
   * @caso CT-UNI-139
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Converter respostas de erro no ApiError com status, codigo e mensagem
   * @resultadoEsperado 422 vira ApiError com codigo 'REGRA_NEGOCIO' e a mensagem do servidor
   */
  test('mapeia erro da API em ApiError', async () => {
    fetchMock.mockResolvedValue({
      ok: false, status: 422,
      json: async () => ({ erro: { codigo: 'REGRA_NEGOCIO', mensagem: 'Limite de consultas atingido.' } }),
    });
    const erro = await request('/consultas', { metodo: 'POST', corpo: {} }).catch((e) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.status).toBe(422);
    expect(erro.codigo).toBe('REGRA_NEGOCIO');
    expect(erro.message).toBe('Limite de consultas atingido.');
  });

  /**
   * @caso CT-UNI-140
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Tratar corpo de erro ilegível com valores padrão
   * @resultadoEsperado ApiError com codigo 'DESCONHECIDO' e mensagem 'Erro inesperado.'
   */
  test('corpo ilegível vira erro desconhecido', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('sem json'); } });
    const erro = await request('/consultas').catch((e) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.codigo).toBe('DESCONHECIDO');
    expect(erro.message).toBe('Erro inesperado.');
  });

  /**
   * @caso CT-UNI-141
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Sinalizar falha de rede com mensagem amigável
   * @resultadoEsperado fetch rejeitado vira ApiError status 0 codigo 'REDE'
   */
  test('falha de rede vira ApiError REDE', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const erro = await request('/consultas').catch((e) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.status).toBe(0);
    expect(erro.codigo).toBe('REDE');
    expect(erro.message).toBe('Não foi possível conectar ao servidor.');
  });

  /**
   * @caso CT-UNI-142
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Notificar o callback de sessão expirada em 401 com token presente
   * @resultadoEsperado registrarExpiracaoSessao é acionado exatamente uma vez
   */
  test('401 com token dispara expiração de sessão', async () => {
    tokenStorage.salvar('token-abc');
    const aoExpirar = vi.fn();
    registrarExpiracaoSessao(aoExpirar);
    fetchMock.mockResolvedValue({
      ok: false, status: 401,
      json: async () => ({ erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Token inválido ou expirado.' } }),
    });
    await request('/auth/me').catch(() => {});
    expect(aoExpirar).toHaveBeenCalledTimes(1);
  });

  /**
   * @caso CT-UNI-143
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF02
   * @objetivo Não acionar expiração de sessão em 401 de login (sem token)
   * @resultadoEsperado callback de expiração não é chamado quando não há token
   */
  test('401 sem token não dispara expiração', async () => {
    const aoExpirar = vi.fn();
    registrarExpiracaoSessao(aoExpirar);
    fetchMock.mockResolvedValue({
      ok: false, status: 401,
      json: async () => ({ erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'E-mail ou senha inválidos.' } }),
    });
    await request('/auth/login', { metodo: 'POST', corpo: { email: 'a@a.com', senha: 'x' } }).catch(() => {});
    expect(aoExpirar).not.toHaveBeenCalled();
  });
});
