from sentence_transformers import SentenceTransformer
from store import load
from llm import ask_llm

model = SentenceTransformer("all-MiniLM-L6-v2")

def answer(question, k=4):
    index, meta = load()

    if index.ntotal == 0 or not meta:
        return {"answer": "No documents have been uploaded yet.", "sources": []}

    q_vec = model.encode([question], convert_to_numpy=True).astype("float32")
    scores, ids = index.search(q_vec, k)

    hits = []
    for score, idx in zip(scores[0], ids[0]):
        if idx == -1 or idx >= len(meta):
            continue
        hits.append({
            "text": meta[idx]["text"],
            "page": meta[idx]["page"],
            "filename": meta[idx]["filename"],
            "score": float(score),
        })

    if not hits:
        return {"answer": "No relevant content found.", "sources": []}

    context = "\n\n".join(
        f"[{h['filename']} p.{h['page']}]\n{h['text']}" for h in hits
    )

    # STRICTER PROMPT
    prompt = f"""You are a helpful AI assistant. 
Answer the user's question using ONLY the context below.
If the context does not contain the answer, say "Not found in the provided documents."
Do not use outside knowledge. 
Do not write introductory phrases like "Based on the context" or "According to the text". Just provide the direct answer.

Context:
{context}

Question: {question}

Answer:"""

    reply = ask_llm(prompt)

    # CLEANUP LOGIC: Strip out common robotic intros if the LLM ignores the prompt
    import re
    reply = re.sub(r'^Based on the provided context,?\s*(the answer to the question.*?is:?)?\s*', '', reply, flags=re.IGNORECASE)
    reply = re.sub(r'^According to the context,?\s*', '', reply, flags=re.IGNORECASE)
    reply = reply.strip()

    return {
        "answer": reply,
        "sources": [
            {"filename": h["filename"], "page": h["page"],
             "snippet": h["text"][:200], "score": round(h["score"], 4)}
            for h in hits
        ],
    }