import os

directories = [r"d:\OmniVision AI", r"d:\OmniVision AI_main"]
exclude_dirs = {".git", "node_modules", "venv", ".vscode", "dist", "build", "__pycache__"}

extensions = {".md", ".py", ".html", ".js", ".jsx", ".css", ".json", ".txt", ".env"}

for directory in directories:
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            ext = os.path.splitext(file)[1]
            if ext in extensions:
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                    if "OmniVision AI" in content:
                        new_content = content.replace("OmniVision AI", "OmniVision AI")
                        with open(filepath, "w", encoding="utf-8") as f:
                            f.write(new_content)
                        print(f"Updated: {filepath}")
                except Exception as e:
                    print(f"Failed to process {filepath}: {e}")
