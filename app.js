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
const today = () => new Date().toISOString().slice(0,10);
  
function addMaterialRow(name="", qty="", cost=""){
  const row = document.createElement("div");

  row.className = "materialRow";

  row.innerHTML = `
    <div class="grid three">
      <input class="matName" placeholder="Material" value="${name}">
      <input class="matQty" placeholder="Qty" value="${qty}">
      <input class="matCost" type="number" step="0.01" placeholder="Cost" value="${cost}">
    </div>

    <button type="button" class="removeMat">
      Remove
    </button>
  `;

  row.querySelector(".removeMat").onclick = () => row.remove();

  $("materialsList").appendChild(row);
}

$("addMaterialBtn").onclick = () => addMaterialRow();

addMaterialRow();

function profile(){
  return {
    name: localStorage.helpName || "Family Member",
    role: localStorage.helpRole || "Self"
  };
}

$("currentUser").value = localStorage.helpName || "";
$("currentRole").value = localStorage.helpRole || "Self";

$("saveProfile").onclick = () => {
  localStorage.helpName = $("currentUser").value || "Family Member";
  localStorage.helpRole = $("currentRole").value;
  alert("Profile saved");
  render();
};
document.querySelectorAll(".tabs button").forEach(btn => {
  btn.onclick = () => {

    const tabId = btn.dataset.tab;
    const tab = document.getElementById(tabId);

    if(!tab){
      alert("Tab not found: " + tabId);
      return;
    }

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

function markPastDue(){
  Object.entries(tasks).forEach(([id,t]) => {
    if(t.status !== "Completed" && t.plannedDate && t.plannedDate < today() && t.status !== "Past Due"){
      update(ref(db,"tasks/"+id),{status:"Past Due"});
    }
  });
}

$("taskForm").onsubmit = e => {
  e.preventDefault();

  const p = profile();
  const newRef = push(tasksRef);

  set(newRef,{
    title:$("title").value,
    description:$("description").value,
    priority:$("priority").value,
    neededBy:$("neededBy").value,
    recurring:$("recurring") ? $("recurring").value : "None",
    materials:"Custom Material List",
    materialNotes:$("materialNotes").value,
    linkedProject:$("linkedProject").value,
    cost:"",
    quotes:$("quotes").value,
    photoUrl:$("photoUrl").value,  
    status:"Open",
    requestedBy:p.name,
    assignedTo:"",
    plannedDate:"",
    createdAt:Date.now(),
    completedAt:""
  });

  document.querySelectorAll(".materialRow").forEach(row => {

  const item = row.querySelector(".matName").value.trim();
  const qty = row.querySelector(".matQty").value.trim();
  const cost = row.querySelector(".matCost").value.trim();

  if(!item) return;

  const s = push(shoppingRef);

  set(s,{
    item:item,
    quantity:qty,
    cost:cost,
    project:$("linkedProject").value || $("title").value,
    notes:$("materialNotes").value || "",
    purchased:false,
    taskId:newRef.key,
    createdAt:Date.now()
  });

});

  e.target.reset();
  alert("Task added live.");
};

$("memberForm").onsubmit = e => {
  e.preventDefault();

  const r = push(membersRef);

  set(r,{
    name:$("memberName").value,
    role:$("memberRole").value,
    contact:$("memberContact").value,
    photo:$("memberPhoto") ? $("memberPhoto").value : "",
    active:true
  });

  e.target.reset();
};

$("contactForm").onsubmit = e => {
  e.preventDefault();

  const c = push(contactsRef);

  set(c,{
    name:$("contactName").value,
    relation:$("contactRelation").value,
    phone:$("contactPhone").value,
    email:$("contactEmail").value
  });

  e.target.reset();
};

if($("shoppingForm")){
  $("shoppingForm").onsubmit = e => {
    e.preventDefault();

    const s = push(shoppingRef);

    set(s,{
      item:$("shopItem").value,
      quantity:$("shopQty").value,
      cost:$("shopCost").value || "",
      project:$("shopProject").value,
      notes:$("shopNotes").value,
      purchased:false,
      createdAt:Date.now()
    });

    e.target.reset();
  };
}

$("filterStatus").onchange = render;
$("filterPriority").onchange = render;

function sortTasks(arr){
  const rank = {
    "Urgent":1,
    "High Priority":2,
    "Medium Priority":3,
    "Low Priority":4
  };

  return arr.sort((a,b) =>
    (rank[a[1].priority] || 9) - (rank[b[1].priority] || 9) ||
    (a[1].neededBy || "9999").localeCompare(b[1].neededBy || "9999")
  );
}

function priorityClass(p){
  return p.split(" ")[0];
}

function card(id,t){
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
      <p class="small"><b>Needed by:</b> ${t.neededBy || "Not set"} | <b>Planned:</b> ${t.plannedDate || "Not set"}</p>
      <p class="small"><b>Materials:</b> ${esc(t.materials || "None listed")}</p>

<p class="small">
<b>Quantity:</b> ${esc(t.materialQty || "Not set")}
</p>

<p class="small">
<b>Project:</b> ${esc(t.linkedProject || "None")}
</p>

<p class="small">
<b>Notes:</b> ${esc(t.materialNotes || "None")}
</p>

<p class="small">
<b>Cost:</b> ${t.cost ? "$" + esc(t.cost) : "Not set"}
</p>
   
    
      <p class="small"><b>Quotes:</b> ${esc(t.quotes || "None")}</p>
      ${actions(id,t)}
    </article>
  `;
}

function actions(id,t){
  if(t.status === "Completed"){
    return `<div class="actions"><button onclick="restoreTask('${id}')">Restore</button></div>`;
  }

  return `
    <div class="actions">
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

function render(){
  let arr = sortTasks(Object.entries(tasks));

  const fs = $("filterStatus")?.value || "all";
  const fp = $("filterPriority")?.value || "all";

  let active = arr.filter(([id,t]) => t.status !== "Completed");

  let filtered = active.filter(([id,t]) =>
    (fs === "all" || t.status === fs) &&
    (fp === "all" || t.priority === fp)
  );

  $("taskList").innerHTML = filtered.map(([id,t]) => card(id,t)).join("") || "<p>No active tasks yet.</p>";
  $("historyList").innerHTML = arr.filter(([id,t]) => t.status === "Completed").map(([id,t]) => card(id,t)).join("") || "<p>No completed tasks yet.</p>";
  $("urgentList").innerHTML = active.filter(([id,t]) => t.priority === "Urgent" || t.status === "Past Due").map(([id,t]) => card(id,t)).join("") || "<p>No urgent or past-due items.</p>";

  $("openCount").textContent = active.filter(([i,t]) => t.status === "Open").length;
  $("progressCount").textContent = active.filter(([i,t]) => ["Accepted","Started","In Progress"].includes(t.status)).length;
  $("pastDueCount").textContent = active.filter(([i,t]) => t.status === "Past Due").length;
  $("doneCount").textContent = arr.filter(([i,t]) => t.status === "Completed").length;
}

function renderMembers(){
  $("memberList").innerHTML = Object.entries(members).map(([id,m]) => `
    <article class="card">
      ${m.photo ? `<img class="photo" src="${esc(m.photo)}" alt="member photo">` : ""}
      <h3>${esc(m.name)}</h3>
      <span class="badge">${esc(m.role)}</span>
      <p class="small">${esc(m.contact || "")}</p>
      <button onclick="removeMember('${id}')">Remove</button>
    </article>
  `).join("") || "<p>No members added yet.</p>";
}

function renderContacts(){
  $("contactList").innerHTML =
    Object.entries(contacts).map(([id,c]) => `
      <article class="card">
        <h3>${esc(c.name)}</h3>
        <span class="badge">${esc(c.relation || "Contact")}</span>

        <p class="small">
          📞 ${esc(c.phone || "No phone")}
        </p>

        <p class="small">
          ✉️ ${esc(c.email || "No email")}
        </p>

        <button onclick="removeContact('${id}')">
          Remove
        </button>
      </article>
    `).join("") || "<p>No emergency contacts yet.</p>";
}

function renderShopping(){

  $("shoppingList").innerHTML =
    Object.entries(shoppingItems).map(([id,s]) => {

      return `
        <article class="card">

          <h3>${esc(s.item || "Shopping Item")}</h3>

          <p class="small">
            <b>Quantity:</b> ${esc(s.quantity || "Not set")}
          </p>

          <p class="small">
            <b>Project:</b> ${esc(s.project || "None")}
          </p>

          <p class="small">
            <b>Estimated Cost:</b>
            ${s.cost ? "$" + esc(s.cost) : "Not set"}
          </p>

          <p class="small">
            <b>Notes:</b> ${esc(s.notes || "None")}
          </p>

          <label class="checkbox">
            <input
              type="checkbox"
              ${s.purchased ? "checked" : ""}
              onchange="toggleShoppingPurchased('${id}', this.checked)"
            />
            Purchased
          </label>

          <button onclick="deleteShoppingItem('${id}')">
            Remove
          </button>

        </article>
      `;
    }).join("") || "<p>No shopping items needed.</p>";
}
  
function esc(v){
  return String(v || "").replace(/[&<>'"]/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "'":"&#39;",
    '"':"&quot;"
  }[c]));
}

window.acceptTask = id => {
  const p = profile();
  const date = prompt("Planned completion date, YYYY-MM-DD", today());

  update(ref(db,"tasks/"+id),{
    assignedTo:p.name,
    assignedRole:p.role,
    plannedDate:date || "",
    status:"Accepted"
  });
};

window.setStatus = (id,status) => update(ref(db,"tasks/"+id),{status});
window.reschedule = id => {
  const date = prompt("New planned date, YYYY-MM-DD", today());
  if(date) update(ref(db,"tasks/"+id),{plannedDate:date,status:"Accepted"});
};
window.reassign = id => {
  const name = prompt("Reassign to who?");
  if(name) update(ref(db,"tasks/"+id),{assignedTo:name,status:"Accepted"});
};
window.editTask = id => {
  const t = tasks[id];

  const title = prompt("Task title", t.title || "");
  if(title === null) return;

  const materials = prompt("Materials / Shopping List", t.materials || "");
  if(materials === null) return;

  const qty = prompt("Quantity needed", t.materialQty || "");
  if(qty === null) return;

  const cost = prompt("Estimated cost", t.cost || "");
  if(cost === null) return;

  const notes = prompt("Purchase notes", t.materialNotes || "");
  if(notes === null) return;

  update(ref(db,"tasks/"+id),{
    title:title,
    materials:materials,
    materialQty:qty,
    cost:cost,
    materialNotes:notes
  });
};

window.completeTask = id => update(ref(db,"tasks/"+id),{
  status:"Completed",
  completedAt:Date.now()
});
window.restoreTask = id => update(ref(db,"tasks/"+id),{
  status:"Open",
  completedAt:""
});
window.deleteTask = id => {
  if(confirm("Delete this task?")) remove(ref(db,"tasks/"+id));
};
window.removeMember = id => remove(ref(db,"members/"+id));
window.removeContact = id => remove(ref(db,"contacts/"+id));

window.toggleShoppingPurchased = (id, checked) => {
  update(ref(db,"shoppingItems/"+id),{
    purchased: checked
  });
};

window.deleteShoppingItem = id => {
  if(confirm("Remove this shopping item?")){
    remove(ref(db,"shoppingItems/"+id));
  }
};

let deferredPrompt;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  
  if(document.getElementById("installAppBtn")) return;

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
