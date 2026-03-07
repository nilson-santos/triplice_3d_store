import io
import math
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import black
import os
from django.conf import settings

# Tag dimensions
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
    """
    # 1. Fill solid white background (thermal printers use white paper, but good for bounding)
    # Actually, we don't need to draw white background since paper is white, 
    # but we can optionally draw a very subtle border for cutting/reference if needed.
    
    # Text coordinates
    padding = 2 * mm
    
    # Start drawing from the top of the tag downwards
    c.setFillColor(black)
    
    # Product Name (bold-ish)
    c.setFont("Helvetica-Bold", 8)
    
    # Ensure text fits on max 3 lines roughly
    name = product.name
    # Very crude text wrap/truncation
    max_chars_per_line = 16
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
            
    # Draw max 3 lines
    text_y = y - padding - 3*mm
    for i, line in enumerate(lines[:3]):
        if i == 2 and len(lines) > 3:
            # Add ellipsis if truncated
            c.drawString(x + padding, text_y, line[:max_chars_per_line-3] + "...")
        else:
            c.drawString(x + padding, text_y, line)
        text_y -= 3.5 * mm

    # Product Price
    c.setFont("Helvetica-Bold", 12)
    # Format price to BRL format gently: "R$ 1.000,00" or just standard formatted
    try:
        price_val = float(product.price)
        price_str = f"R$ {price_val:,.2f}".replace(",", "v").replace(".", ",").replace("v", ".")
    except:
        price_str = f"R$ {product.price}"
        
    # Draw price near bottom of tag
    price_y = y - TAG_HEIGHT + padding + 2*mm
    c.drawString(x + padding, price_y, price_str)
    
    # Optional barcode/SKU area (just draw SKU if available, or just blank)
    c.setFont("Helvetica", 6)
    sku_text = f"Cod: {product.id}"
    c.drawString(x + padding, price_y - 2.5*mm, sku_text)
