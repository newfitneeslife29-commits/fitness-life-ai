import { LANGS } from '../i18n';
import { publicUrl, syncCommunityProfile } from './community';
import { backendAvailable, getSessionClient, getSupabase } from './supabase';

// Online trainers: people apply from Ajustes, the team (app admins) approves
// them from the app, sets the price shown and a payment link that pays
// Fitness Life. Trainers without a payment link are contacted directly.

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
    // Set by the team: the price shown in the app and where people pay it.
    appPrice: string;
    paymentUrl: string;
}

export const trainersAvailable = backendAvailable;

type Row = {
    id: string; user_id: string; name: string; specialty: string; bio: string; experience_years: number; certifications: string;
    languages: string; price: string; contact: string; country: string; status: Trainer['status'];
    app_price?: string; payment_url?: string;
    profile: { avatar_path: string | null; updated_at: string } | null;
};
const BASE_COLUMNS = 'id, user_id, name, specialty, bio, experience_years, certifications, languages, price, contact, country, status, profile:community_profiles!trainer_applications_user_id_fkey(avatar_path, updated_at)';
const COLUMNS = `${BASE_COLUMNS}, app_price, payment_url`;

const fromRow = (r: Row): Trainer => ({
    id: r.id, userId: r.user_id, name: r.name, specialty: r.specialty, bio: r.bio, experienceYears: r.experience_years,
    certifications: r.certifications, languages: r.languages, price: r.price, contact: r.contact, country: r.country,
    status: r.status, avatarUrl: publicUrl(r.profile?.avatar_path ?? null, r.profile?.updated_at),
    appPrice: r.app_price ?? '', paymentUrl: r.payment_url ?? '',
});

type Listed = Omit<Row, 'profile' | 'status' | 'price'> & { avatar_path: string | null; profile_updated_at: string | null };

// Approved trainers. The database hides the contact of those hired through a
// payment link. Before that update is deployed, the old public list.
export const fetchTrainers = async (): Promise<Trainer[]> => {
    const supabase = await getSessionClient();
    const listed = await supabase.rpc('trainers_listed');
    if (!listed.error) {
        return ((listed.data ?? []) as Listed[]).map(r => fromRow({
            ...r, status: 'approved', price: '', profile: r.avatar_path ? { avatar_path: r.avatar_path, updated_at: r.profile_updated_at ?? '' } : null,
        }));
    }
    if (listed.error.code !== 'PGRST202') throw listed.error;
    const { data, error } = await supabase.from('trainer_applications').select(BASE_COLUMNS).eq('status', 'approved').order('updated_at', { ascending: false }).limit(100);
    if (error) throw error;
    return ((data ?? []) as unknown as Row[]).map(fromRow);
};

// The team manages trainers from the app.
export const isTrainerAdmin = async () => {
    const id = await myAccountId();
    if (!id) return false;
    const supabase = await getSupabase();
    const { data, error } = await supabase.from('app_admins').select('user_id').eq('user_id', id).maybeSingle();
    return !error && !!data;
};

export const fetchApplications = async (): Promise<Trainer[]> => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from('trainer_applications').select(COLUMNS).order('updated_at', { ascending: false }).limit(300);
    if (error) throw error;
    return ((data ?? []) as unknown as Row[]).map(fromRow);
};

export const reviewApplication = async (id: string, review: { status: Trainer['status']; appPrice: string; paymentUrl: string }) => {
    const supabase = await getSupabase();
    const { error } = await supabase.from('trainer_applications')
        .update({ status: review.status, app_price: review.appPrice.trim(), payment_url: review.paymentUrl.trim() }).eq('id', id);
    if (error) throw error;
};

// Languages are saved as codes ("es,en"); older applications as free text.
export const LANGUAGE_CODES = LANGS.map(l => l.code) as string[];
export const trainerLanguages = (raw: string) => raw.split(/[,;/·]+/).map(s => s.trim()).filter(Boolean).map(token => {
    const known = LANGS.find(l => l.code === token.toLowerCase() || l.label.toLowerCase() === token.toLowerCase() || l.english.toLowerCase() === token.toLowerCase());
    return known ? { code: known.code as string, flag: known.flag, label: known.label } : { code: token.toLowerCase(), flag: '', label: token };
});

async function myAccountId() {
    const supabase = await getSupabase();
    const user = (await supabase.auth.getSession()).data.session?.user;
    return user && !user.is_anonymous ? user.id : null;
}

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
