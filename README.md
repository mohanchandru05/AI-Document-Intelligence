# 📄 AI Document Intelligence

A production-ready, full-stack **Retrieval-Augmented Generation (RAG)** chatbot that allows users to upload PDF documents and ask questions via **text or voice**. 

The AI strictly answers based on the provided document and refuses to hallucinate.

## 🚀 Features

- **Document Ingestion:** Upload PDFs which are parsed, chunked, and embedded into a vector database.
- **Semantic Search:** Uses FAISS for lightning-fast, context-aware retrieval.
- **Local LLM Generation:** Uses `Llama 3.2` (via Ollama) to generate accurate answers.
- **Voice Input:** Integrated `OpenAI Whisper` running locally on GPU (CUDA) for speech-to-text.
- **Clean UI:** A modern, ChatGPT-style dark mode interface built with React.
- **Database Management:** Ability to clear the vector database and start fresh.

## 🛠️ Tech Stack

- **Frontend:** React, Vite, CSS
- **Backend:** Python, FastAPI, Uvicorn
- **AI/ML:** FAISS, Sentence-Transformers, OpenAI Whisper, PyTorch (CUDA)
- **LLM Host:** Ollama (Llama 3.2:1b)
- **Document Parsing:** pypdf

## ⚙️ How to Run Locally

### Prerequisites
- Python 3.9+
- Node.js & npm
- [Ollama](https://ollama.com/) installed and running (`ollama run llama3.2:1b`)
- ffmpeg installed (for audio processing)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Install PyTorch with CUDA support (if you have an NVIDIA GPU)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

# Start the FastAPI server
uvicorn main:app --reload

### 2.Frontend Setup

cd frontend
npm install
npm run dev