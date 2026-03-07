import os

file_path = r"d:\Dipankar\MyCodes\AndroidProjects\slm_web\src\components\safety\Training.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Target the dynamic progress path block
start_marker = '{/* Dynamic Progress Path */}'
end_marker = 'stroke="#f97316"'

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    # Find the path tag and d attribute inside
    d_start_marker = 'd={roadmapItems.map'
    d_end_marker = '}).join(" ")}'
    
    d_start_idx = content.find(d_start_marker, start_idx)
    d_end_idx = content.find(d_end_marker, d_start_idx) + len(d_end_marker)
    
    if d_start_idx != -1 and d_end_idx != -1:
        new_svg_logic = """d={(() => {
                                                if (maxPathIndex <= 0) return '';
                                                const pathParts = [];
                                                for (let i = 0; i < maxPathIndex; i++) {
                                                    const startY = i * nodeVerticalGap + 60;
                                                    const endY = (i + 1) * nodeVerticalGap + 60;
                                                    const amplitude = isMobile ? 25 : 35;
                                                    const x1 = 50 + Math.sin(i * 0.8) * amplitude;
                                                    const x2 = 50 + Math.sin((i + 1) * 0.8) * amplitude;
                                                    const cpY1 = startY + nodeVerticalGap / 2;
                                                    const cpY2 = endY - nodeVerticalGap / 2;
                                                    pathParts.push(i === 0 
                                                        ? `M ${x1} ${startY} C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${endY}`
                                                        : `C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${endY}`);
                                                }
                                                return pathParts.join(" ");
                                            })()}"""
        
        new_content = content[:d_start_idx] + new_svg_logic + content[d_end_idx:]
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully updated Dynamic Progress Path SVG.")
    else:
        print("Found markers but could not locate d attribute logic.")
else:
    print("Could not find progress path markers.")
