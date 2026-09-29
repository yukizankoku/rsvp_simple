from flask import Blueprint

from ..controllers import guest_controller as c
from ..utils.permissions import permission_required as perm

bp = Blueprint("guests", __name__)

manage = perm("guest.manage")
send = perm("invitation.send")

bp.add_url_rule("/events/<int:event_id>/guests", "index", manage(c.index))
bp.add_url_rule("/events/<int:event_id>/guests/create", "create", manage(c.create), methods=["GET", "POST"])
bp.add_url_rule("/events/<int:event_id>/guests/import", "import_guests", manage(c.import_guests),
                methods=["GET", "POST"])
bp.add_url_rule("/events/<int:event_id>/guests/import-template.csv", "import_template", manage(c.import_template))
bp.add_url_rule("/events/<int:event_id>/guests/export.csv", "export", manage(c.export_guests))

bp.add_url_rule("/guests/<int:guest_id>", "show", manage(c.show))
bp.add_url_rule("/guests/<int:guest_id>/edit", "edit", manage(c.edit), methods=["GET", "POST"])
bp.add_url_rule("/guests/<int:guest_id>/delete", "delete", manage(c.delete), methods=["POST"])
bp.add_url_rule("/guests/<int:guest_id>/toggle", "toggle", manage(c.toggle), methods=["POST"])
bp.add_url_rule("/guests/<int:guest_id>/regenerate", "regenerate", send(c.regenerate), methods=["POST"])
bp.add_url_rule("/guests/<int:guest_id>/whatsapp", "whatsapp", send(c.send_whatsapp), methods=["POST"])
bp.add_url_rule("/guests/<int:guest_id>/mark-sent", "mark_sent", send(c.mark_sent), methods=["POST"])
bp.add_url_rule("/guests/<int:guest_id>/checkin", "checkin", perm("checkin.perform")(c.checkin), methods=["POST"])
bp.add_url_rule("/guests/<int:guest_id>/qr.svg", "qr_svg", manage(c.qr_svg))
bp.add_url_rule("/guests/<int:guest_id>/qr", "qr_print", manage(c.qr_print))
