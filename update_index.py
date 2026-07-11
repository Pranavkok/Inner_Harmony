import re

with open('index.html', 'r') as f:
    content = f.read()

# Bust cache for all card images by appending ?v=6
content = re.sub(r'src="(card_[^"]+\.jpg)(?:\?v=\d+)?"', r'src="\1?v=6"', content)

# Add philosophy image
philosophy_html = """                <div class="philosophy-mandala">
                    <img src="card_philosophy.jpg" alt="Inner Wisdom" style="width: 100%; max-width: 400px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);" />
                </div>"""
                
# Find the philosophy-mandala div and replace it
content = re.sub(r'<div class="philosophy-mandala">.*?</div>', philosophy_html, content, flags=re.DOTALL)

with open('index.html', 'w') as f:
    f.write(content)
print("Updated index.html cache busters and philosophy image")
