import { useState, useRef } from "react";

const API = "http://localhost:8000";

// --- CLEAN SVG ICONS ---
const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const StopIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="6" width="12" height="12" rx="2"></rect>
  </svg>
);

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
      const data = await res.json();
      
      setMessages((m) => [
        ...m,
        { role: "system", text: `${data.filename}`, isSuccess: true },
      ]);
    } catch (err) {
      setMessages((m) => [...m, { role: "error", text: "Upload failed: " + err.message }]);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleClear() {
    if (!window.confirm("Are you sure you want to delete all documents?")) return;
    try {
      await fetch(`${API}/clear`, { method: "POST" });
      setMessages([]);
    } catch (err) {
      setMessages((m) => [...m, { role: "error", text: "Clear failed: " + err.message }]);
    }
  }

  async function handleSend() {
    const q = input.trim();
    if (!q || asking) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setAsking(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "bot", text: data.answer }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "error", text: "Request failed: " + err.message }]);
    } finally {
      setAsking(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendVoice(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      setMessages((m) => [...m, { role: "error", text: "Mic access denied: " + err.message }]);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function sendVoice(blob) {
    setAsking(true); 
    const fd = new FormData();
    fd.append("file", blob, "recording.webm");

    try {
      const res = await fetch(`${API}/voice`, { method: "POST", body: fd });
      const data = await res.json();
      
      if (data.error) {
        setMessages((m) => [...m, { role: "error", text: data.error }]);
        return;
      }

      setMessages((m) => [
        ...m,
        { role: "user", text: data.transcribed_question || "(could not transcribe)" },
        { role: "bot", text: data.answer },
      ]);
    } catch (err) {
      setMessages((m) => [...m, { role: "error", text: "Voice failed: " + err.message }]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>RAG Chatbot</h2>

      <div style={styles.chatBox}>
        {messages.length === 0 && (
          <p style={styles.muted}> Upload a PDF to get started. I will answer based only on your file.</p>
        )}
        {messages.map((m, i) => (
          <Message key={i} msg={m} />
        ))}
        {asking && <p style={styles.muted}>Thinking…</p>}
        {uploading && <p style={styles.muted}>Indexing PDF…</p>}
      </div>

      <div style={styles.inputContainer}>
        <input
          type="file"
          accept=".pdf"
          ref={fileInputRef}
          onChange={handleUpload}
          style={{ display: "none" }}
        />

        {/* Upload PDF Button (Plus Icon) */}
        <button onClick={handleAttachClick} disabled={uploading || asking || recording} style={styles.iconButton} title="Upload PDF">
          <PlusIcon />
        </button>

        {/* Clear Database Button (Trash Icon) */}
        <button onClick={handleClear} disabled={uploading || asking || recording} style={styles.iconButton} title="Clear Database">
          <TrashIcon />
        </button>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={recording ? "Recording..." : "Ask a question..."}
          rows={1}
          style={styles.textarea}
          disabled={asking || recording}
        />

        {/* Voice Record Button (Mic / Stop Icon) */}
        <button 
          onClick={recording ? stopRecording : startRecording} 
          disabled={asking || uploading}
          style={{ ...styles.iconButton, color: recording ? "#ef4444" : "#ccc", backgroundColor: recording ? "rgba(239, 68, 68, 0.1)" : "transparent", borderRadius: "50%" }} 
          title={recording ? "Stop Recording" : "Ask by Voice"}
        >
          {recording ? <StopIcon /> : <MicIcon />}
        </button>

        <button onClick={handleSend} disabled={asking || !input.trim() || recording} style={styles.sendButton}>
          Send
        </button>
      </div>
    </div>
  );
}

function Message({ msg }) {
  if (msg.role === "system") {
    if (msg.isSuccess) {
      return (
        <div style={styles.systemRow}>
          <div style={styles.fileBadge}>
            <span style={{ color: "#10b981", marginRight: "8px" }}>✓</span> {msg.text}
          </div>
        </div>
      );
    }
    return <p style={styles.system}>{msg.text}</p>;
  }
  
  if (msg.role === "error") return <p style={styles.error}>{msg.text}</p>;
  
  if (msg.role === "user") {
    return (
      <div style={styles.userRow}>
        <div style={styles.userBubble}>{msg.text}</div>
      </div>
    );
  }
  
  return (
    <div style={styles.botRow}>
      <div style={styles.botBubble}>
        <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
      </div>
    </div>
  );
}

const styles = {
  page: { 
    maxWidth: 800, 
    margin: "0 auto", 
    height: "100vh", 
    display: "flex", 
    flexDirection: "column",
    fontFamily: "system-ui, -apple-system, sans-serif", 
    padding: "20px",
    boxSizing: "border-box"
  },
  title: { margin: "0 0 16px 0", color: "#fff", fontWeight: "600" },
  chatBox: { 
    flex: 1, 
    overflowY: "auto", 
    paddingBottom: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16
  },
  inputContainer: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#2f2f2f",
    borderRadius: "24px",
    padding: "8px 12px",
    gap: "4px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
  },
  iconButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    color: "#ccc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s"
  },
  textarea: {
    flex: 1,
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "16px",
    padding: "8px",
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
    maxHeight: "120px",
    margin: "0 8px"
  },
  sendButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "20px",
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  systemRow: { display: "flex", justifyContent: "flex-start", width: "100%", margin: "5px 0" },
  fileBadge: { 
    backgroundColor: "#1e293b", 
    color: "#e2e8f0", 
    padding: "8px 16px", 
    borderRadius: "8px", 
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    border: "1px solid #334155"
  },
  system: { color: "#059669", fontSize: 13, textAlign: "center" },
  error: { color: "#dc2626", fontSize: 13, textAlign: "center" },
  muted: { color: "#888", fontSize: 14, textAlign: "center", marginTop: 20 },
  userRow: { display: "flex", justifyContent: "flex-end", width: "100%" },
  userBubble: { 
    background: "#2563eb", 
    color: "white", 
    padding: "12px 16px", 
    borderRadius: "18px", 
    borderBottomRightRadius: "4px",
    maxWidth: "75%" 
  },
  botRow: { display: "flex", justifyContent: "flex-start", width: "100%" },
  botBubble: { 
    background: "#2f2f2f", 
    color: "#eee",
    padding: "12px 16px", 
    borderRadius: "18px", 
    borderBottomLeftRadius: "4px",
    maxWidth: "85%" 
  },
};