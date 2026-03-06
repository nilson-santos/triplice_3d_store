import requests
import json
import os

url = "http://127.0.0.1:8000/api/checkout/mercadopago"
payload = {
  "customer_name": "Teste Bot",
  "customer_phone": "11999999999",
  "customer_email": "test@demo.com",
  "items": [], 
  "payment_data": {
    "transaction_amount": 100,
    "payment_method_id": "pix",
    "payer": {
      "email": "test@demo.com",
      "first_name": "Test",
      "last_name": "User",
      "identification": {
        "type": "CPF",
        "number": "19119119100"
      }
    }
  }
}

headers = {"Content-Type": "application/json"}
try:
    response = requests.post(url, json=payload, headers=headers)
    print("Status:", response.status_code)
    print("Response:", response.text)
except Exception as e:
    print("Erro Request:", e)
