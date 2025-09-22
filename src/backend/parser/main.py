from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from parser import extract_terms_text

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/parse")
async def parse_tnc_page(url: str = Query(..., description="The URL of the TnC page")):
    try:
        content = await extract_terms_text(url)
        return {"text": content}
    except Exception as e:
        return {"error": str(e)}
