import os
from dotenv import load_dotenv

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER","gemini")

if LLM_PROVIDER == "gemini":
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash-latest")
elif LLM_PROVIDER == "openai":
    import openai
    openai.api_key = os.getenv("OPENAI_API_KEY")
    openai_model = os.getenv("OPENAI_MODEL", "gpt-4")


def summarize_tnc(text: str) -> str:
    prompt = f"""Analyze the following Terms and Conditions text and provide a summary in the following format:

1. **Important points to note**:
   [List key points]
2. **Key obligations of the user**:
   [List obligations]
3. **Red flags or any potential risks or liabilities**:
   [List concerns]
4. **Green flags or good points for the user**:
   [List benefits]
5. **What people say**:
   [Summarize user sentiments and cite 2-4 representative reviews. Include both positive and negative perspectives with sources if available]


    Please clearly separate each section by starting with 1.,2.,3.,4.,5. and provide a concise bulleted (markdown style, use - for bullet) summary.
    Text: {text}"""

    if LLM_PROVIDER == "gemini":
        model = genai.GenerativeModel(gemini_model)
        response = model.generate_content(prompt)
        print(response.text)
        return response.text
    elif LLM_PROVIDER == "openai":
        response = openai.ChatCompletion.create(
            model=openai_model,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content.strip()
    else:
        raise ValueError("Unsupported LLM provider specified.")