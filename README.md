# Sahakar Saathi

A multilingual voice assistant for Primary Agricultural Credit Societies (PACS), built for **Smart India Hackathon 2026, problem statement PS26088**.

Farmers ask about crop insurance (PMFBY), Kisan Credit Card loans and cooperative schemes by voice, in eleven Indian languages. They get a spoken answer that cites its government source. The system also checks that the source is still current.

## What's in here

| Path | What it is |
|------|------------|
| `app/` | Next.js app: web chat, kiosk UI, entitlements, grievances, admin and alerts dashboards, receipt verification |
| `app/api/` | Speech-to-text, text-to-speech, question answering (plain and streaming), receipts, daily source-check cron |
| `lib/rag/` | Retrieval (BM25 + multilingual-e5 embeddings, optional pgvector) and grounded answer generation |
| `lib/speech/` | Bhashini speech and translation, with Sarvam as the backup |
| `lib/server/` | Database access (Supabase), through locked-down database functions only |
| `lib/sources/` | Registry of government sources and the checks that flag changed documents or dead portals |
| `hardware/` | ESP32 kiosk firmware, microphone test sketches, and the laptop host script |
| `scripts/` | Corpus indexing, retrieval evaluation, threshold tuning, source checks |

## Running locally

```bash
npm install
cp .env.example .env   # add your keys; see below
npm run dev
```

Open http://localhost:3000. Every variable is documented in `.env.example`.

## AI stack

| Task | Primary | Backup |
|------|---------|--------|
| Answer generation | BharatGen Param-2, served with vLLM (`PARAM2_BASE_URL`) | Sarvam (`SARVAM_API_KEY`) |
| Speech-to-text, text-to-speech, translation | Bhashini (`BHASHINI_USER_ID`, `BHASHINI_API_KEY`) | Sarvam |
| Embeddings | multilingual-e5-small, run in-process (no API) | — |
| Vector search | pgvector on Supabase | in-process vectors |

Every primary is optional. With only `SARVAM_API_KEY` set, the app runs end to end. To serve Param-2 on a GPU:

```bash
pip install vllm
vllm serve bharatgenai/Param2-17B-A2.4B-Thinking --api-key <key>
# then set PARAM2_BASE_URL=http://<host>:8000/v1 and PARAM2_API_KEY=<key>
```

Other scripts:

```bash
npm run index:corpus     # embed the corpus; writes lib/rag/vectors.json and pgvector
npm run verify:index     # check both indexes match the corpus
npm run translate:ui     # generate interface strings for newly added languages
npm run eval:retrieval   # retrieval accuracy over the test cases
npm run check:sources    # re-verify the government sources now
```

## Hardware

Before flashing `hardware/esp32-kiosk/esp32-kiosk.ino`, set `WIFI_SSID` and `WIFI_PASS` to your network. The ESP32 only supports 2.4 GHz.
