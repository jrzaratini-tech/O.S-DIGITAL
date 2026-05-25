# OS Digital - SG-CV

App mobile-first para controle de ordens de serviço de comunicação visual, baseado no guia `Guia_de_Producao_App_Comunicacao_Visual.pdf`.

## Como abrir

Abra `index.html` no navegador. O app funciona sem servidor usando `localStorage`.

## O que foi implementado

- Perfis RBAC: Greice/Comercial, Zaratini/Projetista e Joao/Montagem.
- Cadastro, edição e exclusão de OS conforme permissão.
- Checklists dinâmicos para Luz Frontal, Logo Flutuante e Neon.
- Fila com Super Prioridade acima da ordem por data de entrega.
- Painel de montagem com botões grandes e bloqueio de campos sensíveis.
- Calendário mensal de entregas.
- Auditoria automática de conclusão com timestamp e operador.
- Exportação JSON dos dados.
- Estrutura PWA com manifesto e service worker.
- Arquivo `firebase.example.js` com ponto de partida para Firestore.
- Login com Firebase Auth.
- Convite nominal e exclusivo para montadores.
- Atribuicao de OS por montador: cada montador ve apenas os proprios trabalhos.

## Próximo passo para nuvem

Preencha `firebase.config.js` com as credenciais do Firebase Web App. Depois cole o conteudo de `firestore.rules` em Firestore Database > Regras e publique.

No Firebase Authentication, ative o metodo E-mail/senha. Crie manualmente os usuarios fixos Greice e Zaratini em Authentication > Usuarios. Os montadores devem entrar somente por link gerado na aba Equipe.
