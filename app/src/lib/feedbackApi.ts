import { Capacitor } from '@capacitor/core';
import { getLang } from '../i18n';
import { backendAvailable, getSessionClient } from './supabase';
import { appVersion } from './updates';

// Comments from Ajustes → "Enviar comentarios", saved in the app_feedback
// table (read in the Supabase dashboard).

export type FeedbackKind = 'idea' | 'problem' | 'praise' | 'other';
export const FEEDBACK_KINDS: FeedbackKind[] = ['idea', 'problem', 'praise', 'other'];

export const feedbackAvailable = backendAvailable;

export class FeedbackError extends Error {
    constructor(public code: 'network' | 'limit' | 'failed') {
        super(code);
    }
}

export const sendFeedback = async (fb: { kind: FeedbackKind; rating: number | null; message: string; email: string }) => {
    let supabase;
    try {
        supabase = await getSessionClient();
    } catch {
        throw new FeedbackError('network');
    }
    const { error } = await supabase.from('app_feedback').insert({
        kind: fb.kind,
        rating: fb.rating,
        message: fb.message.trim().slice(0, 2000),
        email: fb.email.trim().slice(0, 200) || null,
        lang: getLang(),
        app_version: (await appVersion()) ?? 'web',
        platform: Capacitor.getPlatform(),
    });
    if (!error) return;
    if (error.message.includes('feedback limit')) throw new FeedbackError('limit');
    throw new FeedbackError(error.message.toLowerCase().includes('fetch') ? 'network' : 'failed');
};
