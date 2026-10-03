#!/usr/bin/env node

/**
 * Knowledge Vault — Supabase Data Sync & Exporter
 * 
 * Fetches, seeds, and sets up data for:
 * - Projects
 * - People & Contacts
 * - Habits & Daily Logs
 * - Companies & Organizations
 * - Tasks & Eisenhower To-Dos
 * - Custom Panels & EAV Entries
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Load environment variables from .env
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  const env = {
    VITE_SUPABASE_URL: 'https://cmpklimagrwwzfjvqzqe.supabase.co',
    VITE_SUPABASE_ANON_KEY: '',
    VAULT_USER_EMAIL: '',
    VAULT_USER_PASSWORD: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
  };

  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        env[key] = val;
      }
    }
  }

  for (const k of Object.keys(env)) {
    if (process.env[k]) env[k] = process.env[k];
  }

  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://cmpklimagrwwzfjvqzqe.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: VITE_SUPABASE_ANON_KEY not found in .env');
  process.exit(1);
}

// 2. Sample Datasets for Projects, People, Habits, Companies, Tasks
function getStarterData(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10);

  const comp1Id = crypto.randomUUID();
  const comp2Id = crypto.randomUUID();
  const comp3Id = crypto.randomUUID();

  const person1Id = crypto.randomUUID();
  const person2Id = crypto.randomUUID();
  const person3Id = crypto.randomUUID();

  const proj1Id = crypto.randomUUID();
  const proj2Id = crypto.randomUUID();

  const habit1Id = crypto.randomUUID();
  const habit2Id = crypto.randomUUID();
  const habit3Id = crypto.randomUUID();

  return {
    projects: [
      {
        id: proj1Id,
        user_id: userId,
        name: 'NoteVault + Knowledge Vault 2.0 PWA',
        status: 'active',
        description:
          'Unified second brain combining Google Drive OneNote Markdown storage with Supabase relational panels, Eisenhower decision matrix, and daily habits.',
      },
      {
        id: proj2Id,
        user_id: userId,
        name: 'Autonomous Knowledge Graph & Neural Search',
        status: 'planning',
        description:
          'Local embedding generation and bidirectional entity link graph connecting notes, people, companies, and tasks.',
      },
    ],

    companies: [
      {
        id: comp1Id,
        user_id: userId,
        name: 'Anthropic',
        industry: 'Artificial Intelligence',
        website: 'https://anthropic.com',
        description: 'AI safety and research company pioneering constitutional LLMs and Claude.',
        related_people: [],
        related_projects: [proj2Id],
      },
      {
        id: comp2Id,
        user_id: userId,
        name: 'Supabase',
        industry: 'Cloud Infrastructure / Database',
        website: 'https://supabase.com',
        description: 'Open-source Postgres platform providing Realtime DB, Auth, and Edge Functions.',
        related_people: [],
        related_projects: [proj1Id],
      },
      {
        id: comp3Id,
        user_id: userId,
        name: 'Vercel',
        industry: 'Developer Experience / Edge Computing',
        website: 'https://vercel.com',
        description: 'Frontend cloud platform powering Next.js and high-performance serverless web apps.',
        related_people: [],
        related_projects: [proj1Id],
      },
    ],

    people: [
      {
        id: person1Id,
        user_id: userId,
        name: 'Dr. Maya Sharma',
        organisation: 'Anthropic',
        designation: 'Principal Research Scientist',
        contact_info: 'maya.sharma@anthropic.com',
        notes: 'Co-author on agentic alignment and structured tool-calling benchmarks.',
        related_companies: [comp1Id],
        related_technologies: [],
        related_projects: [proj2Id],
      },
      {
        id: person2Id,
        user_id: userId,
        name: 'Rohan Varma',
        organisation: 'Supabase',
        designation: 'Systems Architect',
        contact_info: 'rohan.varma@supabase.io',
        notes: 'Advising on Row Level Security (RLS) fine-grained permissions and Dexie local offline syncing.',
        related_companies: [comp2Id],
        related_technologies: [],
        related_projects: [proj1Id],
      },
      {
        id: person3Id,
        user_id: userId,
        name: 'Elena Rostova',
        organisation: 'Vercel',
        designation: 'VP of Product Engineering',
        contact_info: 'elena.r@vercel.com',
        notes: 'Collaborating on Progressive Web App (PWA) service worker offline strategies and fast TTFB.',
        related_companies: [comp3Id],
        related_technologies: [],
        related_projects: [proj1Id],
      },
    ],

    habits: [
      {
        id: habit1Id,
        user_id: userId,
        name: 'Daily Deep Work Block (90m)',
        description: 'Uninterrupted focus session with notifications disabled.',
        category: 'Productivity',
        color: '#4F46E5',
        frequency: 'daily',
        target_days: [0, 1, 2, 3, 4, 5, 6],
        target_count: 1,
        unit: 'session',
        reminder_time: '09:00',
        reminder_enabled: true,
        archived: false,
        sort_order: 0,
      },
      {
        id: habit2Id,
        user_id: userId,
        name: '30-Minute Research & Paper Reading',
        description: 'Read papers on AI architectures, distributed databases, or systems design.',
        category: 'Learning',
        color: '#0284C7',
        frequency: 'daily',
        target_days: [1, 2, 3, 4, 5],
        target_count: 1,
        unit: 'reading',
        reminder_time: '19:00',
        reminder_enabled: true,
        archived: false,
        sort_order: 1,
      },
      {
        id: habit3Id,
        user_id: userId,
        name: 'Physical Conditioning & Cardio',
        description: 'Zone 2 cardio or strength session.',
        category: 'Fitness',
        color: '#10B981',
        frequency: 'daily',
        target_days: [0, 1, 2, 3, 4, 5, 6],
        target_count: 1,
        unit: 'workout',
        reminder_time: '07:00',
        reminder_enabled: true,
        archived: false,
        sort_order: 2,
      },
    ],

    habit_logs: [
      { habit_id: habit1Id, user_id: userId, date: today, completed: true, count: 1 },
      { habit_id: habit1Id, user_id: userId, date: yesterday, completed: true, count: 1 },
      { habit_id: habit1Id, user_id: userId, date: twoDaysAgo, completed: true, count: 1 },
      { habit_id: habit2Id, user_id: userId, date: today, completed: true, count: 1 },
      { habit_id: habit2Id, user_id: userId, date: yesterday, completed: true, count: 1 },
      { habit_id: habit3Id, user_id: userId, date: today, completed: true, count: 1 },
      { habit_id: habit3Id, user_id: userId, date: yesterday, completed: true, count: 1 },
    ],

    todos: [
      {
        id: crypto.randomUUID(),
        user_id: userId,
        title: 'Review Q4 Architecture Specifications with Supabase Team',
        description: 'Verify Postgres Row Level Security policies and Dexie IndexedDB v4 migration.',
        urgent: true,
        important: true,
        priority: 'p1',
        status: 'todo',
        due_date: tomorrow,
        completed: false,
        completed_at: null,
        project_id: proj1Id,
        tags: ['Architecture', 'Supabase', 'P1', 'Engineering'],
        subtasks: [
          { id: 'st-1', text: 'Audit RLS security policies on all tables', completed: true },
          { id: 'st-2', text: 'Confirm Dexie outbox retry and conflict handling', completed: false },
        ],
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        title: 'Design Habit Heatmap & Streaks Visualization Component',
        description: 'Implement GitHub-style green activity grid with 365-day streak counter.',
        urgent: false,
        important: true,
        priority: 'p2',
        status: 'todo',
        due_date: nextWeek,
        completed: false,
        completed_at: null,
        project_id: proj1Id,
        tags: ['UI', 'Habits', 'Frontend', 'Productivity'],
        subtasks: [
          { id: 'st-3', text: 'Create SVG 7-column day matrix', completed: false },
          { id: 'st-4', text: 'Connect streak calculation to habit_logs', completed: false },
        ],
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        title: 'Draft Partner Integration Agreement with Anthropic Team',
        description: 'Coordinate with Dr. Maya Sharma regarding model endpoint API usage limits.',
        urgent: true,
        important: false,
        priority: 'p3',
        status: 'todo',
        due_date: tomorrow,
        completed: false,
        completed_at: null,
        project_id: proj2Id,
        tags: ['Legal', 'Anthropic', 'Partnerships'],
        subtasks: [],
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        title: 'Archive Obsolete Deprecated Web Worker References',
        description: 'Clean up legacy/ directory leftovers and obsolete test scripts.',
        urgent: false,
        important: false,
        priority: 'p4',
        status: 'done',
        due_date: null,
        completed: true,
        completed_at: new Date().toISOString(),
        project_id: null,
        tags: ['Cleanup', 'Maintenance'],
        subtasks: [],
      },
    ],

    technologies: [
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'React 18 & TypeScript',
        description: 'Frontend framework with strict type checking and concurrent rendering.',
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'Supabase PostgreSQL & Auth',
        description: 'Cloud database with Row Level Security (RLS) and JWT auth token persistence.',
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'Dexie.js (IndexedDB v4)',
        description: 'Client-side relational database caching 11 tables for zero-latency instant offline capability.',
      },
    ],
  };
}

// 3. Authenticate or establish session
async function getAuthToken() {
  const email = env.VAULT_USER_EMAIL || process.env.VAULT_USER_EMAIL;
  const password = env.VAULT_USER_PASSWORD || process.env.VAULT_USER_PASSWORD;

  if (email && password) {
    console.log(`🔑 Authenticating as user: ${email}...`);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`✅ Logged in successfully as ${email} (User ID: ${data.user?.id})`);
      return { token: data.access_token, userId: data.user?.id };
    }
  }

  // Use persistent primary user profile for CLI sync
  const probeEmail = `vault_primary_admin@charusat.edu.in`;
  const probePass = 'VaultAdmin2026!SecureSession';

  const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: probeEmail, password: probePass }),
  });

  if (signInRes.ok) {
    const data = await signInRes.json();
    console.log(`✅ Connected existing user session (${probeEmail})! User ID: ${data.user?.id}`);
    return { token: data.access_token, userId: data.user?.id };
  }

  console.log(`🌐 Registering primary session for Knowledge Vault (${probeEmail})...`);
  const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: probeEmail, password: probePass }),
  });

  const signupData = await signupRes.json();
  if (signupData.access_token) {
    console.log(`✅ Primary session initialized! User ID: ${signupData.user?.id}`);
    return { token: signupData.access_token, userId: signupData.user?.id };
  }

  throw new Error('Failed to obtain authenticated token: ' + JSON.stringify(signupData));
}

// 4. Supabase Table Fetch Helper
async function fetchTable(tableName, token) {
  const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn(`⚠️ Failed to fetch table [${tableName}]: ${res.status} ${err}`);
    return [];
  }

  return await res.json();
}

// 5. Supabase Table Insert Helper
async function insertTable(tableName, rows, token) {
  if (!rows || rows.length === 0) return;
  const url = `${SUPABASE_URL}/rest/v1/${tableName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn(`⚠️ Supabase insert warning on [${tableName}]:`, err);
  }
}

// 6. Main Orchestrator
async function main() {
  const args = process.argv.slice(2);
  const shouldSeed = args.includes('--seed');
  const shouldSummary = args.includes('--summary');

  console.log('===============================================================');
  console.log('🏛️  Knowledge Vault — Supabase Data Sync & Setup Manager');
  console.log('===============================================================');
  console.log(`Connected Project URL: ${SUPABASE_URL}`);

  const { token, userId } = await getAuthToken();

  // If --seed flag is passed, populate starter datasets
  if (shouldSeed) {
    console.log('\n🌱 Seeding full starter datasets to Supabase for all 5 domains...');
    const starter = getStarterData(userId);

    await insertTable('projects', starter.projects, token);
    await insertTable('companies', starter.companies, token);
    await insertTable('people', starter.people, token);
    await insertTable('habits', starter.habits, token);
    await insertTable('habit_logs', starter.habit_logs, token);
    await insertTable('todos', starter.todos, token);
    await insertTable('technologies', starter.technologies, token);
    console.log('✅ Seeding request sent!');
  }

  // Fetch all domain tables
  console.log('\n📥 Fetching all tables from Supabase...');
  let [
    projects,
    people,
    companies,
    habits,
    habitLogs,
    todos,
    panels,
    panelFields,
    panelEntries,
    technologies,
  ] = await Promise.all([
    fetchTable('projects', token),
    fetchTable('people', token),
    fetchTable('companies', token),
    fetchTable('habits', token),
    fetchTable('habit_logs', token),
    fetchTable('todos', token),
    fetchTable('panels', token),
    fetchTable('panel_fields', token),
    fetchTable('panel_entries', token),
    fetchTable('technologies', token),
  ]);

  // If database tables are empty, auto-seed and fetch again
  if (projects.length === 0 && people.length === 0 && companies.length === 0) {
    console.log('💡 Domain tables empty. Auto-populating initial starter data to Supabase...');
    const starter = getStarterData(userId);
    await insertTable('projects', starter.projects, token);
    await insertTable('companies', starter.companies, token);
    await insertTable('people', starter.people, token);
    await insertTable('habits', starter.habits, token);
    await insertTable('habit_logs', starter.habit_logs, token);
    await insertTable('todos', starter.todos, token);
    await insertTable('technologies', starter.technologies, token);

    // Refresh data
    [
      projects,
      people,
      companies,
      habits,
      habitLogs,
      todos,
      technologies,
    ] = await Promise.all([
      fetchTable('projects', token),
      fetchTable('people', token),
      fetchTable('companies', token),
      fetchTable('habits', token),
      fetchTable('habit_logs', token),
      fetchTable('todos', token),
      fetchTable('technologies', token),
    ]);
  }

  // Compute calculated metrics
  const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'Active' || !p.status);
  const totalTasks = todos.length;
  const completedTasks = todos.filter((t) => t.completed || t.status === 'done').length;
  const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Eisenhower Quadrants
  const q1 = todos.filter((t) => t.urgent && t.important);
  const q2 = todos.filter((t) => !t.urgent && t.important);
  const q3 = todos.filter((t) => t.urgent && !t.important);
  const q4 = todos.filter((t) => !t.urgent && !t.important);

  console.log('\n📊 Summary of Fetched Data:');
  console.log('---------------------------------------------------------------');
  console.log(`📁 Projects:           ${projects.length} total (${activeProjects.length} active)`);
  console.log(`👥 People & Contacts:   ${people.length} contacts`);
  console.log(`🏢 Companies:          ${companies.length} organizations`);
  console.log(`🔥 Habits:             ${habits.length} habits (${habitLogs.length} total completion logs)`);
  console.log(`🎯 Tasks & To-Dos:     ${totalTasks} tasks (${completedTasks} completed, ${taskPct}%)`);
  console.log(`   ├─ Q1 Do First:     ${q1.length}`);
  console.log(`   ├─ Q2 Schedule:     ${q2.length}`);
  console.log(`   ├─ Q3 Delegate:     ${q3.length}`);
  console.log(`   └─ Q4 Eliminate:    ${q4.length}`);
  console.log(`🗂️ Custom Panels:      ${panels.length} boards (${panelEntries.length} entries, ${panelFields.length} custom fields)`);
  console.log(`⚡ Technologies:       ${technologies.length} tech stack entries`);
  console.log('---------------------------------------------------------------');

  // Export to data/ directory
  const dataDir = path.join(ROOT_DIR, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(path.join(dataDir, 'projects.json'), JSON.stringify(projects, null, 2));
  fs.writeFileSync(path.join(dataDir, 'people.json'), JSON.stringify(people, null, 2));
  fs.writeFileSync(path.join(dataDir, 'companies.json'), JSON.stringify(companies, null, 2));
  fs.writeFileSync(
    path.join(dataDir, 'habits.json'),
    JSON.stringify({ habits, logs: habitLogs }, null, 2)
  );
  fs.writeFileSync(path.join(dataDir, 'todos.json'), JSON.stringify(todos, null, 2));

  const consolidatedExport = {
    metadata: {
      exportedAt: new Date().toISOString(),
      supabaseUrl: SUPABASE_URL,
      userId,
      counts: {
        projects: projects.length,
        people: people.length,
        companies: companies.length,
        habits: habits.length,
        habitLogs: habitLogs.length,
        todos: todos.length,
        panels: panels.length,
        panelEntries: panelEntries.length,
        technologies: technologies.length,
      },
    },
    projects,
    people,
    companies,
    habits,
    habitLogs,
    todos,
    panels,
    panelFields,
    panelEntries,
    technologies,
  };

  fs.writeFileSync(
    path.join(dataDir, 'vault_export.json'),
    JSON.stringify(consolidatedExport, null, 2)
  );

  console.log(`\n💾 Saved formatted JSON exports to:`);
  console.log(`   - ${path.join(dataDir, 'projects.json')}`);
  console.log(`   - ${path.join(dataDir, 'people.json')}`);
  console.log(`   - ${path.join(dataDir, 'companies.json')}`);
  console.log(`   - ${path.join(dataDir, 'habits.json')}`);
  console.log(`   - ${path.join(dataDir, 'todos.json')}`);
  console.log(`   - ${path.join(dataDir, 'vault_export.json')} (Consolidated multi-domain export)`);

  if (shouldSummary) {
    console.log('\n================== PROJECTS ==================');
    projects.forEach((p) => console.log(`• [${p.status?.toUpperCase() || 'ACTIVE'}] ${p.name}: ${p.description || 'No description'}`));

    console.log('\n================== PEOPLE ==================');
    people.forEach((pe) => console.log(`• ${pe.name} (${pe.designation || 'No title'} at ${pe.organisation || 'N/A'}) - ${pe.contact_info || 'No contact'}`));

    console.log('\n================== COMPANIES ==================');
    companies.forEach((c) => console.log(`• ${c.name} [${c.industry || 'General'}] - ${c.website || 'No website'}`));

    console.log('\n================== HABITS ==================');
    habits.forEach((h) => console.log(`• ${h.name || h.title} (${h.category}) [Frequency: ${h.frequency}]`));

    console.log('\n================== TASKS / TODOS ==================');
    todos.forEach((t) => console.log(`• [${t.completed ? '✓' : ' '}] [${t.priority?.toUpperCase() || 'P3'}] ${t.title} (Due: ${t.due_date || 'None'})`));
  }

  console.log('\n✨ Setup completed! Data is ready for downstream use cases.');
}

main().catch((err) => {
  console.error('\n❌ Fatal error in vault sync manager:', err);
  process.exit(1);
});
