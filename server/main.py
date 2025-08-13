from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from llm_wrapper import summarize_tnc

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to your needs
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/summarize")
async def summarize(request: Request):
    body = await request.json()
    text = body.get("text", "")
    result = summarize_tnc(text)

    return {"summary": result}