import sys
from rembg import remove
from PIL import Image

try:
    input_path = '/Users/pranav/Desktop/mental-health-doc-main 2/mandala_new.jpg'
    output_path = '/Users/pranav/Desktop/mental-health-doc-main 2/mandala_nobg.png'

    input_img = Image.open(input_path)
    output_img = remove(input_img)
    output_img.save(output_path)
    print("Background removed successfully.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
