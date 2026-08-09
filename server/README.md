# Mode Mentor — Server (Milestone 2)

Node.js/Express backend for AI-powered emotion classification and wellness scoring.

---

## Quick Start

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Start the server (models auto-download on first run)
npm start

# 4. In a separate terminal — start the Vite frontend
cd ..
npm run dev
```

Server runs on **http://localhost:3001**  
Vite proxies `/api/*` → Express automatically.

---

## API Endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/checkin/text` | `{ employeeId, text }` JSON | Text-only emotion classification |
| `POST` | `/api/checkin/photo` | multipart: `employeeId` + `image` file | Facial expression analysis |
| `POST` | `/api/checkin` | multipart: `employeeId`, `text?`, `image?` | Full fusion (text + optional selfie) |
| `GET`  | `/api/health` | — | Model readiness check |

**All responses include:**
```json
{
  "disclaimer": "This is an AI-based estimate, not a medical diagnosis."
}
```

---

## Model Choices

### Text Classifier — `SamLowe/roberta-base-go_emotions`

- **Why**: Best freely-available ONNX emotion model on Hugging Face Hub.  
  Trained on GoEmotions (58k Reddit comments, 28 labels). Strong generalization
  to workplace/wellness language.
- **Format**: Quantized int8 ONNX via `@xenova/transformers` v2 — no Python, no GPU.
- **Size**: ~80 MB (int8 quantized), cached in `~/.cache/huggingface/hub/` after first download.
- **Alternative**: `j-hartmann/emotion-english-distilroberta-base` (6 classes native,
  smaller) — swap via `TEXT_MODEL_ID` env var.

#### GoEmotions → Wellness Class Mapping

| GoEmotions label | Wellness class |
|-----------------|----------------|
| joy, amusement, excitement, gratitude, love, optimism, pride, desire | **Happy** |
| relief, approval, admiration, caring, neutral, realization, curiosity | **Calm** |
| nervousness, embarrassment, disapproval | **Stressed** |
| fear, surprise, confusion | **Anxious** |
| anger, annoyance, disappointment, disgust, remorse | **Frustrated** |
| sadness, grief, shame | **Sad** |

---

### Facial Classifier — `@vladmandic/face-api` + `node-canvas`

- **Why**: Maintained fork of face-api.js with active TF.js support.
  Works server-side via node-canvas without a browser.
- **Models**: `ssd_mobilenetv1` (face detection) + `face_expression_model`
  (expression recognition). Weights are downloaded to `./models/face-api-weights/`
  on first run.
- **Privacy**: Images are processed as in-memory `Buffer` objects.
  **No raw images are ever written to disk.**

#### face-api Expressions → Wellness Class Mapping

| face-api expression | Wellness class | Rationale |
|---------------------|---------------|-----------|
| `happy` | **Happy** | Direct match |
| `neutral` | **Calm** | Relaxed resting state |
| `sad` | **Sad** | Direct match |
| `angry` | **Frustrated** | Anger → workplace frustration |
| `fearful` | **Anxious** | Fear → anxiety spectrum |
| `disgusted` | **Frustrated** | Merged with angry (both → frustration) |
| `surprised` | **Anxious** | Negative surprise → anxiety |

> **Windows note**: `node-canvas` requires native build tools.  
> If install fails, the server starts in **text-only mode** automatically.  
> To enable facial analysis: install [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) then re-run `npm install`.

---

## Fusion Logic

File: `services/fusion.js`

```
fused[class] = textDist[class] × TEXT_WEIGHT
             + faceDist[class] × FACE_WEIGHT
```

Weights are normalised so they always sum to 1.0 even if env vars don't.

**Wellness Score (0–100):**
```
score = Σ( dist[class] × valence[class] × 100 )
```

Valence weights:

| Class | Valence |
|-------|---------|
| Happy | 1.00 |
| Calm | 0.85 |
| Sad | 0.30 |
| Anxious | 0.25 |
| Frustrated | 0.15 |
| Stressed | 0.10 |

If `topEmotion.score < CONFIDENCE_THRESHOLD` → returns `"uncertain"`.

---

## Configuration (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Express server port |
| `VITE_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `TEXT_MODEL_ID` | `SamLowe/roberta-base-go_emotions` | HF model ID |
| `CONFIDENCE_THRESHOLD` | `0.35` | Min score to report a top emotion |
| `TEXT_WEIGHT` | `0.60` | Text signal weight in fusion |
| `FACE_WEIGHT` | `0.40` | Face signal weight in fusion |
| `FACE_MODELS_PATH` | `./models/face-api-weights` | face-api weights directory |
| `NODE_ENV` | `development` | `production` redacts IDs from logs |
| `MAX_UPLOAD_MB` | `5` | Max selfie upload size |

---

## Running Tests

```bash
# Unit tests (fusion math) + integration tests (mocked classifiers)
npm test

# Validation against synthetic test set (requires running server / model loaded)
npm run validate
```

Validation report is written to `reports/validation-report.json`.

---

## Swapping / Retraining the Text Model

1. Find a Xenova-compatible ONNX model at https://huggingface.co/Xenova
2. Set `TEXT_MODEL_ID=<new-model-id>` in `.env`
3. Update `EMOTION_MAP` in `services/textClassifier.js` to match the new model's labels
4. Re-run `npm run validate` to get updated F1 scores

---

## Privacy Guardrails

- Raw check-in text is **never logged**
- Selfie image buffers are **never written to disk** (processed in memory only)
- `employeeId` appears in logs only in `NODE_ENV=development` (partially redacted)
- In `NODE_ENV=production`, only method/path/status/duration are logged
