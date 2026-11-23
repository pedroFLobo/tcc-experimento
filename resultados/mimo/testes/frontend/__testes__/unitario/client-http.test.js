import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ApiError, registrarExpiracaoSessao, request, tokenStorage } from '../../src/api/client';

function respostaHttp({ status = 200, dados = undefined, jsonInvalido = false } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn(() => (jsonInvalido ? Promise.reject(new Error('JSON inválido')) : Promise.resolve(dados))),
  };
}

describe('api/client', () => {
  let aoExpirar;

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
    aoExpirar = vi.fn();
    registrarExpiracaoSessao(aoExpirar);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  /**
   * @caso CT-UNI-141
   * @nivel unitario
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF02
   * @objetivo Guardar a sessão do usuário na chave oficial do armazenamento local
   * @resultadoEsperado tokenStorage salva, lê e remove o token na chave "clinica.token"
   */
  test('tokenStorage usa a chave clinica.token do navegador', () => {
    tokenStorage.salvar('abc123');
    expect(localStorage.getItem('clinica.token')).toBe('abc123');
    expect(tokenStorage.obter()).toBe('abc123');
    tokenStorage.remover();
    expect(tokenStorage.obter()).toBeNull();
    expect(localStorage.getItem('clinica.token')).toBeNull();
  });

  /**
   * @caso CT-UNI-142
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.2, RNF02
   * @objetivo Enviar o token da sessão no cabeçalho Authorization das requisições
   * @resultadoEsperado Com token salvo, o fetch recebe Authorization: Bearer <token>
   */
  test('request envia Authorization Bearer quando há token salvo', async () => {
    tokenStorage.salvar('tok-1');
    vi.mocked(fetch).mockResolvedValue(respostaHttp({ dados: [] }));

    await request('/consultas');

    const [, opcoes] = fetch.mock.calls[0];
    expect(opcoes.method).toBe('GET');
    expect(opcoes.headers.Authorization).toBe('Bearer tok-1');
  });

  /**
   * @caso CT-UNI-143
   * @nivel unitario
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RF01.2
   * @objetivo Não enviar credencial alguma quando o usuário não tem sessão
   * @resultadoEsperado Sem token, o cabeçalho da requisição não tem Authorization
   */
  test('request não envia Authorization sem token salvo', async () => {
    vi.mocked(fetch).mockResolvedValue(respostaHttp({ dados: [] }));

    await request('/consultas');

    const [, opcoes] = fetch.mock.calls[0];
    expect(opcoes.headers).not.toHaveProperty('Authorization');
  });

  /**
   * @caso CT-UNI-144
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF08.1
   * @objetivo Enviar o corpo do agendamento serializado em JSON com o cabeçalho adequado
   * @resultadoEsperado POST envia Content-Type application/json e o corpo serializado
   */
  test('request serializa o corpo em JSON nos métodos que recebem dados', async () => {
    vi.mocked(fetch).mockResolvedValue(respostaHttp({ status: 201, dados: { id: 9 } }));

    const dados = await request('/consultas', { metodo: 'POST', corpo: { medicoId: 1, inicio: '2026-10-26 08:00' } });

    const [, opcoes] = fetch.mock.calls[0];
    expect(opcoes.headers['Content-Type']).toBe('application/json');
    expect(opcoes.body).toBe('{"medicoId":1,"inicio":"2026-10-26 08:00"}');
    expect(dados).toEqual({ id: 9 });
  });

  /**
   * @caso CT-UNI-145
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF10.3
   * @objetivo Montar a query string da listagem ignorando filtros vazios
   * @resultadoEsperado Parâmetros "", null e undefined não aparecem na URL e os preenchidos aparecem
   */
  test('request ignora parâmetros vazios na query string', async () => {
    vi.mocked(fetch).mockResolvedValue(respostaHttp({ dados: [] }));

    await request('/consultas', { params: { dataInicio: '', status: null, medicoId: undefined, pacienteId: 2 } });

    expect(fetch.mock.calls[0][0].toString()).toBe('http://localhost:3000/api/consultas?pacienteId=2');
  });

  /**
   * @caso CT-UNI-146
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF10.3
   * @objetivo Enviar todos os filtros preenchidos da listagem da recepção
   * @resultadoEsperado A URL inclui dataInicio, dataFim e status na ordem dos parâmetros
   */
  test('request envia os filtros preenchidos como query string', async () => {
    vi.mocked(fetch).mockResolvedValue(respostaHttp({ dados: [] }));

    await request('/consultas', { params: { dataInicio: '2026-10-19', dataFim: '2026-10-31', status: 'AGENDADA' } });

    expect(fetch.mock.calls[0][0].toString()).toBe(
      'http://localhost:3000/api/consultas?dataInicio=2026-10-19&dataFim=2026-10-31&status=AGENDADA',
    );
  });

  /**
   * @caso CT-UNI-147
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Tratar resposta 204 sem corpo sem lançar exceção
   * @resultadoEsperado DELETE com 204 devolve null
   */
  test('request devolve null para resposta 204 sem corpo', async () => {
    vi.mocked(fetch).mockResolvedValue({ status: 204, ok: true, json: vi.fn() });

    const resultado = await request('/medicos/1/bloqueios/2', { metodo: 'DELETE' });

    expect(resultado).toBeNull();
  });

  /**
   * @caso CT-UNI-148
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Converter o erro da API em exceção com status, código e mensagem
   * @resultadoEsperado Erro 422 REGRA_NEGOCIO vira ApiError com os três campos preenchidos
   */
  test('request transforma o contrato de erro da API em ApiError', async () => {
    vi.mocked(fetch).mockResolvedValue(
      respostaHttp({
        status: 422,
        dados: { erro: { codigo: 'REGRA_NEGOCIO', mensagem: 'A consulta já começou.' } },
      }),
    );

    const erro = await request('/consultas/1/cancelar', { metodo: 'POST' }).catch((e) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.status).toBe(422);
    expect(erro.codigo).toBe('REGRA_NEGOCIO');
    expect(erro.message).toBe('A consulta já começou.');
  });

  /**
   * @caso CT-UNI-149
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF01.3
   * @objetivo Devolver o corpo JSON das respostas de sucesso sem alteração
   * @resultadoEsperado O login devolve token e usuário exatamente como a API enviou
   */
  test('request devolve o JSON das respostas de sucesso', async () => {
    vi.mocked(fetch).mockResolvedValue(
      respostaHttp({ dados: { token: 'jwt', usuario: { id: 1, nome: 'Ana Pereira', perfil: 'PACIENTE' } } }),
    );

    const dados = await request('/auth/login', { metodo: 'POST', corpo: { email: 'ana@email.com', senha: 'Senha123' } });

    expect(dados.token).toBe('jwt');
    expect(dados.usuario.perfil).toBe('PACIENTE');
  });

  /**
   * @caso CT-UNI-150
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Enviar mensagem genérica em português quando a API não devolve o contrato de erro
   * @resultadoEsperado Erro sem campo "erro" vira ApiError com código DESCONHECIDO e mensagem padrão
   */
  test('request usa código e mensagem padrão quando a resposta não tem contrato de erro', async () => {
    vi.mocked(fetch).mockResolvedValue(respostaHttp({ status: 500, dados: { qualquer: 1 } }));

    const erro = await request('/relatorios').catch((e) => e);

    expect(erro.codigo).toBe('DESCONHECIDO');
    expect(erro.message).toBe('Erro inesperado.');
  });

  /**
   * @caso CT-UNI-151
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Converter falha de rede em mensagem legível em português
   * @resultadoEsperado Fetch rejeitado vira ApiError com status 0, código REDE e a mensagem de conexão
   */
  test('request vira erro REDE quando o servidor não responde', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));

    const erro = await request('/consultas').catch((e) => e);

    expect(erro.status).toBe(0);
    expect(erro.codigo).toBe('REDE');
    expect(erro.message).toBe('Não foi possível conectar ao servidor.');
  });

  /**
   * @caso CT-UNI-152
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF02
   * @objetivo Encerrar a sessão quando a API responde 401 com token enviado
   * @resultadoEsperado Com token salvo, o 401 dispara o callback de expiração de sessão registrado
   */
  test('request avisa a expiração da sessão em 401 com token', async () => {
    tokenStorage.salvar('expirado');
    vi.mocked(fetch).mockResolvedValue(
      respostaHttp({ status: 401, dados: { erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Token inválido ou expirado.' } } }),
    );

    await request('/auth/me').catch(() => {});

    expect(aoExpirar).toHaveBeenCalledTimes(1);
  });

  /**
   * @caso CT-UNI-153
   * @nivel unitario
   * @atributo seguranca
   * @subatributo confidencialidade
   * @requisito RNF02
   * @objetivo Não tentar encerrar uma sessão inexistente em 401 sem token
   * @resultadoEsperado Sem token salvo, o 401 não dispara o callback de expiração
   */
  test('request não dispara expiração de sessão em 401 sem token', async () => {
    vi.mocked(fetch).mockResolvedValue(
      respostaHttp({ status: 401, dados: { erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Credenciais erradas.' } } }),
    );

    await request('/auth/me').catch(() => {});

    expect(aoExpirar).not.toHaveBeenCalled();
  });

  /**
   * @caso CT-UNI-154
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo recuperabilidade
   * @requisito RNF04
   * @objetivo Não quebrar quando uma resposta de sucesso vem sem JSON válido
   * @resultadoEsperado Corpo não JSON em sucesso devolve null em vez de lançar exceção
   */
  test('request devolve null quando o JSON da resposta de sucesso é inválido', async () => {
    vi.mocked(fetch).mockResolvedValue(respostaHttp({ jsonInvalido: true }));

    const resultado = await request('/relatorios/resumo');

    expect(resultado).toBeNull();
  });
});
