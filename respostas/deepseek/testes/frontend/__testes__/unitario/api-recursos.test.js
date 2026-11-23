// Camada de recursos da API: cada função deve chamar o cliente com verbo, caminho e corpo corretos (RF09, RNF08).
import { describe, test, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/api/client', () => ({ request: vi.fn() }));

import { request } from '../../src/api/client';
import {
  authApi,
  especialidadesApi,
  medicosApi,
  pacientesApi,
  consultasApi,
  adminApi,
} from '../../src/api';

beforeEach(() => {
  request.mockReset();
  request.mockResolvedValue(undefined);
});

describe('authApi', () => {
  /**
   * @caso CT-UNI-366
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RF01.1
   * @objetivo Enviar o login para o endpoint público de autenticação
   * @resultadoEsperado request é chamado em /auth/login com POST
   */
  test('login usa POST /auth/login', async () => {
    await authApi.login('ana@email.com', 'Senha123');
    expect(request).toHaveBeenCalledWith('/auth/login', { metodo: 'POST', corpo: { email: 'ana@email.com', senha: 'Senha123' } });
  });

  /**
   * @caso CT-UNI-367
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.1
   * @objetivo Enviar exatamente as credenciais digitadas, sem transformação
   * @resultadoEsperado O corpo preserva e-mail e senha originais
   */
  test('login preserva as credenciais digitadas', async () => {
    await authApi.login('  Ana@Email.com ', 'Senha 123');
    const [, opcoes] = request.mock.calls[0];
    expect(opcoes.corpo).toEqual({ email: '  Ana@Email.com ', senha: 'Senha 123' });
  });

  /**
   * @caso CT-UNI-368
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF01.1
   * @objetivo Devolver ao AuthContext o token e o usuário retornados pela API
   * @resultadoEsperado O valor resolvido é o mesmo objeto de request
   */
  test('login devolve a resposta do cliente', async () => {
    const resposta = { token: 'jwt', usuario: { id: 1, perfil: 'PACIENTE' } };
    request.mockResolvedValue(resposta);
    await expect(authApi.login('ana@email.com', 'Senha123')).resolves.toBe(resposta);
  });

  /**
   * @caso CT-UNI-369
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.1
   * @objetivo Enviar o auto-cadastro ao endpoint de registro
   * @resultadoEsperado request recebe /auth/registro com o objeto de cadastro
   */
  test('registrar usa POST /auth/registro', async () => {
    const dados = { nome: 'Ana Pereira', email: 'ana@email.com', senha: 'Senha123', cpf: '52998224725', dataNascimento: '1990-05-14' };
    await authApi.registrar(dados);
    expect(request).toHaveBeenCalledWith('/auth/registro', { metodo: 'POST', corpo: dados });
  });

  /**
   * @caso CT-UNI-370
   * @nivel unitario
   * @atributo seguranca
   * @subatributo autenticidade
   * @requisito RF01.3
   * @objetivo Recuperar o usuário da sessão atual
   * @resultadoEsperado request é chamado em /auth/me sem opções
   */
  test('me consulta GET /auth/me', async () => {
    await authApi.me();
    expect(request).toHaveBeenCalledWith('/auth/me');
  });
});

describe('especialidadesApi', () => {
  /**
   * @caso CT-UNI-371
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF03.2
   * @objetivo Listar especialidades para o agendamento
   * @resultadoEsperado request é chamado em /especialidades sem opções
   */
  test('listar consulta GET /especialidades', async () => {
    await especialidadesApi.listar();
    expect(request).toHaveBeenCalledWith('/especialidades');
  });

  /**
   * @caso CT-UNI-372
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF03.1, RN09
   * @objetivo Cadastrar especialidade com preço base em centavos
   * @resultadoEsperado request recebe POST /especialidades com o corpo informado
   */
  test('criar usa POST /especialidades', async () => {
    await especialidadesApi.criar({ nome: 'Ortopedia', precoCentavos: 25000 });
    expect(request).toHaveBeenCalledWith('/especialidades', { metodo: 'POST', corpo: { nome: 'Ortopedia', precoCentavos: 25000 } });
  });
});

describe('medicosApi', () => {
  /**
   * @caso CT-UNI-373
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF04.1
   * @objetivo Listar todos os médicos quando não há filtro
   * @resultadoEsperado request recebe params com especialidadeId indefinido
   */
  test('listar sem filtro envia params vazios', async () => {
    await medicosApi.listar();
    expect(request).toHaveBeenCalledWith('/medicos', { params: { especialidadeId: undefined } });
  });

  /**
   * @caso CT-UNI-374
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF04.1
   * @objetivo Filtrar médicos pela especialidade escolhida
   * @resultadoEsperado request recebe especialidadeId 2
   */
  test('listar por especialidade envia o filtro', async () => {
    await medicosApi.listar(2);
    expect(request).toHaveBeenCalledWith('/medicos', { params: { especialidadeId: 2 } });
  });

  /**
   * @caso CT-UNI-375
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF04.1, RN07
   * @objetivo Cadastrar médico com CRM, especialidade e duração
   * @resultadoEsperado request recebe POST /medicos com o corpo completo
   */
  test('criar usa POST /medicos', async () => {
    const dados = { nome: 'Dr. Novo', email: 'novo@clinica.com', senha: 'Senha123', crm: '123456/SP', especialidadeId: 1, duracaoConsultaMin: 30 };
    await medicosApi.criar(dados);
    expect(request).toHaveBeenCalledWith('/medicos', { metodo: 'POST', corpo: dados });
  });

  /**
   * @caso CT-UNI-376
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1
   * @objetivo Consultar horários livres do médico em uma data
   * @resultadoEsperado request chama /medicos/1/horarios com o parâmetro data
   */
  test('horarios monta o caminho com o médico e a data', async () => {
    await medicosApi.horarios(1, '2026-10-20');
    expect(request).toHaveBeenCalledWith('/medicos/1/horarios', { params: { data: '2026-10-20' } });
  });

  /**
   * @caso CT-UNI-377
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.1
   * @objetivo Ler a grade semanal do médico
   * @resultadoEsperado request chama GET /medicos/1/disponibilidades
   */
  test('grade consulta as disponibilidades do médico', async () => {
    await medicosApi.grade(1);
    expect(request).toHaveBeenCalledWith('/medicos/1/disponibilidades');
  });

  /**
   * @caso CT-UNI-378
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF05.2, RN10
   * @objetivo Substituir a grade inteira em uma única chamada
   * @resultadoEsperado request recebe PUT com o array dentro de blocos
   */
  test('salvarGrade envia PUT com os blocos', async () => {
    const blocos = [{ diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' }];
    await medicosApi.salvarGrade(1, blocos);
    expect(request).toHaveBeenCalledWith('/medicos/1/disponibilidades', { metodo: 'PUT', corpo: { blocos } });
  });

  /**
   * @caso CT-UNI-379
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.1
   * @objetivo Listar os bloqueios de agenda do médico
   * @resultadoEsperado request chama GET /medicos/4/bloqueios
   */
  test('bloqueios consulta o caminho do médico', async () => {
    await medicosApi.bloqueios(4);
    expect(request).toHaveBeenCalledWith('/medicos/4/bloqueios');
  });

  /**
   * @caso CT-UNI-380
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.1, RN12
   * @objetivo Criar bloqueio com período e motivo
   * @resultadoEsperado request recebe POST com dataInicio, dataFim e motivo
   */
  test('criarBloqueio usa POST com o período', async () => {
    const dados = { dataInicio: '2026-11-02', dataFim: '2026-11-06', motivo: 'Congresso' };
    await medicosApi.criarBloqueio(2, dados);
    expect(request).toHaveBeenCalledWith('/medicos/2/bloqueios', { metodo: 'POST', corpo: dados });
  });

  /**
   * @caso CT-UNI-381
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.2
   * @objetivo Remover um bloqueio pelo identificador
   * @resultadoEsperado request chama DELETE /medicos/2/bloqueios/17
   */
  test('removerBloqueio usa DELETE com o id do bloqueio', async () => {
    await medicosApi.removerBloqueio(2, 17);
    expect(request).toHaveBeenCalledWith('/medicos/2/bloqueios/17', { metodo: 'DELETE' });
  });

  /**
   * @caso CT-UNI-382
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF06.2
   * @objetivo Repassar o resultado de uma remoção bem-sucedida
   * @resultadoEsperado A função resolve com o retorno do cliente
   */
  test('removerBloqueio devolve o retorno do cliente', async () => {
    request.mockResolvedValue(null);
    await expect(medicosApi.removerBloqueio(2, 17)).resolves.toBeNull();
  });
});

describe('pacientesApi', () => {
  /**
   * @caso CT-UNI-383
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.2
   * @objetivo Buscar pacientes por nome, e-mail ou CPF
   * @resultadoEsperado request envia o termo no parâmetro busca
   */
  test('listar envia o termo de busca', async () => {
    await pacientesApi.listar('Ana');
    expect(request).toHaveBeenCalledWith('/pacientes', { params: { busca: 'Ana' } });
  });

  /**
   * @caso CT-UNI-384
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.2
   * @objetivo Listar todos os pacientes quando a busca está vazia
   * @resultadoEsperado request recebe busca vazia, que o cliente descarta
   */
  test('listar sem busca envia string vazia', async () => {
    await pacientesApi.listar('');
    expect(request).toHaveBeenCalledWith('/pacientes', { params: { busca: '' } });
  });

  /**
   * @caso CT-UNI-385
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF02.2, RN06
   * @objetivo Cadastrar paciente com todos os campos do formulário
   * @resultadoEsperado request recebe POST /pacientes com o corpo informado
   */
  test('criar usa POST /pacientes', async () => {
    const dados = { nome: 'Lucas Oliveira', email: 'lucas@email.com', senha: 'Senha123', cpf: '98765432100', dataNascimento: '2016-03-08', responsavelNome: 'Marta Oliveira' };
    await pacientesApi.criar(dados);
    expect(request).toHaveBeenCalledWith('/pacientes', { metodo: 'POST', corpo: dados });
  });
});

describe('consultasApi', () => {
  /**
   * @caso CT-UNI-386
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Repassar todos os filtros de listagem de consultas
   * @resultadoEsperado request recebe os cinco filtros em params
   */
  test('listar repassa os filtros', async () => {
    const filtros = { dataInicio: '2026-10-01', dataFim: '2026-10-31', status: 'AGENDADA', medicoId: 1, pacienteId: 2 };
    await consultasApi.listar(filtros);
    expect(request).toHaveBeenCalledWith('/consultas', { params: filtros });
  });

  /**
   * @caso CT-UNI-387
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.1, RN16
   * @objetivo Criar consulta com médico e horário escolhidos
   * @resultadoEsperado request recebe POST /consultas com medicoId e inicio
   */
  test('agendar usa POST /consultas', async () => {
    await consultasApi.agendar({ medicoId: 1, inicio: '2026-10-20 10:00' });
    expect(request).toHaveBeenCalledWith('/consultas', { metodo: 'POST', corpo: { medicoId: 1, inicio: '2026-10-20 10:00' } });
  });

  /**
   * @caso CT-UNI-388
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.1, RN25
   * @objetivo Confirmar presença sem enviar corpo
   * @resultadoEsperado request chama POST /consultas/12/confirmar só com o método
   */
  test('confirmar usa POST sem corpo', async () => {
    await consultasApi.confirmar(12);
    expect(request).toHaveBeenCalledWith('/consultas/12/confirmar', { metodo: 'POST' });
  });

  /**
   * @caso CT-UNI-389
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.2, RN26
   * @objetivo Cancelar consulta enviando o motivo obrigatório
   * @resultadoEsperado request recebe corpo com motivo
   */
  test('cancelar envia o motivo', async () => {
    await consultasApi.cancelar(12, 'Imprevisto no trabalho');
    expect(request).toHaveBeenCalledWith('/consultas/12/cancelar', { metodo: 'POST', corpo: { motivo: 'Imprevisto no trabalho' } });
  });

  /**
   * @caso CT-UNI-390
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.3, RN27
   * @objetivo Remarcar consulta para um novo início
   * @resultadoEsperado request recebe corpo com o novo inicio
   */
  test('remarcar envia o novo horário', async () => {
    await consultasApi.remarcar(12, '2026-10-22 09:00');
    expect(request).toHaveBeenCalledWith('/consultas/12/remarcar', { metodo: 'POST', corpo: { inicio: '2026-10-22 09:00' } });
  });

  /**
   * @caso CT-UNI-391
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.4, RN28
   * @objetivo Registrar atendimento com observações opcionais
   * @resultadoEsperado request recebe corpo com observacoes
   */
  test('realizar envia as observações', async () => {
    await consultasApi.realizar(12, 'Paciente estável.');
    expect(request).toHaveBeenCalledWith('/consultas/12/realizar', { metodo: 'POST', corpo: { observacoes: 'Paciente estável.' } });
  });

  /**
   * @caso CT-UNI-392
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF09.5, RN29
   * @objetivo Registrar falta sem enviar corpo
   * @resultadoEsperado request chama POST /consultas/12/falta só com o método
   */
  test('falta usa POST sem corpo', async () => {
    await consultasApi.falta(12);
    expect(request).toHaveBeenCalledWith('/consultas/12/falta', { metodo: 'POST' });
  });
});

describe('adminApi', () => {
  /**
   * @caso CT-UNI-393
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RN21
   * @objetivo Desativar ou reativar usuário pelo id do usuário
   * @resultadoEsperado request usa PATCH com corpo { ativo: false }
   */
  test('definirAtivo usa PATCH com o novo estado', async () => {
    await adminApi.definirAtivo(7, false);
    expect(request).toHaveBeenCalledWith('/admin/usuarios/7/ativo', { metodo: 'PATCH', corpo: { ativo: false } });
  });

  /**
   * @caso CT-UNI-394
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF11.1
   * @objetivo Emitir relatório para o período escolhido
   * @resultadoEsperado request envia dataInicio e dataFim em params
   */
  test('resumo envia o período', async () => {
    await adminApi.resumo('2026-10-01', '2026-10-31');
    expect(request).toHaveBeenCalledWith('/admin/relatorios/resumo', { params: { dataInicio: '2026-10-01', dataFim: '2026-10-31' } });
  });

  /**
   * @caso CT-UNI-395
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Interpolar ids numéricos no caminho sem escapar
   * @resultadoEsperado O caminho contém o id literal escolhido
   */
  test('interpola ids numéricos no caminho', async () => {
    await consultasApi.confirmar(9876);
    expect(request.mock.calls[0][0]).toBe('/consultas/9876/confirmar');
  });

  /**
   * @caso CT-UNI-396
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo reusabilidade
   * @requisito RNF07
   * @objetivo Manter as funções de recurso como meras tradutoras do contrato
   * @resultadoEsperado Nenhuma função monta cabeçalhos por conta própria
   */
  test('nenhuma função monta cabeçalhos manualmente', async () => {
    await authApi.me();
    await especialidadesApi.criar({ nome: 'X', precoCentavos: 100 });
    await consultasApi.falta(1);
    const comHeaders = request.mock.calls.filter(([, opcoes]) => opcoes && 'headers' in opcoes);
    expect(comHeaders).toHaveLength(0);
  });

  /**
   * @caso CT-UNI-397
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF08.2
   * @objetivo Entregar à página a consulta criada, inclusive valor e nomes
   * @resultadoEsperado agendar resolve com o objeto devolvido pelo cliente
   */
  test('agendar devolve a consulta criada', async () => {
    const consulta = { id: 30, medicoNome: 'Dr. Carlos Almeida', valorCentavos: 15000, inicio: '2026-10-20 10:00' };
    request.mockResolvedValue(consulta);
    await expect(consultasApi.agendar({ medicoId: 1, inicio: '2026-10-20 10:00' })).resolves.toBe(consulta);
  });

  /**
   * @caso CT-UNI-398
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Propagar erros do cliente sem engoli-los
   * @resultadoEsperado A rejeição de request chega a quem chamou
   */
  test('propaga a rejeição do cliente', async () => {
    request.mockRejectedValue(new Error('Horário já ocupado.'));
    await expect(consultasApi.agendar({ medicoId: 1, inicio: '2026-10-20 10:00' })).rejects.toThrow('Horário já ocupado.');
  });

  /**
   * @caso CT-UNI-399
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF08
   * @objetivo Manter o contrato de listagem do médico na recepção
   * @resultadoEsperado medicosApi.listar() chama /medicos sem corpo
   */
  test('listar médicos não envia corpo', async () => {
    await medicosApi.listar(3);
    const [, opcoes] = request.mock.calls[0];
    expect(opcoes.metodo).toBeUndefined();
    expect(opcoes.corpo).toBeUndefined();
  });

  /**
   * @caso CT-UNI-400
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo analisabilidade
   * @requisito RNF07
   * @objetivo Garantir a cobertura de todos os recursos exportados
   * @resultadoEsperado Os seis grupos de API expõem apenas funções
   */
  test('todos os grupos exportam funções', () => {
    const grupos = { authApi, especialidadesApi, medicosApi, pacientesApi, consultasApi, adminApi };
    const invalidos = Object.entries(grupos).flatMap(([, grupo]) =>
      Object.values(grupo).filter((valor) => typeof valor !== 'function'),
    );
    expect(invalidos).toHaveLength(0);
  });
});
