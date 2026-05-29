import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase, ref, push, set, update, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";


const firebaseConfig = {
  apiKey: "AIzaSyAAgRAGO9YVZ-1KoAUNnfZJxOOnqCXPSD4",
  authDomain: "mom-s-to-do-62197.firebaseapp.com",
  databaseURL: "https://mom-s-to-do-62197-default-rtdb.firebaseio.com",
  projectId: "mom-s-to-do-62197",
  storageBucket: "mom-s-to-do-62197.firebasestorage.app",
  messagingSenderId: "590361681893",
  appId: "1:590361681893:web:bc74365dc1a1d2998bd90c",
  measurementId: "G-9GHWWMLK13"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


const tasksRef = ref(db, "tasks");
const membersRef = ref(db, "members");
const contactsRef = ref(db, "contacts");
const shoppingRef = ref(db, "shoppingItems");

let tasks = {};
let members = {};
let contacts = {};
let shoppingItems = {};

const $ = id => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);

function esc(v) {
  return String(v || "").replace(/[&<>'"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[c]));
}

function money(v) {
  const n = Number(v || 0);
  return "$" + n.toFixed(2);
}

function profile() {
  return {
    name: localStorage.helpName || "Family Member",
    role: localStorage.helpRole || "Self"
  };
}

function addMaterialRow(name = "", qty = "", cost = "") {
  const row = document.createElement("div");
  row.className = "materialRow";
  row.innerHTML = `
    <div class="grid three">
      <input class="matName" placeholder="Material" value="${esc(name)}">
      <input class="matQty" type="number" step="0.01" placeholder="Qty" value="${esc(qty)}">
      <input class="matCost" type="number" step="0.01" placeholder="Cost each" value="${esc(cost)}">
    </div>
    <button type="button" class="removeMat">Remove</button>
  `;
  row.querySelector(".removeMat").onclick = () => row.remove();
  $("materialsList").appendChild(row);
}

function materialRows() {
  return Array.from(document.querySelectorAll(".materialRow"));
}

function calculateMaterialTotal() {
  return materialRows()
    .map(row => {
      const qty = Number(row.querySelector(".matQty").value || 0);
      const cost = Number(row.querySelector(".matCost").value || 0);
      return qty * cost;
    })
    .reduce((a, b) => a + b, 0)
    .toFixed(2);
}

function getMaterialNames() {
  return materialRows()
    .map(row => row.querySelector(".matName").value.trim())
    .filter(Boolean)
    .join(", ");
}

if ($("addMaterialBtn")) $("addMaterialBtn").onclick = () => addMaterialRow();
if ($("materialsList")) addMaterialRow();

if ($("currentUser")) $("currentUser").value = localStorage.helpName || "";
if ($("currentRole")) $("currentRole").value = localStorage.helpRole || "Self";

if ($("saveProfile")) {
  $("saveProfile").onclick = () => {
    localStorage.helpName = $("currentUser").value || "Family Member";
    localStorage.helpRole = $("currentRole").value;
    alert("Profile saved");
    render();
  };
}

document.querySelectorAll(".tabs button").forEach(btn => {
  btn.onclick = () => {
    const tab = document.getElementById(btn.dataset.tab);
    if (!tab) return alert("Tab not found: " + btn.dataset.tab);

    document.querySelectorAll(".tabs button").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));

    btn.classList.add("active");
    tab.classList.add("active");
  };
});

onValue(membersRef, snap => {
  members = snap.val() || {};
  renderMembers();
});

onValue(contactsRef, snap => {
  contacts = snap.val() || {};
  renderContacts();
});

onValue(shoppingRef, snap => {
  shoppingItems = snap.val() || {};
  renderShopping();
});

onValue(tasksRef, snap => {
  tasks = snap.val() || {};
  markPastDue();
  render();
});

function markPastDue() {
  Object.entries(tasks).forEach(([id, t]) => {
    if (t.status !== "Completed" && t.plannedDate && t.plannedDate < today() && t.status !== "Past Due") {
      update(ref(db, "tasks/" + id), { status: "Past Due" });
    }
  });
}

if ($("taskForm")) {
  $("taskForm").onsubmit = async e => {
    e.preventDefault();

    const p = profile();
    const newRef = push(tasksRef);
    const materialNames = getMaterialNames();
    const totalCost = calculateMaterialTotal();
    let photoUrl = "";

try {
  const file = $("photoFile")?.files?.[0];

  if (file) {
    const fileRef = storageRef(storage, "taskPhotos/" + Date.now() + "-" + file.name);
    await uploadBytes(fileRef, file);
    photoUrl = await getDownloadURL(fileRef);
  }
} catch (err) {
  alert("Photo upload failed, but task will still be saved.");
  console.error(err);
}

    set(newRef, {
      title: $("title").value,
      description: $("description").value,
      priority: $("priority").value,
      neededBy: $("neededBy").value,
      recurring: $("recurring") ? $("recurring").value : "None",
      materials: materialNames || "None listed",
      materialNotes: $("materialNotes").value,
      linkedProject: $("linkedProject").value,
      cost: totalCost,
      quotes: $("quotes").value,
      photoUrl: $("photoUrl")?.value || "",
      status: "Open",
      requestedBy: p.name,
      assignedTo: "",
      plannedDate: $("plannedDate") ? $("plannedDate").value : "",
      createdAt: Date.now(),
      completedAt: ""
    });

    materialRows().forEach(row => {
      const item = row.querySelector(".matName").value.trim();
      const quantity = row.querySelector(".matQty").value.trim();
      const costEach = row.querySelector(".matCost").value.trim();
      if (!item) return;

      const s = push(shoppingRef);
      set(s, {
        item,
        quantity,
        cost: costEach,
        totalCost: (Number(quantity || 0) * Number(costEach || 0)).toFixed(2),
        project: $("linkedProject").value || $("title").value,
        notes: $("materialNotes").value || "",
        purchased: false,
        taskId: newRef.key,
        createdAt: Date.now()
      });
    });

    e.target.reset();
    $("materialsList").innerHTML = "";
    addMaterialRow();
    alert("Task added live.");
  };
}

if ($("shoppingForm")) {
  $("shoppingForm").onsubmit = e => {
    e.preventDefault();

    const quantity = $("shopQty").value || "";
    const cost = $("shopCost").value || "";
    const totalCost = (Number(quantity || 0) * Number(cost || 0)).toFixed(2);

    const s = push(shoppingRef);
    set(s, {
      item: $("shopItem").value,
      quantity,
      cost,
      totalCost,
      project: $("shopProject").value,
      notes: $("shopNotes").value,
      purchased: false,
      createdAt: Date.now()
    });

    e.target.reset();
  };
}

if ($("memberForm")) {
  $("memberForm").onsubmit = e => {
    e.preventDefault();

    const r = push(membersRef);
    set(r, {
      name: $("memberName").value,
      role: $("memberRole").value,
      contact: $("memberContact").value,
      photo: $("memberPhoto") ? $("memberPhoto").value : "",
      active: true
    });

    e.target.reset();
  };
}

if ($("contactForm")) {
  $("contactForm").onsubmit = e => {
    e.preventDefault();

    const c = push(contactsRef);
    set(c, {
      name: $("contactName").value,
      relation: $("contactRelation").value,
      phone: $("contactPhone").value,
      email: $("contactEmail").value
    });

    e.target.reset();
  };
}

if ($("filterStatus")) $("filterStatus").onchange = render;
if ($("filterPriority")) $("filterPriority").onchange = render;

function sortTasks(arr) {
  const rank = {
    "Urgent": 1,
    "High Priority": 2,
    "Medium Priority": 3,
    "Low Priority": 4
  };

  return arr.sort((a, b) =>
    (rank[a[1].priority] || 9) - (rank[b[1].priority] || 9) ||
    (a[1].neededBy || "9999").localeCompare(b[1].neededBy || "9999")
  );
}

function priorityClass(p) {
  return String(p || "Medium").split(" ")[0];
}

function card(id, t) {
  const isPast = t.status === "Past Due";
  const isDone = t.status === "Completed";

  return `
    <article class="card ${isPast ? "pastdue" : ""} ${isDone ? "completed" : ""}">
      <h3>${esc(t.title)}</h3>
      <span class="badge ${priorityClass(t.priority)}">${esc(t.priority)}</span>
      <span class="badge">${esc(t.status)}</span>
      ${t.assignedTo ? `<span class="badge assigned">Accepted By: ${esc(t.assignedTo)}</span>` : ""}
      ${t.recurring && t.recurring !== "None" ? `<span class="badge">Repeats: ${esc(t.recurring)}</span>` : ""}
      <p>${esc(t.description || "")}</p>
      ${t.photoUrl ? `<img class="photo" src="${esc(t.photoUrl)}" alt="task photo">` : ""}
      <p class="small"><b>Needed by:</b> ${esc(t.neededBy || "Not set")} | <b>Planned:</b> ${esc(t.plannedDate || "Not set")}</p>
      ${t.completedAt ? `<p class="small"><b>Completed:</b> ${new Date(t.completedAt).toLocaleDateString()}</p>` : ""}
      <p class="small"><b>Materials:</b> ${esc(t.materials || "None listed")}</p>
      <p class="small"><b>Estimated Project Cost:</b> ${money(t.cost)}</p>
      <p class="small"><b>Project:</b> ${esc(t.linkedProject || "None")}</p>
      <p class="small"><b>Notes:</b> ${esc(t.materialNotes || "None")}</p>
      <p class="small"><b>Quotes:</b> ${esc(t.quotes || "None")}</p>
      ${actions(id, t)}
    </article>
  `;
}

function actions(id, t) {
  if (t.status === "Completed") {
    return `<div class="actions"><button onclick="restoreTask('${id}')">Restore</button></div>`;
  }

  return `
    <div class="actions">
      <button onclick="viewTask('${id}')">View</button>
      <button onclick="acceptTask('${id}')">Accept</button>
      <button onclick="setStatus('${id}','Started')">Started</button>
      <button onclick="setStatus('${id}','In Progress')">In Progress</button>
      <button onclick="reschedule('${id}')">Reschedule</button>
      <button onclick="reassign('${id}')">Reassign</button>
      <button onclick="editTask('${id}')">Edit</button>
      <button onclick="completeTask('${id}')">Complete</button>
      <button onclick="deleteTask('${id}')">Delete</button>
    </div>
  `;
}

function render() {
  const arr = sortTasks(Object.entries(tasks));
  const fs = $("filterStatus")?.value || "all";
  const fp = $("filterPriority")?.value || "all";
  const active = arr.filter(([id, t]) => t.status !== "Completed");

  const filtered = active.filter(([id, t]) =>
    (fs === "all" || t.status === fs) &&
    (fp === "all" || t.priority === fp)
  );

  if ($("taskList")) $("taskList").innerHTML =
    filtered.map(([id, t]) => card(id, t)).join("") || "<p>No active tasks yet.</p>";

  if ($("historyList")) $("historyList").innerHTML =
    arr.filter(([id, t]) => t.status === "Completed").map(([id, t]) => card(id, t)).join("") || "<p>No completed tasks yet.</p>";

  if ($("urgentList")) $("urgentList").innerHTML =
    active.filter(([id, t]) => t.priority === "Urgent" || t.status === "Past Due").map(([id, t]) => card(id, t)).join("") || "<p>No urgent or past-due items.</p>";

  if ($("openCount")) $("openCount").textContent =
    active.filter(([i, t]) => t.status === "Open").length;

  if ($("progressCount")) $("progressCount").textContent =
    active.filter(([i, t]) => ["Accepted", "Started", "In Progress"].includes(t.status)).length;

  if ($("pastDueCount")) $("pastDueCount").textContent =
    active.filter(([i, t]) => t.status === "Past Due").length;

  if ($("doneCount")) $("doneCount").textContent =
    arr.filter(([i, t]) => t.status === "Completed").length;

  renderCalendar();
}

function renderCalendar() {
  if (!$("calendarList")) return;

  const items = Object.entries(tasks)
    .filter(([id, t]) =>
      (t.neededBy || t.plannedDate) &&
      t.status !== "Completed"
    )
    .sort((a, b) =>
      (a[1].neededBy || a[1].plannedDate || "9999")
        .localeCompare(b[1].neededBy || b[1].plannedDate || "9999")
    );

  $("calendarList").innerHTML = items.map(([id, t]) => `
    <article class="card ${t.status === "Past Due" ? "pastdue" : ""}">
      <h3>${esc(t.title)}</h3>
      <p class="small"><b>Status:</b> ${esc(t.status || "Open")}</p>
      <p class="small"><b>Needed by:</b> ${esc(t.neededBy || "Not set")}</p>
      <p class="small"><b>Planned:</b> ${esc(t.plannedDate || "Not set")}</p>
      <p class="small"><b>Assigned to:</b> ${esc(t.assignedTo || "Unassigned")}</p>
      <button onclick="viewTask('${id}')">View</button>
    </article>
  `).join("") || "<p>No dated tasks yet.</p>";
}

function renderMembers() {
  if (!$("memberList")) return;

  $("memberList").innerHTML = Object.entries(members).map(([id, m]) => `
    <article class="card">
      ${m.photo ? `<img class="photo" src="${esc(m.photo)}" alt="member photo">` : ""}
      <h3>${esc(m.name)}</h3>
      <span class="badge">${esc(m.role)}</span>
      <p class="small">${esc(m.contact || "")}</p>
      <button onclick="removeMember('${id}')">Remove</button>
    </article>
  `).join("") || "<p>No members added yet.</p>";
}

function renderContacts() {
  if (!$("contactList")) return;

  $("contactList").innerHTML = Object.entries(contacts).map(([id, c]) => `
    <article class="card">
      <h3>${esc(c.name)}</h3>
      <span class="badge">${esc(c.relation || "Contact")}</span>
      <p class="small">📞 ${esc(c.phone || "No phone")}</p>
      <p class="small">✉️ ${esc(c.email || "No email")}</p>
      <button onclick="removeContact('${id}')">Remove</button>
    </article>
  `).join("") || "<p>No emergency contacts yet.</p>";
}

function renderShopping() {
  if (!$("shoppingList")) return;

  $("shoppingList").innerHTML = Object.entries(shoppingItems).map(([id, s]) => {
    const total = s.totalCost || (Number(s.quantity || 0) * Number(s.cost || 0)).toFixed(2);

    return `
      <article class="card">
        <h3>${esc(s.item || "Shopping Item")}</h3>
        <p class="small"><b>Quantity:</b> ${esc(s.quantity || "Not set")}</p>
        <p class="small"><b>Cost Each:</b> ${money(s.cost)}</p>
        <p class="small"><b>Total Estimated Cost:</b> ${money(total)}</p>
        <p class="small"><b>Project:</b> ${esc(s.project || "None")}</p>
        <p class="small"><b>Notes:</b> ${esc(s.notes || "None")}</p>

        <label class="checkbox">
          <input type="checkbox" ${s.purchased ? "checked" : ""} onchange="toggleShoppingPurchased('${id}', this.checked)" />
          Purchased
        </label>

        <button onclick="editShoppingItem('${id}')">Edit</button>
        <button onclick="deleteShoppingItem('${id}')">Remove</button>
      </article>
    `;
  }).join("") || "<p>No shopping items needed.</p>";
}

window.viewTask = id => {
  const t = tasks[id];

  alert(
    "Task: " + (t.title || "") +
    "\n\nDescription: " + (t.description || "None") +
    "\n\nNeeded by: " + (t.neededBy || "Not set") +
    "\nPlanned: " + (t.plannedDate || "Not set") +
    "\n\nMaterials: " + (t.materials || "None") +
    "\nNotes: " + (t.materialNotes || "None") +
    "\nQuotes: " + (t.quotes || "None") +
    "\n\nEstimated Project Cost: " + money(t.cost)
  );
};

window.editTask = id => {
  const t = tasks[id];

  $("editTaskId").value = id;
  $("editTitle").value = t.title || "";
  $("editDescription").value = t.description || "";
  $("editNeededBy").value = t.neededBy || "";
  $("editPlannedDate").value = t.plannedDate || "";
  $("editMaterials").value = t.materials || "";
  $("editCost").value = t.cost || "";
  $("editNotes").value = t.materialNotes || "";
  $("editQuotes").value = t.quotes || "";

  $("editModal").classList.remove("hidden");
};

if ($("saveEditTask")) {
  $("saveEditTask").onclick = () => {
    const id = $("editTaskId").value;

    update(ref(db, "tasks/" + id), {
      title: $("editTitle").value,
      description: $("editDescription").value,
      neededBy: $("editNeededBy").value,
      plannedDate: $("editPlannedDate").value,
      materials: $("editMaterials").value,
      cost: $("editCost").value,
      materialNotes: $("editNotes").value,
      quotes: $("editQuotes").value
    });

    $("editModal").classList.add("hidden");
  };
}

if ($("closeEditModal")) {
  $("closeEditModal").onclick = () => {
    $("editModal").classList.add("hidden");
  };
}

window.editShoppingItem = id => {
  const s = shoppingItems[id];

  const item = prompt("Item", s.item || "");
  if (item === null) return;

  const quantity = prompt("Quantity", s.quantity || "");
  if (quantity === null) return;

  const cost = prompt("Cost each", s.cost || "");
  if (cost === null) return;

  const project = prompt("Project", s.project || "");
  if (project === null) return;

  const notes = prompt("Notes", s.notes || "");
  if (notes === null) return;

  update(ref(db, "shoppingItems/" + id), {
    item,
    quantity,
    cost,
    totalCost: (Number(quantity || 0) * Number(cost || 0)).toFixed(2),
    project,
    notes
  });
};

window.acceptTask = id => {
  const p = profile();
  const date = prompt("Planned completion date, YYYY-MM-DD", today());

  update(ref(db, "tasks/" + id), {
    assignedTo: p.name,
    assignedRole: p.role,
    plannedDate: date || "",
    status: "Accepted"
  });
};

window.setStatus = (id, status) => update(ref(db, "tasks/" + id), { status });

window.reschedule = id => {
  const picker = $("hiddenDatePicker");
  if (!picker) return alert("Date picker not found in index.html");

  picker.value = today();

  picker.onchange = () => {
    if (picker.value) {
      update(ref(db, "tasks/" + id), {
        plannedDate: picker.value,
        status: "Accepted"
      });
    }
  };

  picker.showPicker ? picker.showPicker() : picker.click();
};

window.reassign = id => {
  const name = prompt("Reassign to who?");
  if (name) update(ref(db, "tasks/" + id), { assignedTo: name, status: "Accepted" });
};

window.completeTask = id => update(ref(db, "tasks/" + id), {
  status: "Completed",
  completedAt: Date.now(),
  completedDate: new Date().toISOString().split("T")[0]
});

window.restoreTask = id => update(ref(db, "tasks/" + id), {
  status: "Open",
  completedAt: ""
});

window.deleteTask = id => {
  if (confirm("Delete this task?")) remove(ref(db, "tasks/" + id));
};

window.removeMember = id => remove(ref(db, "members/" + id));
window.removeContact = id => remove(ref(db, "contacts/" + id));

window.toggleShoppingPurchased = (id, checked) => {
  update(ref(db, "shoppingItems/" + id), { purchased: checked });
};

window.deleteShoppingItem = id => {
  if (confirm("Remove this shopping item?")) {
    remove(ref(db, "shoppingItems/" + id));
  }
};

let deferredPrompt;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;

  if (document.getElementById("installAppBtn")) return;

  const installBtn = document.createElement("button");
  installBtn.id = "installAppBtn";
  installBtn.innerText = "Install App";
  installBtn.style.position = "fixed";
  installBtn.style.bottom = "20px";
  installBtn.style.right = "20px";
  installBtn.style.zIndex = "9999";

  document.body.appendChild(installBtn);

  installBtn.addEventListener("click", async () => {
    installBtn.remove();
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
});
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));

  $("dashboard")?.classList.add("active");
  document.querySelector('[data-tab="dashboard"]')?.classList.add("active");
});
