import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase, ref, push, set, update, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";


const firebaseConfig = {
  apiKey: "AIzaSyAAgRAGO9YVZ-1KoAUNnfZJxOOnqCXPSD4",
const firebaseConfig = {
  apiKey: "AIzaSyAAgRAGO9YVZ-1KoAUNnfZJxOOnqCXPSD4",
  authDomain: "mom-s-to-do-62197.firebaseapp.com",
  databaseURL: "https://mom-s-to-do-62197-default-rtdb.firebaseio.com",
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
let tasks = {}, members = {};
const $ = id => document.getElementById(id);
const today = () => new Date().toISOString().slice(0,10);

function profile(){return {name: localStorage.helpName || "Family Member", role: localStorage.helpRole || "Self"}}
$("currentUser").value = localStorage.helpName || "";
$("currentRole").value = localStorage.helpRole || "Self";
$("saveProfile").onclick = () => {localStorage.helpName=$("currentUser").value||"Family Member"; localStorage.helpRole=$("currentRole").value; alert("Profile saved"); render();};

document.querySelectorAll(".tabs button").forEach(btn=>btn.onclick=()=>{document.querySelectorAll(".tabs button,.tab").forEach(x=>x.classList.remove("active"));btn.classList.add("active");$(btn.dataset.tab).classList.add("active")});

onValue(tasksRef, snap => { tasks = snap.val() || {}; markPastDue(); render(); });
onValue(membersRef, snap => { members = snap.val() || {}; renderMembers(); });

function markPastDue(){Object.entries(tasks).forEach(([id,t])=>{if(t.status!=="Completed" && t.plannedDate && t.plannedDate < today() && t.status!=="Past Due"){update(ref(db,"tasks/"+id),{status:"Past Due"})}})}

$("taskForm").onsubmit = e => {e.preventDefault(); const p=profile(); const newRef=push(tasksRef); set(newRef,{title:$("title").value,description:$("description").value,priority:$("priority").value,neededBy:$("neededBy").value,materials:$("materials").value,cost:$("cost").value||"",quotes:$("quotes").value,photoUrl:$("photoUrl").value,status:"Open",requestedBy:p.name,assignedTo:"",plannedDate:"",createdAt:Date.now(),completedAt:""}); e.target.reset(); alert("Task added live.");};

$("memberForm").onsubmit = e => {e.preventDefault(); const r=push(membersRef); set(r,{name:$("memberName").value,role:$("memberRole").value,contact:$("memberContact").value,active:true}); e.target.reset();};
$("filterStatus").onchange = render; $("filterPriority").onchange = render;

function sortTasks(arr){const rank={"Urgent":1,"High Priority":2,"Medium Priority":3,"Low Priority":4}; return arr.sort((a,b)=>(rank[a[1].priority]||9)-(rank[b[1].priority]||9) || (a[1].neededBy||"9999").localeCompare(b[1].neededBy||"9999"));}
function priorityClass(p){return p.split(" ")[0]}
function card(id,t){const isPast=t.status==="Past Due"; const isDone=t.status==="Completed"; return `<article class="card ${isPast?'pastdue':''} ${isDone?'completed':''}"><h3>${esc(t.title)}</h3><span class="badge ${priorityClass(t.priority)}">${t.priority}</span><span class="badge">${t.status}</span>${t.assignedTo?`<span class="badge">Assigned: ${esc(t.assignedTo)}</span>`:""}<p>${esc(t.description||"")}</p>${t.photoUrl?`<img class="photo" src="${esc(t.photoUrl)}" alt="task photo">`:""}<p class="small"><b>Needed by:</b> ${t.neededBy||"Not set"} | <b>Planned:</b> ${t.plannedDate||"Not set"}</p><p class="small"><b>Materials:</b> ${esc(t.materials||"None listed")}</p><p class="small"><b>Cost:</b> ${t.cost?"$"+esc(t.cost):"Not set"}</p><p class="small"><b>Quotes:</b> ${esc(t.quotes||"None")}</p>${actions(id,t)}</article>`}
function actions(id,t){if(t.status==="Completed") return `<div class="actions"><button onclick="restoreTask('${id}')">Restore</button></div>`; return `<div class="actions"><button onclick="acceptTask('${id}')">Accept</button><button onclick="setStatus('${id}','Started')">Started</button><button onclick="setStatus('${id}','In Progress')">In Progress</button><button onclick="reschedule('${id}')">Reschedule</button><button onclick="reassign('${id}')">Reassign</button><button onclick="completeTask('${id}')">Complete</button><button onclick="deleteTask('${id}')">Delete</button></div>`}
function render(){let arr=sortTasks(Object.entries(tasks)); const fs=$("filterStatus")?.value||"all", fp=$("filterPriority")?.value||"all"; let active=arr.filter(([id,t])=>t.status!=="Completed"); let filtered=active.filter(([id,t])=>(fs==="all"||t.status===fs)&&(fp==="all"||t.priority===fp)); $("taskList").innerHTML=filtered.map(([id,t])=>card(id,t)).join("")||"<p>No active tasks yet.</p>"; $("historyList").innerHTML=arr.filter(([id,t])=>t.status==="Completed").map(([id,t])=>card(id,t)).join("")||"<p>No completed tasks yet.</p>"; $("urgentList").innerHTML=active.filter(([id,t])=>t.priority==="Urgent"||t.status==="Past Due").map(([id,t])=>card(id,t)).join("")||"<p>No urgent or past-due items.</p>"; $("openCount").textContent=active.filter(([i,t])=>t.status==="Open").length; $("progressCount").textContent=active.filter(([i,t])=>["Accepted","Started","In Progress"].includes(t.status)).length; $("pastDueCount").textContent=active.filter(([i,t])=>t.status==="Past Due").length; $("doneCount").textContent=arr.filter(([i,t])=>t.status==="Completed").length;}
function renderMembers(){ $("memberList").innerHTML=Object.entries(members).map(([id,m])=>`<article class="card"><h3>${esc(m.name)}</h3><span class="badge">${esc(m.role)}</span><p class="small">${esc(m.contact||"")}</p><button onclick="removeMember('${id}')">Remove</button></article>`).join("")||"<p>No members added yet.</p>";}
function esc(v){return String(v||"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
window.acceptTask=id=>{const p=profile(); const date=prompt("Planned completion date, YYYY-MM-DD", today()); update(ref(db,"tasks/"+id),{assignedTo:p.name,assignedRole:p.role,plannedDate:date||"",status:"Accepted"})}
window.setStatus=(id,status)=>update(ref(db,"tasks/"+id),{status});
window.reschedule=id=>{const date=prompt("New planned date, YYYY-MM-DD", today()); if(date) update(ref(db,"tasks/"+id),{plannedDate:date,status:"Accepted"})}
window.reassign=id=>{const name=prompt("Reassign to who?"); if(name) update(ref(db,"tasks/"+id),{assignedTo:name,status:"Accepted"})}
window.completeTask=id=>update(ref(db,"tasks/"+id),{status:"Completed",completedAt:Date.now()});
window.restoreTask=id=>update(ref(db,"tasks/"+id),{status:"Open",completedAt:""});
window.deleteTask=id=>{if(confirm("Delete this task?")) remove(ref(db,"tasks/"+id))};
window.removeMember=id=>remove(ref(db,"members/"+id));
$("seedBtn").onclick=()=>{[["Move wood","Stack firewood away from walkway","High Priority"],["Repair window","Check broken latch and quote repair","Urgent"],["Mow lawn","Front and side yard","Medium Priority"]].forEach(x=>set(push(tasksRef),{title:x[0],description:x[1],priority:x[2],neededBy:"",materials:"",cost:"",quotes:"",photoUrl:"",status:"Open",requestedBy:"Mom",assignedTo:"",plannedDate:"",createdAt:Date.now()}))}
