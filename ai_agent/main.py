import os
import sys
import argparse
from google import genai
from google.genai import types
from rich.console import Console
from rich.panel import Panel
from rich.live import Live
from rich.markdown import Markdown

import config
from prompts import SYSTEM_PROMPT
from call_function import call_function

# Initialize Rich console
console = Console()

# Define Function Schemas
schema_get_files_info = types.FunctionDeclaration(
    name="get_files_info",
    description="List files and directories in a given path relative to the project root.",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "directory": types.Schema(
                type="STRING",
                description="The directory to list. Defaults to root ('.')."
            )
        }
    )
)

schema_get_file_content = types.FunctionDeclaration(
    name="get_file_content",
    description="Retrieve the full content of a file.",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "file_path": types.Schema(
                type="STRING",
                description="The relative path to the file."
            )
        },
        required=["file_path"]
    )
)

schema_write_file = types.FunctionDeclaration(
    name="write_file",
    description="Create a new file or overwrite an existing one with new content.",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "file_path": types.Schema(
                type="STRING",
                description="The relative path to the file."
            ),
            "content": types.Schema(
                type="STRING",
                description="The content to write into the file."
            )
        },
        required=["file_path", "content"]
    )
)

schema_run_python_file = types.FunctionDeclaration(
    name="run_python_file",
    description="Execute a Python script and capture its output.",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "file_path": types.Schema(
                type="STRING",
                description="The relative path to the Python file."
            ),
            "args": types.Schema(
                type="ARRAY",
                items=types.Schema(type="STRING"),
                description="Optional command-line arguments for the script."
            )
        },
        required=["file_path"]
    )
)

tools = [
    types.Tool(
        function_declarations=[
            schema_get_files_info,
            schema_get_file_content,
            schema_write_file,
            schema_run_python_file
        ]
    )
]

def run_agent(user_prompt, working_dir, verbose=False, max_iterations=20):
    client = genai.Client(api_key=config.GEMINI_API_KEY)
    
    # Initialize messages with System Instruction
    # Note: For conversation history, we append to a list of Content objects
    history = []
    
    current_prompt = user_prompt
    
    iteration = 0
    while iteration < max_iterations:
        iteration += 1
        console.print(f"\n[bold blue]=== Iteration {iteration} ===[/bold blue]")
        
        # Prepare valid request parameters
        # System instruction is passed in the config
        response = client.models.generate_content(
            model=config.MODEL_NAME,
            contents=history + [types.Content(role="user", parts=[types.Part(text=current_prompt)])],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=tools
            )
        )
        
        # Add user message to history
        history.append(types.Content(role="user", parts=[types.Part(text=current_prompt)]))
        
        # Process model response
        model_content = response.candidates[0].content
        history.append(model_content)
        
        # Display thinking/reasoning if text is present
        if model_content.parts and model_content.parts[0].text:
            thought = model_content.parts[0].text
            console.print(Panel(Markdown(thought), title="Agent Reasoning", border_style="green"))
            
        # Check for tool calls
        function_calls = [p.function_call for p in model_content.parts if p.function_call]
        
        if not function_calls:
            # Task likely complete
            console.print("\n[bold green]Task likely completed.[/bold green]")
            console.print(Panel(model_content.parts[0].text if model_content.parts else "No final response", title="Final Response"))
            break
            
        # Execute tool calls
        tool_responses = []
        for fc in function_calls:
            console.print(f"[bold yellow]Executing: {fc.name}[/bold yellow]")
            result = call_function(fc, working_dir, verbose)
            
            if verbose:
                console.print(Panel(result, title=f"Result: {fc.name}", border_style="dim"))
            else:
                console.print(f"[green]Done.[/green]")
                
            tool_responses.append(
                types.Part(
                    function_response=types.FunctionResponse(
                        name=fc.name,
                        response={"result": result}
                    )
                )
            )
            
        # Create a new Content object for tool results
        history.append(types.Content(role="model", parts=tool_responses))
        
        # On the next loop, the LLM will see the results in history
        # We don't necessarily need a 'new' user prompt unless we want to ask something
        current_prompt = "Please proceed based on the tool results above."

    if iteration >= max_iterations:
        console.print("[bold red]Reached maximum iterations.[/bold red]")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Autonomous AI Coding Agent")
    parser.add_argument("prompt", help="The task for the agent")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    parser.add_argument("--dir", default="calculator", help="Target working directory")
    
    args = parser.parse_args()
    
    # Ensure working directory exists
    if not os.path.exists(args.dir):
        os.makedirs(args.dir)
        
    try:
        run_agent(args.prompt, args.dir, args.verbose)
    except KeyboardInterrupt:
        console.print("\n[bold red]Agent stopped by user.[/bold red]")
    except Exception as e:
        console.print(f"\n[bold red]Critical Error: {str(e)}[/bold red]")
