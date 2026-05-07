import os

def get_file_content(working_directory: str, file_path: str) -> str:
    """
    Reads the content of a file safely.
    """
    try:
        abs_working_dir = os.path.abspath(working_directory)
        target_file = os.path.abspath(os.path.join(abs_working_dir, file_path))
        
        if not target_file.startswith(abs_working_dir):
            return "Error: Access denied. File is outside the working directory."
            
        if not os.path.exists(target_file):
            return f"Error: File '{file_path}' does not exist."
            
        if os.path.isdir(target_file):
            return f"Error: '{file_path}' is a directory, not a file."
            
        with open(target_file, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Truncate if too large for LLM context
        if len(content) > 10000:
            return content[:10000] + "\n... [TRUNCATED]"
            
        return content
        
    except Exception as e:
        return f"Error: {str(e)}"
