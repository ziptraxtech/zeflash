from PIL import Image, ImageDraw
import os

# Create a 1024x1024 icon with blue background and yellow lightning bolt
size = 1024
img = Image.new('RGB', (size, size), color='#4A90E2')  # Blue background

# Create drawing context
draw = ImageDraw.Draw(img)

# Draw lightning bolt shape (simplified)
lightning = [
    (size*0.45, size*0.2),   # Top
    (size*0.35, size*0.5),   # Mid left
    (size*0.5, size*0.5),    # Mid center
    (size*0.4, size*0.8),    # Bottom left
    (size*0.55, size*0.45),  # Mid right lower
    (size*0.45, size*0.45),  # Mid right upper
    (size*0.55, size*0.2),   # Top right
]

draw.polygon(lightning, fill='#FFD700')  # Yellow/gold lightning

# Save
os.makedirs('resources', exist_ok=True)
img.save('resources/icon.png')
print("✅ Icon created at resources/icon.png")
