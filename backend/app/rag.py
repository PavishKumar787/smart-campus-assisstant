# backend/app/rag.py
import os
from typing import List, Tuple
from groq import Groq
from dotenv import load_dotenv
from pathlib import Path
import textwrap
import re

# load .env from backend/.env if present
env_path = Path(__file__).resolve().parents[1] / ".env"
if env_path.exists():
    load_dotenv(env_path)

# Load GROQ_API_KEY from env (must be set either via shell or .env)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("Set GROQ_API_KEY environment variable before running the server.")

DEFAULT_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
client = Groq(api_key=GROQ_API_KEY)


def call_groq_chat(system_prompt: str, user_prompt: str, model: str = DEFAULT_MODEL, temperature: float = 0.0) -> str:
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    resp = client.chat.completions.create(
        messages=messages,
        model=model,
        temperature=temperature,
    )
    # Defensive extraction for response shape
    try:
        choice = resp.choices[0]
        if hasattr(choice, "message") and hasattr(choice.message, "content"):
            return choice.message.content
        if "message" in choice and "content" in choice["message"]:
            return choice["message"]["content"]
        return getattr(choice, "text", "") or str(resp)
    except Exception:
        return str(resp)


# Helper: extract a short quoted snippet from a chunk (best effort)
def extract_sentence_snippet(text: str, question: str, max_chars: int = 200) -> str:
    # simple heuristic: find sentence containing a key word from the question
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    question_terms = [t.lower() for t in re.findall(r'\w+', question) if len(t) > 3]
    best = None
    for s in sentences:
        low = s.lower()
        if any(term in low for term in question_terms):
            best = s
            break
    if not best:
        best = sentences[0] if sentences else text
    # trim to max_chars
    best = best.strip()
    if len(best) > max_chars:
        best = best[:max_chars].rsplit(' ', 1)[0] + "..."
    return best


def build_rag_prompt(question: str, retrieved_chunks: List[dict], answer_length: str = "short") -> Tuple[str, str]:
    """
    answer_length: "short" (2-4 sentences), "medium" (~80-120 words), "long" (~150-250 words)
    """
    ctx_entries = []
    for i, c in enumerate(retrieved_chunks):
        text = c.get("text", "").strip()
        if len(text) > 2000:
            text = text[:2000] + " ... (truncated)"
        ctx_entries.append(f"[Source {i+1}] {c.get('title','Untitled')} | page {c.get('page','N/A')}\n{text}")

    context_block = "\n\n---\n\n".join(ctx_entries) if ctx_entries else "No context available."

    # Map answer_length to an instruction
    length_instructions = {
        "short": "Provide a concise answer (2-4 sentences).",
        "medium": "Provide a detailed answer (~80-120 words, 2-4 short paragraphs).",
        "long": "Provide an in-depth answer (~150-250 words, multiple short paragraphs)."
    }
    length_instr = length_instructions.get(answer_length, length_instructions["short"])

    system_prompt = textwrap.dedent(f"""
        You are a helpful study assistant. Follow instructions carefully.
        - You may ONLY use the context provided below. Do not invent facts.
        - When you use information from a source, you MUST include a short quoted sentence (in double quotes) exactly from the source text you used.
        - {length_instr}
        - After the answer, provide 1 short study suggestion (one line).
        - Then include a SOURCES section listing source numbers, titles, and pages used.
        - If no answer is found in the context, reply exactly: "I could not find a direct answer in the provided documents."
    """).strip()

    user_prompt = f"""
    CONTEXT:
    {context_block}

    QUESTION:
    {question}

    TASK (format MUST be followed):
    1) Start with: Answer:
       (Example: Answer: <your answer here>)
    2) After the answer, include a QUOTE section with the exact sentence(s) used from the context, prefixed by the Source number (e.g. Quote - Source 1: "..." ).
    3) Then list 1 Study suggestion (single bullet).
    4) Finally, include a SOURCES: section that lists which Source numbers you used, formatted like: Source 1: Title | page X
    5) If you cannot find the answer in the context, respond exactly: "I could not find a direct answer in the provided documents."

    IMPORTANT: Follow the format above and do not add extraneous commentary.
    """

    return system_prompt, user_prompt


def build_summary_prompt(retrieved_chunks: List[dict], length: str = "short") -> Tuple[str, str]:
    ctx_text = "\n\n---\n\n".join([f"{c.get('title','Untitled')} | page {c.get('page','N/A')}\n{c.get('text','')}" for c in retrieved_chunks])
    system_prompt = "You are an assistant that summarizes study materials. Keep it clear and concise."
    user_prompt = f"Summarize the following material in a {length} summary. Provide numbered bullet points of main ideas and key definitions/formulas if any.\n\n{ctx_text}"
    return system_prompt, user_prompt


def build_quiz_prompt(retrieved_chunks: List[dict], q_type: str = "mcq", count: int = 5) -> Tuple[str, str]:
    """
    Build a quiz prompt that requests strict JSON output.
    For MCQ: returns a JSON array of objects, each:
      { "question": "...", "options": ["A","B","C","D"], "correct_option": "A", "explanation": "one-line" }
    For short: returns a JSON array of { "question": "...", "answer": "..." }
    The model must return ONLY the JSON array inside triple backticks.
    """
    ctx_text = "\n\n---\n\n".join([f"{c.get('title','Untitled')} | page {c.get('page','N/A')}\n{c.get('text','')}" for c in retrieved_chunks])
    system_prompt = "You are an exam question generator. Use ONLY the provided CONTEXT."

    if q_type == "mcq":
        user_prompt = textwrap.dedent(f"""
            From the following CONTEXT, generate exactly {count} multiple-choice questions (MCQs).
            Each question object MUST have the following fields:
              - question (string)
              - options (array of 4 strings)  # options order corresponds to A,B,C,D
              - correct_option (one of "A","B","C","D")
              - explanation (one-line string explaining the correct option)

            Return a single JSON array containing exactly {count} objects and NOTHING ELSE.
            Place the JSON array inside triple backticks.

            Example:
            ```json
            [
              {{
                "question": "Question text",
                "options": ["opt A","opt B","opt C","opt D"],
                "correct_option": "B",
                "explanation": "One-line explanation"
              }},
              ...
            ]
            ```

            CONTEXT:
            {ctx_text}
        """).strip()
    else:
        user_prompt = textwrap.dedent(f"""
            From the following CONTEXT, generate exactly {count} short answer questions.
            Return a single JSON array of objects, each with:
              - question (string)
              - answer (short model answer as string)

            Return ONLY the JSON array inside triple backticks.

            CONTEXT:
            {ctx_text}
        """).strip()

    return system_prompt, user_prompt
