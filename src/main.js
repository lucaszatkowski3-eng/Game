import './style.css';
import { WildlandsGame } from './game.js';
const $=id=>document.getElementById(id);
const game=new WildlandsGame($('world'), d=>{if(d.type==='toast'){const t=$('toast');t.textContent=d.message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}});
$('start-btn').onclick=()=>{game.start();$('start-overlay').classList.add('hidden');$('loading').classList.add('done')};
$('menu-btn').onclick=()=>game.togglePause();$('resume-btn').onclick=()=>game.togglePause();$('save-btn').onclick=()=>game.saveLocal();
$('restart-btn').onclick=()=>{if(confirm('Neues Abenteuer starten?'))game.reset()};
setTimeout(()=>$('loading').classList.add('done'),2200);
