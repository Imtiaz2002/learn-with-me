(function(){
"use strict";
const CONFIG={apiKey:"AIzaSyAEmInnWVtiuwPGrcjjsu3I2qc2IAT1lzg",authDomain:"is-esports.firebaseapp.com",projectId:"is-esports",storageBucket:"is-esports.firebasestorage.app",messagingSenderId:"669572694478",appId:"1:669572694478:web:5e15b166902a9e0d326b9f",measurementId:"G-ZPP10G2XFY"};
const ADMIN_EMAIL="admin@brainbyte.com",ADMIN_PASSWORD="1122@3344";
const courses=[["computer-fundamentals","Computer Fundamentals","💻"],["ms-word","MS Word","W"],["ms-excel","MS Excel","X"],["ms-powerpoint","MS PowerPoint","P"],["computer-application","Computer Application","🖥"],["html","HTML","<>"],["css","CSS","#"],["javascript","JavaScript","JS"],["python","Python","Py"],["java","Java","☕"],["c","C","C"],["cpp","C++","C++"],["networks","Networks","🌐"],["cybersecurity","Cybersecurity","🔒"]];
const $=id=>document.getElementById(id), esc=v=>String(v??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
let auth,db;

function setMsg(id,t){const e=$(id);if(e)e.textContent=t}
function page(id){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(id).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===id));window.scrollTo(0,0)}
function courseOptions(){return courses.map(x=>`<option value="${x[0]}">${esc(x[1])}</option>`).join("")}

async function boot(){
  try{
    if(!firebase.apps.length)firebase.initializeApp(CONFIG);
    auth=firebase.auth();db=firebase.firestore();

    auth.onAuthStateChanged(async user=>{
      if(user){
        $("login").classList.add("hidden");$("app").classList.remove("hidden");
        await init();
      }else{
        $("app").classList.add("hidden");$("login").classList.remove("hidden");
      }
    });

    $("loginBtn").onclick=login;
    $("password").addEventListener("keydown",e=>{if(e.key==="Enter")login()});
    $("email").addEventListener("keydown",e=>{if(e.key==="Enter")login()});
    $("logout").onclick=()=>auth.signOut();
    $("mobileLogout").onclick=()=>auth.signOut();
    document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>page(b.dataset.page));
    $("goContent").onclick=$("quickContent").onclick=()=>page("content");
    $("refresh").onclick=loadLessons;

    $("course").onchange=()=>loadSemesters("course","semester","chapter");
    $("semester").onchange=()=>loadChapters("course","semester","chapter");
    $("lessonCourse").onchange=()=>loadSemesters("lessonCourse","lessonSemester","lessonChapter");
    $("lessonSemester").onchange=()=>loadChapters("lessonCourse","lessonSemester","lessonChapter");
    $("lessonChapter").onchange=loadLessons;
    $("video").oninput=$("pdf").oninput=resourcePreview;
    $("clear").onclick=clearForm;
    $("publish").onclick=publishLesson;

    setMsg("loginMsg","Ready. Tap Sign in.");
  }catch(e){console.error(e);setMsg("loginMsg","Firebase setup error: "+(e.message||"Unknown error"))}
}

async function login(){
  const btn=$("loginBtn"),email=$("email").value.trim(),password=$("password").value;
  btn.disabled=true;setMsg("loginMsg","Checking admin credentials...");
  if(email!==ADMIN_EMAIL||password!==ADMIN_PASSWORD){setMsg("loginMsg","Wrong admin ID or password.");btn.disabled=false;return}
  try{setMsg("loginMsg","Signing in to Firebase...");await auth.signInAnonymously();localStorage.setItem("learnWithMeAdmin","1")}
  catch(e){console.error(e);setMsg("loginMsg",e.code==="auth/operation-not-allowed"?"Anonymous Authentication is OFF in Firebase.":"Login failed: "+(e.message||e.code))}
  finally{btn.disabled=false}
}

async function init(){
  $("course").innerHTML=courseOptions();$("lessonCourse").innerHTML=courseOptions();
  renderCourses();
  await loadSemesters("course","semester","chapter");
  await loadSemesters("lessonCourse","lessonSemester","lessonChapter");
  await dashboardStats();
}

function renderCourses(){$("courseTiles").innerHTML=courses.map(x=>`<div class="course-tile"><i>${esc(x[2])}</i><div><b>${esc(x[1])}</b><small>Connected course</small></div></div>`).join("")}

async function loadSemesters(cSel,sSel,chSel){
  const c=$(cSel).value,sbox=$(sSel);sbox.innerHTML="<option>Loading...</option>";
  try{
    const snap=await db.collection("courses").doc(c).collection("semesters").get();
    const rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order??999)-(b.order??999));
    sbox.innerHTML=rows.length?rows.map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.id)}</option>`).join(""):"<option value=''>No semesters</option>";
    await loadChapters(cSel,sSel,chSel);
  }catch(e){console.error(e);sbox.innerHTML="<option value=''>Could not load</option>"}
}
async function loadChapters(cSel,sSel,chSel){
  const c=$(cSel).value,s=$(sSel).value,box=$(chSel);if(!s){box.innerHTML="<option value=''>No chapters</option>";return}
  box.innerHTML="<option>Loading...</option>";
  try{
    const snap=await db.collection("courses").doc(c).collection("semesters").doc(s).collection("chapters").get();
    const rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order??999)-(b.order??999));
    box.innerHTML=rows.length?rows.map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.id)}</option>`).join(""):"<option value=''>No chapters</option>";
    if(chSel==="lessonChapter")await loadLessons();
  }catch(e){console.error(e);box.innerHTML="<option value=''>Could not load</option>"}
}
function lessonRef(){return db.collection("courses").doc($("lessonCourse").value).collection("semesters").doc($("lessonSemester").value).collection("chapters").doc($("lessonChapter").value).collection("lessons")}

async function loadLessons(){
  const c=$("lessonCourse").value,s=$("lessonSemester").value,ch=$("lessonChapter").value,box=$("lessonList");
  if(!c||!s||!ch){box.innerHTML="<div class='empty'>Choose a course, semester and chapter.</div>";return}
  box.innerHTML="<div class='empty'>Loading...</div>";
  try{
    const snap=await lessonRef().get(),rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order??999)-(b.order??999));
    if(!rows.length){box.innerHTML="<div class='empty'>No lessons published here.</div>";return}
    box.innerHTML=rows.map(x=>`<div class="lesson-item"><div><b>${esc(x.name||x.id)}</b><small>${esc(x.type||"Lesson")} ${x.videoUrl?"· 🎥 Video":""} ${x.pdfUrl?"· 📄 PDF":""}</small></div><button class="danger" data-id="${esc(x.id)}">Delete</button></div>`).join("");
    box.querySelectorAll(".danger").forEach(b=>b.onclick=()=>deleteLesson(b.dataset.id));
  }catch(e){console.error(e);box.innerHTML="<div class='empty'>Could not load lessons: "+esc(e.message)+"</div>"}
}
async function deleteLesson(id){
  if(!confirm("Delete this lesson?"))return;
  try{await lessonRef().doc(id).delete();await loadLessons();await dashboardStats()}catch(e){alert(e.message)}
}
function resourcePreview(){const a=$("video").value,b=$("pdf").value;$("resourcePreview").textContent=[a?"🎥 Video ready":"",b?"📄 PDF ready":""].filter(Boolean).join("  •  ")||"No resource added yet."}
function clearForm(){["lessonName","description","video","pdf"].forEach(id=>$(id).value="");$("resourcePreview").textContent="No resource added yet.";setMsg("saveMsg","")}
async function publishLesson(){
  const c=$("course").value,s=$("semester").value,ch=$("chapter").value,name=$("lessonName").value.trim(),video=$("video").value.trim(),pdf=$("pdf").value.trim();
  if(!c||!s||!ch){setMsg("saveMsg","Select course, semester and chapter.");return}
  if(!name){setMsg("saveMsg","Enter a lesson name.");return}
  if(!video&&!pdf){setMsg("saveMsg","Add at least a video URL or PDF URL.");return}
  const btn=$("publish");btn.disabled=true;setMsg("saveMsg","Publishing...");
  try{
    const id="lesson-"+Date.now();
    await db.collection("courses").doc(c).collection("semesters").doc(s).collection("chapters").doc(ch).collection("lessons").doc(id).set({
      name,type:$("type").value,description:$("description").value.trim(),videoUrl:video,pdfUrl:pdf,order:Date.now(),published:true,createdAt:new Date().toISOString()
    });
    setMsg("saveMsg","Published successfully ✓");clearForm();await loadLessons();await dashboardStats();
  }catch(e){console.error(e);setMsg("saveMsg","Publish failed: "+(e.message||e.code))}
  finally{btn.disabled=false}
}
async function dashboardStats(){
  let sem=0,less=0,res=0;
  try{
    for(const c of courses){
      const ss=await db.collection("courses").doc(c[0]).collection("semesters").get();sem+=ss.size;
      for(const s of ss.docs){
        const cs=await db.collection("courses").doc(c[0]).collection("semesters").doc(s.id).collection("chapters").get();
        for(const ch of cs.docs){
          const ls=await db.collection("courses").doc(c[0]).collection("semesters").doc(s.id).collection("chapters").doc(ch.id).collection("lessons").get();
          less+=ls.size;ls.forEach(d=>{const x=d.data();if(x.videoUrl||x.pdfUrl)res++});
        }
      }
    }
    $("dashSem").textContent=sem;$("dashLessons").textContent=less;$("dashResources").textContent=res;
  }catch(e){console.error(e);$("dashSem").textContent=$("dashLessons").textContent=$("dashResources").textContent="—"}
}
boot();
})();