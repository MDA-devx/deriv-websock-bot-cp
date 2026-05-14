# Free Tier Coding AI Models for Hermes Agent
> Generated from OpenRouter API — Free models with $0.00 prompt/completion pricing
> Total free models found: 28

---

## 🏆 Top Recommended for Coding

| # | Model ID | Context | Type | Notes |
|---|----------|---------|------|-------|
| ⭐ 1 | `qwen/qwen3-coder:free` | 262,000 | text->text | Qwen3 Coder - purpose-built for code generation |
| ⭐ 2 | `inclusionai/ring-2.6-1t:free` | 262,144 | text->text | Ring 2.6 1T - reasoning model, strong at agentic coding tasks (currently active in Hermes) |
| ⭐ 3 | `openai/gpt-oss-120b:free` | 131,072 | text->text | GPT-OSS 120B - OpenAI's open model, strong code generation |
| ⭐ 4 | `openai/gpt-oss-20b:free` | 131,072 | text->text | GPT-OSS 20B - lighter/faster, good for inline code tasks |
| ⭐ 5 | `google/gemma-4-26b-a4b-it:free` | 262,144 | text+image+video->text | Gemma 4 26B - multimodal, strong code reasoning |
|  6 | `google/gemma-4-31b-it:free` | 262,144 | text+image+video->text | Gemma 4 31B - larger sibling, multimodal |
| ⭐ 7 | `nvidia/nemotron-3-super-120b-a12b:free` | 262,144 | text->text | Nemotron 3 Super - NVIDIA's flagship reasoning model |
|  8 | `nvidia/nemotron-3-nano-30b-a3b:free` | 256,000 | text->text | Nemotron 3 Nano - fast, efficient coding assistant |
|  9 | `qwen/qwen3-next-80b-a3b-instruct:free` | 262,144 | text->text | Qwen3 Next 80B A3B - strong general + code |
| ⭐ 10 | `poolside/laguna-m.1:free` | 131,072 | text->text | Poolside Laguna M.1 - purpose-built coding agent model |
|  11 | `poolside/laguna-xs.2:free` | 131,072 | text->text | Poolside Laguna XS.2 - compact coding agent |
|  12 | `openrouter/owl-alpha` | 1,048,756 | text->text | OWL Alpha - 1M context, strong agentic reasoning |
|  13 | `meta-llama/llama-3.3-70b-instruct:free` | 65,536 | text->text | Llama 3.3 70B - solid general-purpose, decent code |
|  14 | `cognitivecomputations/dolphin-mistral-24b-venice-edition:free` | 32,768 | text->text | Dolphin Mistral - uncensored, good for dev tasks |
|  15 | `liquid/lfm-2.5-1.2b-thinking:free` | 32,768 | text->text | Ling Flash Mini thinking - lightweight reasoning |

## 📋 All Free Models (Full List)

| Model ID | Context Length | Type |
|----------|---------------|------|
| `openrouter/owl-alpha` | 1,048,756 | text->text |
| `google/lyria-3-pro-preview` | 1,048,576 | text+image->text+audio |
| `google/lyria-3-clip-preview` | 1,048,576 | text+image->text+audio |
| `inclusionai/ring-2.6-1t:free` | 262,144 | text->text |
| `google/gemma-4-26b-a4b-it:free` | 262,144 | text+image+video->text |
| `google/gemma-4-31b-it:free` | 262,144 | text+image+video->text |
| `nvidia/nemotron-3-super-120b-a12b:free` | 262,144 | text->text |
| `qwen/qwen3-next-80b-a3b-instruct:free` | 262,144 | text->text |
| `qwen/qwen3-coder:free` | 262,000 | text->text |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | 256,000 | text+image+audio+video->text |
| `nvidia/nemotron-3-nano-30b-a3b:free` | 256,000 | text->text |
| `openrouter/free` | 200,000 | text+image->text |
| `minimax/minimax-m2.5:free` | 196,608 | text->text |
| `baidu/cobuddy:free` | 131,072 | text->text |
| `poolside/laguna-xs.2:free` | 131,072 | text->text |
| `poolside/laguna-m.1:free` | 131,072 | text->text |
| `openai/gpt-oss-120b:free` | 131,072 | text->text |
| `openai/gpt-oss-20b:free` | 131,072 | text->text |
| `z-ai/glm-4.5-air:free` | 131,072 | text->text |
| `meta-llama/llama-3.2-3b-instruct:free` | 131,072 | text->text |
| `nousresearch/hermes-3-llama-3.1-405b:free` | 131,072 | text->text |
| `nvidia/nemotron-nano-12b-v2-vl:free` | 128,000 | text+image+video->text |
| `nvidia/nemotron-nano-9b-v2:free` | 128,000 | text->text |
| `baidu/qianfan-ocr-fast:free` | 65,536 | text+image->text |
| `meta-llama/llama-3.3-70b-instruct:free` | 65,536 | text->text |
| `liquid/lfm-2.5-1.2b-thinking:free` | 32,768 | text->text |
| `liquid/lfm-2.5-1.2b-instruct:free` | 32,768 | text->text |
| `cognitivecomputations/dolphin-mistral-24b-venice-edition:free` | 32,768 | text->text |

---

## 🔧 Hermes Configuration Snippet

Add to your Hermes config to switch models:

```json
{
  "model": {
    "provider": "openrouter",
    "name": "qwen/qwen3-coder:free"
  }
}
```

Or via CLI:
```bash
hermes model set qwen/qwen3-coder:free --provider openrouter
```

---

## 📝 Notes

- **Context length** matters for large code files — 131K+ recommended
- **qwen3-coder** and **gpt-oss** models are purpose-built for code
- **ring-2.6-1t** is currently active in this Hermes instance (reasoning model)
- **nemotron-3-super** is excellent for complex multi-step coding tasks
- All models are $0.00 cost via OpenRouter free tier (rate limits may apply)
- Multimodal models (image+video input) useful for UI/code screenshot tasks
