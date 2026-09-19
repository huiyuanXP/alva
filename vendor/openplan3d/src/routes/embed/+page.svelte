<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { get } from 'svelte/store';
  import ThreeViewer from '$lib/components/viewer3d/ThreeViewer.svelte';
  import FloorPlanCanvas from '$lib/components/editor/FloorPlanCanvas.svelte';
  import { currentProject, selectedElementId, selectedRoomId, loadProject, updateFurniture, addFurniture, beginUndoGroup, endUndoGroup } from '$lib/stores/project';
  import { readProject } from '$lib/utils/projectValidation';

  let loaded = $state(false);
  let mode = $state<'2d' | '3d'>('3d');
  let viewer: any = $state();
  let canvas: any = $state();
  let projectId = '';
  let version = -1;
  let keyboardLocked = false;
  let applyingCommitted = false;
  let error = $state('');
  const cache = new Map<string, { fingerprint: string; response: unknown }>();
  const origin = () => window.location.origin;
  const emit = (type: string, request_id: string, payload: unknown) => {
    const response = { channel: 'roomnote', protocol: 1, project_id: projectId, project_version: version, request_id, type, payload };
    window.parent.postMessage(response, origin()); return response;
  };
  function bounds(roomId: string) {
    const p = get(currentProject);
    const f = p?.floors.find(f => f.rooms.some(r => r.id === roomId));
    const r = f?.rooms.find(r => r.id === roomId);
    if (!f || !r) throw new Error('Unknown room');
    const points = f.walls.filter(w => r.walls.includes(w.id)).flatMap(w => [w.start, w.end]);
    if (!points.length) throw new Error('Room has no geometry');
    const x = Math.min(...points.map(p=>p.x)), y = Math.min(...points.map(p=>p.y));
    return { x,y,width:Math.max(...points.map(p=>p.x))-x,depth:Math.max(...points.map(p=>p.y))-y };
  }
  type AppliedRequirement = { field_key: string; value: string | number | null };
  function applyRequirements(roomId: string, requirements: AppliedRequirement[]) {
    const p = get(currentProject);
    const floor = p?.floors.find(f => f.rooms.some(r => r.id === roomId));
    if (!p || !floor) throw new Error('Unknown room');
    const room = floor.rooms.find(r => r.id === roomId);
    if (!room) throw new Error('Unknown room');
    const b = bounds(roomId);
    const text = requirements.map(r => String(r.value ?? '')).join(' ');
    const has = (...terms: string[]) => terms.some(term => text.includes(term));
    const inRoom = (item: any) => item.position.x >= b.x && item.position.x <= b.x + b.width && item.position.y >= b.y && item.position.y <= b.y + b.depth;
    const find = (catalogId: string) => floor.furniture.find(item => item.catalogId === catalogId && inRoom(item));
    const cx = b.x + b.width / 2, cy = b.y + b.depth / 2;
    let changed = 0;
    const set = (catalogId: string, patch: Record<string, unknown>) => {
      const item = find(catalogId);
      if (item) { updateFurniture(item.id, patch); changed++; }
      return item;
    };
    const ensure = (catalogId: string, position: { x: number; y: number }, patch: Record<string, unknown> = {}) => {
      const existing = find(catalogId);
      if (existing) { updateFurniture(existing.id, { position, ...patch }); changed++; return existing; }
      const id = addFurniture(catalogId, position);
      if (Object.keys(patch).length) updateFurniture(id, patch);
      changed++;
      return floor.furniture.find(item => item.id === id);
    };
    beginUndoGroup();
    try {
      // Keep a clear central path while preserving the current room boundary.
      set('sofa', { position: { x: cx, y: b.y + b.depth - 62 }, rotation: 0 });
      set('coffee_table', { position: { x: cx, y: cy + 35 }, rotation: 0 });
      set('rug', { position: { x: cx, y: cy + 35 }, rotation: 0, color: has('暖', '原木', '米白', '中性') ? '#e4ddce' : '#d9d4ca' });
      set('chair', { position: { x: b.x + b.width - 58, y: cy + 25 }, rotation: 0 });
      set('potted_plant', { position: { x: b.x + 45, y: b.y + 45 } });
      if (has('收纳', '储物', '柜')) ensure('storage', { x: b.x + 62, y: b.y + 48 }, { color: has('暖', '原木', '米白', '中性') ? '#d8c3a5' : '#78716c' });
      if (has('观影', '电视')) ensure('television', { x: cx, y: b.y + 28 }, { color: '#3f4a43' });
      if (has('阅读')) ensure('bookshelf', { x: b.x + 48, y: b.y + b.depth - 58 }, { color: '#a7815d' });
      if (has('暖', '原木', '米白', '中性', '风格')) {
        set('sofa', { color: '#b7c9ae' });
        set('coffee_table', { color: '#927c63' });
        set('chair', { color: '#beac98' });
      }
      if (roomId !== 'living' && !has('观影', '阅读', '收纳', '电视')) {
        set('desk', { position: { x: cx, y: b.y + 70 } });
      }
    } finally {
      endUndoGroup('应用已确认需求到场景');
    }
    return { room_id: roomId, changed };
  }
  async function handle(e: MessageEvent) {
    const m=e.data;
    if (e.source!==window.parent || e.origin!==origin() || !m || typeof m!=='object' || m.channel!=='roomnote' || m.protocol!==1 || m.project_id!==projectId || typeof m.request_id!=='string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(m.request_id) || typeof m.method!=='string' || !m.payload || typeof m.payload!=='object') return;
    const fingerprint=JSON.stringify(m);
    const old=cache.get(m.request_id);
    if (old) { if(old.fingerprint===fingerprint) window.parent.postMessage(old.response, origin()); else emit('error',m.request_id,{message:'request_id reuse'}); return; }
    try {
      let result: any = {};
      const a=m.payload;
      if(m.method==='load') {
        if(!Number.isInteger(a.version) || a.version<version || a.scene?.id!==projectId) throw new Error('Stale version or wrong project');
        const p=readProject(a.scene); applyingCommitted=true; loadProject(p); version=a.version; loaded=true; await tick(); applyingCommitted=false;
        result={ id:p.id, version, objects:p.floors.flatMap(f=>f.furniture.map(i=>i.id)) };
      } else if (!loaded) throw new Error('Load a committed project first');
      else if(m.method==='version') {
        if(!Number.isInteger(a.version)||a.version<version)throw new Error('Stale version');
        version=a.version;result={version};
      }
      else if(m.method==='snapshot') result={ scene:JSON.parse(JSON.stringify(get(currentProject))), version };
      else if(m.method==='apply_requirements') {
        if(typeof a.room_id!=='string' || !Array.isArray(a.requirements) || a.requirements.length>32) throw new Error('Invalid requirements');
        const requirements=a.requirements.filter((r: any)=>r && typeof r.field_key==='string' && (typeof r.value==='string' || typeof r.value==='number' || r.value===null)).map((r: any)=>({field_key:r.field_key,value:r.value}));
        if(!requirements.length) throw new Error('No confirmed requirements to apply');
        result=applyRequirements(a.room_id,requirements);
        const b=bounds(a.room_id); selectedRoomId.set(a.room_id); await tick();
        if(mode==='3d') viewer?.focusBounds(b); else canvas?.focusBounds(b);
      }
      else if(m.method==='select') {
        if(!get(currentProject)?.floors.some(f=>f.furniture.some(i=>i.id===a.object_id))) throw new Error('Unknown object');
        selectedElementId.set(a.object_id); result={object_id:a.object_id};
      } else if(m.method==='update') {
        if(a.expected_version!==version) throw new Error('Version conflict');
        const f=get(currentProject)?.floors.find(f=>f.furniture.some(i=>i.id===a.object_id));
        if(!f || !a.patch || Object.keys(a.patch).length===0) throw new Error('Unknown object or empty patch');
        for(const [k,v] of Object.entries(a.patch)) {
          if(!['width','depth','height','color'].includes(k)) throw new Error('Unsupported property');
          if(k==='color' ? !(typeof v==='string' && /^#[0-9a-fA-F]{6}$/.test(v)) : !(typeof v==='number' && Number.isFinite(v) && v>0 && v<=20000)) throw new Error('Invalid property');
        }
        updateFurniture(a.object_id,a.patch); result={preview:true,scene:JSON.parse(JSON.stringify(get(currentProject)))};
      } else if(m.method==='focus') {
        const b=bounds(a.room_id); selectedRoomId.set(a.room_id); await tick();
        if(mode==='3d') viewer?.focusBounds(b); else canvas?.focusBounds(b);
        result={room_id:a.room_id,bounds:b};
      } else if(m.method==='mode') {
        if(!['2d','3d','walk'].includes(a.mode)) throw new Error('Unknown navigation mode');
        mode=a.mode==='2d'?'2d':'3d'; await tick(); if(mode==='3d') viewer?.setNavigation(a.mode); result={mode:a.mode};
      } else if(m.method==='camera') {
        if(mode!=='3d') throw new Error('Camera requires 3D');
        if(a.action==='orbit') viewer?.orbitStep(Math.PI/8);
        else if(a.action==='zoomIn') viewer?.zoomBy(0.8);
        else if(a.action==='zoomOut') viewer?.zoomBy(1.25);
        else throw new Error('Unknown camera command');
        result=viewer?.inspectCamera();
      } else if(m.method==='keyboard') { keyboardLocked=a.locked===true; result={locked:keyboardLocked}; }
      else if(m.method==='inspect') result={camera:viewer?.inspectCamera(), selected:get(selectedElementId),mode,version};
      else throw new Error('Unsupported bridge command');
      const response=emit('result',m.request_id,result); cache.set(m.request_id,{fingerprint,response});
      if(cache.size>128) cache.delete(cache.keys().next().value!);
    } catch(err) { applyingCommitted=false; emit('error',m.request_id,{message:err instanceof Error?err.message:'Bridge error'}); }
  }
  onMount(() => {
    projectId=new URLSearchParams(window.location.search).get('project')||'';
    if(!/^[a-zA-Z0-9_-]{1,160}$/.test(projectId)) {error='Missing project';return;}
    window.addEventListener('message',handle);
    const block=(e:KeyboardEvent)=>{ if(keyboardLocked || ((e.ctrlKey||e.metaKey)&&['z','y','s'].includes(e.key.toLowerCase()))) {e.preventDefault();e.stopImmediatePropagation();} };
    window.addEventListener('keydown',block,true);
    const unsub=selectedElementId.subscribe(id=>{if(loaded)emit('selection',crypto.randomUUID(),{object_id:id});});
    const unsubDirty=currentProject.subscribe(()=>{if(loaded&&!applyingCommitted)emit('dirty',crypto.randomUUID(),{preview:true});});
    emit('ready',crypto.randomUUID(),{capabilities:['load','snapshot','select','update','apply_requirements','focus','mode','camera','keyboard','inspect'],unit:'cm'});
    return()=>{unsub();unsubDirty();window.removeEventListener('message',handle);window.removeEventListener('keydown',block,true);};
  });
</script>

<svelte:head><title>OpenPlan3D · ROOMNOTE</title></svelte:head>
<div class="embedded">
  {#if loaded}
    {#if mode==='3d'}<ThreeViewer embedded={true} onprojection={(p)=>{if(loaded)emit("projection",crypto.randomUUID(),p);}} bind:this={viewer}/>{:else}<FloorPlanCanvas bind:this={canvas}/>{/if}
  {:else}<div class="loading">{error || '正在连接 3D 工作台…'}</div>{/if}
</div>
<style>
  .embedded{width:100vw;height:100dvh;overflow:hidden;background:#f2f1ed}
  .embedded :global([role='region'] > :not(canvas)){display:none!important}
  .loading{height:100%;display:grid;place-items:center;color:#596457;font:14px system-ui}
</style>
