# lote-152

Modelo: mimo

Avalie com a skill `juiz-casos-teste` **somente os 5 casos listados na tabela**. Na coluna `caso` da sua resposta, use o **ID de avaliação** da tabela, não o `@caso` do arquivo.

| ID de avaliação | @caso | Título | Resultado da execução | Erro (resumo) |
|---|---|---|---|---|
| mimo-0439 | CT-INT-155 | BotaoEnviar ocioso mostra o texto original como botão de envio | passou |  |
| mimo-0440 | CT-INT-156 | BotaoEnviar desabilita e marca aria-busy enquanto envia | passou |  |
| mimo-0441 | CT-INT-157 | BotaoEnviar usa o textoEnviando customizado durante o envio | passou |  |
| mimo-0442 | CT-INT-158 | BotaoEnviar respeita o disabled recebido da página | passou |  |
| mimo-0443 | CT-INT-159 | BotaoEnviar repassa as props recebidas para o elemento | passou |  |

## Arquivo: frontend/__testes__/integracao/botao-enviar.test.jsx

```js
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BotaoEnviar } from '../../src/components/BotaoEnviar';

afterEach(cleanup);

describe('components/BotaoEnviar', () => {
  /**
   * @caso CT-INT-155
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Exibir o rótulo do botão de envio em repouso
   * @resultadoEsperado Botão ocioso mostra os children, é do tipo submit e está habilitado
   */
  test('BotaoEnviar ocioso mostra o texto original como botão de envio', () => {
    render(<BotaoEnviar id="login-entrar" className="marca bloco">Entrar</BotaoEnviar>);
    const botao = screen.getByRole('button', { name: 'Entrar' });
    expect(botao).toHaveAttribute('type', 'submit');
    expect(botao).toHaveClass('marca', 'bloco');
    expect(botao).toBeEnabled();
  });

  /**
   * @caso CT-INT-156
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF06
   * @objetivo Impedir envio duplicado enquanto a ação está em andamento
   * @resultadoEsperado Com enviando=true o botão fica desabilitado, aria-busy e mostra "Salvando..."
   */
  test('BotaoEnviar desabilita e marca aria-busy enquanto envia', () => {
    render(<BotaoEnviar enviando>Salvar</BotaoEnviar>);
    const botao = screen.getByRole('button');
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute('aria-busy', 'true');
    expect(botao).toHaveTextContent('Salvando...');
    expect(botao).not.toHaveTextContent('Salvar');
  });

  /**
   * @caso CT-INT-157
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo operabilidade
   * @requisito RNF06
   * @objetivo Adaptar o texto de carregamento à ação em execução
   * @resultadoEsperado textoEnviando customizado substitui o texto do botão durante o envio
   */
  test('BotaoEnviar usa o textoEnviando customizado durante o envio', () => {
    render(<BotaoEnviar enviando textoEnviando="Entrando...">Entrar</BotaoEnviar>);
    expect(screen.getByRole('button')).toHaveTextContent('Entrando...');
  });

  /**
   * @caso CT-INT-158
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RNF06
   * @objetivo Respeitar a indisponibilidade imposta pela página, como confirmação sem horário escolhido
   * @resultadoEsperado Botão com disabled explícito permanece desabilitado mesmo sem envio em curso
   */
  test('BotaoEnviar respeita o disabled recebido da página', () => {
    render(<BotaoEnviar disabled>Confirmar agendamento</BotaoEnviar>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  /**
   * @caso CT-INT-159
   * @nivel integracao
   * @atributo manutenibilidade
   * @subatributo modularidade
   * @requisito RNF07
   * @objetivo Repassar identificador, classe e manipulador recebidos da página
   * @resultadoEsperado As props id, className e onClick chegam intactas ao elemento do botão
   */
  test('BotaoEnviar repassa as props recebidas para o elemento', () => {
    const aoClicar = vi.fn();
    render(<BotaoEnviar id="agendar-confirmar" className="marca" onClick={aoClicar}>Confirmar</BotaoEnviar>);
    const botao = screen.getByRole('button', { name: 'Confirmar' });
    expect(botao).toHaveAttribute('id', 'agendar-confirmar');
    fireEvent.click(botao);
    expect(aoClicar).toHaveBeenCalledTimes(1);
  });
});
```
