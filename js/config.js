// Configuração de backend. Hoje roda 100% local (localStorage).
// Quando migrar para produção, troque backend para 'firebase' e preencha as chaves abaixo —
// nenhuma outra alteração de código é necessária, db.js já lê daqui.
window.APP_CONFIG = {
  backend: 'local', // 'local' | 'firebase'
  firebase: {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  }
};
