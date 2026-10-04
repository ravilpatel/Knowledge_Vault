import React, { useState } from 'react';
import { useVaultStore } from './vaultStore';
import { PersonEntity, CompanyEntity, ProjectEntity, TechnologyEntity } from '../../types';
import {
  Users,
  Building2,
  Briefcase,
  Cpu,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  Mail,
  Building,
} from 'lucide-react';

// ─── 1. People / Contacts View ─────────────────────────────
export const PeopleView: React.FC = () => {
  const { people, createPerson, updatePerson, deletePerson } = useVaultStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonEntity | null>(null);

  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [designation, setDesignation] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');

  const openNewModal = () => {
    setEditingPerson(null);
    setName('');
    setOrg('');
    setDesignation('');
    setContact('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: PersonEntity) => {
    setEditingPerson(p);
    setName(p.name);
    setOrg(p.organisation || '');
    setDesignation(p.designation || '');
    setContact(p.contact_info || '');
    setNotes(p.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingPerson) {
      await updatePerson(editingPerson.id, {
        name: name.trim(),
        organisation: org.trim() || undefined,
        designation: designation.trim() || undefined,
        contact_info: contact.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      await createPerson({
        name: name.trim(),
        organisation: org.trim() || undefined,
        designation: designation.trim() || undefined,
        contact_info: contact.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }
    setIsModalOpen(false);
  };

  const filtered = people.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.organisation || '').toLowerCase().includes(q) ||
      (p.designation || '').toLowerCase().includes(q) ||
      (p.contact_info || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-ink-muted" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-ink-primary dark:text-ink-darkPrimary"
          />
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Contact</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-xs text-ink-muted border border-dashed border-border-subtle dark:border-border-darkSubtle rounded-2xl bg-surface/50 dark:bg-surface-dark/50">
          <Users className="w-8 h-8 mx-auto mb-2 text-brand-primary opacity-50" />
          <p className="font-bold text-ink-primary dark:text-ink-darkPrimary text-sm">
            {people.length === 0 ? 'No contacts found' : 'No contacts match your search'}
          </p>
          <p className="mt-1">
            {people.length === 0
              ? 'Add key people and contacts to link them directly to Workspace Panels.'
              : 'Try searching for a different name, organisation, or role.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto">
          {filtered.map((person) => (
            <div
              key={person.id}
              className="p-4 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark hover:border-brand-primary/40 transition shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-ink-primary dark:text-ink-darkPrimary">
                        {person.name}
                      </h4>
                      {person.designation && (
                        <p className="text-[11px] text-ink-muted">{person.designation}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(person)}
                      className="p-1 rounded text-ink-muted hover:text-ink-primary"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete contact ${person.name}?`)) deletePerson(person.id);
                      }}
                      className="p-1 rounded text-ink-muted hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {person.organisation && (
                  <div className="flex items-center gap-1.5 text-[11px] text-ink-muted mt-2.5">
                    <Building className="w-3 h-3 text-ink-faint flex-shrink-0" />
                    <span className="truncate">{person.organisation}</span>
                  </div>
                )}

                {person.contact_info && (
                  <div className="flex items-center gap-1.5 text-[11px] text-brand-primary mt-1">
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{person.contact_info}</span>
                  </div>
                )}

                {person.notes && (
                  <p className="text-[11px] text-ink-muted mt-2 line-clamp-2 italic">
                    "{person.notes}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Person Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl p-5 overflow-hidden flex flex-col text-ink-primary dark:text-ink-darkPrimary animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle dark:border-border-darkSubtle mb-3">
              <h3 className="text-xs font-bold">
                {editingPerson ? 'Edit Contact' : 'New Contact'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-ink-muted hover:text-ink-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya Sharma"
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                    Organisation
                  </label>
                  <input
                    type="text"
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Engineering Lead"
                    className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Contact Info
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="email@example.com / +91 ..."
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Background or conversation notes..."
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-border-subtle dark:border-border-darkSubtle">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1 rounded-xl border border-border-subtle text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 2. Companies View ─────────────────────────────────────
export const CompaniesView: React.FC = () => {
  const { companies, createCompany, updateCompany, deleteCompany } = useVaultStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<CompanyEntity | null>(null);

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  const openNewModal = () => {
    setEditingComp(null);
    setName('');
    setIndustry('');
    setWebsite('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: CompanyEntity) => {
    setEditingComp(c);
    setName(c.name);
    setIndustry(c.industry || '');
    setWebsite(c.website || '');
    setDescription(c.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingComp) {
      await updateCompany(editingComp.id, {
        name: name.trim(),
        industry: industry.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
      });
    } else {
      await createCompany({
        name: name.trim(),
        industry: industry.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
      });
    }
    setIsModalOpen(false);
  };

  const filtered = companies.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.industry || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-ink-muted" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-ink-primary dark:text-ink-darkPrimary"
          />
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Company</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-xs text-ink-muted border border-dashed border-border-subtle dark:border-border-darkSubtle rounded-2xl bg-surface/50 dark:bg-surface-dark/50">
          <Building2 className="w-8 h-8 mx-auto mb-2 text-brand-primary opacity-50" />
          <p className="font-bold text-ink-primary dark:text-ink-darkPrimary text-sm">
            {companies.length === 0 ? 'No companies found' : 'No matching companies'}
          </p>
          <p className="mt-1">Track organizations, partners, and clients in your workspace.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto">
          {filtered.map((comp) => (
            <div
              key={comp.id}
              className="p-4 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark hover:border-brand-primary/40 transition shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center text-xs">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-ink-primary dark:text-ink-darkPrimary">
                        {comp.name}
                      </h4>
                      {comp.industry && (
                        <p className="text-[10px] text-ink-muted font-medium bg-surface-subtle px-1.5 py-0.5 rounded inline-block mt-0.5">
                          {comp.industry}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(comp)}
                      className="p-1 rounded text-ink-muted hover:text-ink-primary"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete company ${comp.name}?`)) deleteCompany(comp.id);
                      }}
                      className="p-1 rounded text-ink-muted hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {comp.website && (
                  <a
                    href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-brand-primary hover:underline mt-2.5 truncate"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{comp.website}</span>
                  </a>
                )}

                {comp.description && (
                  <p className="text-[11px] text-ink-muted mt-2 line-clamp-2">
                    {comp.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Company Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl p-5 overflow-hidden flex flex-col text-ink-primary dark:text-ink-darkPrimary animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle dark:border-border-darkSubtle mb-3">
              <h3 className="text-xs font-bold">
                {editingComp ? 'Edit Company' : 'New Company'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-ink-muted hover:text-ink-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corp, Microsoft, Google"
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Industry / Category
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="SaaS / Cloud / AI"
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Website
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-border-subtle dark:border-border-darkSubtle">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1 rounded-xl border border-border-subtle text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 3. Projects View ──────────────────────────────────────
export const ProjectsView: React.FC = () => {
  const { projects, createProject, updateProject, deleteProject } = useVaultStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProj, setEditingProj] = useState<ProjectEntity | null>(null);

  const [name, setName] = useState('');
  const [status, setStatus] = useState('Active');
  const [description, setDescription] = useState('');

  const openNewModal = () => {
    setEditingProj(null);
    setName('');
    setStatus('Active');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: ProjectEntity) => {
    setEditingProj(p);
    setName(p.name);
    setStatus(p.status || 'Active');
    setDescription(p.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingProj) {
      await updateProject(editingProj.id, {
        name: name.trim(),
        status: status.trim() || undefined,
        description: description.trim() || undefined,
      });
    } else {
      await createProject({
        name: name.trim(),
        status: status.trim() || undefined,
        description: description.trim() || undefined,
      });
    }
    setIsModalOpen(false);
  };

  const filtered = projects.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-ink-muted" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-ink-primary dark:text-ink-darkPrimary"
          />
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-xs text-ink-muted border border-dashed border-border-subtle dark:border-border-darkSubtle rounded-2xl bg-surface/50 dark:bg-surface-dark/50">
          <Briefcase className="w-8 h-8 mx-auto mb-2 text-brand-primary opacity-50" />
          <p className="font-bold text-ink-primary dark:text-ink-darkPrimary text-sm">
            {projects.length === 0 ? 'No projects found' : 'No matching projects'}
          </p>
          <p className="mt-1">Track strategic initiatives, client deliverables, and projects.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto">
          {filtered.map((proj) => (
            <div
              key={proj.id}
              className="p-4 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark hover:border-brand-primary/40 transition shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-ink-primary dark:text-ink-darkPrimary">
                        {proj.name}
                      </h4>
                      {proj.status && (
                        <span className="text-[10px] text-brand-primary font-semibold bg-brand-light px-1.5 py-0.5 rounded inline-block mt-0.5">
                          {proj.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(proj)}
                      className="p-1 rounded text-ink-muted hover:text-ink-primary"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete project ${proj.name}?`)) deleteProject(proj.id);
                      }}
                      className="p-1 rounded text-ink-muted hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {proj.description && (
                  <p className="text-[11px] text-ink-muted mt-2.5 line-clamp-3">
                    {proj.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl p-5 overflow-hidden flex flex-col text-ink-primary dark:text-ink-darkPrimary animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle dark:border-border-darkSubtle mb-3">
              <h3 className="text-xs font-bold">
                {editingProj ? 'Edit Project' : 'New Project'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-ink-muted hover:text-ink-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. NoteVault 2.0"
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="In Review">In Review</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Description / Goals
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key milestones and deliverables..."
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-border-subtle dark:border-border-darkSubtle">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1 rounded-xl border border-border-subtle text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 4. Technologies View ──────────────────────────────────
export const TechnologiesView: React.FC = () => {
  const { technologies, createTechnology, updateTechnology, deleteTechnology } = useVaultStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<TechnologyEntity | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const openNewModal = () => {
    setEditingTech(null);
    setName('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (t: TechnologyEntity) => {
    setEditingTech(t);
    setName(t.name);
    setDescription(t.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingTech) {
      await updateTechnology(editingTech.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } else {
      await createTechnology({
        name: name.trim(),
        description: description.trim() || undefined,
      });
    }
    setIsModalOpen(false);
  };

  const filtered = technologies.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-ink-muted" />
          <input
            type="text"
            placeholder="Search technologies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-ink-primary dark:text-ink-darkPrimary"
          />
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Technology</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-xs text-ink-muted border border-dashed border-border-subtle dark:border-border-darkSubtle rounded-2xl bg-surface/50 dark:bg-surface-dark/50">
          <Cpu className="w-8 h-8 mx-auto mb-2 text-brand-primary opacity-50" />
          <p className="font-bold text-ink-primary dark:text-ink-darkPrimary text-sm">
            {technologies.length === 0 ? 'No technologies found' : 'No matching technologies'}
          </p>
          <p className="mt-1">Track tech stack tools, frameworks, and developer tools.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto">
          {filtered.map((tech) => (
            <div
              key={tech.id}
              className="p-4 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark hover:border-brand-primary/40 transition shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-xs">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-xs text-ink-primary dark:text-ink-darkPrimary">
                      {tech.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(tech)}
                      className="p-1 rounded text-ink-muted hover:text-ink-primary"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete technology ${tech.name}?`)) deleteTechnology(tech.id);
                      }}
                      className="p-1 rounded text-ink-muted hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {tech.description && (
                  <p className="text-[11px] text-ink-muted mt-2.5 line-clamp-3">
                    {tech.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Technology Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl p-5 overflow-hidden flex flex-col text-ink-primary dark:text-ink-darkPrimary animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle dark:border-border-darkSubtle mb-3">
              <h3 className="text-xs font-bold">
                {editingTech ? 'Edit Technology' : 'New Technology'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-ink-muted hover:text-ink-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Technology / Tool *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. React, PostgreSQL, Docker"
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Stack details or usage context..."
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-border-subtle dark:border-border-darkSubtle">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1 rounded-xl border border-border-subtle text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

