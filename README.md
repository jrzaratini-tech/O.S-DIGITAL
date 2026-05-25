# O.S Digital Print Pixel

App de ordens de servico para producao de comunicacao visual da Print Pixel.

## Publicacao

O app e publicado como site estatico no Render:

https://o-s-digital.onrender.com

Nao ha etapa de build. O Render serve diretamente os arquivos `index.html`, `styles.css`, `app.js`, `firebase.config.js`, `manifest.webmanifest`, `sw.js` e `icon.svg`.

## Acessos

- Greice: perfil Comercial, acesso total.
- Zaratini: perfil Projetista, acesso total.
- Montagem: link padrao da equipe e login com e-mail/senha criados na aba Equipe.

Greice/Zaratini criam o usuario da montagem na aba Equipe, usando nome, e-mail e senha. O colaborador recebe o link padrao da equipe e seus dados de acesso. Ao logar, ve apenas as O.S atribuidas ao proprio UID.

## Firebase

Produtos usados:

- Authentication com provedor E-mail/senha para Greice e Zaratini.
- Firestore Database para usuarios, convites e ordens de servico.

Sempre que `firestore.rules` mudar, publique manualmente em:

Firestore Database > Regras > Publicar

## Fluxo Principal

- Comercial/Projetista criam e editam O.S.
- Cada O.S recebe processos separados para Projetista e Montagem.
- Comercial/Projetista selecionam o responsavel pela montagem.
- O app atribui a O.S ao UID real do colaborador e mantem uma copia auxiliar em `convites/{uid}/servicos/{osId}`.
- A montagem marca apenas as etapas liberadas para ela.

## Anexos

O campo de arquivos aceita selecao normal de arquivos e tambem prints colados com Ctrl+V. Prints sao compactados no navegador antes de serem salvos.

## CRM Print Pixel

Foi localizada a pasta `C:\Users\Zaratini\OneDrive\Desktop\CRM-PRINTPIXEL`. O banco local `DATA\database\core.db` existia, mas as tabelas `events`, `pages` e `settings` estavam vazias no momento da verificacao, portanto nao havia trabalhos locais para importar automaticamente.
