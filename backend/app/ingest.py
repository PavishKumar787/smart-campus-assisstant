from pathlib import Path
import fitz  # PyMuPDF

def extract_text_from_pdf(path: Path):
    doc = fitz.open(str(path))
    pages = []
    for p in doc:
        pages.append(p.get_text("text") or "")
    return pages

def chunk_text(text: str, chunk_size: int = 400, overlap: int = 100):
    # chunk by words
    words = text.split()
    if not words:
        return []
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i+chunk_size])
        chunks.append(chunk)
        i += (chunk_size - overlap)
    return chunks
