import api from './api';

export async function loginRequest(email, password) {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);

  const response = await api.post('/auth/login', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return response.data;
}

export async function getMeRequest() {
  const response = await api.get('/auth/me');
  return response.data;
}

export async function verificarEmailPrimeiroAcesso(email) {
  const response = await api.post('/auth/primeiro-acesso/verificar-email', { email });
  return response.data;
}

export async function validarSenhaPadraoPrimeiroAcesso(email, senhaPadrao) {
  const response = await api.post('/auth/primeiro-acesso/validar', { email, senha_padrao: senhaPadrao });
  return response.data;
}

export async function definirSenhaDefinitivaPrimeiroAcesso(email, senhaPadrao, novaSenha, confirmarSenha) {
  const response = await api.post('/auth/primeiro-acesso/definir-senha', {
    email,
    senha_padrao: senhaPadrao,
    nova_senha: novaSenha,
    confirmar_senha: confirmarSenha
  });
  return response.data;
}

