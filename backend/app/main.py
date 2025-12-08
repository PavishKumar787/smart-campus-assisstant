# backend/app/main.py
from fastapi import FastAPI, File, UploadFile, HTTPException, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
from pydantic import BaseModel
import uuid
import traceback
import os
from typing import List, Optional
import re
import json
import logging

# local imports - import DB, ingest, vecstore BEFORE auth to avoid circular imports
from .db import documents, chunks
from .ingest import extract_text_from_pdf, chunk_text
from .vecstore import VSTORE

# RAG / LLM helper (Groq) - make sure rag.py exists and exposes these
from .rag import call_groq_chat, build_rag_prompt, build_summary_prompt, build_quiz_prompt

# Setup logger
logger = logging.getLogger("uvicorn.error")

# Upload directory
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Smart Campus Assistant - Backend MVP")

# include auth router AFTER DB/VSTORE are available to avoid import-order problems
from .auth import router as auth_router
app.include_router(auth_router)

# Primary CORS middleware (development - adjust for production)
# NOTE: using Bearer tokens in Authorization header -> credentials False is fine.
# If you plan to use cookies, replace allow_origins with explicit origins and set allow_credentials=True.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only: allow all origins (change in prod)
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dev fallback: ensure CORS headers are present on every response (helps OPTIONS/preflight)
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    # If it's an OPTIONS preflight, return a quick response with required headers
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
        return JSONResponse(status_code=200, content={"detail": "ok (preflight)"}, headers=headers)

    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

@app.get("/documents")
async def list_documents():
    """
    Return list of uploaded documents for the UI sidebar/history.
    """
    try:
        cursor = documents.find(
            {},
            {
                "_id": 1,
                "title": 1,
                "filename": 1,
                "num_pages": 1,
                "num_chunks": 1,
            },
        )
        docs_list = []
        for d in cursor:
            docs_list.append(
                {
                    "_id": str(d.get("_id")),
                    "title": d.get("title"),
                    "filename": d.get("filename"),
                    "num_pages": d.get("num_pages"),
                    "num_chunks": d.get("num_chunks"),
                }
            )
        return {"documents": docs_list}
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {e}")

# ----------------------------
# Request models
# ----------------------------
class QueryReq(BaseModel):
    question: str
    top_k: int = 5

class AnswerReq(BaseModel):
    question: str
    top_k: int = 6
    length: Optional[str] = "short"

class SummarizeReq(BaseModel):
    question: Optional[str] = None
    doc_id: Optional[str] = None
    top_k: int = 20
    length: str = "short"  # short / medium / long

class QuizReq(BaseModel):
    question: Optional[str] = None
    doc_id: Optional[str] = None
    top_k: int = 20
    q_type: str = "mcq"  # "mcq" or "short"
    count: int = 5

# ----------------------------
# Startup: ensure VSTORE is populated from Mongo if empty
# ----------------------------
@app.on_event("startup")
def load_vectorestore_from_mongo():
    try:
        # Only load if VSTORE looks empty (avoid duplicating vectors on reload)
        try:
            ntotal = getattr(VSTORE.index, "ntotal", None)
        except Exception:
            ntotal = None

        if ntotal and int(ntotal) > 0:
            logger.info(f"VSTORE already contains {ntotal} vectors; skipping Mongo load.")
            return

        logger.info("VSTORE appears empty. Loading chunks from MongoDB into VSTORE...")
        # fetch all chunks (consider streaming if very large)
        mongo_chunks_cursor = chunks.find({}, {"_id": 0, "doc_id": 1, "title": 1, "page": 1, "chunk_index": 1, "text": 1})
        docs_to_add = []
        count = 0
        for c in mongo_chunks_cursor:
            # ensure shape VSTORE.add_docs expects
            docs_to_add.append({
                "doc_id": c.get("doc_id"),
                "title": c.get("title", "Untitled"),
                "page": c.get("page", None),
                "chunk_index": c.get("chunk_index", None),
                "text": c.get("text", "") or ""
            })
            count += 1
            # batch add every 500 docs to avoid memory spike
            if len(docs_to_add) >= 500:
                VSTORE.add_docs(docs_to_add)
                docs_to_add = []
        if docs_to_add:
            VSTORE.add_docs(docs_to_add)
        logger.info(f"Loaded {count} chunks from MongoDB into VSTORE.")
    except Exception as e:
        logger.exception("Failed to load chunks into VSTORE at startup: %s", e)

# ----------------------------
# Root / health
# ----------------------------
@app.get("/")
async def root():
    return {"status": "backend running"}

# ----------------------------
# Upload endpoint
# ----------------------------
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), title: str | None = None):
    # Basic validation
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are allowed.")

    if not title:
        title = file.filename or "untitled"

    # generate ids and safe filename
    file_id = str(uuid.uuid4())
    safe_filename = (file.filename or "uploaded").replace("/", "_").replace("\\", "_")
    out_path = UPLOAD_DIR / f"{file_id}_{safe_filename}"

    try:
        # Stream write to disk to avoid large memory usage
        with open(out_path, "wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB chunks
                if not chunk:
                    break
                f.write(chunk)

        # Extract pages as text
        pages = extract_text_from_pdf(out_path)

        all_chunks = []
        for page_idx, page_text in enumerate(pages):
            page_chunks = chunk_text(page_text, chunk_size=450, overlap=100)
            for ci, txt in enumerate(page_chunks):
                all_chunks.append({
                    "doc_id": file_id,
                    "title": title,
                    "page": page_idx,
                    "chunk_index": ci,
                    "text": txt,
                })

        # Document metadata
        doc_record = {
            "_id": file_id,
            "title": title,
            "filename": out_path.as_posix(),
            "num_pages": len(pages),
            "num_chunks": len(all_chunks),
        }
        documents.insert_one(doc_record)

        # Insert chunks into MongoDB
        if all_chunks:
            chunks.insert_many(all_chunks)

        # Add to vector store
        VSTORE.add_docs(all_chunks)

        return {"status": "ok", "file_id": file_id, "num_chunks": len(all_chunks)}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process upload: {e}")
# ----------------------------
# List documents
# ----------------------------
@app.get("/documents")
async def list_documents():
    """
    Return a simple list of uploaded documents so the frontend
    can show them in the left sidebar.
    """
    cursor = documents.find(
        {},
        {
            "_id": 1,
            "title": 1,
            "filename": 1,
            "num_pages": 1,
            "num_chunks": 1,
        },
    )

    docs_list = []
    for d in cursor:
        # ensure _id is string
        d["_id"] = str(d.get("_id"))
        docs_list.append(d)

    return {"documents": docs_list}


# ----------------------------
# Delete a document completely
# ----------------------------
@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """
    Delete document metadata, chunks, and the PDF file.
    (Vector index cleanup is optional / can be rebuilt on restart.)
    """
    doc = documents.find_one({"_id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove file from disk if it exists
    filename = doc.get("filename")
    if filename and os.path.exists(filename):
        try:
            os.remove(filename)
        except Exception as e:
            # Don't hard-fail on file delete; just log
            print(f"Failed to delete file {filename}: {e}")

    # Delete DB records
    chunks.delete_many({"doc_id": doc_id})
    documents.delete_one({"_id": doc_id})

    # NOTE: We are NOT removing vectors from VSTORE here.
    # You can rebuild VSTORE from Mongo on restart (your startup hook already does that).

    return {"status": "ok", "deleted_doc_id": doc_id}


# ----------------------------
# Simple retrieval endpoint (keeps existing behavior)
# ----------------------------
@app.post("/query")
async def query(q: QueryReq):
    try:
        retrieved = VSTORE.query(q.question, top_k=q.top_k)
        simplified = [
            {"title": r.get("title"), "page": r.get("page"), "text": r.get("text", "")[:800]}
            for r in retrieved
        ]
        return {"answers": simplified}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")

# ----------------------------
# Helper: fallback answer builder
# ----------------------------
def _fallback_answer_from_chunks(retrieved):
    """
    Return a short synthesized answer from top retrieved chunks if model fails.
    """
    if not retrieved:
        return "I could not find an answer in the uploaded documents."
    # Use title and first chunk text to synthesize a short sentence
    top = retrieved[0]
    text = (top.get("text") or "").strip()
    snippet = text.split("\n\n")[0][:600]  # first paragraph, up to 600 chars
    # keep it concise
    return f"(From documents) {snippet}"

# ----------------------------
# RAG endpoints using Groq via rag.py helpers
# ----------------------------

def _extract_json_object_from_text(text: str) -> Optional[dict]:
    """
    Try to extract a JSON object (dictionary) from text that's wrapped in triple backticks
    or present as first {...} block. Returns parsed dict or None.
    """
    if not text:
        return None
    # Try triple-backticked JSON block first
    m = re.search(r"```(?:json)?\s*({[\s\S]*?})\s*```", text, flags=re.IGNORECASE)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            # fall through to other methods
            pass
    # Try finding first {...} block (balanced-ish, naive)
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = text[start:end+1]
        try:
            return json.loads(candidate)
        except Exception:
            pass
    return None

def _extract_json_array_from_text(text: str) -> Optional[list]:
    """
    Try to extract a JSON array from text wrapped in triple backticks or first [...] block.
    Returns parsed list or None.
    """
    if not text:
        return None
    m = re.search(r"```(?:json)?\s*(\[[\s\S]*?\])\s*```", text, flags=re.IGNORECASE)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    # fallback: find first [ ... ] block
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1 and end > start:
        candidate = text[start:end+1]
        try:
            return json.loads(candidate)
        except Exception:
            pass
    return None


@app.post("/answer")
async def answer(req: AnswerReq):
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question is required.")

    try:
        # 1) retrieve
        retrieved = VSTORE.query(req.question, top_k=req.top_k)

        # 2) build prompt (accepts answer_length)
        system_prompt, user_prompt = build_rag_prompt(
            req.question, retrieved, answer_length=req.length or "short"
        )

        # 3) call model and capture raw text
        raw = call_groq_chat(
            system_prompt,
            user_prompt,
            model=os.getenv("GROQ_MODEL"),
            temperature=float(os.getenv("GROQ_TEMPERATURE", "0.0")),
        )
        raw_text = (raw or "").strip()

        # 4) try structured JSON extraction from model output first
        parsed = _extract_json_object_from_text(raw_text)
        if parsed:
            # normalize parsed JSON fields safely
            answer_text = str(parsed.get("answer") or parsed.get("answer_text") or "").strip()

            # quotes: expect list of {"source": n, "text": "..."} or strings
            quotes_raw = parsed.get("quotes") or parsed.get("quoted") or parsed.get("quote") or []
            quotes = []
            if isinstance(quotes_raw, list):
                for q in quotes_raw:
                    if isinstance(q, dict):
                        src = int(q.get("source") or q.get("source_number") or 0)
                        quotes.append({"source": src, "text": str(q.get("text", "") or "")})
                    else:
                        quotes.append({"source": 0, "text": str(q)})
            else:
                # single string
                quotes = [{"source": 0, "text": str(quotes_raw)}]

            # study suggestions (list of strings)
            suggestions_raw = parsed.get("study_suggestions") or parsed.get("suggestions") or parsed.get("study_suggestion") or []
            suggestions = [str(s) for s in suggestions_raw] if isinstance(suggestions_raw, list) else [str(suggestions_raw)] if suggestions_raw else []

            # sources: prefer structured list from model, otherwise map quoted source numbers to retrieved
            sources_raw = parsed.get("sources") or []
            mapped_sources = []
            if isinstance(sources_raw, list) and sources_raw:
                for s in sources_raw:
                    if isinstance(s, dict):
                        mapped_sources.append({
                            "source_number": int(s.get("source_number") or s.get("source") or 0),
                            "title": s.get("title"),
                            "page": s.get("page"),
                        })
                    else:
                        mapped_sources.append({"source_number": 0, "title": str(s), "page": None})
            else:
                # fallback: map quoted source numbers to retrieved metadata
                unique_nums = []
                for q in quotes:
                    n = int(q.get("source") or 0)
                    if n and n not in unique_nums:
                        unique_nums.append(n)
                for n in unique_nums:
                    idx = n - 1
                    if 0 <= idx < len(retrieved):
                        c = retrieved[idx]
                        mapped_sources.append({"source_number": n, "title": c.get("title"), "page": c.get("page")})

            return {
                "answer": answer_text or "",
                "quotes": quotes,
                "study_suggestions": suggestions,
                "sources": mapped_sources,
                "raw": raw_text,
            }

        # 5) If no JSON, fallback to regex / text extraction
        # Prefer an "Answer:" header, otherwise first paragraph
        answer_text = ""
        ans_match = re.search(r'^\s*Answer\s*:\s*(.+?)(?:\n|$)', raw_text, flags=re.IGNORECASE | re.MULTILINE)
        if ans_match:
            # gather answer and subsequent lines until QUOTE/SOURCES or end
            tail_after = raw_text[ans_match.end():]
            tail_cut = re.split(r'\n(?:QUOTE\b|SOURCES\b)', tail_after, flags=re.IGNORECASE)[0].strip()
            combined = (ans_match.group(1).strip() + "\n\n" + tail_cut).strip()
            answer_text = combined[:1200]  # keep reasonable length
        else:
            paragraphs = [p.strip() for p in raw_text.split("\n\n") if p.strip()]
            answer_text = paragraphs[0][:1200] if paragraphs else _fallback_answer_from_chunks(retrieved)

        # Extract quoted snippets (strict pattern)
        quote_pattern = re.compile(r'Quote\s*[-:]?\s*Source\s*(\d+)\s*[:\-]?\s*"([^"]+)"', flags=re.IGNORECASE)
        quotes = []
        quoted_source_nums = []
        for m in quote_pattern.finditer(raw_text):
            src_num = int(m.group(1))
            qtext = m.group(2).strip()
            quotes.append({"source": src_num, "text": qtext})
            quoted_source_nums.append(src_num)

        # Looser source matches if no explicit quotes
        if not quoted_source_nums:
            loose = re.findall(r'Source\s*(\d+)\s*:', raw_text, flags=re.IGNORECASE)
            quoted_source_nums = [int(x) for x in loose] if loose else []

        # map sources to retrieved documents
        unique_nums = []
        for n in quoted_source_nums:
            if n not in unique_nums:
                unique_nums.append(n)

        mapped_sources = []
        for n in unique_nums:
            idx = n - 1
            if 0 <= idx < len(retrieved):
                c = retrieved[idx]
                mapped_sources.append({"source_number": n, "title": c.get("title"), "page": c.get("page")})

        # Default: if no mapped_sources, return top 1-2 chunks as helpful sources
        if not mapped_sources and retrieved:
            for i, c in enumerate(retrieved[:2]):
                mapped_sources.append({"source_number": i + 1, "title": c.get("title"), "page": c.get("page")})

        return {
            "answer": answer_text,
            "quotes": quotes,
            "sources": mapped_sources,
            "raw": raw_text
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"LLM/answer failed: {e}")


@app.post("/summarize")
async def summarize(req: SummarizeReq):
    try:
        if req.question:
            retrieved = VSTORE.query(req.question, top_k=req.top_k)
        elif req.doc_id:
            mongo_chunks = list(chunks.find({"doc_id": req.doc_id}))
            retrieved = [{"title": c.get("title"), "page": c.get("page"), "text": c.get("text")} for c in mongo_chunks]
        else:
            raise HTTPException(status_code=400, detail="Provide question or doc_id to summarize.")

        system_prompt, user_prompt = build_summary_prompt(retrieved, length=req.length)
        summary = call_groq_chat(system_prompt, user_prompt, model=os.getenv("GROQ_MODEL"))
        return {"summary": summary}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"LLM/summarize failed: {e}")


@app.post("/generate_quiz")
async def generate_quiz(req: QuizReq):
    try:
        if req.question:
            retrieved = VSTORE.query(req.question, top_k=req.top_k)
        elif req.doc_id:
            mongo_chunks = list(chunks.find({"doc_id": req.doc_id}))
            retrieved = [{"title": c.get("title"), "page": c.get("page"), "text": c.get("text")} for c in mongo_chunks]
        else:
            raise HTTPException(status_code=400, detail="Provide question or doc_id to generate quiz.")

        system_prompt, user_prompt = build_quiz_prompt(retrieved, q_type=req.q_type, count=req.count)
        raw = call_groq_chat(system_prompt, user_prompt, model=os.getenv("GROQ_MODEL"))
        raw_text = (raw or "").strip()

        # Try to parse JSON array returned by the model
        parsed_array = _extract_json_array_from_text(raw_text)
        if parsed_array is not None:
            return {"quiz": parsed_array}

        # Fallback: try to parse JSON object that may contain array under a key
        parsed_obj = _extract_json_object_from_text(raw_text)
        if isinstance(parsed_obj, dict):
            # maybe the model wrapped array under 'quiz' key
            if "quiz" in parsed_obj and isinstance(parsed_obj["quiz"], list):
                return {"quiz": parsed_obj["quiz"]}
            # or other keys - return whole object under quiz_raw
            return {"quiz_raw": parsed_obj}

        # If parsing failed, return raw string for debugging
        return {"quiz_raw": raw_text}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"LLM/generate_quiz failed: {e}")
