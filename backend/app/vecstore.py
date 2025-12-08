# backend/app/vecstore.py
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss
from threading import Lock
from typing import List, Dict, Any, Tuple
import os

MODEL_NAME = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")

class VectorStore:
    def __init__(self):
        self.model = SentenceTransformer(MODEL_NAME)
        self.dim = self.model.get_sentence_embedding_dimension()
        # use IndexFlatL2 for simplicity (in-memory)
        self.index = faiss.IndexFlatL2(self.dim)
        self.docs: List[Dict[str, Any]] = []  # metadata aligned with vectors
        self.lock = Lock()

    def add_docs(self, docs: List[Dict[str, Any]]):
        """
        docs: list of dict {doc_id, title, page, chunk_index, text}
        Adds embeddings and stores metadata.
        """
        if not docs:
            return
        texts = [d["text"] for d in docs]
        # encode in batches for memory safety
        embs = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        embs = np.asarray(embs).astype("float32")
        with self.lock:
            # add to faiss index and metadata list
            self.index.add(embs)
            self.docs.extend(docs)

    def query(self, query_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Returns a list of doc metadata dicts (may be fewer than top_k).
        """
        with self.lock:
            if self.index.ntotal == 0:
                return []

            # ensure top_k not larger than indexed vectors
            k = min(top_k, int(self.index.ntotal))

            q_emb = self.model.encode([query_text], convert_to_numpy=True)
            q_emb = np.asarray(q_emb).astype("float32")

            # perform search
            D, I = self.index.search(q_emb, k)

            results: List[Dict[str, Any]] = []
            for score, idx in zip(D[0], I[0]):
                # guard against invalid indices (faiss may return -1)
                if idx is None or idx < 0 or idx >= len(self.docs):
                    continue
                meta = dict(self.docs[idx])  # copy to avoid mutation
                meta["_score"] = float(score)
                results.append(meta)
            return results

# Singleton instance used by the app
VSTORE = VectorStore()
