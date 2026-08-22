import os
import json
import re
from abc import ABC, abstractmethod
from dotenv import load_dotenv

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()

# Keep prompts small enough to stay cheap/fast on free tiers.
MAX_INPUT_CHARS = 15000


def extract_json(text: str) -> dict:
    """Parses a JSON object out of an LLM response, tolerating markdown code fences."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return json.loads(cleaned)


class LLMProvider(ABC):
    @abstractmethod
    def generate_json(self, prompt: str) -> dict:
        ...


class GeminiProvider(LLMProvider):
    def __init__(self):
        import google.generativeai as genai
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self._genai = genai
        self._model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    def generate_json(self, prompt: str) -> dict:
        model = self._genai.GenerativeModel(self._model_name)
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        return extract_json(response.text)


class OpenAIProvider(LLMProvider):
    def __init__(self):
        import openai
        self._client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self._model = os.getenv("OPENAI_MODEL", "gpt-4")

    def generate_json(self, prompt: str) -> dict:
        response = self._client.chat.completions.create(
            model=self._model,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}],
        )
        return extract_json(response.choices[0].message.content)


class AnthropicProvider(LLMProvider):
    """Not the default provider yet - requires a standalone Anthropic API key
    (a Claude Pro subscription alone does not grant API access)."""

    def __init__(self):
        import anthropic
        self._client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self._model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")

    def generate_json(self, prompt: str) -> dict:
        response = self._client.messages.create(
            model=self._model,
            max_tokens=2048,
            messages=[{
                "role": "user",
                "content": prompt + "\n\nRespond with ONLY valid JSON, no prose, no markdown fences.",
            }],
        )
        return extract_json(response.content[0].text)


_PROVIDERS = {
    "gemini": GeminiProvider,
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
}

_provider_instance = None


def get_provider() -> LLMProvider:
    global _provider_instance
    if _provider_instance is None:
        provider_cls = _PROVIDERS.get(LLM_PROVIDER)
        if provider_cls is None:
            raise ValueError(f"Unsupported LLM provider: {LLM_PROVIDER}")
        _provider_instance = provider_cls()
    return _provider_instance


SUMMARIZE_PROMPT = """You are helping a regular consumer understand a Terms and Conditions or Privacy Policy document before they agree to it.

Read the document text below and respond with ONLY valid JSON in exactly this shape:
{{
  "subject": "short name of the company/product/service this document belongs to, e.g. 'Wells Fargo Bilt Card'",
  "good": ["...", "..."],
  "bad": ["...", "..."]
}}

Rules:
- "good" = points that are genuinely favorable or reassuring to the consumer (at most 5 bullets).
- "bad" = red flags or risky terms a regular consumer should be wary of (at most 5 bullets).
- Each bullet is a single, concise, plain-language sentence - no legalese.
- If a category has fewer than 5 clear points, include fewer. Do not pad or invent points.
- Ignore boilerplate (site navigation, cookie banners, unrelated marketing copy).

Document text:
{text}
"""


def summarize_tnc(text: str) -> dict:
    provider = get_provider()
    prompt = SUMMARIZE_PROMPT.format(text=text[:MAX_INPUT_CHARS])
    result = provider.generate_json(prompt)

    return {
        "subject": str(result.get("subject", "")).strip(),
        "good": [str(item).strip() for item in result.get("good", []) if str(item).strip()][:5],
        "bad": [str(item).strip() for item in result.get("bad", []) if str(item).strip()][:5],
    }
