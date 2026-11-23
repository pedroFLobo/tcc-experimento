# lote-064

Modelo: deepseek

Avalie com a skill `juiz-casos-teste` **somente os 35 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| deepseek-1068 | CT-UNI-331 | usa GET como método padrão | passou |  |
| deepseek-1069 | CT-UNI-332 | compõe a URL a partir do caminho do recurso | passou |  |
| deepseek-1070 | CT-UNI-333 | não envia Authorization sem token | passou |  |
| deepseek-1071 | CT-UNI-334 | anexa o token salvo no cabeçalho Authorization | passou |  |
| deepseek-1072 | CT-UNI-335 | omite Content-Type e body em requisição sem corpo | passou |  |
| deepseek-1073 | CT-UNI-336 | serializa o corpo em JSON | passou |  |
| deepseek-1074 | CT-UNI-337 | repassa o método POST | passou |  |
| deepseek-1075 | CT-UNI-338 | repassa o método PUT | passou |  |
| deepseek-1076 | CT-UNI-339 | repassa o método PATCH | passou |  |
| deepseek-1077 | CT-UNI-340 | repassa o método DELETE | passou |  |
| deepseek-1078 | CT-UNI-341 | adiciona filtros como parâmetros de consulta | passou |  |
| deepseek-1079 | CT-UNI-342 | omite parâmetros com string vazia | passou |  |
| deepseek-1080 | CT-UNI-343 | omite parâmetros nulos | passou |  |
| deepseek-1081 | CT-UNI-344 | omite parâmetros indefinidos | passou |  |
| deepseek-1082 | CT-UNI-345 | preserva o valor numérico zero | passou |  |
| deepseek-1083 | CT-UNI-346 | preserva o valor booleano falso | passou |  |
| deepseek-1084 | CT-UNI-347 | codifica busca com espaços e acentos | passou |  |
| deepseek-1085 | CT-UNI-348 | não acrescenta query sem parâmetros | passou |  |
| deepseek-1086 | CT-UNI-349 | devolve null para resposta 204 | passou |  |
| deepseek-1087 | CT-UNI-350 | devolve o JSON da resposta | passou |  |
| deepseek-1088 | CT-UNI-351 | devolve null para corpo 200 inválido | passou |  |
| deepseek-1089 | CT-UNI-352 | dispara a expiração de sessão em 401 com token | passou |  |
| deepseek-1090 | CT-UNI-353 | não dispara expiração em 401 sem token | passou |  |
| deepseek-1091 | CT-UNI-354 | propaga status, código e mensagem do erro | passou |  |
| deepseek-1092 | CT-UNI-355 | usa código DESCONHECIDO sem detalhes do erro | passou |  |
| deepseek-1093 | CT-UNI-356 | usa mensagem padrão em português sem detalhes | passou |  |
| deepseek-1094 | CT-UNI-357 | converte falha de rede em ApiError REDE | passou |  |
| deepseek-1095 | CT-UNI-358 | explica a falha de conexão | passou |  |
| deepseek-1096 | CT-UNI-359 | ApiError é uma instância de Error | passou |  |
| deepseek-1097 | CT-UNI-360 | salva e recupera o token | passou |  |
| deepseek-1098 | CT-UNI-361 | remove o token | passou |  |
| deepseek-1099 | CT-UNI-362 | usa a chave combinada clinica.token | passou |  |
| deepseek-1100 | CT-UNI-363 | devolve null quando não há token gravado | passou |  |
| deepseek-1101 | CT-UNI-364 | substitui o callback de expiração anterior | passou |  |
| deepseek-1102 | CT-UNI-365 | serializa corpo null como JSON | passou |  |

## Arquivo: frontend/__testes__/unitario/cliente-http.test.js

```js
// Cliente HTTP do frontend: montagem da requisição, tratamento de erros e sessão (RF09, RNF01, RNF04).
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  request,
  ApiError,
  tokenStorage,
  registrarExpiracaoSessao,
} from '../../src/api/client';

const resposta = (status, corpo, { jsonInvalido = false } = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => {
    if (jsonInvalido) throw new Error('JSON inválido');
    return corpo;
  },
});

function ultimaChamada() {
  const [url, opcoes] = globalThis.fetch.mock.calls.at(-1);
  return { url: String(url), opcoes };
}

describe('request — montagem da requisição', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(200, { ok: true })));
    localStorage.clear();
    registrarExpiracaoSessao(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  /**
   * @caso CT-UNI-331
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Enviar GET por padrão quando o método não é informado
   * @resultadoEsperado fetch recebe method "GET"
   */
  test('usa GET como método padrão', async () => {
    await request('/consultas');
    expect(ultimaChamada().opcoes.method).toBe('GET');
  });

  /**
   * @caso CT-UNI-332
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Compor a URL da API com o caminho do recurso
   * @resultadoEsperado A URL termina com /api/consultas
   */
  test('compõe a URL a partir do caminho do recurso', async () => {
    await request('/consultas');
    expect(ultimaChamada().url.endsWith('/api/consultas')).toBe(true);
  });

  /**
   * @caso CT-UNI-333
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN30, RNF01
   * @objetivo Não enviar cabeçalho de autorização quando não há sessão
   * @resultadoEsperado headers não contém Authorization
   */
  test('não envia Authorization sem token', async () => {
    await request('/especialidades');
    expect(ultimaChamada().opcoes.headers.Authorization).toBeUndefined();
  });

  /**
   * @caso CT-UNI-334
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN30, RNF01
   * @objetivo Anexar o JWT salvo como Bearer
   * @resultadoEsperado headers.Authorization é "Bearer <token>"
   */
  test('anexa o token salvo no cabeçalho Authorization', async () => {
    tokenStorage.salvar('jwt-abc');
    await request('/auth/me');
    expect(ultimaChamada().opcoes.headers.Authorization).toBe('Bearer jwt-abc');
  });

  /**
   * @caso CT-UNI-335
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Não declarar corpo JSON em requisições sem carga
   * @resultadoEsperado Sem corpo, não há Content-Type e body é undefined
   */
  test('omite Content-Type e body em requisição sem corpo', async () => {
    await request('/consultas');
    const { opcoes } = ultimaChamada();
    expect(opcoes.headers['Content-Type']).toBeUndefined();
    expect(opcoes.body).toBeUndefined();
  });

  /**
   * @caso CT-UNI-336
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Serializar o corpo como JSON declarando o tipo
   * @resultadoEsperado Content-Type application/json e body serializado
   */
  test('serializa o corpo em JSON', async () => {
    await request('/auth/login', { metodo: 'POST', corpo: { email: 'ana@email.com', senha: 'Senha123' } });
    const { opcoes } = ultimaChamada();
    expect(opcoes.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opcoes.body)).toEqual({ email: 'ana@email.com', senha: 'Senha123' });
  });

  /**
   * @caso CT-UNI-337
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF08.1, RNF08
   * @objetivo Repassar POST para criação de consultas
   * @resultadoEsperado fetch recebe method "POST"
   */
  test('repassa o método POST', async () => {
    await request('/consultas', { metodo: 'POST', corpo: {} });
    expect(ultimaChamada().opcoes.method).toBe('POST');
  });

  /**
   * @caso CT-UNI-338
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF05.2, RNF08
   * @objetivo Repassar PUT para substituir a grade semanal
   * @resultadoEsperado fetch recebe method "PUT"
   */
  test('repassa o método PUT', async () => {
    await request('/medicos/1/disponibilidades', { metodo: 'PUT', corpo: { blocos: [] } });
    expect(ultimaChamada().opcoes.method).toBe('PUT');
  });

  /**
   * @caso CT-UNI-339
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RN21
   * @objetivo Repassar PATCH para ativar ou desativar usuários
   * @resultadoEsperado fetch recebe method "PATCH"
   */
  test('repassa o método PATCH', async () => {
    await request('/admin/usuarios/7/ativo', { metodo: 'PATCH', corpo: { ativo: false } });
    expect(ultimaChamada().opcoes.method).toBe('PATCH');
  });

  /**
   * @caso CT-UNI-340
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF06.2, RNF08
   * @objetivo Repassar DELETE para remover um bloqueio de agenda
   * @resultadoEsperado fetch recebe method "DELETE"
   */
  test('repassa o método DELETE', async () => {
    await request('/medicos/1/bloqueios/9', { metodo: 'DELETE' });
    expect(ultimaChamada().opcoes.method).toBe('DELETE');
  });
});

describe('request — query string', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(200, [])));
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  /**
   * @caso CT-UNI-341
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Enviar filtros de listagem como parâmetros de consulta
   * @resultadoEsperado A URL contém dataInicio e status
   */
  test('adiciona filtros como parâmetros de consulta', async () => {
    await request('/consultas', { params: { dataInicio: '2026-10-19', status: 'AGENDADA' } });
    const url = new URL(ultimaChamada().url);
    expect(url.searchParams.get('dataInicio')).toBe('2026-10-19');
    expect(url.searchParams.get('status')).toBe('AGENDADA');
  });

  /**
   * @caso CT-UNI-342
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RF10.3
   * @objetivo Não enviar filtros em branco como se fossem valores
   * @resultadoEsperado Parâmetro com string vazia é omitido
   */
  test('omite parâmetros com string vazia', async () => {
    await request('/consultas', { params: { status: '' } });
    expect(new URL(ultimaChamada().url).searchParams.has('status')).toBe(false);
  });

  /**
   * @caso CT-UNI-343
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF10.3, RNF04
   * @objetivo Ignorar filtros nulos
   * @resultadoEsperado Parâmetro null é omitido
   */
  test('omite parâmetros nulos', async () => {
    await request('/consultas', { params: { medicoId: null } });
    expect(new URL(ultimaChamada().url).searchParams.has('medicoId')).toBe(false);
  });

  /**
   * @caso CT-UNI-344
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RF10.3, RNF04
   * @objetivo Ignorar filtros não definidos
   * @resultadoEsperado Parâmetro undefined é omitido
   */
  test('omite parâmetros indefinidos', async () => {
    await request('/medicos', { params: { especialidadeId: undefined } });
    expect(new URL(ultimaChamada().url).searchParams.has('especialidadeId')).toBe(false);
  });

  /**
   * @caso CT-UNI-345
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Preservar o id zero como filtro válido
   * @resultadoEsperado Parâmetro 0 é enviado
   */
  test('preserva o valor numérico zero', async () => {
    await request('/consultas', { params: { medicoId: 0 } });
    expect(new URL(ultimaChamada().url).searchParams.get('medicoId')).toBe('0');
  });

  /**
   * @caso CT-UNI-346
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Preservar filtros booleanos falsos
   * @resultadoEsperado Parâmetro false é enviado como "false"
   */
  test('preserva o valor booleano falso', async () => {
    await request('/admin/usuarios', { params: { ativo: false } });
    expect(new URL(ultimaChamada().url).searchParams.get('ativo')).toBe('false');
  });

  /**
   * @caso CT-UNI-347
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF10.3
   * @objetivo Codificar busca com espaços e acentos
   * @resultadoEsperado O servidor recebe o texto original após decodificar
   */
  test('codifica busca com espaços e acentos', async () => {
    await request('/pacientes', { params: { busca: 'João Santos' } });
    expect(new URL(ultimaChamada().url).searchParams.get('busca')).toBe('João Santos');
  });

  /**
   * @caso CT-UNI-348
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF10.3
   * @objetivo Não acrescentar "?" quando não há filtros
   * @resultadoEsperado A URL não contém query string
   */
  test('não acrescenta query sem parâmetros', async () => {
    await request('/especialidades');
    expect(new URL(ultimaChamada().url).search).toBe('');
  });
});

describe('request — respostas', () => {
  beforeEach(() => {
    localStorage.clear();
    registrarExpiracaoSessao(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  /**
   * @caso CT-UNI-349
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.2, RNF08
   * @objetivo Tratar remoções bem-sucedidas sem conteúdo
   * @resultadoEsperado status 204 devolve null
   */
  test('devolve null para resposta 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(204, null)));
    await expect(request('/medicos/1/bloqueios/2', { metodo: 'DELETE' })).resolves.toBeNull();
  });

  /**
   * @caso CT-UNI-350
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Entregar o JSON decodificado à camada de páginas
   * @resultadoEsperado O objeto retornado é igual ao corpo da resposta
   */
  test('devolve o JSON da resposta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(200, { id: 1, nome: 'Clínica Geral' })));
    await expect(request('/especialidades')).resolves.toEqual({ id: 1, nome: 'Clínica Geral' });
  });

  /**
   * @caso CT-UNI-351
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Não quebrar quando o servidor responde 200 sem JSON válido
   * @resultadoEsperado A função devolve null em vez de lançar erro
   */
  test('devolve null para corpo 200 inválido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(200, null, { jsonInvalido: true })));
    await expect(request('/saude')).resolves.toBeNull();
  });

  /**
   * @caso CT-UNI-352
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF01, RN30
   * @objetivo Encerrar a sessão quando o token salvo é recusado
   * @resultadoEsperado O callback de expiração é chamado no 401 autenticado
   */
  test('dispara a expiração de sessão em 401 com token', async () => {
    const expirou = vi.fn();
    registrarExpiracaoSessao(expirou);
    tokenStorage.salvar('jwt-expirado');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(401, { erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Sessão expirada.' } })));
    await expect(request('/auth/me')).rejects.toBeInstanceOf(ApiError);
    expect(expirou).toHaveBeenCalledTimes(1);
  });

  /**
   * @caso CT-UNI-353
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF01
   * @objetivo Não encerrar sessão inexistente em 401 de login
   * @resultadoEsperado Sem token, o callback de expiração não é chamado
   */
  test('não dispara expiração em 401 sem token', async () => {
    const expirou = vi.fn();
    registrarExpiracaoSessao(expirou);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(401, { erro: { codigo: 'CREDENCIAIS_INVALIDAS', mensagem: 'E-mail ou senha inválidos.' } })));
    await expect(request('/auth/login', { metodo: 'POST', corpo: {} })).rejects.toBeInstanceOf(ApiError);
    expect(expirou).not.toHaveBeenCalled();
  });

  /**
   * @caso CT-UNI-354
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF08
   * @objetivo Expor código e status do erro para a interface
   * @resultadoEsperado ApiError carrega status, codigo e mensagem do corpo
   */
  test('propaga status, código e mensagem do erro', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(409, { erro: { codigo: 'HORARIO_INDISPONIVEL', mensagem: 'Horário já ocupado.' } })));
    const erro = await request('/consultas', { metodo: 'POST', corpo: {} }).catch((e) => e);
    expect(erro.status).toBe(409);
    expect(erro.codigo).toBe('HORARIO_INDISPONIVEL');
    expect(erro.message).toBe('Horário já ocupado.');
  });

  /**
   * @caso CT-UNI-355
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Usar código genérico quando o corpo de erro não traz código
   * @resultadoEsperado ApiError.codigo é "DESCONHECIDO"
   */
  test('usa código DESCONHECIDO sem detalhes do erro', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(500, {})));
    const erro = await request('/saude').catch((e) => e);
    expect(erro.codigo).toBe('DESCONHECIDO');
  });

  /**
   * @caso CT-UNI-356
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Exibir mensagem em português mesmo sem detalhes do servidor
   * @resultadoEsperado A mensagem padrão é "Erro inesperado."
   */
  test('usa mensagem padrão em português sem detalhes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(500, {})));
    const erro = await request('/saude').catch((e) => e);
    expect(erro.message).toBe('Erro inesperado.');
  });

  /**
   * @caso CT-UNI-357
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo disponibilidade
   * @requisito RNF04
   * @objetivo Tratar queda de rede como erro de aplicação
   * @resultadoEsperado ApiError com status 0 e código REDE
   */
  test('converte falha de rede em ApiError REDE', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const erro = await request('/saude').catch((e) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.status).toBe(0);
    expect(erro.codigo).toBe('REDE');
  });

  /**
   * @caso CT-UNI-358
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Explicar a falha de conexão em português
   * @resultadoEsperado A mensagem orienta que não foi possível conectar
   */
  test('explica a falha de conexão', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const erro = await request('/saude').catch((e) => e);
    expect(erro.message).toBe('Não foi possível conectar ao servidor.');
  });

  /**
   * @caso CT-UNI-359
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF04
   * @objetivo Manter ApiError compatível com catch de Error
   * @resultadoEsperado A instância é um Error com nome preservado
   */
  test('ApiError é uma instância de Error', () => {
    const erro = new ApiError(400, 'DADOS_INVALIDOS', 'Dados inválidos.');
    expect(erro).toBeInstanceOf(Error);
    expect(erro.message).toBe('Dados inválidos.');
  });
});

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  /**
   * @caso CT-UNI-360
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RNF01
   * @objetivo Persistir o token para sobreviver ao recarregamento da página
   * @resultadoEsperado Após salvar, obter devolve o mesmo token
   */
  test('salva e recupera o token', () => {
    tokenStorage.salvar('jwt-123');
    expect(tokenStorage.obter()).toBe('jwt-123');
  });

  /**
   * @caso CT-UNI-361
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RN30
   * @objetivo Remover o token ao sair do sistema
   * @resultadoEsperado Após remover, obter devolve null
   */
  test('remove o token', () => {
    tokenStorage.salvar('jwt-123');
    tokenStorage.remover();
    expect(tokenStorage.obter()).toBeNull();
  });

  /**
   * @caso CT-UNI-362
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Gravar o token na chave combinada com o restante da aplicação
   * @resultadoEsperado localStorage contém a chave "clinica.token"
   */
  test('usa a chave combinada clinica.token', () => {
    tokenStorage.salvar('jwt-123');
    expect(localStorage.getItem('clinica.token')).toBe('jwt-123');
  });

  /**
   * @caso CT-UNI-363
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Iniciar sem sessão quando não há token gravado
   * @resultadoEsperado obter devolve null
   */
  test('devolve null quando não há token gravado', () => {
    expect(tokenStorage.obter()).toBeNull();
  });

  /**
   * @caso CT-UNI-364
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo modificabilidade
   * @requisito RNF01
   * @objetivo Permitir trocar o tratador de sessão expirada
   * @resultadoEsperado Apenas o último callback registrado é chamado
   */
  test('substitui o callback de expiração anterior', async () => {
    const antigo = vi.fn();
    const novo = vi.fn();
    registrarExpiracaoSessao(antigo);
    registrarExpiracaoSessao(novo);
    tokenStorage.salvar('jwt-expirado');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(401, { erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Sessão expirada.' } })));
    await request('/auth/me').catch(() => {});
    expect(antigo).not.toHaveBeenCalled();
    expect(novo).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  /**
   * @caso CT-UNI-365
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Serializar corpo nulo sem tratar como ausente
   * @resultadoEsperado O corpo enviado é a string "null" com Content-Type JSON
   */
  test('serializa corpo null como JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(200, {})));
    await request('/consultas/1/realizar', { metodo: 'POST', corpo: null });
    const { opcoes } = ultimaChamada();
    expect(opcoes.body).toBe('null');
    expect(opcoes.headers['Content-Type']).toBe('application/json');
    vi.unstubAllGlobals();
  });
});
```
