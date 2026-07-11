import re

with open('css/style.css', 'r') as f:
    content = f.read()

# Replace the text colors in :root
var_replacement = """    --text:           #022c22;       /* Very dark green, high contrast */
    --text-light:     #064e3b;       /* Dark green */
    --text-muted:     #065f46;       /* Medium-dark green, perfectly legible */"""

content = re.sub(
    r'    --text:           #1e1b4b;\s*    --text-light:     #334155;\s*    --text-muted:     #64748b;',
    var_replacement,
    content
)

# Replace .philo-desc color
philo_desc_replacement = """.philo-desc {
    color: #ffffff;
    font-weight: 500;
    text-shadow: 0 1px 3px rgba(0,0,0,0.15);
    font-size: 1.15rem;"""

content = re.sub(
    r'\.philo-desc \{\s*color: rgba\(236, 216, 202, 0\.82\);\s*font-size: 1\.05rem;',
    philo_desc_replacement,
    content
)

with open('css/style.css', 'w') as f:
    f.write(content)
print("Updated css/style.css text contrast")
