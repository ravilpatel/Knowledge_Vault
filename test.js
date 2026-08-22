
/* ═══════════════════════════════════════════════════════════════
   Knowledge Vault — Supabase Cloud Sync Edition
   ═══════════════════════════════════════════════════════════════ */

// ─── ★ REPLACE WITH YOUR SUPABASE CREDENTIALS ★ ───
const SUPABASE_URL = 'https://cmpklimagrwwzfjvqzqe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtcGtsaW1hZ3J3d3pmanZxenFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5Njc0ODIsImV4cCI6MjEwMDU0MzQ4Mn0.rTlNAVwom8DX_uPKEwvt-U0-8SAZR8Lx9FhDkbz20Ac';
// ────────────────────────────────────────────────────


const INITIAL_CATEGORIES = [
  'Space Tech','Semiconductor','Deep Tech','Electronics','Embedded Systems',
  'IoT','AI','Machine Learning','Robotics','MEMS','Defence','Nuclear',
  'Medical','Automotive','Energy','Aerospace','Business Idea','Startup',
  'Research','Networking','Learning','Finance','Books','Companies',
  'People','Government','Manufacturing','Software','Hardware','Miscellaneous'
];

const CATEGORY_COLORS = {
  'Space Tech':'accent-sky','Semiconductor':'accent-orange','Deep Tech':'accent-purple',
  'Electronics':'accent-orange-deep','Embedded Systems':'accent-teal','IoT':'accent-green',
  'AI':'accent-purple-deep','Machine Learning':'accent-pink','Robotics':'accent-brown',
  'MEMS':'accent-orange','Defence':'accent-purple-deep','Nuclear':'accent-orange-deep',
  'Medical':'accent-green','Automotive':'accent-brown','Energy':'accent-green',
  'Aerospace':'accent-sky','Business Idea':'accent-pink','Startup':'accent-orange',
  'Research':'accent-purple','Networking':'accent-teal','Learning':'accent-sky',
  'Finance':'accent-green','Books':'accent-brown','Companies':'accent-teal',
  'People':'accent-pink','Government':'accent-purple-deep','Manufacturing':'accent-orange-deep',
  'Software':'accent-purple','Hardware':'accent-orange','Miscellaneous':'ink-muted',
  'Food':'accent-orange','Transport':'accent-sky','Investment':'accent-green',
  'Health':'accent-pink','Entertainment':'accent-purple','Shopping':'accent-teal',
  'Utilities':'accent-orange-deep','Education':'accent-sky','Other':'ink-muted'
};
const COLOR_MAP = {
  'accent-sky':'#62aef0','accent-purple':'#d6b6f6','accent-purple-deep':'#391c57',
  'accent-pink':'#ff64c8','accent-orange':'#dd5b00','accent-orange-deep':'#793400',
  'accent-teal':'#2a9d99','accent-green':'#1aae39','accent-brown':'#523410',
  'ink-muted':'#615d59'
};
const ENTITY_ICONS = { people:'fa-user', companies:'fa-building', technologies:'fa-microchip', projects:'fa-project-diagram' };
const ENTITY_COLORS = { people:'#ff64c8', companies:'#2a9d99', technologies:'#dd5b00', projects:'#62aef0' };
const ENTITY_LABELS = { people:'People', companies:'Companies', technologies:'Technologies', projects:'Projects' };
const PAGE_SIZE = 40;
const TABLES = ['notes','people','companies','technologies','projects','categories','tags','todos','panels','panel_fields','panel_entries'];

// ─── Supabase Client ───
let sb = null;
let currentUser = null;

function initSupabase() {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ─── UUID ───
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const r=Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16);
  });
}

// ─── Date ───
function nowISO() { return new Date().toISOString(); }
function fmtDate(iso) { if(!iso)return''; const d=new Date(iso); return d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); }
function fmtDateShort(iso) { if(!iso)return''; const d=new Date(iso); const diff=Date.now()-d.getTime();
  if(diff<60000)return'just now'; if(diff<3600000)return Math.floor(diff/60000)+'m ago';
  if(diff<86400000)return Math.floor(diff/3600000)+'h ago'; if(diff<604800000)return Math.floor(diff/86400000)+'d ago';
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

// ─── Toast ───
function toast(msg,type='info') {
  const el=document.createElement('div'); el.className='toast '+type;
  el.innerHTML=`<i class="fas ${type==='success'?'fa-check-circle':type==='error'?'fa-exclamation-circle':'fa-info-circle'}"></i> ${msg}`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity 300ms';setTimeout(()=>el.remove(),300);},3000);
}

// ─── Sync Banner ───
function showBanner(msg,cls='') {
  const b=document.getElementById('syncBanner');
  b.textContent=msg; b.className=cls+' show';
  setTimeout(()=>b.classList.remove('show'),3000);
}

// ─── State ───
let state = {
  notes:[], people:[], companies:[], technologies:[], projects:[], categories:[], tags:[],
  todos:[], userSettings:null,
  panels:[], panel_fields:[], panel_entries:[],
  currentView:'all', currentDetail:null, currentDetailType:null,
  searchQuery:'',
  filters:{categories:[],tags:[],priority:[],people:[],companies:[],technologies:[],projects:[],favouriteOnly:false,archivedOnly:false,deletedOnly:false},
  sortField:'updated_at', sortDir:'desc', page:1,
  editingNoteId:null, editingEntityType:null, editingEntityId:null,
  noteFav:false, selectedTags:[], authMode:'login',
  minimalMode: localStorage.getItem('kv-minimal-mode') === 'true',
  pinnedPanelIds: JSON.parse(localStorage.getItem('kv-pinned-panels') || '[]'),
};

// ─── Supabase Data Operations ───
async function sbFetchAll() {
  showBanner('Loading data from cloud...','');
  try {
    const results = await Promise.all(TABLES.map(t => {
      let q = sb.from(t).select('*');
      if (t !== 'panel_fields' && t !== 'news_items') {
        q = q.order('created_at', { ascending: false });
      }
      return q;
    }));
    state.notes = normalizeArrays(results[0].data||[]);
    state.people = normalizeArrays(results[1].data||[]);
    state.companies = normalizeArrays(results[2].data||[]);
    state.technologies = normalizeArrays(results[3].data||[]);
    state.projects = normalizeArrays(results[4].data||[]);
    state.categories = normalizeArrays(results[5].data||[]);
    state.tags = normalizeArrays(results[6].data||[]);
    state.todos = results[7].data||[];
    state.panels = (results[8].data||[]).sort((a,b)=>a.sort_order - b.sort_order);
    state.panel_fields = results[9].data||[];
    state.panel_entries = results[10].data||[];

    if ((!state.pinnedPanelIds || state.pinnedPanelIds.length === 0) && state.panels.length > 0) {
      state.pinnedPanelIds = state.panels.slice(0, 3).map(p => p.id);
      localStorage.setItem('kv-pinned-panels', JSON.stringify(state.pinnedPanelIds));
    }

    const { data: setts } = await sb.from('user_settings').select('*').maybeSingle();
    state.userSettings = setts || { news_enabled: true };

    showBanner('Data loaded','success');
  } catch(e) {
    showBanner('Failed to load data: '+e.message,'error');
    console.error(e);
  }
}

// Supabase returns null for empty arrays — normalize to []
function normalizeArrays(arr) {
  return arr.map(item => {
    const keys = ['categories','tags','related_people','related_companies','related_technologies','related_projects','attachments','related_notes'];
    keys.forEach(k => { if(item[k]===null) item[k]=[]; });
    return item;
  });
}

// Normalize a single object
function normItem(item) {
  const keys = ['categories','tags','related_people','related_companies','related_technologies','related_projects','attachments','related_notes'];
  keys.forEach(k => { if(item[k]===null) item[k]=[]; });
  return item;
}

async function sbUpsert(table, data) {
  showBanner('Saving...');
  try {
    // Ensure user_id
    if(!data.user_id) data.user_id = currentUser.id;
    const {data:result,error} = await sb.from(table).upsert(data,{returning:'representation'}).select();
    if(error) throw error;
    showBanner('Saved','success');
    return result?normItem(result[0]||result):data;
  } catch(e) {
    showBanner('Save failed: '+e.message,'error');
    toast('Save failed: '+e.message,'error');
    throw e;
  }
}

async function sbDelete(table, id) {
  showBanner('Deleting...');
  try {
    const {error} = await sb.from(table).delete().eq('id',id);
    if(error) throw error;
    showBanner('Deleted','success');
  } catch(e) {
    showBanner('Delete failed: '+e.message,'error');
    toast('Delete failed','error');
    throw e;
  }
}

async function sbDeleteAll(table) {
  try {
    let query = sb.from(table).delete();
    if (table === 'panel_fields') {
      const userPanelIds = state.panels.map(p => p.id);
      if (userPanelIds.length > 0) {
        query = query.in('panel_id', userPanelIds);
      } else {
        return;
      }
    } else {
      query = query.eq('user_id', currentUser.id);
    }
    const {error} = await query;
    if(error) throw error;
  } catch(e) {
    console.error('Clear failed:',e);
    throw e;
  }
}

// ─── Seed Categories for New User ───
async function seedCategories() {
  if(state.categories.length > 0) return;
  const cats = INITIAL_CATEGORIES.map(name => ({id:uuid(), name, user_id:currentUser.id}));
  const {data,error} = await sb.from('categories').upsert(cats).select();
  if(!error) state.categories = data||cats;
}

// ─── Realtime Subscriptions ───
let realtimeChannels = [];

function setupRealtime() {
  // Remove existing channels
  realtimeChannels.forEach(ch => sb.removeChannel(ch));
  realtimeChannels = [];

  TABLES.forEach(table => {
    const baseOpt = { schema: 'public', table };
    if (table !== 'panel_fields') baseOpt.filter = 'user_id=eq.' + currentUser.id;

    const channel = sb.channel('kv-'+table)
      .on('postgres_changes', Object.assign({event:'INSERT'}, baseOpt), (payload) => {
        const item = normItem(payload.new);
        if(!state[table].find(x=>x.id===item.id)) {
          state[table].push(item);
          scheduleRender();
        }
      })
      .on('postgres_changes', Object.assign({event:'UPDATE'}, baseOpt), (payload) => {
        const item = normItem(payload.new);
        const idx = state[table].findIndex(x=>x.id===item.id);
        if(idx>=0) state[table][idx]=item;
        scheduleRender();
      })
      .on('postgres_changes', Object.assign({event:'DELETE'}, baseOpt), (payload) => {
        state[table] = state[table].filter(x=>x.id!==payload.old.id);
        scheduleRender();
      })
      .subscribe();
    realtimeChannels.push(channel);
  });
}

let renderScheduled = false;
function scheduleRender() {
  if(renderScheduled) return;
  renderScheduled = true;
  setTimeout(() => { renderScheduled=false; render(); }, 300);
}

// ─── Auth ───
async function checkSession() {
  initSupabase();
  const {data:{session}} = await sb.auth.getSession();
  if(session) {
    currentUser = session.user;
    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('app').style.display = 'flex';
    await sbFetchAll();
    await seedCategories();
    setupRealtime();
    renderUserInfo();
    render();
  } else {
    document.getElementById('authOverlay').classList.remove('hidden');
    document.getElementById('app').style.display = 'none';
  }
}

function showAuthError(msg) { const el=document.getElementById('authError'); el.textContent=msg; el.classList.add('show'); }
function hideAuthError() { document.getElementById('authError').classList.remove('show'); }

async function handleSignUp() {
  hideAuthError();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const btn = document.getElementById('authSignUp');
  btn.disabled = true;

  if(!email || !password) { showAuthError('Email and password are required.'); btn.disabled=false; return; }
  
  if(!email.toLowerCase().endsWith('@charusat.edu.in')) {
    showAuthError('Only @charusat.edu.in email addresses are allowed for sign-up.');
    btn.disabled = false;
    return;
  }

  try {
    const {data, error} = await sb.auth.signUp({email, password});
    if(error) throw error;
    showAuthError('Sign up successful! Please check your email to verify your account or log in if auto-verified.');
    document.getElementById('authError').style.background = 'rgba(16,185,129,0.1)';
    document.getElementById('authError').style.color = 'var(--accent-green)';
    document.getElementById('authError').style.border = '1px solid var(--accent-green)';
  } catch(e) {
    showAuthError(e.message || 'Sign up failed.');
  }
  btn.disabled = false;
}

async function handleAuth() {
  hideAuthError();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const btn = document.getElementById('authSubmit');
  btn.disabled = true;

  if(!email||!password) { showAuthError('Email and password are required.'); btn.disabled=false; return; }

  try {
    const {data,error} = await sb.auth.signInWithPassword({email,password});
    if(error) throw error;
    currentUser = data.user;

    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('app').style.display = 'flex';
    await sbFetchAll();
    await seedCategories();
    setupRealtime();
    renderUserInfo();
    render();
  } catch(e) {
    showAuthError(e.message || 'Authentication failed.');
  }
  btn.disabled = false;
}

async function handleForgotPassword() {
  const email = document.getElementById('authEmail').value.trim();
  if(!email) { showAuthError('Enter your email above first.'); return; }
  try {
    const {error} = await sb.auth.resetPasswordForEmail(email);
    if(error) throw error;
    toast('Password reset email sent. Check your inbox.','success');
  } catch(e) {
    showAuthError(e.message);
  }
}

async function handleLogout() {
  await sb.auth.signOut();
  realtimeChannels.forEach(ch => sb.removeChannel(ch));
  realtimeChannels = [];
  currentUser = null;
  state.notes=[]; state.people=[]; state.companies=[]; state.technologies=[]; state.projects=[]; state.categories=[]; state.tags=[];
  state.currentView='all'; state.currentDetail=null;
  document.getElementById('authOverlay').classList.remove('hidden');
  document.getElementById('app').style.display = 'none';
}

function renderUserInfo() {
  if(!currentUser) return;
  const email = currentUser.email||'';
  let displayName = email;
  if(state.userSettings && state.userSettings.call_name) {
    displayName = state.userSettings.call_name;
  } else {
    displayName = email.split('@')[0];
  }
  
  const initial = displayName[0]?.toUpperCase()||'U';
  
  document.getElementById('sbUserInfo').innerHTML = `
    <div class="su-avatar" style="width:32px; height:32px; border-radius:50%; background:var(--primary); color:var(--on-primary); display:flex; align-items:center; justify-content:center; font-weight:600; font-size:14px;" title="${escHtml(displayName)}">${escHtml(initial)}</div>
  `;
}

// ─── Search & Filter ───
function entityName(type,id) {
  const list=state[type]; const item=list.find(e=>e.id===id);
  return item?item.name:'';
}

function getLinkedPanelEntries(entityId) {
  if (!state.panel_entries) return [];
  return state.panel_entries.filter(e => {
    return Object.values(e.data).some(val => {
      if (Array.isArray(val)) return val.includes(entityId);
      return val === entityId;
    });
  });
}

function getLinkedNotes(entityType,entityId) {
  const fieldMap={people:'related_people',companies:'related_companies',technologies:'related_technologies',projects:'related_projects'};
  const field=fieldMap[entityType];
  return state.notes.filter(n=>n[field]&&n[field].includes(entityId)&&n.status!=='deleted');
}

function getFilteredNotes() {
  let notes=state.notes;
  const q=state.searchQuery.toLowerCase().trim();
  const f=state.filters;

  if(state.currentView==='recycle') notes=notes.filter(n=>n.status==='deleted');
  else if(state.currentView==='archived') notes=notes.filter(n=>n.archived&&n.status!=='deleted');
  else notes=notes.filter(n=>n.status!=='deleted'&&!n.archived);

  if(state.currentView==='favourites') notes=notes.filter(n=>n.favourite);
  if(state.currentView==='highpriority') notes=notes.filter(n=>n.priority==='high'||n.priority==='critical');
  if(state.currentView==='notags') notes=notes.filter(n=>!n.tags||n.tags.length===0);
  if(state.currentView==='nocategories') notes=notes.filter(n=>!n.categories||n.categories.length===0);
  if(state.currentView==='recent') { notes.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)); notes=notes.slice(0,30); }

  if(f.categories&&f.categories.length>0) notes=notes.filter(n=>n.categories&&f.categories.some(c=>n.categories.includes(c)));
  if(f.tags&&f.tags.length>0) notes=notes.filter(n=>n.tags&&f.tags.some(t=>n.tags.includes(t)));
  if(f.priority&&f.priority.length>0) notes=notes.filter(n=>f.priority.includes(n.priority));
  if(f.people&&f.people.length>0) notes=notes.filter(n=>n.related_people&&f.people.some(p=>n.related_people.includes(p)));
  if(f.companies&&f.companies.length>0) notes=notes.filter(n=>n.related_companies&&f.companies.some(c=>n.related_companies.includes(c)));
  if(f.technologies&&f.technologies.length>0) notes=notes.filter(n=>n.related_technologies&&f.technologies.some(t=>n.related_technologies.includes(t)));
  if(f.projects&&f.projects.length>0) notes=notes.filter(n=>n.related_projects&&f.projects.some(p=>n.related_projects.includes(p)));

  if(q) {
    notes=notes.filter(n=>{
      const haystack=[
        n.title,n.description,n.source,
        ...(n.categories||[]),...(n.tags||[]),
        ...(n.related_people||[]).map(id=>entityName('people',id)),
        ...(n.related_companies||[]).map(id=>entityName('companies',id)),
        ...(n.related_technologies||[]).map(id=>entityName('technologies',id)),
        ...(n.related_projects||[]).map(id=>entityName('projects',id)),
        fmtDate(n.created_at),fmtDate(n.updated_at)
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  const field=state.sortField;
  const dir=state.sortDir==='asc'?1:-1;
  notes.sort((a,b)=>{
    if(field==='title') return dir*(a.title||'').localeCompare(b.title||'');
    if(field==='priority') { const p={critical:0,high:1,medium:2,low:3}; return dir*((p[a.priority]||2)-(p[b.priority]||2)); }
    if(field==='created_at') return dir*(new Date(a.created_at||0)-new Date(b.created_at||0));
    if(field==='updated_at') return dir*(new Date(a.updated_at||0)-new Date(b.updated_at||0));
    return 0;
  });
  return notes;
}

function getCatColor(catName) { const key=CATEGORY_COLORS[catName]||'ink-muted'; return COLOR_MAP[key]||'#615d59'; }

// ─── View Titles ───
const VIEW_TITLES = {
  all:'All Ideas',favourites:'Favourites',archived:'Archived',recent:'Recent Ideas',
  highpriority:'High Priority',notags:'No Tags',nocategories:'No Categories',recycle:'Recycle Bin',
  people:'People',companies:'Companies',technologies:'Technologies',projects:'Projects',
  matrix:'Eisenhower Matrix', todos:'All Tasks', news:'News & Intel'
};

// ─── Render ───
function render() {
  updateNavCounts();
  renderNavCategories();
  renderNavPanels();
  renderUserInfo();
  renderMainHeader();
  renderMainContent();
}

function updateNavCounts() {
  const active=state.notes.filter(n=>n.status!=='deleted'&&!n.archived);
  if(document.getElementById('count-all')) document.getElementById('count-all').textContent=active.length;
  if(document.getElementById('count-fav')) document.getElementById('count-fav').textContent=state.notes.filter(n=>n.favourite&&n.status!=='deleted').length;
  if(document.getElementById('count-arch')) document.getElementById('count-arch').textContent=state.notes.filter(n=>n.archived&&n.status!=='deleted').length;
  if(document.getElementById('count-del')) document.getElementById('count-del').textContent=state.notes.filter(n=>n.status==='deleted').length;
  if(document.getElementById('count-hp')) document.getElementById('count-hp').textContent=state.notes.filter(n=>(n.priority==='high'||n.priority==='critical')&&n.status!=='deleted'&&!n.archived).length;
  
  if(document.getElementById('count-people')) document.getElementById('count-people').textContent=state.people.length;
  if(document.getElementById('count-companies')) document.getElementById('count-companies').textContent=state.companies.length;
  if(document.getElementById('count-tech')) document.getElementById('count-tech').textContent=state.technologies.length;
  if(document.getElementById('count-proj')) document.getElementById('count-proj').textContent=state.projects.length;
  

  if(document.getElementById('count-todos')) document.getElementById('count-todos').textContent=state.todos.filter(t=>!t.completed).length;
}

function toggleCategoriesCollapse() {
  state.categoriesExpanded = !state.categoriesExpanded;
  renderNavCategories();
}

function renderNavCategories() {
  const container=document.getElementById('tn-cats');
  if(!container) return;
  const icon = document.getElementById('catsCollapseIcon');
  if (!state.categoriesExpanded) {
    container.style.display = 'none';
    if (icon) icon.className = 'fas fa-chevron-down';
    return;
  }
  container.style.display = 'block';
  if (icon) icon.className = 'fas fa-chevron-up';

  const counts={};
  state.notes.filter(n=>n.status!=='deleted'&&!n.archived).forEach(n=>{(n.categories||[]).forEach(c=>{counts[c]=(counts[c]||0)+1;});});
  container.innerHTML=state.categories.map(c=>`
    <a href="#" class="tn-menu-item" onclick="addFilter('categories','${c.name}'); return false;">
      <span style="width:12px;height:12px;border-radius:50%;background:${getCatColor(c.name)};flex-shrink:0"></span>
      ${c.name} <span class="count">${counts[c.name]||0}</span>
    </a>`).join('');
}

function renderMainHeader() {
  const vt=document.getElementById('viewTitle');
  const vc=document.getElementById('viewCount');
  const af=document.getElementById('activeFilters');
  const sc=document.getElementById('sortControls');
  const va=document.getElementById('viewActions');
  
  if (state.searchQuery && state.searchQuery.trim() !== '') {
    vt.textContent = 'Search Results';
    vc.textContent = '';
    sc.classList.add('hidden');
    af.innerHTML = '';
    va.innerHTML = `<button onclick="clearGlobalSearch()" class="btn-secondary" style="padding:6px 12px; font-size:13px; cursor:pointer;"><i class="fas fa-times"></i> Clear Search</button>`;
    return;
  }

  const isEntityView=['people','companies','technologies','projects'].includes(state.currentView);
  const isPanelView=state.currentView.startsWith('panel-');

  if (isPanelView) {
    const pId = state.currentView.replace('panel-', '');
    const panel = state.panels.find(p => p.id === pId);
    vt.textContent = panel ? panel.name : 'Panel';
  } else if (state.currentView === 'all') {
    vt.textContent = 'Workspace Panels';
  } else {
    vt.textContent=VIEW_TITLES[state.currentView]||'All Ideas';
  }

  if (isPanelView) {
    const pId = state.currentView.replace('panel-', '');
    const panel = state.panels.find(p => p.id === pId);
    let entryCount = state.panel_entries.filter(e => e.panel_id === pId).length;
    if (panel && panel.name === 'Notes' || panel.name === 'Ideas') {
      const uniqueIds = new Set([
        ...state.panel_entries.filter(e => e.panel_id === pId).map(e => e.id),
        ...state.notes.map(n => n.id)
      ]);
      entryCount = uniqueIds.size;
    }
    vc.textContent = entryCount + ' entries';
    sc.classList.add('hidden'); af.innerHTML='';
    va.innerHTML=`<button onclick="openPanelEntryModal(null, '${pId}')" style="background: ${panel?.color || 'var(--primary)'}"><i class="fas fa-plus"></i> New Entry</button>`;
  } else if(isEntityView) {
    const list=state[state.currentView];
    vc.textContent=list.length+' records';
    sc.classList.add('hidden'); af.innerHTML='';
    va.innerHTML=`<button onclick="openEntityModal('${state.currentView}')"><i class="fas fa-plus"></i> New</button>`;
  } else if(['all','matrix','todos','news'].includes(state.currentView)) {
    vc.textContent=state.currentView === 'all' ? state.panels.length + ' panels' : '';
    sc.classList.add('hidden'); af.innerHTML='';
    if (state.currentView === 'all') {
      va.innerHTML = `
        <label style="display:inline-flex; align-items:center; cursor:pointer; gap:8px; margin-right:8px;" title="Toggle Dashboard Widgets">
          <span style="font-size:12px; font-weight:600; color:${state.minimalMode ? 'var(--ink-faint)' : 'var(--ink)'};">Full Dashboard</span>
          <div style="position:relative; width:36px; height:20px;">
            <input type="checkbox" onchange="toggleMinimalMode()" ${state.minimalMode ? 'checked' : ''} style="opacity:0; width:0; height:0; position:absolute; pointer-events:none;">
            <span style="position:absolute; inset:0; background:${state.minimalMode ? 'var(--primary)' : 'var(--hairline)'}; border-radius:20px; transition:0.3s;"></span>
            <span style="position:absolute; left:${state.minimalMode ? '18px' : '2px'}; top:2px; width:16px; height:16px; background:white; border-radius:50%; transition:0.3s; box-shadow:0 1px 2px rgba(0,0,0,0.2);"></span>
          </div>
          <span style="font-size:12px; font-weight:600; color:${state.minimalMode ? 'var(--ink)' : 'var(--ink-faint)'};">Minimal Mode</span>
        </label>
      `;
    } else {
      va.innerHTML = '';
    }
  } else if(state.currentDetail) {
    vc.textContent=''; sc.classList.add('hidden'); af.innerHTML=''; va.innerHTML='';
  } else {
    const filtered=getFilteredNotes();
    vc.textContent=filtered.length+' ideas'; sc.classList.remove('hidden');
    let pills='';
    const f=state.filters;
    if(f.categories.length) f.categories.forEach(c=>pills+=`<span class="filter-pill" onclick="removeFilter('categories','${c}')">${c} <span class="remove"><i class="fas fa-times"></i></span></span>`);
    if(f.tags.length) f.tags.forEach(t=>pills+=`<span class="filter-pill" onclick="removeFilter('tags','${t}')">${t} <span class="remove"><i class="fas fa-times"></i></span></span>`);
    if(f.priority.length) f.priority.forEach(p=>pills+=`<span class="filter-pill" onclick="removeFilter('priority','${p}')">${p} <span class="remove"><i class="fas fa-times"></i></span></span>`);
    if(f.people.length) f.people.forEach(id=>pills+=`<span class="filter-pill" onclick="removeFilter('people','${id}')">${entityName('people',id)} <span class="remove"><i class="fas fa-times"></i></span></span>`);
    if(f.companies.length) f.companies.forEach(id=>pills+=`<span class="filter-pill" onclick="removeFilter('companies','${id}')">${entityName('companies',id)} <span class="remove"><i class="fas fa-times"></i></span></span>`);
    if(f.technologies.length) f.technologies.forEach(id=>pills+=`<span class="filter-pill" onclick="removeFilter('technologies','${id}')">${entityName('technologies',id)} <span class="remove"><i class="fas fa-times"></i></span></span>`);
    if(f.projects.length) f.projects.forEach(id=>pills+=`<span class="filter-pill" onclick="removeFilter('projects','${id}')">${entityName('projects',id)} <span class="remove"><i class="fas fa-times"></i></span></span>`);
    af.innerHTML=pills;
    va.innerHTML=`<button onclick="openNoteModal()"><i class="fas fa-plus"></i> New Idea</button>`;
  }
  document.getElementById('sortField').value=state.sortField;
  const dirIcon=state.sortDir==='desc'?'fa-arrow-down':'fa-arrow-up';
  document.getElementById('sortDir').innerHTML=`<i class="fas ${dirIcon}"></i>`;
  document.querySelectorAll('.tn-link[data-view], .tn-menu-item[data-view]').forEach(el=>{el.classList.toggle('active',el.dataset.view===state.currentView);});
}

function renderMainContent() {
  const mc=document.getElementById('main-content');
  if (state.searchQuery && state.searchQuery.trim() !== '') {
    mc.innerHTML = renderGlobalSearchResults();
    return;
  }
  if(state.currentDetail&&state.currentDetailType==='note') { mc.innerHTML=renderNoteDetail(state.currentDetail); return; }
  if(state.currentDetail&&state.currentDetailType==='panel_entry') { mc.innerHTML=renderPanelEntryDetail(state.currentDetail); return; }
  if(state.currentDetail&&state.currentDetailType!=='note') { mc.innerHTML=renderEntityDetail(state.currentDetailType,state.currentDetail); return; }
  
  if(state.currentView === 'all') { mc.innerHTML = renderPanelsColumns(); return; }

  const isEntityView=['people','companies','technologies','projects'].includes(state.currentView);
  if(isEntityView) { mc.innerHTML=renderEntityList(state.currentView); return; }
  
  if(state.currentView.startsWith('panel-')) {
    const pId = state.currentView.replace('panel-', '');
    mc.innerHTML = renderPanelEntries(pId);
    return;
  }
  

  if(state.currentView === 'matrix') { mc.innerHTML=renderEisenhowerMatrix(); return; }
  if(state.currentView === 'todos') { mc.innerHTML=renderTodoList(); return; }

  const filtered=getFilteredNotes();
  const totalPages=Math.ceil(filtered.length/PAGE_SIZE)||1;
  if(state.page>totalPages) state.page=totalPages;
  const start=(state.page-1)*PAGE_SIZE;
  const pageNotes=filtered.slice(start,start+PAGE_SIZE);

  if(filtered.length===0) {
    mc.innerHTML=`<div class="empty-state"><div class="es-icon"><i class="fas fa-file-alt"></i></div><div class="es-title">No ideas found</div><div class="es-desc">Try adjusting your filters or search, or create a new idea.</div><button class="sb-new-btn" style="width:auto;margin:0" onclick="openNoteModal()"><i class="fas fa-plus"></i> New Idea</button></div>`;
    return;
  }
  mc.innerHTML=`<div class="notes-grid">${pageNotes.map(n=>renderNoteCard(n)).join('')}</div>${totalPages>1?renderPagination(filtered.length,totalPages):''}`;
}

function renderNoteCard(n) {
  const cats=(n.categories||[]).slice(0,3).map(c=>`<span class="cat-badge" style="background:${getCatColor(c)}22;color:${getCatColor(c)}">${c}</span>`).join('');
  const tags=(n.tags||[]).slice(0,3).map(t=>`<span class="tag-badge">${t}</span>`).join('');
  const pClass='priority-'+(n.priority||'low');
  return `<div class="note-card" onclick="showNoteDetail('${n.id}')">
    <span class="nc-fav ${n.favourite?'is-fav':''}" onclick="event.stopPropagation();toggleNoteFav('${n.id}')"><i class="fas fa-star"></i></span>
    <div class="nc-title">${escHtml(n.title||'Untitled')}</div>
    <div class="nc-desc">${escHtml(n.description||'')}</div>
    <div class="nc-badges">${cats}${tags}</div>
    <div class="nc-meta"><span>${fmtDateShort(n.updated_at)}</span><span class="nc-priority ${pClass}">${n.priority||'low'}</span></div>
  </div>`;
}

function renderNoteDetail(id) {
  const n=state.notes.find(x=>x.id===id);
  if(!n) return '<p>Note not found.</p>';
  const cats=(n.categories||[]).map(c=>`<span class="cat-badge" style="background:${getCatColor(c)}22;color:${getCatColor(c)};cursor:pointer" onclick="addFilter('categories','${c}')">${c}</span>`).join('');
  const tags=(n.tags||[]).map(t=>`<span class="tag-badge" style="cursor:pointer" onclick="addFilter('tags','${t}')">${t}</span>`).join('');
  const people=(n.related_people||[]).map(id=>{const name=entityName('people',id);return name?`<span class="entity-badge" style="cursor:pointer;background:${ENTITY_COLORS.people}22;color:${ENTITY_COLORS.people}" onclick="showEntityDetail('people','${id}')">${name}</span>`:'';}).join('');
  const companies=(n.related_companies||[]).map(id=>{const name=entityName('companies',id);return name?`<span class="entity-badge" style="cursor:pointer;background:${ENTITY_COLORS.companies}22;color:${ENTITY_COLORS.companies}" onclick="showEntityDetail('companies','${id}')">${name}</span>`:'';}).join('');
  const techs=(n.related_technologies||[]).map(id=>{const name=entityName('technologies',id);return name?`<span class="entity-badge" style="cursor:pointer;background:${ENTITY_COLORS.technologies}22;color:${ENTITY_COLORS.technologies}" onclick="showEntityDetail('technologies','${id}')">${name}</span>`:'';}).join('');
  const projs=(n.related_projects||[]).map(id=>{const name=entityName('projects',id);return name?`<span class="entity-badge" style="cursor:pointer;background:${ENTITY_COLORS.projects}22;color:${ENTITY_COLORS.projects}" onclick="showEntityDetail('projects','${id}')">${name}</span>`:'';}).join('');

  const isDeleted=n.status==='deleted';
  const isArchived=n.archived;
  let actions='';
  if(isDeleted) {
    actions=`<button class="btn-primary" onclick="restoreNote('${n.id}')"><i class="fas fa-undo"></i> Restore</button>
      <button class="btn-danger" onclick="permanentDelete('${n.id}')"><i class="fas fa-trash"></i> Delete Permanently</button>`;
  } else {
    actions=`<button class="btn-primary" onclick="editNote('${n.id}')"><i class="fas fa-edit"></i> Edit</button>
      <button class="btn-secondary" onclick="archiveNote('${n.id}')"><i class="fas fa-archive"></i> ${isArchived?'Unarchive':'Archive'}</button>
      <button class="btn-secondary" onclick="toggleNoteFav('${n.id}')"><i class="fas fa-star"></i> ${n.favourite?'Unfavourite':'Favourite'}</button>
      <button class="btn-danger" onclick="deleteNote('${n.id}')"><i class="fas fa-trash"></i> Delete</button>`;
  }

  return `<div class="detail-view">
    <div class="dv-title">${escHtml(n.title||'Untitled')}</div>
    <div class="dv-meta-row">
      <span><i class="fas fa-calendar-plus"></i> Created: ${fmtDate(n.created_at)}</span>
      <span><i class="fas fa-calendar-edit"></i> Modified: ${fmtDate(n.updated_at)}</span>
      <span class="nc-priority priority-${n.priority||'low'}">${n.priority||'low'}</span>
      ${n.favourite?'<span style="color:var(--accent-orange)"><i class="fas fa-star"></i> Favourite</span>':''}
      ${isArchived?'<span style="color:var(--ink-muted)"><i class="fas fa-archive"></i> Archived</span>':''}
      ${n.source?`<span><i class="fas fa-link"></i> ${escHtml(n.source)}</span>`:''}
    </div>
    <div class="dv-desc">${escHtml(n.description||'No description.')}</div>
    ${cats?`<div class="dv-section"><div class="dv-section-title">Categories</div><div class="dv-badges">${cats}</div></div>`:''}
    ${tags?`<div class="dv-section"><div class="dv-section-title">Tags</div><div class="dv-badges">${tags}</div></div>`:''}
    ${people?`<div class="dv-section"><div class="dv-section-title">Related People</div><div class="dv-badges">${people}</div></div>`:''}
    ${companies?`<div class="dv-section"><div class="dv-section-title">Related Companies</div><div class="dv-badges">${companies}</div></div>`:''}
    ${techs?`<div class="dv-section"><div class="dv-section-title">Related Technologies</div><div class="dv-badges">${techs}</div></div>`:''}
    ${projs?`<div class="dv-section"><div class="dv-section-title">Related Projects</div><div class="dv-badges">${projs}</div></div>`:''}
    ${(n.attachments&&n.attachments.length)?`<div class="dv-section"><div class="dv-section-title">Attachments</div><div class="dv-badges">${n.attachments.map(a=>`<span class="tag-badge"><i class="fas fa-paperclip"></i> ${escHtml(a)}</span>`).join('')}</div></div>`:''}
    <div class="dv-actions">${actions}<button class="btn-secondary" onclick="goBack()"><i class="fas fa-arrow-left"></i> Back</button></div>
  </div>`;
}

function renderEntityList(type) {
  const list=state[type];
  if(list.length===0) return `<div class="empty-state"><div class="es-icon"><i class="fas ${ENTITY_ICONS[type]}"></i></div><div class="es-title">No ${ENTITY_LABELS[type]} yet</div><div class="es-desc">Create your first ${ENTITY_LABELS[type].toLowerCase()} record.</div><button class="sb-new-btn" style="width:auto;margin:0" onclick="openEntityModal('${type}')"><i class="fas fa-plus"></i> New ${ENTITY_LABELS[type]}</button></div>`;
  return `<div class="entity-list">${list.map(e=>{
    const linked=getLinkedNotes(type,e.id).length;
    let sub='';
    if(type==='people') sub=`${e.organisation||''} · ${e.designation||''}`;
    if(type==='companies') sub=e.industry||'';
    if(type==='technologies') sub=(e.description||'').substring(0,60);
    if(type==='projects') sub=`${e.status||''} · ${(e.description||'').substring(0,60)}`;
    return `<div class="entity-row" onclick="showEntityDetail('${type}','${e.id}')">
      <div class="er-icon" style="background:${ENTITY_COLORS[type]}15;color:${ENTITY_COLORS[type]}"><i class="fas ${ENTITY_ICONS[type]}"></i></div>
      <div style="flex:1;min-width:0"><div class="er-name">${escHtml(e.name)}</div><div class="er-sub">${escHtml(sub)}</div></div>
      <span class="er-count">${linked} notes</span>
      <button style="color:var(--ink-faint);font-size:12px;padding:4px" onclick="event.stopPropagation();deleteEntity('${type}','${e.id}')"><i class="fas fa-trash"></i></button>
    </div>`;
  }).join('')}</div>`;
}

function renderEntityDetail(type,id) {
  const e=state[type].find(x=>x.id===id);
  if(!e) return '<p>Not found.</p>';
  const linked=getLinkedNotes(type,id);
  let fields='';
  if(type==='people') {
    fields=`${e.organisation?`<div class="dv-section"><div class="dv-section-title">Organisation</div><div>${escHtml(e.organisation)}</div></div>`:''}
      ${e.designation?`<div class="dv-section"><div class="dv-section-title">Designation</div><div>${escHtml(e.designation)}</div></div>`:''}
      ${e.contact_info?`<div class="dv-section"><div class="dv-section-title">Contact</div><div>${escHtml(e.contact_info)}</div></div>`:''}
      ${e.notes?`<div class="dv-section"><div class="dv-section-title">Notes</div><div style="white-space:pre-wrap">${escHtml(e.notes)}</div></div>`:''}`;
  } else if(type==='companies') {
    fields=`${e.industry?`<div class="dv-section"><div class="dv-section-title">Industry</div><div>${escHtml(e.industry)}</div></div>`:''}
      ${e.website?`<div class="dv-section"><div class="dv-section-title">Website</div><div><a href="${escHtml(e.website)}" target="_blank">${escHtml(e.website)}</a></div></div>`:''}
      ${e.description?`<div class="dv-section"><div class="dv-section-title">Description</div><div style="white-space:pre-wrap">${escHtml(e.description)}</div></div>`:''}`;
  } else if(type==='technologies') {
    fields=`${e.description?`<div class="dv-section"><div class="dv-section-title">Description</div><div style="white-space:pre-wrap">${escHtml(e.description)}</div></div>`:''}`;
  } else if(type==='projects') {
    fields=`${e.status?`<div class="dv-section"><div class="dv-section-title">Status</div><div>${escHtml(e.status)}</div></div>`:''}
      ${e.description?`<div class="dv-section"><div class="dv-section-title">Description</div><div style="white-space:pre-wrap">${escHtml(e.description)}</div></div>`:''}`;
  }

  let crossLinks='';
  if(type==='people') {
    const cl=(e.related_companies||[]).map(id=>{const n=entityName('companies',id);return n?`<span class="entity-badge" style="background:${ENTITY_COLORS.companies}22;color:${ENTITY_COLORS.companies};cursor:pointer" onclick="showEntityDetail('companies','${id}')">${n}</span>`:'';}).join('');
    const tl=(e.related_technologies||[]).map(id=>{const n=entityName('technologies',id);return n?`<span class="entity-badge" style="background:${ENTITY_COLORS.technologies}22;color:${ENTITY_COLORS.technologies};cursor:pointer" onclick="showEntityDetail('technologies','${id}')">${n}</span>`:'';}).join('');
    const pl=(e.related_projects||[]).map(id=>{const n=entityName('projects',id);return n?`<span class="entity-badge" style="background:${ENTITY_COLORS.projects}22;color:${ENTITY_COLORS.projects};cursor:pointer" onclick="showEntityDetail('projects','${id}')">${n}</span>`:'';}).join('');
    if(cl) crossLinks+=`<div class="dv-section"><div class="dv-section-title">Related Companies</div><div class="dv-badges">${cl}</div></div>`;
    if(tl) crossLinks+=`<div class="dv-section"><div class="dv-section-title">Related Technologies</div><div class="dv-badges">${tl}</div></div>`;
    if(pl) crossLinks+=`<div class="dv-section"><div class="dv-section-title">Related Projects</div><div class="dv-badges">${pl}</div></div>`;
  }

  const clNotes = getLinkedNotes(type, id);
  const clEntries = getLinkedPanelEntries(id);
  const combinedLinks = [];

  clNotes.forEach(n => {
    const defaultNotesPanel = state.panels.find(p => p.name === 'Notes' || p.name === 'Ideas');
    combinedLinks.push({
      id: n.id,
      type: 'note',
      panelName: 'Ideas',
      panelColor: defaultNotesPanel?.color || '#4F46E5',
      panelIcon: defaultNotesPanel?.icon || 'fa-file-alt',
      title: n.title || 'Untitled Idea',
      updated_at: n.updated_at || n.created_at
    });
  });

  clEntries.forEach(e => {
    if (combinedLinks.some(link => link.id === e.id)) return;
    const panel = state.panels.find(p => p.id === e.panel_id);
    if (!panel) return;
    
    combinedLinks.push({
      id: e.id,
      type: 'panel_entry',
      panelName: panel.name,
      panelColor: panel.color || 'var(--primary)',
      panelIcon: panel.icon || 'fa-folder',
      title: e.data.title || 'Untitled Entry',
      updated_at: e.updated_at || e.created_at
    });
  });

  combinedLinks.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  const linkedHtml = combinedLinks.length ? `
    <div class="dv-section">
      <div class="dv-section-title">Linked Items (${combinedLinks.length})</div>
      <div class="linked-notes">
        ${combinedLinks.map(link => {
          const clickHandler = link.type === 'note'
            ? `showNoteDetail('${link.id}')`
            : `showPanelEntryDetail('${link.id}', '${state.panel_entries.find(e => e.id === link.id)?.panel_id}')`;
          return `
            <div class="linked-note-item" onclick="${clickHandler}">
              <span class="panel-badge" style="background:${link.panelColor}22; color:${link.panelColor}; font-size:10px; padding:2px 6px; border-radius:var(--radius-full); font-weight:600; display:inline-flex; align-items:center; gap:2px;">
                <i class="fas ${link.panelIcon}" style="font-size:9px;"></i> ${escHtml(link.panelName)}
              </span>
              <span style="margin-left:8px; font-weight:500; color:var(--ink);">${escHtml(link.title)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  return `<div class="detail-view">
    <div class="dv-title" style="color:${ENTITY_COLORS[type]}"><i class="fas ${ENTITY_ICONS[type]}"></i> ${escHtml(e.name)}</div>
    ${fields}${crossLinks}${linkedHtml}
    <div class="dv-actions">
      <button class="btn-primary" onclick="editEntity('${type}','${e.id}')"><i class="fas fa-edit"></i> Edit</button>
      <button class="btn-danger" onclick="deleteEntity('${type}','${e.id}')"><i class="fas fa-trash"></i> Delete</button>
      <button class="btn-secondary" onclick="goBack()"><i class="fas fa-arrow-left"></i> Back</button>
    </div>
  </div>`;
}

function renderPagination(total,totalPages) {
  const cur=state.page;
  let pages='';
  let start=Math.max(1,cur-3);
  let end=Math.min(totalPages,cur+3);
  for(let i=start;i<=end;i++) pages+=`<button onclick="goPage(${i})" ${cur===i?'class="active"':''}>${i}</button>`;
  return `<div class="pagination"><button onclick="goPage(${cur-1})" ${cur===1?'disabled':''}><i class="fas fa-chevron-left"></i></button>${pages}<button onclick="goPage(${cur+1})" ${cur===totalPages?'disabled':''}><i class="fas fa-chevron-right"></i></button><span class="pg-info">${total} notes</span></div>`;
}

function escHtml(str) { if(!str)return''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ─── Navigation ───
function switchView(view) {
  state.currentView=view; state.currentDetail=null; state.currentDetailType=null; state.page=1;
  if(['all','favourites','archived','recent','highpriority','notags','nocategories','recycle'].includes(view)) {
    state.filters={categories:[],tags:[],priority:[],people:[],companies:[],technologies:[],projects:[],favouriteOnly:false,archivedOnly:view==='archived',deletedOnly:view==='recycle'};
  }
  render(); closeMobileSidebar();
}
function showNoteDetail(id) { state.currentDetail=id; state.currentDetailType='note'; render(); }
function showEntityDetail(type,id) { state.currentDetail=id; state.currentDetailType=type; render(); }
function goBack() { state.currentDetail=null; state.currentDetailType=null; render(); }
function goPage(p) { state.page=p; renderMainContent(); }
function handleSearch(q) { state.searchQuery=q; state.page=1; renderMainContent(); renderMainHeader(); }
function handleSortChange() { state.sortField=document.getElementById('sortField').value; state.page=1; renderMainContent(); }
function toggleSortDir() { state.sortDir=state.sortDir==='desc'?'asc':'desc'; state.page=1; render(); }
function addFilter(type,value) { if(!state.filters[type])state.filters[type]=[]; if(!state.filters[type].includes(value))state.filters[type].push(value); state.page=1; state.currentDetail=null; if(['people','companies','technologies','projects'].includes(state.currentView))state.currentView='all'; render(); }
function removeFilter(type,value) { if(state.filters[type])state.filters[type]=state.filters[type].filter(v=>v!==value); state.page=1; render(); }
function toggleMobileSidebar() {}
function closeMobileSidebar() {}

// ─── Note CRUD ───
function openNoteModal(editId) {
  state.editingNoteId=editId||null; state.noteFav=false; state.selectedTags=[];
  const modal=document.getElementById('noteModal'); modal.classList.remove('hidden');
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('noteModalTitle').textContent=editId?'Edit Idea':'New Idea';
  document.getElementById('noteId').value=editId||'';
  document.getElementById('noteTitle').value='';
  document.getElementById('noteDesc').value='';
  document.getElementById('notePriority').value='medium';
  document.getElementById('noteSource').value='';
  document.getElementById('noteFavTrack').classList.remove('on');

  const catContainer=document.getElementById('noteCategories');
  catContainer.innerHTML=state.categories.map(c=>`<label class="checkbox-item"><input type="checkbox" value="${c.name}"> ${c.name}</label>`).join('');
  populateEntityCheckboxes('notePeople',state.people);
  populateEntityCheckboxes('noteCompanies',state.companies);
  populateEntityCheckboxes('noteTechnologies',state.technologies);
  populateEntityCheckboxes('noteProjects',state.projects);
  document.getElementById('noteTagInput').value=''; renderSelectedTags();

  if(editId) {
    const n=state.notes.find(x=>x.id===editId);
    if(n) {
      document.getElementById('noteTitle').value=n.title||'';
      document.getElementById('noteDesc').value=n.description||'';
      document.getElementById('notePriority').value=n.priority||'medium';
      document.getElementById('noteSource').value=n.source||'';
      state.noteFav=n.favourite||false;
      if(state.noteFav) document.getElementById('noteFavTrack').classList.add('on');
      state.selectedTags=[...(n.tags||[])]; renderSelectedTags();
      (n.categories||[]).forEach(c=>{const cb=catContainer.querySelector(`input[value="${c}"]`);if(cb){cb.checked=true;cb.closest('.checkbox-item').classList.add('checked');}});
      checkEntities('notePeople',n.related_people);
      checkEntities('noteCompanies',n.related_companies);
      checkEntities('noteTechnologies',n.related_technologies);
      checkEntities('noteProjects',n.related_projects);
    }
  }
  document.querySelectorAll('.checkbox-item input[type="checkbox"]').forEach(cb=>{cb.addEventListener('change',()=>cb.closest('.checkbox-item').classList.toggle('checked',cb.checked));});
  setTimeout(()=>document.getElementById('noteTitle').focus(),100);
}

function populateEntityCheckboxes(containerId,list) {
  document.getElementById(containerId).innerHTML=list.map(e=>`<label class="checkbox-item"><input type="checkbox" value="${e.id}"> ${e.name}</label>`).join('');
}
function checkEntities(containerId,ids) {
  const container=document.getElementById(containerId);
  (ids||[]).forEach(id=>{const cb=container.querySelector(`input[value="${id}"]`);if(cb){cb.checked=true;cb.closest('.checkbox-item').classList.add('checked');}});
}

async function saveNote() {
  const title=document.getElementById('noteTitle').value.trim();
  if(!title){toast('Title is required','error');return;}
  const desc=document.getElementById('noteDesc').value;
  const priority=document.getElementById('notePriority').value;
  const source=document.getElementById('noteSource').value.trim();
  const fav=state.noteFav;
  const cats=[]; document.querySelectorAll('#noteCategories input[type="checkbox"]:checked').forEach(cb=>cats.push(cb.value));
  const people=gatherChecked('#notePeople');
  const companies=gatherChecked('#noteCompanies');
  const technologies=gatherChecked('#noteTechnologies');
  const projects=gatherChecked('#noteProjects');
  const tags=[...state.selectedTags];

  const id=state.editingNoteId||uuid();
  const existing=state.notes.find(x=>x.id===id);

  const note={
    id, user_id:currentUser.id, title, description:desc,
    categories:cats, tags, priority, status:existing?existing.status:'active',
    source, related_people:people, related_companies:companies,
    related_technologies:technologies, related_projects:projects,
    attachments:existing?(existing.attachments||[]):[], favourite:fav,
    archived:existing?existing.archived:false,
  };

  // Ensure tags exist
  for(const t of tags) {
    if(!state.tags.find(x=>x.name===t)) {
      const tagObj={id:uuid(),name:t,user_id:currentUser.id};
      state.tags.push(tagObj);
      await sbUpsert('tags',tagObj);
    }
  }

  const result=await sbUpsert('notes',note);
  if(existing) Object.assign(existing,normItem(result||note));
  else state.notes.push(normItem(result||note));

  closeModal(); toast('Idea saved','success'); render();
}

function gatherChecked(selector) { const arr=[]; document.querySelectorAll(selector+' input[type="checkbox"]:checked').forEach(cb=>arr.push(cb.value)); return arr; }

async function deleteNote(id) {
  const n=state.notes.find(x=>x.id===id);
  if(n) { n.status='deleted'; await sbUpsert('notes',n); toast('Idea moved to Recycle Bin','info'); state.currentDetail=null; render(); }
}
async function restoreNote(id) {
  const n=state.notes.find(x=>x.id===id);
  if(n) { n.status='active'; await sbUpsert('notes',n); toast('Idea restored','success'); state.currentDetail=null; state.currentView='all'; render(); }
}
async function permanentDelete(id) {
  await sbDelete('notes',id);
  state.notes=state.notes.filter(x=>x.id!==id);
  toast('Idea permanently deleted','info'); state.currentDetail=null; render();
}
async function archiveNote(id) {
  const n=state.notes.find(x=>x.id===id);
  if(n) { n.archived=!n.archived; await sbUpsert('notes',n); toast(n.archived?'Idea archived':'Idea unarchived','info'); state.currentDetail=null; render(); }
}
async function toggleNoteFav(id) {
  const n=state.notes.find(x=>x.id===id);
  if(n) { n.favourite=!n.favourite; await sbUpsert('notes',n); render(); }
}
function editNote(id) { openNoteModal(id); }
function toggleFav() { state.noteFav=!state.noteFav; document.getElementById('noteFavTrack').classList.toggle('on',state.noteFav); }

// ─── Tag Input ───
function renderSelectedTags() {
  const wrap=document.getElementById('noteTagsWrap');
  const input=document.getElementById('noteTagInput');
  wrap.querySelectorAll('.msi-tag').forEach(el=>el.remove());
  state.selectedTags.forEach(t=>{
    const tag=document.createElement('span'); tag.className='msi-tag';
    tag.innerHTML=`${escHtml(t)} <span class="msi-remove" onclick="removeTag('${t}')"><i class="fas fa-times"></i></span>`;
    wrap.insertBefore(tag,input);
  });
}
function removeTag(t) { state.selectedTags=state.selectedTags.filter(x=>x!==t); renderSelectedTags(); }
function handleTagKey(e) {
  if(e.key==='Enter'){e.preventDefault();const val=e.target.value.trim();if(val&&!state.selectedTags.includes(val)){state.selectedTags.push(val);e.target.value='';renderSelectedTags();}document.getElementById('tagDropdown').classList.remove('open');}
  else if(e.key==='Backspace'&&!e.target.value&&state.selectedTags.length){state.selectedTags.pop();renderSelectedTags();}
}
function showTagSuggestions(val) {
  const dd=document.getElementById('tagDropdown');
  if(!val.trim()){dd.classList.remove('open');return;}
  const matches=state.tags.filter(t=>t.name.toLowerCase().includes(val.toLowerCase())&&!state.selectedTags.includes(t.name));
  if(!matches.length){dd.classList.remove('open');return;}
  dd.innerHTML=matches.map(t=>`<div class="msi-option" onclick="selectTag('${t.name}')">${t.name}</div>`).join('');
  dd.classList.add('open');
}
function selectTag(name) { if(!state.selectedTags.includes(name))state.selectedTags.push(name); document.getElementById('noteTagInput').value=''; document.getElementById('tagDropdown').classList.remove('open'); renderSelectedTags(); }

// ─── Entity CRUD ───
function openEntityModal(type,editId) {
  state.editingEntityType=type; state.editingEntityId=editId||null;
  const modal=document.getElementById('entityModal'); modal.classList.remove('hidden');
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('entityModalTitle').textContent=editId?'Edit '+ENTITY_LABELS[type]:'New '+ENTITY_LABELS[type];
  const body=document.getElementById('entityModalBody');
  const e=editId?state[type].find(x=>x.id===editId):null;
  let fields='';
  if(type==='people') {
    fields=`<div class="form-group"><label class="form-label">Name</label><input type="text" class="form-input" id="ef-name" value="${e?escHtml(e.name):''}"></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Organisation</label><input type="text" class="form-input" id="ef-organisation" value="${e?escHtml(e.organisation||''):''}"></div><div class="form-group"><label class="form-label">Designation</label><input type="text" class="form-input" id="ef-designation" value="${e?escHtml(e.designation||''):''}"></div></div>
      <div class="form-group"><label class="form-label">Contact Info</label><input type="text" class="form-input" id="ef-contactInfo" value="${e?escHtml(e.contact_info||''):''}"></div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="ef-notes" style="min-height:60px">${e?escHtml(e.notes||''):''}</textarea></div>
      <div class="form-group"><label class="form-label">Related Companies</label><div class="checkbox-group" id="ef-relatedCompanies">${state.companies.map(c=>`<label class="checkbox-item"><input type="checkbox" value="${c.id}"> ${c.name}</label>`).join('')}</div></div>
      <div class="form-group"><label class="form-label">Related Technologies</label><div class="checkbox-group" id="ef-relatedTechnologies">${state.technologies.map(t=>`<label class="checkbox-item"><input type="checkbox" value="${t.id}"> ${t.name}</label>`).join('')}</div></div>
      <div class="form-group"><label class="form-label">Related Projects</label><div class="checkbox-group" id="ef-relatedProjects">${state.projects.map(p=>`<label class="checkbox-item"><input type="checkbox" value="${p.id}"> ${p.name}</label>`).join('')}</div></div>`;
  } else if(type==='companies') {
    fields=`<div class="form-group"><label class="form-label">Name</label><input type="text" class="form-input" id="ef-name" value="${e?escHtml(e.name):''}"></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Industry</label><input type="text" class="form-input" id="ef-industry" value="${e?escHtml(e.industry||''):''}"></div><div class="form-group"><label class="form-label">Website</label><input type="text" class="form-input" id="ef-website" value="${e?escHtml(e.website||''):''}"></div></div>
      <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="ef-description" style="min-height:60px">${e?escHtml(e.description||''):''}</textarea></div>
      <div class="form-group"><label class="form-label">Related People</label><div class="checkbox-group" id="ef-relatedPeople">${state.people.map(p=>`<label class="checkbox-item"><input type="checkbox" value="${p.id}"> ${p.name}</label>`).join('')}</div></div>
      <div class="form-group"><label class="form-label">Related Projects</label><div class="checkbox-group" id="ef-relatedProjects">${state.projects.map(p=>`<label class="checkbox-item"><input type="checkbox" value="${p.id}"> ${p.name}</label>`).join('')}</div></div>`;
  } else if(type==='technologies') {
    fields=`<div class="form-group"><label class="form-label">Name</label><input type="text" class="form-input" id="ef-name" value="${e?escHtml(e.name):''}"></div>
      <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="ef-description" style="min-height:60px">${e?escHtml(e.description||''):''}</textarea></div>`;
  } else if(type==='projects') {
    fields=`<div class="form-group"><label class="form-label">Name</label><input type="text" class="form-input" id="ef-name" value="${e?escHtml(e.name):''}"></div>
      <div class="form-group"><label class="form-label">Status</label><select class="form-select" id="ef-status"><option value="planning" ${e&&e.status==='planning'?'selected':''}>Planning</option><option value="active" ${e&&e.status==='active'?'selected':''}>Active</option><option value="completed" ${e&&e.status==='completed'?'selected':''}>Completed</option><option value="paused" ${e&&e.status==='paused'?'selected':''}>Paused</option></select></div>
      <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="ef-description" style="min-height:60px">${e?escHtml(e.description||''):''}</textarea></div>
      <div class="form-group"><label class="form-label">Related Technologies</label><div class="checkbox-group" id="ef-relatedTechnologies">${state.technologies.map(t=>`<label class="checkbox-item"><input type="checkbox" value="${t.id}"> ${t.name}</label>`).join('')}</div></div>
      <div class="form-group"><label class="form-label">Related Companies</label><div class="checkbox-group" id="ef-relatedCompanies">${state.companies.map(c=>`<label class="checkbox-item"><input type="checkbox" value="${c.id}"> ${c.name}</label>`).join('')}</div></div>`;
  }
  body.innerHTML=fields;

  if(e) {
    checkEntitiesById('ef-relatedCompanies',e.related_companies);
    checkEntitiesById('ef-relatedPeople',e.related_people);
    checkEntitiesById('ef-relatedTechnologies',e.related_technologies);
    checkEntitiesById('ef-relatedProjects',e.related_projects);
  }
  body.querySelectorAll('.checkbox-item input[type="checkbox"]').forEach(cb=>{cb.addEventListener('change',()=>cb.closest('.checkbox-item').classList.toggle('checked',cb.checked));});
  setTimeout(()=>{const ni=document.getElementById('ef-name');if(ni)ni.focus();},100);
}

function checkEntitiesById(containerId,ids) {
  const container=document.getElementById(containerId); if(!container)return;
  (ids||[]).forEach(id=>{const cb=container.querySelector(`input[value="${id}"]`);if(cb){cb.checked=true;cb.closest('.checkbox-item').classList.add('checked');}});
}

async function saveEntity() {
  const type=state.editingEntityType;
  const editId=state.editingEntityId;
  const nameEl=document.getElementById('ef-name');
  const name=nameEl?nameEl.value.trim():'';
  if(!name){toast('Name is required','error');return;}

  const id=editId||uuid();
  const existing=state[type].find(x=>x.id===id);
  let entity={id,user_id:currentUser.id,name};

  if(type==='people') {
    entity.organisation=document.getElementById('ef-organisation')?.value||'';
    entity.designation=document.getElementById('ef-designation')?.value||'';
    entity.contact_info=document.getElementById('ef-contactInfo')?.value||'';
    entity.notes=document.getElementById('ef-notes')?.value||'';
    entity.related_companies=gatherChecked('#ef-relatedCompanies');
    entity.related_technologies=gatherChecked('#ef-relatedTechnologies');
    entity.related_projects=gatherChecked('#ef-relatedProjects');
  } else if(type==='companies') {
    entity.industry=document.getElementById('ef-industry')?.value||'';
    entity.website=document.getElementById('ef-website')?.value||'';
    entity.description=document.getElementById('ef-description')?.value||'';
    entity.related_people=gatherChecked('#ef-relatedPeople');
    entity.related_projects=gatherChecked('#ef-relatedProjects');
  } else if(type==='technologies') {
    entity.description=document.getElementById('ef-description')?.value||'';
  } else if(type==='projects') {
    entity.status=document.getElementById('ef-status')?.value||'planning';
    entity.description=document.getElementById('ef-description')?.value||'';
    entity.related_technologies=gatherChecked('#ef-relatedTechnologies');
    entity.related_companies=gatherChecked('#ef-relatedCompanies');
  }

  const result=await sbUpsert(type,entity);
  if(existing) Object.assign(existing,normItem(result||entity));
  else state[type].push(normItem(result||entity));

  closeModal(); toast(ENTITY_LABELS[type]+' saved','success'); render();
}

async function deleteEntity(type,id) {
  await sbDelete(type,id);
  state[type]=state[type].filter(x=>x.id!==id);
  toast(ENTITY_LABELS[type]+' deleted','info');
  if(state.currentDetail&&state.currentDetailType===type&&state.currentDetail===id) state.currentDetail=null;
  render();
}
function editEntity(type,id) { openEntityModal(type,id); }

// ─── Manage Categories / Tags ───
function openManageModal(type) {
  const modal=document.getElementById('manageModal'); modal.classList.remove('hidden');
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('manageModalTitle').textContent=type==='categories'?'Manage Categories':'Manage Tags';
  const list=state[type]; const label=type==='categories'?'Category':'Tag';
  const counts={};
  state.notes.filter(n=>n.status!=='deleted').forEach(n=>{(n[type]||[]).forEach(v=>{counts[v]=(counts[v]||0)+1;});});
  let html=`<div class="manage-list">${list.map(item=>{
    const c=counts[item.name]||0;
    const colorDot=type==='categories'?`<span style="width:8px;height:8px;border-radius:50%;background:${getCatColor(item.name)};flex-shrink:0"></span>`:'';
    return `<div class="manage-list-item">${colorDot}<span class="ml-name">${escHtml(item.name)}</span><span class="ml-count">${c} notes</span><button onclick="renameItem('${type}','${item.id}')"><i class="fas fa-edit"></i></button><button class="delete-btn" onclick="deleteItem('${type}','${item.id}','${item.name}')"><i class="fas fa-trash"></i></button></div>`;
  }).join('')}</div><div class="add-inline"><input type="text" id="newItemInput" placeholder="New ${label} name..."><button onclick="addItem('${type}')">Add ${label}</button></div>`;
  document.getElementById('manageModalBody').innerHTML=html;
}

async function addItem(type) {
  const input=document.getElementById('newItemInput');
  const name=input.value.trim();
  if(!name)return;
  if(state[type].find(x=>x.name===name)){toast('Already exists','error');return;}
  const item={id:uuid(),name,user_id:currentUser.id};
  const result=await sbUpsert(type,item);
  state[type].push(normItem(result||item));
  toast(name+' added','success');
  openManageModal(type); render();
}

async function deleteItem(type,id,name) {
  await sbDelete(type,id);
  // Remove from notes
  for(const n of state.notes) {
    if(n[type]&&n[type].includes(name)) {
      n[type]=n[type].filter(v=>v!==name);
      await sbUpsert('notes',n);
    }
  }
  state[type]=state[type].filter(x=>x.id!==id);
  toast(name+' deleted','info');
  openManageModal(type); render();
}

async function renameItem(type,id) {
  const item=state[type].find(x=>x.id===id);
  if(!item)return;
  const oldName=item.name;
  // Using a temporary approach — prompt is the only way for a simple rename without building another modal
  const newName=window.prompt('Rename to:',oldName);
  if(!newName||newName===oldName)return;
  // Update in all notes
  for(const n of state.notes) {
    if(n[type]&&n[type].includes(oldName)) {
      n[type]=n[type].map(v=>v===oldName?newName:v);
      await sbUpsert('notes',n);
    }
  }
  item.name=newName;
  await sbUpsert(type,item);
  toast('Renamed to '+newName,'success');
  openManageModal(type); render();
}

// ─── Import ───
function openImportModal() {
  document.getElementById('importModal').classList.remove('hidden');
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('importFile').value='';
  document.getElementById('importContent').value='';
}

async function doImport() {
  const format=document.getElementById('importFormat').value;
  const type=document.getElementById('importType').value;
  const fileInput=document.getElementById('importFile');
  let content=document.getElementById('importContent').value;
  if(fileInput.files.length>0) content=await fileInput.files[0].text();
  if(!content.trim()){toast('No data to import','error');return;}

  try {
    if(format==='json') {
      const data=JSON.parse(content);
      if(type==='full') {
        for(const store of TABLES) {
          if(data[store]&&Array.isArray(data[store])) {
            for(const item of data[store]) {
              if(!item.id)item.id=uuid();
              if(!item.user_id)item.user_id=currentUser.id;
              // Convert snake_case field names if they came from export
              await sbUpsert(store,item);
            }
          }
        }
        await sbFetchAll();
      } else {
        const arr=Array.isArray(data)?data:(data[type]||[]);
        for(const item of arr) {
          if(!item.id)item.id=uuid();
          if(!item.user_id)item.user_id=currentUser.id;
          await sbUpsert(type,item);
        }
        state[type]=await (async()=>{const{data}=await sb.from(type).select('*');return normalizeArrays(data||[]);})();
      }
    } else if(format==='csv') {
      const lines=content.split('\n').filter(l=>l.trim());
      if(lines.length<2){toast('CSV needs header + data rows','error');return;}
      const headers=lines[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''));
      for(let i=1;i<lines.length;i++) {
        const vals=lines[i].split(',').map(v=>v.trim().replace(/^"|"$/g,''));
        const obj={};
        headers.forEach((h,idx)=>obj[h]=vals[idx]||'');
        if(!obj.id)obj.id=uuid();
        obj.user_id=currentUser.id;
        if(type==='notes') {
          obj.categories=obj.categories?obj.categories.split(';').filter(Boolean):[];
          obj.tags=obj.tags?obj.tags.split(';').filter(Boolean):[];
        }
        await sbUpsert(type,obj);
      }
      await sbFetchAll();
    } else if(format==='txt'||format==='markdown') {
      const lines=content.split('\n');
      let currentTitle='',currentDesc='';
      for(const line of lines) {
        const trimmed=line.trim();
        if(format==='markdown'&&trimmed.startsWith('#')) {
          if(currentTitle) await sbUpsert('notes',{id:uuid(),user_id:currentUser.id,title:currentTitle,description:currentDesc.trim(),priority:'medium',status:'active',categories:[],tags:[],related_people:[],related_companies:[],related_technologies:[],related_projects:[],attachments:[],favourite:false,archived:false});
          currentTitle=trimmed.replace(/^#+\s*/,''); currentDesc='';
        } else if(format==='txt'&&trimmed&&!currentTitle) { currentTitle=trimmed; } else { currentDesc+=line+'\n'; }
      }
      if(currentTitle) await sbUpsert('notes',{id:uuid(),user_id:currentUser.id,title:currentTitle,description:currentDesc.trim(),priority:'medium',status:'active',categories:[],tags:[],related_people:[],related_companies:[],related_technologies:[],related_projects:[],attachments:[],favourite:false,archived:false});
      await sbFetchAll();
    }
    closeModal(); toast('Data imported successfully','success');
    state.page=1; render();
  } catch(err) { toast('Import failed: '+err.message,'error'); }
}

// ─── Export ───
function openExportModal() {
  document.getElementById('exportModal').classList.remove('hidden');
  document.getElementById('modalOverlay').classList.add('open');
}

function doExport() {
  const format=document.getElementById('exportFormat').value;
  const scope=document.getElementById('exportScope').value;
  let data,filename,content;

  if(scope==='full') data={notes:state.notes,people:state.people,companies:state.companies,technologies:state.technologies,projects:state.projects,categories:state.categories,tags:state.tags};
  else if(scope==='all-notes') data=state.notes;
  else if(scope==='notes') data=getFilteredNotes();
  else data=state[scope];

  if(format==='json') {
    content=JSON.stringify(data,null,2); filename=`knowledge-vault-${scope}-${Date.now()}.json`;
  } else if(format==='csv') {
    const arr=Array.isArray(data)?data:(data.notes||[]);
    if(!arr.length){toast('No data to export','error');return;}
    const keys=Object.keys(arr[0]);
    const header=keys.join(',');
    const rows=arr.map(item=>keys.map(k=>{let val=item[k];if(Array.isArray(val))val=val.join(';');return '"'+String(val||'').replace(/"/g,'""')+'"';}).join(','));
    content=header+'\n'+rows.join('\n'); filename=`knowledge-vault-${scope}-${Date.now()}.csv`;
  } else if(format==='markdown') {
    const arr=Array.isArray(data)?data:(data.notes||[]);
    content=arr.map(n=>`# ${n.title||'Untitled'}\n\n${n.description||''}\n\n**Priority:** ${n.priority||'medium'} | **Created:** ${fmtDate(n.created_at)} | **Modified:** ${fmtDate(n.updated_at)}\n\n${(n.categories||[]).length?'**Categories:** '+n.categories.join(', ')+'\n':''}${(n.tags||[]).length?'**Tags:** '+n.tags.join(', ')+'\n':''}`).join('\n---\n\n');
    filename=`knowledge-vault-${scope}-${Date.now()}.md`;
  } else if(format==='txt') {
    const arr=Array.isArray(data)?data:(data.notes||[]);
    content=arr.map(n=>`${n.title||'Untitled'}\n${n.description||''}\n[${fmtDate(n.created_at)}] [${n.priority||'medium'}]`).join('\n\n---\n\n');
    filename=`knowledge-vault-${scope}-${Date.now()}.txt`;
  }

  const blob=new Blob([content],{type:'text/plain'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
  closeModal(); toast('Exported successfully','success');
}

// ─── Backup & Restore ───
function doBackup() {
  const data={version:'1.0',timestamp:nowISO(),user_id:currentUser.id,
    notes:state.notes,people:state.people,companies:state.companies,
    technologies:state.technologies,projects:state.projects,
    categories:state.categories,tags:state.tags,
    panels:state.panels,panel_fields:state.panel_fields,panel_entries:state.panel_entries};
  const content=JSON.stringify(data,null,2);
  const blob=new Blob([content],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`knowledge-vault-backup-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url); toast('Backup downloaded','success');
}

function openRestoreModal() {
  document.getElementById('restoreModal').classList.remove('hidden');
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('restoreFile').value='';
}

async function doRestore() {
  const fileInput=document.getElementById('restoreFile');
  if(!fileInput.files.length){toast('Select a backup file','error');return;}
  try {
    const content=await fileInput.files[0].text();
    const data=JSON.parse(content);
    // Clear all user data from Supabase
    for(const store of TABLES) await sbDeleteAll(store);
    // Write backup data
    for(const store of TABLES) {
      if(data[store]&&Array.isArray(data[store])) {
        for(const item of data[store]) {
          if(!item.id)item.id=uuid();
          item.user_id=currentUser.id;
          await sbUpsert(store,item);
        }
      }
    }
    await sbFetchAll();
    closeModal();
    state.currentView='all'; state.currentDetail=null;
    state.filters={categories:[],tags:[],priority:[],people:[],companies:[],technologies:[],projects:[],favouriteOnly:false,archivedOnly:false,deletedOnly:false};
    toast('Backup restored successfully','success'); render();
  } catch(err) { toast('Restore failed: '+err.message,'error'); }
}

// ─── Modal Management ───
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.querySelectorAll('.modal-card').forEach(m=>m.classList.add('hidden'));
  const dd=document.getElementById('tagDropdown'); if(dd)dd.classList.remove('open');
}

// ─── Keyboard Shortcuts ───
document.addEventListener('keydown',(e)=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='n'){e.preventDefault();if(currentUser)openNoteModal();}
  if((e.ctrlKey||e.metaKey)&&e.key==='f'){e.preventDefault();document.getElementById('searchInput').focus();}
  if(e.key==='Escape'){if(document.getElementById('modalOverlay').classList.contains('open'))closeModal();else if(state.currentDetail)goBack();}
});

document.addEventListener('click',(e)=>{
  const dd=document.getElementById('tagDropdown');
  if(dd&&!e.target.closest('#noteTagsWrap'))dd.classList.remove('open');
});


// ─── Chat Widget Logic ───
function toggleChat() {
  const win = document.getElementById('chatWindow');
  win.classList.toggle('open');
  if (win.classList.contains('open')) {
    document.getElementById('chatInput').focus();
  }
}

function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

let currentImageBase64 = null;

function handleImageSelect(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      currentImageBase64 = e.target.result.split(',')[1];
      const msgs = document.getElementById('chatMessages');
      const previewDiv = document.createElement('div');
      previewDiv.className = 'chat-message user';
      previewDiv.style.padding = '5px';
      previewDiv.innerHTML = `<div class="image-preview"><img src="${e.target.result}" style="max-width:200px"><div class="remove-img" onclick="this.parentElement.parentElement.remove(); currentImageBase64=null;"><i class="fas fa-times"></i></div></div>`;
      msgs.appendChild(previewDiv);
      msgs.scrollTop = msgs.scrollHeight;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function addChatMessage(sender, text, id = null, actions = []) {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-message ' + sender;
  if (id) div.id = id;
  div.textContent = text;
  
  if (actions && actions.length > 0) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'chat-action';
    actions.forEach((action) => {
      const btn = document.createElement('button');
      btn.className = 'chat-action-btn';
      let label = '', icon = '';
      if (action.type === 'add_note') { label = `Add Note: ${action.data.title}`; icon = 'fa-sticky-note'; }
      else if (action.type === 'add_person') { label = `Add Contact: ${action.data.name}`; icon = 'fa-user'; }
      else if (action.type === 'add_company') { label = `Add Company: ${action.data.name}`; icon = 'fa-building'; }
      else if (action.type === 'add_project') { label = `Add Project: ${action.data.name}`; icon = 'fa-project-diagram'; }
      else if (action.type === 'add_technology') { label = `Add Tech: ${action.data.name}`; icon = 'fa-microchip'; }
      else if (action.type === 'update_note') { label = `Update Note: ${action.data.title || 'Untitled'}`; icon = 'fa-edit'; }
      else if (action.type === 'update_person') { label = `Update Contact: ${action.data.name || 'Unknown'}`; icon = 'fa-user-edit'; }
      else if (action.type === 'update_company') { label = `Update Company: ${action.data.name || 'Unknown'}`; icon = 'fa-edit'; }
      else if (action.type === 'update_project') { label = `Update Project: ${action.data.name || 'Unknown'}`; icon = 'fa-edit'; }
      else if (action.type === 'update_technology') { label = `Update Tech: ${action.data.name || 'Unknown'}`; icon = 'fa-edit'; }
      else if (action.type === 'add_panel_entry') { label = `Add to ${action.panel_name}: ${action.data.title || 'Entry'}`; icon = 'fa-folder-plus'; }
      
      btn.innerHTML = `<i class="fas ${icon}"></i> ${escHtml(label)}`;
      btn.onclick = () => executeChatAction(action, btn);
      actionsDiv.appendChild(btn);
    });
    div.appendChild(actionsDiv);
  }
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text && !currentImageBase64) return;

  if (text) addChatMessage('user', text);
  
  const payload = { 
    message: text, 
    image: currentImageBase64,
    userId: currentUser.id,
    telegramBotToken: state.userSettings?.telegram_bot_token,
    telegramChatId: state.userSettings?.telegram_chat_id,
    panels: state.panels,
    panelFields: state.panel_fields,
    vaultData: {
      notes: state.notes.map(n => ({ id: n.id, title: n.title, description: n.description, priority: n.priority, status: n.status, created_at: n.created_at, updated_at: n.updated_at, tags: n.tags, categories: n.categories })),
      people: state.people,
      companies: state.companies,
      technologies: state.technologies,
      projects: state.projects
    }
  };
  input.value = '';
  input.style.height = 'auto';
  currentImageBase64 = null;

  const loadingId = 'load-' + Date.now();
  addChatMessage('ai', 'Analyzing your input...', loadingId);

  try {
    // Call the secure Supabase Edge Function
    const { data, error } = await sb.functions.invoke('gemini-chat', {
      body: payload
    });

    document.getElementById(loadingId)?.remove();

    if (error) throw error;
    if (data.error) throw new Error(data.error);


    if (data.todos) {
      const { data: newTodos } = await sb.from('todos').select('*').order('created_at',{ascending:false});
      if (newTodos) state.todos = newTodos;
      setTimeout(() => { if(['matrix','todos'].includes(state.currentView)) renderMainContent(); updateSidebarCounts(); }, 500);
    }

    addChatMessage('ai', data.reply || 'Done.', null, data.actions || []);
    
  } catch (err) {
    document.getElementById(loadingId)?.remove();
    addChatMessage('ai', '⚠️ Error: ' + err.message);
  }
}

async function executeChatAction(action, btn) {
  btn.disabled = true;
  btn.style.opacity = '0.5';
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  
  try {
    if (action.type === 'add_panel_entry') {
      const panelName = action.panel_name;
      const panel = state.panels.find(p => p.name.toLowerCase() === panelName.toLowerCase());
      if (!panel) throw new Error(`Custom Panel "${panelName}" not found`);
      
      const newEntry = {
        id: uuid(),
        panel_id: panel.id,
        user_id: currentUser.id,
        data: action.data,
        created_at: nowISO(),
        updated_at: nowISO()
      };
      
      const defaultNotesPanel = state.panels.find(p => p.name === 'Notes' || p.name === 'Ideas');
      if (panel.id === defaultNotesPanel?.id) {
        const titleVal = newEntry.data.title ? newEntry.data.title.trim() : '';
        const linkVal = newEntry.data.links ? newEntry.data.links.trim() : '';
        if (linkVal && (!titleVal || titleVal === linkVal)) {
          showBanner('Fetching URL title...', '');
          const fetchedTitle = await getUrlTitle(linkVal);
          if (fetchedTitle) {
            newEntry.data.title = fetchedTitle;
            showBanner('Title autofetched!', 'success');
          }
        }
      }

      const result = await sbUpsert('panel_entries', newEntry);
      state.panel_entries.unshift(normItem(result || newEntry));
      
      btn.innerHTML = '<i class="fas fa-check"></i> Added!';
      toast('Entry added to panel', 'success');
      switchView(`panel-${panel.id}`);
      return;
    }

    let type = action.type.replace('add_', '').replace('update_', '');
    if (type === 'person') type = 'people';
    if (type === 'technology') type = 'technologies';
    if (type === 'company') type = 'companies';
    if (type === 'project') type = 'projects';

    if (type === 'todo') type = 'todos';
    const isUpdate = action.type.startsWith('update_');
    
    if (type === 'note') {
      // Ensure tags exist
      for (const t of (action.data.tags || [])) {
        if(!state.tags.find(x=>x.name===t)) {
           const tagObj={id:uuid(),name:t,user_id:currentUser.id};
           state.tags.push(tagObj); 
           await sbUpsert('tags',tagObj);
        }
      }
      let note = { ...action.data };
      if (isUpdate) {
        if (!note.id) throw new Error("Update action missing 'id'");
        const existing = state.notes.find(x => x.id === note.id);
        if (!existing) throw new Error("Note not found");
        Object.assign(existing, note);
        await sbUpsert('notes', existing);
      } else {
        note = {
          id: uuid(), user_id: currentUser.id,
          title: action.data.title || 'Untitled',
          description: action.data.description || '',
          tags: action.data.tags || [],
          categories: action.data.categories || [],
          priority: 'medium',
          status: 'active',
          related_people: [], related_companies: [], related_technologies: [], related_projects: [],
          attachments: [], favourite: false, archived: false, ...action.data
        };
        const result = await sbUpsert('notes', note);
        state.notes.unshift(normItem(result || note));
      }
    } else {
       let entity = { ...action.data };
       if (isUpdate) {
         if (!entity.id) throw new Error(`Update action missing 'id'`);
         const existing = state[type].find(x => x.id === entity.id);
         if (!existing) throw new Error(`${type} not found`);
         Object.assign(existing, entity);
         await sbUpsert(type, existing);
       } else {
         entity = { id: uuid(), user_id: currentUser.id, ...action.data };
         if(type === 'people') {
           entity.related_companies = entity.related_companies || [];
           entity.related_technologies = entity.related_technologies || [];
           entity.related_projects = entity.related_projects || [];
         }
         const result = await sbUpsert(type, entity);
         state[type].unshift(normItem(result || entity));
       }
    }
    
    btn.innerHTML = '<i class="fas fa-check"></i> ' + (isUpdate ? 'Updated!' : 'Added!');
    toast(isUpdate ? 'Item updated' : 'Item added to Vault', 'success');
    render(); // Refresh main UI to show the new item
  } catch (e) {
    btn.innerHTML = '<i class="fas fa-times"></i> Failed';
    toast(e.message, 'error');
  }
}

// ==========================================
// ─── NEW FEATURES (Finance, Todo, News) ───
// ==========================================

// ─── Settings & Toggles ───
function toggleNewsSetting() { document.getElementById('newsEnabledTrack').classList.toggle('active'); }
function toggleTodoUrgent() { const cb=document.getElementById('todoUrgent'); cb.checked=!cb.checked; updateQuadrantPreview(); }
function toggleTodoImportant() { const cb=document.getElementById('todoImportant'); cb.checked=!cb.checked; updateQuadrantPreview(); }
function toggleTodoTelegram() { const cb=document.getElementById('todoNotifyTelegram'); cb.checked=!cb.checked; }
async function testEmailSettings() { toast('Please save settings. Email test requires a backend edge function.','info'); }

function openSettings() {
  if(state.userSettings) {
    document.getElementById('s-call-name').value = state.userSettings.call_name || '';
    document.getElementById('s-smtp-host').value = state.userSettings.smtp_host || '';
    document.getElementById('s-smtp-port').value = state.userSettings.smtp_port || 587;
    document.getElementById('s-smtp-user').value = state.userSettings.smtp_user || '';
    document.getElementById('s-smtp-pass').value = state.userSettings.smtp_pass || '';
    document.getElementById('s-smtp-from').value = state.userSettings.smtp_from || '';
    document.getElementById('s-notify-email').value = state.userSettings.notify_email || '';
    document.getElementById('s-tg-token').value = state.userSettings.telegram_bot_token || '';
    document.getElementById('s-tg-chatid').value = state.userSettings.telegram_chat_id || '';

    if(document.getElementById('s-news-topics')) {
      document.getElementById('s-news-topics').value = state.userSettings.news_topics || 'Indian policy, startups, technology';
    }
    if(document.getElementById('newsEnabledTrack')) {
      if(state.userSettings.news_enabled === false) document.getElementById('newsEnabledTrack').classList.remove('active');
      else document.getElementById('newsEnabledTrack').classList.add('active');
    }
  }
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('settingsModal').classList.remove('hidden');
}

function switchSettingsTab(tabId, btn) {
  document.querySelectorAll('.settings-v-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.s-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('sp-'+tabId).classList.add('active');
}

async function saveSettings() {
  const btn = document.querySelector('.save-settings-btn');
  const ogText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  try {
    const data = {
      user_id: currentUser.id,
      call_name: document.getElementById('s-call-name').value.trim(),
      smtp_host: document.getElementById('s-smtp-host').value,
      smtp_port: parseInt(document.getElementById('s-smtp-port').value)||587,
      smtp_user: document.getElementById('s-smtp-user').value,
      smtp_pass: document.getElementById('s-smtp-pass').value,
      smtp_from: document.getElementById('s-smtp-from').value,
      notify_email: document.getElementById('s-notify-email').value,
      telegram_bot_token: document.getElementById('s-tg-token').value,
      telegram_chat_id: document.getElementById('s-tg-chatid').value,
      news_enabled: document.getElementById('newsEnabledTrack') ? document.getElementById('newsEnabledTrack').classList.contains('active') : true,
      news_topics: document.getElementById('s-news-topics') ? document.getElementById('s-news-topics').value.trim() : 'Indian policy, startups, technology'
    };
    if(state.userSettings && state.userSettings.id) data.id = state.userSettings.id;
    
    const { data: saved, error } = await sb.from('user_settings').upsert(data).select().single();
    if(error) throw error;
    state.userSettings = saved;
    toast('Settings saved successfully', 'success');
    closeModal();
    renderUserInfo();
    render();
  } catch(e) {
    toast(e.message, 'error');
  } finally {
    btn.innerHTML = ogText;
  }
}

async function testTelegramSettings() {
  const token = document.getElementById('s-tg-token').value;
  const chat = document.getElementById('s-tg-chatid').value;
  if(!token || !chat) return toast('Please enter bot token and chat ID','error');
  toast('Sending test message...');
  try {
    const { data, error } = await sb.functions.invoke('send-telegram', {
      body: { botToken: token, chatId: chat, message: '👋 Hello from Knowledge Vault! Telegram notifications are working.' }
    });
    if(error) throw error;
    if(data.success) toast('Message sent! Check Telegram.','success');
    else throw new Error(data.error);
  } catch(e) {
    toast(e.message, 'error');
  }
}


// ─── Eisenhower Matrix (Todos) ───
function openTodoModal(editId=null, u=false, i=false) {
  if(editId) {
    const t = state.todos.find(x=>x.id===editId);
    if(t) {
      document.getElementById('todoId').value = t.id;
      document.getElementById('todoTitle').value = t.title;
      document.getElementById('todoDesc').value = t.description||'';
      document.getElementById('todoDueDate').value = t.due_date||'';
      document.getElementById('todoUrgent').checked = t.urgent;
      document.getElementById('todoImportant').checked = t.important;
      document.getElementById('todoNotifyTelegram').checked = t.notify_telegram;
      document.getElementById('todoModalTitle').textContent = 'Edit Task';
    }
  } else {
    document.getElementById('todoId').value = '';
    document.getElementById('todoTitle').value = '';
    document.getElementById('todoDesc').value = '';
    document.getElementById('todoDueDate').value = '';
    document.getElementById('todoUrgent').checked = u;
    document.getElementById('todoImportant').checked = i;
    document.getElementById('todoNotifyTelegram').checked = false;
    document.getElementById('todoModalTitle').textContent = 'New Task';
  }
  updateQuadrantPreview();
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('todoModal').classList.remove('hidden');
}

function updateQuadrantPreview() {
  const u = document.getElementById('todoUrgent').checked;
  const i = document.getElementById('todoImportant').checked;
  const p = document.getElementById('quadrantPreview');
  
  document.getElementById('urgentLabel').style.borderColor = u ? '#dc2626' : 'transparent';
  document.getElementById('importantLabel').style.borderColor = i ? 'var(--primary)' : 'transparent';
  
  if(u && i) p.innerHTML = '<strong style="color:#dc2626">Quadrant 1: DO FIRST</strong><br>Urgent and important tasks.';
  else if(!u && i) p.innerHTML = '<strong style="color:var(--primary)">Quadrant 2: SCHEDULE</strong><br>Important but not urgent tasks.';
  else if(u && !i) p.innerHTML = '<strong style="color:#ca8a04">Quadrant 3: DELEGATE</strong><br>Urgent but not important tasks.';
  else p.innerHTML = '<strong style="color:var(--ink-muted)">Quadrant 4: ELIMINATE</strong><br>Neither urgent nor important tasks.';
}

async function saveTodo() {
  const title = document.getElementById('todoTitle').value.trim();
  if(!title) return toast('Title is required','error');
  
  const id = document.getElementById('todoId').value;
  const todo = {
    user_id: currentUser.id,
    title,
    description: document.getElementById('todoDesc').value.trim(),
    due_date: document.getElementById('todoDueDate').value || null,
    urgent: document.getElementById('todoUrgent').checked,
    important: document.getElementById('todoImportant').checked,
    notify_telegram: document.getElementById('todoNotifyTelegram').checked,
    updated_at: new Date().toISOString()
  };
  if(id) todo.id = id;
  
  try {
    const { data, error } = await sb.from('todos').upsert(todo).select().single();
    if(error) throw error;
    
    if(id) {
      const idx = state.todos.findIndex(x=>x.id===id);
      if(idx>-1) state.todos[idx] = data;
    } else {
      state.todos.unshift(data);
    }
    
    closeModal();
    renderMainContent();
    updateSidebarCounts();
    toast('Task saved', 'success');
  } catch(e) { toast(e.message,'error'); }
}

async function toggleTodoComplete(id) {
  const t = state.todos.find(x=>x.id===id);
  if(!t) return;
  const newVal = !t.completed;
  t.completed = newVal;
  // Optimistic UI
  renderMainContent();
  updateSidebarCounts();
  try {
    await sb.from('todos').update({completed: newVal, completed_at: newVal?new Date().toISOString():null}).eq('id',id);
  } catch(e) {
    t.completed = !newVal; // rollback
    renderMainContent(); updateSidebarCounts();
    toast('Update failed: '+e.message, 'error');
  }
}

async function deleteTodo(id) {
  if(!confirm('Delete task?')) return;
  state.todos = state.todos.filter(x=>x.id!==id);
  renderMainContent(); updateSidebarCounts();
  try { await sb.from('todos').delete().eq('id',id); }
  catch(e) { toast('Delete failed','error'); }
}

function renderTodoCard(t) {
  const isOverdue = t.due_date && new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0)) && !t.completed;
  return `
    <div class="todo-card ${t.completed?'done':''}">
      <div style="display:flex;gap:10px">
        <div style="padding-top:2px">
          <input type="checkbox" ${t.completed?'checked':''} onchange="toggleTodoComplete('${t.id}')" style="width:16px;height:16px;cursor:pointer;accent-color:var(--primary)">
        </div>
        <div style="flex:1;min-width:0">
          <div class="tc-title" onclick="openTodoModal('${t.id}')" style="cursor:pointer">${escHtml(t.title)}</div>
          ${t.due_date?`<div class="tc-due ${isOverdue?'overdue':''}"><i class="fas fa-calendar-alt"></i> ${t.due_date} ${isOverdue?'(Overdue)':''}</div>`:''}
        </div>
      </div>
      <div class="tc-actions">
        ${t.notify_telegram?'<span class="tc-btn" title="Telegram Reminder"><i class="fab fa-telegram" style="color:var(--primary)"></i></span>':''}
        <button class="tc-btn del-btn" onclick="deleteTodo('${t.id}')" title="Delete"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `;
}

function renderEisenhowerMatrix() {
  const todos = state.todos;
  const q1 = todos.filter(t=>t.urgent && t.important);
  const q2 = todos.filter(t=>!t.urgent && t.important);
  const q3 = todos.filter(t=>t.urgent && !t.important);
  const q4 = todos.filter(t=>!t.urgent && !t.important);
  
  // Sort incomplete first, then by created desc
  const sortQ = (a,b) => (a.completed===b.completed ? new Date(b.created_at)-new Date(a.created_at) : (a.completed?1:-1));
  q1.sort(sortQ); q2.sort(sortQ); q3.sort(sortQ); q4.sort(sortQ);

  let chatHtml = ``;

  return `
    <div class="section-header">
      <h2>Eisenhower Matrix</h2>
      <button class="sb-new-btn" style="width:auto;margin:0" onclick="openTodoModal(null,false,false)"><i class="fas fa-plus"></i> New Task</button>
    </div>
    ${chatHtml}
    <div class="matrix-axis-labels">
      <div class="matrix-axis-label" style="color:#dc2626">Urgent</div>
      <div class="matrix-axis-label" style="color:var(--ink-muted)">Not Urgent</div>
    </div>
    <div class="matrix-grid">
      <div class="matrix-quadrant q1">
        <div class="mq-head">
          <div class="mq-label q1">Q1: DO FIRST</div>
          <button class="mq-add" onclick="openTodoModal(null,true,true)"><i class="fas fa-plus"></i></button>
        </div>
        ${q1.map(renderTodoCard).join('')}
      </div>
      <div class="matrix-quadrant q2">
        <div class="mq-head">
          <div class="mq-label q2">Q2: SCHEDULE</div>
          <button class="mq-add" onclick="openTodoModal(null,false,true)"><i class="fas fa-plus"></i></button>
        </div>
        ${q2.map(renderTodoCard).join('')}
      </div>
      <div class="matrix-quadrant q3">
        <div class="mq-head">
          <div class="mq-label q3">Q3: DELEGATE</div>
          <button class="mq-add" onclick="openTodoModal(null,true,false)"><i class="fas fa-plus"></i></button>
        </div>
        ${q3.map(renderTodoCard).join('')}
      </div>
      <div class="matrix-quadrant q4">
        <div class="mq-head">
          <div class="mq-label q4">Q4: ELIMINATE</div>
          <button class="mq-add" onclick="openTodoModal(null,false,false)"><i class="fas fa-plus"></i></button>
        </div>
        ${q4.map(renderTodoCard).join('')}
      </div>
    </div>
  `;
}

async function sendTodoChat() {
  const input = document.getElementById('todoChatInput');
  const msgText = input.value.trim();
  if(!msgText) return;
  
  const msgList = document.getElementById('todoChatMsgs');
  msgList.innerHTML += `<div class="fin-chat-msg user">${escHtml(msgText)}</div>`;
  input.value = '';
  msgList.scrollTop = msgList.scrollHeight;

  const thinkingId = 'th-'+Date.now();
  msgList.innerHTML += `<div class="fin-chat-msg ai" id="${thinkingId}"><i class="fas fa-circle-notch fa-spin"></i> Analyzing...</div>`;
  msgList.scrollTop = msgList.scrollHeight;

  try {
    const { data, error } = await sb.functions.invoke('gemini-chat', {
      body: { 
        message: msgText, 
        userId: currentUser.id,
        telegramBotToken: state.userSettings?.telegram_bot_token,
        telegramChatId: state.userSettings?.telegram_chat_id,
        vaultData: {
          todos: state.todos
        }
      }
    });
    if(error) throw error;
    
    document.getElementById(thinkingId).remove();
    msgList.innerHTML += `<div class="fin-chat-msg ai">${data.reply || 'Task added.'}</div>`;
    msgList.scrollTop = msgList.scrollHeight;
    
    // Refresh data silently
    const { data: newTodos } = await sb.from('todos').select('*').order('created_at',{ascending:false});
    if(newTodos) {
      state.todos = newTodos;
      // Re-render dashboard after a short delay
      setTimeout(() => { if(['matrix','todos'].includes(state.currentView)) renderMainContent(); }, 1500);
      updateSidebarCounts();
    }
  } catch(e) {
    document.getElementById(thinkingId).innerHTML = `<i class="fas fa-exclamation-triangle" style="color:#c00"></i> Error: ${e.message}`;
  }
}

function renderTodoList() {
  const todos = [...state.todos].sort((a,b) => {
    if(a.completed!==b.completed) return a.completed?1:-1;
    if(a.due_date && b.due_date) return new Date(a.due_date)-new Date(b.due_date);
    return new Date(b.created_at)-new Date(a.created_at);
  });
  
  return `
    <div class="section-header">
      <h2>All Tasks</h2>
      <button class="sb-new-btn" style="width:auto;margin:0" onclick="openTodoModal()"><i class="fas fa-plus"></i> New Task</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">
      ${todos.map(renderTodoCard).join('')}
    </div>
  `;
}

// ─── News Feed (Removed) ───

// ─── Custom Panels Operations ───
const PICKER_ICONS = [
  'fa-file-alt', 'fa-lightbulb', 'fa-question-circle', 'fa-music',
  'fa-book', 'fa-code', 'fa-tasks', 'fa-link',
  'fa-calendar-alt', 'fa-shopping-cart', 'fa-heart', 'fa-dollar-sign',
  'fa-database', 'fa-archive', 'fa-user', 'fa-star'
];

const PICKER_COLORS = [
  '#62aef0', '#d6b6f6', '#391c57', '#ff64c8', '#dd5b00',
  '#793400', '#2a9d99', '#1aae39', '#523410', '#615d59'
];

let draggedPanelId = null;

// ─── Custom Panel Views State Manager & Empty Copy Generator ───
function getPanelEmptyStateCopy(panelName) {
  const nameLower = panelName.toLowerCase();
  if (nameLower.includes('idea')) {
    return {
      title: "No ideas yet",
      desc: "Capture your next big lightbulb moment! Add an idea to get started."
    };
  } else if (nameLower.includes('doubt') || nameLower.includes('question') || nameLower.includes('query')) {
    return {
      title: "No doubts yet",
      desc: "Clear your mind or note down what's currently blocking you."
    };
  } else if (nameLower.includes('task') || nameLower.includes('todo') || nameLower.includes('action')) {
    return {
      title: "No tasks yet",
      desc: "Stay organized. Plan your tasks and prioritize what to work on next."
    };
  } else if (nameLower.includes('read') || nameLower.includes('book') || nameLower.includes('article') || nameLower.includes('list')) {
    return {
      title: "No reading list items yet",
      desc: "Save articles, blogs, books, or papers to read and review later."
    };
  } else if (nameLower.includes('music') || nameLower.includes('song') || nameLower.includes('playlist')) {
    return {
      title: "No tracks yet",
      desc: "Build your custom soundtrack of inspiration or research logs."
    };
  }
  return {
    title: `No ${panelName} entries yet`,
    desc: `Click "+ New Entry" above to add your first ${panelName.toLowerCase().replace(/s$/, '')}!`
  };
}

function initPeViewState(panelId) {
  state.panelViewsState = state.panelViewsState || {};
  if (!state.panelViewsState[panelId]) {
    state.panelViewsState[panelId] = {
      layout: 'card',
      sortField: 'created_at',
      sortAsc: false,
      filterField: '',
      filterVal: ''
    };
  }
  return state.panelViewsState[panelId];
}

function setPeLayout(panelId, layout) {
  const viewState = initPeViewState(panelId);
  viewState.layout = layout;
  render();
}

function togglePeSortDir(panelId) {
  const viewState = initPeViewState(panelId);
  viewState.sortAsc = !viewState.sortAsc;
  render();
}

function updatePeFilterField(panelId, val) {
  const viewState = initPeViewState(panelId);
  viewState.filterField = val;
  render();
}

function updatePeFilterVal(panelId, val) {
  const viewState = initPeViewState(panelId);
  viewState.filterVal = val;
  render();
}

function updatePeSortField(panelId, val) {
  const viewState = initPeViewState(panelId);
  viewState.sortField = val;
  render();
}

function clearPeFilters(panelId) {
  const viewState = initPeViewState(panelId);
  viewState.filterField = '';
  viewState.filterVal = '';
  render();
}

// ─── Dynamic Form Helpers (URL Title, Tags, and People) ───
async function getUrlTitle(url) {
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.title) {
        return json.data.title;
      }
    }
  } catch (e) {
    console.error("Failed to fetch title via Microlink:", e);
  }
  // Fallback parser
  try {
    const u = new URL(url);
    let name = u.hostname.replace('www.', '');
    const pathParts = u.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      const cleanPart = lastPart.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return `${cleanPart} (${name})`;
    }
    return name;
  } catch (e) {
    return url;
  }
}

function renderPeSelectedTags(key) {
  const wrap = document.getElementById(`pe-tags-wrap-${key}`);
  if (!wrap) return;
  const input = document.getElementById(`pe-input-${key}`);
  
  wrap.querySelectorAll('.msi-tag').forEach(el => el.remove());
  
  const selected = state.editingEntryValues[key] || [];
  selected.forEach(t => {
    const pill = document.createElement('span');
    pill.className = 'msi-tag';
    pill.innerHTML = `${escHtml(t)} <span class="msi-remove" onclick="removePeTag('${key}', '${t}')"><i class="fas fa-times"></i></span>`;
    wrap.insertBefore(pill, input);
  });
}

function removePeTag(key, tag) {
  state.editingEntryValues[key] = (state.editingEntryValues[key] || []).filter(x => x !== tag);
  renderPeSelectedTags(key);
}

function handlePeTagKey(e, key) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = e.target.value.trim();
    if (val) {
      if (!state.editingEntryValues[key]) state.editingEntryValues[key] = [];
      if (!state.editingEntryValues[key].includes(val)) {
        state.editingEntryValues[key].push(val);
        e.target.value = '';
        renderPeSelectedTags(key);
      }
    }
    document.getElementById(`pe-dropdown-${key}`).classList.remove('open');
  } else if (e.key === 'Backspace' && !e.target.value && state.editingEntryValues[key]?.length) {
    state.editingEntryValues[key].pop();
    renderPeSelectedTags(key);
  }
}

function showPeTagSuggestions(val, key) {
  const dd = document.getElementById(`pe-dropdown-${key}`);
  if (!dd) return;
  if (!val.trim()) {
    dd.classList.remove('open');
    return;
  }
  
  const selected = state.editingEntryValues[key] || [];
  const matches = state.tags.filter(t => t.name.toLowerCase().includes(val.toLowerCase()) && !selected.includes(t.name));
  
  if (!matches.length) {
    dd.classList.remove('open');
    return;
  }
  
  dd.innerHTML = matches.map(t => `<div class="msi-option" onclick="selectPeTag('${key}', '${t.name}')">${t.name}</div>`).join('');
  dd.classList.add('open');
}

function selectPeTag(key, name) {
  if (!state.editingEntryValues[key]) state.editingEntryValues[key] = [];
  if (!state.editingEntryValues[key].includes(name)) {
    state.editingEntryValues[key].push(name);
  }
  document.getElementById(`pe-input-${key}`).value = '';
  document.getElementById(`pe-dropdown-${key}`).classList.remove('open');
  renderPeSelectedTags(key);
}

function togglePePeopleLink(input, key, id) {
  if (!state.editingEntryValues[key]) state.editingEntryValues[key] = [];
  if (input.checked) {
    if (!state.editingEntryValues[key].includes(id)) {
      state.editingEntryValues[key].push(id);
    }
  } else {
    state.editingEntryValues[key] = state.editingEntryValues[key].filter(x => x !== id);
  }
  input.closest('.checkbox-item').classList.toggle('checked', input.checked);
}

// ─── Custom Panel Fields Builder ───
let draggedFieldKey = null;
let fieldToDeleteKey = null;

function renderFieldsList() {
  const list = document.getElementById('panelFieldsList');
  if (!list) return;
  if (!state.editingPanelFields || state.editingPanelFields.length === 0) {
    list.innerHTML = `<div style="padding: 12px; font-size: 12px; color: var(--ink-faint); text-align: center;">No fields added yet. Add one below or use a preset!</div>`;
    return;
  }
  
  list.innerHTML = state.editingPanelFields.map(f => {
    const reqBadge = f.is_required ? `<span class="fi-required">Required</span>` : '';
    const optsText = f.field_type === 'select' && f.options ? ` (${f.options.join(', ')})` : '';
    return `
      <div class="field-item" 
           draggable="true" 
           ondragstart="handleFieldDragStart(event, '${f.field_key}')" 
           ondragover="handleFieldDragOver(event)" 
           ondragleave="handleFieldDragLeave(event)" 
           ondrop="handleFieldDrop(event, '${f.field_key}')" 
           ondragend="handleFieldDragEnd(event)">
        <span style="color: var(--ink-faint); margin-right: 4px; cursor: grab;"><i class="fas fa-grip-vertical"></i></span>
        <span class="fi-label">${escHtml(f.field_label)}${optsText}</span>
        <span class="fi-type">${f.field_type}</span>
        ${reqBadge}
        <button type="button" class="fi-delete-btn" onclick="deleteFieldItem('${f.field_key}')" title="Delete Field">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  }).join('');
}

function toggleSelectOptionsView() {
  const type = document.getElementById('newFieldType').value;
  document.getElementById('selectOptionsGroup').classList.toggle('hidden', type !== 'select');
}

function addNewField() {
  const labelInput = document.getElementById('newFieldLabel');
  const label = labelInput.value.trim();
  if (!label) {
    toast('Field label is required', 'error');
    return;
  }
  
  const type = document.getElementById('newFieldType').value;
  const is_required = document.getElementById('newFieldRequired').checked;
  
  const rawKey = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!rawKey) {
    toast('Invalid field label', 'error');
    return;
  }
  
  let field_key = rawKey;
  let counter = 1;
  while (state.editingPanelFields.find(f => f.field_key === field_key)) {
    field_key = `${rawKey}_${counter++}`;
  }
  
  let options = null;
  if (type === 'select') {
    const optsStr = document.getElementById('newFieldOptions').value.trim();
    if (!optsStr) {
      toast('Select options are required', 'error');
      return;
    }
    options = optsStr.split(',').map(o => o.trim()).filter(Boolean);
    if (options.length === 0) {
      toast('Select options are required', 'error');
      return;
    }
  }
  
  const newField = {
    id: uuid(),
    field_key,
    field_label: label,
    field_type: type,
    field_order: state.editingPanelFields.length,
    is_required,
    options
  };
  
  state.editingPanelFields.push(newField);
  renderFieldsList();
  
  // Reset inputs
  labelInput.value = '';
  document.getElementById('newFieldOptions').value = '';
  document.getElementById('newFieldRequired').checked = false;
  toggleSelectOptionsView();
  
  toast('Field added', 'success');
  labelInput.focus();
}

function handleFieldDragStart(e, key) {
  draggedFieldKey = key;
  e.dataTransfer.effectAllowed = 'move';
  e.target.classList.add('dragging');
  e.dataTransfer.setData('text/plain', key);
}

function handleFieldDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const item = e.target.closest('.field-item');
  if (item) {
    item.classList.add('drag-over');
  }
}

function handleFieldDragLeave(e) {
  const item = e.target.closest('.field-item');
  if (item) {
    item.classList.remove('drag-over');
  }
}

function handleFieldDrop(e, targetKey) {
  e.preventDefault();
  e.stopPropagation();
  
  const item = e.target.closest('.field-item');
  if (item) {
    item.classList.remove('drag-over');
  }

  if (!draggedFieldKey || draggedFieldKey === targetKey) return;

  const draggedIndex = state.editingPanelFields.findIndex(f => f.field_key === draggedFieldKey);
  const targetIndex = state.editingPanelFields.findIndex(f => f.field_key === targetKey);

  if (draggedIndex < 0 || targetIndex < 0) return;

  const [removed] = state.editingPanelFields.splice(draggedIndex, 1);
  state.editingPanelFields.splice(targetIndex, 0, removed);

  state.editingPanelFields.forEach((f, idx) => {
    f.field_order = idx;
  });

  renderFieldsList();
}

function handleFieldDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.field-item').forEach(el => el.classList.remove('drag-over'));
  draggedFieldKey = null;
}

function deleteFieldItem(key) {
  const field = state.editingPanelFields.find(f => f.field_key === key);
  if (!field) return;
  
  const panelId = state.editingPanelId;
  let inUse = false;
  
  if (panelId) {
    const entries = state.panel_entries.filter(e => e.panel_id === panelId);
    inUse = entries.some(e => {
      const val = e.data[key];
      return val !== undefined && val !== null && val !== '' && (!Array.isArray(val) || val.length > 0);
    });
  }
  
  if (inUse) {
    fieldToDeleteKey = key;
    document.getElementById('panelModal').classList.add('hidden');
    document.getElementById('deleteFieldLabel').textContent = field.field_label;
    document.getElementById('hardDeleteFieldCheck').checked = false;
    document.getElementById('fieldDeleteConfirmModal').classList.remove('hidden');
  } else {
    state.editingPanelFields = state.editingPanelFields.filter(f => f.field_key !== key);
    state.editingPanelFields.forEach((f, idx) => f.field_order = idx);
    renderFieldsList();
  }
}

async function executeDeleteField() {
  const key = fieldToDeleteKey;
  if (!key) return;
  
  const hardDelete = document.getElementById('hardDeleteFieldCheck').checked;
  const panelId = state.editingPanelId;
  
  try {
    if (hardDelete && panelId) {
      showBanner('Pruning field data from entries...');
      const entriesToUpdate = state.panel_entries.filter(e => e.panel_id === panelId && e.data[key] !== undefined);
      
      for (const entry of entriesToUpdate) {
        const newData = Object.assign({}, entry.data);
        delete newData[key];
        
        const { error } = await sb.from('panel_entries').update({ data: newData }).eq('id', entry.id);
        if (error) throw error;
        
        entry.data = newData;
      }
      toast('Cleared field data from entries', 'success');
    }
    
    state.editingPanelFields = state.editingPanelFields.filter(f => f.field_key !== key);
    state.editingPanelFields.forEach((f, idx) => f.field_order = idx);
    
    document.getElementById('fieldDeleteConfirmModal').classList.add('hidden');
    document.getElementById('panelModal').classList.remove('hidden');
    
    renderFieldsList();
    toast('Field deleted', 'info');
  } catch (err) {
    console.error('Failed to execute field delete:', err);
    toast('Failed to delete field: ' + err.message, 'error');
  } finally {
    fieldToDeleteKey = null;
  }
}

function renderNavPanels() {
  const primaryContainer = document.getElementById('tn-primary-panels');
  const secondaryContainer = document.getElementById('tn-secondary-panels');
  if (!primaryContainer || !secondaryContainer) return;
  
  if (!state.panels || state.panels.length === 0) {
    primaryContainer.innerHTML = '';
    secondaryContainer.innerHTML = `<div style="padding: 4px 16px; font-size: 11px; color: var(--ink-faint);">No panels defined</div>`;
    return;
  }
  
  const counts = {};
  state.panel_entries.forEach(e => {
    counts[e.panel_id] = (counts[e.panel_id] || 0) + 1;
  });

  const notesPanel = state.panels.find(p => p.name === 'Notes' || p.name === 'Ideas');
  const otherPanels = state.panels.filter(p => p.name !== 'Notes' && p.name !== 'Ideas');

  if (notesPanel) {
    const isActive = state.currentView === `panel-${notesPanel.id}`;
    const entryCount = counts[notesPanel.id] || 0;
    primaryContainer.innerHTML = `
      <a href="#" class="tn-link ${isActive ? 'active' : ''}" data-view="panel-${notesPanel.id}" onclick="switchView('panel-${notesPanel.id}'); return false;">
        Ideas <span class="count">${entryCount}</span>
      </a>
    `;
  } else {
    primaryContainer.innerHTML = '';
  }

  if (otherPanels.length > 0) {
    secondaryContainer.innerHTML = `
      <div class="tn-menu-section" style="display:flex; justify-content:space-between; align-items:center;">
        <span>Panels</span>
        <button onclick="event.stopPropagation(); openPanelModal(event);" title="Add New Panel" style="background:none; border:none; cursor:pointer; color:var(--ink-secondary); padding:2px 6px; font-size:12px;">
          <i class="fas fa-plus"></i>
        </button>
      </div>
      ` + otherPanels.map(p => {
      const isActive = state.currentView === `panel-${p.id}`;
      const entryCount = counts[p.id] || 0;
      
      return `
        <div class="tn-menu-item ${isActive ? 'active' : ''}" 
             draggable="true"
             ondragstart="handlePanelDragStart(event, '${p.id}')"
             ondragover="handlePanelDragOver(event)"
             ondragleave="handlePanelDragLeave(event)"
             ondrop="handlePanelDrop(event, '${p.id}')"
             ondragend="handlePanelDragEnd(event)"
             onclick="switchView('panel-${p.id}')"
             style="cursor: pointer; position: relative;">
          <i class="fas ${p.icon || 'fa-file-alt'}" style="color: ${p.color || 'var(--ink-secondary)'}"></i>
          ${escHtml(p.name)}
          <span class="count" style="margin-left: auto;">${entryCount}</span>
          <button onclick="openPanelModal(event, '${p.id}')" title="Edit Panel" style="background:none; border:none; color:var(--ink-faint); padding:0 4px; margin-left:4px;">
            <i class="fas fa-cog"></i>
          </button>
        </div>
      `;
    }).join('');
  } else {
    secondaryContainer.innerHTML = `
      <div class="tn-menu-section" style="display:flex; justify-content:space-between; align-items:center;">
        <span>Panels</span>
        <button onclick="event.stopPropagation(); openPanelModal(event);" title="Add New Panel" style="background:none; border:none; cursor:pointer; color:var(--ink-secondary); padding:2px 6px; font-size:12px;">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    `;
  }
}

function handlePanelDragStart(e, id) {
  draggedPanelId = id;
  e.dataTransfer.effectAllowed = 'move';
  e.target.classList.add('dragging');
  e.dataTransfer.setData('text/plain', id);
}

function handlePanelDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const item = e.target.closest('.tn-menu-item');
  if (item && item.getAttribute('data-view') !== `panel-${draggedPanelId}`) {
    item.classList.add('drag-over');
  }
}

function handlePanelDragLeave(e) {
  const item = e.target.closest('.tn-menu-item');
  if (item) {
    item.classList.remove('drag-over');
  }
}

async function handlePanelDrop(e, targetId) {
  e.preventDefault();
  const item = e.target.closest('.tn-menu-item');
  if (item) {
    item.classList.remove('drag-over');
  }
  
  if (!draggedPanelId || draggedPanelId === targetId) return;

  const draggedIndex = state.panels.findIndex(p => p.id === draggedPanelId);
  const targetIndex = state.panels.findIndex(p => p.id === targetId);

  if (draggedIndex < 0 || targetIndex < 0) return;

  const [removed] = state.panels.splice(draggedIndex, 1);
  state.panels.splice(targetIndex, 0, removed);

  state.panels.forEach((p, idx) => {
    p.sort_order = idx;
  });

  render();

  try {
    const updates = state.panels.map(p => ({
      id: p.id,
      user_id: p.user_id,
      name: p.name,
      icon: p.icon,
      color: p.color,
      sort_order: p.sort_order
    }));
    const { error } = await sb.from('panels').upsert(updates);
    if (error) throw error;
    toast('Panels reordered', 'success');
  } catch (err) {
    console.error('Failed to save panel order:', err);
    toast('Failed to save panel order', 'error');
  }
}

function handlePanelDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.tn-menu-item').forEach(el => el.classList.remove('drag-over'));
  draggedPanelId = null;
}

function switchPanelTab(tab) {
  document.getElementById('panelTabGeneral').classList.toggle('active', tab === 'general');
  document.getElementById('panelTabFields').classList.toggle('active', tab === 'fields');
  document.getElementById('panelPanelGeneral').classList.toggle('active', tab === 'general');
  document.getElementById('panelPanelFields').classList.toggle('active', tab === 'fields');
}

function applyPanelTemplate(type) {
  const nameInput = document.getElementById('panelName');
  const iconInput = document.getElementById('panelIconValue');
  const colorInput = document.getElementById('panelColorValue');
  
  let name = '';
  let icon = '';
  let color = '';
  let fields = [];

  if (type === 'idea') {
    name = 'Idea Bank';
    icon = 'fa-lightbulb';
    color = '#dd5b00';
    fields = [
      { id: uuid(), field_key: 'title', field_label: 'Title', field_type: 'text', field_order: 0, is_required: true, options: null },
      { id: uuid(), field_key: 'description', field_label: 'Description', field_type: 'textarea', field_order: 1, is_required: false, options: null },
      { id: uuid(), field_key: 'impact', field_label: 'Impact', field_type: 'select', field_order: 2, is_required: false, options: ['High', 'Medium', 'Low'] },
      { id: uuid(), field_key: 'tags', field_label: 'Tags', field_type: 'tags', field_order: 3, is_required: false, options: null }
    ];
  } else if (type === 'task') {
    name = 'Task Tracker';
    icon = 'fa-tasks';
    color = '#62aef0';
    fields = [
      { id: uuid(), field_key: 'title', field_label: 'Title', field_type: 'text', field_order: 0, is_required: true, options: null },
      { id: uuid(), field_key: 'description', field_label: 'Description', field_type: 'textarea', field_order: 1, is_required: false, options: null },
      { id: uuid(), field_key: 'status', field_label: 'Status', field_type: 'select', field_order: 2, is_required: true, options: ['To Do', 'In Progress', 'Done'] },
      { id: uuid(), field_key: 'due_date', field_label: 'Due Date', field_type: 'date', field_order: 3, is_required: false, options: null },
      { id: uuid(), field_key: 'assignee', field_label: 'Assignee', field_type: 'people_link', field_order: 4, is_required: false, options: null }
    ];
  } else if (type === 'media') {
    name = 'Reading List';
    icon = 'fa-book';
    color = '#d6b6f6';
    fields = [
      { id: uuid(), field_key: 'title', field_label: 'Title', field_type: 'text', field_order: 0, is_required: true, options: null },
      { id: uuid(), field_key: 'format', field_label: 'Format', field_type: 'select', field_order: 1, is_required: true, options: ['Book', 'Article', 'Video', 'Podcast'] },
      { id: uuid(), field_key: 'link', field_label: 'Link', field_type: 'url', field_order: 2, is_required: false, options: null },
      { id: uuid(), field_key: 'thoughts', field_label: 'Thoughts', field_type: 'textarea', field_order: 3, is_required: false, options: null },
      { id: uuid(), field_key: 'rating', field_label: 'Rating', field_type: 'select', field_order: 4, is_required: false, options: ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'] }
    ];
  }

  nameInput.value = name;
  iconInput.value = icon;
  colorInput.value = color;

  renderIconPicker();
  renderColorPicker();

  state.editingPanelFields = fields;
  renderFieldsList();
  
  toast(`Applied ${name} template`, 'success');
  switchPanelTab('fields');
}

function openPanelModal(e, editId = null) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  const modal = document.getElementById('panelModal');
  const overlay = document.getElementById('modalOverlay');
  const deleteBtn = document.getElementById('deletePanelBtn');
  
  state.editingPanelId = editId;
  
  overlay.classList.add('open');
  modal.classList.remove('hidden');
  
  switchPanelTab('general');
  
  const nameInput = document.getElementById('panelName');
  const iconInput = document.getElementById('panelIconValue');
  const colorInput = document.getElementById('panelColorValue');
  
  document.getElementById('panelTemplateGroup').classList.toggle('hidden', editId !== null);
  
  if (editId) {
    const p = state.panels.find(x => x.id === editId);
    if (p) {
      document.getElementById('panelModalTitle').textContent = 'Edit Panel';
      nameInput.value = p.name;
      iconInput.value = p.icon || 'fa-file-alt';
      colorInput.value = p.color || '#62aef0';
      deleteBtn.classList.remove('hidden');
      
      // Load and clone panel fields
      state.editingPanelFields = JSON.parse(JSON.stringify(
        state.panel_fields.filter(f => f.panel_id === editId).sort((a, b) => a.field_order - b.field_order)
      ));
    }
  } else {
    document.getElementById('panelModalTitle').textContent = 'New Panel';
    nameInput.value = '';
    iconInput.value = 'fa-file-alt';
    colorInput.value = '#62aef0';
    deleteBtn.classList.add('hidden');
    
    state.editingPanelFields = [];
  }
  
  // Reset field builder inputs
  document.getElementById('newFieldLabel').value = '';
  document.getElementById('newFieldType').value = 'text';
  document.getElementById('newFieldOptions').value = '';
  document.getElementById('newFieldRequired').checked = false;
  toggleSelectOptionsView();
  
  renderIconPicker();
  renderColorPicker();
  renderFieldsList();
  
  setTimeout(() => nameInput.focus(), 100);
}

function renderIconPicker() {
  const container = document.getElementById('panelIconPicker');
  const currentVal = document.getElementById('panelIconValue').value;
  container.innerHTML = PICKER_ICONS.map(icon => {
    const isSelected = icon === currentVal;
    return `
      <div class="icon-picker-item ${isSelected ? 'selected' : ''}" 
           onclick="selectPanelIcon('${icon}')" 
           title="${icon.replace('fa-', '')}">
        <i class="fas ${icon}"></i>
      </div>
    `;
  }).join('');
}

function selectPanelIcon(icon) {
  document.getElementById('panelIconValue').value = icon;
  renderIconPicker();
}

function renderColorPicker() {
  const container = document.getElementById('panelColorPicker');
  const currentVal = document.getElementById('panelColorValue').value;
  container.innerHTML = PICKER_COLORS.map(color => {
    const isSelected = color === currentVal;
    return `
      <div class="color-picker-item ${isSelected ? 'selected' : ''}" 
           onclick="selectPanelColor('${color}')" 
           style="background: ${color};"
           title="${color}">
      </div>
    `;
  }).join('');
}

function selectPanelColor(color) {
  document.getElementById('panelColorValue').value = color;
  renderColorPicker();
}

async function savePanel() {
  const name = document.getElementById('panelName').value.trim();
  if (!name) {
    toast('Panel name is required', 'error');
    return;
  }
  
  const icon = document.getElementById('panelIconValue').value;
  const color = document.getElementById('panelColorValue').value;
  const id = state.editingPanelId || uuid();
  
  let sort_order = 0;
  if (!state.editingPanelId) {
    sort_order = state.panels.length > 0 ? Math.max(...state.panels.map(p => p.sort_order || 0)) + 1 : 0;
  } else {
    const existing = state.panels.find(p => p.id === id);
    if (existing) sort_order = existing.sort_order;
  }
  
  const panel = {
    id,
    user_id: currentUser.id,
    name,
    icon,
    color,
    sort_order
  };
  
  try {
    showBanner('Saving panel...');
    const result = await sbUpsert('panels', panel);
    
    // Save panel fields
    const originalFields = state.panel_fields.filter(f => f.panel_id === id);
    const deletedFields = originalFields.filter(of => !state.editingPanelFields.some(ef => ef.id === of.id));

    if (deletedFields.length > 0) {
      const deletedIds = deletedFields.map(f => f.id);
      const { error } = await sb.from('panel_fields').delete().in('id', deletedIds);
      if (error) throw error;
    }

    if (state.editingPanelFields.length > 0) {
      const fieldsToUpsert = state.editingPanelFields.map(f => ({
        id: f.id,
        panel_id: id,
        field_key: f.field_key,
        field_label: f.field_label,
        field_type: f.field_type,
        field_order: f.field_order,
        is_required: f.is_required,
        options: f.options
      }));
      const { error } = await sb.from('panel_fields').upsert(fieldsToUpsert);
      if (error) throw error;
    }

    // Update local state fields
    state.panel_fields = state.panel_fields.filter(f => f.panel_id !== id || state.editingPanelFields.some(ef => ef.id === f.id));
    state.editingPanelFields.forEach(ef => {
      const idx = state.panel_fields.findIndex(f => f.id === ef.id);
      const fieldWithPanelId = Object.assign({ panel_id: id }, ef);
      if (idx >= 0) {
        state.panel_fields[idx] = fieldWithPanelId;
      } else {
        state.panel_fields.push(fieldWithPanelId);
      }
    });

    if (state.editingPanelId) {
      const idx = state.panels.findIndex(p => p.id === id);
      if (idx >= 0) state.panels[idx] = result || panel;
      toast('Panel updated', 'success');
    } else {
      state.panels.push(result || panel);
      toast('Panel created', 'success');
    }
    
    state.panels.sort((a,b) => a.sort_order - b.sort_order);
    
    closeModal();
    render();
  } catch (err) {
    console.error('Failed to save panel:', err);
    toast('Failed to save panel: ' + err.message, 'error');
  }
}

function confirmDeletePanel() {
  const editId = state.editingPanelId;
  if (!editId) return;
  
  const p = state.panels.find(x => x.id === editId);
  if (!p) return;
  
  document.getElementById('panelModal').classList.add('hidden');
  document.getElementById('deletePanelName').textContent = p.name;
  document.getElementById('panelDeleteConfirmModal').classList.remove('hidden');
}

async function executeDeletePanel() {
  const id = state.editingPanelId;
  if (!id) return;
  
  try {
    showBanner('Deleting panel...');
    await sbDelete('panels', id);
    
    state.panels = state.panels.filter(p => p.id !== id);
    state.panel_fields = state.panel_fields.filter(f => f.panel_id !== id);
    state.panel_entries = state.panel_entries.filter(e => e.panel_id !== id);
    
    if (state.currentView === `panel-${id}`) {
      state.currentView = 'all';
      state.currentDetail = null;
    }
    
    closeModal();
    toast('Panel deleted', 'info');
    render();
  } catch (err) {
    console.error('Failed to delete panel:', err);
    toast('Failed to delete panel: ' + err.message, 'error');
  }
}

function renderPanelEntries(panelId) {
  const panel = state.panels.find(p => p.id === panelId);
  if (!panel) return '<p>Panel not found.</p>';
  
  let entries = state.panel_entries.filter(e => e.panel_id === panelId);
  const fields = state.panel_fields.filter(f => f.panel_id === panelId).sort((a, b) => a.field_order - b.field_order);
  
  if (panel.name === 'Notes' || panel.name === 'Ideas') {
    const mappedNotes = state.notes.map(n => ({
      id: n.id,
      panel_id: panelId,
      created_at: n.created_at,
      updated_at: n.updated_at,
      data: {
        title: n.title,
        description: n.description,
        tags: n.tags,
        people: n.related_people,
        links: n.source
      }
    }));
    
    const entryMap = new Map();
    entries.forEach(e => entryMap.set(e.id, e));
    mappedNotes.forEach(mn => entryMap.set(mn.id, mn));
    entries = Array.from(entryMap.values());
  }

  if (fields.length === 0) {
    return `
      <div class="empty-state">
        <div class="es-icon" style="color: ${panel.color || 'var(--ink-secondary)'}">
          <i class="fas ${panel.icon || 'fa-file-alt'}"></i>
        </div>
        <div class="es-title">${escHtml(panel.name)}</div>
        <div class="es-desc">This panel has no fields defined yet. Open the panel settings gear to define fields.</div>
      </div>
    `;
  }
  
  const totalCount = entries.length;
  if (totalCount === 0) {
    const copy = getPanelEmptyStateCopy(panel.name);
    return `
      <div class="empty-state">
        <div class="es-icon" style="color: ${panel.color || 'var(--ink-secondary)'}">
          <i class="fas ${panel.icon || 'fa-file-alt'}"></i>
        </div>
        <div class="es-title">${escHtml(copy.title)}</div>
        <div class="es-desc">${escHtml(copy.desc)}</div>
        <button onclick="openPanelEntryModal(null, '${panelId}')" class="btn-primary" style="margin-top:12px; background: ${panel.color || 'var(--primary)'}"><i class="fas fa-plus"></i> Add First Entry</button>
      </div>
    `;
  }

  const viewState = initPeViewState(panelId);
  
  // 1. Apply Filtering
  if (viewState.filterField && viewState.filterVal.trim()) {
    const fField = viewState.filterField;
    const fVal = viewState.filterVal.toLowerCase().trim();
    entries = entries.filter(e => {
      const val = e.data[fField];
      if (val === undefined || val === null) return false;
      if (Array.isArray(val)) {
        return val.some(item => {
          if (fField === 'people' || fField.includes('people') || fField.includes('person')) {
            const name = entityName('people', item);
            return name.toLowerCase().includes(fVal);
          }
          return String(item).toLowerCase().includes(fVal);
        });
      }
      return String(val).toLowerCase().includes(fVal);
    });
  }

  // 2. Apply Sorting
  entries.sort((a, b) => {
    let valA, valB;
    const sField = viewState.sortField;
    if (sField === 'created_at' || sField === 'updated_at') {
      valA = a[sField] ? new Date(a[sField]) : 0;
      valB = b[sField] ? new Date(b[sField]) : 0;
    } else {
      valA = a.data[sField];
      valB = b.data[sField];
    }
    
    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';
    
    if (Array.isArray(valA)) valA = valA.length;
    if (Array.isArray(valB)) valB = valB.length;
    
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    
    if (valA < valB) return viewState.sortAsc ? -1 : 1;
    if (valA > valB) return viewState.sortAsc ? 1 : -1;
    return 0;
  });

  // 3. Render Controls Bar
  const controlsBar = `
    <div class="panel-controls-bar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding:12px 16px; background:var(--surface); border:1px solid var(--hairline); border-radius:var(--radius-md); gap:12px; flex-wrap:wrap;">
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span style="font-size:13px; color:var(--ink-secondary); font-weight:500;">Filter:</span>
        <select onchange="updatePeFilterField('${panelId}', this.value)" style="padding:6px 10px; border:1px solid var(--hairline); border-radius:var(--radius-md); font-size:13px; background:var(--canvas); color:var(--ink);">
          <option value="">-- All Fields --</option>
          ${fields.map(f => `<option value="${f.field_key}" ${viewState.filterField === f.field_key ? 'selected' : ''}>${escHtml(f.field_label)}</option>`).join('')}
        </select>
        <input type="text" id="pe-filter-value-${panelId}" oninput="updatePeFilterVal('${panelId}', this.value)" placeholder="Filter value..." value="${escHtml(viewState.filterVal)}" style="padding:6px 10px; border:1px solid var(--hairline); border-radius:var(--radius-md); font-size:13px; background:var(--canvas); color:var(--ink); max-width:150px;">
      </div>
      
      <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:13px; color:var(--ink-secondary); font-weight:500;">Sort:</span>
          <select onchange="updatePeSortField('${panelId}', this.value)" style="padding:6px 10px; border:1px solid var(--hairline); border-radius:var(--radius-md); font-size:13px; background:var(--canvas); color:var(--ink);">
            <option value="created_at" ${viewState.sortField === 'created_at' ? 'selected' : ''}>Date Created</option>
            <option value="updated_at" ${viewState.sortField === 'updated_at' ? 'selected' : ''}>Date Modified</option>
            ${fields.map(f => `<option value="${f.field_key}" ${viewState.sortField === f.field_key ? 'selected' : ''}>${escHtml(f.field_label)}</option>`).join('')}
          </select>
          <button onclick="togglePeSortDir('${panelId}')" style="padding:6px 10px; border:1px solid var(--hairline); border-radius:var(--radius-md); background:var(--canvas); color:var(--ink); cursor:pointer;"><i class="fas ${viewState.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down'}"></i></button>
        </div>
        
        <div class="view-toggle-group" style="display:flex; border:1px solid var(--hairline); border-radius:var(--radius-md); overflow:hidden;">
          <button onclick="setPeLayout('${panelId}', 'card')" class="layout-toggle-btn ${viewState.layout === 'card' ? 'active' : ''}" style="border:none; cursor:pointer;" title="Card View"><i class="fas fa-th-large"></i></button>
          <button onclick="setPeLayout('${panelId}', 'list')" class="layout-toggle-btn ${viewState.layout === 'list' ? 'active' : ''}" style="border:none; cursor:pointer;" title="List View"><i class="fas fa-list"></i></button>
        </div>
      </div>
    </div>
  `;

  // 4. Render Empty Results State if no filters match
  if (entries.length === 0) {
    return controlsBar + `
      <div class="empty-state">
        <div class="es-icon"><i class="fas fa-search"></i></div>
        <div class="es-title">No matching entries found</div>
        <div class="es-desc">Try clearing your filters or adjusting your search term.</div>
        <button onclick="clearPeFilters('${panelId}')" class="btn-secondary" style="margin-top:12px;"><i class="fas fa-times"></i> Clear Filters</button>
      </div>
    `;
  }

  // 5. Render Grid vs List View
  let contentHtml = '';
  if (viewState.layout === 'list') {
    contentHtml = `
      <div class="panel-list-view">
        ${entries.map(e => {
          const title = e.data.title || 'Untitled';
          const desc = e.data.description || '';
          const tags = Array.isArray(e.data.tags) ? e.data.tags : [];
          const tagsHtml = tags.map(t => `<span class="tag-badge">${escHtml(t)}</span>`).join('');
          
          const peopleList = Array.isArray(e.data.people) ? e.data.people : [];
          const peopleHtml = peopleList.map(pId => {
            const name = entityName('people', pId);
            return name ? `<span class="cat-badge" style="background:${ENTITY_COLORS.people}22;color:${ENTITY_COLORS.people}">${escHtml(name)}</span>` : '';
          }).join('');
          
          return `
            <div class="panel-list-row" onclick="showPanelEntryDetail('${e.id}', '${panelId}')" style="border-left: 4px solid ${panel.color || 'var(--primary)'};">
              <div class="panel-list-left">
                <div style="font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">
                  ${escHtml(title)}
                </div>
                <div style="font-size: 13px; color: var(--ink-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escHtml(desc)}
                </div>
              </div>
              <div class="panel-list-right">
                ${peopleHtml}${tagsHtml}
                <span style="font-size: 11px; color: var(--ink-faint); margin-left: 8px;">
                  ${fmtDateShort(e.created_at || e.updated_at)}
                </span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    // Card View
    contentHtml = `
      <div class="notes-grid">
        ${entries.map(e => {
          const title = e.data.title || 'Untitled';
          const desc = e.data.description || '';
          const tags = Array.isArray(e.data.tags) ? e.data.tags : [];
          const tagsHtml = tags.map(t => `<span class="tag-badge">${escHtml(t)}</span>`).join('');
          
          const peopleList = Array.isArray(e.data.people) ? e.data.people : [];
          const peopleHtml = peopleList.map(pId => {
            const name = entityName('people', pId);
            return name ? `<span class="cat-badge" style="background:${ENTITY_COLORS.people}22;color:${ENTITY_COLORS.people}">${escHtml(name)}</span>` : '';
          }).join('');
          
          return `
            <div class="note-card" onclick="showPanelEntryDetail('${e.id}', '${panelId}')" style="border-left: 4px solid ${panel.color || 'var(--primary)'};">
              <div class="nc-title">${escHtml(title)}</div>
              <div class="nc-desc">${escHtml(desc)}</div>
              <div class="nc-badges">${peopleHtml}${tagsHtml}</div>
              <div class="nc-meta"><span>${fmtDateShort(e.created_at || e.updated_at)}</span></div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return controlsBar + contentHtml;
}

function renderGlobalSearchResults() {
  const q = state.searchQuery.toLowerCase().trim();
  
  const matchedNotes = state.notes.filter(n => {
    if (n.status === 'deleted') return false;
    const haystack = [
      n.title, n.description, n.source,
      ...(n.categories || []), ...(n.tags || []),
      ...(n.related_people || []).map(id => entityName('people', id)),
      ...(n.related_companies || []).map(id => entityName('companies', id)),
      ...(n.related_technologies || []).map(id => entityName('technologies', id)),
      ...(n.related_projects || []).map(id => entityName('projects', id))
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });

  const matchedEntries = state.panel_entries.filter(e => {
    const values = Object.values(e.data);
    const haystack = values.map(val => {
      if (Array.isArray(val)) {
        return val.map(item => {
          const name = entityName('people', item) || entityName('companies', item) || entityName('technologies', item) || entityName('projects', item);
          return name ? `${item} ${name}` : String(item);
        }).join(' ');
      }
      return String(val);
    }).join(' ').toLowerCase();
    return haystack.includes(q);
  });

  const results = [];
  
  matchedNotes.forEach(n => {
    const defaultNotesPanel = state.panels.find(p => p.name === 'Notes' || p.name === 'Ideas');
    results.push({
      id: n.id,
      type: 'note',
      panelName: 'Ideas',
      panelColor: defaultNotesPanel?.color || '#4F46E5',
      panelIcon: defaultNotesPanel?.icon || 'fa-file-alt',
      title: n.title || 'Untitled Idea',
      desc: n.description || '',
      created_at: n.created_at,
      updated_at: n.updated_at
    });
  });

  matchedEntries.forEach(e => {
    const panel = state.panels.find(p => p.id === e.panel_id);
    if (!panel) return;
    if (results.some(r => r.id === e.id)) return;
    
    results.push({
      id: e.id,
      type: 'panel_entry',
      panelName: panel.name,
      panelColor: panel.color || 'var(--primary)',
      panelIcon: panel.icon || 'fa-folder',
      title: e.data.title || 'Untitled Entry',
      desc: e.data.description || '',
      created_at: e.created_at,
      updated_at: e.updated_at
    });
  });

  results.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

  if (results.length === 0) {
    return `
      <div class="empty-state">
        <div class="es-icon"><i class="fas fa-search"></i></div>
        <div class="es-title">No search results match "${escHtml(state.searchQuery)}"</div>
        <div class="es-desc">Try searching for other terms or check for typos.</div>
      </div>
    `;
  }

  const cardsHtml = results.map(r => {
    const badge = `
      <span class="panel-badge" style="background:${r.panelColor}22; color:${r.panelColor}; font-size:11px; padding:3px 8px; border-radius:var(--radius-full); font-weight:600; display:inline-flex; align-items:center; gap:4px; margin-bottom:8px;">
        <i class="fas ${r.panelIcon}"></i> ${escHtml(r.panelName)}
      </span>
    `;
    
    const clickHandler = r.type === 'note' 
      ? `showNoteDetail('${r.id}')` 
      : `showPanelEntryDetail('${r.id}', '${state.panel_entries.find(e => e.id === r.id)?.panel_id}')`;

    return `
      <div class="note-card" onclick="${clickHandler}" style="border-left: 4px solid ${r.panelColor}; padding:16px; min-height: 120px; cursor:pointer;">
        ${badge}
        <div class="nc-title" style="font-size: 15px; font-weight: 600; color: var(--ink); margin-bottom: 6px;">${escHtml(r.title)}</div>
        <div class="nc-desc" style="font-size: 13px; color: var(--ink-secondary); line-height:1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 10px;">${escHtml(r.desc)}</div>
        <div class="nc-meta" style="font-size: 11px; color: var(--ink-faint);">${fmtDateShort(r.updated_at || r.created_at)}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="search-results-header" style="margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:14px; color:var(--ink-secondary); font-weight:500;">Found ${results.length} matches for "${escHtml(state.searchQuery)}"</span>
      <button onclick="clearGlobalSearch()" class="btn-secondary" style="padding:6px 12px; font-size:13px; cursor:pointer;"><i class="fas fa-times"></i> Clear Search</button>
    </div>
    <div class="notes-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
      ${cardsHtml}
    </div>
  `;
}

function clearGlobalSearch() {
  state.searchQuery = '';
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  render();
}

function getGreeting() {
  const hours = new Date().getHours();
  let greet = 'Good morning';
  if (hours >= 12 && hours < 17) greet = 'Good afternoon';
  else if (hours >= 17) greet = 'Good evening';
  
  let name = currentUser ? (currentUser.email.split('@')[0]) : 'User';
  if (state.userSettings && state.userSettings.call_name) {
    name = state.userSettings.call_name;
  }
  const capName = name.charAt(0).toUpperCase() + name.slice(1);
  return `${greet}, ${capName}! 👋`;
}

function fmtTimeAgo(date) {
  const diff = new Date() - new Date(date);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function toggleMinimalMode() {
  state.minimalMode = !state.minimalMode;
  localStorage.setItem('kv-minimal-mode', state.minimalMode ? 'true' : 'false');
  render();
}

function togglePinSelect(event) {
  event.stopPropagation();
  const selector = document.getElementById('pinSelector');
  if (!selector) return;
  
  if (!selector.classList.contains('hidden')) {
    selector.classList.add('hidden');
    return;
  }
  
  const rect = event.currentTarget.getBoundingClientRect();
  const mainRect = document.getElementById('main-content').getBoundingClientRect();
  
  selector.style.top = (rect.bottom - mainRect.top + 8) + 'px';
  selector.style.left = (rect.left - mainRect.left) + 'px';
  
  const pinnedIds = state.pinnedPanelIds || [];
  const unpinned = state.panels.filter(p => !pinnedIds.includes(p.id));
  
  if (unpinned.length === 0) {
    selector.innerHTML = `<div style="padding:8px; font-size:12px; color:var(--ink-faint); text-align:center;">All panels pinned</div>`;
  } else {
    selector.innerHTML = unpinned.map(p => `
      <div onclick="pinPanel('${p.id}')" style="padding:6px 10px; border-radius:var(--radius-sm); font-size:12px; color:var(--ink); cursor:pointer; display:flex; align-items:center; gap:8px;" onmouseover="this.style.background='var(--canvas-soft)'" onmouseout="this.style.background='none'">
        <i class="fas ${p.icon}" style="color:${p.color}"></i>
        <span>${escHtml(p.name)}</span>
      </div>
    `).join('');
  }
  
  selector.classList.remove('hidden');
}

function pinPanel(panelId) {
  if (!state.pinnedPanelIds) state.pinnedPanelIds = [];
  if (!state.pinnedPanelIds.includes(panelId)) {
    state.pinnedPanelIds.push(panelId);
    localStorage.setItem('kv-pinned-panels', JSON.stringify(state.pinnedPanelIds));
  }
  document.getElementById('pinSelector')?.classList.add('hidden');
  render();
}

function unpinPanel(event, panelId) {
  event.stopPropagation();
  state.pinnedPanelIds = (state.pinnedPanelIds || []).filter(id => id !== panelId);
  localStorage.setItem('kv-pinned-panels', JSON.stringify(state.pinnedPanelIds));
  render();
}

window.addEventListener('click', () => {
  document.getElementById('pinSelector')?.classList.add('hidden');
});

function renderPanelsColumns() {
  if (!state.panels || state.panels.length === 0) {
    return `<div class="empty-state"><div class="es-icon"><i class="fas fa-th-large"></i></div><div class="es-title">No panels found</div><div class="es-desc">Create your first panel using the "+" button under Panels in the sidebar.</div></div>`;
  }

  // ─── Compile Pinned Cards ───
  const pinnedCardsHtml = (state.pinnedPanelIds || []).map(pId => {
    const panel = state.panels.find(p => p.id === pId);
    if (!panel) return '';
    const entries = state.panel_entries.filter(e => e.panel_id === pId);
    let subtext = `${entries.length} entries`;
    
    let latestTime = null;
    entries.forEach(pe => {
      const t = new Date(pe.updated_at || pe.created_at);
      if (!latestTime || t > latestTime) latestTime = t;
    });
    
    if (panel.name === 'Notes' || panel.name === 'Ideas') {
      const activeNotes = state.notes.filter(n => n.status !== 'deleted' && !n.archived);
      subtext = `${activeNotes.length} ideas`;
      activeNotes.forEach(n => {
        const t = new Date(n.updated_at || n.created_at);
        if (!latestTime || t > latestTime) latestTime = t;
      });
    }
    
    if (latestTime) {
      subtext = `Updated ${fmtTimeAgo(latestTime)}`;
    }
    
    return `
      <div class="pin-card" onclick="switchView('panel-${panel.id}')">
        <div class="pin-icon-box" style="background:${panel.color}22; color:${panel.color};">
          <i class="fas ${panel.icon || 'fa-folder'}"></i>
        </div>
        <div class="pin-details">
          <div class="pin-name">${escHtml(panel.name)}</div>
          <div class="pin-meta">${escHtml(subtext)}</div>
        </div>
        <button class="unpin-btn" onclick="unpinPanel(event, '${panel.id}')" title="Unpin from dashboard">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  }).join('');

  // ─── Compile Recent Notes ───
  const recentNotesList = state.notes
    .filter(n => n.status !== 'deleted' && !n.archived)
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 4);

  const recentNotesHtml = recentNotesList.map(n => {
    const timeStr = fmtTimeAgo(n.updated_at || n.created_at);
    const tagsHtml = (n.tags || []).slice(0, 3).map(t => `<span class="tag-badge" style="font-size:10px; padding:1px 5px;">${escHtml(t)}</span>`).join('');
    return `
      <div class="recent-note-item" onclick="showNoteDetail('${n.id}')" style="border-left-color: ${getCatColor((n.categories || [])[0]) || 'var(--primary)'};">
        <div class="recent-note-title">${escHtml(n.title || 'Untitled')}</div>
        <div class="recent-note-tags">${tagsHtml}</div>
        <div class="recent-note-time">${timeStr}</div>
      </div>
    `;
  }).join('');

  // ─── Compile Recent Activity ───
  const activities = [];
  state.notes.filter(n => n.status !== 'deleted').slice(0, 10).forEach(n => {
    activities.push({
      text: `You ${n.created_at === n.updated_at ? 'created idea' : 'edited idea'} "<strong>${escHtml(n.title || 'Untitled')}</strong>"`,
      time: new Date(n.updated_at || n.created_at)
    });
  });
  state.todos.slice(0, 10).forEach(t => {
    activities.push({
      text: `You ${t.completed ? 'completed task' : 'created task'} "<strong>${escHtml(t.title)}</strong>"`,
      time: new Date(t.updated_at || t.created_at)
    });
  });

  state.panel_entries.slice(0, 10).forEach(pe => {
    const p = state.panels.find(p => p.id === pe.panel_id);
    activities.push({
      text: `You added entry to panel "<strong>${escHtml(p ? p.name : 'Panel')}</strong>"`,
      time: new Date(pe.created_at)
    });
  });
  activities.sort((a, b) => b.time - a.time);
  const recentActivityHtml = activities.slice(0, 5).map(act => {
    return `
      <div class="activity-item">
        <div class="activity-dot" style="background:var(--primary);"></div>
        <div class="activity-content">
          <div>${act.text}</div>
          <div class="activity-time">${fmtTimeAgo(act.time)}</div>
        </div>
      </div>
    `;
  }).join('');

  // ─── Compile Columns ───
  const columnsHtml = state.panels.map(panel => {
    let entries = state.panel_entries.filter(e => e.panel_id === panel.id);
    const fields = state.panel_fields.filter(f => f.panel_id === panel.id);
    
    if (panel.name === 'Notes' || panel.name === 'Ideas') {
      const mappedNotes = state.notes.map(n => ({
        id: n.id,
        panel_id: panel.id,
        created_at: n.created_at,
        updated_at: n.updated_at,
        data: {
          title: n.title,
          description: n.description,
          tags: n.tags,
          people: n.related_people,
          links: n.source
        }
      }));
      const entryMap = new Map();
      entries.forEach(e => entryMap.set(e.id, e));
      mappedNotes.forEach(mn => entryMap.set(mn.id, mn));
      entries = Array.from(entryMap.values());
    }
    
    const entriesHtml = entries.map(e => {
      const title = e.data.title || 'Untitled';
      const desc = e.data.description || '';
      const tags = Array.isArray(e.data.tags) ? e.data.tags : [];
      const tagsHtml = tags.map(t => `<span class="tag-badge" style="font-size:10px; padding:2px 6px;">${escHtml(t)}</span>`).join('');
      
      const peopleList = Array.isArray(e.data.people) ? e.data.people : [];
      const peopleHtml = peopleList.map(pId => {
        const name = entityName('people', pId);
        return name ? `<span class="cat-badge" style="font-size:10px; padding:2px 6px; background:${ENTITY_COLORS.people}22; color:${ENTITY_COLORS.people}">${escHtml(name)}</span>` : '';
      }).join('');
      
      return `
        <div class="note-card" onclick="showPanelEntryDetail('${e.id}', '${panel.id}')" style="border-left: 4px solid ${panel.color || 'var(--primary)'}; margin-bottom: 12px; padding: 12px; box-shadow: var(--shadow-sm); cursor: pointer; transition: all 180ms ease;">
          <div class="nc-title" style="font-size: 14px; font-weight: 600; margin-bottom: 4px; color: var(--ink);">${escHtml(title)}</div>
          <div class="nc-desc" style="font-size: 12px; color: var(--ink-secondary); margin-bottom: 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${escHtml(desc)}</div>
          <div class="nc-badges" style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom: 4px;">${peopleHtml}${tagsHtml}</div>
          <div class="nc-meta" style="font-size: 10px; color: var(--ink-faint);">${fmtDateShort(e.created_at || e.updated_at)}</div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="panel-column" style="display:flex; flex-direction:column; flex: 0 0 320px; width: 320px; background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius-lg); max-height: calc(100vh - 180px); overflow: hidden; box-shadow: var(--shadow-sm);">
        <div class="column-header" style="display:flex; align-items:center; justify-content:space-between; padding: 12px 16px; border-bottom: 1px solid var(--hairline); background: var(--canvas-soft);">
          <div style="display:flex; align-items:center; gap:8px; font-weight:600; color:var(--ink);">
            <i class="fas ${panel.icon || 'fa-folder'}" style="color:${panel.color || 'var(--primary)'}"></i>
            <span>${escHtml(panel.name)}</span>
            <span style="font-size:11px; background:var(--hairline); color:var(--ink-secondary); padding:2px 6px; border-radius:var(--radius-full); font-weight:normal;">${entries.length}</span>
          </div>
          <div style="display:flex; gap:6px;">
            ${fields.length > 0 ? `<button onclick="openPanelEntryModal(null, '${panel.id}')" style="background:none; border:none; color:var(--ink-secondary); cursor:pointer; font-size:12px; padding:4px;" title="New Entry"><i class="fas fa-plus"></i></button>` : ''}
            <button onclick="openPanelModal(event, '${panel.id}')" style="background:none; border:none; color:var(--ink-faint); cursor:pointer; font-size:12px; padding:4px;" title="Settings"><i class="fas fa-cog"></i></button>
          </div>
        </div>
        <div class="column-entries" style="flex:1; overflow-y:auto; padding: 12px;">
          ${fields.length === 0 ? `<div style="text-align:center; padding: 24px 12px; color: var(--ink-faint); font-size: 13px; font-style: italic;">No fields defined</div>` : (entries.length === 0 ? `<div style="text-align:center; padding: 24px 12px; color: var(--ink-faint); font-size: 13px; font-style: italic;">No entries yet</div>` : entriesHtml)}
        </div>
      </div>
    `;
  }).join('');

  // ─── Build Rich Dashboard Header & Stats if not Minimal ───
  let dashboardHtml = '';
  if (!state.minimalMode) {
    const greetingText = getGreeting();
    const activeNotesCount = state.notes.filter(n => n.status !== 'deleted' && !n.archived).length;
    
    const ideasPanel = state.panels.find(p => p.name.toLowerCase().includes('idea'));
    const ideasPendingCount = ideasPanel ? state.panel_entries.filter(e => e.panel_id === ideasPanel.id).length : 0;
    
    const pendingTasksCount = state.todos.filter(t => !t.completed).length;
    const completedTasksCount = state.todos.filter(t => t.completed).length;
    const totalTasksCount = state.todos.length;
    const pct = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
    


    const progressRingHtml = `
      <div class="progress-ring" style="background: conic-gradient(var(--accent-purple) ${pct}%, var(--hairline) ${pct}%)" title="${completedTasksCount} / ${totalTasksCount} tasks completed">
        <div class="progress-ring-inner">${pct}%</div>
      </div>
    `;

    dashboardHtml = `
      <div class="dash-header">
        <div class="dash-greeting">${escHtml(greetingText)}</div>
        <div class="dash-subtext">Here's what's happening in your workspace.</div>
      </div>
      
      <div class="dash-stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Ideas</span>
            <span class="stat-val">${activeNotesCount}</span>
            <span class="stat-sub">Total Ideas</span>
          </div>
          <div class="stat-icon-wrapper" style="background:rgba(0,117,222,0.08); color:var(--primary);">
            <i class="fas fa-file-alt"></i>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Ideas</span>
            <span class="stat-val">${ideasPendingCount}</span>
            <span class="stat-sub">Pending</span>
          </div>
          <div class="stat-icon-wrapper" style="background:rgba(16,185,129,0.08); color:var(--accent-green);">
            <i class="fas fa-lightbulb"></i>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">Tasks</span>
            <span class="stat-val">${pendingTasksCount}</span>
            <span class="stat-sub">To-do</span>
          </div>
          ${progressRingHtml}
        </div>
      </div>
      </div>

      <div class="dash-section-title"><i class="fas fa-thumbtack" style="font-size:12px; color:var(--primary);"></i> Pinned</div>
      <div class="pinned-grid">
        ${pinnedCardsHtml}
        <div class="add-pin-card" onclick="togglePinSelect(event)">
          <i class="fas fa-plus" style="margin-right:6px;"></i> Add Pin
        </div>
      </div>
      
      <div class="split-sections">
        <div class="recent-notes-box">
          <div class="dash-section-title" style="margin-bottom:14px;"><i class="fas fa-file-alt"></i> Recent Ideas</div>
          ${recentNotesHtml.length === 0 ? `<div style="text-align:center; padding:16px; color:var(--ink-faint); font-size:13px; font-style:italic;">No ideas found</div>` : recentNotesHtml}
          ${recentNotesHtml.length > 0 ? `<div style="margin-top:12px; text-align:left;"><a href="#" onclick="switchView('panel-${state.panels.find(p => p.name === 'Notes' || p.name === 'Ideas')?.id || ''}'); return false;" style="font-size:12px; font-weight:600; color:var(--primary); text-decoration:none;">View all ideas &rarr;</a></div>` : ''}
        </div>
        <div class="recent-activity-box">
          <div class="dash-section-title" style="margin-bottom:14px;"><i class="fas fa-clock"></i> Recent Activity</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${recentActivityHtml.length === 0 ? `<div style="text-align:center; padding:16px; color:var(--ink-faint); font-size:13px; font-style:italic;">No recent activity</div>` : recentActivityHtml}
          </div>
        </div>
      </div>

      <div class="dash-divider"></div>
      <div class="dash-section-title" style="margin-bottom:16px;"><i class="fas fa-columns"></i> Workspace Columns</div>
    `;
  }

  return `
    ${dashboardHtml}
    <div class="panels-columns-container" style="display:flex; gap:16px; overflow-x:auto; padding: 4px; min-height: calc(100vh - 160px); align-items: flex-start;">
      ${columnsHtml}
    </div>
    <!-- Pin Selection Popover Overlay -->
    <div id="pinSelector" class="hidden" style="position: absolute; background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius-md); box-shadow: var(--shadow-md); z-index: 500; padding: 8px; max-height: 200px; overflow-y: auto; min-width: 180px;"></div>
  `;
}

function showPanelEntryDetail(id, panelId) {
  state.currentDetail = id;
  state.currentDetailType = 'panel_entry';
  render();
}

function renderPanelEntryDetail(id) {
  let entry = state.panel_entries.find(e => e.id === id);
  if (!entry) {
    const n = state.notes.find(x => x.id === id);
    if (n) {
      const defaultNotesPanel = state.panels.find(p => p.name === 'Notes');
      entry = {
        id: n.id,
        panel_id: defaultNotesPanel ? defaultNotesPanel.id : '',
        created_at: n.created_at,
        updated_at: n.updated_at,
        data: {
          title: n.title,
          description: n.description,
          tags: n.tags,
          people: n.related_people,
          links: n.source
        }
      };
    }
  }
  if (!entry) return '<p>Entry not found.</p>';
  
  const panel = state.panels.find(p => p.id === entry.panel_id);
  const panelName = panel ? panel.name : 'Panel';
  
  const dataRows = Object.entries(entry.data).map(([key, val]) => {
    let valStr = '';
    if (Array.isArray(val)) {
      if (key === 'people' || key.includes('people') || key.includes('person')) {
        valStr = val.map(pId => {
          const name = entityName('people', pId);
          return name ? `<span class="entity-badge" style="background:${ENTITY_COLORS.people}22;color:${ENTITY_COLORS.people};cursor:pointer" onclick="showEntityDetail('people','${pId}')">${escHtml(name)}</span>` : '';
        }).join(' ');
      } else {
        valStr = val.map(v => `<span class="tag-badge">${escHtml(v)}</span>`).join(' ');
      }
    } else if (typeof val === 'object' && val !== null) {
      valStr = `<code>${escHtml(JSON.stringify(val))}</code>`;
    } else {
      valStr = escHtml(val);
    }
    
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `
      <div class="dv-section">
        <div class="dv-section-title">${escHtml(label)}</div>
        <div>${valStr}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="detail-view">
      <div class="dv-title">${escHtml(entry.data.title || 'Untitled')}</div>
      <div class="dv-meta-row">
        <span><i class="fas fa-folder"></i> Panel: ${escHtml(panelName)}</span>
        <span><i class="fas fa-calendar-plus"></i> Created: ${fmtDate(entry.created_at)}</span>
        <span><i class="fas fa-calendar-edit"></i> Modified: ${fmtDate(entry.updated_at)}</span>
      </div>
      <div style="margin-top:20px; display:flex; flex-direction:column; gap:16px;">
        ${dataRows}
      </div>
      <div class="detail-actions" style="margin-top:24px; padding-top:16px; border-top:1px solid var(--hairline); display:flex; gap:8px;">
        <button class="btn-secondary" onclick="goBack()"><i class="fas fa-arrow-left"></i> Back</button>
        <button class="btn-secondary" onclick="openPanelEntryModal('${entry.id}', '${entry.panel_id}')"><i class="fas fa-edit"></i> Edit</button>
        <button class="btn-danger" onclick="deletePanelEntry('${entry.id}', '${entry.panel_id}')" style="margin-left:auto; background:#dc2626; color:#fff; border:none; padding:8px 16px; border-radius:var(--radius-md); cursor:pointer;"><i class="fas fa-trash"></i> Delete</button>
      </div>
    </div>
  `;
}

function openPanelEntryModal(entryId = null, panelId) {
  const panel = state.panels.find(p => p.id === panelId);
  if (!panel) return;
  
  const modal = document.getElementById('panelEntryModal');
  const overlay = document.getElementById('modalOverlay');
  
  state.editingEntryId = entryId;
  state.editingEntryPanelId = panelId;
  
  overlay.classList.add('open');
  modal.classList.remove('hidden');
  
  document.getElementById('panelEntryModalTitle').textContent = entryId ? `Edit ${panel.name} Entry` : `New ${panel.name} Entry`;
  
  const fields = state.panel_fields.filter(f => f.panel_id === panelId).sort((a, b) => a.field_order - b.field_order);
  
  let entry = entryId ? state.panel_entries.find(e => e.id === entryId) : null;
  if (entryId && !entry) {
    const n = state.notes.find(x => x.id === entryId);
    if (n) {
      entry = {
        id: n.id,
        panel_id: panelId,
        data: {
          title: n.title,
          description: n.description,
          tags: n.tags,
          people: n.related_people,
          links: n.source
        }
      };
    }
  }
  
  state.editingEntryValues = {};
  if (entry) {
    state.editingEntryValues = JSON.parse(JSON.stringify(entry.data));
  }
  
  const body = document.getElementById('panelEntryModalBody');
  
  body.innerHTML = fields.map(f => {
    const isReq = f.is_required;
    const reqStar = isReq ? `<span style="color:#ef4444">*</span>` : '';
    const labelHtml = `<label class="form-label">${escHtml(f.field_label)} ${reqStar}</label>`;
    const val = state.editingEntryValues[f.field_key] !== undefined ? state.editingEntryValues[f.field_key] : '';
    
    let inputHtml = '';
    
    if (f.field_type === 'text') {
      inputHtml = `<input type="text" class="form-input pe-field" data-key="${f.field_key}" data-type="text" value="${escHtml(val)}" ${isReq ? 'required' : ''}>`;
    } else if (f.field_type === 'textarea') {
      inputHtml = `<textarea class="form-textarea pe-field" data-key="${f.field_key}" data-type="textarea" style="min-height:80px" ${isReq ? 'required' : ''}>${escHtml(val)}</textarea>`;
    } else if (f.field_type === 'url') {
      inputHtml = `<input type="url" class="form-input pe-field" data-key="${f.field_key}" data-type="url" value="${escHtml(val)}" placeholder="https://..." ${isReq ? 'required' : ''}>`;
    } else if (f.field_type === 'date') {
      inputHtml = `<input type="date" class="form-input pe-field" data-key="${f.field_key}" data-type="date" value="${escHtml(val)}" ${isReq ? 'required' : ''}>`;
    } else if (f.field_type === 'select') {
      const options = Array.isArray(f.options) ? f.options : [];
      inputHtml = `
        <select class="form-select pe-field" data-key="${f.field_key}" data-type="select" ${isReq ? 'required' : ''}>
          <option value="">-- Select --</option>
          ${options.map(opt => `<option value="${escHtml(opt)}" ${val === opt ? 'selected' : ''}>${escHtml(opt)}</option>`).join('')}
        </select>
      `;
    } else if (f.field_type === 'tags') {
      if (!state.editingEntryValues[f.field_key]) {
        state.editingEntryValues[f.field_key] = Array.isArray(val) ? val : [];
      }
      inputHtml = `
        <div class="multi-select-input pe-field" data-key="${f.field_key}" data-type="tags" id="pe-tags-wrap-${f.field_key}" onclick="document.getElementById('pe-input-${f.field_key}').focus()">
          <input type="text" id="pe-input-${f.field_key}" placeholder="Type and press Enter..." oninput="showPeTagSuggestions(this.value, '${f.field_key}')" onkeydown="handlePeTagKey(event, '${f.field_key}')">
          <div class="msi-dropdown" id="pe-dropdown-${f.field_key}"></div>
        </div>
      `;
    } else if (f.field_type === 'people_link') {
      if (!state.editingEntryValues[f.field_key]) {
        state.editingEntryValues[f.field_key] = Array.isArray(val) ? val : [];
      }
      const selectedIds = state.editingEntryValues[f.field_key];
      inputHtml = `
        <div class="checkbox-group pe-field" data-key="${f.field_key}" data-type="people_link" id="pe-people-group-${f.field_key}">
          ${state.people.map(p => {
            const isChecked = selectedIds.includes(p.id);
            return `
              <label class="checkbox-item ${isChecked ? 'checked' : ''}">
                <input type="checkbox" value="${p.id}" ${isChecked ? 'checked' : ''} onchange="togglePePeopleLink(this, '${f.field_key}', '${p.id}')"> ${escHtml(p.name)}
              </label>
            `;
          }).join('')}
        </div>
      `;
    }
    
    return `<div class="form-group">${labelHtml}${inputHtml}</div>`;
  }).join('');
  
  fields.forEach(f => {
    if (f.field_type === 'tags') {
      renderPeSelectedTags(f.field_key);
    }
  });
}

async function savePanelEntry() {
  const panelId = state.editingEntryPanelId;
  const fields = state.panel_fields.filter(f => f.panel_id === panelId);
  const values = Object.assign({}, state.editingEntryValues);
  
  let hasValidationError = false;
  
  fields.forEach(f => {
    const el = document.querySelector(`.pe-field[data-key="${f.field_key}"]`);
    if (!el) {
      if (f.field_type !== 'tags' && f.field_type !== 'people_link') {
        return;
      }
    } else {
      if (['text', 'textarea', 'url', 'date', 'select'].includes(f.field_type)) {
        values[f.field_key] = el.value.trim();
      }
    }
    
    if (f.is_required && (!values[f.field_key] || (Array.isArray(values[f.field_key]) && values[f.field_key].length === 0) || values[f.field_key] === '')) {
      toast(`Field "${f.field_label}" is required`, 'error');
      hasValidationError = true;
    }
  });
  
  if (hasValidationError) return;
  
  const defaultNotesPanel = state.panels.find(p => p.name === 'Notes');
  if (panelId === defaultNotesPanel?.id) {
    const titleVal = values.title ? values.title.trim() : '';
    const linkVal = values.links ? values.links.trim() : '';
    
    if (linkVal && (!titleVal || titleVal === linkVal)) {
      showBanner('Fetching URL title...', '');
      const fetchedTitle = await getUrlTitle(linkVal);
      if (fetchedTitle) {
        values.title = fetchedTitle;
        showBanner('Title autofetched!', 'success');
      }
    }
  }

  const id = state.editingEntryId || uuid();
  const entry = {
    id,
    panel_id: panelId,
    user_id: currentUser.id,
    data: values,
    created_at: state.editingEntryId ? (state.panel_entries.find(e => e.id === id)?.created_at || nowISO()) : nowISO(),
    updated_at: nowISO()
  };
  
  try {
    showBanner('Saving entry...', '');
    const result = await sbUpsert('panel_entries', entry);
    
    const idx = state.panel_entries.findIndex(e => e.id === id);
    if (idx >= 0) {
      state.panel_entries[idx] = result || entry;
      toast('Entry updated', 'success');
    } else {
      state.panel_entries.unshift(result || entry);
      toast('Entry saved', 'success');
    }
    
    closeModal();
    render();
  } catch (err) {
    console.error('Failed to save panel entry:', err);
    toast('Failed to save entry: ' + err.message, 'error');
  }
}

async function deletePanelEntry(id, panelId) {
  if (!confirm('Are you sure you want to delete this entry?')) return;
  
  try {
    showBanner('Deleting entry...');
    await sbDelete('panel_entries', id);
    
    state.panel_entries = state.panel_entries.filter(e => e.id !== id);
    
    state.currentDetail = null;
    toast('Entry deleted', 'info');
    render();
  } catch (err) {
    console.error('Failed to delete panel entry:', err);
    toast('Failed to delete entry: ' + err.message, 'error');
  }
}

// ─── Initialization ───
checkSession();

// Listen for auth state changes (e.g. magic link confirmation)
if(sb) {
  sb.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_IN'&&session) {
      currentUser=session.user;
      document.getElementById('authOverlay').classList.add('hidden');
      document.getElementById('app').style.display='flex';
      sbFetchAll().then(()=>{seedCategories();setupRealtime();renderUserInfo();render();});
    }
    if(event==='SIGNED_OUT') {
      currentUser=null;
      document.getElementById('authOverlay').classList.remove('hidden');
      document.getElementById('app').style.display='none';
    }
  });
}
// ─── Dropdown Menu Logic ───
function toggleMoreMenu(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const menu = document.getElementById('tnMoreMenu');
  if (menu) {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  }
}

window.addEventListener('click', (e) => {
  const menu = document.getElementById('tnMoreMenu');
  if (menu && menu.style.display === 'block') {
    if (!e.target.closest('#tnDropdownWrap') && !e.target.closest('.modal-overlay')) {
      menu.style.display = 'none';
    }
  }
});
