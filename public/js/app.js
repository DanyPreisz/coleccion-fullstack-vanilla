import { api, setSession, clearSession, getToken } from "./api.js";
const authView = document.querySelector("#auth-view");
const appView = document.querySelector("#app-view");
const authForm = document.querySelector("#auth-form");
const authError = document.querySelector("#auth-error");
const authSubmit = document.querySelector("#auth-submit");
const listEl = document.querySelector("#list");
const filters = document.querySelector("#filters");
const formError = document.querySelector("#form-error");
let mode = "login";
let kind = "";
let query = "";
let timer;
const showError = (el, message) => { el.hidden = !message; el.textContent = message || ""; };

function setMode(next) {
  mode = next;
  document.querySelectorAll("#auth-view .tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
  authSubmit.textContent = mode === "login" ? "Entrar" : "Crear cuenta";
}
function paintFilters() {
  filters.innerHTML = "";
  ["", "cartas", "vinilos", "figuras"].forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tab${kind === name ? " active" : ""}`;
    button.textContent = name || "Todas";
    button.addEventListener("click", async () => { kind = name; await refresh(); });
    filters.append(button);
  });
}
async function refresh() {
  paintFilters();
  const data = await api(`/api/items?kind=${encodeURIComponent(kind)}&q=${encodeURIComponent(query)}`);
  document.querySelector("#owned").textContent = data.owned;
  listEl.innerHTML = "";
  data.items.forEach((item) => {
    const li = document.createElement("li");
    li.className = `item${item.owned ? "" : " missing"}`;
    const text = document.createElement("span");
    text.textContent = `${item.kind} \u00b7 ${item.name}${item.notes ? ` \u00b7 ${item.notes}` : ""}`;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "ghost";
    toggle.textContent = item.owned ? "La tengo" : "Me falta";
    toggle.addEventListener("click", async () => { await api(`/api/items/${item.id}/owned`, { method: "POST" }); await refresh(); });
    const del = document.createElement("button");
    del.type = "button";
    del.className = "ghost";
    del.textContent = "Borrar";
    del.addEventListener("click", async () => { await api(`/api/items/${item.id}`, { method: "DELETE" }); await refresh(); });
    li.append(text, toggle, del);
    listEl.append(li);
  });
}
async function boot() {
  if (!getToken()) return;
  try {
    const { user } = await api("/api/auth/me");
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    document.querySelector("#user-name").textContent = user.username;
    await refresh();
  } catch { clearSession(); }
}
document.querySelectorAll("#auth-view .tab").forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(authError, "");
  const fd = new FormData(authForm);
  try {
    const data = await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", { method: "POST", body: JSON.stringify({ username: fd.get("username"), password: fd.get("password") }) });
    setSession(data.token);
    authForm.reset();
    await boot();
  } catch (err) { showError(authError, err.message); }
});
document.querySelector("#logout").addEventListener("click", () => { clearSession(); appView.classList.add("hidden"); authView.classList.remove("hidden"); });
document.querySelector("#search").addEventListener("input", (event) => { clearTimeout(timer); timer = setTimeout(async () => { query = event.target.value.trim(); await refresh(); }, 200); });
document.querySelector("#item-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(formError, "");
  try {
    await api("/api/items", { method: "POST", body: JSON.stringify({ name: document.querySelector("#name").value.trim(), kind: document.querySelector("#kind").value, notes: document.querySelector("#notes").value.trim(), owned: document.querySelector("#have").checked }) });
    document.querySelector("#name").value = "";
    document.querySelector("#notes").value = "";
    await refresh();
  } catch (err) { showError(formError, err.message); }
});
boot();
