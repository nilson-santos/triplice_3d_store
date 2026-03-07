import io
import math
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import black
import os
from django.conf import settings

# Tag dimensions - Physical layout: 2 columns of 25mm wide, 30mm tall
TAG_WIDTH = 25 * mm
TAG_HEIGHT = 30 * mm
PAGE_WIDTH = 53 * mm
MARGIN_X = 1.5 * mm

def generate_price_tags_pdf(products):
    """
    Generates a PDF containing 2 columns of price tags (25x30mm each).
    Page width is fixed to 53mm. Height is calculated based on the number of products.
    """
    buffer = io.BytesIO()
    
    # Calculate total rows needed (2 tags per row)
    total_products = len(products)
    rows = math.ceil(total_products / 2)
    
    # Calculate page height based on rows
    # Thermal printers handle continuous length, we set the height to exactly fit the content
    page_height = (rows * TAG_HEIGHT) if rows > 0 else TAG_HEIGHT
    
    # Create the PDF object
    p = canvas.Canvas(buffer, pagesize=(PAGE_WIDTH, page_height))
    
    # Set coordinates starting from the top-left
    y_start = page_height
    
    for i, product in enumerate(products):
        row = i // 2
        col = i % 2
        
        # Calculate X and Y for this specific tag
        # Tag 1 (col 0): starts at MARGIN_X
        # Tag 2 (col 1): starts at MARGIN_X + TAG_WIDTH
        x = MARGIN_X + (col * TAG_WIDTH)
        
        # Y coordinate for the top of the current row
        y = y_start - (row * TAG_HEIGHT)
        
        # Draw the tag content
        _draw_tag(p, x, y, product)

    # Close the PDF object cleanly, and we're done.
    p.showPage()
    p.save()
    
    # FileResponse expects a file-like object with a read() method
    buffer.seek(0)
    return buffer

def _draw_tag(c, x, y, product):
    """
    Draws a single price tag at the given (x,y) top-left coordinates.
    Tag size is 25mm width x 30mm height.
    The text is rotated 90 degrees to use the height as the writing width.
    """
    # Save graphics state so transformations are isolated to this tag
    c.saveState()
    
    # Draw cut line (bounding box) around the tag
    c.setLineWidth(0.5)
    c.setDash(2, 2)
    c.setStrokeColor(black)
    c.rect(x, y - TAG_HEIGHT, TAG_WIDTH, TAG_HEIGHT)
    
    # To rotate text around the tag so it runs along the 30mm height:
    # 1. Translate the origin to the bottom-left of the original tag's bounding box
    c.translate(x, y - TAG_HEIGHT)
    
    # 2. Rotate 90 degrees clockwise (which is -90 in reportlab)
    # Actually wait: standard Math degrees. -90 degrees CCW (or 270) means 
    # original X+ (right) points down (screen -Y), and Y+ (up) points right (screen X+).
    # Wait, in reportlab, Y goes UP normally. 
    # If we translate to bottom-left (x, y - TAG_HEIGHT):
    # - Rotate -90 degrees:
    # New X+ points DOWN along the old right edge.
    # New Y+ points RIGHT along the old bottom edge.
    # But we want text to flow left-to-right (horizontally) from the perspective of the *rotated* label.
    # Let's translate to Top-Left and rotate -90:
    c.translate(0, TAG_HEIGHT)
    c.rotate(-90)
    
    # Now the canvas origin is at the top-left of the original tag.
    # +X axis points DOWN the tag. (Available space: 30mm)
    # +Y axis points RIGHT across the tag. (Available space: 25mm)
    # Note: Text draws relative to baseline, so if +Y is RIGHT, the text baseline travels RIGHT, 
    # meaning the top of the text is facing LEFT (the old top edge). 
    # This means the text flows from Top-to-Bottom of the tag, and reads Top-to-Bottom!
    
    ROT_WIDTH = 30 * mm
    ROT_HEIGHT = 25 * mm
    
    padding = 2 * mm
    c.setFillColor(black)
    
    # ======= PRODUCT NAME =======
    c.setFont("Helvetica-Bold", 11)
    
    name = product.name
    max_chars_per_line = 14
    lines = []
    
    if len(name) <= max_chars_per_line:
        lines.append(name)
    else:
        words = name.split(' ')
        current_line = ""
        for word in words:
            if len(current_line) + len(word) + 1 <= max_chars_per_line:
                current_line += (word + " ")
            else:
                if current_line:
                    lines.append(current_line.strip())
                current_line = word + " "
        if current_line:
            lines.append(current_line.strip())
            
    # Draw max 3 lines centered or padded
    # Top of rotated text area is Y = ROT_HEIGHT (25mm) - padding
    text_y = ROT_HEIGHT - padding - 4 * mm
    for i, line in enumerate(lines[:3]):
        if i == 2 and len(lines) > 3:
            c.drawString(padding, text_y, line[:max_chars_per_line-3] + "...")
        else:
            c.drawString(padding, text_y, line)
        text_y -= 5 * mm

    # ======= PRODUCT PRICE =======
    c.setFont("Helvetica-Bold", 15)
    try:
        price_val = float(product.price)
        price_str = f"R$ {price_val:,.2f}".replace(",", "v").replace(".", ",").replace("v", ".")
    except:
        price_str = f"R$ {product.price}"
        
    # Draw price near bottom of rotated tag (Y = padding)
    price_y = padding + 1 * mm
    c.drawString(padding, price_y, price_str)

    c.restoreState()
