# lote-153

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 4 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0444 | CT-INT-160 | Campo associa o rótulo ao input pelo atributo for | passou |  |
| mimo-0445 | CT-INT-161 | Campo conecta o texto de ajuda ao input por aria-describedby | passou |  |
| mimo-0446 | CT-INT-162 | Campo marca obrigatório com asterisco oculto para leitores de tela | passou |  |
| mimo-0447 | CT-INT-163 | Campo renderiza o elemento-filho informado no lugar do input padrão | passou |  |

## Arquivo: frontend/__testes__/integracao/campo.test.jsx

```js
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Campo } from '../../src/components/Campo';

afterEach(cleanup);

describe('components/Campo', () => {
  /**
   * @caso CT-INT-160
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Associar o rótulo ao campo para preenchimento por rótulo e leitor de tela
   * @resultadoEsperado getByLabelText("E-mail") encontra o input com id e tipo corretos
   */
  test('Campo associa o rótulo ao input pelo atributo for', () => {
    render(<Campo id="login-email" rotulo="E-mail" type="email" />);
    const campo = screen.getByLabelText('E-mail');
    expect(campo).toHaveAttribute('id', 'login-email');
    expect(campo).toHaveAttribute('type', 'email');
  });

  /**
   * @caso CT-INT-161
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Ligar o texto de ajuda ao campo por aria-describedby
   * @resultadoEsperado O campo aponta para o id do parágrafo de ajuda que é exibido
   */
  test('Campo conecta o texto de ajuda ao input por aria-describedby', () => {
    render(<Campo id="paciente-senha" rotulo="Senha" ajuda="Mínimo de 8 caracteres, com letras e números." />);
    const campo = screen.getByLabelText('Senha');
    expect(campo).toHaveAttribute('aria-describedby', 'paciente-senha-ajuda');
    expect(screen.getByText('Mínimo de 8 caracteres, com letras e números.')).toHaveAttribute('id', 'paciente-senha-ajuda');
  });

  /**
   * @caso CT-INT-162
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RNF06
   * @objetivo Marcar o campo obrigatório sem poluir o nome acessível
   * @resultadoEsperado O asterisco é renderizado como span oculto para leitores de tela
   */
  test('Campo marca obrigatório com asterisco oculto para leitores de tela', () => {
    const { container } = render(<Campo id="cadastro-nome" rotulo="Nome completo" obrigatorio />);
    const marca = container.querySelector('label span[aria-hidden="true"]');
    expect(marca).toHaveTextContent('*');
    expect(screen.getByLabelText(/^Nome completo/)).toHaveAttribute('id', 'cadastro-nome');
  });

  /**
   * @caso CT-INT-163
   * @nivel integracao
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF07
   * @objetivo Permitir que a página injete um controle próprio no lugar do input padrão
   * @resultadoEsperado Com children informado, Campo renderiza o select em vez do input
   */
  test('Campo renderiza o elemento-filho informado no lugar do input padrão', () => {
    const { container } = render(
      <Campo id="filtro-status" rotulo="Status">
        <select id="filtro-status" defaultValue="">
          <option value="">Todos</option>
          <option value="AGENDADA">Agendada</option>
        </select>
      </Campo>,
    );
    expect(screen.getByLabelText('Status').tagName).toBe('SELECT');
    expect(container.querySelector('input')).toBeNull();
  });
});
```
