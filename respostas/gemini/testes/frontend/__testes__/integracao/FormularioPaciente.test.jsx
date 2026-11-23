import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormularioPaciente } from '../../src/components/FormularioPaciente';

describe('Integração Frontend: FormularioPaciente', () => {
  /**
   * @caso CT-INT-055
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo acessibilidade
   * @requisito RF02.3, RNF06
   * @objetivo Ter campos devidamente associados aos rótulos para acessibilidade por label
   * @resultadoEsperado Todos os campos de cadastro são localizáveis por getByLabelText
   */
  test('deve possuir rótulos acessíveis associados a cada campo do paciente', () => {
    render(<FormularioPaciente prefixo="cad" textoBotao="Salvar" onEnviar={vi.fn()} />);

    expect(screen.getByLabelText(/Nome completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CPF/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data de nascimento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Telefone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do responsável/i)).toBeInTheDocument();
  });

  /**
   * @caso CT-INT-056
   * @nivel integracao
   * @atributo adequacao-funcional
   * @subatributo completude
   * @requisito RF02.1, RF02.3
   * @objetivo Preencher os campos e submeter dados para a função de callback
   * @resultadoEsperado onEnviar é chamado com o objeto completo preenchido
   */
  test('deve capturar valores digitados e acionar callback de envio', async () => {
    const user = userEvent.setup();
    const onEnviarMock = vi.fn().mockResolvedValue(true);

    render(<FormularioPaciente prefixo="cad" textoBotao="Cadastrar" onEnviar={onEnviarMock} />);

    await user.type(screen.getByLabelText(/Nome completo/i), 'Carlos Silva');
    await user.type(screen.getByLabelText(/E-mail/i), 'carlos.silva@email.com');
    await user.type(screen.getByLabelText(/Senha/i), 'Senha123');
    await user.type(screen.getByLabelText(/CPF/i), '529.982.247-25');
    await user.type(screen.getByLabelText(/Data de nascimento/i), '1995-10-10');
    await user.type(screen.getByLabelText(/Telefone/i), '(11) 98888-7777');

    await user.click(screen.getByRole('button', { name: /Cadastrar/i }));

    expect(onEnviarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Carlos Silva',
        email: 'carlos.silva@email.com',
        senha: 'Senha123',
        cpf: '529.982.247-25',
        dataNascimento: '1995-10-10',
        telefone: '(11) 98888-7777',
      })
    );
  });

  /**
   * @caso CT-INT-057
   * @nivel integracao
   * @atributo usabilidade
   * @subatributo protecao-contra-erro-do-usuario
   * @requisito RN06, RNF06
   * @objetivo Exibir texto de ajuda indicando obrigatoriedade de responsável para menores
   * @resultadoEsperado Texto de ajuda presente no formulário
   */
  test('deve conter texto de ajuda orientando sobre responsável para menores', () => {
    render(<FormularioPaciente prefixo="cad" textoBotao="Salvar" onEnviar={vi.fn()} />);
    expect(screen.getByText(/Obrigatório para menores de 18 anos/i)).toBeInTheDocument();
  });
});
