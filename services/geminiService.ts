import { GoogleGenAI, Chat } from "@google/genai";
import { GEMINI_SYSTEM_INSTRUCTION } from '../constants';

let chatSession: Chat | null = null;

// Safe access to environment variable
const getApiKey = (): string | undefined => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return undefined;
};

export const initializeChatSession = (apiKey: string) => {
  if (!apiKey) return;
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Using gemini-2.5-flash for fast, responsive answers
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        temperature: 0.3, // Keep it consistent and rule-abiding
      },
    });
  } catch (error) {
    console.error("Failed to initialize Gemini session", error);
  }
};

export const sendMessageToArbiter = async (message: string): Promise<string> => {
  if (!chatSession) {
    // If session isn't initialized, try to init with env
    const key = getApiKey();
    if (key) {
      initializeChatSession(key);
    } else {
       // Graceful fallback if key is missing
       console.warn("API Key missing for Arbiter.");
       return "The Arbiter is currently meditating (API Key missing).";
    }
  }

  try {
    if (!chatSession) throw new Error("Session failed to initialize");
    
    const response = await chatSession.sendMessage({ message });
    return response.text || "The Arbiter remains silent (No text returned).";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The Arbiter is currently unavailable.";
  }
};