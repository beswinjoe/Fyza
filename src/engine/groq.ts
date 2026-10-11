import Groq from 'groq-sdk';

const apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROQ_API_KEY) || (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.VITE_GROQ_API_KEY);

let ai: Groq | null = null;
if (apiKey) {
  ai = new Groq({ apiKey, dangerouslyAllowBrowser: true });
}

export const getGroq = () => ai;
