# Gemini Coder: Autonomous AI Agent

This is a fully functional autonomous AI Coding Agent built from scratch using Python and the Google Gemini Flash API. It is designed to simulate modern AI coding assistants like Claude Code or Cursor Agent Mode.

## Features
- **Autonomous Reasoning Loop**: The agent reasons through tasks step-by-step.
- **Function Calling**: Strategically uses tools to explore, read, write, and execute code.
- **Security Sandbox**: All operations are restricted to a specific working directory.
- **Iterative Debugging**: Automatically run tests, analyze errors, and apply fixes.
- **Rich CLI UI**: Beautiful terminal output with panels, colors, and markdown reasoning.

## Project Structure
- `main.py`: Core agent loop and Gemini API integration.
- `call_function.py`: Tool dispatcher.
- `prompts.py`: System instruction engineering.
- `functions/`: Atomic tool implementations (get_files_info, get_file_content, write_file, run_python_file).
- `calculator/`: A deliberately broken demo project for the agent to fix.

## Installation
1. Install Python 3.12+
2. Install `uv` package manager:
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```
3. Set your Gemini API Key in `.env`:
   ```env
   GEMINI_API_KEY="your_actual_key"
   ```
4. Install dependencies:
   ```bash
   uv sync
   ```

## Usage
Run the agent with a task:
```bash
uv run main.py "fix the calculator application"
```

Use verbose mode to see full tool outputs:
```bash
uv run main.py "fix the calculator application" --verbose
```

## How it Works
1. **Loop Starts**: The user provides a natural language task.
2. **LLM Prediction**: Gemini analyzes the task and history, then decides to call a tool (e.g., `get_files_info`).
3. **Tool Execution**: The local Python script executes the requested function and captures the result.
4. **Context Injection**: The tool result is appended to the conversation history.
5. **Reasoning Step**: The LLM analyzes the tool output and makes the next decision (e.g., `get_file_content`).
6. **Goal Achievement**: Once the agent is confident the task is solved (e.g., tests pass), it provides a final summary.

## Security
- **Path Traversal Protection**: Prevents access outside the target directory.
- **Timeout Limits**: Python scripts are terminated after 30 seconds to prevent infinite loops.
- **UTF-8 Only**: Primarily handles text-based code files.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
