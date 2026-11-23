import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useCarregar } from '../../src/hooks/useCarregar';

function Sonda({ funcao, dependencias = [] }) {
  const { dados, erro, carregando, recarregar } = useCarregar(funcao, dependencias);
  return (
    <div>
      <span data-testid="carregando">{String(carregando)}</span>
      <span data-testid="dados">{dados === null ? 'sem-dados' : JSON.stringify(dados)}</span>
      <span data-testid="erro">{erro ?? 'sem-erro'}</span>
      <button type="button" onClick={recarregar}>recarregar</button>
    </div>
  );
}

describe('hooks/useCarregar', () => {
  afterEach(cleanup);

  /**
   * @caso CT-UNI-155
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Expor o estado de carregamento enquanto a promessa não resolve
   * @resultadoEsperado Ao montar, carregando é true e vira false quando a função conclui
   */
  test('useCarregar inicia com carregando true e encerra quando a função conclui', async () => {
    let resolver;
    const promessa = new Promise((resolverExterno) => { resolver = resolverExterno; });
    const funcao = vi.fn(() => promessa);

    render(<Sonda funcao={funcao} />);

    expect(screen.getByTestId('carregando')).toHaveTextContent('true');
    resolver({ lista: [] });
    await waitFor(() => expect(screen.getByTestId('carregando')).toHaveTextContent('false'));
    expect(funcao).toHaveBeenCalledTimes(1);
  });

  /**
   * @caso CT-UNI-156
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Guardar os dados devolvidos pela função assíncrona
   * @resultadoEsperado dados recebe o resultado da função e carregando fica false
   */
  test('useCarregar preenche dados com o resultado da função', async () => {
    const funcao = vi.fn(() => Promise.resolve({ id: 1, nome: 'Ana Pereira' }));

    render(<Sonda funcao={funcao} />);

    await waitFor(() => expect(screen.getByTestId('dados')).toHaveTextContent('"nome":"Ana Pereira"'));
    expect(screen.getByTestId('carregando')).toHaveTextContent('false');
    expect(screen.getByTestId('erro')).toHaveTextContent('sem-erro');
  });

  /**
   * @caso CT-UNI-157
   * @nivel unitario
   * @atributo confiabilidade
   * @subatributo tolerancia-a-falhas
   * @requisito RNF04
   * @objetivo Capturar a falha da função sem derrubar a renderização
   * @resultadoEsperado erro recebe a mensagem, dados permanece null e carregando fica false
   */
  test('useCarregar registra o erro sem lançar exceção', async () => {
    const funcao = vi.fn(() => Promise.reject(new Error('Falha ao carregar.')));

    render(<Sonda funcao={funcao} />);

    await waitFor(() => expect(screen.getByTestId('erro')).toHaveTextContent('Falha ao carregar.'));
    expect(screen.getByTestId('dados')).toHaveTextContent('sem-dados');
    expect(screen.getByTestId('carregando')).toHaveTextContent('false');
  });

  /**
   * @caso CT-UNI-158
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Permitir recarregar a lista e limpar o erro anterior
   * @resultadoEsperado recarregar executa a função de novo e zera o erro anterior
   */
  test('useCarregar.recarregar executa a função outra vez e limpa o erro', async () => {
    const funcao = vi.fn()
      .mockRejectedValueOnce(new Error('Falha transitoria.'))
      .mockResolvedValueOnce({ ok: true });

    render(<Sonda funcao={funcao} />);
    await waitFor(() => expect(screen.getByTestId('erro')).toHaveTextContent('Falha transitoria.'));

    fireEvent.click(screen.getByText('recarregar'));

    await waitFor(() => expect(screen.getByTestId('dados')).toHaveTextContent('"ok":true'));
    expect(funcao).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('erro')).toHaveTextContent('sem-erro');
  });

  /**
   * @caso CT-UNI-159
   * @nivel unitario
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RF10.3
   * @objetivo Executar a função de novo quando as dependências mudam
   * @resultadoEsperado Trocar a dependência dispara nova chamada com o valor atualizado
   */
  test('useCarregar refaz a chamada quando as dependências mudam', async () => {
    const funcao = vi.fn((chave) => Promise.resolve({ chave }));

    const { rerender } = render(<Sonda funcao={funcao} dependencias={['a']} />);
    await waitFor(() => expect(funcao).toHaveBeenCalledWith('a'));

    rerender(<Sonda funcao={funcao} dependencias={['b']} />);

    await waitFor(() => expect(funcao).toHaveBeenCalledWith('b'));
    expect(funcao).toHaveBeenCalledTimes(2);
  });
});
