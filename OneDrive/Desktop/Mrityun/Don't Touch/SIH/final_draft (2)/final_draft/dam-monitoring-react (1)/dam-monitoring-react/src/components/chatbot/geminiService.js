import { buildChatbotContext } from "./chatbotContext.js";
import { generateLocalResponse } from "./chatbotEngine.js";

export class FlowGuardGeminiService {
  /**
   * Send a user query to the Gemini AI backend endpoint with full application context and recent conversation history.
   * Securely uses the backend GEMINI_API_KEY without exposing credentials to the client.
   */
  async sendMessage(userMessage, contextState, history = []) {
    const rawContext = buildChatbotContext(contextState);

    // Build comprehensive context summary for Gemini
    const contextSummary = {
      currentPage: rawContext.currentRouteName,
      selectedDam: rawContext.dam,
      modelParameters: rawContext.inputs,
      simulationResult: rawContext.simulation.hasRun
        ? rawContext.simulation
        : "No simulation executed in this session yet.",
      exportFormats: [
        "Engineering Dossier (PDF)",
        "Hydrograph & Reach Timeseries (CSV)",
        "Flood Boundary & Inundation Polygons (GeoJSON)",
        "Calibrated HEC-RAS / Delft3D Scenario Package (JSON)",
      ],
    };

    // Primary: Call the backend Gemini-powered AI endpoint
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: userMessage,
          context: contextSummary,
          history: history.slice(-6),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.text === "string" && data.text.trim().length > 0) {
          return data.text.trim();
        }
      } else {
        console.warn("[FlowGuard AI] Backend returned status", response.status);
      }
    } catch (networkErr) {
      console.warn("[FlowGuard AI] Backend fetch error, activating local fallback:", networkErr);
    }

    // High-fidelity fallback engine (strictly respects context, anti-hallucination, and out-of-scope rules)
    return generateLocalResponse(userMessage, contextState);
  }
}

export const flowGuardGemini = new FlowGuardGeminiService();

