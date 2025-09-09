# TnCExtension
A browser extension that scans Terms &amp; Conditions to highlight important clauses and potential red flags. It provides plain-language summaries of key details like rights waivers, data use, fees, and cancellations, helping users quickly understand agreements and make informed decisions before accepting.


## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/Deepak-Work/TnCExtension.git
cd TnCExtension
```

### 2. Setup LLM Backend

```bash
cd server
python -m venv venv
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env #Edit your API keys here

cd ../Parser
pip install -r requirements.txt

cd ../.
chmod +x run-dev.sh #Modify port number in config.json if needed; 8081 by default
./run-dev.sh
```

### 3. Load the Chrome Extension

- Open Chrome -> chrome://extensions
- Enable Developer Mode
- Click "Load unpacked"
- Select Project Root (which contains the manifest)


### 4. Test it

- Visit a page with TnC content ([example site](https://www.wellsfargo.com/credit-cards/bilt/terms/))
- Click the extension icon
- Summary appears in popup after a few seconds
- Monitor terminal for debugging