import subprocess
import os

def run_python_file(working_directory: str, file_path: str, args: list = []) -> str:
    """
    Executes a Python script and returns stdout, stderr, and exit code.
    """
    try:
        abs_working_dir = os.path.abspath(working_directory)
        target_file = os.path.abspath(os.path.join(abs_working_dir, file_path))
        
        if not target_file.startswith(abs_working_dir):
            return "Error: Access denied. Cannot execute files outside the working directory."
            
        if not os.path.exists(target_file):
            return f"Error: File '{file_path}' does not exist."

        # Run the process
        command = ["python3", target_file] + args
        result = subprocess.run(
            command,
            cwd=abs_working_dir,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        output = f"STDOUT:\n{result.stdout}\n\nSTDERR:\n{result.stderr}\n\nProcess exited with code {result.returncode}"
        return output
        
    except subprocess.TimeoutExpired:
        return "Error: Execution timed out after 30 seconds."
    except Exception as e:
        return f"Error: {str(e)}"
