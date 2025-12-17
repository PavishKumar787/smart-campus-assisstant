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

from .db import documents, chunks
from .ingest import extract_text_from_pdf, chunk_text
from .vecstore import VSTORE
from .rag import call_groq_chat, build_rag_prompt, build_summary_prompt, build_quiz_prompt

logger = logging.getLogger("uvicorn.error")

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Smart Campus Assistant - Backend MVP")

from .auth import router as auth_router
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
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
    length: str = "short"

class QuizReq(BaseModel):
    question: Optional[str] = None
    doc_id: Optional[str] = None
    top_k: int = 20
    q_type: str = "mcq"
    count: int = 5

@app.on_event("startup")
def load_vectorestore_from_mongo():
    try:
        try:
            ntotal = getattr(VSTORE.index, "ntotal", None)
        except Exception:
            ntotal = None

        if ntotal and int(ntotal) > 0:
            logger.info(f"VSTORE already contains {ntotal} vectors; skipping Mongo load.")
            return

        logger.info("VSTORE appears empty. Loading chunks from MongoDB into VSTORE...")
        mongo_chunks_cursor = chunks.find({}, {"_id": 0, "doc_id": 1, "title": 1, "page": 1, "chunk_index": 1, "text": 1})
        docs_to_add = []
        count = 0
        for c in mongo_chunks_cursor:
            docs_to_add.append({
                "doc_id": c.get("doc_id"),
                "title": c.get("title", "Untitled"),
                "page": c.get("page", None),
                "chunk_index": c.get("chunk_index", None),
                "text": c.get("text", "") or ""
            })
            count += 1
            if len(docs_to_add) >= 500:
                VSTORE.add_docs(docs_to_add)
                docs_to_add = []
        if docs_to_add:
            VSTORE.add_docs(docs_to_add)
        logger.info(f"Loaded {count} chunks from MongoDB into VSTORE.")
    except Exception as e:
        logger.exception("Failed to load chunks into VSTORE at startup: %s", e)

@app.get("/")
async def root():
    return {"status": "backend running"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), title: str | None = None):
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are allowed.")

    if not title:
        title = file.filename or "untitled"

    file_id = str(uuid.uuid4())
    safe_filename = (file.filename or "uploaded").replace("/", "_").replace("\\", "_")
    out_path = UPLOAD_DIR / f"{file_id}_{safe_filename}"

    try:
        with open(out_path, "wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)

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

        doc_record = {
            "_id": file_id,
            "title": title,
            "filename": out_path.as_posix(),
            "num_pages": len(pages),
            "num_chunks": len(all_chunks),
        }
        documents.insert_one(doc_record)

        if all_chunks:
            chunks.insert_many(all_chunks)

        VSTORE.add_docs(all_chunks)

        return {"status": "ok", "file_id": file_id, "num_chunks": len(all_chunks)}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process upload: {e}")

@app.get("/documents")
async def list_documents():
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
        d["_id"] = str(d.get("_id"))
        docs_list.append(d)

    return {"documents": docs_list}

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    doc = documents.find_one({"_id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    filename = doc.get("filename")
    if filename and os.path.exists(filename):
        try:
            os.remove(filename)
        except Exception as e:
            print(f"Failed to delete file {filename}: {e}")

    chunks.delete_many({"doc_id": doc_id})
    documents.delete_one({"_id": doc_id})

    return {"status": "ok", "deleted_doc_id": doc_id}

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

def _fallback_answer_from_chunks(retrieved):
    if not retrieved:
        return "I could not find an answer in the uploaded documents."
    top = retrieved[0]
    text = (top.get("text") or "").strip()
    snippet = text.split("\n\n")[0][:600]
    return f"(From documents) {snippet}"

def _extract_json_object_from_text(text: str) -> Optional[dict]:
    if not text:
        return None
    m = re.search(r"```(?:json)?\s*({[\s\S]*?})\s*```", text, flags=re.IGNORECASE)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
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
    if not text:
        return None
    m = re.search(r"```(?:json)?\s*(\[[\s\S]*?\])\s*```", text, flags=re.IGNORECASE)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
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
        retrieved = VSTORE.query(req.question, top_k=req.top_k)

        system_prompt, user_prompt = build_rag_prompt(
            req.question, retrieved, answer_length=req.length or "short"
        )

        raw = call_groq_chat(
            system_prompt,
            user_prompt,
            model=os.getenv("GROQ_MODEL"),
            temperature=float(os.getenv("GROQ_TEMPERATURE", "0.0")),
        )
        raw_text = (raw or "").strip()

        parsed = _extract_json_object_from_text(raw_text)
        if parsed:
            answer_text = str(parsed.get("answer") or parsed.get("answer_text") or "").strip()

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
                quotes = [{"source": 0, "text": str(quotes_raw)}]

            suggestions_raw = parsed.get("study_suggestions") or parsed.get("suggestions") or parsed.get("study_suggestion") or []
            suggestions = [str(s) for s in suggestions_raw] if isinstance(suggestions_raw, list) else [str(suggestions_raw)] if suggestions_raw else []

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

        answer_text = ""
        ans_match = re.search(r'^\s*Answer\s*:\s*(.+?)(?:\n|$)', raw_text, flags=re.IGNORECASE | re.MULTILINE)
        if ans_match:
            tail_after = raw_text[ans_match.end():]
            tail_cut = re.split(r'\n(?:QUOTE\b|SOURCES\b)', tail_after, flags=re.IGNORECASE)[0].strip()
            combined = (ans_match.group(1).strip() + "\n\n" + tail_cut).strip()
            answer_text = combined[:1200]
        else:
            paragraphs = [p.strip() for p in raw_text.split("\n\n") if p.strip()]
            answer_text = paragraphs[0][:1200] if paragraphs else _fallback_answer_from_chunks(retrieved)

        quote_pattern = re.compile(r'Quote\s*[-:]?\s*Source\s*(\d+)\s*[:\-]?\s*"([^"]+)"', flags=re.IGNORECASE)
        quotes = []
        quoted_source_nums = []
        for m in quote_pattern.finditer(raw_text):
            src_num = int(m.group(1))
            qtext = m.group(2).strip()
            quotes.append({"source": src_num, "text": qtext})
            quoted_source_nums.append(src_num)

        if not quoted_source_nums:
            loose = re.findall(r'Source\s*(\d+)\s*:', raw_text, flags=re.IGNORECASE)
            quoted_source_nums = [int(x) for x in loose] if loose else []

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

        parsed_array = _extract_json_array_from_text(raw_text)
        if parsed_array is not None:
            return {"quiz": parsed_array}

        parsed_obj = _extract_json_object_from_text(raw_text)
        if isinstance(parsed_obj, dict):
            if "quiz" in parsed_obj and isinstance(parsed_obj["quiz"], list):
                return {"quiz": parsed_obj["quiz"]}
            return {"quiz_raw": parsed_obj}

        return {"quiz_raw": raw_text}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"LLM/generate_quiz failed: {e}")
