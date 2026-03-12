import logging
from email.mime.image import MIMEImage
from pathlib import Path

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction


logger = logging.getLogger(__name__)

LOGO_CID = "triplice3d-logo"
STORE_PICKUP_ADDRESS = "R. Nelly da Cruz Teixeira, 594 - Ipe IV, Foz do Iguacu - PR, 85869-692"
STORE_PICKUP_MAPS_URL = "https://maps.app.goo.gl/KwQwpxR1wYfV26fF9"


STATUS_LABELS = {
    "PENDING": "Pendente",
    "CONFIRMED": "Confirmado",
    "SHIPPED": "Enviado",
    "COMPLETED": "Concluido",
    "CANCELLED": "Cancelado",
}


SHIPPING_LABELS = {
    "PICKUP_STORE": "Retirada na loja",
    "FREE_DELIVERY_FOZ": "Entrega gratis em Foz do Iguacu",
}


def _status_label(value: str | None) -> str:
    if not value:
        return "Nao informado"
    return STATUS_LABELS.get(value, value)


def _shipping_label(value: str | None) -> str:
    if not value:
        return "Nao informado"
    return SHIPPING_LABELS.get(value, value)


def _payment_label(value: str | None) -> str:
    if not value:
        return "Nao informado"
    return str(value).strip().lower()


def _payment_label_pretty(value: str | None) -> str:
    if not value:
        return "Nao informado"

    normalized = str(value).strip().lower()
    mapping = {
        "pending": "Pendente",
        "approved": "Aprovado",
        "in_process": "Em analise",
        "rejected": "Recusado",
        "cancelled": "Cancelado",
        "refunded": "Reembolsado",
        "charged_back": "Chargeback",
        "pix": "PIX",
    }
    return mapping.get(normalized, normalized.replace("_", " ").title())


def _order_total(order) -> str:
    total = sum(float(item.price_at_time) * item.quantity for item in order.items.all())
    return f"R$ {total:.2f}"


def _order_items_text(order) -> str:
    items = order.items.select_related("product").all()
    if not items:
        return "Nenhum item registrado."
    return "\n".join(
        f"- {item.quantity}x {item.product.name} | R$ {float(item.price_at_time):.2f}"
        for item in items
    )


def _order_address_text(order) -> str:
    if order.shipping_type != "FREE_DELIVERY_FOZ":
        return STORE_PICKUP_ADDRESS

    parts = [
        order.shipping_address_street,
        order.shipping_address_number,
        order.shipping_address_complement,
        order.shipping_address_neighborhood,
        order.shipping_address_city,
        order.shipping_address_state,
        order.shipping_address_zipcode,
    ]
    return ", ".join(str(part).strip() for part in parts if part)


def _base_order_message(order, previous_status: str | None = None) -> str:
    lines = [
        f"Pedido: Nᵒ {order.order_number}",
        f"Cliente: {order.customer_name}",
        f"E-mail do cliente: {order.customer_email or 'Nao informado'}",
        f"Telefone: {order.customer_phone or 'Nao informado'}",
        f"Status atual do pedido: {_status_label(order.status)}",
        f"Status do pagamento: {_payment_label(order.payment_status)}",
        f"Forma de pagamento: {order.payment_method or 'Nao informado'}",
        f"Entrega: {_shipping_label(order.shipping_type)}",
        f"Endereco: {_order_address_text(order)}",
        f"Total: {_order_total(order)}",
        "",
        "Itens:",
        _order_items_text(order),
    ]

    return "\n".join(lines)


def _logo_path() -> Path | None:
    candidates = [
        settings.BASE_DIR.parent / "frontend" / "src" / "assets" / "logo.png",
        settings.BASE_DIR.parent / "frontend" / "public" / "favicon.png",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def _attach_logo(email_message: EmailMultiAlternatives) -> None:
    logo_path = _logo_path()
    if not logo_path:
        return

    try:
        with logo_path.open("rb") as logo_file:
            image = MIMEImage(logo_file.read())
        image.add_header("Content-ID", f"<{LOGO_CID}>")
        image.add_header("Content-Disposition", "inline", filename=logo_path.name)
        email_message.attach(image)
    except Exception:
        logger.exception("Falha ao anexar logo no email.")


def _action_url(order) -> str:
    return f"{getattr(settings, 'STORE_BASE_URL', 'https://triplice3d.com.br').rstrip('/')}/rastrear-pedido"


def _pickup_maps_button(order) -> str:
    if order.shipping_type == "FREE_DELIVERY_FOZ":
        return ""

    return f"""
    <tr>
      <td align="center" style="padding:0 0 14px 0;">
        <a href="{STORE_PICKUP_MAPS_URL}" style="display:inline-block;background:#ffffff;color:#1d4ed8;text-decoration:none;font-size:14px;font-weight:800;padding:14px 22px;border-radius:999px;border:1px solid #bfdbfe;">Ver endereco da retirada no mapa</a>
      </td>
    </tr>
    """


def _email_html(
    *,
    order,
    headline: str,
    intro: str,
    previous_status: str | None = None,
    cta_label: str,
) -> str:
    items_html = "".join(
        f"""
        <tr>
          <td style="padding:0 0 12px 0;">
            <div style="border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;background:#ffffff;">
              <div style="font-size:15px;font-weight:700;color:#111827;">{item.quantity}x {item.product.name}</div>
              <div style="font-size:13px;line-height:1.5;color:#6b7280;margin-top:4px;">Valor unitario: R$ {float(item.price_at_time):.2f}</div>
            </div>
          </td>
        </tr>
        """
        for item in order.items.select_related("product").all()
    ) or """
        <tr><td style="font-size:14px;color:#6b7280;">Nenhum item registrado.</td></tr>
    """

    logo_html = f'<img src="cid:{LOGO_CID}" alt="Triplice 3D" style="display:block;margin:0 auto 18px auto;max-width:168px;width:100%;height:auto;">'
    if not _logo_path():
        logo_html = '<div style="display:inline-block;padding:12px 20px;border-radius:999px;background:rgba(255,255,255,0.16);color:#ffffff;font-size:22px;font-weight:800;letter-spacing:0.08em;">TRIPLICE 3D</div>'

    return f"""\
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{headline}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(180deg,#eff6ff 0%,#dbeafe 45%,#f8fbff 100%);margin:0;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;">
            <tr>
              <td style="padding:0;">
                <div style="background:linear-gradient(135deg,#dbeafe 0%,#bfdbfe 45%,#93c5fd 100%);border-radius:28px 28px 0 0;padding:34px 28px 26px 28px;text-align:center;box-shadow:0 24px 60px rgba(59,130,246,0.18);">
                  {logo_html}
                  <div style="font-size:28px;line-height:1.2;font-weight:800;color:#0f172a;letter-spacing:-0.03em;">{headline}</div>
                  <div style="font-size:15px;line-height:1.7;color:#334155;max-width:460px;margin:12px auto 0 auto;">{intro}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border-radius:0 0 28px 28px;padding:28px;box-shadow:0 24px 60px rgba(17,24,39,0.12);">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding:0 0 18px 0;">
                      <div style="background:linear-gradient(135deg,#eff6ff 0%,#ffffff 100%);border:1px solid #bfdbfe;border-radius:20px;padding:18px 20px;">
                        <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;color:#2563eb;text-transform:uppercase;">Pedido</div>
                        <div style="font-size:32px;line-height:1.1;font-weight:800;color:#111827;margin-top:6px;">Nᵒ {order.order_number}</div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 18px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
                            <div style="background:#f8fbff;border:1px solid #dbeafe;border-radius:18px;padding:16px;">
                              <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Status do pedido</div>
                              <div style="font-size:20px;font-weight:800;color:#111827;margin-top:8px;">{_status_label(order.status)}</div>
                            </div>
                          </td>
                          <td width="50%" style="padding:0 0 12px 8px;vertical-align:top;">
                            <div style="background:#f8fbff;border:1px solid #dbeafe;border-radius:18px;padding:16px;">
                              <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Pagamento</div>
                              <div style="font-size:20px;font-weight:800;color:#111827;margin-top:8px;">{_payment_label_pretty(order.payment_status)}</div>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 20px 0;">
                      <div style="background:#ffffff;border:1px solid #dbeafe;border-radius:20px;padding:20px;">
                        <div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:14px;">Resumo do pedido</div>
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr><td style="padding:0 0 10px 0;font-size:14px;color:#6b7280;">Cliente</td><td align="right" style="padding:0 0 10px 12px;font-size:14px;font-weight:700;color:#111827;">{order.customer_name}</td></tr>
                          <tr><td style="padding:0 0 10px 0;font-size:14px;color:#6b7280;">E-mail</td><td align="right" style="padding:0 0 10px 12px;font-size:14px;font-weight:700;color:#111827;">{order.customer_email or 'Nao informado'}</td></tr>
                          <tr><td style="padding:0 0 10px 0;font-size:14px;color:#6b7280;">Telefone</td><td align="right" style="padding:0 0 10px 12px;font-size:14px;font-weight:700;color:#111827;">{order.customer_phone or 'Nao informado'}</td></tr>
                          <tr><td style="padding:0 0 10px 0;font-size:14px;color:#6b7280;">Forma de pagamento</td><td align="right" style="padding:0 0 10px 12px;font-size:14px;font-weight:700;color:#111827;">{order.payment_method or 'Nao informado'}</td></tr>
                          <tr><td style="padding:0 0 10px 0;font-size:14px;color:#6b7280;">Entrega</td><td align="right" style="padding:0 0 10px 12px;font-size:14px;font-weight:700;color:#111827;">{_shipping_label(order.shipping_type)}</td></tr>
                          <tr><td style="padding:0;font-size:14px;color:#6b7280;">Total</td><td align="right" style="padding:0 0 0 12px;font-size:20px;font-weight:800;color:#86efac;">{_order_total(order)}</td></tr>
                        </table>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 20px 0;">
                      <div style="background:#f8fbff;border:1px solid #dbeafe;border-radius:20px;padding:20px;">
                        <div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:14px;">Endereco e entrega</div>
                        <div style="font-size:14px;line-height:1.7;color:#4b5563;">{_order_address_text(order)}</div>
                      </div>
                    </td>
                  </tr>
                  {_pickup_maps_button(order)}
                  <tr>
                    <td style="padding:0 0 20px 0;">
                      <div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:14px;">Itens do pedido</div>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        {items_html}
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:8px 0 0 0;">
                      <a href="{_action_url(order)}" style="display:inline-block;background:linear-gradient(135deg,#60a5fa 0%,#93c5fd 100%);color:#0f172a;text-decoration:none;font-size:15px;font-weight:800;padding:15px 26px;border-radius:999px;">{cta_label}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 0 0 0;font-size:12px;line-height:1.7;color:#9ca3af;text-align:center;">
                      Este email foi enviado automaticamente pela Triplice 3D.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def _send_email(subject: str, message: str, recipients: list[str], html_message: str | None = None) -> None:
    valid_recipients = [recipient for recipient in recipients if recipient]
    if not valid_recipients:
        return

    try:
        email_message = EmailMultiAlternatives(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=valid_recipients,
        )
        if html_message:
            email_message.attach_alternative(html_message, "text/html")
            _attach_logo(email_message)
        email_message.send(fail_silently=False)
    except Exception:
        logger.exception("Falha ao enviar notificacao por email.")


def send_order_status_notifications(order, previous_status: str | None = None) -> None:
    customer_email = (order.customer_email or "").strip()
    backoffice_email = (getattr(settings, "BACKOFFICE_ORDER_EMAIL", "") or "").strip()
    current_status = _status_label(order.status)
    order_number = order.order_number
    base_message = _base_order_message(order, previous_status=previous_status)

    user_subject = f"Pedido #{order_number} - status {current_status}"
    if order.status == "CONFIRMED":
        user_subject = f"Pedido #{order_number} confirmado"

    user_intro = (
        "Seu pagamento foi confirmado. Seguem os dados do pedido:\n\n"
        if order.status == "CONFIRMED"
        else "O status do seu pedido foi atualizado.\n\n"
    )
    user_headline = "Pagamento confirmado"
    user_intro_html = "Recebemos a confirmacao do seu pagamento e seu pedido ja entrou em acompanhamento."
    user_cta_label = "Acompanhar pedido"
    if order.status != "CONFIRMED":
        user_headline = f"Status atualizado para {_status_label(order.status)}"
        user_intro_html = "O andamento do seu pedido mudou. Confira abaixo o status atual e o resumo completo."

    _send_email(
        user_subject,
        f"{user_intro}{base_message}",
        [customer_email],
        html_message=_email_html(
            order=order,
            headline=user_headline,
            intro=user_intro_html,
            previous_status=previous_status,
            cta_label=user_cta_label,
        ),
    )

    if order.status == "CONFIRMED":
        backoffice_subject = f"Novo pedido confirmado #{order_number}"
        backoffice_intro = "Um pedido foi confirmado e precisa de acompanhamento do backoffice.\n\n"
        backoffice_headline = "Novo pedido confirmado"
        backoffice_intro_html = "Um pedido acabou de ser confirmado e ja pode seguir para atendimento do backoffice."
    else:
        backoffice_subject = f"Pedido #{order_number} - status {current_status}"
        backoffice_intro = "O status de um pedido foi atualizado.\n\n"
        backoffice_headline = f"Pedido em {_status_label(order.status)}"
        backoffice_intro_html = "O status de um pedido foi alterado. Abaixo esta o resumo para acompanhamento interno."

    _send_email(
        backoffice_subject,
        f"{backoffice_intro}{base_message}",
        [backoffice_email],
        html_message=_email_html(
            order=order,
            headline=backoffice_headline,
            intro=backoffice_intro_html,
            previous_status=previous_status,
            cta_label="Abrir rastreamento",
        ),
    )


def schedule_order_status_notifications(order, previous_status: str | None = None) -> None:
    transaction.on_commit(lambda: send_order_status_notifications(order, previous_status=previous_status))
