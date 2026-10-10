import { getDataScope, getSupabaseAdmin } from "./supabase-server";

export const qmsTools = ["management-review", "capa", "audit-readiness", "spc-msa"] as const;

export type QmsTool = (typeof qmsTools)[number];

const bucket = "dgqi-qms";
const maxBytes = 1_500_000;

const storageKeys: Record<QmsTool, string[]> = {
  "management-review": ["mrKPIs", "mrOutputs", "mrTrends", "mrInputs", "mrMinutes", "dgqiFields"],
  capa: ["capas", "capaActions", "dgqiFields"],
  "audit-readiness": [
    "auditCheckState",
    "auditEvidence",
    "auditNCs",
    "auditSchedule",
    "auditContacts",
    "auditDetails",
    "dgqiFields",
  ],
  "spc-msa": ["dgqiFields"],
};

export function isQmsTool(value: string): value is QmsTool {
  return (qmsTools as readonly string[]).includes(value);
}

export function sanitizeQmsPayload(tool: QmsTool, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const allowed = new Set(storageKeys[tool]);
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (allowed.has(key)) payload[key] = value;
  }
  if (Buffer.byteLength(JSON.stringify(payload)) > maxBytes) return null;
  return payload;
}

function objectPath(organizationId: string, tool: QmsTool) {
  return `${encodeURIComponent(organizationId)}/${tool}.json`;
}

async function ensureBucket(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const existing = await supabase.storage.getBucket(bucket);
  if (existing.data) return null;
  const created = await supabase.storage.createBucket(bucket, { public: false });
  return created.error;
}

export async function readQmsState(tool: QmsTool) {
  const scope = await getDataScope();
  const supabase = getSupabaseAdmin();
  if (!scope || !supabase) return {};
  const ready = await ensureBucket(supabase);
  if (ready && !/already exists/i.test(ready.message)) return {};
  const { data, error } = await supabase.storage.from(bucket).download(objectPath(scope.organizationId, tool));
  if (error || !data) return {};
  try {
    const parsed: unknown = JSON.parse(await data.text());
    return sanitizeQmsPayload(tool, parsed) ?? {};
  } catch {
    return {};
  }
}

export async function writeQmsState(tool: QmsTool, payload: Record<string, unknown>) {
  const scope = await getDataScope();
  const supabase = getSupabaseAdmin();
  if (!scope) return { error: "Authentication required.", status: 401 };
  if (!supabase) return { error: "Supabase is not configured.", status: 503 };
  const ready = await ensureBucket(supabase);
  if (ready && !/already exists/i.test(ready.message)) return { error: ready.message, status: 500 };
  const { error } = await supabase.storage.from(bucket).upload(
    objectPath(scope.organizationId, tool),
    Buffer.from(JSON.stringify(payload)),
    { upsert: true, contentType: "application/json" },
  );
  if (error) return { error: error.message, status: 500 };
  return { error: null, status: 200 };
}

export function qmsPersistenceMarkup(tool: QmsTool, state: Record<string, unknown>) {
  const keys = JSON.stringify(storageKeys[tool]);
  const saved = JSON.stringify(state).replace(/</g, "\\u003c");
  return `<script>
(function(){
  var KEYS = ${keys};
  var saved = ${saved};
  var origSet = localStorage.setItem.bind(localStorage);
  var timer = null;
  function flush(){
    var payload = {};
    KEYS.forEach(function(key){
      var raw = localStorage.getItem(key);
      if (raw == null) return;
      try { payload[key] = JSON.parse(raw); } catch (e) { payload[key] = raw; }
    });
    fetch("/api/qms/${tool}", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    }).then(function(res){
      if (!res.ok && !document.getElementById("dgqiSaveNote")) {
        var note = document.createElement("div");
        note.id = "dgqiSaveNote";
        note.textContent = "This browser has your entries, but they could not be saved to your account.";
        note.style.cssText = "background:#fef3c7;color:#92400e;padding:8px 16px;font-size:0.85rem";
        document.body.prepend(note);
      }
    }).catch(function(){});
  }
  Object.keys(saved).forEach(function(key){
    origSet(key, JSON.stringify(saved[key]));
  });
  localStorage.setItem = function(key, value){
    origSet(key, value);
    if (KEYS.indexOf(key) === -1) return;
    clearTimeout(timer);
    timer = setTimeout(flush, 500);
  };
  if (!Object.keys(saved).length && KEYS.some(function(key){ return localStorage.getItem(key); })) flush();
  function collectFields(){
    var data = {};
    document.querySelectorAll("input[id], textarea[id], select[id]").forEach(function(el){
      if (el.type === "checkbox" || el.type === "button" || el.type === "submit" || el.type === "file") return;
      data[el.id] = el.value;
    });
    localStorage.setItem("dgqiFields", JSON.stringify(data));
  }
  function restoreFields(){
    try {
    if (typeof buildWhyTable === "function") buildWhyTable();
    var raw = localStorage.getItem("dgqiFields");
    var data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (e) { data = {}; }
    ["xbarN","xbarGroups","gOps","gParts","gTrials"].forEach(function(id){
      var el = document.getElementById(id);
      if (el && data[id] != null) el.value = data[id];
    });
    if (typeof buildXbarTable === "function") buildXbarTable();
    if (typeof buildGageTable === "function") buildGageTable();
    Object.keys(data).forEach(function(id){
      var el = document.getElementById(id);
      if (el && el.type !== "checkbox") el.value = data[id];
    });
    if (typeof updateXbarRow === "function") {
      var groups = parseInt((document.getElementById("xbarGroups") || {}).value || "0", 10);
      for (var row = 1; row <= groups; row++) updateXbarRow(row);
    }
    if (typeof drawFishbone === "function" && document.getElementById("fbEffect")) drawFishbone();
    } catch (e) {}
  }
  document.addEventListener("input", function(){ clearTimeout(window.__dgqiFields); window.__dgqiFields = setTimeout(collectFields, 400); });
  document.addEventListener("change", function(){ clearTimeout(window.__dgqiFields); window.__dgqiFields = setTimeout(collectFields, 200); });
  document.addEventListener("click", function(){ setTimeout(collectFields, 0); });
  window.addEventListener("pagehide", function(){ collectFields(); clearTimeout(timer); flush(); });
  window.addEventListener("DOMContentLoaded", restoreFields);
})();
</script>`;
}
