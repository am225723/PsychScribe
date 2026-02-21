import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Patient {
  id: string;
  full_name: string;
  initials: string;
  dob?: string;
  client_id?: string;
  created_at: string;
  updated_at: string;
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

function extractInitials(name: string): string {
  const parts = name.split(' ').filter(n => n.length > 0);
  if (parts.length === 0) return 'XX';
  const first = parts[0][0]?.toUpperCase() || 'X';
  const last = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : 'X';
  return first + last;
}

export async function findOrCreatePatient(fullName: string, dob?: string, clientId?: string): Promise<Patient> {
  const cleanName = fullName.replace(/\*+/g, '').trim();
  const { data: existing } = await supabase
    .from('patients')
    .select('*')
    .ilike('full_name', cleanName)
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
      full_name: cleanName,
      initials: extractInitials(cleanName),
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
    results = results.filter((r: any) =>
      r.patient?.full_name?.toLowerCase().includes(q)
    );
  }

  if (filters?.sortBy === 'name') {
    results.sort((a: any, b: any) =>
      (a.patient?.full_name || '').localeCompare(b.patient?.full_name || '')
    );
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

export async function updatePatient(patientId: string, updates: { full_name?: string; dob?: string; client_id?: string }): Promise<Patient> {
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.full_name !== undefined) {
    patch.full_name = updates.full_name.trim();
    patch.initials = extractInitials(updates.full_name.trim());
  }
  if (updates.dob !== undefined) patch.dob = updates.dob || null;
  if (updates.client_id !== undefined) patch.client_id = updates.client_id || null;

  const { data, error } = await supabase
    .from('patients')
    .update(patch)
    .eq('id', patientId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update patient: ${error.message}`);
  return data!;
}

export async function createPatient(fullName: string, dob?: string, clientId?: string): Promise<Patient> {
  const cleanName = fullName.replace(/\*+/g, '').trim();
  const { data, error } = await supabase
    .from('patients')
    .insert({
      full_name: cleanName,
      initials: extractInitials(cleanName),
      dob: dob || null,
      client_id: clientId || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create patient: ${error.message}`);
  return data!;
}

export async function importPatients(patients: { full_name: string; dob?: string; client_id?: string }[]): Promise<number> {
  let imported = 0;
  for (const p of patients) {
    const cleanName = p.full_name.replace(/\*+/g, '').trim();
    if (!cleanName) continue;

    const { data: existing } = await supabase
      .from('patients')
      .select('id')
      .ilike('full_name', cleanName)
      .limit(1);

    if (existing && existing.length > 0) {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (p.dob) updates.dob = p.dob;
      if (p.client_id) updates.client_id = p.client_id;
      await supabase.from('patients').update(updates).eq('id', existing[0].id);
    } else {
      await supabase.from('patients').insert({
        full_name: cleanName,
        initials: extractInitials(cleanName),
        dob: p.dob || null,
        client_id: p.client_id || null,
      });
    }
    imported++;
  }
  return imported;
}
