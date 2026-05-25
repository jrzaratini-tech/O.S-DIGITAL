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

## Próximo passo para nuvem

Crie um projeto Firebase com Authentication, Firestore e Storage. Depois conecte o app a uma camada de dados Firestore e aplique regras de segurança equivalentes ao RBAC descrito no guia.
