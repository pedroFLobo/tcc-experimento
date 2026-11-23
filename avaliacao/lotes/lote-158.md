# lote-158

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 3 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0466 | CT-INT-152 | Mensagem não renderiza nada quando a mensagem é null | passou |  |
| mimo-0467 | CT-INT-153 | Mensagem de erro vira role alert com o texto informado | passou |  |
| mimo-0468 | CT-INT-154 | Mensagem de sucesso vira role status com o texto informado | passou |  |

## Arquivo: frontend/__testes__/integracao/mensagem.test.jsx

```js
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Mensagem } from '../../src/components/Mensagem';

afterEach(cleanup);

describe('components/Mensagem', () => {
  /**
   * @caso CT-INT-152
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo correcao
   * @requisito RNF06
   * @objetivo Não ocupar espaço na tela quando não há mensagem a exibir
   * @resultadoEsperado Com mensagem null, Mensagem não renderiza elemento algum
   */
  test('Mensagem não renderiza nada quando a mensagem é null', () => {
    const { container } = render(<Mensagem id="login-mensagem" mensagem={null} />);
    expect(container.innerHTML).toBe('');
  });

  /**
   * @caso CT-INT-153
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Exibir o erro de login como alerta legível junto ao formulário
   * @resultadoEsperado Mensagem de erro vira região de alerta com o texto em português
   */
  test('Mensagem de erro vira role alert com o texto informado', () => {
    render(<Mensagem id="login-mensagem" mensagem={{ tipo: 'erro', texto: 'E-mail ou senha inválidos.' }} />);
    const aviso = screen.getByRole('alert');
    expect(aviso).toHaveAttribute('id', 'login-mensagem');
    expect(aviso).toHaveClass('mensagem', 'erro');
    expect(aviso).toHaveTextContent('E-mail ou senha inválidos.');
  });

  /**
   * @caso CT-INT-154
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo reconhecibilidade
   * @requisito RNF06
   * @objetivo Anunciar a mensagem de sucesso para leitores de tela
   * @resultadoEsperado Mensagem de sucesso vira role status com o texto informado
   */
  test('Mensagem de sucesso vira role status com o texto informado', () => {
    render(<Mensagem id="agendar-mensagem" mensagem={{ tipo: 'sucesso', texto: 'Consulta agendada.' }} />);
    const aviso = screen.getByRole('status');
    expect(aviso).toHaveAttribute('id', 'agendar-mensagem');
    expect(aviso).toHaveClass('mensagem', 'sucesso');
    expect(aviso).toHaveTextContent('Consulta agendada.');
  });
});
```
