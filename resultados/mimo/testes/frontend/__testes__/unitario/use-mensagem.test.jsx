import { afterEach, describe, expect, test } from 'vitest';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { useMensagem } from '../../src/hooks/useMensagem';

const envolver = ({ children }) => <ToastProvider>{children}</ToastProvider>;

describe('hooks/useMensagem', () => {
  afterEach(cleanup);

  /**
   * @caso CT-UNI-160
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Registrar a mensagem de erro com o texto em português para exibição junto ao formulário
   * @resultadoEsperado erro("...") define mensagem com tipo "erro" e o texto informado
   */
  test('useMensagem.erro define a mensagem de erro', () => {
    const { result } = renderHook(() => useMensagem(), { wrapper: envolver });

    act(() => result.current.erro('Horário indisponível.'));

    expect(result.current.mensagem).toEqual({ tipo: 'erro', texto: 'Horário indisponível.' });
  });

  /**
   * @caso CT-UNI-161
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Limpar a mensagem exibida antes de uma nova ação
   * @resultadoEsperado limpar() zera a mensagem para null
   */
  test('useMensagem.limpar zera a mensagem atual', () => {
    const { result } = renderHook(() => useMensagem(), { wrapper: envolver });

    act(() => result.current.erro('Algo falhou.'));
    act(() => result.current.limpar());

    expect(result.current.mensagem).toBeNull();
  });

  /**
   * @caso CT-UNI-162
   * @nivel unitario
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RNF06
   * @objetivo Mostrar o sucesso como aviso flutuante e não deixar erro antigo na tela
   * @resultadoEsperado sucesso limpa a mensagem do formulário e publica o toast com texto e título
   */
  test('useMensagem.sucesso limpa o erro e publica o toast de sucesso', () => {
    const { result } = renderHook(() => useMensagem(), { wrapper: envolver });

    act(() => result.current.erro('Erro antigo.'));
    act(() => result.current.sucesso('Consulta agendada com sucesso.', 'Tudo certo!'));

    expect(result.current.mensagem).toBeNull();
    expect(screen.getByText('Tudo certo!')).toBeInTheDocument();
    expect(screen.getByText('Consulta agendada com sucesso.')).toBeInTheDocument();
  });

  /**
   * @caso CT-UNI-163
   * @nivel unitario
   * @atributo manutenibilidade
   * @subatributo testabilidade
   * @requisito RNF07
   * @objetivo Começar sem nenhuma mensagem para não exibir aviso espúrio ao montar
   * @resultadoEsperado O estado inicial de mensagem é null
   */
  test('useMensagem começa com mensagem null', () => {
    const { result } = renderHook(() => useMensagem(), { wrapper: envolver });

    expect(result.current.mensagem).toBeNull();
  });
});
