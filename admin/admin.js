(function(){
"use strict";

const FIREBASE_CONFIG={
 apiKey:"AIzaSyAEmInnWVtiuwPGrcjjsu3I2qc2IAT1lzg",
 authDomain:"is-esports.firebaseapp.com",
 projectId:"is-esports",
 storageBucket:"is-esports.firebasestorage.app",
 messagingSenderId:"669572694478",
 appId:"1:669572694478:web:5e15b166902a9e0d326b9f",
 measurementId:"G-ZPP10G2XFY"
};

const ADMIN_EMAIL="admin@brainbyte.com";
const ADMIN_PASSWORD="1122@3344";
const $=id=>document.getElementById(id);

function setMsg(t){
  const el=$("loginMsg");
  if(el) el.textContent=t;
}

window.addEventListener("error",e=>{
  setMsg("Page error: "+(e.message||"JavaScript error"));
});

window.addEventListener("unhandledrejection",e=>{
  const r=e.reason||{};
  setMsg("Firebase error: "+(r.message||r.code||"Unknown error"));
});

function boot(){
  const btn=$("loginBtn");
  const email=$("email");
  const password=$("password");

  if(!btn||!email||!password){
    setMsg("Login page failed to load.");
    return;
  }

  try{
    if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    const auth=firebase.auth();

    auth.onAuthStateChanged(function(user){
      if(user){
        setMsg("Login successful. Loading Admin Studio…");
        document.body.innerHTML += '<div id="adminLoaded" style="position:fixed;inset:0;background:#f4f6fa;z-index:99999;padding:40px;font:700 20px system-ui">Admin authentication is working ✓<br><small style="font-weight:500">Anonymous Firebase UID: '+user.uid+'</small></div>';
      }
    });

    btn.addEventListener("click",async function(){
      btn.disabled=true;
      setMsg("Checking admin credentials…");

      if(email.value.trim()!==ADMIN_EMAIL || password.value!==ADMIN_PASSWORD){
        setMsg("Wrong admin ID or password.");
        btn.disabled=false;
        return;
      }

      try{
        setMsg("Signing in to Firebase…");
        await auth.signInAnonymously();
        localStorage.setItem("learnWithMeAdmin","1");
      }catch(e){
        console.error(e);
        if(e.code==="auth/operation-not-allowed"){
          setMsg("Anonymous Authentication is OFF in Firebase.");
        }else{
          setMsg("Login failed: "+(e.message||e.code||"Unknown Firebase error"));
        }
      }finally{
        btn.disabled=false;
      }
    });

    password.addEventListener("keydown",e=>{
      if(e.key==="Enter") btn.click();
    });

    setMsg("Ready. Tap Sign in.");
  }catch(e){
    console.error(e);
    setMsg("Firebase setup error: "+(e.message||"Unknown error"));
  }
}

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
else boot();
})();