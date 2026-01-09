
import { GoogleGenAI, Chat } from "@google/genai";
import { GEMINI_SYSTEM_INSTRUCTION } from '../constants';

let chatSession: Chat | null = null;

// Fix: Simplified API Key initialization to strictly use process.env.API_KEY
export const initializeChatSession = (apiKey: string) => {
  const finalKey = apiKey || process.env.API_KEY;
  if (!finalKey) return;
  
  try {
    // Fix: Initialize GoogleGenAI with named parameter apiKey
    const ai = new GoogleGenAI({ apiKey: finalKey });
    
    // Fix: Changed model to 'gemini-3-flash-preview' for rule arbitration tasks
    chatSession = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        temperature: 0.3, // Consistent reasoning for game rules
      },
    });
  } catch (error) {
    console.error("Failed to initialize Gemini session", error);
  }
};

export const sendMessageToArbiter = async (message: string): Promise<string> => {
  if (!chatSession) {
    // Fix: Rely on process.env.API_KEY directly for initialization if session is missing
    const key = process.env.API_KEY;
    if (key) {
      initializeChatSession(key);
    } else {
       console.warn("API Key missing for Arbiter.");
       return "The Arbiter is currently meditating (API Key missing).";
    }
  }

  try {
    if (!chatSession) throw new Error("Session failed to initialize");
    
    const response = await chatSession.sendMessage({ message });
    // Fix: Access .text as a property, not a method, as per SDK guidelines
    return response.text || "The Arbiter remains silent (No text returned).";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The Arbiter is currently unavailable.";
  }
};
