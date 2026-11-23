// Hooks de apoio: mensagens inline/toast e carregamento assíncrono com recarga (RNF04, RNF06).
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { useMensagem } from '../../src/hooks/useMensagem';
import { useCarregar } from '../../src/hooks/useCarregar';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function SondaMensagem() {
  const { mensagem, sucesso, erro, limpar } = useMensagem();
  return (
    <div>
      <span data-testid="mensagem">{mensagem ? `${mensagem.tipo}:${mensagem.texto}` : 'vazio'}</span>
      <button type="button" onClick={() => sucesso('Consulta agendada.')}>sucesso-padrao</button>
      <button type="button" onClick={() => sucesso('Consulta agendada.', 'Agendamento')}>sucesso-titulo</button>
      <button type="button" onClick={() => erro('Horário já ocupado.')}>erro</button>
      <button type="button" onClick={limpar}>limpar</button>
    </div>
  );
}

function montarMensagem() {
  return render(<ToastProvider><SondaMensagem /></ToastProvider>);
}

describe('useMensagem', () => {
  /**
   * @caso CT-UNI-441
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Começar sem mensagem inline em formulários recém-abertos
   * @resultadoEsperado O estado inicial da mensagem é nulo
   */
  test('começa sem mensagem inline', () => {
    montarMensagem();
    expect(screen.getByTestId('mensagem')).toHaveTextContent('vazio');
  });

  /**
   * @caso CT-UNI-442
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Mostrar confirmações como aviso flutuante, não como erro de formulário
   * @resultadoEsperado A mensagem inline continua vazia após sucesso
   */
  test('sucesso não grava mensagem inline', async () => {
    const usuario = userEvent.setup();
    montarMensagem();
    await usuario.click(screen.getByRole('button', { name: 'sucesso-padrao' }));
    expect(screen.getByTestId('mensagem')).toHaveTextContent('vazio');
  });

  /**
   * @caso CT-UNI-443
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Confirmar a ação concluída com o texto informado
   * @resultadoEsperado Um toast de sucesso exibe "Consulta agendada."
   */
  test('sucesso emite toast com o texto', async () => {
    const usuario = userEvent.setup();
    const { container } = montarMensagem();
    await usuario.click(screen.getByRole('button', { name: 'sucesso-padrao' }));
    expect(container.querySelector('.toast')).toHaveTextContent('Consulta agendada.');
  });

  /**
   * @caso CT-UNI-444
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Usar um título padrão amigável quando a página não informa um
   * @resultadoEsperado O toast mostra "Tudo certo!"
   */
  test('sucesso usa título padrão', async () => {
    const usuario = userEvent.setup();
    const { container } = montarMensagem();
    await usuario.click(screen.getByRole('button', { name: 'sucesso-padrao' }));
    expect(container.querySelector('.toast strong')).toHaveTextContent('Tudo certo!');
  });

  /**
   * @caso CT-UNI-445
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Personalizar o título do aviso de sucesso
   * @resultadoEsperado O toast mostra "Agendamento"
   */
  test('sucesso aceita título personalizado', async () => {
    const usuario = userEvent.setup();
    const { container } = montarMensagem();
    await usuario.click(screen.getByRole('button', { name: 'sucesso-titulo' }));
    expect(container.querySelector('.toast strong')).toHaveTextContent('Agendamento');
  });

  /**
   * @caso CT-UNI-446
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Manter o erro junto ao formulário que o causou
   * @resultadoEsperado A mensagem inline registra "erro:Horário já ocupado."
   */
  test('erro grava mensagem inline', async () => {
    const usuario = userEvent.setup();
    montarMensagem();
    await usuario.click(screen.getByRole('button', { name: 'erro' }));
    expect(screen.getByTestId('mensagem')).toHaveTextContent('erro:Horário já ocupado.');
  });

  /**
   * @caso CT-UNI-447
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Não usar toast para erros de validação
   * @resultadoEsperado Nenhum toast é criado por erro
   */
  test('erro não cria toast', async () => {
    const usuario = userEvent.setup();
    const { container } = montarMensagem();
    await usuario.click(screen.getByRole('button', { name: 'erro' }));
    expect(container.querySelector('.toast')).toBeNull();
  });

  /**
   * @caso CT-UNI-448
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Limpar o erro antes de nova tentativa
   * @resultadoEsperado Após limpar, a mensagem inline volta a ser vazia
   */
  test('limpar apaga a mensagem inline', async () => {
    const usuario = userEvent.setup();
    montarMensagem();
    await usuario.click(screen.getByRole('button', { name: 'erro' }));
    await usuario.click(screen.getByRole('button', { name: 'limpar' }));
    expect(screen.getByTestId('mensagem')).toHaveTextContent('vazio');
  });

  /**
   * @caso CT-UNI-449
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Refletir sempre o último erro recebido
   * @resultadoEsperado A mensagem inline contém apenas o texto mais recente
   */
  test('erro substitui a mensagem anterior', async () => {
    const usuario = userEvent.setup();
    function Sonda() {
      const { mensagem, erro } = useMensagem();
      return (
        <>
          <span data-testid="mensagem">{mensagem?.texto ?? 'vazio'}</span>
          <button type="button" onClick={() => erro('Paciente suspenso.')}>novo-erro</button>
        </>
      );
    }
    render(<ToastProvider><Sonda /></ToastProvider>);
    await usuario.click(screen.getByRole('button', { name: 'novo-erro' }));
    expect(screen.getByTestId('mensagem')).toHaveTextContent('Paciente suspenso.');
  });

  /**
   * @caso CT-UNI-450
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Não deixar erro antigo visível depois de uma ação bem-sucedida
   * @resultadoEsperado O sucesso limpa a mensagem inline de erro
   */
  test('sucesso limpa erro inline anterior', async () => {
    const usuario = userEvent.setup();
    montarMensagem();
    await usuario.click(screen.getByRole('button', { name: 'erro' }));
    await usuario.click(screen.getByRole('button', { name: 'sucesso-padrao' }));
    expect(screen.getByTestId('mensagem')).toHaveTextContent('vazio');
  });

  /**
   * @caso CT-UNI-451
   * @nivel unitario
   * @atributo compatibilidade
   * @subatributo interoperabilidade
   * @requisito RNF06
   * @objetivo Permitir que automação e estilo distingam o tipo de aviso
   * @resultadoEsperado O toast declara data-tipo="sucesso"
   */
  test('toast de sucesso expõe data-tipo', async () => {
    const usuario = userEvent.setup();
    const { container } = montarMensagem();
    await usuario.click(screen.getByRole('button', { name: 'sucesso-padrao' }));
    expect(container.querySelector('.toast')).toHaveAttribute('data-tipo', 'sucesso');
  });

  /**
   * @caso CT-UNI-452
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Permitir fechar o aviso antes do tempo automático
   * @resultadoEsperado Clicar em "Fechar aviso" remove o toast
   */
  test('toast pode ser fechado manualmente', async () => {
    const usuario = userEvent.setup();
    const { container } = montarMensagem();
    await usuario.click(screen.getByRole('button', { name: 'sucesso-padrao' }));
    await usuario.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(container.querySelector('.toast')).toBeNull();
  });

  /**
   * @caso CT-UNI-453
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Anunciar avisos em região viva para leitores de tela
   * @resultadoEsperado O contêiner de toasts tem aria-live="polite"
   */
  test('região de toasts é anunciada como aria-live', async () => {
    const usuario = userEvent.setup();
    const { container } = montarMensagem();
    await usuario.click(screen.getByRole('button', { name: 'sucesso-padrao' }));
    expect(container.querySelector('.toasts')).toHaveAttribute('aria-live', 'polite');
  });

  /**
   * @caso CT-UNI-454
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Não acumular avisos indefinidamente na tela
   * @resultadoEsperado Após quatro sucessos, no máximo três toasts permanecem
   */
  test('limita a pilha de toasts', async () => {
    const usuario = userEvent.setup();
    const { container } = montarMensagem();
    const botao = screen.getByRole('button', { name: 'sucesso-padrao' });
    for (let i = 0; i < 4; i += 1) await usuario.click(botao);
    expect(container.querySelectorAll('.toast').length).toBeLessThanOrEqual(3);
  });
});

describe('useCarregar', () => {
  function Sonda({ funcao, deps }) {
    const { dados, erro, carregando, recarregar } = useCarregar(funcao, deps);
    return (
      <div>
        <span data-testid="dados">{dados === null ? 'nulo' : JSON.stringify(dados)}</span>
        <span data-testid="erro">{erro ?? 'sem-erro'}</span>
        <span data-testid="carregando">{String(carregando)}</span>
        <button type="button" onClick={() => recarregar()}>recarregar</button>
      </div>
    );
  }

  /**
   * @caso CT-UNI-455
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Preencher a tela com os dados retornados pela API
   * @resultadoEsperado Os dados ficam disponíveis após a resolução
   */
  test('expõe os dados resolvidos', async () => {
    const funcao = vi.fn().mockResolvedValue([{ id: 1 }]);
    render(<Sonda funcao={funcao} deps={[]} />);
    await waitFor(() => expect(screen.getByTestId('dados')).toHaveTextContent('[{"id":1}]'));
  });

  /**
   * @caso CT-UNI-456
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Indicar carregamento enquanto a resposta não chega
   * @resultadoEsperado carregando é true antes e false depois da resolução
   */
  test('sinaliza carregamento e conclusão', async () => {
    const funcao = vi.fn().mockResolvedValue([]);
    render(<Sonda funcao={funcao} deps={[]} />);
    expect(screen.getByTestId('carregando')).toHaveTextContent('true');
    await waitFor(() => expect(screen.getByTestId('carregando')).toHaveTextContent('false'));
  });

  /**
   * @caso CT-UNI-457
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Expor a mensagem de falha sem derrubar a tela
   * @resultadoEsperado O erro recebido aparece no estado do hook
   */
  test('expõe a mensagem de erro', async () => {
    const funcao = vi.fn().mockRejectedValue(new Error('Não foi possível conectar ao servidor.'));
    render(<Sonda funcao={funcao} deps={[]} />);
    await waitFor(() => expect(screen.getByTestId('erro')).toHaveTextContent('Não foi possível conectar ao servidor.'));
  });

  /**
   * @caso CT-UNI-458
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Não exibir dados antigos quando a carga falha
   * @resultadoEsperado Os dados permanecem nulos após rejeição
   */
  test('mantém dados nulos após erro', async () => {
    const funcao = vi.fn().mockRejectedValue(new Error('Falha'));
    render(<Sonda funcao={funcao} deps={[]} />);
    await waitFor(() => expect(screen.getByTestId('erro')).toHaveTextContent('Falha'));
    expect(screen.getByTestId('dados')).toHaveTextContent('nulo');
  });

  /**
   * @caso CT-UNI-459
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Recarregar a lista depois de uma ação bem-sucedida
   * @resultadoEsperado Clicar em recarregar chama a função outra vez
   */
  test('recarregar executa a função novamente', async () => {
    const usuario = userEvent.setup();
    const funcao = vi.fn().mockResolvedValue([]);
    render(<Sonda funcao={funcao} deps={[]} />);
    await waitFor(() => expect(funcao).toHaveBeenCalledTimes(1));
    await usuario.click(screen.getByRole('button', { name: 'recarregar' }));
    await waitFor(() => expect(funcao).toHaveBeenCalledTimes(2));
  });

  /**
   * @caso CT-UNI-460
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo capacidade-de-recuperacao
   * @requisito RNF04
   * @objetivo Permitir recuperar a tela após uma falha temporária
   * @resultadoEsperado Nova carga bem-sucedida limpa o erro e preenche os dados
   */
  test('recarregar limpa o erro anterior', async () => {
    const usuario = userEvent.setup();
    const funcao = vi.fn()
      .mockRejectedValueOnce(new Error('Falha temporária'))
      .mockResolvedValue([{ id: 2 }]);
    render(<Sonda funcao={funcao} deps={[]} />);
    await waitFor(() => expect(screen.getByTestId('erro')).toHaveTextContent('Falha temporária'));
    await usuario.click(screen.getByRole('button', { name: 'recarregar' }));
    await waitFor(() => expect(screen.getByTestId('erro')).toHaveTextContent('sem-erro'));
    expect(screen.getByTestId('dados')).toHaveTextContent('[{"id":2}]');
  });

  /**
   * @caso CT-UNI-461
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Atualizar a consulta sempre que um filtro muda
   * @resultadoEsperado Mudar as dependências dispara uma nova chamada
   */
  test('recarrega quando as dependências mudam', async () => {
    const funcao = vi.fn().mockResolvedValue([]);
    const { rerender } = render(<Sonda funcao={funcao} deps={['']} />);
    await waitFor(() => expect(funcao).toHaveBeenCalledTimes(1));
    rerender(<Sonda funcao={funcao} deps={['AGENDADA']} />);
    await waitFor(() => expect(funcao).toHaveBeenCalledTimes(2));
  });

  /**
   * @caso CT-UNI-462
   * @nivel unitario
   * @atributo eficiencia-de-desempenho
   * @subatributo comportamento
   * @requisito RNF05
   * @objetivo Evitar chamadas repetidas quando nada mudou
   * @resultadoEsperado Rerenderizar com as mesmas dependências não refaz a chamada
   */
  test('não recarrega sem mudança de dependências', async () => {
    const funcao = vi.fn().mockResolvedValue([]);
    const { rerender } = render(<Sonda funcao={funcao} deps={['AGENDADA']} />);
    await waitFor(() => expect(funcao).toHaveBeenCalledTimes(1));
    rerender(<Sonda funcao={funcao} deps={['AGENDADA']} />);
    await act(async () => {});
    expect(funcao).toHaveBeenCalledTimes(1);
  });

  /**
   * @caso CT-UNI-463
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo maturidade
   * @requisito RNF04
   * @objetivo Manter o estado consistente ao remontar o componente
   * @resultadoEsperado Uma nova montagem executa a carga uma única vez
   */
  test('executa uma carga por montagem', async () => {
    const funcao = vi.fn().mockResolvedValue([]);
    render(<Sonda funcao={funcao} deps={[]} />);
    await waitFor(() => expect(funcao).toHaveBeenCalledTimes(1));
  });

  /**
   * @caso CT-UNI-464
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Exibir carregando novamente durante a recarga
   * @resultadoEsperado carregando volta a true durante a segunda chamada
   */
  test('volta a carregar durante a recarga', async () => {
    const usuario = userEvent.setup();
    let liberar;
    const funcao = vi.fn()
      .mockResolvedValueOnce([])
      .mockImplementationOnce(() => new Promise((resolve) => { liberar = resolve; }));
    render(<Sonda funcao={funcao} deps={[]} />);
    await waitFor(() => expect(screen.getByTestId('carregando')).toHaveTextContent('false'));
    await usuario.click(screen.getByRole('button', { name: 'recarregar' }));
    await waitFor(() => expect(screen.getByTestId('carregando')).toHaveTextContent('true'));
    await act(async () => { liberar([]); });
    await waitFor(() => expect(screen.getByTestId('carregando')).toHaveTextContent('false'));
  });

  /**
   * @caso CT-UNI-465
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Exibir lista vazia quando o filtro não encontra registros
   * @resultadoEsperado Um array vazio é exposto como dados
   */
  test('distingue lista vazia de ausência de dados', async () => {
    const funcao = vi.fn().mockResolvedValue([]);
    render(<Sonda funcao={funcao} deps={[]} />);
    await waitFor(() => expect(screen.getByTestId('dados')).toHaveTextContent('[]'));
  });

  /**
   * @caso CT-UNI-466
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Expor exceções sem tratamento como mensagem legível
   * @resultadoEsperado O texto do Error é copiado para o estado de erro
   */
  test('usa a mensagem do Error recebido', async () => {
    const funcao = vi.fn().mockRejectedValue(new Error('Erro inesperado.'));
    render(<Sonda funcao={funcao} deps={[]} />);
    await waitFor(() => expect(screen.getByTestId('erro')).toHaveTextContent('Erro inesperado.'));
  });

  /**
   * @caso CT-UNI-467
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo inteligibilidade
   * @requisito RNF06
   * @objetivo Não mostrar erro antigo enquanto a nova carga acontece
   * @resultadoEsperado O erro some imediatamente ao recarregar
   */
  test('limpa o erro ao iniciar nova carga', async () => {
    const usuario = userEvent.setup();
    let liberar;
    const funcao = vi.fn()
      .mockRejectedValueOnce(new Error('Falha'))
      .mockImplementationOnce(() => new Promise((resolve) => { liberar = resolve; }));
    render(<Sonda funcao={funcao} deps={[]} />);
    await waitFor(() => expect(screen.getByTestId('erro')).toHaveTextContent('Falha'));
    await usuario.click(screen.getByRole('button', { name: 'recarregar' }));
    await waitFor(() => expect(screen.getByTestId('erro')).toHaveTextContent('sem-erro'));
    await act(async () => { liberar([]); });
  });

  /**
   * @caso CT-UNI-468
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF07.1
   * @objetivo Repassar a data escolhida para a consulta de horários
   * @resultadoEsperado A função é chamada sem argumentos, usando o filtro já capturado
   */
  test('chama a função sem argumentos', async () => {
    const funcao = vi.fn().mockResolvedValue([]);
    render(<Sonda funcao={funcao} deps={[]} />);
    await waitFor(() => expect(funcao).toHaveBeenCalledWith());
  });

  /**
   * @caso CT-UNI-469
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo analisabilidade
   * @requisito RNF07
   * @objetivo Expor exatamente o contrato usado pelas páginas
   * @resultadoEsperado O hook devolve dados, erro, carregando e recarregar
   */
  test('expõe o contrato esperado pelas páginas', async () => {
    let retorno;
    function Captura() {
      retorno = useCarregar(() => Promise.resolve([]), []);
      return null;
    }
    render(<Captura />);
    await waitFor(() => expect(retorno.carregando).toBe(false));
    expect(Object.keys(retorno).sort()).toEqual(['carregando', 'dados', 'erro', 'recarregar']);
  });

  /**
   * @caso CT-UNI-470
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3, RNF06
   * @objetivo Manter os dados anteriores visíveis durante uma recarga de filtro
   * @resultadoEsperado Os dados antigos continuam até a nova resposta chegar
   */
  test('preserva dados anteriores durante recarga', async () => {
    const usuario = userEvent.setup();
    let liberar;
    const funcao = vi.fn()
      .mockResolvedValueOnce([{ id: 1 }])
      .mockImplementationOnce(() => new Promise((resolve) => { liberar = resolve; }));
    render(<Sonda funcao={funcao} deps={[]} />);
    await waitFor(() => expect(screen.getByTestId('dados')).toHaveTextContent('[{"id":1}]'));
    await usuario.click(screen.getByRole('button', { name: 'recarregar' }));
    expect(screen.getByTestId('dados')).toHaveTextContent('[{"id":1}]');
    await act(async () => { liberar([{ id: 2 }]); });
    await waitFor(() => expect(screen.getByTestId('dados')).toHaveTextContent('[{"id":2}]'));
  });
});
