import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(seed)=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
const terrainHeight=(x,z)=>{const d=Math.sqrt(x*x+z*z);return Math.sin(x*.055)*1.2+Math.cos(z*.061)*1.15+Math.sin((x+z)*.031)*1.7+Math.cos((x-z)*.023)*1.2-Math.max(0,d-85)*.48;};

export class WildlandsGame{
 constructor(canvas,onUI){
  this.canvas=canvas;this.onUI=onUI;this.controls={forward:'KeyW',backward:'KeyS',left:'KeyA',right:'KeyD',sprint:'ShiftLeft',jump:'Space',gather:'KeyE',build:'KeyF',eat:'KeyQ',pause:'Escape'};this.settings={sensitivity:1,invertY:false,headBob:true,fov:72};this.loadPreferences();this.moveVelocity=new THREE.Vector3();this.bobTime=0;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#9ab6b6');this.scene.fog=new THREE.FogExp2('#9ab6b6',.0065);
  this.camera=new THREE.PerspectiveCamera(this.settings.fov,innerWidth/innerHeight,.1,650);this.camera.position.set(0,2,10);
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setSize(innerWidth,innerHeight);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;this.renderer.setClearColor('#a7c2c3');
  this.clock=new THREE.Clock();this.keys={};this.objects=[];this.resources={wood:0,stone:0,berries:0};this.stats={health:100,hunger:100,thirst:100};this.stamina=100;this.weather='clear';this.weatherTimer=0;this.rain=null;this.clouds=[];this.dayTime=.32;this.day=1;this.elapsed=0;this.started=false;this.paused=true;this.selected=0;this.fireBuilt=false;this.lastUI=0;this.toastUntil=0;this.lastGather=null;this.velocityY=0;this.onGround=true;this.yaw=0;this.pitch=0;this.pointerLocked=false;this.worldSeed=427;
  this.makeLighting();this.makeTerrain();this.makeWater();this.makeForest();this.makeSkyDetails();this.makeAtmosphere();this.makePlayer();this.bind();this.loadLocal();this.animate();
 }
 loadPreferences(){try{const p=JSON.parse(localStorage.getItem('wildlands-preferences')||'null');if(p){Object.assign(this.settings,p.settings||{});Object.assign(this.controls,p.controls||{});}}catch{}}
 savePreferences(){try{localStorage.setItem('wildlands-preferences',JSON.stringify({settings:this.settings,controls:this.controls}));}catch{}}
 setSetting(key,value){if(!(key in this.settings))return;this.settings[key]=value;if(key==='fov'){this.camera.fov=value;this.camera.updateProjectionMatrix();}this.savePreferences();}
 setBinding(action,code){if(!(action in this.controls))return;this.controls[action]=code;this.keys={};this.savePreferences();}
 makeLighting(){
  this.ambient=new THREE.HemisphereLight('#d8e8e5','#36432e',1.35);this.scene.add(this.ambient);this.fillLight=new THREE.DirectionalLight('#d6e4ec',.42);this.fillLight.position.set(55,35,35);this.scene.add(this.fillLight);
  this.sun=new THREE.DirectionalLight('#ffe5b4',3.2);this.sun.position.set(-70,110,-45);this.sun.castShadow=true;this.sun.shadow.mapSize.set(3072,3072);this.sun.shadow.camera.left=-90;this.sun.shadow.camera.right=90;this.sun.shadow.camera.top=90;this.sun.shadow.camera.bottom=-90;this.sun.shadow.bias=-.00025;this.scene.add(this.sun);this.scene.add(this.sun.target);
 }
 makeGroundTexture(){
  const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#747b52';ctx.fillRect(0,0,512,512);let seed=881;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<18000;i++){const x=rnd()*512,y=rnd()*512,r=.3+rnd()*2.4;ctx.globalAlpha=.08+rnd()*.22;ctx.fillStyle=rnd()>.5?'#c1b98a':'#283e2c';ctx.beginPath();ctx.ellipse(x,y,r*1.7,r, rnd()*Math.PI,0,Math.PI*2);ctx.fill();}
  for(let i=0;i<950;i++){ctx.globalAlpha=.12+rnd()*.2;ctx.strokeStyle=rnd()>.5?'#d1c79b':'#293d29';ctx.lineWidth=.5+rnd();ctx.beginPath();const x=rnd()*512,y=rnd()*512;ctx.moveTo(x,y);ctx.lineTo(x+(rnd()-.5)*8,y+2+rnd()*12);ctx.stroke();}
  ctx.globalAlpha=1;const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(15,15);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return tex;
 }
 makeTerrain(){
  const n=190,size=250,geo=new THREE.PlaneGeometry(size,size,n,n);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;const colors=[];
  const grass=new THREE.Color('#526b42'),moss=new THREE.Color('#7c8958'),earth=new THREE.Color('#645e49');
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=terrainHeight(x,z);p.setY(i,h);const noise=rand(i*17+9);let c=grass.clone().lerp(moss,clamp((h+2)/9,0,.55));if(noise>.88)c.lerp(earth,.23);colors.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  const groundMap=this.makeGroundTexture();const mat=new THREE.MeshStandardMaterial({vertexColors:true,map:groundMap,roughness:1,metalness:0});this.ground=new THREE.Mesh(geo,mat);this.ground.receiveShadow=true;this.scene.add(this.ground);
  // A far ridge line creates a readable horizon around the playable island.
  for(let ring=0;ring<2;ring++){const points=[];for(let i=0;i<=100;i++){const a=i/100*Math.PI*2,r=110+ring*19+Math.sin(i*2.4)*5;points.push(new THREE.Vector3(Math.cos(a)*r,3+rand(i+ring*70)*5,Math.sin(a)*r));}const ridgeGeo=new THREE.BufferGeometry().setFromPoints(points);const ridge=new THREE.LineLoop(ridgeGeo,new THREE.LineBasicMaterial({color:ring?'#526452':'#6b7c65',transparent:true,opacity:.7}));this.scene.add(ridge);}
 }
 makeWater(){
  const geo=new THREE.PlaneGeometry(700,700,80,80);geo.rotateX(-Math.PI/2);this.waterGeo=geo;this.water=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#477c80',roughness:.23,metalness:.18,transparent:true,opacity:.87}));this.water.position.y=-2.2;this.scene.add(this.water);
 }
 makeTree(x,z,scale){
  const g=new THREE.Group();g.position.set(x,terrainHeight(x,z),z);g.scale.setScalar(scale);
  const bark=new THREE.MeshStandardMaterial({color:new THREE.Color('#59402d').multiplyScalar(.82+rand(x+z)*.35),roughness:1});const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.19,.38,3.7,9,4),bark);trunk.position.y=1.85;trunk.castShadow=true;trunk.receiveShadow=true;g.add(trunk);
  for(let k=0;k<5;k++){const ridge=new THREE.Mesh(new THREE.CylinderGeometry(.012,.035,2.4+rand(k+x)*.8,4),new THREE.MeshStandardMaterial({color:'#34271f',roughness:1}));ridge.position.set((rand(k+x+z)-.5)*.24,1.8,(rand(k*7+x)-.5)*.24);ridge.rotation.z=(rand(k+z)-.5)*.15;g.add(ridge);}
  const palette=['#203e2d','#294b35','#31583b','#3b6241','#4b7047'];for(let i=0;i<8;i++){const tier=Math.floor(i/3),r=1.25+rand(i+x)*.62-tier*.18;const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(r,2),new THREE.MeshStandardMaterial({color:palette[Math.floor(rand(x*33+z*9+i*4)*palette.length)],roughness:.94,flatShading:false}));crown.position.set((rand(i+x*2)-.5)*1.3,2.7+tier*1.05+rand(i+z)*.8,(rand(i*2+z)-.5)*1.3);crown.scale.set(1,1.05+rand(i+x)*.3,.9+rand(i+z)*.25);crown.castShadow=true;crown.receiveShadow=true;g.add(crown);}
  for(let i=0;i<3;i++){const branch=new THREE.Mesh(new THREE.CylinderGeometry(.035,.09,1.2,6),bark);branch.position.set((i-1)*.35,2.4+i*.25,0);branch.rotation.z=(i-1)*-.7;branch.rotation.x=.4;branch.castShadow=true;g.add(branch);}
  g.userData={kind:'tree',label:'BAUM',wood:2,position2:new THREE.Vector2(x,z)};this.scene.add(g);this.objects.push(g);
 }
 makeRock(x,z,scale){
  const geo=new THREE.IcosahedronGeometry(.9,2);const pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const k=.72+rand(i*31+x*4+z)*.58;pos.setXYZ(i,pos.getX(i)*k,pos.getY(i)*k,pos.getZ(i)*k);}geo.computeVertexNormals();
  const rock=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:new THREE.Color(rand(x+z)>.5?'#777c78':'#626b67').multiplyScalar(.82+rand(x*z)*.32),roughness:.98,flatShading:false}));rock.position.set(x,terrainHeight(x,z)+.15,z);rock.rotation.set(rand(x)*.4,rand(z)*4,rand(x+z)*.35);rock.scale.set(scale,scale*.75,scale*.9);rock.castShadow=true;rock.receiveShadow=true;rock.userData={kind:'rock',label:'STEIN',stone:2};this.scene.add(rock);this.objects.push(rock);
 }
 makeBush(x,z){
  const g=new THREE.Group();g.position.set(x,terrainHeight(x,z),z);for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.34+rand(i+x)*.18,1),new THREE.MeshStandardMaterial({color:i%2?'#526f43':'#67844b',roughness:1,flatShading:true}));m.position.set((rand(i*4+x)-.5)*.8,.3+rand(i+z)*.35,(rand(i*9+z)-.5)*.8);m.castShadow=true;g.add(m);}for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),new THREE.MeshStandardMaterial({color:'#a54f42',roughness:.5}));b.position.set((rand(i+x)-.5)*.5,.55+rand(i+z)*.35,(rand(i+z*2)-.5)*.5);g.add(b);}g.userData={kind:'bush',label:'BEERENSTRAUCH',berries:2};this.scene.add(g);this.objects.push(g);
 }
 makeForest(){
  let seed=100;for(let i=0;i<430;i++){const a=rand(seed++)*Math.PI*2,r=13+Math.sqrt(rand(seed++))*90,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.sqrt(x*x+z*z)>98||terrainHeight(x,z)<-1)continue;this.makeTree(x,z,.72+rand(seed++)*.75);}
  for(let i=0;i<135;i++){const a=rand(seed++)*Math.PI*2,r=7+Math.sqrt(rand(seed++))*82,x=Math.cos(a)*r,z=Math.sin(a)*r;if(terrainHeight(x,z)<-1)continue;this.makeRock(x,z,.45+rand(seed++)*.9);}
  for(let i=0;i<85;i++){const a=rand(seed++)*Math.PI*2,r=7+Math.sqrt(rand(seed++))*75,x=Math.cos(a)*r,z=Math.sin(a)*r;if(terrainHeight(x,z)>-1)this.makeBush(x,z);}
  // Pebbles and wild grass tufts add scale and texture close to the player.
  const geo=new THREE.ConeGeometry(.055,.28,3);const mat=new THREE.MeshStandardMaterial({color:'#9b9d65',roughness:1});const grass=new THREE.InstancedMesh(geo,mat,1700);const dummy=new THREE.Object3D();let count=0;
  for(let i=0;i<1700;i++){const a=rand(i+77)*Math.PI*2,r=rand(i+88)*94,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x,z);if(y<-1)continue;dummy.position.set(x,y+.13,z);dummy.rotation.set(rand(i+8)*.3,rand(i+9)*6,rand(i+10)*.3);dummy.scale.setScalar(.5+rand(i+11));dummy.updateMatrix();grass.setMatrixAt(count++,dummy.matrix);}grass.count=count;grass.receiveShadow=true;this.scene.add(grass);
 }
 makeAtmosphere(){
  const cloudMat=new THREE.MeshStandardMaterial({color:'#d7e0d7',transparent:true,opacity:.25,roughness:1,depthWrite:false});
  for(let i=0;i<22;i++){const cloud=new THREE.Group();const x=(rand(i*19)-.5)*430,z=(rand(i*29)-.5)*430;cloud.position.set(x,42+rand(i*7)*22,z);for(let j=0;j<5;j++){const puff=new THREE.Mesh(new THREE.SphereGeometry(3.5+rand(i*3+j)*5,10,8),cloudMat);puff.position.set((j-2)*4,rand(j+i)*2,(rand(j*2+i)-.5)*5);puff.scale.y=.45+rand(i+j)*.25;cloud.add(puff);}cloud.userData={speed:.15+rand(i+8)*.35,originX:x};this.scene.add(cloud);this.clouds.push(cloud);}
  const dustGeo=new THREE.BufferGeometry();const dustPositions=new Float32Array(220*3);for(let i=0;i<220;i++){dustPositions[i*3]=(rand(i*3)-.5)*45;dustPositions[i*3+1]=rand(i*4)*15;dustPositions[i*3+2]=(rand(i*5)-.5)*45;}dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));this.dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#e3d9a8',size:.045,transparent:true,opacity:.34,sizeAttenuation:true}));this.scene.add(this.dust);
 }
 makeSkyDetails(){
  const starsGeo=new THREE.BufferGeometry(),arr=[];for(let i=0;i<700;i++){const a=rand(i*4)*Math.PI*2,y=rand(i*5)*.95+.05,r=260,s=Math.sqrt(1-y*y);arr.push(Math.cos(a)*s*r,y*r,Math.sin(a)*s*r);}starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));this.stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:'#e2f0ff',size:.75,transparent:true,opacity:0,sizeAttenuation:false}));this.scene.add(this.stars);
  this.sunBall=new THREE.Mesh(new THREE.SphereGeometry(4,24,24),new THREE.MeshBasicMaterial({color:'#fff0c3'}));this.scene.add(this.sunBall);
  this.moonBall=new THREE.Mesh(new THREE.SphereGeometry(2.1,20,20),new THREE.MeshBasicMaterial({color:'#dbe6ee'}));this.scene.add(this.moonBall);
 }
 makePlayer(){
  this.player=new THREE.Group();this.player.position.set(0,terrainHeight(0,0)+1.65,4);this.scene.add(this.player);this.camera.position.set(0,0,0);this.player.add(this.camera);this.camera.position.set(0,.03,0);this.player.position.y=terrainHeight(0,4)+1.65;
 }
 bind(){
  this.onKeyDown=e=>{this.keys[e.code]=true;if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.repeat)return;
   if(e.code===this.controls.pause){this.togglePause();}if(e.code===this.controls.gather)this.gather();if(e.code===this.controls.build)this.buildFire();if(e.code===this.controls.eat)this.eatBerries();if(/^Digit[1-5]$/.test(e.code)){this.selected=Number(e.code.slice(-1))-1;this.updateUI();}
  };this.onKeyUp=e=>this.keys[e.code]=false;
  this.onMouse=e=>{if(!this.pointerLocked||this.paused)return;this.yaw-=e.movementX*.0022*this.settings.sensitivity;this.pitch=clamp(this.pitch+(this.settings.invertY?1:-1)*e.movementY*.0018*this.settings.sensitivity,-1.35,1.35);this.player.rotation.y=this.yaw;this.camera.rotation.x=this.pitch;};
  this.onLock=()=>{this.pointerLocked=document.pointerLockElement===this.canvas;};
  this.canvas.addEventListener('click',()=>{if(this.started&&!this.paused)this.canvas.requestPointerLock?.();});
  document.addEventListener('keydown',this.onKeyDown);document.addEventListener('keyup',this.onKeyUp);document.addEventListener('mousemove',this.onMouse);document.addEventListener('pointerlockchange',this.onLock);window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
 }
 start(){this.started=true;this.paused=false;this.clock.getDelta();this.canvas.requestPointerLock?.();this.onUI({type:'started'});}
 togglePause(){if(!this.started)return;this.paused=!this.paused;if(this.paused&&document.pointerLockElement)document.exitPointerLock();if(!this.paused)this.canvas.requestPointerLock?.();this.onUI({type:'pause',paused:this.paused});}
 nearest(){
  let best=null,bd=4.2;const p=this.player.position;for(const o of this.objects){if(o.userData.collected)continue;const d=Math.hypot(o.position.x-p.x,o.position.z-p.z);if(d<bd){bd=d;best=o;}}
  return best;
 }
 gather(){
  if(this.paused)return;const o=this.nearest();if(!o){this.toast('NICHTS IN REICHWEITE');return;}
  const d=o.userData;if(d.kind==='tree'){this.resources.wood+=d.wood;this.toast('+ '+d.wood+' HOLZ');}
  else if(d.kind==='rock'){this.resources.stone+=d.stone;this.toast('+ '+d.stone+' STEIN');}
  else if(d.kind==='bush'){this.resources.berries+=d.berries;this.toast('+ '+d.berries+' BEEREN · Q ZUM ESSEN');}
  d.collected=true;this.scene.remove(o);this.updateUI();this.saveLocal();
 }
 eatBerries(){if(this.resources.berries<=0){this.toast('KEINE BEEREN — FINDE EINEN STRAUCH');return;}this.resources.berries--;this.stats.hunger=clamp(this.stats.hunger+22,0,100);this.stats.thirst=clamp(this.stats.thirst+5,0,100);this.toast('BEEREN GEGESSEN · HUNGER GESTILLT');this.updateUI();}
 buildFire(){
  if(this.paused)return;if(this.fireBuilt){this.toast('DEIN LAGERFEUER STEHT BEREITS');return;}if(this.resources.wood<5||this.resources.stone<3){this.toast('BENÖTIGT: 5 HOLZ + 3 STEIN');return;}
  this.resources.wood-=5;this.resources.stone-=3;this.fireBuilt=true;const g=new THREE.Group();g.position.set(this.player.position.x,terrainHeight(this.player.position.x,this.player.position.z)+.2,this.player.position.z-1.6);
  const woodMat=new THREE.MeshStandardMaterial({color:'#795338',roughness:.95});for(let i=0;i<5;i++){const log=new THREE.Mesh(new THREE.CylinderGeometry(.12,.14,1.5,7),woodMat);log.rotation.z=Math.PI/2;log.rotation.y=i*.58;log.position.y=.15+i*.015;log.castShadow=true;g.add(log);}
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.38,1.15,7),new THREE.MeshBasicMaterial({color:'#ff8c3d',transparent:true,opacity:.85}));flame.position.y=.78;g.add(flame);const core=new THREE.Mesh(new THREE.ConeGeometry(.2,.7,7),new THREE.MeshBasicMaterial({color:'#ffe59b'}));core.position.y=.62;g.add(core);
  const light=new THREE.PointLight('#ff9a4d',8,18,2);light.position.y=1.1;g.add(light);g.userData.flame=flame;g.userData.light=light;this.fire=g;this.scene.add(g);this.toast('LAGERFEUER ERRICHTET · DU BIST BEREIT FÜR DIE NACHT');this.updateUI();this.saveLocal();
 }
 updateSurvival(dt){
  if(!this.started||this.paused)return;this.stats.hunger=clamp(this.stats.hunger-dt*.13,0,100);this.stats.thirst=clamp(this.stats.thirst-dt*.22,0,100);if(this.stats.hunger<=0||this.stats.thirst<=0)this.stats.health=clamp(this.stats.health-dt*.8,0,100);if(this.stamina<100&&!this.keys[this.controls.sprint])this.stamina=clamp(this.stamina+dt*18,0,100);
  if(this.stats.health<=0){this.stats.health=45;this.stats.hunger=35;this.stats.thirst=35;this.player.position.set(0,terrainHeight(0,0)+1.65,4);this.toast('ERSCHÖPFT ZUSAMMENGEBROCHEN · DU BIST WIEDER AUFGEWACHT');}
 }
 updateMovement(dt){
  if(!this.started||this.paused)return;const forward=new THREE.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw)),right=new THREE.Vector3(Math.cos(this.yaw),0,-Math.sin(this.yaw));const move=new THREE.Vector3();
  if(this.keys[this.controls.forward]||this.keys.ArrowUp)move.add(forward);if(this.keys[this.controls.backward]||this.keys.ArrowDown)move.sub(forward);if(this.keys[this.controls.right]||this.keys.ArrowRight)move.add(right);if(this.keys[this.controls.left]||this.keys.ArrowLeft)move.sub(right);
  const moving=move.lengthSq()>0;if(moving)move.normalize();const wantsSprint=Boolean(this.keys[this.controls.sprint]||this.keys.ShiftRight);const sprinting=wantsSprint&&this.stamina>1&&moving;if(sprinting)this.stamina=clamp(this.stamina-dt*25,0,100);const targetVelocity=move.multiplyScalar(sprinting?8.2:4.6);this.moveVelocity.lerp(targetVelocity,Math.min(1,dt*10));this.player.position.addScaledVector(this.moveVelocity,dt);for(const o of this.objects){if(o.userData.collected)continue;const dx=this.player.position.x-o.position.x,dz=this.player.position.z-o.position.z,d=Math.hypot(dx,dz);const radius=o.userData.kind==='tree'?.58*(o.scale.x||1):o.userData.kind==='rock'?.48*(o.scale.x||1):.34;if(d<radius+.34&&d>.001){const push=(radius+.34-d)/d;this.player.position.x+=dx*push;this.player.position.z+=dz*push;}}this.player.position.x=clamp(this.player.position.x,-118,118);this.player.position.z=clamp(this.player.position.z,-118,118);this.bobTime+=dt*(sprinting?13:9)*Math.min(1,this.moveVelocity.length()/3);this.camera.fov=THREE.MathUtils.damp(this.camera.fov,sprinting&&moving?this.settings.fov+5:this.settings.fov,7,dt);this.camera.updateProjectionMatrix();if(this.settings.headBob&&!this.paused){this.camera.position.y=.03+(moving?Math.sin(this.bobTime)*.035*Math.min(1,this.moveVelocity.length()/3):0);this.camera.position.x=moving?Math.cos(this.bobTime*.5)*.012*Math.min(1,this.moveVelocity.length()/3):0;}else{this.camera.position.y=.03;this.camera.position.x=0;}
  if(this.keys[this.controls.jump]&&this.onGround){this.velocityY=7;this.onGround=false;}this.velocityY-=18*dt;this.player.position.y+=this.velocityY*dt;const floor=terrainHeight(this.player.position.x,this.player.position.z)+1.65;if(this.player.position.y<floor){this.player.position.y=floor;this.velocityY=0;this.onGround=true;}
  this.dayTime=(this.dayTime+dt/900)%1;if(this.dayTime<.0001)this.day++;this.elapsed+=dt;
 }
 updateEnvironment(){
  const angle=this.dayTime*Math.PI*2-Math.PI/2;const sunY=Math.sin(angle),sunX=Math.cos(angle);this.sun.position.set(sunX*100,Math.max(-18,sunY*120),-45);this.sun.target.position.set(this.player.position.x,0,this.player.position.z);
  const night=clamp((.08-sunY)*4,0,.86),horizon=new THREE.Color('#9ab6b6').lerp(new THREE.Color('#111b2b'),night);horizon.lerp(new THREE.Color('#e7a878'),clamp(1-Math.abs(sunY)*5,0,.6));this.scene.background.copy(horizon);this.scene.fog.color.copy(horizon);this.scene.fog.density=.0058+night*.004;
  this.sun.intensity=.12+(1-night)*2.8;this.ambient.intensity=.42+(1-night)*1.12;this.fillLight.intensity=.12+night*.42;this.sun.color.set(night>.5?'#9bb5e4':'#ffe4b2');this.stars.material.opacity=night;this.clouds.forEach(c=>{c.position.x+=c.userData.speed*.012;if(c.position.x>230)c.position.x=-230;});if(this.dust)this.dust.rotation.y=Math.sin(this.elapsed*.04)*.08;this.sunBall.visible=sunY>-.05;this.sunBall.position.set(sunX*180,sunY*140,-100);this.moonBall.visible=sunY<-.15;this.moonBall.position.set(-sunX*160,-sunY*120,-100);
  if(this.fire){const f=this.elapsed;this.fire.userData.flame.scale.set(1+Math.sin(f*9)*.09,1+Math.sin(f*12)*.12,1);this.fire.userData.light.intensity=7+Math.sin(f*13)*1.3;}
 }
 updateUI(){
  const near=this.nearest();this.onUI({type:'ui',resources:{...this.resources},stats:{...this.stats},stamina:this.stamina,day:this.day,dayTime:this.dayTime,position:{x:this.player.position.x,z:this.player.position.z},nearest:near?.userData.label||null,selected:this.selected,fireBuilt:this.fireBuilt});
 }
 toast(message){this.onUI({type:'toast',message});}
 snapshot(){
  return {resources:{...this.resources},stats:{...this.stats},stamina:this.stamina,day:this.day,dayTime:this.dayTime,position:{x:this.player.position.x,y:this.player.position.y,z:this.player.position.z},yaw:this.yaw,pitch:this.pitch,fireBuilt:this.fireBuilt,version:1};
 }
 applySnapshot(d){
  if(!d||typeof d!=='object')return;
  Object.assign(this.resources,d.resources||{});Object.assign(this.stats,d.stats||{});this.stamina=d.stamina??100;this.day=d.day||1;this.dayTime=d.dayTime??.32;
  if(d.position)this.player.position.set(d.position.x,d.position.y,d.position.z);
  this.yaw=d.yaw||0;this.pitch=d.pitch||0;this.player.rotation.y=this.yaw;this.camera.rotation.x=this.pitch;
  if(d.fireBuilt&&!this.fireBuilt){
   const wood=this.resources.wood,stone=this.resources.stone;this.resources.wood=Math.max(wood,5);this.resources.stone=Math.max(stone,3);
   const wasPaused=this.paused;this.paused=false;this.buildFire();this.paused=wasPaused;this.resources.wood=wood;this.resources.stone=stone;
  }
  this.updateUI();
 } saveLocal(){
  const data=this.snapshot();
  try{localStorage.setItem('wildlands-save',JSON.stringify(data));this.onUI({type:'saved'});}catch{}
 }
 loadLocal(){
  try{const d=JSON.parse(localStorage.getItem('wildlands-save')||'null');if(d)this.applySnapshot(d);}catch{}
 }
 reset(){localStorage.removeItem('wildlands-save');location.reload();}
 animate=()=>{requestAnimationFrame(this.animate);const dt=Math.min(this.clock.getDelta(),.05);this.updateMovement(dt);this.updateSurvival(dt);this.updateEnvironment();if(this.waterGeo){const p=this.waterGeo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,Math.sin(x*.045+this.elapsed)*.09+Math.cos(z*.06+this.elapsed*.7)*.07);}p.needsUpdate=true;this.waterGeo.computeVertexNormals();}
  for(const o of this.objects){if(o.userData.kind==='tree'&&!o.userData.collected){o.rotation.z=Math.sin(this.elapsed*.65+o.position.x*.11+o.position.z*.07)*.003;}}const near=this.nearest();const t=performance.now();if(t-this.lastUI>220){this.lastUI=t;this.updateUI();}this.renderer.render(this.scene,this.camera);
 };
}