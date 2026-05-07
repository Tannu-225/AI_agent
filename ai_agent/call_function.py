from functions.get_files_info import get_files_info
from functions.get_file_content import get_file_content
from functions.write_file import write_file
from functions.run_python import run_python_file

def call_function(function_call, working_directory, verbose=False):
    """
    Dispatches function calls from the LLM to the actual tool implementations.
    """
    name = function_call.name
    args = function_call.args
    
    if verbose:
        print(f"[VERBOSE] Calling function: {name} with args: {args}")
        
    if name == "get_files_info":
        directory = args.get("directory", ".")
        result = get_files_info(working_directory, directory)
    elif name == "get_file_content":
        file_path = args.get("file_path")
        result = get_file_content(working_directory, file_path)
    elif name == "write_file":
        file_path = args.get("file_path")
        content = args.get("content")
        result = write_file(working_directory, file_path, content)
    elif name == "run_python_file":
        file_path = args.get("file_path")
        args_list = args.get("args", [])
        result = run_python_file(working_directory, file_path, args_list)
    else:
        result = f"Error: Function '{name}' not found."
        
    return result
