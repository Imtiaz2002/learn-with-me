import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{getFirestore,collection,getDocs,doc,setDoc,deleteDoc}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import{FIREBASE_CONFIG}from"../frontend/firebase-config.js";

const app=initializeApp(FIREBASE_CONFIG),auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);
const courses=[["computer-fundamentals","Computer Fundamentals","💻"],["ms-word","MS Word","W"],["ms-excel","MS Excel","X"],["ms-powerpoint","MS PowerPoint","P"],["computer-application","Computer Application","🖥"],["html","HTML","<>"],["css","CSS","#"],["javascript","JavaScript","JS"],["python","Python","Py"],["java","Java","☕"],["c","C","C"],["cpp","C++","C++"],["networks","Networks","🌐"],["cybersecurity","Cybersecurity","🔒"]];
const esc=v=>String(v??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const msg=(id,t)=>$(id).textContent=t;
function showPage(page){document.querySelectorAll(".screen.page").forEach(x=>x.classList.remove("active"));$(page).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));window.scrollTo(0,0)}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
$("goContent").onclick=$("quickContent").onclick=()=>showPage("content");

onAuthStateChanged(auth,u=>{
 if(u){$("login").classList.remove("active");$("dashboard").classList.add("active");document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$("dashboard").classList.add("active");init();}
 else{document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));$("login").classList.add("active")}
});
$("loginBtn").onclick=async()=>{msg("loginMsg","Signing in...");try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}catch(e){msg("loginMsg",e.message)}};
$("logout").onclick=$("mobileLogout").onclick=()=>signOut(auth);

async function init(){renderCourses();$("course").innerHTML=courses.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join("");$("lessonCourse").innerHTML=$("course").innerHTML;await loadSemesters("course","semester","chapter");await loadSemesters("lessonCourse","lessonSemester","lessonChapter");await dashboardStats();}
function renderCourses(){$("courseTiles").innerHTML=courses.map(x=>`<div class="course-tile"><i>${esc(x[2])}</i><div><b>${esc(x[1])}</b><small>Connected course</small></div></div>`).join("")}

async function loadSemesters(courseSel,semSel,chSel){
 const id=$(courseSel).value;$(semSel).innerHTML="<option>Loading...</option>";
 try{const s=await getDocs(collection(db,"courses",id,"semesters"));const rows=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order??999)-(b.order??999));
 $(semSel).innerHTML=rows.length?rows.map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.id)}</option>`).join(""):"<option value=''>No semesters</option>";await loadChapters(courseSel,semSel,chSel)}
 catch(e){$(semSel).innerHTML="<option value=''>Could not load</option>"}}
async function loadChapters(courseSel,semSel,chSel){
 const c=$(courseSel).value,s=$(semSel).value;if(!s)return;$(chSel).innerHTML="<option>Loading...</option>";
 try{const snap=await getDocs(collection(db,"courses",c,"semesters",s,"chapters"));const rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order??999)-(b.order??999));
 $(chSel).innerHTML=rows.length?rows.map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.id)}</option>`).join(""):"<option value=''>No chapters</option>";if(chSel==="lessonChapter")await loadLessons()}
 catch(e){$(chSel).innerHTML="<option value=''>Could not load</option>"}}
$("course").onchange=()=>loadSemesters("course","semester","chapter");
$("semester").onchange=()=>loadChapters("course","semester","chapter");
$("lessonCourse").onchange=()=>loadSemesters("lessonCourse","lessonSemester","lessonChapter");
$("lessonSemester").onchange=()=>loadChapters("lessonCourse","lessonSemester","lessonChapter");
$("lessonChapter").onchange=loadLessons;

async function loadLessons(){
 const c=$("lessonCourse").value,s=$("lessonSemester").value,ch=$("lessonChapter").value;if(!c||!s||!ch)return;
 const box=$("lessonList");box.innerHTML="<div class='empty'>Loading...</div>";
 try{const snap=await getDocs(collection(db,"courses",c,"semesters",s,"chapters",ch,"lessons"));const rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order??999)-(b.order??999));
 if(!rows.length){box.innerHTML="<div class='empty'>No lessons published here.</div>";return}
 box.innerHTML=rows.map(x=>`<div class="lesson-item"><div><b>${esc(x.name||x.id)}</b><small>${esc(x.type||"Lesson")} ${x.videoUrl?"· 🎥":""} ${x.pdfUrl?"· 📄":""}</small></div><button class="danger" data-id="${esc(x.id)}">Delete</button></div>`).join("");
 box.querySelectorAll(".danger").forEach(b=>b.onclick=()=>deleteLesson(b.dataset.id))}
 catch(e){box.innerHTML="<div class='empty'>Could not load lessons.</div>"}}
async function deleteLesson(id){if(!confirm("Delete this lesson?"))return;try{await deleteDoc(doc(db,"courses",$("lessonCourse").value,"semesters",$("lessonSemester").value,"chapters",$("lessonChapter").value,"lessons",id));await loadLessons();await dashboardStats()}catch(e){alert(e.message)}}

$("video").oninput=$("pdf").oninput=()=>{$("resourcePreview").textContent=[$("video").value?"🎥 Video ready":"", $("pdf").value?"📄 PDF ready":""].filter(Boolean).join("  •  ")||"No resource added yet."};
$("clear").onclick=()=>{["lessonName","description","video","pdf"].forEach(id=>$(id).value="");$("resourcePreview").textContent="No resource added yet.";msg("saveMsg","")};
$("publish").onclick=async()=>{
 const c=$("course").value,s=$("semester").value,ch=$("chapter").value,name=$("lessonName").value.trim();
 if(!c||!s||!ch)return msg("saveMsg","Select course, semester and chapter.");
 if(!name)return msg("saveMsg","Enter a lesson name.");
 msg("saveMsg","Publishing...");
 try{const id="lesson-"+Date.now();await setDoc(doc(db,"courses",c,"semesters",s,"chapters",ch,"lessons",id),{name,type:$("type").value,description:$("description").value.trim(),videoUrl:$("video").value.trim(),pdfUrl:$("pdf").value.trim(),order:Date.now(),published:true,createdAt:new Date().toISOString()});
 msg("saveMsg","Published successfully ✓");$("clear").click();await loadLessons();await dashboardStats()}catch(e){msg("saveMsg",e.message)}};

async function dashboardStats(){
 let sem=0,less=0,res=0;
 try{for(const c of courses){const ss=await getDocs(collection(db,"courses",c[0],"semesters"));sem+=ss.size;for(const s of ss.docs){const cs=await getDocs(collection(db,"courses",c[0],"semesters",s.id,"chapters"));for(const ch of cs.docs){const ls=await getDocs(collection(db,"courses",c[0],"semesters",s.id,"chapters",ch.id,"lessons"));less+=ls.size;ls.forEach(d=>{const x=d.data();if(x.pdfUrl||x.videoUrl)res++})}}}$("dashSem").textContent=sem;$("dashLessons").textContent=less;$("dashResources").textContent=res}catch(e){$("dashSem").textContent=$("dashLessons").textContent="—";$("dashResources").textContent="—"}}
