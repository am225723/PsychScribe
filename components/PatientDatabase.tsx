import React, { useState, useEffect, useRef } from 'react';
import { getPatients, createPatient, updatePatient, deletePatient, importPatients } from '../services/supabaseService';
import type { Patient } from '../services/supabaseService';

export const PatientDatabase: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formName, setFormName] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
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
    return (
      p.full_name.toLowerCase().includes(q) ||
      (p.client_id || '').toLowerCase().includes(q) ||
      (p.dob || '').includes(q)
    );
  });

  const openAddForm = () => {
    setEditingPatient(null);
    setFormName('');
    setFormClientId('');
    setFormDob('');
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (patient: Patient) => {
    setEditingPatient(patient);
    setFormName(patient.full_name);
    setFormClientId(patient.client_id || '');
    setFormDob(patient.dob || '');
    setFormError('');
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Patient name is required.');
      return;
    }
    setFormSaving(true);
    setFormError('');

    try {
      if (editingPatient) {
        await updatePatient(editingPatient.id, {
          full_name: formName,
          client_id: formClientId,
          dob: formDob,
        });
      } else {
        await createPatient(formName, formDob, formClientId);
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

      const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      const nameIdx = header.findIndex(h => h.includes('name') || h === 'full_name' || h === 'patient');
      const idIdx = header.findIndex(h => h.includes('client') || h.includes('id') || h === 'client_id');
      const dobIdx = header.findIndex(h => h.includes('dob') || h.includes('birth') || h.includes('date_of_birth'));

      if (nameIdx === -1) {
        setImportMessage('CSV must have a column with "name" in the header (e.g., "Name", "Full Name", "Patient").');
        return;
      }

      const records: { full_name: string; dob?: string; client_id?: string }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const name = cols[nameIdx];
        if (!name) continue;
        records.push({
          full_name: name,
          client_id: idIdx >= 0 ? cols[idIdx] : undefined,
          dob: dobIdx >= 0 ? cols[dobIdx] : undefined,
        });
      }

      if (records.length === 0) {
        setImportMessage('No valid patient records found in CSV.');
        return;
      }

      const count = await importPatients(records);
      setImportMessage(`Successfully imported ${count} patient${count !== 1 ? 's' : ''}.`);
      await loadPatients();
    } catch (err: any) {
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
            placeholder="Search by name, client ID, or DOB..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-teal-100 bg-white focus:ring-4 focus:ring-teal-50 focus:border-teal-200 outline-none text-teal-950 font-bold text-sm placeholder:text-teal-800/15"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={openAddForm}
            className="px-5 py-3 rounded-2xl bg-teal-900 text-white font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg"
          >
            <i className="fa-solid fa-user-plus"></i>
            Add Patient
          </button>
          <button
            onClick={() => csvInputRef.current?.click()}
            disabled={importing}
            className="px-5 py-3 rounded-2xl bg-white text-teal-700 border border-teal-200 font-black text-xs uppercase tracking-widest hover:bg-teal-50 transition-all flex items-center gap-2"
          >
            <i className={`fa-solid ${importing ? 'fa-circle-notch animate-spin' : 'fa-file-csv'}`}></i>
            {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvImport}
            className="hidden"
          />
        </div>
      </div>

      {importMessage && (
        <div className={`mb-4 p-4 rounded-2xl flex items-center gap-3 ${
          importMessage.includes('Successfully') ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
        }`}>
          <i className={`fa-solid ${importMessage.includes('Successfully') ? 'fa-circle-check text-emerald-500' : 'fa-circle-exclamation text-red-500'}`}></i>
          <span className={`text-sm font-bold ${importMessage.includes('Successfully') ? 'text-emerald-700' : 'text-red-700'}`}>{importMessage}</span>
          <button onClick={() => setImportMessage('')} className="ml-auto text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark"></i>
          </button>
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
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-1">Full Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="John Doe"
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
            {formError && (
              <div className="sm:col-span-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation text-red-500 text-xs"></i>
                <span className="text-xs font-bold text-red-700">{formError}</span>
              </div>
            )}
            <div className="sm:col-span-3 flex justify-end gap-2">
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
                  <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40">Name</th>
                  <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40">Client ID</th>
                  <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40">DOB</th>
                  <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40">Added</th>
                  <th className="text-right px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient) => (
                  <tr key={patient.id} className="border-b border-teal-50/50 hover:bg-teal-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-black text-xs">
                          {patient.initials}
                        </div>
                        <span className="font-bold text-sm text-teal-950">{patient.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-medium">{patient.client_id || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-medium">{patient.dob || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(patient.created_at).toLocaleDateString()}
                      </span>
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
                ))}
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
          Your CSV file should have a header row. The system will look for columns containing
          <strong className="text-teal-800"> "name"</strong> (required),
          <strong className="text-teal-800"> "client" or "id"</strong> (for client ID), and
          <strong className="text-teal-800"> "dob" or "birth"</strong> (for date of birth).
          Existing patients (matched by name) will have their info updated rather than duplicated.
        </p>
        <div className="mt-3 bg-white rounded-xl p-3 border border-slate-200">
          <code className="text-[10px] text-slate-600 font-mono">
            Full Name, Client ID, DOB<br/>
            John Doe, CL-12345, 1990-05-15<br/>
            Jane Smith, CL-67890, 1985-12-01
          </code>
        </div>
      </div>
    </div>
  );
};
