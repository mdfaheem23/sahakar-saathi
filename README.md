# Sahakar Saathi

A multilingual voice assistant for Primary Agricultural Credit Societies (PACS), built for **Smart India Hackathon 2026, problem statement PS26088**.

Farmers ask about crop insurance (PMFBY), Kisan Credit Card loans and cooperative schemes by voice, in six Indian languages. They get a spoken answer that cites its government source. The system also checks that the source is still current.

## What's in here

| Path | What it is |
|------|------------|
| `app/` | Next.js app: web chat, kiosk UI, entitlements, grievances, admin and alerts dashboards, receipt verification |
| `app/api/` | Speech-to-text, text-to-speech, question answering (plain and streaming), receipts, daily source-check cron |
| `lib/rag/` | Retrieval (BM25 + embeddings, optional Pinecone) and grounded answer generation |
| `lib/sources/` | Registry of government sources and the checks that flag changed documents or dead portals |
| `hardware/` | ESP32 kiosk firmware, microphone test sketches, and the laptop host script |
| `scripts/` | Corpus indexing, retrieval evaluation, threshold tuning, source checks |

## Running locally

```bash
npm install
cp .env.example .env   # add your Sarvam and Mistral keys
npm run dev
```

Open http://localhost:3000. Every variable is documented in `.env.example`. Pinecone is optional: without it, retrieval runs on in-process embeddings.

Other scripts:

```bash
npm run index:corpus     # push the corpus to Pinecone
npm run eval:retrieval   # retrieval accuracy over the test cases
npm run check:sources    # re-verify the government sources now
```

## Hardware

Before flashing `hardware/esp32-kiosk/esp32-kiosk.ino`, set `WIFI_SSID` and `WIFI_PASS` to your network. The ESP32 only supports 2.4 GHz.
