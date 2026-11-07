# zagent_test

Domain test project for `quiz_ai` built on the provider-independent `aipipe` package.

## Architecture

```text
aipipe
  ^
  |
quiz_ai
  ^
  |
API / application layer
```

`aipipe` owns generic LLM, security, tools, memory, workflow, observability and MCP capabilities. `quiz_ai` owns quiz-specific schemas, generation rules and domain security detectors.

## Configuration

Set `AIPIPE_SRC` only when using an editable source checkout of aipipe. Do not hardcode a personal PC path.

For direct Ollama Cloud API tests, configure `OLLAMA_API_KEY`. Never commit the key.

## Tests

```powershell
python -m pytest -q
```

Local Ollama tests automatically skip if `http://localhost:11434` is unavailable. Direct Cloud tests skip only when `OLLAMA_API_KEY` is missing.

```powershell
python -m pytest -q -m security
python -m pytest -q -m ollama_local
python -m pytest -q -m ollama_api
```
