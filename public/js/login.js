const BASE_URL = window.location.origin; 
 // ou sua URL do Render

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submitBtn');
const switchForm = document.getElementById('switchForm');
const formTitle = document.getElementById('formTitle');
const messageDiv = document.getElementById('message');

let isLogin = true; // true = login, false = registrar

submitBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if(!username || !password){ 
    messageDiv.textContent = 'Preencha todos os campos'; 
    return; 
  }

  if(isLogin){
    // Login
    try{
      const res = await fetch(`${BASE_URL}/login`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if(res.ok){
        localStorage.setItem('token', data.token);
        window.location.href = '/dashboard';
      } else {
        messageDiv.textContent = data.message || 'Erro no login';
      }
    }catch(err){ 
      messageDiv.textContent = 'Erro de conexão'; 
    }
  } else {
    // Registrar
    try{
      const res = await fetch(`${BASE_URL}/register`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if(res.ok){
        messageDiv.style.color='green';
        messageDiv.textContent = 'Usuário criado! Faça login.';
        isLogin = true;
        formTitle.textContent = 'Login';
        submitBtn.textContent = 'Entrar';
        switchForm.textContent = 'Ainda não tem conta? Registrar';
      } else {
        messageDiv.style.color='red';
        messageDiv.textContent = data.message || 'Erro ao registrar';
      }
    }catch(err){ 
      messageDiv.textContent = 'Erro de conexão'; 
    }
  }
});

switchForm.addEventListener('click', () => {
  isLogin = !isLogin;
  if(isLogin){
    formTitle.textContent = 'Login';
    submitBtn.textContent = 'Entrar';
    switchForm.textContent = 'Ainda não tem conta? Registrar';
  } else {
    formTitle.textContent = 'Registrar';
    submitBtn.textContent = 'Registrar';
    switchForm.textContent = 'Já tem conta? Login';
  }
  messageDiv.textContent='';
});
