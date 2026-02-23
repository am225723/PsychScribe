import React, { useState, useEffect, useRef } from 'react';
import { getPatients, createPatient, updatePatient, deletePatient, importPatients, mergePatients, getFullName } from '../services/supabaseService';
import type { Patient } from '../services/supabaseService';

export const PatientDatabase: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelected, setMergeSelected] = useState<Set<string>>(new Set());
  const [mergePrimaryId, setMergePrimaryId] = useState<string | null>(null);
  const [mergeConfirm, setMergeConfirm] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeMessage, setMergeMessage] = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await getPatients();
      setPatients(data);
    } catch (err: any) {
      console.error('Failed to load patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    const fullName = getFullName(p).toLowerCase();
    return (
      fullName.includes(q) ||
      (p.client_id || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.phone || '').includes(q)
    );
  });

  const openAddForm = () => {
    setEditingPatient(null);
    setFormFirstName('');
    setFormLastName('');
    setFormClientId('');
    setFormDob('');
    setFormEmail('');
    setFormPhone('');
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (patient: Patient) => {
    setEditingPatient(patient);
    setFormFirstName(patient.first_name);
    setFormLastName(patient.last_name);
    setFormClientId(patient.client_id || '');
    setFormDob(patient.dob || '');
    setFormEmail(patient.email || '');
    setFormPhone(patient.phone || '');
    setFormError('');
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFirstName.trim() || !formLastName.trim()) {
      setFormError('First name and last name are required.');
      return;
    }
    setFormSaving(true);
    setFormError('');

    try {
      if (editingPatient) {
        await updatePatient(editingPatient.id, {
          first_name: formFirstName,
          last_name: formLastName,
          client_id: formClientId,
          dob: formDob,
          email: formEmail,
          phone: formPhone,
        });
      } else {
        await createPatient(formFirstName, formLastName, formDob, formClientId, formEmail, formPhone);
      }
      setShowForm(false);
      await loadPatients();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save patient.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (patientId: string) => {
    try {
      await deletePatient(patientId);
      setDeleteConfirm(null);
      await loadPatients();
    } catch (err: any) {
      console.error('Failed to delete patient:', err);
    }
  };

  const toggleMergeSelect = (patientId: string) => {
    setMergeSelected((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) {
        next.delete(patientId);
        if (mergePrimaryId === patientId) setMergePrimaryId(null);
      } else {
        next.add(patientId);
      }
      return next;
    });
  };

  const startMergeMode = () => {
    setMergeMode(true);
    setMergeSelected(new Set());
    setMergePrimaryId(null);
    setMergeConfirm(false);
    setMergeMessage('');
  };

  const cancelMerge = () => {
    setMergeMode(false);
    setMergeSelected(new Set());
    setMergePrimaryId(null);
    setMergeConfirm(false);
  };

  const handleMerge = async () => {
    if (!mergePrimaryId || mergeSelected.size < 2) return;
    setMerging(true);
    setMergeMessage('');
    try {
      const secondaryIds = [...mergeSelected].filter((id) => id !== mergePrimaryId);
      const result = await mergePatients(mergePrimaryId, secondaryIds);
      setMergeMessage(
        `Merged ${secondaryIds.length} duplicate${secondaryIds.length !== 1 ? 's' : ''} into primary patient. ${result.movedReports} report${result.movedReports !== 1 ? 's' : ''} transferred.`
      );
      cancelMerge();
      await loadPatients();
    } catch (err: any) {
      setMergeMessage(`Merge failed: ${err.message}`);
    } finally {
      setMerging(false);
    }
  };

  const mergeSelectedPatients = patients.filter((p) => mergeSelected.has(p.id));
  const primaryPatient = mergePrimaryId ? patients.find((p) => p.id === mergePrimaryId) : null;

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMessage('');

    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setImportMessage('CSV file must have a header row and at least one data row.');
        return;
      }

      const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/["\ufeff]/g, ''));
      let firstNameIdx = header.findIndex(h => h === 'first_name' || h === 'first name' || h === 'firstname');
      let lastNameIdx = header.findIndex(h => h === 'last_name' || h === 'last name' || h === 'lastname');
      const fullNameIdx = header.findIndex(h => h.includes('name') || h === 'full_name' || h === 'patient');
      const idIdx = header.findIndex(h => h.includes('client') || h === 'client_id');
      const dobIdx = header.findIndex(h => h.includes('dob') || h.includes('birth') || h.includes('date_of_birth'));
      const emailIdx = header.findIndex(h => h.includes('email'));
      const phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('cell'));

      if (firstNameIdx === -1 && lastNameIdx === -1 && fullNameIdx !== -1) {
        const firstDataRow = lines[1]?.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (firstDataRow && firstDataRow.length > fullNameIdx + 1) {
          const nextHeader = header[fullNameIdx + 1] || '';
          const nextValue = firstDataRow[fullNameIdx + 1] || '';
          if ((nextHeader === '' || nextHeader === 'last name' || nextHeader === 'last_name' || nextHeader === 'lastname') && nextValue && !nextValue.includes('@') && !nextValue.includes('/') && !nextValue.match(/^\(\d/)) {
            firstNameIdx = fullNameIdx;
            lastNameIdx = fullNameIdx + 1;
          }
        }
      }

      const hasFirstLast = firstNameIdx !== -1 && lastNameIdx !== -1;
      if (!hasFirstLast && fullNameIdx === -1) {
        setImportMessage('CSV must have "First Name" and "Last Name" columns, or a "Name" / "Full Name" column.');
        return;
      }

      const records: { first_name: string; last_name: string; dob?: string; client_id?: string; email?: string; phone?: string }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        let firstName = '';
        let lastName = '';

        if (hasFirstLast) {
          firstName = cols[firstNameIdx] || '';
          lastName = cols[lastNameIdx] || '';
        } else {
          const fullName = cols[fullNameIdx] || '';
          const parts = fullName.trim().split(/\s+/).filter(Boolean);
          if (parts.length === 0) continue;
          if (parts.length === 1) {
            firstName = parts[0];
            lastName = '';
          } else {
            lastName = parts.pop()!;
            firstName = parts.join(' ');
          }
        }

        if (!firstName && !lastName) continue;
        records.push({
          first_name: firstName,
          last_name: lastName,
          client_id: idIdx >= 0 ? cols[idIdx] : undefined,
          dob: dobIdx >= 0 ? cols[dobIdx] : undefined,
          email: emailIdx >= 0 ? cols[emailIdx] : undefined,
          phone: phoneIdx >= 0 ? cols[phoneIdx] : undefined,
        });
      }

      if (records.length === 0) {
        setImportMessage('No valid patient records found in CSV.');
        return;
      }

      console.log(`[CSV Import] Parsed ${records.length} records from CSV`);
      console.log(`[CSV Import] Column mapping — firstNameIdx: ${firstNameIdx}, lastNameIdx: ${lastNameIdx}, fullNameIdx: ${fullNameIdx}, idIdx: ${idIdx}, dobIdx: ${dobIdx}, emailIdx: ${emailIdx}, phoneIdx: ${phoneIdx}`);
      console.log(`[CSV Import] Header: ${JSON.stringify(header)}`);
      console.log(`[CSV Import] First record:`, JSON.stringify(records[0]));

      const result = await importPatients(records);
      const parts: string[] = [];
      if (result.imported > 0) parts.push(`${result.imported} new`);
      if (result.updated > 0) parts.push(`${result.updated} updated`);
      if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
      if (result.errors.length > 0) parts.push(`${result.errors.length} failed`);

      let msg = `Import complete: ${parts.join(', ')}.`;
      if (result.errors.length > 0) {
        const firstErr = result.errors[0];
        msg += ` First error: ${firstErr.patient} — ${firstErr.message}${firstErr.code ? ` (${firstErr.code})` : ''}`;
      }
      setImportMessage(msg);
      await loadPatients();
    } catch (err: any) {
      console.error('[CSV Import] Fatal error:', err);
      setImportMessage(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-users text-2xl text-teal-700"></i>
        </div>
        <h2 className="text-2xl font-black text-teal-950 uppercase tracking-tight">Patient Database</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-teal-800/40 mt-1">Manage Patient Records</p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-teal-300"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, client ID, email, or phone..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-teal-100 bg-white focus:ring-4 focus:ring-teal-50 focus:border-teal-200 outline-none text-teal-950 font-bold text-sm placeholder:text-teal-800/15"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={openAddForm}
            className="px-5 py-3 rounded-2xl bg-teal-900 text-white font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg"
          >
            <i className="fa-solid fa-user-plus"></i>
            Add Patient
          </button>
          <button
            onClick={() => {
              const csv = 'First Name,Last Name,DOB,Email,Phone,Client ID\nJane,Doe,01/15/1990,jane@email.com,(555) 123-4567,CL-001\n';
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'patient_import_template.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-5 py-3 rounded-2xl bg-white text-slate-500 border border-slate-200 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-download"></i>
            Template
          </button>
          <button
            onClick={() => csvInputRef.current?.click()}
            disabled={importing}
            className="px-5 py-3 rounded-2xl bg-white text-teal-700 border border-teal-200 font-black text-xs uppercase tracking-widest hover:bg-teal-50 transition-all flex items-center gap-2"
          >
            <i className={`fa-solid ${importing ? 'fa-circle-notch animate-spin' : 'fa-file-csv'}`}></i>
            {importing ? 'Importing...' : 'Import CSV'}
          </button>
          {!mergeMode ? (
            <button
              onClick={startMergeMode}
              className="px-5 py-3 rounded-2xl bg-white text-indigo-600 border border-indigo-200 font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-code-merge"></i>
              Merge Patients
            </button>
          ) : (
            <button
              onClick={cancelMerge}
              className="px-5 py-3 rounded-2xl bg-white text-slate-500 border border-slate-200 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-xmark"></i>
              Cancel Merge
            </button>
          )}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvImport}
            className="hidden"
          />
        </div>
      </div>

      {(importMessage || mergeMessage) && (
        <div className={`mb-4 p-4 rounded-2xl flex items-center gap-3 ${
          (importMessage || mergeMessage).includes('Successfully') || (importMessage || mergeMessage).includes('Merged')
            ? 'bg-emerald-50 border border-emerald-200'
            : (importMessage || mergeMessage).includes('failed') || (importMessage || mergeMessage).includes('Failed')
              ? 'bg-red-50 border border-red-200'
              : 'bg-emerald-50 border border-emerald-200'
        }`}>
          <i className={`fa-solid ${
            (importMessage || mergeMessage).includes('failed') || (importMessage || mergeMessage).includes('Failed')
              ? 'fa-circle-exclamation text-red-500'
              : 'fa-circle-check text-emerald-500'
          }`}></i>
          <span className={`text-sm font-bold ${
            (importMessage || mergeMessage).includes('failed') || (importMessage || mergeMessage).includes('Failed')
              ? 'text-red-700'
              : 'text-emerald-700'
          }`}>{importMessage || mergeMessage}</span>
          <button onClick={() => { setImportMessage(''); setMergeMessage(''); }} className="ml-auto text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {mergeMode && (
        <div className="mb-6 bg-indigo-50/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-indigo-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
              <i className="fa-solid fa-code-merge text-lg"></i>
            </div>
            <div>
              <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Merge Patients</h3>
              <p className="text-[10px] font-bold text-indigo-600/60 uppercase tracking-wider">
                Select 2 or more patients to merge, then choose which one to keep as the primary record
              </p>
            </div>
          </div>

          {mergeSelected.size > 0 && (
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-800/50">
                {mergeSelected.size} patient{mergeSelected.size !== 1 ? 's' : ''} selected — choose which to keep as primary:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mergeSelectedPatients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setMergePrimaryId(p.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      mergePrimaryId === p.id
                        ? 'border-indigo-500 bg-indigo-100 shadow-md'
                        : 'border-indigo-100 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                      mergePrimaryId === p.id ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      {mergePrimaryId === p.id ? <i className="fa-solid fa-crown text-xs"></i> : p.initials}
                    </div>
                    <div className="flex-grow min-w-0">
                      <span className="text-sm font-bold text-indigo-950 block truncate">{getFullName(p)}</span>
                      <span className="text-[9px] font-bold text-indigo-600/50 uppercase">
                        {mergePrimaryId === p.id ? 'Primary — will be kept' : 'Will be merged into primary'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {mergeSelected.size >= 2 && mergePrimaryId && (
                <div className="pt-2">
                  {!mergeConfirm ? (
                    <button
                      onClick={() => setMergeConfirm(true)}
                      disabled={merging}
                      className="w-full py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      <i className="fa-solid fa-code-merge"></i>
                      Merge {mergeSelected.size - 1} Patient{mergeSelected.size - 1 !== 1 ? 's' : ''} into {primaryPatient ? getFullName(primaryPatient) : ''}
                    </button>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold text-red-800">
                        <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                        This will permanently delete {mergeSelected.size - 1} patient record{mergeSelected.size - 1 !== 1 ? 's' : ''} and move all their reports to <strong>{primaryPatient ? getFullName(primaryPatient) : ''}</strong>. This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleMerge}
                          disabled={merging}
                          className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {merging ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-check"></i>}
                          {merging ? 'Merging...' : 'Confirm Merge'}
                        </button>
                        <button
                          onClick={() => setMergeConfirm(false)}
                          disabled={merging}
                          className="px-5 py-2.5 rounded-xl bg-white text-slate-500 border border-slate-200 font-bold text-xs uppercase tracking-widest hover:bg-slate-50"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {mergeSelected.size < 2 && (
            <p className="text-xs font-bold text-indigo-600/50 flex items-center gap-2">
              <i className="fa-solid fa-arrow-down"></i>
              Use the checkboxes in the table below to select patients to merge
            </p>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-teal-50 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-teal-950 uppercase tracking-tight">
              {editingPatient ? 'Edit Patient' : 'Add New Patient'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-1">First Name *</label>
              <input
                type="text"
                value={formFirstName}
                onChange={(e) => setFormFirstName(e.target.value)}
                placeholder="John"
                required
                className="w-full px-4 py-3 rounded-xl border border-teal-100 bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-200 outline-none text-teal-950 font-bold text-sm placeholder:text-teal-800/15"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-1">Last Name *</label>
              <input
                type="text"
                value={formLastName}
                onChange={(e) => setFormLastName(e.target.value)}
                placeholder="Doe"
                required
                className="w-full px-4 py-3 rounded-xl border border-teal-100 bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-200 outline-none text-teal-950 font-bold text-sm placeholder:text-teal-800/15"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-1">Client ID</label>
              <input
                type="text"
                value={formClientId}
                onChange={(e) => setFormClientId(e.target.value)}
                placeholder="CL-12345"
                className="w-full px-4 py-3 rounded-xl border border-teal-100 bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-200 outline-none text-teal-950 font-bold text-sm placeholder:text-teal-800/15"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-1">Date of Birth</label>
              <input
                type="date"
                value={formDob}
                onChange={(e) => setFormDob(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-teal-100 bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-200 outline-none text-teal-950 font-bold text-sm"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-1">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-4 py-3 rounded-xl border border-teal-100 bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-200 outline-none text-teal-950 font-bold text-sm placeholder:text-teal-800/15"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-1">Phone</label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 rounded-xl border border-teal-100 bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-200 outline-none text-teal-950 font-bold text-sm placeholder:text-teal-800/15"
              />
            </div>
            {formError && (
              <div className="sm:col-span-2 lg:col-span-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation text-red-500 text-xs"></i>
                <span className="text-xs font-bold text-red-700">{formError}</span>
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl bg-white text-slate-500 border border-slate-200 font-bold text-xs uppercase tracking-widest hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="px-5 py-2.5 rounded-xl bg-teal-900 text-white font-bold text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {formSaving ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-check"></i>}
                {editingPatient ? 'Update' : 'Add Patient'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-teal-50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <i className="fa-solid fa-circle-notch animate-spin text-teal-600 text-2xl"></i>
            <p className="text-xs font-bold text-teal-800/40 mt-3 uppercase tracking-widest">Loading patients...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <i className="fa-solid fa-user-slash text-3xl text-slate-200 mb-3"></i>
            <p className="text-sm font-bold text-slate-400">
              {search ? 'No patients match your search' : 'No patients yet'}
            </p>
            <p className="text-xs text-slate-300 mt-1">
              {search ? 'Try a different search term' : 'Add patients manually or import from CSV'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-teal-50">
                  {mergeMode && (
                    <th className="w-12 px-3 py-4 text-center text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">
                      <i className="fa-solid fa-code-merge"></i>
                    </th>
                  )}
                  <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40">Name</th>
                  <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40">Client ID</th>
                  <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40">Email</th>
                  <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40">Phone</th>
                  <th className="text-right px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient) => {
                  const isSelectedForMerge = mergeSelected.has(patient.id);
                  return (
                  <tr key={patient.id} className={`border-b border-teal-50/50 hover:bg-teal-50/30 transition-colors ${
                    isSelectedForMerge ? 'bg-indigo-50/40' : ''
                  }`}>
                    {mergeMode && (
                      <td className="w-12 px-3 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelectedForMerge}
                          onChange={() => toggleMergeSelect(patient.id)}
                          className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-200 cursor-pointer accent-indigo-600"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                          isSelectedForMerge && mergePrimaryId === patient.id
                            ? 'bg-indigo-500 text-white'
                            : 'bg-teal-100 text-teal-700'
                        }`}>
                          {isSelectedForMerge && mergePrimaryId === patient.id
                            ? <i className="fa-solid fa-crown text-xs"></i>
                            : patient.initials
                          }
                        </div>
                        <span className="font-bold text-sm text-teal-950">{getFullName(patient)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-medium">{patient.client_id || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-medium">{patient.email || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-medium">{patient.phone || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditForm(patient)}
                          className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-100 transition-all"
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen text-xs"></i>
                        </button>
                        {deleteConfirm === patient.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(patient.id)}
                              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[9px] font-bold uppercase hover:bg-red-600 transition-all"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[9px] font-bold uppercase hover:bg-slate-200 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(patient.id)}
                            className="w-8 h-8 rounded-lg bg-white text-slate-300 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
                            title="Delete"
                          >
                            <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-6 py-3 bg-slate-50/50 border-t border-teal-50 flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-teal-800/30">
            {filtered.length} patient{filtered.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-teal-800/30">
            {patients.length} total
          </span>
        </div>
      </div>

      <div className="mt-6 bg-slate-50 rounded-2xl p-5">
        <p className="text-[9px] font-black uppercase tracking-widest text-teal-800/40 mb-2">CSV Import Format</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your CSV file should have a header row. The system will look for columns:
          <strong className="text-teal-800"> "First Name"</strong> and <strong className="text-teal-800">"Last Name"</strong> (or a single <strong className="text-teal-800">"Name"</strong> column),
          <strong className="text-teal-800"> "Client ID"</strong>,
          <strong className="text-teal-800"> "Email"</strong>, and
          <strong className="text-teal-800"> "Phone"</strong>.
          Existing patients (matched by name) will have their info updated rather than duplicated.
        </p>
        <div className="mt-3 bg-white rounded-xl p-3 border border-slate-200">
          <code className="text-[10px] text-slate-600 font-mono">
            First Name, Last Name, Client ID, Email, Phone<br/>
            John, Doe, CL-12345, john@email.com, (555) 123-4567<br/>
            Jane, Smith, CL-67890, jane@email.com, (555) 987-6543
          </code>
        </div>
      </div>
    </div>
  );
};
