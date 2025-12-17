# Smart Campus Assistant

A full-stack AI-powered educational platform that helps students learn by uploading documents and interacting with an intelligent assistant powered by RAG (Retrieval-Augmented Generation) and LLM technology.

## Features

- 📄 **Document Upload**: Upload PDF files to build a knowledge base
- 🤖 **AI-Powered Q&A**: Ask questions and get answers based on uploaded documents
- 📊 **Smart Summarization**: Generate summaries of documents or specific topics
- 🎯 **Quiz Generation**: Automatically create quiz questions (MCQ or short answer) from documents
- 🔐 **User Authentication**: Secure login and registration system
- 💾 **Vector Search**: Fast retrieval using semantic search with vector embeddings
- 📱 **Modern UI**: Responsive frontend built with React and Tailwind CSS

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type-safe JavaScript

### Backend
- **FastAPI** - High-performance Python web framework
- **MongoDB** - NoSQL database for document storage
- **Groq LLM** - Fast large language model inference
- **LangChain/FAISS** - Vector embeddings and similarity search
- **PyPDF** - PDF text extraction

## Project Structure

```
smart-campus-assisstant/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── lib/             # API utilities
│   │   ├── pages/           # Page components
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                  # FastAPI backend application
│   ├── app/
│   │   ├── main.py         # Main FastAPI application
│   │   ├── auth.py         # Authentication routes
│   │   ├── db.py           # MongoDB connection
│   │   ├── ingest.py       # PDF processing
│   │   ├── rag.py          # RAG and LLM integration
│   │   ├── vecstore.py     # Vector store management
│   │   └── __pycache__/
│   ├── uploads/            # Uploaded PDF files
│   └── requirements.txt     # Python dependencies
│
└── README.md
```

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- **MongoDB** (local or cloud instance)
- **Groq API Key** (get from https://console.groq.com)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/PavishKumar787/smart-campus-assisstant.git
cd smart-campus-assisstant
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Variables

Create a `.env` file in the backend directory:

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017
DB_NAME=smart_campus

# Groq LLM
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=mixtral-8x7b-32768
GROQ_TEMPERATURE=0.0

# Server
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

## Running the Application

### 1. Start MongoDB

```bash
# If using local MongoDB
mongod
```

### 2. Start Backend Server

```bash
cd backend

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Run the server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`

### 3. Start Frontend Development Server

```bash
cd frontend

# Run development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user

### Documents
- `GET /documents` - List all uploaded documents
- `POST /upload` - Upload a PDF file
- `DELETE /documents/{doc_id}` - Delete a document

### Query & RAG
- `POST /query` - Simple document retrieval
- `POST /answer` - Get AI-powered answers with quotes and sources
- `POST /summarize` - Generate document summary
- `POST /generate_quiz` - Generate quiz questions

## Features Explained

### Document Upload
1. Upload a PDF file with a title
2. System extracts text and chunks it into manageable pieces
3. Chunks are stored in MongoDB and vector embeddings are created
4. Vector store is updated for semantic search

### Question Answering
1. User asks a question
2. System retrieves relevant chunks from vector store
3. LLM generates answer with citations and quotes
4. Response includes source references and study suggestions

### Quiz Generation
- Supports MCQ and short answer formats
- Configurable number of questions
- Questions generated from document content

## Troubleshooting

### PowerShell Execution Policy Error
If you get a PowerShell execution policy error:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### MongoDB Connection Error
Ensure MongoDB is running:
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service (Windows)
net start MongoDB

# Or start MongoDB locally
mongod
```

### Backend Won't Start
1. Verify Python 3.9+ is installed
2. Check virtual environment is activated
3. Ensure all dependencies are installed: `pip install -r requirements.txt`
4. Check GROQ_API_KEY is set in .env file

### Frontend Build Issues
```bash
cd frontend
npm cache clean --force
npm install
npm run dev
```

## Development

### Build Frontend for Production
```bash
cd frontend
npm run build
```

### Run Tests (if available)
```bash
npm run test
```

## Environment Configuration

The application uses environment variables for configuration:

**Backend (.env file)**
- `MONGO_URI`: MongoDB connection string
- `DB_NAME`: Database name
- `GROQ_API_KEY`: API key for Groq LLM
- `GROQ_MODEL`: Model name (default: mixtral-8x7b-32768)
- `GROQ_TEMPERATURE`: Temperature for LLM (0.0-1.0)

**Frontend (.env.local file, if needed)**
- `VITE_API_URL`: Backend API URL (default: http://localhost:8000)

## Contributing

Contributions are welcome! Please feel free to submit pull requests.

## License

This project is open source and available under the MIT License.

## Support

For issues and questions, please open an issue on the GitHub repository.

## Author

**PavishKumar787**

---

## Quick Start Guide

### First Time Setup
1. Clone repository
2. Setup backend (Python virtual env + dependencies)
3. Setup frontend (npm install)
4. Create `.env` file with required variables
5. Start MongoDB
6. Start backend: `python -m uvicorn app.main:app --reload`
7. Start frontend: `npm run dev`
8. Open http://localhost:5173 in browser

### Using the App
1. Register or login
2. Upload a PDF file
3. Ask questions about the document
4. Get AI-powered answers with sources
5. Generate summaries or quizzes

Enjoy learning with Smart Campus Assistant! 🎓
