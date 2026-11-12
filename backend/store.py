import faiss
import json
import os
import numpy as np

DATA_DIR = "data"
INDEX_PATH = os.path.join(DATA_DIR, "index.faiss")
META_PATH = os.path.join(DATA_DIR, "meta.json")

EMBED_DIM = 384   # matches all-MiniLM-L6-v2

def load():
    if os.path.exists(INDEX_PATH) and os.path.exists(META_PATH):
        index = faiss.read_index(INDEX_PATH)
        with open(META_PATH, "r", encoding="utf-8") as f:
            meta = json.load(f)
    else:
        index = faiss.IndexFlatL2(EMBED_DIM)
        meta = []
    return index, meta

def save(index, meta):
    os.makedirs(DATA_DIR, exist_ok=True)
    faiss.write_index(index, INDEX_PATH)
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)