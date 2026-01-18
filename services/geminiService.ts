import { GoogleGenAI, Chat } from "@google/genai";
import { GEMINI_SYSTEM_INSTRUCTION } from '../constants';

let chatSession: Chat | null = null;

// Fix: Use process.env.API_KEY exclusively as per SDK guidelines and initialize correctly
export const initializeChatSession = () => {
  if (!process.env.API_KEY) return;
  
  try {
    // Always use process.env.API_KEY and named parameter for initialization
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Model for arbitration should be gemini-3-flash-preview as per task type
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
    // Attempt initialization if session is missing, strictly using process.env.API_KEY
    initializeChatSession();
    
    if (!chatSession) {
       console.warn("API Key missing for Arbiter.");
       return "The Arbiter is currently meditating (API Key missing).";
    }
  }

  try {
    if (!chatSession) throw new Error("Session failed to initialize");
    
    // Use sendMessage with proper message parameter
    const response = await chatSession.sendMessage({ message });
    // Correctly access .text as a property as per current SDK version
    return response.text || "The Arbiter remains silent (No text returned).";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The Arbiter is currently unavailable.";
  }
};