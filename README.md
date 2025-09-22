# TnCExtension
A browser extension that scans Terms &amp; Conditions to highlight important clauses and potential red flags. It provides plain-language summaries of key details like rights waivers, data use, fees, and cancellations, helping users quickly understand agreements and make informed decisions before accepting.

## Project Structure

```
TnCExtension/
├── src/
│   ├── backend/
│       ├── parser/          # Web crawling service
│       └── summarizer/      # Text summarization service
│   └── frontend/            # Frontend of the extension popup
├── config/
│   ├── configLoader.json # Loading config in chrome runtime
│   └── config.json      # Configuration for service endpoints 
├── scripts/
│   ├── run-dev.sh      # Development startup script
│   └── kill-dev.sh     # Process termination script
└── requirements.txt     # Python dependencies
```


## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/Deepak-Work/TnCExtension.git
cd TnCExtension
```

### 2. Setup and Run Backend Services

```bash
python -m venv venv
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env #Edit your API keys here

cd scripts
chmod +x run-dev.sh #Modify port number in config.json if needed; 8081 by default
./run-dev.sh
```
The services will be available at:
   - Parser Service: http://localhost:8081
   - Summarizer Service: http://localhost:8001


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

## Terminate Processes

1. To stop all running services:
```bash
./scripts/kill-dev.sh
```
2. Disable extension is chrome
    1. Open Chrome -> chrome://extensions
    2. Toggle off the switch in the extension dialog box