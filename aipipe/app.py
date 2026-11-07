from __future__ import annotations

import json

import logging

import time

from pathlib import Path

from uuid import uuid4

from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from pydantic import BaseModel, Field

from fastapi.responses import StreamingResponse

from chat_ai.chat_service import sse_done, sse_token, stream_chat

from chat_ai.schemas import ChatRequest

from aipipe.exceptions import SecurityError

from quizgen import (

    QuizGenerationRequest,

    QuizResponse,

    build_api_quiz,

    extract_text_from_file,

    generate_secure_quiz,

    resolve_distributions,

)

# ============================================================

# COMPILER IMPORTS

from fastapi.middleware.cors import CORSMiddleware

# ============================================================

from compiler_lms.compiler import (

    generate_compiler_question,

    save_compiler_question,

    get_student_question,

    submit_student_solution,

    get_ai_help,

)

# ============================================================

# Resume IMPORTS

# ============================================================

from resume_analyzer.resume import (

    analyze_resume,

    analyze_resume_with_job_description,

)

from resume_analyzer.exceptions import (

    ResumeAnalysisError,

    ResumeTextError,

)

# ============================================================

# mock interview IMPORTS

# ============================================================

import os

import base64

import asyncio

import threading

from urllib.parse import urlencode

import websocket

from dotenv import load_dotenv

from fastapi import WebSocket, WebSocketDisconnect

from personalized_ai.research.LLM_module_summary import (

    get_student_module_summary,

)

from mock_interviews.research.mock_interview import (

    start_interview,

    submit_answer,

    get_interview_state,

    finish_interview,

    evaluate_answer_only,

    reattempt_answer,

)
#############################################################



from jobsapi.jobsearch import search_jobs



##############################################################

import logging

import tempfile

from pathlib import Path

from fastapi import UploadFile, File, HTTPException

from utils.logging_config import configure_logging

BASE_DIR = Path(__file__).resolve().parent

LOG_DIR = configure_logging(BASE_DIR)

logger = logging.getLogger(__name__)

from utils.file_totext import extract_text_fromfile

app = FastAPI(

    title="Secure Quiz Generation API",

    description="Security-aware AI quiz generation API using AIPipe and quiz_ai.",

    version="1.0.0",

)
# CORS: allow the local Vite development frontend to call this API.
# Add additional frontend origins through FRONTEND_ORIGINS, comma-separated.
_frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,https://lms.datapro.in",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")

async def request_logging_middleware(request, call_next):

    start = time.perf_counter()

    logger.info(

        "HTTP request started method=%s path=%s",

        request.method,

        request.url.path,

    )

    try:

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start) * 1000

        logger.info(

            "HTTP request completed method=%s path=%s status=%s duration_ms=%.2f",

            request.method,

            request.url.path,

            response.status_code,

            duration_ms,

        )

        return response

    except Exception:

        duration_ms = (time.perf_counter() - start) * 1000

        logger.exception(

            "HTTP request failed method=%s path=%s duration_ms=%.2f",

            request.method,

            request.url.path,

            duration_ms,

        )

        raise

# ============================================================

# GENERATE QUIZ FROM FILE

# ============================================================

@app.post(

    "/api/quiz/generate_from_file",

    response_model=QuizResponse,

)

async def generate_quiz_from_file(

    file: UploadFile = File(...),

    count: int = Form(5),

    difficulty: str | None = Form(None),

    bloom: str | None = Form(None),

):

    """

    Generate a quiz from an uploaded file.

    Supported:

        .txt

        .md

        .markdown

        .pdf

        .docx

        .pptx

    """

    try:

        logger.info(

            "Quiz file generation requested filename=%s count=%s",

            Path(file.filename or "").name,

            count,

        )

        if not file.filename:

            raise ValueError(

                "Uploaded file must have a filename."

            )

        if count < 1 or count > 100:

            raise ValueError(

                "count must be between 1 and 100."

            )

        data = await file.read()

        if not data:

            raise ValueError(

                "Uploaded file is empty."

            )

        content = extract_text_from_file(

            file.filename,

            data,

        )

        if not content.strip():

            raise ValueError(

                "No readable text was extracted from the uploaded file."

            )

        # difficulty and bloom are supplied as JSON strings

        # when using multipart/form-data.

        parsed_difficulty = (

            json.loads(difficulty)

            if difficulty

            else None

        )

        parsed_bloom = (

            json.loads(bloom)

            if bloom

            else None

        )

        if (

            parsed_difficulty is not None

            and not isinstance(parsed_difficulty, dict)

        ):

            raise ValueError(

                "difficulty must be a JSON object."

            )

        if (

            parsed_bloom is not None

            and not isinstance(parsed_bloom, dict)

        ):

            raise ValueError(

                "bloom must be a JSON object."

            )

        resolved_difficulty, resolved_bloom = (

            resolve_distributions(

                count=count,

                difficulty=parsed_difficulty,

                bloom=parsed_bloom,

            )

        )

        result = generate_secure_quiz(

            content=content,

            count=count,

            difficulty=resolved_difficulty,

            bloom=resolved_bloom,

        )

        response = build_api_quiz(

            result,

            quiz_id=uuid4().hex,

            content=content,

            count=count,

            difficulty=resolved_difficulty,

            bloom=resolved_bloom,

        )

        response["source"] = {

            "type": "file",

            "filename": file.filename,

            "extension": Path(

                file.filename

            ).suffix.lower(),

            "characters": len(content),

            "words": len(content.split()),

        }

        return response

    except SecurityError as exc:

        raise HTTPException(

            status_code=400,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

    except ValueError as exc:

        raise HTTPException(

            status_code=400,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

    except Exception as exc:

        raise HTTPException(

            status_code=500,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

# ============================================================

# GENERATE QUIZ FROM TEXT

# ============================================================

@app.post(

    "/api/quiz/generate_from_text",

    response_model=QuizResponse,

)

def generate_quiz(

    request: QuizGenerationRequest,

):

    """

    Generate a quiz from learning content.

    """

    try:

        logger.info(

            "Quiz text generation requested count=%s",

            request.count,

        )

        difficulty, bloom = resolve_distributions(

            count=request.count,

            difficulty=(

                dict(request.difficulty)

                if request.difficulty is not None

                else None

            ),

            bloom=(

                dict(request.bloom)

                if request.bloom is not None

                else None

            ),

        )

        result = generate_secure_quiz(

            content=request.content,

            count=request.count,

            difficulty=difficulty,

            bloom=bloom,

        )

        return build_api_quiz(

            result,

            quiz_id=uuid4().hex,

            content=request.content,

            count=request.count,

            difficulty=difficulty,

            bloom=bloom,

        )

    except SecurityError as exc:

        raise HTTPException(

            status_code=400,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

    except ValueError as exc:

        raise HTTPException(

            status_code=400,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

    except Exception as exc:

        raise HTTPException(

            status_code=500,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

# ============================================================

# COMPILER REQUEST MODELS

# ============================================================

class CompilerGenerateRequest(BaseModel):

    prompt: str = Field(

        ...,

        min_length=1,

    )

    language: str = Field(default="python", pattern="^(python|node)$")

class CompilerSaveRequest(BaseModel):

    question: dict[str, Any]

class CompilerSubmitRequest(BaseModel):

    student_code: str = Field(

        ...,

        min_length=1,

    )

    language: str | None = None

    function_name: str | None = None

    description: str | None = None

    reference_code: str | None = None

    test_cases: list[dict[str, Any]] | None = None

    validation: dict[str, Any] | None = None

    success: bool | None = None

class CompilerHelpRequest(BaseModel):

    student_code: str = Field(

        ...,

        min_length=1,

    )

    test_results: dict[str, Any]

    description: str | None = None

# ============================================================

# COMPILER - GENERATE QUESTION

# ============================================================

@app.post("/api/compiler/generate")

def compiler_generate(

    request: CompilerGenerateRequest,

):

    """

    Generate a programming question using AIPipe.

    Teacher provides a natural-language requirement.

    The compiler module generates:

        - description

        - language

        - function name

        - reference implementation

        - test cases

        - expected outputs

        - validation result

    """

    try:

        result = generate_compiler_question(

            request.prompt,
            request.language,

        )

        return {

            "success": True,

            **result,

        }

    except ValueError as exc:

        raise HTTPException(

            status_code=400,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

    except Exception as exc:

        raise HTTPException(

            status_code=500,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

# ============================================================

# COMPILER - SAVE APPROVED QUESTION

# ============================================================

@app.post("/api/compiler/save")

def compiler_save(

    request: CompilerSaveRequest,

):

    """

    Save the teacher-approved compiler question.

    The question is stored in:

        compiler_lms/test_outputs.json

    """

    try:

        result = save_compiler_question(

            request.question

        )

        return {

            "success": True,

            **result,

        }

    except ValueError as exc:

        raise HTTPException(

            status_code=400,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

    except Exception as exc:

        raise HTTPException(

            status_code=500,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

# ============================================================

# COMPILER - GET STUDENT QUESTION

# ============================================================

@app.get("/api/compiler/question")

def compiler_question():

    """

    Return the saved programming question for students.

    Reference code and expected outputs are NOT returned.

    """

    try:

        result = get_student_question()

        return {

            "success": True,

            **result,

        }

    except FileNotFoundError as exc:

        raise HTTPException(

            status_code=404,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

    except Exception as exc:

        raise HTTPException(

            status_code=500,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

# ============================================================

# COMPILER - STUDENT SUBMISSION

# ============================================================

@app.post("/api/compiler/submit")

def compiler_submit(

    request: CompilerSubmitRequest,

):

    """

    Execute the student's solution against the saved

    hidden test cases.

    Returns:

        passed

        failed

        total

        score

        test results

    """

    try:

        question = None

        if request.test_cases and request.function_name and request.language:

            question = {

                "language": request.language,

                "function_name": request.function_name,

                "description": request.description or "",

                "reference_code": request.reference_code or "",

                "test_cases": request.test_cases,

                "validation": request.validation or {"status": "valid"},

            }

        result = submit_student_solution(

            request.student_code,

            question,

        )

        return {

            "success": True,

            **result,

        }

    except FileNotFoundError as exc:

        raise HTTPException(

            status_code=404,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

    except ValueError as exc:

        raise HTTPException(

            status_code=400,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

    except Exception as exc:

        raise HTTPException(

            status_code=500,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

# ============================================================

# COMPILER - AI HELP

# ============================================================

@app.post("/api/compiler/help")

def compiler_help(

    request: CompilerHelpRequest,

):

    """

    Give the student exactly two short lines of AI guidance.

    The AI must not reveal:

        - reference code

        - expected outputs

        - complete solution

        - corrected code

    """

    try:

        result = get_ai_help(

            student_code=request.student_code,

            test_results=request.test_results,

            description=request.description,

        )

        return {

            "success": True,

            "help": result,

        }

    except FileNotFoundError as exc:

        raise HTTPException(

            status_code=404,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

    except Exception as exc:

        raise HTTPException(

            status_code=500,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc),

            },

        ) from exc

# ============================================================

# CHAT

# ============================================================

@app.post("/api/ai/chat")

async def ai_chat(request: ChatRequest):

    async def event_stream():

        try:

            async for token in stream_chat(request):

                yield sse_token(token)

            yield sse_done()

        except Exception as exc:

            # Do not expose API keys or internal provider details.

            yield (

                'data: {"error":"AI chat request failed."}\n\n'

            )

    return StreamingResponse(

        event_stream(),

        media_type="text/event-stream",

        headers={

            "Cache-Control": "no-cache",

            "Connection": "keep-alive",

            "X-Accel-Buffering": "no",

        },

    )

# @app.post("/api/ai/chat")

# async def ai_chat(request: ChatRequest):

#     async def event_stream():

#         try:

#             async for token in stream_chat(request):

#                 yield sse_token(token)

#             yield sse_done()

#         except Exception as exc:

#             print("AI CHAT ERROR:", repr(exc))

#             raise

#     return StreamingResponse(

#         event_stream(),

#         media_type="text/event-stream",

#         headers={

#             "Cache-Control": "no-cache",

#             "Connection": "keep-alive",

#             "X-Accel-Buffering": "no",

#         },

#     )

# ============================================================

# EXTRACT TEXT FROM FILE

# ============================================================

@app.post("/api/file/extract-text")

async def extract_text_from_uploaded_file(

    file: UploadFile = File(...)

):

    """

    Extract text from PDF, DOCX, PPTX or TXT files.

    Returns:

        success: bool

        filename: str

        extension: str

        characters: int

        words: int

        text: str

    """

    temp_path = None

    try:

        # Validate filename.

        if not file.filename:

            raise HTTPException(

                status_code=400,

                detail={

                    "success": False,

                    "exception": "ValueError",

                    "message": "Uploaded file must have a filename."

                }

            )

        filename = Path(file.filename).name

        extension = Path(filename).suffix.lower()

        supported_extensions = {

            ".pdf", ".docx", ".pptx", ".txt"

        }

        if extension not in supported_extensions:

            raise HTTPException(

                status_code=415,

                detail={

                    "success": False,

                    "exception": "UnsupportedFileType",

                    "message": (

                        f"Unsupported file format: {extension}. "

                        "Supported formats are PDF, DOCX, PPTX and TXT."

                    )

                }

            )

        # Read uploaded file.

        data = await file.read()

        if not data:

            raise HTTPException(

                status_code=400,

                detail={

                    "success": False,

                    "exception": "EmptyFile",

                    "message": "Uploaded file is empty."

                }

            )

        # Save temporarily for the existing extraction function.

        with tempfile.NamedTemporaryFile(

            suffix=extension,

            delete=False

        ) as temp_file:

            temp_file.write(data)

            temp_path = Path(temp_file.name)

        # Extract text.

        content = extract_text_fromfile(str(temp_path))

        if not isinstance(content, str):

            raise TypeError(

                "extract_text_fromfile() must return a string; "

                f"received {type(content).__name__}."

            )

        content = content.strip()

        if not content:

            raise ValueError(

                "No readable text was extracted from the uploaded file."

            )

        return {

            "success": True,

            "filename": filename,

            "extension": extension,

            "characters": len(content),

            "words": len(content.split()),

            "text": content

        }

    except HTTPException:

        raise

    except Exception as exc:

        logger.exception(

            "Extraction failed for file: %s",

            file.filename

        )

        raise HTTPException(

            status_code=500,

            detail={

                "success": False,

                "exception": type(exc).__name__,

                "message": str(exc)

            }

        ) from exc

    finally:

        # Always remove the temporary file.

        if temp_path is not None:

            try:

                temp_path.unlink(missing_ok=True)

            except OSError:

                logger.exception(

                    "Failed to remove temporary file: %s",

                    temp_path

                )

        await file.close()

# ============================================================

# RESUME ANALYZER

# ============================================================

RESUME_SUPPORTED_EXTENSIONS = {

    ".pdf",

    ".docx",

    ".pptx",

    ".txt",

}

async def extract_resume_text(file: UploadFile) -> tuple[str, str]:

    """

    Extract text from an uploaded resume using the existing

    extract_text_fromfile() function.

    Returns:

        (filename, extracted_text)

    """

    temp_path = None

    try:

        if not file.filename:

            raise HTTPException(

                status_code=400,

                detail="Uploaded resume must have a filename.",

            )

        filename = Path(file.filename).name

        extension = Path(filename).suffix.lower()

        if extension not in RESUME_SUPPORTED_EXTENSIONS:

            raise HTTPException(

                status_code=415,

                detail=(

                    f"Unsupported resume format: {extension}. "

                    "Supported formats: PDF, DOCX, PPTX and TXT."

                ),

            )

        data = await file.read()

        if not data:

            raise HTTPException(

                status_code=400,

                detail="Uploaded resume is empty.",

            )

        with tempfile.NamedTemporaryFile(

            suffix=extension,

            delete=False,

        ) as temp_file:

            temp_file.write(data)

            temp_path = Path(temp_file.name)

        resume_text = extract_text_fromfile(str(temp_path))

        if not isinstance(resume_text, str) or not resume_text.strip():

            raise HTTPException(

                status_code=422,

                detail="No readable text was extracted from the resume.",

            )

        return filename, resume_text.strip()

    finally:

        if temp_path is not None:

            try:

                temp_path.unlink(missing_ok=True)

            except OSError:

                logger.exception(

                    "Failed to remove temporary resume file: %s",

                    temp_path,

                )

# ------------------------------------------------------------

# ANALYZE RESUME

# ------------------------------------------------------------

@app.post("/api/resume/analyze")

async def resume_analyze(

    file: UploadFile = File(...),

):

    """

    Analyze an uploaded resume.

    Supported formats:

        PDF, DOCX, PPTX and TXT

    """

    try:

        filename, resume_text = await extract_resume_text(file)

        result = analyze_resume(resume_text)

        return {

            "success": True,

            "filename": filename,

            "analysis": result.model_dump(),

        }

    except HTTPException:

        raise

    except ResumeTextError as exc:

        raise HTTPException(

            status_code=422,

            detail=str(exc),

        ) from exc

    except ResumeAnalysisError as exc:

        logger.exception("Resume analysis failed")

        raise HTTPException(

            status_code=500,

            detail="Resume analysis failed. Check the server logs.",

        ) from exc

    except Exception as exc:

        logger.exception("Unexpected resume analysis error")

        raise HTTPException(

            status_code=500,

            detail="Unexpected error during resume analysis.",

        ) from exc

    finally:

        await file.close()

# ------------------------------------------------------------

# ANALYZE RESUME AGAINST JOB DESCRIPTION

# ------------------------------------------------------------

@app.post("/api/resume/analyze-with-job")

async def resume_analyze_with_job(

    file: UploadFile = File(...),

    job_description: str = Form(...),

):

    """

    Analyze an uploaded resume against a job description.

    Form fields:

        file: Resume file

        job_description: Target job description

    """

    try:

        if not job_description or not job_description.strip():

            raise HTTPException(

                status_code=400,

                detail="Job description cannot be empty.",

            )

        filename, resume_text = await extract_resume_text(file)

        result = analyze_resume_with_job_description(

            resume_text=resume_text,

            job_description=job_description.strip(),

        )

        return {

            "success": True,

            "filename": filename,

            "analysis": result.model_dump(),

        }

    except HTTPException:

        raise

    except ResumeTextError as exc:

        raise HTTPException(

            status_code=422,

            detail=str(exc),

        ) from exc

    except ResumeAnalysisError as exc:

        logger.exception("Resume and job matching failed")

        raise HTTPException(

            status_code=500,

            detail="Resume and job matching failed. Check the server logs.",

        ) from exc

    except Exception as exc:

        logger.exception("Unexpected resume matching error")

        raise HTTPException(

            status_code=500,

            detail="Unexpected error during resume matching.",

        ) from exc

    finally:

        await file.close()

# ============================================================

# ============================================================

# ============================================================

# SPEECH-TO-TEXT FALLBACK (SARVAM)

# ============================================================

# Primary STT: Web Speech API in the browser.

# Fallback STT: Sarvam realtime WebSocket.

#

# The frontend should first try Web Speech API. If it is unsupported,

# permission is denied, recognition errors, or no usable transcript is

# produced, it can connect to /ws/transcribe and stream 16-bit PCM audio.

load_dotenv(BASE_DIR / ".env", override=True)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "").strip()

SARVAM_MODEL = "saaras:v4"

SARVAM_SAMPLE_RATE = 16000

SARVAM_SUPPORTED_LANGUAGES = {

    "te-IN", "en-IN", "hi-IN", "ta-IN", "kn-IN",

    "ml-IN", "bn-IN", "mr-IN", "gu-IN", "pa-IN",

}

@app.websocket("/ws/transcribe")

async def realtime_transcribe(browser_ws: WebSocket):

    """Sarvam realtime STT fallback for the browser speech flow."""

    await browser_ws.accept()

    if not SARVAM_API_KEY:

        await browser_ws.send_json({

            "event": "error",

            "message": "Sarvam fallback is not configured on the server.",

            "provider": "sarvam",

            "fallback_available": False,

            "is_fatal": True,

        })

        await browser_ws.close(code=1011)

        return

    upstream = None

    stop_event = threading.Event()

    receiver = None

    try:

        try:

            initial_message = await asyncio.wait_for(

                browser_ws.receive(), timeout=15

            )

        except asyncio.TimeoutError:

            await browser_ws.send_json({

                "event": "error",

                "message": "Speech fallback configuration timeout.",

                "provider": "sarvam",

                "is_fatal": True,

            })

            await browser_ws.close(code=1008)

            return

        if initial_message.get("type") == "websocket.disconnect":

            return

        initial_text = initial_message.get("text")

        if initial_text is None:

            await browser_ws.send_json({

                "event": "error",

                "message": "Expected a JSON start configuration as the first message.",

                "provider": "sarvam",

                "is_fatal": True,

            })

            await browser_ws.close(code=1008)

            return

        try:

            config = json.loads(initial_text)

        except (json.JSONDecodeError, TypeError):

            await browser_ws.send_json({

                "event": "error",

                "message": "Invalid speech fallback configuration.",

                "provider": "sarvam",

                "is_fatal": True,

            })

            await browser_ws.close(code=1008)

            return

        if not isinstance(config, dict) or config.get("event") != "start":

            await browser_ws.send_json({

                "event": "error",

                "message": "Expected a start event.",

                "provider": "sarvam",

                "is_fatal": True,

            })

            await browser_ws.close(code=1008)

            return

        language = config.get("language", "en-IN")
        # Rajasthani has no dedicated Sarvam code — Hindi is the closest engine.
        if str(language).lower().startswith("raj"):
            language = "hi-IN"

        if language not in SARVAM_SUPPORTED_LANGUAGES:

            await browser_ws.send_json({

                "event": "error",

                "message": f"Unsupported language: {language}",

                "provider": "sarvam",

                "is_fatal": True,

            })

            await browser_ws.close(code=1008)

            return

        params = urlencode({

            "language_code": language,

            "model": SARVAM_MODEL,

            "stream_type": "fast",

            "mode": "transcribe",

            "endpointing": "vad",

            "encoding": "linear16",

            "sample_rate": SARVAM_SAMPLE_RATE,

        })

        sarvam_url = (

            "wss://api.sarvam.ai/speech-to-text-realtime/ws?" + params

        )

        upstream = await asyncio.to_thread(

            websocket.create_connection,

            sarvam_url,

            header=[f"Api-Subscription-Key: {SARVAM_API_KEY}"],

            timeout=30,

            enable_multithread=True,

        )

        logger.info(

            "Sarvam fallback connection established language=%s model=%s",

            language,

            SARVAM_MODEL,

        )

        await browser_ws.send_json({

            "event": "ready",

            "provider": "sarvam",

            "language": language,

            "model": SARVAM_MODEL,

            "sample_rate": SARVAM_SAMPLE_RATE,

        })

        loop = asyncio.get_running_loop()

        def receive_from_sarvam():

            try:

                while not stop_event.is_set():

                    try:

                        message = upstream.recv()

                    except websocket.WebSocketTimeoutException:

                        continue

                    if not message:

                        break

                    try:

                        event = json.loads(message)

                    except (json.JSONDecodeError, TypeError):

                        logger.warning("Received a non-JSON Sarvam message.")

                        continue

                    future = asyncio.run_coroutine_threadsafe(

                        browser_ws.send_json(event), loop

                    )

                    try:

                        future.result(timeout=10)

                    except Exception:

                        stop_event.set()

                        break

                    if event.get("event") == "error" and event.get("is_fatal", False):

                        stop_event.set()

                        break

                    if event.get("event") == "session.end":

                        stop_event.set()

                        break

            except Exception:

                if not stop_event.is_set():

                    logger.exception("Error receiving Sarvam fallback transcription.")

            finally:

                stop_event.set()

        upstream.settimeout(1)

        receiver = threading.Thread(

            target=receive_from_sarvam,

            daemon=True,

        )

        receiver.start()

        while not stop_event.is_set():

            try:

                message = await browser_ws.receive()

            except WebSocketDisconnect:

                break

            if message.get("type") == "websocket.disconnect":

                break

            audio = message.get("bytes")

            if audio is not None:

                if not audio:

                    continue

                audio_b64 = base64.b64encode(audio).decode("ascii")

                await asyncio.to_thread(

                    upstream.send,

                    json.dumps({

                        "event": "audio_input",

                        "audio": audio_b64,

                    }),

                )

                continue

            text_message = message.get("text")

            if text_message is None:

                continue

            try:

                control = json.loads(text_message)

            except json.JSONDecodeError:

                await browser_ws.send_json({

                    "event": "error",

                    "message": "Invalid control message.",

                    "provider": "sarvam",

                    "is_fatal": False,

                })

                continue

            event_type = control.get("event")

            if event_type == "flush":

                await asyncio.to_thread(

                    upstream.send,

                    json.dumps({"event": "flush"}),

                )

            elif event_type == "end":

                await asyncio.to_thread(

                    upstream.send,

                    json.dumps({"event": "end"}),

                )

                break

            elif event_type == "ping":

                await asyncio.to_thread(

                    upstream.send,

                    json.dumps({"event": "ping"}),

                )

        if receiver is not None:

            await asyncio.to_thread(receiver.join, 5)

    except WebSocketDisconnect:

        logger.info("Browser disconnected from Sarvam fallback transcription.")

    except Exception:

        logger.exception("Sarvam fallback transcription failed.")

        try:

            await browser_ws.send_json({

                "event": "error",

                "message": "Sarvam fallback transcription failed.",

                "provider": "sarvam",

                "is_fatal": True,

            })

        except Exception:

            pass

    finally:

        stop_event.set()

        if upstream is not None:

            try:

                await asyncio.to_thread(upstream.close)

            except Exception:

                pass

        if receiver is not None and receiver.is_alive():

            await asyncio.to_thread(receiver.join, 2)

        logger.info("Sarvam fallback transcription session closed.")

@app.get("/api/speech/health")

def speech_health():

    """Return primary/fallback speech configuration."""

    return {

        "status": "ok",

        "primary": "webspeechapi",

        "fallback": "sarvam",

        "sarvam_configured": bool(SARVAM_API_KEY),

        "sarvam_model": SARVAM_MODEL,

        "sarvam_sample_rate": SARVAM_SAMPLE_RATE,

        "sarvam_supported_languages": sorted(SARVAM_SUPPORTED_LANGUAGES),

    }

# ============================================================

# STUDENT MODULE PERFORMANCE SUMMARY

# ============================================================

# ============================================================

@app.get("/api/student/module-summary")

def student_module_summary(

    course_id: int,

    module_id: int,

    student_id: str,

):

    """

    Generate a detailed student performance summary

    for a specific course module.

    Query parameters:

        course_id: Course ID

        module_id: Module ID

        student_id: Alphanumeric student ID

    """

    try:

        logger.info(

            "Student module summary requested course_id=%s module_id=%s",

            course_id,

            module_id,

        )

        if course_id <= 0 or module_id <= 0:

            raise HTTPException(

                status_code=400,

                detail="course_id and module_id must be positive integers.",

            )

        if not student_id.strip():

            raise HTTPException(

                status_code=400,

                detail="student_id cannot be empty.",

            )

        student_id = student_id.strip()

        summary = get_student_module_summary(

            course_id=course_id,

            module_id=module_id,

            student_id=student_id,

        )

        return {

            "success": True,

            "course_id": course_id,

            "module_id": module_id,

            "student_id": student_id,

            "summary": summary,

        }

    except HTTPException:

        raise

    except ValueError as exc:

        logger.exception("Invalid module summary request")

        raise HTTPException(

            status_code=400,

            detail=str(exc),

        ) from exc

    except Exception as exc:

        logger.exception(

            "Failed to generate module summary for student %s",

            student_id,

        )

        raise HTTPException(

            status_code=500,

            detail="Failed to generate the student module summary.",

        ) from exc

# ============================================================

# ADAPTIVE MOCK INTERVIEW

# ============================================================

from aipipe import LLM

MOCK_INTERVIEW_CONFIG = BASE_DIR / "config" / "llm.yaml"

def get_mock_interview_llm():

    if not MOCK_INTERVIEW_CONFIG.is_file():

        raise FileNotFoundError(

            f"LLM configuration not found: {MOCK_INTERVIEW_CONFIG}"

        )

    return LLM.from_config(str(MOCK_INTERVIEW_CONFIG))

class MockInterviewStartRequest(BaseModel):

    analysis: dict[str, Any]

    candidate_id: str | None = None

    language: str = "en-IN"

class MockInterviewAnswerRequest(BaseModel):
    answer: str = Field(..., min_length=1)


class MockInterviewEvaluateRequest(BaseModel):
    analysis: dict[str, Any] = Field(default_factory=dict)
    question: dict[str, Any]
    answer: str = Field(..., min_length=1)
    language: str = "en-IN"


class MockInterviewReattemptRequest(BaseModel):
    answer: str = Field(..., min_length=1)
    question_number: int = Field(..., ge=1)

# ------------------------------------------------------------

# START MOCK INTERVIEW

# ------------------------------------------------------------

@app.post("/api/mock-interview/start")

def mock_interview_start(request: MockInterviewStartRequest):
    
    try:

        logger.info("Mock interview start requested")

        if not request.analysis:

            raise HTTPException(

                status_code=400,

                detail="Resume analysis is required.",

            )

        return {

            "success": True,

            **start_interview(

                analysis=request.analysis,

                llm=get_mock_interview_llm(),

                candidate_id=request.candidate_id,

                language=request.language,

            ),

        }

    except HTTPException:

        raise

    except (ValueError, TypeError) as exc:

        raise HTTPException(

            status_code=400,

            detail=str(exc),

        ) from exc

    except Exception as exc:

        logger.exception("Could not start mock interview")

        raise HTTPException(

            status_code=500,

            detail="Could not start mock interview.",

        ) from exc

# ------------------------------------------------------------

# GET INTERVIEW STATE

# ------------------------------------------------------------

@app.get("/api/mock-interview/{session_id}")

def mock_interview_state(session_id: str):

    try:

        logger.debug("Mock interview state requested session_id=%s", session_id)

        return {

            "success": True,

            **get_interview_state(session_id),

        }

    except KeyError as exc:

        raise HTTPException(

            status_code=404,

            detail=str(exc),

        ) from exc

# ------------------------------------------------------------

# SUBMIT ANSWER AND GENERATE NEXT QUESTION

# ------------------------------------------------------------

@app.post("/api/mock-interview/{session_id}/answer")

def mock_interview_answer(

    session_id: str,

    request: MockInterviewAnswerRequest,

):

    try:

        logger.info(

            "Mock interview answer received session_id=%s answer_chars=%s",

            session_id,

            len(request.answer),

        )

        return {

            "success": True,

            **submit_answer(
                session_id=session_id,
                answer=request.answer,
                llm=get_mock_interview_llm(),

            ),

        }

    except KeyError as exc:

        raise HTTPException(

            status_code=404,

            detail=str(exc),

        ) from exc

    except ValueError as exc:

        raise HTTPException(

            status_code=400,

            detail=str(exc),

        ) from exc

    except Exception as exc:

        logger.exception(

            "Mock interview answer evaluation failed"

        )

        raise HTTPException(

            status_code=500,

            detail="Answer evaluation failed.",

        ) from exc

# ------------------------------------------------------------

# EVALUATE ANSWER ONLY / REATTEMPT

# ------------------------------------------------------------

@app.post("/api/mock-interview/evaluate")
def mock_interview_evaluate(request: MockInterviewEvaluateRequest):
    try:
        logger.info("Mock interview standalone evaluate requested")
        return {
            "success": True,
            "evaluation": evaluate_answer_only(
                analysis=request.analysis or {},
                question=request.question or {},
                answer=request.answer,
                llm=get_mock_interview_llm(),
                language=request.language or "en-IN",
            ),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Mock interview standalone evaluate failed")
        raise HTTPException(status_code=500, detail="Answer evaluation failed.") from exc


@app.post("/api/mock-interview/{session_id}/reattempt")
def mock_interview_reattempt(session_id: str, request: MockInterviewReattemptRequest):
    try:
        logger.info(
            "Mock interview reattempt session_id=%s question_number=%s",
            session_id,
            request.question_number,
        )
        return {
            "success": True,
            **reattempt_answer(
                session_id=session_id,
                question_number=request.question_number,
                answer=request.answer,
                llm=get_mock_interview_llm(),
            ),
        }
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Mock interview reattempt failed")
        raise HTTPException(status_code=500, detail="Answer evaluation failed.") from exc

# ------------------------------------------------------------

# FINISH MOCK INTERVIEW

# ------------------------------------------------------------

@app.post("/api/mock-interview/{session_id}/finish")

def mock_interview_finish(session_id: str):

    try:

        logger.info("Mock interview finish requested session_id=%s", session_id)

        return {

            "success": True,

            "performance": finish_interview(
                session_id=session_id,
                llm=get_mock_interview_llm()
            ),

        }

    except KeyError as exc:

        raise HTTPException(

            status_code=404,

            detail=str(exc),

        ) from exc
################################################################


class JobSearchRequest(BaseModel):
    keyword: str = Field(default="Python developer", min_length=1, max_length=200)
    country: str = Field(default="in", min_length=2, max_length=2)
    location: str | None = None
    date_posted: str = "all"  # all, today, 3days, week, month
    remote_only: bool = False
    employment_types: str | None = None
    job_requirements: str | None = None
    radius: int | None = Field(default=None, ge=0)
    language: str = "en"
    num_pages: int = Field(default=1, ge=1, le=20)
    cursor: str | None = None
    include_company_website: bool = True


@app.post("/api/jobs/search")
def api_search_jobs(request: JobSearchRequest):
    """Search jobs; response job objects contain only the requested five fields."""
    try:
        return search_jobs(**request.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.warning("Job search configuration/provider error: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Job search request failed")
        raise HTTPException(
            status_code=502,
            detail="Job search provider request failed. Check server logs and API limits.",
        ) from exc


@app.get("/api/jobs/health")
def api_job_search_health():
    """Report whether required job-search API keys are configured, never their values."""
    import os
    return {
        "status": "ok",
        "rapidapi_configured": bool(os.getenv("RAPIDAPI_KEY", "").strip()),
        "serper_configured": bool(os.getenv("SERPER_API_KEY", "").strip()),
    }





# ============================================================

# HEALTH

# ============================================================

@app.get("/")

def health():

    return {

        "status": "healthy",

    }
