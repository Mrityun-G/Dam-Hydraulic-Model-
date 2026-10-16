/**
 * Flow Guard AI: Floating Chatbot Assistant
 * Renders ONLY on inner application pages.
 * Supports Light, Dark, and Hybrid themes using application CSS variables.
 * Never invents facts; provides direct access to live dam specifications and simulation results.
 */

import React, { useState, useEffect, useRef } from "react";
import { flowGuardGemini } from "./geminiService.js";
import { generateLocalResponse } from "./chatbotEngine.js";
import { interpretScenario } from "../../services/api.js";

const QUICK_PROMPTS = [
  { label: "Selected Dam Specs", query: "Which dam is currently selected and what are its dimensions?" },
  { label: "Active Inputs", query: "What are the current failure mode and breach parameters?" },
  { label: "Simulation Results", query: "What is the peak outflow discharge and inundation area?" },
  { label: "SPH vs Delft3D", query: "What is the difference between 2D SWE, SPH, and Delft3D?" },
  { label: "Export Dossier", query: "What data formats can I export from this platform?" },
];

export default function FlowGuardChatbot({
  selectedDamId,
  modelParameters,
  simulationResult,
  activeRoute,
  themeMode = "hybrid",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      sender: "bot",
      text: "Hello! I am **Flow Guard AI**, your dam safety and flood hydrodynamic assistant. Ask me about the active dam, model inputs, simulation results, or hydrodynamic solvers.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const formatMessageText = (text) => {
    const parts = (text || "").split("\n");
    return parts.map((line, idx) => {
      const boldFormatted = line.split(/(\*\*.*?\*\*)/g).map((chunk, cIdx) => {
        if (chunk.startsWith("**") && chunk.endsWith("**")) {
          return <strong key={cIdx}>{chunk.slice(2, -2)}</strong>;
        }
        return chunk;
      });

      if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
        return (
          <div key={idx} style={{ paddingLeft: "12px", marginTop: "2px", marginBottom: "2px" }}>
            {boldFormatted}
          </div>
        );
      }
      return (
        <p key={idx} style={{ margin: "4px 0", lineHeight: "1.45" }}>
          {boldFormatted}
        </p>
      );
    });
  };

  const handleSendMessage = async (textToSend) => {
    const userQuery = (textToSend || inputText).trim();
    if (!userQuery || isProcessing) return;

    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userQuery,
      timestamp: timeString,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsProcessing(true);

    try {
      const contextState = {
        selectedDamId,
        modelParameters,
        simulationResult,
        activeRoute,
        themeMode,
      };

      // Get conversation history formatted for model
      const historyForModel = messages
        .filter((m) => m.id !== "welcome-1")
        .slice(-8)
        .map((m) => ({
          role: m.sender === "user" ? "user" : "model",
          text: m.text,
        }));

      // Send to Google Gemini with live context and conversation history
      const answer = await flowGuardGemini.sendMessage(userQuery, contextState, historyForModel);

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: answer || "That information is not available in the current Flow Guard data.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("[FlowGuard AI] Chat generation error:", err);
      const errMsg = err?.message || "Flow Guard AI is temporarily unavailable.";
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: "bot",
          text: `Flow Guard AI is temporarily unavailable. (${errMsg})`,
          isError: true,
          failedQuery: userQuery,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flowguard-chatbot-root" data-theme={themeMode}>
      {/* 1. Floating Toggle Button */}
      {!isOpen && (
        <button
          className="flowguard-chatbot-fab"
          onClick={() => setIsOpen(true)}
          aria-label="Open Flow Guard AI Chatbot"
          title="Open Flow Guard AI"
        >
          <div className="flowguard-fab-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </div>
          <span className="flowguard-fab-label">Flow Guard AI</span>
          <span className="flowguard-fab-pulse" />
        </button>
      )}

      {/* 2. Floating Chat Panel */}
      {isOpen && (
        <div className="flowguard-chat-panel">
          {/* Header */}
          <div className="flowguard-chat-header">
            <div className="flowguard-header-info">
              <div className="flowguard-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <div>
                <div className="flowguard-title">FLOW GUARD AI</div>
                <div className="flowguard-subtitle">Dam Safety & Flood Intelligence Assistant</div>
              </div>
            </div>
            <div className="flowguard-header-actions">
              <button
                className="flowguard-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close Chat"
                title="Minimize chat"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Questions Row */}
          <div className="flowguard-quick-chips">
            {QUICK_PROMPTS.map((item, i) => (
              <button
                key={i}
                className="flowguard-chip-btn"
                onClick={() => handleSendMessage(item.query)}
                disabled={isProcessing}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flowguard-messages-container">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flowguard-message-bubble ${m.sender === "user" ? "flowguard-user-bubble" : "flowguard-bot-bubble"} ${m.isError ? "flowguard-error-bubble" : ""}`}
              >
                <div className="flowguard-message-content">
                  {formatMessageText(m.text)}
                </div>
                {m.isError && m.failedQuery && (
                  <div style={{ marginTop: "6px" }}>
                    <button
                      className="flowguard-retry-btn"
                      onClick={() => handleSendMessage(m.failedQuery)}
                      disabled={isProcessing}
                    >
                      Retry
                    </button>
                  </div>
                )}
                <div className="flowguard-message-meta">{m.timestamp}</div>
              </div>
            ))}
            {isProcessing && (
              <div className="flowguard-message-bubble flowguard-bot-bubble flowguard-typing">
                <span style={{ fontSize: "0.8rem", marginRight: "6px", opacity: 0.85 }}>
                  Flow Guard AI is thinking...
                </span>
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="flowguard-input-area">
            <input
              ref={inputRef}
              type="text"
              className="flowguard-input-field"
              placeholder="Ask about dam specs, breach inputs, or results..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
            />
            <button
              className="flowguard-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isProcessing}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
