# favicon_generator.py
import os

import click
from PIL import Image, ImageColor, ImageDraw, ImageFont

# --- Configuration Constants ---
DEFAULT_RESOLUTION = (32, 32)  # Standard favicon size (e.g., 16x16, 32x32, 48x48)
# You MUST ensure this font file is accessible.
# On Linux, you might find it with `fc-match Helvetica` or look in /usr/share/fonts/
# On macOS, Helvetica is usually available.
# On Windows, "Arial" is a common fallback if Helvetica isn't installed.
# If you have a specific .ttf file, provide the full path.
# For a widely available sans-serif, you might consider "DejaVuSans.ttf"
# or allow the system to find a generic sans-serif.
DEFAULT_FONT_PATH = (
    "Helvetica"  # Pillow will try to find it; might need to be a full path to .ttf
)
DEFAULT_LETTER_COLOR = "white"
OUTPUT_DIR = "docicons"


def get_font(font_path_or_name, image_height):
    """
    Tries to load a font. Adjusts size to roughly fit the image height.
    """
    # Estimate font size: 75-80% of image height is often a good starting point
    font_size = int(image_height * 0.75)
    try:
        font = ImageFont.truetype(font_path_or_name, font_size)
    except OSError:
        click.echo(
            f"Warning: Font '{font_path_or_name}' not found or not a TTF. Falling back "
            "to default system font.",
            err=True,
        )
        try:
            # Try to load a very basic default font if the specified one fails
            font = ImageFont.load_default()  # This font is very basic and small
            # If using load_default, you might need a different sizing strategy or
            # accept its default
            # For simplicity here, we'll just use it as is, but it won't scale well
            # with image_height
            click.echo(
                "Using Pillow's basic default font. Text scaling might be poor.",
                err=True,
            )
        except OSError:
            click.echo(
                "Error: Could not load even the default system font. Please check "
                "Pillow installation.",
                err=True,
            )
            raise
    return font


def get_contrasting_outline_color(bg_color_rgb, letter_color_rgb, threshold=128):
    """
    Determines a contrasting outline color (black or white)
    if the background and letter color are too similar.
    Returns None if no outline is deemed necessary.
    """
    # Simple brightness calculation (YIQ formula)
    bg_brightness = (
        bg_color_rgb[0] * 299 + bg_color_rgb[1] * 587 + bg_color_rgb[2] * 114
    ) / 1000
    letter_brightness = (
        letter_color_rgb[0] * 299
        + letter_color_rgb[1] * 587
        + letter_color_rgb[2] * 114
    ) / 1000

    # Check if colors are too similar in brightness
    if (
        abs(bg_brightness - letter_brightness) < 50
    ):  # Arbitrary threshold for "too similar"
        # If background is dark, use white outline, else use black
        return (255, 255, 255) if bg_brightness < threshold else (0, 0, 0)
    return None


@click.command()
@click.option(
    "-l", "--letter", type=str, required=True, help="The single ASCII letter to render."
)
@click.option(
    "-b",
    "--bg-color",
    type=str,
    required=True,
    help="Background color (e.g., 'blue', '#FF0000').",
)
@click.option(
    "-c",
    "--letter-color",
    type=str,
    default=DEFAULT_LETTER_COLOR,
    show_default=True,
    help="Letter color (e.g., 'white', '#00FF00').",
)
@click.option(
    "--font-path",
    type=str,
    default=DEFAULT_FONT_PATH,
    show_default=True,
    help="Path to TTF font file or font name (e.g., 'Arial.ttf', 'Helvetica').",
)
@click.option(
    "--resolution",
    type=(int, int),
    default=DEFAULT_RESOLUTION,
    show_default=True,
    help="Image resolution as WxH (e.g., '32 32').",
)
@click.option(
    "--outline",
    is_flag=True,
    help="Add a thin contrasting outline to the letter if colors are similar.",
)
def generate_favicon(letter, bg_color, letter_color, font_path, resolution, outline):
    """
    Generates a favicon PNG image with a specified letter and colors.
    The image is saved in the 'favicons_generated' subdirectory.
    """
    if not (0 < ord(letter[0]) < 128 and len(letter) == 1):
        click.echo("Error: Letter must be a single ASCII character.", err=True)
        return

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        click.echo(f"Created output directory: {OUTPUT_DIR}")

    width, height = resolution

    try:
        bg_color_rgb = ImageColor.getrgb(bg_color)
    except ValueError:
        click.echo(
            f"Error: Invalid background color string '{bg_color}'. Use names like "
            "'red' or hex like '#FF0000'.",
            err=True,
        )
        return

    try:
        letter_color_rgb = ImageColor.getrgb(letter_color)
    except ValueError:
        click.echo(
            f"Error: Invalid letter color string '{letter_color}'. Use names like "
            "'red' or hex like '#FF0000'.",
            err=True,
        )
        return

    image = Image.new(
        "RGBA", (width, height), bg_color_rgb
    )  # Use RGBA for potential transparency
    draw = ImageDraw.Draw(image)

    try:
        font = get_font(font_path, height)
    except Exception as e:
        click.echo(f"Font loading error: {e}", err=True)
        return

    # Calculate text size and position for centering
    # For Pillow 9.2.0+ textbbox is preferred. For older, textsize.
    try:
        # bbox = draw.textbbox((0, 0), letter, font=font, anchor="lt") # x1, y1, x2, y2
        # text_width = bbox[2] - bbox[0]
        # text_height = bbox[3] - bbox[1]
        # text_x_offset = bbox[0] # if using anchor other than "lt"
        # text_y_offset = bbox[1]

        # Simpler approach for single characters, more robust across Pillow versions
        # Use anchor="mm" for middle middle if available and desired
        # For older Pillow or more control:
        left, top, right, bottom = font.getbbox(letter)
        text_width = right - left
        text_height = bottom - top  # This is the height of the character ink

        # For positioning, we want to center the character's ink box.
        # The (0,0) for text drawing is usually the baseline left.
        # We need to shift it up by 'top' (which can be negative for descenders below
        # baseline,
        # or positive for ascenders above baseline if the font metrics are unusual for
        # getbbox)
        # and also by half the difference between image height and text_height.
        x = (width - text_width) / 2 - left
        y = (height - text_height) / 2 - top

    except (
        AttributeError
    ):  # Fallback for older Pillow versions that don't have textbbox or getbbox
        click.echo(
            "Warning: Using legacy textsize. Text positioning might be less accurate.",
            err=True,
        )
        text_width, text_height = draw.textsize(letter, font=font)
        x = (width - text_width) / 2
        y = (height - text_height) / 2

    # Optional outline
    outline_color_rgb = None
    if outline:
        outline_color_rgb = get_contrasting_outline_color(
            bg_color_rgb, letter_color_rgb
        )

    if outline_color_rgb:
        # Draw outline by drawing text multiple times with slight offsets
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0:
                    continue  # Don't draw center for outline
                draw.text((x + dx, y + dy), letter, font=font, fill=outline_color_rgb)

    # Draw the main letter
    draw.text((x, y), letter, font=font, fill=letter_color_rgb)

    # Generate filename
    clean_bg_color = "".join(c if c.isalnum() else "_" for c in bg_color.lower())
    clean_letter_color = "".join(
        c if c.isalnum() else "_" for c in letter_color.lower()
    )
    filename = (
        f"favicon_{letter}_{clean_bg_color}_{clean_letter_color}_{width}x{height}.png"
    )
    filepath = os.path.join(OUTPUT_DIR, filename)

    try:
        image.save(filepath, "PNG")
        click.echo(f"Favicon saved as {filepath}")
    except Exception as e:
        click.echo(f"Error saving image: {e}", err=True)


if __name__ == "__main__":
    generate_favicon()
