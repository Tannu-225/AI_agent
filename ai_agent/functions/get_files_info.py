import os
from pathlib import Path

def get_files_info(working_directory: str, directory: str = ".") -> str:
    """
    Lists files and directories in the given directory relative to the working directory.
    """
    try:
        # Security: Prevent path traversal
        abs_working_dir = os.path.abspath(working_directory)
        target_path = os.path.abspath(os.path.join(abs_working_dir, directory))
        
        if not target_path.startswith(abs_working_dir):
            return "Error: Access denied. Directory is outside the working directory."
            
        if not os.path.exists(target_path):
            return f"Error: Directory '{directory}' does not exist."
            
        if not os.path.isdir(target_path):
            return f"Error: '{directory}' is not a directory."
            
        output = []
        for item in os.listdir(target_path):
            item_path = os.path.join(target_path, item)
            is_dir = os.path.isdir(item_path)
            size = os.path.getsize(item_path)
            output.append(f"- {item}: file_size={size} bytes, is_dir={is_dir}")
            
        return "\n".join(output) if output else "Directory is empty."
        
    except Exception as e:
        return f"Error: {str(e)}"
