const { chromium } = require("playwright-core");
const fs=require("fs"),os=require("os"),path=require("path");
function chrome(){const r="/root/.cache/ms-playwright";for(const d of fs.readdirSync(r))for(const n of ["chrome","headless_shell"]){const p=`${r}/${d}/chrome-linux/${n}`;if(fs.existsSync(p))return p;}throw new Error("chrome introuvable");}
const BASE=process.argv[2]||"http://127.0.0.1:3123";
const etat=(p)=>p.evaluate(()=>{const e=document.querySelector(".ecran-ouverture");if(!e)return{present:false};const s=getComputedStyle(e);return{present:true,opacite:+s.opacity,visible:s.visibility!=="hidden"&&s.display!=="none"&&+s.opacity>0.5,clics:s.pointerEvents};});
(async()=>{
const pr=fs.mkdtempSync(path.join(os.tmpdir(),"ouv-"));
const c=await chromium.launchPersistentContext(pr,{executablePath:chrome(),args:["--no-sandbox"],viewport:{width:390,height:844},deviceScaleFactor:2});
const p=c.pages()[0]??await c.newPage();
let ok=0,ko=0;
const dire=(t,v)=>{console.log((v?"  OK  ":"  KO  ")+t);v?ok++:ko++;};

// 1. premiere visite : le rideau est la des la premiere peinture
await p.goto(BASE+"/",{waitUntil:"commit"});
await p.waitForTimeout(250);
const a=await etat(p);
dire("rideau affiche des la premiere peinture",a.present&&a.visible);
dire("transparent aux clics (ne bloque jamais une action)",a.clics==="none");
await p.screenshot({path:"/opt/dev/siira/shots-design/20-ouverture.png"});

// 2. il part tout seul, sans aucune interaction
await p.waitForTimeout(2200);
const b=await etat(p);
dire("parti tout seul apres 2,4 s",!b.present||!b.visible);

// 3. le contenu de la page est bien la derriere
dire("page utilisable derriere le rideau",await p.evaluate(()=>!!document.querySelector("main,#contenu")));

// 4. deuxieme visite dans la meme session : pas de rideau
await p.goto(BASE+"/connexion",{waitUntil:"commit"});
await p.waitForTimeout(250);
const d=await etat(p);
dire("pas rejoue a la navigation suivante",!d.present||!d.visible);
dire("attribut de session pose sur <html>",await p.evaluate(()=>document.documentElement.getAttribute("data-ouverture")==="non"));

// 5. animations reduites : jamais affiche
const pr2=fs.mkdtempSync(path.join(os.tmpdir(),"ouv2-"));
const c2=await chromium.launchPersistentContext(pr2,{executablePath:chrome(),args:["--no-sandbox"],viewport:{width:390,height:844},reducedMotion:"reduce"});
const p2=c2.pages()[0]??await c2.newPage();
await p2.goto(BASE+"/",{waitUntil:"commit"});
await p2.waitForTimeout(250);
const e=await etat(p2);
dire("non affiche si animations reduites",!e.present||!e.visible);
await c2.close();fs.rmSync(pr2,{recursive:true,force:true});

// 6. sans javascript : le rideau doit quand meme disparaitre
const pr3=fs.mkdtempSync(path.join(os.tmpdir(),"ouv3-"));
const c3=await chromium.launchPersistentContext(pr3,{executablePath:chrome(),args:["--no-sandbox"],viewport:{width:390,height:844},javaScriptEnabled:false});
const p3=c3.pages()[0]??await c3.newPage();
await p3.goto(BASE+"/",{waitUntil:"commit"});
await p3.waitForTimeout(250);
const f=await etat(p3);
dire("sans javascript : rideau affiche",f.present&&f.visible);
await p3.waitForTimeout(2200);
const g=await etat(p3);
dire("sans javascript : rideau parti quand meme (pas de piege)",!g.present||!g.visible);
await c3.close();fs.rmSync(pr3,{recursive:true,force:true});

await c.close();fs.rmSync(pr,{recursive:true,force:true});
console.log(ko===0?`\nECRAN D'OUVERTURE CONFORME — ${ok} verifications passees`:`\nECHEC — ${ko} probleme(s) sur ${ok+ko}`);
process.exit(ko===0?0:1);
})();
