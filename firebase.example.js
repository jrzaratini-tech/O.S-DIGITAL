// Exemplo de configuracao. O app usa firebase.config.js em producao.

export const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000",
};

export const adminUsers = [
  {
    nome: "Greice",
    email: "greicesantana@icloud.com",
    perfil: "comercial",
  },
  {
    nome: "Zaratini",
    email: "jrzaratini@icloud.com",
    perfil: "projetista",
  },
];
