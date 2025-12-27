
import json
import os

file_path = r'd:\Dipankar\MyCodes\AndroidProjects\slm_web\public\quizzes\hourly_challenge.json'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# We know the corruption is around line 2022 (1-based) -> index 2021
# Line 2022 is "]"
# Line 2031 is "["
# We want to replace lines 2021 to 2030 (indices) with a comma.

# Verify the content
print(f"Line 2022: {lines[2021].strip()}")
print(f"Line 2031: {lines[2030].strip()}")

if lines[2021].strip() == "]" and lines[2030].strip() == "[":
    print("Found expected corruption pattern.")
    
    # Keep lines before 2022
    new_lines = lines[:2021]
    
    # Add a comma to the last object
    new_lines.append(",\n")
    
    # Skip the garbage (lines 2022 to 2031, i.e., indices 2021 to 2030)
    # Start from line 2032 (index 2031)
    new_lines.extend(lines[2031:])
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("File repaired successfully.")
else:
    print("Pattern not found, aborting.")
