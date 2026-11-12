import os
import shutil
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ingestion import ingest_pdf
from qa import answer
from store import DATA_DIR
import whisper

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Whisper on GPU
print("Loading Whisper model...")
whisper_model = whisper.load_model("small", device="cuda")
print("Whisper model loaded on:", whisper_model.device)

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    tmp_path = f"tmp_{file.filename}"
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    try:
        count = ingest_pdf(tmp_path, file.filename)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
    return {"filename": file.filename, "chunks": count}

@app.post("/clear")
def clear_database():
    if os.path.exists(DATA_DIR):
        shutil.rmtree(DATA_DIR)
    return {"status": "cleared"}

class ChatReq(BaseModel):
    question: str

@app.post("/chat")
def chat(req: ChatReq):
    return answer(req.question)

@app.post("/voice")
async def voice_chat(file: UploadFile = File(...)):
    tmp_path = f"tmp_{file.filename}"
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    try:
        result = whisper_model.transcribe(tmp_path, language="en", fp16=True)
        question_text = result["text"].strip()

        if not question_text:
            return {"error": "Could not transcribe audio."}

        rag_response = answer(question_text)
        rag_response["transcribed_question"] = question_text
        return rag_response
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)