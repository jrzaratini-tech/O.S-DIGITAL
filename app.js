import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { adminUsers, firebaseConfig } from "./firebase.config.js";

const APP_VERSION = "12";
const inviteToken = new URLSearchParams(window.location.search).get("convite");
const panelToken = new URLSearchParams(window.location.search).get("painel") || inviteToken;
const panelMode = Boolean(panelToken);
const servicesCollection = "servicos";
const usersCollection = "usuarios";
const invitesCollection = "convites";

const roles = {
  comercial: {
    label: "Comercial",
    canCreate: true,
    canDelete: true,
    canEditService: true,
    canSetPriority: true,
    canCompleteProject: true,
    canCompleteMounting: true,
  },
  projetista: {
    label: "Projetista",
    canCreate: true,
    canDelete: true,
    canEditService: true,
    canSetPriority: true,
    canCompleteProject: true,
    canCompleteMounting: true,
  },
  montagem: {
    label: "Montagem",
    canCreate: false,
    canDelete: false,
    canEditService: false,
    canSetPriority: false,
    canCompleteProject: false,
    canCompleteMounting: true,
  },
};

const productionProcesses = [
  "Arte / projeto",
  "Modelagem",
  "Usinagem CNC",
  "Impressao 3D",
  "Montagem da estrutura",
  "Pintura interna",
  "LED / solda",
  "Cola quente",
  "Corte laser opalino",
  "Pintura externa",
  "Acabamento",
  "Molde de instalacao",
  "Embalagem",
];

const defaultProjectProcesses = ["Arte / projeto", "Modelagem", "Usinagem CNC", "Impressao 3D", "Molde de instalacao"];
const defaultMountingProcesses = [
  "Montagem da estrutura",
  "Pintura interna",
  "LED / solda",
  "Cola quente",
  "Corte laser opalino",
  "Pintura externa",
  "Acabamento",
  "Embalagem",
];

const workflows = {
  "Logo em Acrilico": {
    project: ["Arte / projeto", "Modelagem", "Usinagem CNC", "Corte laser opalino"],
    mounting: ["Acabamento", "Embalagem"],
  },
  "Logo Flutuante para Montra": {
    project: ["Arte / projeto", "Modelagem", "Usinagem CNC", "Molde de instalacao"],
    mounting: ["Montagem da estrutura", "Acabamento", "Embalagem"],
  },
  "Neon LED": {
    project: ["Arte / projeto", "Modelagem", "Usinagem CNC"],
    mounting: ["LED / solda", "Cola quente", "Acabamento", "Embalagem"],
  },
  "Alto Colante": {
    project: ["Arte / projeto"],
    mounting: ["Acabamento", "Embalagem"],
  },
  "Logo 3D com LED": {
    project: ["Arte / projeto", "Modelagem", "Usinagem CNC", "Impressao 3D", "Molde de instalacao"],
    mounting: ["Montagem da estrutura", "Pintura interna", "LED / solda", "Cola quente", "Pintura externa", "Acabamento", "Embalagem"],
  },
  "Logo 3D sem LED": {
    project: ["Arte / projeto", "Modelagem", "Usinagem CNC", "Impressao 3D", "Molde de instalacao"],
    mounting: ["Montagem da estrutura", "Pintura externa", "Acabamento", "Embalagem"],
  },
  "Logo com luz lateral": {
    project: ["Arte / projeto", "Modelagem", "Usinagem CNC", "Molde de instalacao"],
    mounting: ["Montagem da estrutura", "Pintura interna", "LED / solda", "Cola quente", "Pintura externa", "Acabamento", "Embalagem"],
  },
  "Logo com luz traseira": {
    project: ["Arte / projeto", "Modelagem", "Usinagem CNC", "Molde de instalacao"],
    mounting: ["Montagem da estrutura", "Pintura interna", "LED / solda", "Cola quente", "Pintura externa", "Acabamento", "Embalagem"],
  },
  Brindes: {
    project: ["Arte / projeto", "Modelagem"],
    mounting: ["Impressao 3D", "Acabamento", "Embalagem"],
  },
  "Painel de ACM": {
    project: ["Arte / projeto", "Modelagem", "Molde de instalacao"],
    mounting: ["Montagem da estrutura", "Pintura externa", "Acabamento", "Embalagem"],
  },
  "Caixa de Luz": {
    project: ["Arte / projeto", "Modelagem", "Corte laser opalino", "Molde de instalacao"],
    mounting: ["Montagem da estrutura", "Pintura interna", "LED / solda", "Cola quente", "Pintura externa", "Acabamento", "Embalagem"],
  },
  Outro: {
    project: ["Arte / projeto"],
    mounting: ["Acabamento", "Embalagem"],
  },
};

const state = {
  appReady: false,
  authUser: null,
  profile: null,
  services: [],
  team: [],
  invites: [],
  invite: null,
  pastedAttachments: [],
  formBusy: false,
  panelMirrorSyncQueued: false,
  view: "fila",
  search: "",
  status: "todos",
  unsubscribeServices: null,
  unsubscribeTeam: null,
  unsubscribeInvites: null,
};

const dom = {
  userName: document.querySelector("#userName"),
  logoutButton: document.querySelector("#logoutButton"),
  authView: document.querySelector("#authView"),
  appView: document.querySelector("#appView"),
  authTitle: document.querySelector("#authTitle"),
  authText: document.querySelector("#authText"),
  authForm: document.querySelector("#authForm"),
  nameField: document.querySelector("#nameField"),
  authName: document.querySelector("#authName"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authSubmit: document.querySelector("#authSubmit"),
  forgotPasswordButton: document.querySelector("#forgotPasswordButton"),
  authMessage: document.querySelector("#authMessage"),
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  permissionBanner: document.querySelector("#permissionBanner"),
  queueSummary: document.querySelector("#queueSummary"),
  serviceList: document.querySelector("#serviceList"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  form: document.querySelector("#serviceForm"),
  editingId: document.querySelector("#editingId"),
  clientName: document.querySelector("#clientName"),
  productType: document.querySelector("#productType"),
  deliveryDate: document.querySelector("#deliveryDate"),
  dimensions: document.querySelector("#dimensions"),
  notes: document.querySelector("#notes"),
  attachments: document.querySelector("#attachments"),
  pasteZone: document.querySelector("#pasteZone"),
  attachmentPreview: document.querySelector("#attachmentPreview"),
  assignedMountingUid: document.querySelector("#assignedMountingUid"),
  projectProcessOptions: document.querySelector("#projectProcessOptions"),
  mountingProcessOptions: document.querySelector("#mountingProcessOptions"),
  superPriority: document.querySelector("#superPriority"),
  saveButton: document.querySelector("#saveButton"),
  deleteButton: document.querySelector("#deleteButton"),
  resetFormButton: document.querySelector("#resetFormButton"),
  monthPicker: document.querySelector("#monthPicker"),
  calendarGrid: document.querySelector("#calendarGrid"),
  metricsGrid: document.querySelector("#metricsGrid"),
  auditList: document.querySelector("#auditList"),
  exportButton: document.querySelector("#exportButton"),
  inviteForm: document.querySelector("#inviteForm"),
  inviteName: document.querySelector("#inviteName"),
  inviteResult: document.querySelector("#inviteResult"),
  teamList: document.querySelector("#teamList"),
  dialog: document.querySelector("#serviceDialog"),
  detail: document.querySelector("#serviceDetail"),
  emptyTemplate: document.querySelector("#emptyStateTemplate"),
};

let auth;
let db;

function showAuthMessage(text, isError = false) {
  dom.authMessage.hidden = false;
  dom.authMessage.textContent = text;
  dom.authMessage.classList.toggle("is-error", isError);
}

function clearAuthMessage() {
  dom.authMessage.hidden = true;
  dom.authMessage.textContent = "";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function timestamp() {
  return new Date().toISOString();
}

function formatDate(value) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateTime(value) {
  if (!value) return "Pendente";
  if (value.toDate) {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value.toDate());
  }
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function dateMillis(value) {
  if (!value) return 0;
  if (value.toMillis) return value.toMillis();
  if (value.toDate) return value.toDate().getTime();
  return new Date(value).getTime();
}

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

function makeSteps(labels) {
  return labels.map((label) => ({
    id: slugify(label),
    label,
    done: false,
    timestamp: null,
    operator: null,
    operatorUid: null,
  }));
}

function renderProcessOptions() {
  dom.projectProcessOptions.innerHTML = productionProcesses
    .map((label) => processOptionHtml("project", label, defaultProjectProcesses.includes(label)))
    .join("");
  dom.mountingProcessOptions.innerHTML = productionProcesses
    .map((label) => processOptionHtml("mounting", label, defaultMountingProcesses.includes(label)))
    .join("");
}

function processOptionHtml(group, label, checked) {
  const id = `${group}-${slugify(label)}`;
  return `
    <label class="process-option" for="${id}">
      <input id="${id}" type="checkbox" data-process-group="${group}" value="${label}" ${checked ? "checked" : ""}>
      <span>${label}</span>
    </label>
  `;
}

function getSelectedProcesses(group) {
  return Array.from(document.querySelectorAll(`[data-process-group="${group}"]:checked`)).map((input) => input.value);
}

function setSelectedProcesses(group, labels) {
  const selected = new Set(labels);
  document.querySelectorAll(`[data-process-group="${group}"]`).forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function resetProcessDefaults() {
  const workflow = workflows[dom.productType?.value] || {};
  setSelectedProcesses("project", workflow.project || defaultProjectProcesses);
  setSelectedProcesses("mounting", workflow.mounting || defaultMountingProcesses);
}

function normalizeAttachment(attachment) {
  if (typeof attachment === "string") {
    return { name: attachment, source: "file", dataUrl: null };
  }
  return attachment;
}

function renderAttachmentPreview(existing = []) {
  const attachments = [...existing.map(normalizeAttachment), ...state.pastedAttachments];
  if (!attachments.length) {
    dom.attachmentPreview.innerHTML = '<span class="field-help">Nenhum anexo adicionado.</span>';
    return;
  }
  dom.attachmentPreview.innerHTML = attachments
    .map((item, index) => {
      const image = item.dataUrl ? `<img src="${item.dataUrl}" alt="${item.name}">` : "";
      return `
        <div class="attachment-chip">
          ${image}
          <span>${item.name}</span>
          ${index >= existing.length ? `<button class="small-button" data-action="remove-paste" data-id="${index - existing.length}" type="button">Remover</button>` : ""}
        </div>
      `;
    })
    .join("");
}

async function handlePaste(event) {
  const item = Array.from(event.clipboardData?.items || []).find((entry) => entry.type.startsWith("image/"));
  if (!item) return;
  event.preventDefault();
  const file = item.getAsFile();
  if (!file) return;
  const attachment = await compressImageAttachment(file);
  state.pastedAttachments.push(attachment);
  renderAttachmentPreview();
}

function compressImageAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        resolve({
          name: `print-orientacao-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`,
          source: "paste",
          type: "image/jpeg",
          size: Math.round((dataUrl.length * 3) / 4),
          dataUrl,
        });
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function currentRole() {
  return roles[state.profile?.perfil] || roles.montagem;
}

function allSteps(service) {
  return [...(service.project || []), ...(service.mounting || [])];
}

function progress(service) {
  const steps = allSteps(service);
  if (!steps.length) return 0;
  return Math.round((steps.filter((step) => step.done).length / steps.length) * 100);
}

function statusOf(service) {
  const projectDone = (service.project || []).every((step) => step.done);
  const mountingDone = (service.mounting || []).every((step) => step.done);
  if (mountingDone && projectDone) return "Concluido";
  if (projectDone) return "Em montagem";
  if ((service.project || []).some((step) => step.done)) return "Em projeto";
  return "Aguardando projeto";
}

function fixedUserForEmail(email) {
  const normalized = email.trim().toLowerCase();
  return adminUsers.find((user) => user.email.toLowerCase() === normalized) || null;
}

function hasValidFirebaseConfig() {
  return Boolean(firebaseConfig?.apiKey && !firebaseConfig.apiKey.includes("SUA_") && firebaseConfig.projectId);
}

async function ensureUserProfile(user) {
  const userRef = doc(db, usersCollection, user.uid);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    const profile = snapshot.data();
    if (!profile.ativo) throw new Error("Seu usuario esta desativado. Fale com o Comercial ou Projetista.");
    return { uid: user.uid, ...profile };
  }

  const fixedUser = fixedUserForEmail(user.email || "");
  if (fixedUser) {
    const profile = {
      nome: fixedUser.nome,
      email: user.email,
      perfil: fixedUser.perfil,
      ativo: true,
      fixo: true,
      createdAt: serverTimestamp(),
    };
    await setDoc(userRef, profile);
    return { uid: user.uid, ...profile };
  }

  throw new Error("Usuario sem perfil. Greice e Zaratini devem estar em firebase.config.js.");
}

async function loadPanelInvite() {
  if (!panelMode) return null;
  const inviteRef = doc(db, invitesCollection, panelToken);
  const snapshot = await getDoc(inviteRef);
  if (!snapshot.exists()) throw new Error("Link invalido ou removido.");
  const invite = { id: snapshot.id, ...snapshot.data() };
  if (invite.perfil !== "montagem") throw new Error("Este convite nao e de montagem.");
  if (invite.ativo === false) throw new Error("Este acesso foi desativado.");
  state.invite = invite;
  return invite;
}

function renderPanelAuthState(invite) {
  dom.authView.hidden = false;
  dom.appView.hidden = true;
  dom.logoutButton.hidden = true;
  dom.authForm.hidden = false;
  dom.nameField.hidden = false;
  dom.authName.value = invite.nome || "";
  dom.authName.readOnly = true;
  dom.authName.required = false;
  dom.authEmail.closest("label").hidden = false;
  dom.authEmail.required = true;
  dom.authPassword.required = true;
  dom.forgotPasswordButton.hidden = !invite.claimedUid;
  dom.authTitle.textContent = invite.claimedUid ? "Entrar no painel da montagem" : "Cadastrar acesso da montagem";
  dom.authText.textContent = invite.claimedUid
    ? "Use o e-mail e senha cadastrados para este colaborador."
    : "Confira o nome, informe e-mail e senha. Este cadastro ficara vinculado a este link.";
  dom.authSubmit.textContent = invite.claimedUid ? "Entrar no painel" : "Cadastrar e entrar";
}

async function createMountingProfile(user, invite) {
  const profile = {
    nome: invite.nome,
    email: user.email,
    perfil: "montagem",
    ativo: true,
    inviteId: invite.id,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, usersCollection, user.uid), profile);
  await updateDoc(doc(db, invitesCollection, invite.id), {
    claimedUid: user.uid,
    claimedEmail: user.email,
    claimedAt: serverTimestamp(),
    used: true,
  });
  return { uid: user.uid, ...profile };
}

async function enterPanel(user, invite) {
  state.authUser = user;
  state.profile = {
    uid: user.uid,
    nome: invite.nome,
    email: user.email,
    perfil: "montagem",
    ativo: true,
    painelToken: invite.id,
    inviteId: invite.id,
  };
  showPanel(invite);
  subscribeServices();
}

async function handlePanelAuthSubmit(email, password) {
  const invite = state.invite || (await loadPanelInvite());
  if (invite.claimedUid) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    if (credential.user.uid !== invite.claimedUid) {
      await signOut(auth);
      throw new Error("Este e-mail nao pertence ao colaborador deste link.");
    }
    await enterPanel(credential.user, invite);
    return;
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const profile = await createMountingProfile(credential.user, invite);
  const claimedInvite = {
    ...invite,
    claimedUid: credential.user.uid,
    claimedEmail: credential.user.email,
    used: true,
  };
  state.invite = claimedInvite;
  state.profile = profile;
  await enterPanel(credential.user, claimedInvite);
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  clearAuthMessage();
  const email = dom.authEmail.value.trim();
  const password = dom.authPassword.value;
  dom.authSubmit.disabled = true;

  try {
    if (panelMode) {
      await handlePanelAuthSubmit(email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    showAuthMessage(readableAuthError(error), true);
  } finally {
    dom.authSubmit.disabled = false;
  }
}

function readableAuthError(error) {
  const code = error?.code || "";
  if (code.includes("auth/invalid-credential")) return "E-mail ou senha incorretos.";
  if (code.includes("auth/email-already-in-use")) return "Este e-mail ja foi cadastrado.";
  if (code.includes("auth/weak-password")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (code.includes("auth/operation-not-allowed")) return "Ative E-mail/senha no Firebase Authentication.";
  return error?.message || "Nao foi possivel autenticar.";
}

async function handlePasswordReset() {
  clearAuthMessage();
  const email = dom.authEmail.value.trim();
  if (!email) {
    showAuthMessage("Digite o e-mail para receber a recuperacao de senha.", true);
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showAuthMessage("E-mail de recuperacao enviado.");
  } catch (error) {
    showAuthMessage(readableAuthError(error), true);
  }
}

function renderAuthState() {
  dom.authForm.hidden = false;
  dom.authTitle.textContent = "Entrar no sistema";
  dom.authText.textContent = "Greice e Zaratini entram com e-mail e senha cadastrados no Firebase.";
  dom.authSubmit.textContent = "Entrar";
  dom.nameField.hidden = true;
  dom.authName.readOnly = false;
  dom.authName.value = "";
  dom.authName.required = false;
  dom.authEmail.closest("label").hidden = false;
  dom.authEmail.required = true;
  dom.forgotPasswordButton.hidden = false;
}

function showApp() {
  dom.authView.hidden = true;
  dom.appView.hidden = false;
  dom.logoutButton.hidden = false;
  dom.userName.textContent = `${state.profile.nome} - ${roles[state.profile.perfil].label}`;
}

function showPanel(invite) {
  dom.authView.hidden = true;
  dom.appView.hidden = false;
  dom.logoutButton.hidden = false;
  state.profile = {
    uid: state.authUser?.uid || invite.claimedUid || panelToken,
    nome: invite.nome,
    perfil: "montagem",
    ativo: true,
    painelToken: panelToken,
  };
  dom.userName.textContent = `${invite.nome} - Montagem`;
  dom.tabs.forEach((tab) => {
    tab.hidden = !["fila"].includes(tab.dataset.view);
  });
  setView("fila");
}

function showLogin() {
  renderAuthState();
  dom.authView.hidden = false;
  dom.appView.hidden = true;
  dom.logoutButton.hidden = true;
  dom.userName.textContent = "Aguardando login";
  if (state.unsubscribeServices) {
    if (Array.isArray(state.unsubscribeServices)) {
      state.unsubscribeServices.forEach((unsubscribe) => unsubscribe());
    } else {
      state.unsubscribeServices();
    }
    state.unsubscribeServices = null;
  }
  if (state.unsubscribeTeam) {
    state.unsubscribeTeam();
    state.unsubscribeTeam = null;
  }
  if (state.unsubscribeInvites) {
    state.unsubscribeInvites();
    state.unsubscribeInvites = null;
  }
  state.authUser = null;
  state.profile = null;
  state.services = [];
  state.team = [];
  state.invites = [];
}

function mountingTokenOf(service) {
  return service?.assignedMountingToken || service?.assignedMountingUid || "";
}

function panelServiceRef(token, serviceId) {
  return doc(db, invitesCollection, token, servicesCollection, serviceId);
}

function panelServiceData(service) {
  const { id, ...data } = service;
  return data;
}

function runInBackground(task, label = "Operacao em segundo plano") {
  window.setTimeout(() => {
    task().catch((error) => {
      console.error(label, error);
    });
  }, 0);
}

async function writePanelMirror(serviceId, service) {
  const token = mountingTokenOf(service);
  if (!token) return;
  await setDoc(panelServiceRef(token, serviceId), panelServiceData({ ...service, id: serviceId }), { merge: true });
}

async function removePanelMirror(token, serviceId) {
  if (!token || !serviceId) return;
  await deleteDoc(panelServiceRef(token, serviceId));
}

async function syncPanelMirrors(services) {
  if (!currentRole().canEditService || state.panelMirrorSyncQueued) return;
  const assignedServices = services.filter((service) => mountingTokenOf(service));
  if (!assignedServices.length) return;
  state.panelMirrorSyncQueued = true;
  runInBackground(async () => {
    for (const service of assignedServices) {
      await writePanelMirror(service.id, service);
    }
  }, "Sincronizacao do painel de montagem");
}

function subscribeServices() {
  if (Array.isArray(state.unsubscribeServices)) {
    state.unsubscribeServices.forEach((unsubscribe) => unsubscribe());
    state.unsubscribeServices = null;
  } else if (state.unsubscribeServices) {
    state.unsubscribeServices();
    state.unsubscribeServices = null;
  }
  if (panelMode) {
    const panelServices = query(collection(db, invitesCollection, panelToken, servicesCollection));
    const byInviteToken = query(collection(db, servicesCollection), where("assignedMountingToken", "==", panelToken));
    const byUserUid = state.authUser?.uid
      ? query(collection(db, servicesCollection), where("assignedMountingUid", "==", state.authUser.uid))
      : null;
    const buckets = new Map();
    const sync = (snapshot) => {
      snapshot.docs.forEach((item) => buckets.set(item.id, { id: item.id, ...item.data() }));
      state.services = Array.from(buckets.values());
      render();
    };
    state.unsubscribeServices = [
      onSnapshot(panelServices, sync, (error) => showAuthMessage(`Erro ao ler painel: ${error.message}`, true)),
      onSnapshot(byInviteToken, sync, (error) => showAuthMessage(`Erro ao ler OS: ${error.message}`, true)),
    ].concat(byUserUid ? [onSnapshot(byUserUid, sync, (error) => showAuthMessage(`Erro ao ler OS: ${error.message}`, true))] : []);
    return;
  }
  const q =
    state.profile?.perfil === "montagem"
      ? query(collection(db, servicesCollection), where("assignedMountingUid", "==", state.authUser.uid))
      : query(collection(db, servicesCollection));
  state.unsubscribeServices = onSnapshot(
    q,
    (snapshot) => {
      state.services = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      syncPanelMirrors(state.services);
      render();
    },
    (error) => showAuthMessage(`Erro ao ler OS: ${error.message}`, true)
  );
}

function subscribeTeam() {
  if (state.unsubscribeTeam) state.unsubscribeTeam();
  if (state.unsubscribeInvites) state.unsubscribeInvites();
  if (!currentRole().canEditService) return;

  state.unsubscribeTeam = onSnapshot(query(collection(db, invitesCollection), where("perfil", "==", "montagem")), (snapshot) => {
    state.team = snapshot.docs.map((item) => ({ uid: item.id, token: item.id, ...item.data() }));
    renderTeam();
    renderMountingSelect();
  });

  state.unsubscribeInvites = onSnapshot(collection(db, invitesCollection), (snapshot) => {
    state.invites = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderTeam();
  });
}

function renderPermissionBanner() {
  const messages = {
    comercial: "Acesso total: cria, edita, exclui, conclui etapas e define Super Prioridade.",
    projetista: "Acesso total: cria, edita, exclui e conclui etapas. Super Prioridade tambem liberada conforme regra de acesso total.",
    montagem: "Painel de montagem: apenas trabalhos atribuidos a este colaborador.",
  };
  dom.permissionBanner.textContent = messages[state.profile?.perfil] || "";
  dom.permissionBanner.hidden = false;
  dom.tabs.forEach((tab) => {
    if (tab.dataset.view === "nova") {
      tab.disabled = !currentRole().canCreate && !currentRole().canEditService;
    }
    if (tab.dataset.view === "equipe") {
      tab.disabled = !currentRole().canEditService;
    }
  });
}

function setFormBusy(isBusy, label = "Salvando...") {
  state.formBusy = isBusy;
  if (isBusy) {
    dom.saveButton.dataset.defaultText = dom.saveButton.dataset.defaultText || dom.saveButton.textContent;
    dom.saveButton.textContent = label;
  } else {
    dom.saveButton.textContent = dom.saveButton.dataset.defaultText || "Salvar OS";
  }
  setFieldLocking();
}

function renderMountingSelect() {
  const currentValue = dom.assignedMountingUid.value;
  const activeTeam = state.team.filter((member) => member.ativo !== false);
  dom.assignedMountingUid.innerHTML = '<option value="">Sem montador definido</option>';
  activeTeam.forEach((member) => {
    const option = document.createElement("option");
    option.value = member.token;
    option.textContent = member.nome;
    dom.assignedMountingUid.append(option);
  });
  dom.assignedMountingUid.value = activeTeam.some((member) => member.token === currentValue) ? currentValue : "";
}

function renderTeam() {
  if (!dom.teamList) return;
  if (!currentRole().canEditService) {
    dom.teamList.innerHTML = "";
    return;
  }
  const items = state.team
    .map(
      (member) => {
        const status = member.ativo === false ? "Inativo" : member.claimedUid ? "Cadastrado" : "Convite pendente";
        const accessInfo = member.claimedEmail || buildInviteLink(member.token);
        return `
          <div class="audit-item team-item">
            <span>
              <strong>${member.nome}</strong>
              <span>${status} | ${assignedCountFor(member.token)} OS atribuida(s)</span>
              <span>${accessInfo}</span>
            </span>
            <button class="small-button danger-outline" data-action="remove-member" data-id="${member.token}" type="button">Excluir usuario</button>
          </div>
        `;
      }
    )
    .join("");
  dom.teamList.innerHTML =
    items
      ? items
      : '<div class="empty-state"><strong>Nenhum montador cadastrado.</strong><span>Gere um link exclusivo para o primeiro colaborador.</span></div>';
}

function assignedCountFor(token) {
  return state.services.filter((service) => service.assignedMountingToken === token).length;
}

function renderSummary() {
  const urgent = state.services.filter((service) => service.superPriority && statusOf(service) !== "Concluido").length;
  const inProject = state.services.filter((service) => statusOf(service) === "Em projeto").length;
  const inMounting = state.services.filter((service) => statusOf(service) === "Em montagem").length;
  const done = state.services.filter((service) => statusOf(service) === "Concluido").length;
  dom.queueSummary.innerHTML = [
    ["Urgentes hoje", urgent],
    ["Em projeto", inProject],
    ["Em montagem", inMounting],
    ["Concluidas", done],
  ]
    .map(([label, value]) => `<div class="summary-item"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");
}

function sortedServices() {
  return [...state.services].sort((a, b) => {
    if (a.superPriority !== b.superPriority) return a.superPriority ? -1 : 1;
    return String(a.deliveryDate || "").localeCompare(String(b.deliveryDate || ""));
  });
}

function filteredServices() {
  const queryText = state.search.trim().toLowerCase();
  return sortedServices().filter((service) => {
    const matchesStatus = state.status === "todos" || statusOf(service) === state.status;
    const haystack = [service.id, service.clientName, service.productType, service.notes].join(" ").toLowerCase();
    return matchesStatus && (!queryText || haystack.includes(queryText));
  });
}

function renderServiceList() {
  const services = filteredServices();
  dom.serviceList.innerHTML = "";
  if (!services.length) {
    dom.serviceList.append(dom.emptyTemplate.content.cloneNode(true));
    return;
  }

  services.forEach((service) => {
    const card = document.createElement("article");
    card.className = `service-card${service.superPriority ? " is-priority" : ""}`;
    card.innerHTML = `
      <div class="service-main">
        <div class="service-title">
          <h3>${service.osNumber || service.id} - ${service.clientName}</h3>
          ${service.superPriority ? '<span class="tag priority">Prioridade hoje</span>' : ""}
          <span class="tag">${statusOf(service)}</span>
        </div>
        <div class="service-meta">
          <span>${service.productType}</span>
          <span>Entrega: ${formatDate(service.deliveryDate)}</span>
          <span>Montagem: ${service.assignedMountingName || "sem responsavel"}</span>
          <span>${progress(service)}% concluido</span>
        </div>
        <div class="progress-line" aria-label="Progresso ${progress(service)}%">
          <span style="width: ${progress(service)}%"></span>
        </div>
      </div>
      <div class="card-actions">
        <button class="small-button" data-action="open" data-id="${service.id}" type="button">Abrir</button>
        ${
          currentRole().canEditService
            ? `<button class="small-button" data-action="edit" data-id="${service.id}" type="button">Editar</button>`
            : ""
        }
      </div>
    `;
    dom.serviceList.append(card);
  });
}

function buildInviteLink(token) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("painel", token);
  url.searchParams.set("v", APP_VERSION);
  return url.toString();
}

function selectedMountingMember(token) {
  return state.team.find((member) => member.token === token);
}

async function createInvite(event) {
  event.preventDefault();
  if (!currentRole().canEditService) return;
  const name = dom.inviteName.value.trim();
  if (!name) return;
  const token = crypto.randomUUID();
  await setDoc(doc(db, invitesCollection, token), {
    nome: name,
    perfil: "montagem",
    ativo: true,
    createdByUid: state.authUser.uid,
    createdByName: state.profile.nome,
    createdAt: serverTimestamp(),
  });
  const link = buildInviteLink(token);
  dom.inviteResult.hidden = false;
  dom.inviteResult.innerHTML = `<strong>Link exclusivo de ${name}</strong><br><input readonly value="${link}" onclick="this.select()">`;
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    // Clipboard can be blocked by the browser; the link remains selectable.
  }
  dom.inviteName.value = "";
}

async function removeMember(uid) {
  if (!currentRole().canDelete) return;
  const member = state.team.find((item) => item.uid === uid);
  if (!member) return;
  const assigned = assignedCountFor(uid);
  const detail = assigned ? ` Ele tem ${assigned} OS atribuida(s); elas ficarao sem responsavel.` : "";
  if (!confirm(`Excluir usuario ${member.nome}?${detail}`)) return;

  const updates = state.services
    .filter((service) => service.assignedMountingToken === uid)
    .map((service) => {
      runInBackground(() => removePanelMirror(uid, service.id), "Remocao do painel de usuario excluido");
      return updateDoc(doc(db, servicesCollection, service.id), {
        assignedMountingUid: "",
        assignedMountingToken: "",
        assignedMountingName: "",
        updatedAt: serverTimestamp(),
      });
    });
  await Promise.all(updates);
  await updateDoc(doc(db, invitesCollection, uid), {
    ativo: false,
    removedAt: serverTimestamp(),
    removedByUid: state.authUser.uid,
    removedByName: state.profile.nome,
  });
}

function setFieldLocking() {
  const role = currentRole();
  const fields = [dom.clientName, dom.productType, dom.deliveryDate, dom.dimensions, dom.notes, dom.attachments];
  fields.forEach((field) => {
    field.disabled = state.formBusy || !role.canEditService;
  });
  dom.assignedMountingUid.disabled = state.formBusy || !role.canEditService;
  dom.superPriority.disabled = state.formBusy || !role.canSetPriority;
  dom.saveButton.disabled = state.formBusy || (!role.canCreate && !role.canEditService);
  dom.deleteButton.disabled = state.formBusy || !role.canDelete;
}

function resetForm() {
  dom.form.reset();
  dom.editingId.value = "";
  dom.deliveryDate.value = todayIso();
  dom.deleteButton.hidden = true;
  state.pastedAttachments = [];
  resetProcessDefaults();
  renderAttachmentPreview();
  setFieldLocking();
}

function serviceFromForm(existing) {
  const type = dom.productType.value;
  const projectLabels = getSelectedProcesses("project");
  const mountingLabels = getSelectedProcesses("mounting");
  const mountingToken = dom.assignedMountingUid.value || "";
  const mountingMember = selectedMountingMember(mountingToken);
  const keepSteps = existing && existing.productType === type;
  const keepByLabel = (steps, labels) =>
    labels.map((label) => {
      const previous = (steps || []).find((step) => step.label === label);
      return previous || makeSteps([label])[0];
    });
  return {
    osNumber: existing?.osNumber || `OS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    clientName: dom.clientName.value.trim(),
    productType: type,
    deliveryDate: dom.deliveryDate.value,
    superPriority: dom.superPriority.checked,
    dimensions: dom.dimensions.value.trim(),
    notes: dom.notes.value.trim(),
    attachments: [
      ...(existing?.attachments || []).map(normalizeAttachment),
      ...Array.from(dom.attachments.files || []).map((file) => ({ name: file.name, source: "file", dataUrl: null })),
      ...state.pastedAttachments,
    ],
    assignedMountingUid: mountingMember?.claimedUid || mountingToken,
    assignedMountingToken: mountingToken,
    assignedMountingName: mountingMember?.nome || "",
    createdBy: existing?.createdBy || state.profile.nome,
    createdByUid: existing?.createdByUid || state.authUser.uid,
    createdAt: existing?.createdAt || timestamp(),
    updatedAt: timestamp(),
    project: keepSteps ? keepByLabel(existing.project, projectLabels) : makeSteps(projectLabels),
    mounting: keepSteps ? keepByLabel(existing.mounting, mountingLabels) : makeSteps(mountingLabels),
  };
}

function editService(id) {
  const service = state.services.find((item) => item.id === id);
  if (!service || !currentRole().canEditService) return;
  dom.editingId.value = service.id;
  dom.clientName.value = service.clientName || "";
  dom.productType.value = service.productType || "Logo em Acrilico";
  dom.deliveryDate.value = service.deliveryDate || todayIso();
  dom.dimensions.value = service.dimensions || "";
  dom.notes.value = service.notes || "";
  state.pastedAttachments = [];
  setSelectedProcesses("project", (service.project || []).map((step) => step.label));
  setSelectedProcesses("mounting", (service.mounting || []).map((step) => step.label));
  renderAttachmentPreview(service.attachments || []);
  renderMountingSelect();
  dom.assignedMountingUid.value = service.assignedMountingToken || service.assignedMountingUid || "";
  dom.superPriority.checked = Boolean(service.superPriority);
  dom.deleteButton.hidden = !currentRole().canDelete;
  setView("nova");
  setFieldLocking();
}

async function saveForm(event) {
  event.preventDefault();
  if (state.formBusy) return;
  const role = currentRole();
  const existing = state.services.find((service) => service.id === dom.editingId.value);
  if (!existing && !role.canCreate) return alert("Seu perfil nao pode criar novas ordens de servico.");
  if (existing && !role.canEditService) return alert("Seu perfil nao pode editar campos desta OS.");

  setFormBusy(true, "Salvando...");
  try {
    const service = serviceFromForm(existing);
    if (existing) {
      await updateDoc(doc(db, servicesCollection, existing.id), { ...service, updatedAt: serverTimestamp() });
      const previousToken = mountingTokenOf(existing);
      const nextToken = mountingTokenOf(service);
      runInBackground(async () => {
        if (previousToken && previousToken !== nextToken) await removePanelMirror(previousToken, existing.id);
        if (nextToken) await writePanelMirror(existing.id, service);
      }, "Atualizacao do painel de montagem");
    } else {
      const created = await addDoc(collection(db, servicesCollection), { ...service, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      runInBackground(async () => {
        if (mountingTokenOf(service)) await writePanelMirror(created.id, service);
      }, "Criacao do painel de montagem");
    }
    resetForm();
    setView("fila");
  } catch (error) {
    alert(`Nao foi possivel salvar a OS: ${error.message}`);
  } finally {
    setFormBusy(false);
  }
}

async function deleteCurrentService() {
  if (state.formBusy) return;
  if (!currentRole().canDelete) return;
  const id = dom.editingId.value;
  if (!id) return;
  const service = state.services.find((item) => item.id === id);
  const label = service?.osNumber || id;
  if (!confirm(`Excluir a ${label}?`)) return;
  setFormBusy(true, "Excluindo...");
  try {
    await deleteDoc(doc(db, servicesCollection, id));
    runInBackground(() => removePanelMirror(mountingTokenOf(service), id), "Remocao do painel de montagem");
    resetForm();
    setView("fila");
  } catch (error) {
    alert(`Nao foi possivel excluir a OS: ${error.message}`);
  } finally {
    setFormBusy(false);
  }
}

function canToggleStep(group) {
  if (group === "project") return currentRole().canCompleteProject;
  return currentRole().canCompleteMounting;
}

async function toggleStep(serviceId, group, stepId, checked) {
  const service = state.services.find((item) => item.id === serviceId);
  if (!service || !canToggleStep(group)) return;
  const nextSteps = service[group].map((step) => {
    if (step.id !== stepId) return step;
    if (step.done && !checked && state.profile.perfil === "montagem") {
      alert("Etapas concluidas pela montagem nao podem ser desmarcadas por este perfil.");
      return step;
    }
    return {
      ...step,
      done: checked,
      timestamp: checked ? timestamp() : null,
      operator: checked ? state.profile.nome : null,
      operatorUid: checked ? state.authUser?.uid || null : null,
      operatorToken: checked ? state.profile.painelToken || null : null,
    };
  });
  const nextService = { ...service, [group]: nextSteps };
  const nextStatus = statusOf(nextService);
  const update = {
    [group]: nextSteps,
    updatedAt: serverTimestamp(),
  };
  if (nextStatus === "Concluido" && !panelMode && state.profile.perfil !== "montagem") update.superPriority = false;
  if (panelMode) {
    state.services = state.services.map((item) => (item.id === serviceId ? nextService : item));
    await updateDoc(panelServiceRef(panelToken, serviceId), { [group]: nextSteps, updatedAt: timestamp() });
    runInBackground(() => updateDoc(doc(db, servicesCollection, serviceId), update), "Atualizacao da OS principal pela montagem");
    return;
  }
  await updateDoc(doc(db, servicesCollection, serviceId), update);
  runInBackground(() => writePanelMirror(serviceId, nextService), "Atualizacao do painel de montagem");
}

function renderChecklist(service, group, title) {
  return `
    <div class="detail-box wide">
      <h3>${title}</h3>
      <div class="checklist">
        ${(service[group] || [])
          .map(
            (step) => `
              <label class="step-row">
                <input
                  type="checkbox"
                  data-service="${service.id}"
                  data-group="${group}"
                  data-step="${step.id}"
                  ${step.done ? "checked" : ""}
                  ${canToggleStep(group) ? "" : "disabled"}
                >
                <span>
                  <strong>${step.label}</strong>
                  <span>${step.done ? `Concluido por ${step.operator} em ${formatDateTime(step.timestamp)}` : "Pendente"}</span>
                </span>
              </label>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function showDetail(id) {
  const service = state.services.find((item) => item.id === id);
  if (!service) return;
  dom.detail.innerHTML = `
    <div class="detail-header">
      <div>
        <p class="eyebrow">${service.productType}</p>
        <h2>${service.osNumber || service.id} - ${service.clientName}</h2>
      </div>
      <div>
        ${service.superPriority ? '<span class="tag priority">Prioridade hoje</span>' : ""}
        <span class="tag">${statusOf(service)}</span>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-box"><strong>Entrega</strong><br>${formatDate(service.deliveryDate)}</div>
      <div class="detail-box"><strong>Medidas</strong><br>${service.dimensions || "Nao informado"}</div>
      <div class="detail-box wide"><strong>Responsavel pela montagem</strong><br>${service.assignedMountingName || "Sem montador definido"}</div>
      <div class="detail-box wide"><strong>Observacoes</strong><br>${service.notes || "Sem observacoes"}</div>
      <div class="detail-box wide"><strong>Anexos</strong><br>${renderAttachmentsDetail(service.attachments || [])}</div>
      ${renderChecklist(service, "project", "Fase 1 - Projeto")}
      ${renderChecklist(service, "mounting", "Fase 2 - Montagem")}
    </div>
  `;
  dom.detail.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.addEventListener("change", async (event) => {
      await toggleStep(event.target.dataset.service, event.target.dataset.group, event.target.dataset.step, event.target.checked);
      showDetail(event.target.dataset.service);
    });
  });
  if (!dom.dialog.open) dom.dialog.showModal();
}

function renderAttachmentsDetail(attachments) {
  if (!attachments.length) return "Nenhum arquivo registrado";
  return `
    <div class="attachment-detail-grid">
      ${attachments
        .map(normalizeAttachment)
        .map((item) => {
          const image = item.dataUrl ? `<img src="${item.dataUrl}" alt="${item.name}">` : "";
          return `<div class="attachment-detail">${image}<span>${item.name}</span></div>`;
        })
        .join("")}
    </div>
  `;
}

function setView(name) {
  state.view = name;
  dom.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === name));
  dom.views.forEach((view) => view.classList.toggle("is-active", view.id === `view-${name}`));
}

function renderCalendar() {
  const [year, month] = dom.monthPicker.value.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;
  const html = [];
  for (let cell = 0; cell < totalCells; cell += 1) {
    const day = cell - startDay + 1;
    const valid = day >= 1 && day <= daysInMonth;
    const date = valid ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
    const services = valid ? state.services.filter((service) => service.deliveryDate === date) : [];
    html.push(`
      <div class="calendar-day${valid ? "" : " is-muted"}">
        <span class="day-number">${valid ? day : ""}</span>
        ${services
          .map(
            (service) =>
              `<button class="calendar-pill${service.superPriority ? " is-priority" : ""}" data-action="open" data-id="${service.id}" type="button">${service.osNumber || service.id} - ${service.clientName}</button>`
          )
          .join("")}
      </div>
    `);
  }
  dom.calendarGrid.innerHTML = html.join("");
}

function renderMetrics() {
  const completedSteps = state.services.flatMap((service) =>
    allSteps(service)
      .filter((step) => step.done)
      .map((step) => ({ service, step }))
  );
  const completedServices = state.services.filter((service) => statusOf(service) === "Concluido").length;
  const percent = state.services.length ? Math.round((completedServices / state.services.length) * 100) : 0;
  dom.metricsGrid.innerHTML = [
    ["OS cadastradas", state.services.length],
    ["Etapas auditadas", completedSteps.length],
    ["OS finalizadas", completedServices],
    ["Conclusao geral", `${percent}%`],
  ]
    .map(([label, value]) => `<div class="summary-item"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");

  const auditItems = completedSteps
    .sort((a, b) => dateMillis(b.step.timestamp) - dateMillis(a.step.timestamp))
    .map(
      ({ service, step }) => `
        <div class="audit-item">
          <strong>${service.osNumber || service.id} - ${step.label}</strong>
          <span>${service.clientName} | ${step.operator} | ${formatDateTime(step.timestamp)}</span>
        </div>
      `
    );
  dom.auditList.innerHTML = auditItems.length
    ? auditItems.join("")
    : '<div class="empty-state"><strong>Nenhuma etapa concluida ainda.</strong><span>Os timestamps aparecem aqui automaticamente.</span></div>';
}

function exportJson() {
  const payload = JSON.stringify(state.services, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `os-digital-${todayIso()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function render() {
  renderPermissionBanner();
  renderSummary();
  renderServiceList();
  renderCalendar();
  renderMetrics();
  setFieldLocking();
}

function bindEvents() {
  dom.authForm.addEventListener("submit", handleAuthSubmit);
  dom.forgotPasswordButton.addEventListener("click", handlePasswordReset);
  dom.logoutButton.addEventListener("click", () => {
    signOut(auth).finally(() => {
      if (panelMode) window.location.reload();
    });
  });

  dom.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (!tab.disabled) setView(tab.dataset.view);
    });
  });

  dom.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderServiceList();
  });

  dom.productType.addEventListener("change", () => {
    if (!dom.editingId.value) resetProcessDefaults();
  });

  dom.statusFilter.addEventListener("change", (event) => {
    state.status = event.target.value;
    renderServiceList();
  });

  document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const { action, id } = actionButton.dataset;
    if (action === "open") showDetail(id);
    if (action === "edit") editService(id);
    if (action === "remove-member") removeMember(id);
    if (action === "remove-paste") {
      state.pastedAttachments.splice(Number(id), 1);
      const existing = state.services.find((service) => service.id === dom.editingId.value)?.attachments || [];
      renderAttachmentPreview(existing);
    }
  });

  dom.form.addEventListener("submit", saveForm);
  dom.form.addEventListener("paste", handlePaste);
  dom.pasteZone.addEventListener("paste", handlePaste);
  dom.pasteZone.addEventListener("click", () => dom.pasteZone.focus());
  dom.inviteForm.addEventListener("submit", createInvite);
  dom.deleteButton.addEventListener("click", deleteCurrentService);
  dom.resetFormButton.addEventListener("click", resetForm);
  dom.monthPicker.addEventListener("change", renderCalendar);
  dom.exportButton.addEventListener("click", exportJson);
}

async function seedFirstServicesIfEmpty() {
  if (!currentRole().canCreate) return;
  const snapshot = await getDocs(collection(db, servicesCollection));
  if (!snapshot.empty) return;
  await addDoc(collection(db, servicesCollection), {
    osNumber: "OS-2026-X89",
    clientName: "Restaurante Gourmet S/A",
    productType: "Logo 3D com LED",
    deliveryDate: "2026-06-15",
    superPriority: true,
    dimensions: "300cm x 80cm",
    notes: "Fixacao em estrutura metalica existente.",
    attachments: ["logo-restaurante.svg", "fachada-referencia.jpg"],
    assignedMountingUid: "",
    assignedMountingToken: "",
    assignedMountingName: "",
    createdBy: state.profile.nome,
    createdByUid: state.authUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    project: makeSteps(workflows["Logo 3D com LED"].project),
    mounting: makeSteps(workflows["Logo 3D com LED"].mounting),
  });
}

function initFirebase() {
  renderAuthState();
  if (!hasValidFirebaseConfig()) {
    showAuthMessage("Configure o arquivo firebase.config.js com as credenciais do projeto Firebase antes de usar o login.", true);
    dom.authSubmit.disabled = true;
    return;
  }
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);

  if (panelMode) {
    dom.authTitle.textContent = "Carregando convite";
    dom.authText.textContent = "Validando o link exclusivo da montagem.";
    dom.authForm.hidden = true;
    loadPanelInvite()
      .then((invite) => {
        renderPanelAuthState(invite);
        onAuthStateChanged(auth, async (user) => {
          if (!user || !invite.claimedUid || user.uid !== invite.claimedUid) return;
          await enterPanel(user, invite);
        });
      })
      .catch((error) => {
        showAuthMessage(error.message, true);
        dom.authSubmit.disabled = true;
      });
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    clearAuthMessage();
    if (!user) {
      showLogin();
      return;
    }
    try {
      state.authUser = user;
      state.profile = await ensureUserProfile(user);
      showApp();
      resetForm();
      await seedFirstServicesIfEmpty();
      subscribeTeam();
      subscribeServices();
    } catch (error) {
      await signOut(auth);
      showLogin();
      showAuthMessage(error.message, true);
    }
  });
}

function init() {
  renderProcessOptions();
  bindEvents();
  dom.deliveryDate.value = todayIso();
  dom.monthPicker.value = todayIso().slice(0, 7);
  resetProcessDefaults();
  renderAttachmentPreview();
  initFirebase();
  if ("serviceWorker" in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    navigator.serviceWorker
      .register(`sw.js?v=${APP_VERSION}`)
      .then((registration) => registration.update())
      .catch(() => {});
  }
}

init();
