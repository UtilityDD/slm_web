import os

file_path = r"d:\Dipankar\MyCodes\AndroidProjects\slm_web\src\components\safety\Training.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def check_balance(text, open_t, close_t):
    count = 0
    for char in text:
        if char == open_t:
            count += 1
        elif char == close_t:
            count -= 1
    return count

print(f"Brace balance: {check_balance(content, '{', '}')}")
print(f"Paren balance: {check_balance(content, '(', ')')}")

# Check for unclosed divs is harder due to JSX, but simple string count can help
print(f"Opening div count: {content.count('<div')}")
print(f"Closing div count: {content.count('</div')}")
