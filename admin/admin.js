import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{getFirestore,collection,getDocs,doc,setDoc,deleteDoc,query,orderBy}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import{FIREBASE_CONFIG}from"../frontend/firebase-config.js";

const app=initializeApp(FIREBASE_CONFIG),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);

const courses=[
["computer-fundamentals","Computer Fundamentals","Computer","💻"],
["ms-word","MS Word","Office","W"],
["ms-excel","MS Excel","Office","X"],
["ms-powerpoint","MS PowerPoint","Office","P"],
["computer-application","Computer Application","Computer","🖥"],
["html","HTML","Web Development","<>"],
["css","CSS","Web Development","#"],
["javascript","JavaScript","Programming","JS"],
["python","Python","Programming","Py"],
["java","Java","Programming","☕"],
["c","C","Programming","C"],
["cpp","C++","Programming","C++"],
["networks","Networks","Networking","🌐"],
["cybersecurity","Cybersecurity","Security","🔒"]
];

function setStatus(id,msg){$(id).textContent=msg}
function esc(v){return String(v??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}

onAuthStateChanged(auth,u=>{
 if(u){
  $("loginScreen").classList.remove("active");$("appScreen").classList.add("active");
  $("adminEmail").textContent=u.email||"Signed in";
  populateCourses();
 }else{
  $("appScreen").classList.remove("active");$("loginScreen").classList.add("active");
 }
});

$("loginBtn").onclick=async()=>{
 setStatus("loginStatus","Signing in...");
 try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}
 catch(e){setStatus("loginStatus",e.message)}
};
$("logoutBtn").onclick=()=>signOut(auth);

function populateCourses(){
 $("courseSelect").innerHTML=courses.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join("");
 loadSemesters();
}

$("courseSelect").onchange=loadSemesters;
$("semesterSelect").onchange=loadChapters;
$("chapterSelect").onchange=loadLessons;
$("refreshBtn").onclick=()=>loadLessons();

async function loadSemesters(){
 const courseId=$("courseSelect").value;
 $("semesterSelect").innerHTML="<option>Loading...</option>";
 try{
  const snap=await getDocs(collection(db,"courses",courseId,"semesters"));
  if(snap.empty){
   $("semesterSelect").innerHTML="<option value=''>No semesters yet</option>";
   $("chapterSelect").innerHTML="<option value=''>Select semester first</option>";
   $("lessons").innerHTML="<div class='empty'>Add semester data in Firestore first.</div>";
   return;
  }
  const rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order??999)-(b.order??999));
  $("semesterSelect").innerHTML=rows.map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.id)}</option>`).join("");
  await loadChapters();
 }catch(e){setStatus("saveStatus",e.message)}
}

async function loadChapters(){
 const courseId=$("courseSelect").value,semesterId=$("semesterSelect").value;
 if(!semesterId)return;
 $("chapterSelect").innerHTML="<option>Loading...</option>";
 try{
  const snap=await getDocs(collection(db,"courses",courseId,"semesters",semesterId,"chapters"));
  if(snap.empty){$("chapterSelect").innerHTML="<option value=''>No chapters yet</option>";$("lessons").innerHTML="<div class='empty'>Add chapters in Firestore first.</div>";return}
  const rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order??999)-(b.order??999));
  $("chapterSelect").innerHTML=rows.map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.id)}</option>`).join("");
  await loadLessons();
 }catch(e){setStatus("saveStatus",e.message)}
}

async function loadLessons(){
 const courseId=$("courseSelect").value,semesterId=$("semesterSelect").value,chapterId=$("chapterSelect").value;
 if(!courseId||!semesterId||!chapterId)return;
 const box=$("lessons");box.innerHTML="<div class='empty'>Loading...</div>";
 try{
  const snap=await getDocs(collection(db,"courses",courseId,"semesters",semesterId,"chapters",chapterId,"lessons"));
  const rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order??999)-(b.order??999));
  $("lessonCount").textContent=rows.length;
  $("resourceCount").textContent=rows.filter(x=>x.pdfUrl||x.pdf||x.videoUrl||x.video).length;
  if(!rows.length){box.innerHTML="<div class='empty'>No published lessons in this chapter.</div>";return}
  box.innerHTML="";
  rows.forEach(x=>{
   const el=document.createElement("div");el.className="lesson-item";
   el.innerHTML=`<div><b>${esc(x.name||x.id)}</b><small>${esc(x.type||"Lesson")} ${x.videoUrl||x.video?"· 🎥":""} ${x.pdfUrl||x.pdf?"· 📄":""}</small></div>
   <div class="lesson-actions"><button class="danger" data-id="${esc(x.id)}">Delete</button></div>`;
   el.querySelector(".danger").onclick=()=>removeLesson(x.id);
   box.appendChild(el);
  });
 }catch(e){box.innerHTML="<div class='empty'>Could not load lessons.</div>";setStatus("saveStatus",e.message)}
}

$("saveBtn").onclick=async()=>{
 const courseId=$("courseSelect").value,semesterId=$("semesterSelect").value,chapterId=$("chapterSelect").value;
 const name=$("lessonName").value.trim();
 if(!courseId||!semesterId||!chapterId)return setStatus("saveStatus","Select course, semester and chapter.");
 if(!name)return setStatus("saveStatus","Enter a lesson name.");
 setStatus("saveStatus","Publishing...");
 try{
  const id="lesson-"+Date.now();
  await setDoc(doc(db,"courses",courseId,"semesters",semesterId,"chapters",chapterId,"lessons",id),{
   name,type:$("lessonType").value,description:$("description").value.trim(),
   videoUrl:$("videoUrl").value.trim(),pdfUrl:$("pdfUrl").value.trim(),
   order:Date.now(),published:true,createdAt:new Date().toISOString()
  });
  setStatus("saveStatus","Lesson published successfully.");
  clearForm();await loadLessons();
 }catch(e){setStatus("saveStatus",e.message)}
};

async function removeLesson(id){
 if(!confirm("Delete this lesson?"))return;
 try{
  const p=doc(db,"courses",$("courseSelect").value,"semesters",$("semesterSelect").value,"chapters",$("chapterSelect").value,"lessons",id);
  await deleteDoc(p);await loadLessons();setStatus("saveStatus","Lesson deleted.");
 }catch(e){setStatus("saveStatus",e.message)}
}

function clearForm(){
 ["lessonName","description","videoUrl","pdfUrl"].forEach(id=>$(id).value="");
 $("lessonType").value="Lesson";
}
$("clearBtn").onclick=clearForm;
