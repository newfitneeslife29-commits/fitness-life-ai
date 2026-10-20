import { actions, getState } from '../store/store';
import type { Routine, RoutineExercise } from '../store/types';
import { getSupabase } from './supabase';
import { cleanRoutine } from './trainerTools';

// Programs that trainers sell for a one-time payment (several routines for a
// number of weeks). Buying goes through Stripe (trainerPay.buyProgram); the
// buyer's routines are added from program_content.

export interface Program {
    id: string;
    trainerId: string;
    trainerName: string;
    title: string;
    description: string;
    weeks: number;
    priceCents: number;
    currency: string;
    routineCount: number;
    owned: boolean;
    sales: number;
}

type ListedRow = {
    id: string; trainer_id: string; trainer_name: string; title: string; description: string; weeks: number;
    price_cents: number; currency: string; routine_count: number; owned: boolean; sales: number;
};

const missing = (e: { code?: string } | null) => e?.code === 'PGRST202' || e?.code === '42P01' || e?.code === 'PGRST205';

export const fetchPrograms = async (): Promise<Program[]> => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc('programs_listed');
    if (error) {
        if (missing(error)) return [];
        throw error;
    }
    return ((data ?? []) as ListedRow[]).map(r => ({
        id: r.id, trainerId: r.trainer_id, trainerName: r.trainer_name, title: r.title, description: r.description, weeks: r.weeks,
        priceCents: r.price_cents, currency: r.currency, routineCount: r.routine_count, owned: r.owned, sales: r.sales,
    }));
};

// The bought programs' routines, into Routines (once each; `again` adds one more time).
export const addProgramRoutines = async (programId: string): Promise<string | null> => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc('program_content', { program: programId });
    if (error) throw error;
    const row = (data as { title: string; routines: unknown[] }[] | null)?.[0];
    if (!row) return null;
    for (const r of row.routines ?? []) {
        const routine = cleanRoutine(r);
        if (routine) actions.saveRoutine({ ...routine, name: `${row.title} · ${routine.name}`.slice(0, 80) });
    }
    actions.markProgramAdded(programId);
    return row.title;
};

export const receivePrograms = async (programs?: Program[]): Promise<string[]> => {
    const list = programs ?? await fetchPrograms();
    const added = new Set(getState().programsAdded ?? []);
    const titles: string[] = [];
    for (const p of list.filter(x => x.owned && !added.has(x.id))) {
        const title = await addProgramRoutines(p.id).catch(() => null);
        if (title) titles.push(title);
    }
    return titles;
};

// ---------- The trainer's own programs ----------

export interface MyProgram {
    id: string;
    title: string;
    description: string;
    weeks: number;
    priceCents: number;
    currency: string;
    routines: { name: string; exercises: RoutineExercise[] }[];
    published: boolean;
    sales: number;
}

export const fetchMyPrograms = async (trainerId: string): Promise<MyProgram[]> => {
    const supabase = await getSupabase();
    const [{ data, error }, sales] = await Promise.all([
        supabase.from('trainer_programs').select('id, title, description, weeks, price_cents, currency, routines, published')
            .eq('trainer_id', trainerId).order('created_at', { ascending: false }),
        supabase.rpc('my_program_sales'),
    ]);
    if (error) {
        if (missing(error)) return [];
        throw error;
    }
    const sold = new Map(((sales.data ?? []) as { program_id: string; sales: number }[]).map(s => [s.program_id, s.sales]));
    return ((data ?? []) as { id: string; title: string; description: string; weeks: number; price_cents: number; currency: string; routines: MyProgram['routines']; published: boolean }[])
        .map(r => ({ id: r.id, title: r.title, description: r.description, weeks: r.weeks, priceCents: r.price_cents, currency: r.currency, routines: r.routines, published: r.published, sales: sold.get(r.id) ?? 0 }));
};

export const saveProgram = async (trainerId: string, program: {
    id?: string; title: string; description: string; weeks: number; priceCents: number; currency: string; routines: Pick<Routine, 'name' | 'exercises'>[];
}) => {
    const supabase = await getSupabase();
    const row = {
        title: program.title.trim(), description: program.description.trim(), weeks: program.weeks, price_cents: program.priceCents,
        currency: program.currency, routines: program.routines.map(r => ({ name: r.name, exercises: r.exercises })),
    };
    const { error } = program.id
        ? await supabase.from('trainer_programs').update(row).eq('id', program.id)
        : await supabase.from('trainer_programs').insert({ ...row, trainer_id: trainerId });
    if (error) throw error;
};

export const setProgramPublished = async (id: string, published: boolean) => {
    const supabase = await getSupabase();
    const { error } = await supabase.from('trainer_programs').update({ published }).eq('id', id);
    if (error) throw error;
};

// false when it has buyers (it can only be paused then).
export const deleteProgram = async (id: string): Promise<boolean> => {
    const supabase = await getSupabase();
    const { error } = await supabase.from('trainer_programs').delete().eq('id', id);
    if (error) {
        if (/program_has_buyers/.test(error.message)) return false;
        throw error;
    }
    return true;
};
