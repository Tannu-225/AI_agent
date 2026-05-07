import os

def write_file(working_directory: str, file_path: str, content: str) -> str:
    """
    Creates or overwrites a file with the given content.
    """
    try:
        abs_working_dir = os.path.abspath(working_directory)
        target_file = os.path.abspath(os.path.join(abs_working_dir, file_path))
        
        if not target_file.startswith(abs_working_dir):
            return "Error: Access denied. Cannot write outside the working directory."
            
        # Create directories if they don't exist
        os.makedirs(os.path.dirname(target_file), exist_ok=True)
        
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(content)
            
        return f"Successfully wrote to {file_path}"
        
    except Exception as e:
        return f"Error: {str(e)}"
