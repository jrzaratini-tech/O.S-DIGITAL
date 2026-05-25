const STORAGE_KEY = "os-digital-services-v1";
const ROLE_KEY = "os-digital-role";

const roles = {
  comercial: {
    name: "Greice",
    title: "Comercial",
    canCreate: true,
    canDelete: true,
    canEditService: true,
    canSetPriority: true,
    canCompleteProject: true,
    canCompleteMounting: true,
  },
  projetista: {
    name: "Zaratini",
    title: "Projetista",
    canCreate: false,
    canDelete: false,
    canEditService: true,
    canSetPriority: false,
    canCompleteProject: true,
    canCompleteMounting: true,
  },
  montagem: {
    name: "Joao",
    title: "Montagem",
    canCreate: false,
    canDelete: false,
    canEditService: false,
    canSetPriority: false,
    canCompleteProject: false,
    canCompleteMounting: true,
  },
};

const workflows = {
  "Luz Frontal": {
    project: ["Vetorizacao e Arte", "Modelagem 3D", "Impressao do Gabarito"],
    mounting: [
      "Corte dos Metais (Lata/Galvanizado)",
      "Pintura do Fundo Interno da Letra",
      "Insercao do LED e Soldagem dos Circuitos",
      "Aplicacao de Vedacao",
      "Corte a Laser do Acrilico da Face",
      "Pintura e Acabamento Externo",
    ],
  },
  "Logo Flutuante": {
    project: ["Vetorizacao", "Envio do Arquivo para Router CNC"],
    mounting: [
      "Execucao do Corte na Router CNC",
      "Acabamento/Lixamento das Bordas",
      "Pintura Geral de Superficie",
      "Fixacao dos Pinos/Espacadores",
    ],
  },
  Neon: {
    project: ["Vetorizacao do Tracado", "Usinagem da Canaleta na Router CNC"],
    mounting: [
      "Limpeza da Peca",
      "Insercao do LED Neon Flexivel nas Canaletas",
      "Soldagem dos Cabos de Alimentacao",
      "Colocacao da Borracha de Acabamento Perimetral",
    ],
  },
};

const state = {
  services: [],
  role: localStorage.getItem(ROLE_KEY) || "comercial",
  view: "fila",
  search: "",
  status: "todos",
};

const dom = {
  roleSelect: document.querySelector("#roleSelect"),
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
  superPriority: document.querySelector("#superPriority"),
  deleteButton: document.querySelector("#deleteButton"),
  resetFormButton: document.querySelector("#resetFormButton"),
  monthPicker: document.querySelector("#monthPicker"),
  calendarGrid: document.querySelector("#calendarGrid"),
  metricsGrid: document.querySelector("#metricsGrid"),
  auditList: document.querySelector("#auditList"),
  exportButton: document.querySelector("#exportButton"),
  dialog: document.querySelector("#serviceDialog"),
  detail: document.querySelector("#serviceDetail"),
  emptyTemplate: document.querySelector("#emptyStateTemplate"),
};

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
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
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
  }));
}

function seedServices() {
  const baseDate = todayIso();
  return [
    {
      id: "OS-2026-X89",
      clientName: "Restaurante Gourmet S/A",
      productType: "Luz Frontal",
      deliveryDate: "2026-06-15",
      superPriority: true,
      dimensions: "300cm x 80cm",
      notes: "Fixacao em estrutura metalica existente.",
      attachments: ["logo-restaurante.svg", "fachada-referencia.jpg"],
      createdBy: "Greice",
      createdAt: "2026-05-25T08:00:00.000Z",
      updatedAt: "2026-05-25T11:00:00.000Z",
      project: makeSteps(workflows["Luz Frontal"].project),
      mounting: makeSteps(workflows["Luz Frontal"].mounting),
    },
    {
      id: "OS-2026-102",
      clientName: "Clinica Horizonte",
      productType: "Logo Flutuante",
      deliveryDate: baseDate,
      superPriority: false,
      dimensions: "180cm x 120cm",
      notes: "Logo em ACM com afastadores pretos.",
      attachments: ["marca-clinica.pdf"],
      createdBy: "Greice",
      createdAt: timestamp(),
      updatedAt: timestamp(),
      project: makeSteps(workflows["Logo Flutuante"].project),
      mounting: makeSteps(workflows["Logo Flutuante"].mounting),
    },
    {
      id: "OS-2026-103",
      clientName: "Bar Aurora",
      productType: "Neon",
      deliveryDate: "2026-06-03",
      superPriority: false,
      dimensions: "220cm x 60cm",
      notes: "Neon flexivel vermelho com base acrilica transparente.",
      attachments: [],
      createdBy: "Greice",
      createdAt: timestamp(),
      updatedAt: timestamp(),
      project: makeSteps(workflows.Neon.project),
      mounting: makeSteps(workflows.Neon.mounting),
    },
  ];
}

function loadServices() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    state.services = seedServices();
    saveServices();
    return;
  }
  try {
    state.services = JSON.parse(stored);
  } catch {
    state.services = seedServices();
    saveServices();
  }
}

function saveServices() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.services));
}

function currentRole() {
  return roles[state.role];
}

function allSteps(service) {
  return [...service.project, ...service.mounting];
}

function progress(service) {
  const steps = allSteps(service);
  if (!steps.length) return 0;
  return Math.round((steps.filter((step) => step.done).length / steps.length) * 100);
}

function statusOf(service) {
  const projectDone = service.project.every((step) => step.done);
  const mountingDone = service.mounting.every((step) => step.done);
  if (mountingDone && projectDone) return "Concluído";
  if (projectDone) return "Em montagem";
  if (service.project.some((step) => step.done)) return "Em projeto";
  return "Aguardando projeto";
}

function sortedServices() {
  return [...state.services].sort((a, b) => {
    if (a.superPriority !== b.superPriority) return a.superPriority ? -1 : 1;
    return a.deliveryDate.localeCompare(b.deliveryDate);
  });
}

function filteredServices() {
  const query = state.search.trim().toLowerCase();
  return sortedServices().filter((service) => {
    const matchesStatus = state.status === "todos" || statusOf(service) === state.status;
    const haystack = [service.id, service.clientName, service.productType, service.notes].join(" ").toLowerCase();
    return matchesStatus && (!query || haystack.includes(query));
  });
}

function renderPermissionBanner() {
  const role = currentRole();
  const messages = {
    comercial: "Acesso total: cria, edita, exclui e define a fila de Super Prioridade.",
    projetista: "Projetista: edita campos e conclui etapas de projeto, sem criar, excluir ou mudar prioridade.",
    montagem: "Montagem: somente conclui etapas de montagem. Campos comerciais e de projeto ficam blindados.",
  };
  dom.permissionBanner.textContent = messages[state.role];
  dom.permissionBanner.hidden = false;
  dom.tabs.forEach((tab) => {
    if (tab.dataset.view === "nova") {
      tab.disabled = !role.canCreate && !role.canEditService;
    }
  });
}

function renderSummary() {
  const urgent = state.services.filter((service) => service.superPriority && statusOf(service) !== "Concluído").length;
  const inProject = state.services.filter((service) => statusOf(service) === "Em projeto").length;
  const inMounting = state.services.filter((service) => statusOf(service) === "Em montagem").length;
  const done = state.services.filter((service) => statusOf(service) === "Concluído").length;
  dom.queueSummary.innerHTML = [
    ["Urgentes hoje", urgent],
    ["Em projeto", inProject],
    ["Em montagem", inMounting],
    ["Concluídas", done],
  ]
    .map(([label, value]) => `<div class="summary-item"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");
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
          <h3>${service.id} - ${service.clientName}</h3>
          ${service.superPriority ? '<span class="tag priority">Prioridade hoje</span>' : ""}
          <span class="tag">${statusOf(service)}</span>
        </div>
        <div class="service-meta">
          <span>${service.productType}</span>
          <span>Entrega: ${formatDate(service.deliveryDate)}</span>
          <span>${progress(service)}% concluído</span>
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

function setFieldLocking() {
  const role = currentRole();
  const fields = [dom.clientName, dom.productType, dom.deliveryDate, dom.dimensions, dom.notes, dom.attachments];
  fields.forEach((field) => {
    field.disabled = !role.canEditService;
  });
  dom.superPriority.disabled = !role.canSetPriority;
  dom.form.querySelector(".primary-button").disabled = !role.canCreate && !role.canEditService;
}

function resetForm() {
  dom.form.reset();
  dom.editingId.value = "";
  dom.deliveryDate.value = todayIso();
  dom.deleteButton.hidden = true;
  setFieldLocking();
}

function serviceFromForm(existing) {
  const type = dom.productType.value;
  const keepSteps = existing && existing.productType === type;
  return {
    id: existing?.id || `OS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    clientName: dom.clientName.value.trim(),
    productType: type,
    deliveryDate: dom.deliveryDate.value,
    superPriority: dom.superPriority.checked,
    dimensions: dom.dimensions.value.trim(),
    notes: dom.notes.value.trim(),
    attachments: [
      ...(existing?.attachments || []),
      ...Array.from(dom.attachments.files || []).map((file) => file.name),
    ],
    createdBy: existing?.createdBy || currentRole().name,
    createdAt: existing?.createdAt || timestamp(),
    updatedAt: timestamp(),
    project: keepSteps ? existing.project : makeSteps(workflows[type].project),
    mounting: keepSteps ? existing.mounting : makeSteps(workflows[type].mounting),
  };
}

function editService(id) {
  const service = state.services.find((item) => item.id === id);
  if (!service) return;
  dom.editingId.value = service.id;
  dom.clientName.value = service.clientName;
  dom.productType.value = service.productType;
  dom.deliveryDate.value = service.deliveryDate;
  dom.dimensions.value = service.dimensions;
  dom.notes.value = service.notes;
  dom.superPriority.checked = service.superPriority;
  dom.deleteButton.hidden = !currentRole().canDelete;
  setView("nova");
  setFieldLocking();
}

function saveForm(event) {
  event.preventDefault();
  const role = currentRole();
  const existing = state.services.find((service) => service.id === dom.editingId.value);
  if (!existing && !role.canCreate) {
    alert("Seu perfil nao pode criar novas ordens de servico.");
    return;
  }
  if (existing && !role.canEditService) {
    alert("Seu perfil nao pode editar campos desta OS.");
    return;
  }
  const service = serviceFromForm(existing);
  if (existing && !role.canSetPriority) {
    service.superPriority = existing.superPriority;
  }
  if (existing) {
    state.services = state.services.map((item) => (item.id === existing.id ? service : item));
  } else {
    state.services.push(service);
  }
  saveServices();
  resetForm();
  setView("fila");
  render();
}

function deleteCurrentService() {
  if (!currentRole().canDelete) return;
  const id = dom.editingId.value;
  if (!id) return;
  const confirmed = confirm(`Excluir a ${id}? Esta acao remove a OS do armazenamento local.`);
  if (!confirmed) return;
  state.services = state.services.filter((service) => service.id !== id);
  saveServices();
  resetForm();
  setView("fila");
  render();
}

function canToggleStep(group) {
  if (group === "project") return currentRole().canCompleteProject;
  return currentRole().canCompleteMounting;
}

function toggleStep(serviceId, group, stepId, checked) {
  const service = state.services.find((item) => item.id === serviceId);
  if (!service || !canToggleStep(group)) return;
  const step = service[group].find((item) => item.id === stepId);
  if (!step) return;
  if (step.done && !checked && state.role === "montagem") {
    alert("Etapas de montagem concluidas nao podem ser desmarcadas por este perfil.");
    return;
  }
  step.done = checked;
  step.timestamp = checked ? timestamp() : null;
  step.operator = checked ? currentRole().name : null;
  service.updatedAt = timestamp();
  if (statusOf(service) === "Concluído") {
    service.superPriority = false;
  }
  saveServices();
  showDetail(service.id);
  render();
}

function renderChecklist(service, group, title) {
  return `
    <div class="detail-box wide">
      <h3>${title}</h3>
      <div class="checklist">
        ${service[group]
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
        <h2>${service.id} - ${service.clientName}</h2>
      </div>
      <div>
        ${service.superPriority ? '<span class="tag priority">Prioridade hoje</span>' : ""}
        <span class="tag">${statusOf(service)}</span>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-box"><strong>Entrega</strong><br>${formatDate(service.deliveryDate)}</div>
      <div class="detail-box"><strong>Medidas</strong><br>${service.dimensions || "Nao informado"}</div>
      <div class="detail-box wide"><strong>Observacoes</strong><br>${service.notes || "Sem observacoes"}</div>
      <div class="detail-box wide"><strong>Arquivos</strong><br>${service.attachments.length ? service.attachments.join(", ") : "Nenhum arquivo registrado"}</div>
      ${renderChecklist(service, "project", "Fase 1 - Projeto")}
      ${renderChecklist(service, "mounting", "Fase 2 - Montagem")}
    </div>
  `;
  dom.detail.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      toggleStep(
        event.target.dataset.service,
        event.target.dataset.group,
        event.target.dataset.step,
        event.target.checked
      );
    });
  });
  if (!dom.dialog.open) dom.dialog.showModal();
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
              `<button class="calendar-pill${service.superPriority ? " is-priority" : ""}" data-action="open" data-id="${service.id}" type="button">${service.id} - ${service.clientName}</button>`
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
  const completedServices = state.services.filter((service) => statusOf(service) === "Concluído").length;
  const percent = state.services.length ? Math.round((completedServices / state.services.length) * 100) : 0;
  dom.metricsGrid.innerHTML = [
    ["OS cadastradas", state.services.length],
    ["Etapas auditadas", completedSteps.length],
    ["OS finalizadas", completedServices],
    ["Conclusão geral", `${percent}%`],
  ]
    .map(([label, value]) => `<div class="summary-item"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");

  const auditItems = completedSteps
    .sort((a, b) => new Date(b.step.timestamp) - new Date(a.step.timestamp))
    .map(
      ({ service, step }) => `
        <div class="audit-item">
          <strong>${service.id} - ${step.label}</strong>
          <span>${service.clientName} | ${step.operator} | ${formatDateTime(step.timestamp)}</span>
        </div>
      `
    );
  dom.auditList.innerHTML = auditItems.length ? auditItems.join("") : "<div class=\"empty-state\"><strong>Nenhuma etapa concluida ainda.</strong><span>Os timestamps aparecem aqui automaticamente.</span></div>";
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
  dom.roleSelect.value = state.role;
  dom.roleSelect.addEventListener("change", (event) => {
    state.role = event.target.value;
    localStorage.setItem(ROLE_KEY, state.role);
    resetForm();
    render();
  });

  dom.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.disabled) return;
      setView(tab.dataset.view);
    });
  });

  dom.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderServiceList();
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
  });

  dom.form.addEventListener("submit", saveForm);
  dom.deleteButton.addEventListener("click", deleteCurrentService);
  dom.resetFormButton.addEventListener("click", resetForm);
  dom.monthPicker.addEventListener("change", renderCalendar);
  dom.exportButton.addEventListener("click", exportJson);
}

function init() {
  loadServices();
  bindEvents();
  dom.deliveryDate.value = todayIso();
  dom.monthPicker.value = todayIso().slice(0, 7);
  render();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();
