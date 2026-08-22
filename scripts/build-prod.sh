#!/bin/bash
set -euo pipefail

# Builds a production-ready, Chrome-Web-Store-uploadable zip of the extension,
# with config/config.json swapped for the hosted (prod) backend URLs instead
# of localhost - so a shipped build can never accidentally point at a dev
# machine.

cd "$(dirname "$0")/.."

PROD_CONFIG="config/config.prod.json"
OUT_DIR="dist"
ZIP_NAME="fine-print-extension.zip"

if grep -q "REPLACE_WITH_CLOUD_RUN_URL" "$PROD_CONFIG"; then
    echo "Error: $PROD_CONFIG still has placeholder URLs. Fill in the real Cloud Run URL before building." >&2
    exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/src/frontend" "$OUT_DIR/config"

cp manifest.json "$OUT_DIR/"
cp -R src/frontend/. "$OUT_DIR/src/frontend/"
cp "$PROD_CONFIG" "$OUT_DIR/config/config.json"

cd "$OUT_DIR"
zip -r -q "../$ZIP_NAME" . -x ".*"
cd ..

echo "Built $ZIP_NAME - ready to upload to the Chrome Web Store dashboard."
