
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
const TABLES = ['notes','people','companies','technologies','projects','categories','tags','expenses','todos','news_items'];

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
  expenses:[], todos:[], news_items:[], userSettings:null,
  currentView:'all', currentDetail:null, currentDetailType:null,
  searchQuery:'',
  filters:{categories:[],tags:[],priority:[],people:[],companies:[],technologies:[],projects:[],favouriteOnly:false,archivedOnly:false,deletedOnly:false},
  sortField:'updated_at', sortDir:'desc', page:1,
  editingNoteId:null, editingEntityType:null, editingEntityId:null,
  noteFav:false, selectedTags:[], authMode:'login',
};

// ─── Supabase Data Operations ───
async function sbFetchAll() {
  showBanner('Loading data from cloud...','');
  try {
    const results = await Promise.all(TABLES.map(t => sb.from(t).select('*').order('created_at',{ascending:false})));
    state.notes = normalizeArrays(results[0].data||[]);
    state.people = normalizeArrays(results[1].data||[]);
    state.companies = normalizeArrays(results[2].data||[]);
    state.technologies = normalizeArrays(results[3].data||[]);
    state.projects = normalizeArrays(results[4].data||[]);
    state.categories = normalizeArrays(results[5].data||[]);
    state.tags = normalizeArrays(results[6].data||[]);
    state.expenses = results[7].data||[];
    state.todos = results[8].data||[];
    state.news_items = results[9].data||[];

    const { data: setts } = await sb.from('user_settings').select('*').maybeSingle();
    state.userSettings = setts || { finance_currency: 'INR', news_enabled: true, finance_report_day: 1 };

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
    const {error} = await sb.from(table).delete().eq('user_id',currentUser.id);
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
    const channel = sb.channel('kv-'+table)
      .on('postgres_changes',
        {event:'INSERT',schema:'public',table,filter:'user_id=eq.'+currentUser.id},
        (payload) => {
          const item = normItem(payload.new);
          if(!state[table].find(x=>x.id===item.id)) {
            state[table].push(item);
            scheduleRender();
          }
        }
      )
      .on('postgres_changes',
        {event:'UPDATE',schema:'public',table,filter:'user_id=eq.'+currentUser.id},
        (payload) => {
          const item = normItem(payload.new);
          const idx = state[table].findIndex(x=>x.id===item.id);
          if(idx>=0) state[table][idx]=item;
          scheduleRender();
        }
      )
      .on('postgres_changes',
        {event:'DELETE',schema:'public',table,filter:'user_id=eq.'+currentUser.id},
        (payload) => {
          state[table] = state[table].filter(x=>x.id!==payload.old.id);
          scheduleRender();
        }
      )
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
  const initial = (currentUser.user_metadata?.full_name||email)[0]?.toUpperCase()||'U';
  document.getElementById('sbUserInfo').innerHTML = `
    <div class="su-avatar">${initial}</div>
    <div class="su-info"><div class="su-email">${email}</div><div class="su-status"><i class="fas fa-cloud"></i> Cloud synced</div></div>
    <button onclick="handleLogout()" title="Log out"><i class="fas fa-sign-out-alt"></i></button>
  `;
}

// ─── Search & Filter ───
function entityName(type,id) {
  const list=state[type]; const item=list.find(e=>e.id===id);
  return item?item.name:'';
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
  all:'All Notes',favourites:'Favourites',archived:'Archived',recent:'Recent Notes',
  highpriority:'High Priority',notags:'No Tags',nocategories:'No Categories',recycle:'Recycle Bin',
  people:'People',companies:'Companies',technologies:'Technologies',projects:'Projects',
  finance:'Expenses', 'finance-report':'Monthly Finance Report',
  matrix:'Eisenhower Matrix', todos:'All Tasks', news:'News & Intel'
};

// ─── Render ───
function render() {
  updateSidebarCounts();
  renderSidebarCategories();
  renderUserInfo();
  renderMainHeader();
  renderMainContent();
}

function updateSidebarCounts() {
  const active=state.notes.filter(n=>n.status!=='deleted'&&!n.archived);
  document.getElementById('count-all').textContent=active.length;
  document.getElementById('count-fav').textContent=state.notes.filter(n=>n.favourite&&n.status!=='deleted').length;
  document.getElementById('count-arch').textContent=state.notes.filter(n=>n.archived&&n.status!=='deleted').length;
  document.getElementById('count-del').textContent=state.notes.filter(n=>n.status==='deleted').length;
  document.getElementById('count-hp').textContent=state.notes.filter(n=>(n.priority==='high'||n.priority==='critical')&&n.status!=='deleted'&&!n.archived).length;
  document.getElementById('count-people').textContent=state.people.length;
  document.getElementById('count-companies').textContent=state.companies.length;
  document.getElementById('count-tech').textContent=state.technologies.length;
  document.getElementById('count-proj').textContent=state.projects.length;
  
  if(document.getElementById('count-exp')) document.getElementById('count-exp').textContent=state.expenses.length;
  if(document.getElementById('count-todos')) document.getElementById('count-todos').textContent=state.todos.filter(t=>!t.completed).length;
  if(document.getElementById('count-news')) document.getElementById('count-news').textContent=state.news_items.filter(n=>!n.is_read).length;
}

function renderSidebarCategories() {
  const container=document.getElementById('sidebar-cats');
  const counts={};
  state.notes.filter(n=>n.status!=='deleted'&&!n.archived).forEach(n=>{(n.categories||[]).forEach(c=>{counts[c]=(counts[c]||0)+1;});});
  container.innerHTML=state.categories.map(c=>`
    <div class="sb-item" onclick="addFilter('categories','${c.name}')">
      <span class="icon" style="width:8px;height:8px;border-radius:50%;background:${getCatColor(c.name)};flex-shrink:0"></span>
      <span class="label">${c.name}</span><span class="count">${counts[c.name]||0}</span>
    </div>`).join('');
}

function renderMainHeader() {
  const vt=document.getElementById('viewTitle');
  const vc=document.getElementById('viewCount');
  const af=document.getElementById('activeFilters');
  const sc=document.getElementById('sortControls');
  const va=document.getElementById('viewActions');
  const isEntityView=['people','companies','technologies','projects'].includes(state.currentView);

  vt.textContent=VIEW_TITLES[state.currentView]||'All Notes';

  if(isEntityView) {
    const list=state[state.currentView];
    vc.textContent=list.length+' records';
    sc.classList.add('hidden'); af.innerHTML='';
    va.innerHTML=`<button onclick="openEntityModal('${state.currentView}')"><i class="fas fa-plus"></i> New</button>`;
  } else if(['finance','finance-report','matrix','todos','news'].includes(state.currentView)) {
    vc.textContent=''; sc.classList.add('hidden'); af.innerHTML=''; va.innerHTML='';
  } else if(state.currentDetail) {
    vc.textContent=''; sc.classList.add('hidden'); af.innerHTML=''; va.innerHTML='';
  } else {
    const filtered=getFilteredNotes();
    vc.textContent=filtered.length+' notes'; sc.classList.remove('hidden');
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
    va.innerHTML=`<button onclick="openNoteModal()"><i class="fas fa-plus"></i> New Note</button>`;
  }
  document.getElementById('sortField').value=state.sortField;
  const dirIcon=state.sortDir==='desc'?'fa-arrow-down':'fa-arrow-up';
  document.getElementById('sortDir').innerHTML=`<i class="fas ${dirIcon}"></i>`;
  document.querySelectorAll('.sb-item[data-view]').forEach(el=>{el.classList.toggle('active',el.dataset.view===state.currentView);});
}

function renderMainContent() {
  const mc=document.getElementById('main-content');
  if(state.currentDetail&&state.currentDetailType==='note') { mc.innerHTML=renderNoteDetail(state.currentDetail); return; }
  if(state.currentDetail&&state.currentDetailType!=='note') { mc.innerHTML=renderEntityDetail(state.currentDetailType,state.currentDetail); return; }
  const isEntityView=['people','companies','technologies','projects'].includes(state.currentView);
  if(isEntityView) { mc.innerHTML=renderEntityList(state.currentView); return; }
  
  if(state.currentView === 'finance') { mc.innerHTML=renderFinanceDashboard(); return; }
  if(state.currentView === 'finance-report') { mc.innerHTML=renderFinanceReport(); return; }
  if(state.currentView === 'matrix') { mc.innerHTML=renderEisenhowerMatrix(); return; }
  if(state.currentView === 'todos') { mc.innerHTML=renderTodoList(); return; }
  if(state.currentView === 'news') { mc.innerHTML=renderNewsFeed(); return; }

  const filtered=getFilteredNotes();
  const totalPages=Math.ceil(filtered.length/PAGE_SIZE)||1;
  if(state.page>totalPages) state.page=totalPages;
  const start=(state.page-1)*PAGE_SIZE;
  const pageNotes=filtered.slice(start,start+PAGE_SIZE);

  if(filtered.length===0) {
    mc.innerHTML=`<div class="empty-state"><div class="es-icon"><i class="fas fa-file-alt"></i></div><div class="es-title">No notes found</div><div class="es-desc">Try adjusting your filters or search, or create a new note.</div><button class="sb-new-btn" style="width:auto;margin:0" onclick="openNoteModal()"><i class="fas fa-plus"></i> New Note</button></div>`;
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

  const linkedHtml=linked.length?`<div class="dv-section"><div class="dv-section-title">Linked Notes (${linked.length})</div><div class="linked-notes">${linked.map(n=>`<div class="linked-note-item" onclick="showNoteDetail('${n.id}')"><i class="fas fa-file-alt" style="color:var(--ink-faint)"></i> ${escHtml(n.title||'Untitled')}</div>`).join('')}</div></div>`:'';

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
function toggleMobileSidebar() {
  const open = document.getElementById('sidebar').classList.toggle('mobile-open');
  document.getElementById('sidebarOverlay').classList.toggle('show', open);
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// ─── Note CRUD ───
function openNoteModal(editId) {
  state.editingNoteId=editId||null; state.noteFav=false; state.selectedTags=[];
  const modal=document.getElementById('noteModal'); modal.classList.remove('hidden');
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('noteModalTitle').textContent=editId?'Edit Note':'New Note';
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

  closeModal(); toast('Note saved','success'); render();
}

function gatherChecked(selector) { const arr=[]; document.querySelectorAll(selector+' input[type="checkbox"]:checked').forEach(cb=>arr.push(cb.value)); return arr; }

async function deleteNote(id) {
  const n=state.notes.find(x=>x.id===id);
  if(n) { n.status='deleted'; await sbUpsert('notes',n); toast('Note moved to Recycle Bin','info'); state.currentDetail=null; render(); }
}
async function restoreNote(id) {
  const n=state.notes.find(x=>x.id===id);
  if(n) { n.status='active'; await sbUpsert('notes',n); toast('Note restored','success'); state.currentDetail=null; state.currentView='all'; render(); }
}
async function permanentDelete(id) {
  await sbDelete('notes',id);
  state.notes=state.notes.filter(x=>x.id!==id);
  toast('Note permanently deleted','info'); state.currentDetail=null; render();
}
async function archiveNote(id) {
  const n=state.notes.find(x=>x.id===id);
  if(n) { n.archived=!n.archived; await sbUpsert('notes',n); toast(n.archived?'Note archived':'Note unarchived','info'); state.currentDetail=null; render(); }
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
    categories:state.categories,tags:state.tags};
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

    if (data.expenses) {
      const { data: newExp } = await sb.from('expenses').select('*').order('date',{ascending:false});
      if (newExp) state.expenses = newExp;
      setTimeout(() => { if(state.currentView==='finance') renderMainContent(); updateSidebarCounts(); }, 500);
    }
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
    let type = action.type.replace('add_', '').replace('update_', '');
    if (type === 'person') type = 'people';
    if (type === 'technology') type = 'technologies';
    if (type === 'company') type = 'companies';
    if (type === 'project') type = 'projects';
    if (type === 'expense') type = 'expenses';
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
async function testEmailSettings() { toast('Please save settings and test via Finance Report instead','info'); }

function openSettings() {
  if(state.userSettings) {
    document.getElementById('s-smtp-host').value = state.userSettings.smtp_host || '';
    document.getElementById('s-smtp-port').value = state.userSettings.smtp_port || 587;
    document.getElementById('s-smtp-user').value = state.userSettings.smtp_user || '';
    document.getElementById('s-smtp-pass').value = state.userSettings.smtp_pass || '';
    document.getElementById('s-smtp-from').value = state.userSettings.smtp_from || '';
    document.getElementById('s-notify-email').value = state.userSettings.notify_email || '';
    document.getElementById('s-tg-token').value = state.userSettings.telegram_bot_token || '';
    document.getElementById('s-tg-chatid').value = state.userSettings.telegram_chat_id || '';
    document.getElementById('s-currency').value = state.userSettings.finance_currency || 'INR';
    document.getElementById('s-report-day').value = state.userSettings.finance_report_day || 1;
    document.getElementById('s-news-topics').value = state.userSettings.news_topics || 'Indian policy, startups, technology';
    if(state.userSettings.news_enabled === false) document.getElementById('newsEnabledTrack').classList.remove('active');
    else document.getElementById('newsEnabledTrack').classList.add('active');
  }
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('settingsModal').classList.remove('hidden');
}

function switchSettingsTab(tabId, btn) {
  document.querySelectorAll('.s-tab').forEach(b=>b.classList.remove('active'));
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
      smtp_host: document.getElementById('s-smtp-host').value,
      smtp_port: parseInt(document.getElementById('s-smtp-port').value)||587,
      smtp_user: document.getElementById('s-smtp-user').value,
      smtp_pass: document.getElementById('s-smtp-pass').value,
      smtp_from: document.getElementById('s-smtp-from').value,
      notify_email: document.getElementById('s-notify-email').value,
      telegram_bot_token: document.getElementById('s-tg-token').value,
      telegram_chat_id: document.getElementById('s-tg-chatid').value,
      finance_currency: document.getElementById('s-currency').value,
      finance_report_day: parseInt(document.getElementById('s-report-day').value)||1,
      news_enabled: document.getElementById('newsEnabledTrack').classList.contains('active'),
      news_topics: document.getElementById('s-news-topics').value.trim()
    };
    if(state.userSettings && state.userSettings.id) data.id = state.userSettings.id;
    
    const { data: saved, error } = await sb.from('user_settings').upsert(data).select().single();
    if(error) throw error;
    state.userSettings = saved;
    toast('Settings saved successfully', 'success');
    closeModal();
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

// ─── Finance Dashboard ───
const CURRENCY_SYMBOLS = { INR:'₹', USD:'$', EUR:'€' };

function getCurrencySymbol() {
  return CURRENCY_SYMBOLS[state.userSettings?.finance_currency] || '₹';
}

function renderFinanceDashboard() {
  const expenses = state.expenses;
  const sym = getCurrencySymbol();
  
  // Calculate stats for current month
  const now = new Date();
  const currentMonthExp = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  
  const totalMonth = currentMonthExp.reduce((s,e)=>s+Number(e.amount),0);
  const reimbMonth = currentMonthExp.filter(e=>e.reimbursable).reduce((s,e)=>s+Number(e.amount),0);
  const netMonth = totalMonth - reimbMonth;

  let chartHtml = `<div class="chart-wrap">
    <canvas id="financeChart"></canvas>
  </div>`;

  let chatHtml = ``;

  let tableHtml = `<div class="exp-table-wrap">
    <table class="exp-table">
      <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th></th></tr></thead>
      <tbody>
        ${expenses.slice(0,50).map(e=>`
          <tr>
            <td>${e.date}</td>
            <td>${escHtml(e.description)}
              ${e.reimbursable?`<div class="reimb-badge" style="margin-top:4px" title="${escHtml(e.reimbursable_note||'')}"><i class="fas fa-receipt"></i> Reimbursable</div>`:''}
            </td>
            <td><span class="cat-chip" style="background:${getCatColor(e.category)}22;color:${getCatColor(e.category)}">${e.category}</span></td>
            <td style="font-weight:600">
              ${e.reimbursable ? `<span style="text-decoration:line-through;color:var(--ink-faint);margin-right:4px">${sym}${e.amount}</span><span style="color:var(--accent-green)">${sym}0</span>` : `${sym}${e.amount}`}
            </td>
            <td><span class="exp-del" onclick="deleteExpense('${e.id}')"><i class="fas fa-trash"></i></span></td>
          </tr>
        `).join('')}
        ${expenses.length===0?'<tr><td colspan="5" style="text-align:center;padding:30px">No expenses recorded yet.</td></tr>':''}
      </tbody>
    </table>
  </div>`;

  setTimeout(renderFinanceChart, 50);

  return `
    <div class="section-header">
      <h2>Expense Dashboard</h2>
    </div>
    <div class="stat-cards">
      <div class="stat-card c-blue"><div class="sc-label">This Month Total</div><div class="sc-value">${sym}${totalMonth.toLocaleString()}</div></div>
      <div class="stat-card c-green"><div class="sc-label">Reimbursable</div><div class="sc-value">${sym}${reimbMonth.toLocaleString()}</div></div>
      <div class="stat-card c-orange"><div class="sc-label">Net Spent</div><div class="sc-value">${sym}${netMonth.toLocaleString()}</div></div>
    </div>
    <div class="dash-grid" style="grid-template-columns:1fr 1fr">
      ${chatHtml}
      ${chartHtml}
    </div>
    <div class="section-header" style="margin-top:10px">
      <h2>Recent Transactions</h2>
    </div>
    ${tableHtml}
  `;
}

function renderFinanceChart() {
  if(!window.Chart) return setTimeout(renderFinanceChart,100);
  const ctx = document.getElementById('financeChart');
  if(!ctx) return;
  
  // Calculate category totals for current month
  const now = new Date();
  const currentMonthExp = state.expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  
  const byCat = {};
  currentMonthExp.forEach(e => { byCat[e.category] = (byCat[e.category]||0) + Number(e.amount); });
  
  const labels = Object.keys(byCat);
  const data = Object.values(byCat);
  const bgColors = labels.map(c => getCatColor(c));

  new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: bgColors, borderWidth:0 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, font: {family:'Inter', size:11} } }
      },
      cutout: '65%'
    }
  });
}

async function sendFinanceChat() {
  const input = document.getElementById('finChatInput');
  const msgText = input.value.trim();
  if(!msgText) return;
  
  const msgList = document.getElementById('finChatMsgs');
  msgList.innerHTML += `<div class="fin-chat-msg user">${escHtml(msgText)}</div>`;
  input.value = '';
  msgList.scrollTop = msgList.scrollHeight;

  const thinkingId = 'th-'+Date.now();
  msgList.innerHTML += `<div class="fin-chat-msg ai" id="${thinkingId}"><i class="fas fa-circle-notch fa-spin"></i> Processing...</div>`;
  msgList.scrollTop = msgList.scrollHeight;

  try {
    const { data, error } = await sb.functions.invoke('gemini-chat', {
      body: { message: msgText, userId: currentUser.id }
    });
    if(error) throw error;
    
    document.getElementById(thinkingId).remove();
    msgList.innerHTML += `<div class="fin-chat-msg ai">${data.reply || 'Logged successfully.'}</div>`;
    msgList.scrollTop = msgList.scrollHeight;
    
    // Refresh data silently
    const { data: newExp } = await sb.from('expenses').select('*').order('date',{ascending:false});
    if(newExp) {
      state.expenses = newExp;
      // Re-render dashboard after a short delay so user can read message
      setTimeout(() => { if(state.currentView==='finance') renderMainContent(); }, 2000);
      updateSidebarCounts();
    }
  } catch(e) {
    document.getElementById(thinkingId).innerHTML = `<i class="fas fa-exclamation-triangle" style="color:#c00"></i> Error: ${e.message}`;
  }
}

async function deleteExpense(id) {
  if(!confirm('Delete this expense?')) return;
  try {
    await sb.from('expenses').delete().eq('id',id);
    state.expenses = state.expenses.filter(e=>e.id!==id);
    renderMainContent();
    updateSidebarCounts();
    toast('Expense deleted');
  } catch(e) { toast(e.message,'error'); }
}

function renderFinanceReport() {
  return `
    <div class="section-header">
      <h2>Monthly Reports</h2>
      <button class="sb-new-btn" style="width:auto;margin:0" onclick="triggerFinanceReport()">
        <i class="fas fa-paper-plane"></i> Email Previous Month Report Now
      </button>
    </div>
    <div class="dash-widget">
      <div style="font-size:14px;color:var(--ink-secondary);line-height:1.6">
        <p>The <strong>Monthly Finance Report</strong> calculates your total spend, reimbursable expenses, and net spend for the previous calendar month.</p>
        <p>It categorizes expenses and generates a beautiful HTML email sent via SMTP to your configured email address.</p>
        <p>The report is automatically scheduled to run on day <strong>${state.userSettings?.finance_report_day || 1}</strong> of each month using <code>pg_cron</code>.</p>
        <p>A summary of the report is also saved as a Note in your Vault.</p>
      </div>
    </div>
  `;
}

async function triggerFinanceReport() {
  toast('Generating and sending report...');
  try {
    const { data, error } = await sb.functions.invoke('send-finance-report', {
      body: { userId: currentUser.id }
    });
    if(error) throw error;
    if(data.success) {
      toast(`Report for ${data.monthName} sent successfully!`, 'success');
      // Refresh notes so the new report note shows up
      const { data: n } = await sb.from('notes').select('*').order('created_at',{ascending:false});
      if(n) { state.notes = normalizeArrays(n); updateSidebarCounts(); }
    } else {
      throw new Error(data.error);
    }
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
        telegramChatId: state.userSettings?.telegram_chat_id
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

// ─── News Feed ───
let currentNewsFilter = 'all';

function setNewsFilter(f) {
  currentNewsFilter = f;
  renderMainContent();
}

async function markNewsRead(id, url) {
  if(url && url !== 'null' && url !== 'undefined' && url !== '') window.open(url, '_blank');
  const n = state.news_items.find(x=>x.id===id);
  if(n && !n.is_read) {
    n.is_read = true;
    updateSidebarCounts();
    try { await sb.from('news_items').update({is_read:true}).eq('id',id); } catch(e){}
    if(state.currentView==='news') renderMainContent();
  }
}

function renderNewsFeed() {
  let items = state.news_items;
  if(currentNewsFilter !== 'all') {
    items = items.filter(n => n.category === currentNewsFilter);
  }
  
  // Sort by date desc
  items.sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));

  const filterTabs = [
    {id:'all', label:'All Intelligence'},
    {id:'pib', label:'PIB India'},
    {id:'gazette', label:'eGazette'},
    {id:'startup', label:'Startups'},
    {id:'market', label:'Market Opps'}
  ];

  return `
    <div class="section-header">
      <h2>Intelligence Feed</h2>
      <button class="fetch-now-btn" onclick="fetchNewsNow()">
        <i class="fas fa-sync-alt"></i> Fetch Now
      </button>
    </div>
    <div class="news-toolbar">
      <div class="news-tabs">
        ${filterTabs.map(f=>`<button class="news-tab ${currentNewsFilter===f.id?'active':''}" onclick="setNewsFilter('${f.id}')">${f.label}</button>`).join('')}
      </div>
    </div>
    <div class="news-grid">
      ${items.slice(0,60).map(n=>{
        const time = new Date(n.published_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
        return `
        <div class="news-card ${!n.is_read?'unread':''}" onclick="markNewsRead('${n.id}','${n.url || ''}')">
          <div class="nc-src ${n.category}">${n.source}</div>
          <div class="nc-headline">${escHtml(n.title)}</div>
          <div class="nc-summary">${escHtml(n.summary)}</div>
          <div class="nc-footer">
            <span>${time}</span>
            ${n.url?'<span class="nc-read-link">Read full story &rarr;</span>':''}
          </div>
        </div>`;
      }).join('')}
      ${items.length===0?'<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--ink-muted)">No news items found.</div>':''}
    </div>
  `;
}

async function fetchNewsNow() {
  toast('Fetching latest intelligence...');
  try {
    const { data, error } = await sb.functions.invoke('fetch-news', {
      body: { userId: currentUser.id }
    });
    if(error) throw error;
    
    // Silently fetch updated news
    const { data: newNews } = await sb.from('news_items').select('*').order('published_at',{ascending:false});
    if(newNews) {
      state.news_items = newNews;
      updateSidebarCounts();
      if(state.currentView==='news') renderMainContent();
    }
    toast(`Fetched ${data.fetched} items, added ${data.inserted} relevant ones.`, 'success');
  } catch(e) {
    toast('News fetch failed: '+e.message, 'error');
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
