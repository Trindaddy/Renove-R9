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

