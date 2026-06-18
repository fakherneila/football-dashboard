// frontend/src/components/AIAnalyst.jsx
import { useState } from "react";
import api from "../services/api";

function AIAnalyst() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await api.post("/chat", { question });
      setAnswer(res.data.answer || "No answer received");
    } catch (error) {
      setAnswer("AI agent unavailable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 800, margin: "0 auto" }}>
      <div className="card-title">🤖 AI Business Analyst</div>
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about sales data..."
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "inherit",
            fontSize: "1rem",
            outline: "none",
          }}
          onKeyPress={(e) => e.key === "Enter" && handleAsk()}
        />
        <button
          onClick={handleAsk}
          disabled={loading}
          style={{
            padding: "12px 24px",
            background: "#1E5A8A",
            border: "none",
            borderRadius: "12px",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </div>
      {answer && (
        <div
          style={{
            padding: "16px",
            background: "rgba(30, 90, 138, 0.1)",
            borderRadius: "12px",
            border: "1px solid rgba(30, 90, 138, 0.2)",
            lineHeight: 1.6,
          }}
        >
          {answer}
        </div>
      )}
    </div>
  );
}

export default AIAnalyst;
