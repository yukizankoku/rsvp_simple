import qrcode
import qrcode.image.svg


def svg(data, box_size=10, border=2):
    """Render a QR code as SVG markup (no image library required)."""
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=box_size, border=border)
    qr.add_data(data)
    qr.make(fit=True)
    image = qr.make_image(image_factory=qrcode.image.svg.SvgPathFillImage)
    return image.to_string(encoding="unicode")
