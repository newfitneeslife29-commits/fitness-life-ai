import { supabase } from './supabaseClient';

// All AI calls go through the `ai-coach` Supabase Edge Function, which holds
// the Gemini key and enforces per-user quotas. Nothing secret lives here.

const fallback = (summary: string) => JSON.stringify({ type: 'chat', summary });

async function invokeCoach(body: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-coach', { body });
  if (error) {
    // A 429 carries a friendly limit message in its body.
    const context = (error as { context?: Response }).context;
    if (context?.status === 429) {
      const limited = await context.json().catch(() => null);
      if (limited?.text) return limited.text;
    }
    throw error;
  }
  return data?.text ?? '';
}

export const getChatResponse = async (
  message: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[]
) => {
  try {
    return await invokeCoach({ action: 'chat', message, history });
  } catch (error) {
    console.error("AI chat error:", error);
    return fallback("I'm having trouble connecting to the server. Please try again.");
  }
};

export const analyzeImage = async (base64Image: string, prompt: string) => {
  try {
    return await invokeCoach({ action: 'image', base64: base64Image, prompt, mimeType: 'image/jpeg' });
  } catch (error) {
    console.error("AI vision error:", error);
    return fallback("I couldn't analyze that image. Please ensure it's clear.");
  }
};

export const analyzeVideo = async (base64Video: string, prompt: string, mimeType: string = 'video/mp4') => {
  return invokeCoach({ action: 'video', base64: base64Video, prompt, mimeType });
};
