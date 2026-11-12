import os
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from store import load, save

# Loaded once at import time
model = SentenceTransformer("all-MiniLM-L6-v2")

def split_text(text, size=500, overlap=75):
    chunks = []
    i = 0
    while i < len(text):
        chunk = text[i:i + size].strip()
        if chunk:
            chunks.append(chunk)
        i += size - overlap
    return chunks

def ingest_pdf(path, filename):
    reader = PdfReader(path)
    chunks = []

    for page_no, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        for c in split_text(text):
            chunks.append({
                "text": c,
                "page": page_no,
                "filename": filename,
            })

    if not chunks:
        return 0

    vectors = model.encode(
        [c["text"] for c in chunks],
        convert_to_numpy=True,
        normalize_embeddings=False,
    ).astype("float32")

    index, meta = load()
    index.add(vectors)
    meta.extend(chunks)
    save(index, meta)

    return len(chunks)