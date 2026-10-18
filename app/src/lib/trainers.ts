import { publicUrl, syncCommunityProfile } from './community';
import { backendAvailable, getSessionClient, getSupabase } from './supabase';

// Online trainers: people apply from Ajustes, the team approves them in the
// Supabase dashboard (table trainer_applications) and approved ones are listed.
// Fitness Life doesn't take part in payments: users contact trainers directly.

export interface TrainerFields {
    name: string;
    specialty: string;
    bio: string;
    experienceYears: number;
    certifications: string;
    languages: string;
    price: string;
    contact: string;
    country: string;
}

export interface Trainer extends TrainerFields {
    id: string;
    userId: string;
    status: 'pending' | 'approved' | 'rejected';
    avatarUrl: string | null;
}

export const trainersAvailable = backendAvailable;

type Row = {
    id: string; user_id: string; name: string; specialty: string; bio: string; experience_years: number; certifications: string;
    languages: string; price: string; contact: string; country: string; status: Trainer['status'];
    profile: { avatar_path: string | null; updated_at: string } | null;
};
const COLUMNS = 'id, user_id, name, specialty, bio, experience_years, certifications, languages, price, contact, country, status, profile:community_profiles!trainer_applications_user_id_fkey(avatar_path, updated_at)';

const fromRow = (r: Row): Trainer => ({
    id: r.id, userId: r.user_id, name: r.name, specialty: r.specialty, bio: r.bio, experienceYears: r.experience_years,
    certifications: r.certifications, languages: r.languages, price: r.price, contact: r.contact, country: r.country,
    status: r.status, avatarUrl: publicUrl(r.profile?.avatar_path ?? null, r.profile?.updated_at),
});

export const fetchTrainers = async (): Promise<Trainer[]> => {
    const supabase = await getSessionClient();
    const { data, error } = await supabase.from('trainer_applications').select(COLUMNS).eq('status', 'approved').order('updated_at', { ascending: false }).limit(100);
    if (error) throw error;
    return ((data ?? []) as unknown as Row[]).map(fromRow);
};

const myAccountId = async () => {
    const supabase = await getSupabase();
    const user = (await supabase.auth.getSession()).data.session?.user;
    return user && !user.is_anonymous ? user.id : null;
};

// The signed-in person's application, if any.
export const fetchMyApplication = async (): Promise<Trainer | null> => {
    const id = await myAccountId();
    if (!id) return null;
    const supabase = await getSupabase();
    const { data, error } = await supabase.from('trainer_applications').select(COLUMNS).eq('user_id', id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as unknown as Row) : null;
};

export const saveApplication = async (f: TrainerFields) => {
    const id = await myAccountId();
    if (!id) throw new Error('account required');
    await syncCommunityProfile(); // the application hangs off the community profile
    const supabase = await getSupabase();
    const { error } = await supabase.from('trainer_applications').upsert({
        user_id: id, name: f.name.trim(), specialty: f.specialty.trim(), bio: f.bio.trim(), experience_years: f.experienceYears,
        certifications: f.certifications.trim(), languages: f.languages.trim(), price: f.price.trim(), contact: f.contact.trim(), country: f.country.trim(),
    }, { onConflict: 'user_id' });
    if (error) throw error;
};

export const withdrawApplication = async () => {
    const id = await myAccountId();
    if (!id) return;
    const supabase = await getSupabase();
    const { error } = await supabase.from('trainer_applications').delete().eq('user_id', id);
    if (error) throw error;
};

// Where "Contact" goes: a web page, an e-mail, WhatsApp for a phone number,
// or Instagram for an @handle.
export const contactLink = (raw: string): string | null => {
    const c = raw.trim();
    if (/^https?:\/\//i.test(c)) return c;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return `mailto:${c}`;
    const digits = c.replace(/[\s()-]/g, '');
    if (/^\+?\d{7,15}$/.test(digits)) return `https://wa.me/${digits.replace('+', '')}`;
    if (/^@[\w.]{1,30}$/.test(c)) return `https://instagram.com/${c.slice(1)}`;
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(c)) return `https://${c}`;
    return null;
};
