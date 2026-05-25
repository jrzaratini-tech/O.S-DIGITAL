// Copie este arquivo para firebase.config.js quando tiver as credenciais do Firebase.
// O app atual funciona em modo localStorage. Para producao, conecte Firestore,
// Authentication, Storage e replique as regras de RBAC descritas no PDF.

export const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000",
};

export const firestoreRulesSketch = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /servicos/{servicoId} {
      allow read: if request.auth != null;
      allow create, delete: if request.auth.token.role == 'comercial';
      allow update: if request.auth.token.role in ['comercial', 'projetista']
        || onlyMountingChecklistChanged();

      function onlyMountingChecklistChanged() {
        return request.auth.token.role == 'montagem'
          && request.resource.data.diff(resource.data).changedKeys()
            .hasOnly(['etapa_montagem', 'updatedAt'])
          && request.resource.data.etapa_montagem.keys()
            .hasAll(resource.data.etapa_montagem.keys());
      }
    }
  }
}
`;
