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
  ListTodo,
  Globe,
} from 'lucide-react';

const TECH_CATEGORIES = [
  'Frontend',
  'Backend',
  'Database',
  'Cloud & DevOps',
  'AI & Machine Learning',
  'Mobile & PWA',
  'Security & Auth',
  'Tooling & Utility',
  'General',
];

const PROJECT_STATUSES = [
  { label: 'Active', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { label: 'Planning', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  { label: 'In Review', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { label: 'Completed', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  { label: 'On Hold', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
];

// ─── 1. People / Contacts View ─────────────────────────────
export const PeopleView: React.FC = () => {
  const {
    people,
    projects,
    technologies,
    createPerson,
    updatePerson,
    deletePerson,
  } = useVaultStore();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonEntity | null>(null);

  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [designation, setDesignation] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedTechnologies, setSelectedTechnologies] = useState<string[]>([]);

  const openNewModal = () => {
    setEditingPerson(null);
    setName('');
    setOrg('');
    setDesignation('');
    setContact('');
    setNotes('');
    setSelectedCompanies([]);
    setSelectedProjects([]);
    setSelectedTechnologies([]);
    setIsModalOpen(true);
  };

  const openEditModal = (p: PersonEntity) => {
    setEditingPerson(p);
    setName(p.name);
    setOrg(p.organisation || '');
    setDesignation(p.designation || '');
    setContact(p.contact_info || '');
    setNotes(p.notes || '');
    setSelectedCompanies(p.related_companies || []);
    setSelectedProjects(p.related_projects || []);
    setSelectedTechnologies(p.related_technologies || []);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      organisation: org.trim() || undefined,
      designation: designation.trim() || undefined,
      contact_info: contact.trim() || undefined,
      notes: notes.trim() || undefined,
      related_companies: selectedCompanies,
      related_projects: selectedProjects,
      related_technologies: selectedTechnologies,
    };

    if (editingPerson) {
      await updatePerson(editingPerson.id, payload);
    } else {
      await createPerson(payload);
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
    <div className="flex flex-col h-full space-y-4 pb-24 md:pb-6 touch-pan-y">
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
              ? 'Add key people and contacts to link them directly to Projects, Tech Stacks, and Panels.'
              : 'Try searching for a different name, organisation, or role.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto touch-pan-y">
          {filtered.map((person) => {
            const linkedProjects = projects.filter((p) =>
              (person.related_projects || []).includes(p.id)
            );
            const linkedTechs = technologies.filter((t) =>
              (person.related_technologies || []).includes(t.id)
            );

            return (
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
                        title="Edit Contact"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete contact ${person.name}?`)) deletePerson(person.id);
                        }}
                        className="p-1 rounded text-ink-muted hover:text-rose-500"
                        title="Delete Contact"
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

                  {/* Linked Projects & Technologies */}
                  {(linkedProjects.length > 0 || linkedTechs.length > 0) && (
                    <div className="pt-2.5 mt-2.5 border-t border-border-subtle/50 space-y-1.5">
                      {linkedProjects.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          <Briefcase className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                          {linkedProjects.map((p) => (
                            <span
                              key={p.id}
                              className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium"
                            >
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {linkedTechs.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          <Cpu className="w-3 h-3 text-purple-500 flex-shrink-0" />
                          {linkedTechs.map((t) => (
                            <span
                              key={t.id}
                              className="px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Person Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl p-5 overflow-hidden flex flex-col max-h-[90vh] text-ink-primary dark:text-ink-darkPrimary animate-in zoom-in-95 duration-100">
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
            <form onSubmit={handleSave} className="space-y-3 text-xs overflow-y-auto pr-1">
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

              {/* Linked Projects Multi-Select */}
              {projects.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                    Linked Projects
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl border border-border-subtle bg-surface-subtle/50">
                    {projects.map((proj) => {
                      const isSelected = selectedProjects.includes(proj.id);
                      return (
                        <button
                          type="button"
                          key={proj.id}
                          onClick={() => {
                            setSelectedProjects((prev) =>
                              isSelected ? prev.filter((id) => id !== proj.id) : [...prev, proj.id]
                            );
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                              : 'bg-surface dark:bg-surface-dark text-ink-muted border border-border-subtle hover:border-indigo-400'
                          }`}
                        >
                          {proj.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Linked Technologies Multi-Select */}
              {technologies.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                    Expertise / Technologies
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl border border-border-subtle bg-surface-subtle/50">
                    {technologies.map((tech) => {
                      const isSelected = selectedTechnologies.includes(tech.id);
                      return (
                        <button
                          type="button"
                          key={tech.id}
                          onClick={() => {
                            setSelectedTechnologies((prev) =>
                              isSelected ? prev.filter((id) => id !== tech.id) : [...prev, tech.id]
                            );
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium transition ${
                            isSelected
                              ? 'bg-purple-600 text-white font-semibold shadow-xs'
                              : 'bg-surface dark:bg-surface-dark text-ink-muted border border-border-subtle hover:border-purple-400'
                          }`}
                        >
                          {tech.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
  const {
    companies,
    people,
    projects,
    createCompany,
    updateCompany,
    deleteCompany,
  } = useVaultStore();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<CompanyEntity | null>(null);

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const openNewModal = () => {
    setEditingComp(null);
    setName('');
    setIndustry('');
    setWebsite('');
    setDescription('');
    setSelectedPeople([]);
    setSelectedProjects([]);
    setIsModalOpen(true);
  };

  const openEditModal = (c: CompanyEntity) => {
    setEditingComp(c);
    setName(c.name);
    setIndustry(c.industry || '');
    setWebsite(c.website || '');
    setDescription(c.description || '');
    setSelectedPeople(c.related_people || []);
    setSelectedProjects(c.related_projects || []);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      industry: industry.trim() || undefined,
      website: website.trim() || undefined,
      description: description.trim() || undefined,
      related_people: selectedPeople,
      related_projects: selectedProjects,
    };

    if (editingComp) {
      await updateCompany(editingComp.id, payload);
    } else {
      await createCompany(payload);
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
    <div className="flex flex-col h-full space-y-4 pb-24 md:pb-6 touch-pan-y">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto touch-pan-y">
          {filtered.map((comp) => {
            const linkedProjects = projects.filter((p) =>
              (comp.related_projects || []).includes(p.id)
            );
            const linkedContacts = people.filter((pe) =>
              (comp.related_people || []).includes(pe.id) || pe.organisation?.toLowerCase() === comp.name.toLowerCase()
            );

            return (
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
                        title="Edit Company"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete company ${comp.name}?`)) deleteCompany(comp.id);
                        }}
                        className="p-1 rounded text-ink-muted hover:text-rose-500"
                        title="Delete Company"
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

                  {/* Linked Contacts & Projects */}
                  {(linkedContacts.length > 0 || linkedProjects.length > 0) && (
                    <div className="pt-2.5 mt-2.5 border-t border-border-subtle/50 space-y-1.5">
                      {linkedContacts.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          <Users className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                          {linkedContacts.map((pe) => (
                            <span
                              key={pe.id}
                              className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                            >
                              {pe.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {linkedProjects.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          <Briefcase className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                          {linkedProjects.map((p) => (
                            <span
                              key={p.id}
                              className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium"
                            >
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Company Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl p-5 overflow-hidden flex flex-col max-h-[90vh] text-ink-primary dark:text-ink-darkPrimary animate-in zoom-in-95 duration-100">
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
            <form onSubmit={handleSave} className="space-y-3 text-xs overflow-y-auto pr-1">
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

              {/* Linked Projects Multi-Select */}
              {projects.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                    Related Projects
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl border border-border-subtle bg-surface-subtle/50">
                    {projects.map((proj) => {
                      const isSelected = selectedProjects.includes(proj.id);
                      return (
                        <button
                          type="button"
                          key={proj.id}
                          onClick={() => {
                            setSelectedProjects((prev) =>
                              isSelected ? prev.filter((id) => id !== proj.id) : [...prev, proj.id]
                            );
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                              : 'bg-surface dark:bg-surface-dark text-ink-muted border border-border-subtle hover:border-indigo-400'
                          }`}
                        >
                          {proj.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
  const {
    projects,
    technologies,
    companies,
    todos,
    createProject,
    updateProject,
    deleteProject,
  } = useVaultStore();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProj, setEditingProj] = useState<ProjectEntity | null>(null);

  const [name, setName] = useState('');
  const [status, setStatus] = useState('Active');
  const [description, setDescription] = useState('');
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  const openNewModal = () => {
    setEditingProj(null);
    setName('');
    setStatus('Active');
    setDescription('');
    setSelectedTechs([]);
    setSelectedCompanies([]);
    setIsModalOpen(true);
  };

  const openEditModal = (p: ProjectEntity) => {
    setEditingProj(p);
    setName(p.name);
    setStatus(p.status || 'Active');
    setDescription(p.description || '');
    setSelectedTechs(p.related_technologies || []);
    setSelectedCompanies(p.related_companies || []);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      status: status.trim() || 'Active',
      description: description.trim() || undefined,
      related_technologies: selectedTechs,
      related_companies: selectedCompanies,
    };

    if (editingProj) {
      await updateProject(editingProj.id, payload);
    } else {
      await createProject(payload);
    }
    setIsModalOpen(false);
  };

  const filtered = projects.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full space-y-4 pb-24 md:pb-6 touch-pan-y">
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
          <p className="mt-1">Track strategic initiatives, client deliverables, and technology stacks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto touch-pan-y">
          {filtered.map((proj) => {
            // Find linked technologies
            const linkedTechList = technologies.filter((t) =>
              (proj.related_technologies || []).includes(t.id)
            );
            // Find linked companies
            const linkedCompList = companies.filter((c) =>
              (proj.related_companies || []).includes(c.id)
            );
            // Find linked tasks
            const linkedTasks = todos.filter((t) => t.projectId === proj.id);
            const completedTasks = linkedTasks.filter((t) => t.completed || t.status === 'done');

            const statusStyle =
              PROJECT_STATUSES.find(
                (s) => s.label.toLowerCase() === (proj.status || '').toLowerCase()
              )?.color || 'bg-brand-light text-brand-primary border-brand-primary/20';

            return (
              <div
                key={proj.id}
                className="p-4 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark hover:border-brand-primary/40 transition shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2.5">
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
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block mt-0.5 border ${statusStyle}`}
                          >
                            {proj.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(proj)}
                        className="p-1 rounded text-ink-muted hover:text-ink-primary"
                        title="Edit Project"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete project ${proj.name}?`)) deleteProject(proj.id);
                        }}
                        className="p-1 rounded text-ink-muted hover:text-rose-500"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {proj.description && (
                    <p className="text-[11px] text-ink-muted line-clamp-3 leading-relaxed">
                      {proj.description}
                    </p>
                  )}

                  {/* Tech Stack Badges */}
                  {linkedTechList.length > 0 && (
                    <div className="pt-2 border-t border-border-subtle/50">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-1">
                        <Cpu className="w-3 h-3 text-purple-500" />
                        <span>Tech Stack ({linkedTechList.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {linkedTechList.map((t) => (
                          <span
                            key={t.id}
                            className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-medium border border-purple-500/20"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Linked Companies / Clients */}
                  {linkedCompList.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-ink-muted">
                      <Building2 className="w-3 h-3 text-sky-500 flex-shrink-0" />
                      {linkedCompList.map((c) => (
                        <span
                          key={c.id}
                          className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Connected Tasks Progress */}
                  {linkedTasks.length > 0 && (
                    <div className="flex items-center justify-between text-[10px] font-medium text-ink-muted pt-1 border-t border-border-subtle/40">
                      <span className="inline-flex items-center gap-1">
                        <ListTodo className="w-3 h-3 text-brand-primary" />
                        <span>
                          {completedTasks.length} / {linkedTasks.length} tasks done
                        </span>
                      </span>
                      <span className="text-brand-primary font-bold">
                        {Math.round((completedTasks.length / linkedTasks.length) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl p-5 overflow-hidden flex flex-col max-h-[90vh] text-ink-primary dark:text-ink-darkPrimary animate-in zoom-in-95 duration-100">
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
            <form onSubmit={handleSave} className="space-y-3.5 text-xs overflow-y-auto pr-1">
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
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s.label} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Technologies Multi-Select */}
              {technologies.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                    Technologies / Tech Stack
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl border border-border-subtle bg-surface-subtle/50">
                    {technologies.map((tech) => {
                      const isSelected = selectedTechs.includes(tech.id);
                      return (
                        <button
                          type="button"
                          key={tech.id}
                          onClick={() => {
                            setSelectedTechs((prev) =>
                              isSelected ? prev.filter((id) => id !== tech.id) : [...prev, tech.id]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${
                            isSelected
                              ? 'bg-purple-600 text-white font-semibold shadow-xs'
                              : 'bg-surface dark:bg-surface-dark text-ink-muted border border-border-subtle hover:border-purple-400'
                          }`}
                        >
                          {tech.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Companies Multi-Select */}
              {companies.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                    Related Companies / Clients
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl border border-border-subtle bg-surface-subtle/50">
                    {companies.map((comp) => {
                      const isSelected = selectedCompanies.includes(comp.id);
                      return (
                        <button
                          type="button"
                          key={comp.id}
                          onClick={() => {
                            setSelectedCompanies((prev) =>
                              isSelected ? prev.filter((id) => id !== comp.id) : [...prev, comp.id]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${
                            isSelected
                              ? 'bg-sky-600 text-white font-semibold shadow-xs'
                              : 'bg-surface dark:bg-surface-dark text-ink-muted border border-border-subtle hover:border-sky-400'
                          }`}
                        >
                          {comp.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  Save Project
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
  const {
    technologies,
    projects,
    people,
    createTechnology,
    updateTechnology,
    deleteTechnology,
  } = useVaultStore();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<TechnologyEntity | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Frontend');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const openNewModal = () => {
    setEditingTech(null);
    setName('');
    setCategory('Frontend');
    setWebsite('');
    setDescription('');
    setSelectedProjects([]);
    setIsModalOpen(true);
  };

  const openEditModal = (t: TechnologyEntity) => {
    setEditingTech(t);
    setName(t.name);
    setCategory(t.category || 'Frontend');
    setWebsite(t.website || '');
    setDescription(t.description || '');
    setSelectedProjects(t.related_projects || []);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      category: category.trim() || undefined,
      website: website.trim() || undefined,
      description: description.trim() || undefined,
      related_projects: selectedProjects,
    };

    if (editingTech) {
      await updateTechnology(editingTech.id, payload);
    } else {
      await createTechnology(payload);
    }
    setIsModalOpen(false);
  };

  const filtered = technologies.filter((t) => {
    if (selectedCategory !== 'all' && (t.category || 'General') !== selectedCategory) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full space-y-4 pb-24 md:pb-6 touch-pan-y">
      {/* Header & Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-ink-muted" />
            <input
              type="text"
              placeholder="Search technologies & frameworks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-ink-primary dark:text-ink-darkPrimary"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark text-ink-primary outline-none"
          >
            <option value="all">All Categories</option>
            {TECH_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
          <p className="mt-1">Track tech stack tools, frameworks, and developer tools linked to your Projects.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto touch-pan-y">
          {filtered.map((tech) => {
            // Find projects using this technology
            const connectedProjects = projects.filter(
              (p) =>
                (p.related_technologies || []).includes(tech.id) ||
                (tech.related_projects || []).includes(p.id)
            );

            // Find people with expertise in this technology
            const connectedPeople = people.filter((pe) =>
              (pe.related_technologies || []).includes(tech.id)
            );

            return (
              <div
                key={tech.id}
                className="p-4 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark hover:border-brand-primary/40 transition shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-xs">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-ink-primary dark:text-ink-darkPrimary">
                          {tech.name}
                        </h4>
                        {tech.category && (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-500/10 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            {tech.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(tech)}
                        className="p-1 rounded text-ink-muted hover:text-ink-primary"
                        title="Edit Technology"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete technology ${tech.name}?`)) deleteTechnology(tech.id);
                        }}
                        className="p-1 rounded text-ink-muted hover:text-rose-500"
                        title="Delete Technology"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {tech.website && (
                    <a
                      href={tech.website.startsWith('http') ? tech.website : `https://${tech.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-brand-primary hover:underline mt-1 truncate"
                    >
                      <Globe className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{tech.website}</span>
                    </a>
                  )}

                  {tech.description && (
                    <p className="text-[11px] text-ink-muted line-clamp-3 leading-relaxed">
                      {tech.description}
                    </p>
                  )}

                  {/* Connected Projects */}
                  {connectedProjects.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-border-subtle/50">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-1">
                        <Briefcase className="w-3 h-3 text-indigo-500" />
                        <span>Used in Projects ({connectedProjects.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {connectedProjects.map((p) => (
                          <span
                            key={p.id}
                            className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium border border-indigo-500/20"
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Connected People / Experts */}
                  {connectedPeople.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-ink-muted pt-1">
                      <Users className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      {connectedPeople.map((pe) => (
                        <span
                          key={pe.id}
                          className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                        >
                          {pe.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Technology Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl p-5 overflow-hidden flex flex-col max-h-[90vh] text-ink-primary dark:text-ink-darkPrimary animate-in zoom-in-95 duration-100">
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
            <form onSubmit={handleSave} className="space-y-3 text-xs overflow-y-auto pr-1">
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Technology / Framework *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. React 18, Supabase, Dexie.js, Docker"
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                >
                  {TECH_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Documentation / Website URL
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://react.dev"
                  className="w-full px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                />
              </div>

              {/* Projects using this Technology */}
              {projects.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                    Projects Using this Tech
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl border border-border-subtle bg-surface-subtle/50">
                    {projects.map((proj) => {
                      const isSelected = selectedProjects.includes(proj.id);
                      return (
                        <button
                          type="button"
                          key={proj.id}
                          onClick={() => {
                            setSelectedProjects((prev) =>
                              isSelected ? prev.filter((id) => id !== proj.id) : [...prev, proj.id]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                              : 'bg-surface dark:bg-surface-dark text-ink-muted border border-border-subtle hover:border-indigo-400'
                          }`}
                        >
                          {proj.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Description & Notes
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Usage context, architecture notes, or stack tier..."
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
                  Save Technology
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
