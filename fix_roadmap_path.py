import os
import re

file_path = r"d:\Dipankar\MyCodes\AndroidProjects\slm_web\src\components\safety\Training.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update roadmapItems loop to add isUnlocked to milestones
milestone_pattern = re.compile(r"(// Milestone \(Chapter Start\)\s+roadmapItems\.push\(\{)(\s+type: 'milestone',)")
if milestone_pattern.search(content):
    content = milestone_pattern.sub(r"// Milestone (Chapter Start)\n                            const isChapterUnlocked = isLessonUnlocked(chapter.number, 1);\n                            roadmapItems.push({\2\n                                isUnlocked: isChapterUnlocked,", content)
    print("Updated milestone generation.")
else:
    print("Could not find milestone generation block.")

# 2. Add maxPathIndex calculation after the loop
loop_end_pattern = re.compile(r"(for \(let i = 1; i <= chapter\.count; i\+\+\) \{[\s\S]*?\}\s*\}\s*\);)")
if loop_end_pattern.search(content):
    content = loop_end_pattern.sub(r"\1\n\n                        const maxPathIndex = roadmapItems.reduce((max, item, idx) => {\n                            return (item.isCompleted || item.isUnlocked) ? idx : max;\n                        }, 0);", content)
    print("Added maxPathIndex calculation.")
else:
    print("Could not find loop end to insert maxPathIndex.")

# 3. Update the Dynamic Progress Path SVG
svg_path_pattern = re.compile(r'(<!-- Dynamic Progress Path -->\s+<path\s+d=\{)(roadmapItems\.map\(\(item, i\) => \{[\s\S]*?\}\)\.join\(" "\))(\s+stroke="#f97316")')
# Wait, the comment might be {/* Dynamic Progress Path */}
svg_path_pattern_alt = re.compile(r'(\{/\* Dynamic Progress Path \*/\}\s+<path\s+d=\{)(roadmapItems\.map\(\(item, i\) => \{[\s\S]*?\}\)\.join\(" "\))(\s+stroke="#f97316")')

new_svg_logic = r"""(() => {
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
                                            })()"""

if svg_path_pattern_alt.search(content):
    content = svg_path_pattern_alt.sub(f"\\1{new_svg_logic}\\3", content)
    print("Updated dynamic progress path SVG.")
else:
    print("Could not find dynamic progress path SVG block.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
