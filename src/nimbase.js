// Cloud save bridge. Never put the NimBase API key in browser code.
export async function saveCloudSnapshot(snapshot){try{const r=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snapshot})});if(!r.ok)throw new Error('Cloud-Speichern nicht konfiguriert');return await r.json()}catch(e){return {ok:false,message:e.message}}}
export async function loadCloudSnapshot(){try{const r=await fetch('/api/load');if(!r.ok)return null;return (await r.json()).snapshot||null}catch{return null}}
