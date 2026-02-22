import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  initials: string;
  dob?: string;
  client_id?: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export function getFullName(patient: Patient): string {
  return `${patient.first_name} ${patient.last_name}`.trim();
}

export interface Report {
  id: string;
  patient_id: string;
  document_type: 'summary' | 'treatment' | 'darp';
  content: string;
  is_urgent: boolean;
  created_at: string;
  patient?: Patient;
}

function extractInitials(firstName: string, lastName: string): string {
  const first = firstName.trim()[0]?.toUpperCase() || 'X';
  const last = lastName.trim()[0]?.toUpperCase() || 'X';
  return first + last;
}

function splitFullName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(n => n.length > 0);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  const last = parts.pop()!;
  return { first_name: parts.join(' '), last_name: last };
}

export async function findOrCreatePatient(fullName: string, dob?: string, clientId?: string): Promise<Patient> {
  const cleanName = fullName.replace(/\*+/g, '').trim();
  const { first_name, last_name } = splitFullName(cleanName);

  const { data: existing } = await supabase
    .from('patients')
    .select('*')
    .ilike('first_name', first_name)
    .ilike('last_name', last_name)
    .limit(1);

  if (existing && existing.length > 0) {
    const updates: Record<string, string> = { updated_at: new Date().toISOString() };
    if (dob && !existing[0].dob) updates.dob = dob;
    if (clientId && !existing[0].client_id) updates.client_id = clientId;

    const { data: updated } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', existing[0].id)
      .select()
      .single();

    return updated || existing[0];
  }

  const { data: created, error } = await supabase
    .from('patients')
    .insert({
      first_name,
      last_name,
      initials: extractInitials(first_name, last_name),
      dob: dob || null,
      client_id: clientId || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create patient: ${error.message}`);
  return created!;
}

export async function saveReport(patientId: string, documentType: string, content: string, isUrgent: boolean): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      patient_id: patientId,
      document_type: documentType,
      content,
      is_urgent: isUrgent,
    })
    .select('*, patient:patients(*)')
    .single();

  if (error) throw new Error(`Failed to save report: ${error.message}`);
  return data!;
}

export async function getReports(filters?: {
  searchQuery?: string;
  documentType?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'newest' | 'oldest' | 'name';
}): Promise<Report[]> {
  let query = supabase
    .from('reports')
    .select('*, patient:patients(*)');

  if (filters?.documentType && filters.documentType !== 'all') {
    query = query.eq('document_type', filters.documentType);
  }

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters?.dateTo) {
    const endDate = new Date(filters.dateTo);
    endDate.setDate(endDate.getDate() + 1);
    query = query.lt('created_at', endDate.toISOString());
  }

  if (filters?.sortBy === 'oldest') {
    query = query.order('created_at', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch reports: ${error.message}`);

  let results = data || [];

  if (filters?.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    results = results.filter((r: any) => {
      const p = r.patient;
      if (!p) return false;
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      return fullName.includes(q);
    });
  }

  if (filters?.sortBy === 'name') {
    results.sort((a: any, b: any) => {
      const nameA = `${a.patient?.last_name || ''} ${a.patient?.first_name || ''}`;
      const nameB = `${b.patient?.last_name || ''} ${b.patient?.first_name || ''}`;
      return nameA.localeCompare(nameB);
    });
  }

  return results;
}

export async function getPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch patients: ${error.message}`);
  return data || [];
}

export async function getPatientReports(patientId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*, patient:patients(*)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch patient reports: ${error.message}`);
  return data || [];
}

export async function deleteReport(reportId: string): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId);

  if (error) throw new Error(`Failed to delete report: ${error.message}`);
}

export async function deletePatient(patientId: string): Promise<void> {
  await supabase.from('reports').delete().eq('patient_id', patientId);
  const { error } = await supabase.from('patients').delete().eq('id', patientId);
  if (error) throw new Error(`Failed to delete patient: ${error.message}`);
}

export async function updatePatient(patientId: string, updates: { first_name?: string; last_name?: string; dob?: string; client_id?: string; email?: string; phone?: string }): Promise<Patient> {
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.first_name !== undefined) patch.first_name = updates.first_name.trim();
  if (updates.last_name !== undefined) patch.last_name = updates.last_name.trim();
  if (updates.first_name !== undefined || updates.last_name !== undefined) {
    const fn = updates.first_name ?? '';
    const ln = updates.last_name ?? '';
    patch.initials = extractInitials(fn, ln);
  }
  if (updates.dob !== undefined) patch.dob = updates.dob || null;
  if (updates.client_id !== undefined) patch.client_id = updates.client_id || null;
  if (updates.email !== undefined) patch.email = updates.email || null;
  if (updates.phone !== undefined) patch.phone = updates.phone || null;

  const { data, error } = await supabase
    .from('patients')
    .update(patch)
    .eq('id', patientId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update patient: ${error.message}`);
  return data!;
}

export async function createPatient(firstName: string, lastName: string, dob?: string, clientId?: string, email?: string, phone?: string): Promise<Patient> {
  const cleanFirst = firstName.replace(/\*+/g, '').trim();
  const cleanLast = lastName.replace(/\*+/g, '').trim();
  const { data, error } = await supabase
    .from('patients')
    .insert({
      first_name: cleanFirst,
      last_name: cleanLast,
      initials: extractInitials(cleanFirst, cleanLast),
      dob: dob || null,
      client_id: clientId || null,
      email: email || null,
      phone: phone || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create patient: ${error.message}`);
  return data!;
}

export async function mergePatients(primaryId: string, secondaryIds: string[]): Promise<{ movedReports: number }> {
  let movedReports = 0;
  for (const secId of secondaryIds) {
    const { data: reports } = await supabase
      .from('reports')
      .select('id')
      .eq('patient_id', secId);

    if (reports && reports.length > 0) {
      const { error } = await supabase
        .from('reports')
        .update({ patient_id: primaryId })
        .eq('patient_id', secId);
      if (error) throw new Error(`Failed to move reports: ${error.message}`);
      movedReports += reports.length;
    }

    const { error: delError } = await supabase
      .from('patients')
      .delete()
      .eq('id', secId);
    if (delError) throw new Error(`Failed to delete merged patient: ${delError.message}`);
  }

  await supabase
    .from('patients')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', primaryId);

  return { movedReports };
}

export async function importPatients(patients: { first_name: string; last_name: string; dob?: string; client_id?: string; email?: string; phone?: string }[]): Promise<number> {
  let imported = 0;
  for (const p of patients) {
    const cleanFirst = p.first_name.replace(/\*+/g, '').trim();
    const cleanLast = p.last_name.replace(/\*+/g, '').trim();
    if (!cleanFirst && !cleanLast) continue;

    const { data: existing } = await supabase
      .from('patients')
      .select('id')
      .ilike('first_name', cleanFirst)
      .ilike('last_name', cleanLast)
      .limit(1);

    if (existing && existing.length > 0) {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (p.dob) updates.dob = p.dob;
      if (p.client_id) updates.client_id = p.client_id;
      if (p.email) updates.email = p.email;
      if (p.phone) updates.phone = p.phone;
      await supabase.from('patients').update(updates).eq('id', existing[0].id);
    } else {
      await supabase.from('patients').insert({
        first_name: cleanFirst,
        last_name: cleanLast,
        initials: extractInitials(cleanFirst, cleanLast),
        dob: p.dob || null,
        client_id: p.client_id || null,
        email: p.email || null,
        phone: p.phone || null,
      });
    }
    imported++;
  }
  return imported;
}
