# Pixlyzer API — Documentação Profissional

> Base URL (exemplo): `https://pixlyzer.app`

## 1) Convenções gerais

### Formato padrão de resposta

**Sucesso**
```json
{ "success": true, "data": {} }
```

**Erro**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "fields": { "email": ["Email inválido"] }
  }
}
```

### Códigos HTTP comuns
- `200` OK
- `201` Criado
- `400` Erro de validação
- `401` Não autenticado
- `403` Sem permissão
- `404` Não encontrado
- `409` Conflito
- `500` Erro interno

### Autenticação
- **Privada (ERP):** cookie JWT `auth-token`
- **OCR público:** header `x-api-key`

---

## 2) Auth

### POST `/api/auth/register`
Cria usuário + loja + membership owner e envia código de 6 dígitos.

- **Body obrigatório:** `email`, `password`
- **Exemplo request:**
```bash
curl -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@acme.com","password":"StrongPass123"}'
```

### POST `/api/auth/verify-email`
Valida código de 6 dígitos enviado por email.

- **Body obrigatório:** `email`, `code`
- **Erros possíveis:** `400 INVALID_CODE`, `400 CODE_EXPIRED`, `404 NOT_FOUND`, `429 TOO_MANY_ATTEMPTS`

### POST `/api/auth/resend-verification-code`
Reenvia código de verificação.

---

## 3) Dashboard

### GET `/api/v1/erp/dashboard`
Retorna KPIs executivos + blocos de ranking + OCR/revisão.

- **Auth:** cookie `auth-token`
- **Response de sucesso (resumo):**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "salesVolume": 15000,
      "netCashflow": 10200,
      "ocrCount": 120,
      "reviewRate": 0.82
    },
    "topProducts": [],
    "topCustomers": [],
    "topSellers": []
  }
}
```

### GET `/api/v1/erp/all`
Snapshot completo para telas ERP.

---

## 4) Products

### GET `/api/v1/erp/products`
Lista produtos ativos/inativos da loja.

### POST `/api/v1/erp/products`
Cria produto.

- **Body obrigatório:** `name`, `price`, `stock`
- **Body opcional:** `sku`, `cost`, `minStock`, `category`, `unit`, `description`, `internalNotes`, `active`

### PATCH `/api/v1/erp/products/:id`
Atualiza campos do produto.

### DELETE `/api/v1/erp/products/:id`
Arquiva produto (`active=false`).

---

## 5) Customers
- `GET /api/v1/erp/customers`
- `POST /api/v1/erp/customers`
- `PATCH /api/v1/erp/customers/:id`
- `DELETE /api/v1/erp/customers/:id` (inativa)

Campos comuns: `name`, `email`, `phone`, `document`, `city`, `state`, `notes`, `active`.

---

## 6) Sellers / Vendors
- `GET /api/v1/erp/sellers`
- `POST /api/v1/erp/sellers`
- `PATCH /api/v1/erp/sellers/:id`
- `DELETE /api/v1/erp/sellers/:id`

Campos comuns: `name`, `email`, `phone`, `commissionRate`, `notes`, `active`.

---

## 7) Sales
- `GET /api/v1/erp/sales`
- `POST /api/v1/erp/sales`
- `PATCH /api/v1/erp/sales/:id`
- `DELETE /api/v1/erp/sales/:id` (status `CANCELLED`)

Exemplo `POST /sales`:
```json
{
  "customerId": "uuid",
  "sellerId": "uuid",
  "status": "CONFIRMED",
  "paymentMethod": "PIX",
  "source": "OCR_PIX",
  "discount": 5,
  "freight": 2,
  "notes": "Venda balcão",
  "items": [{ "productId": "uuid", "quantity": 2, "unitPrice": 20 }]
}
```

---

## 8) Transactions
- `GET /api/v1/erp/transactions`
- `POST /api/v1/erp/transactions`
- `PATCH /api/v1/erp/transactions/:id`

Exemplo body:
```json
{
  "kind": "INCOME",
  "description": "Recebimento PIX",
  "amount": 100,
  "category": "SALES",
  "status": "CONFIRMED",
  "notes": "",
  "paidAt": "2026-03-06T12:00:00.000Z"
}
```

---

## 9) Team / Invitations
- `POST /api/v1/erp/team/invite` — envia convite
- `POST /api/v1/erp/team/accept` — aceita convite

---

## 10) Store / Profile
- `GET/PATCH /api/v1/erp/store`
- `GET/PATCH /api/v1/erp/profile`

---

## 11) OCR / Uploads
- `POST /api/v1/ocr` (público, API key)
- `GET /api/uploads`
- `GET /api/uploads/:id`
- `PATCH /api/uploads/:id`
- `DELETE /api/uploads/:id`

Exemplo de revisão/vínculo:
```json
{
  "banco": "NUBANK",
  "valor": 150,
  "pagador": "João",
  "recebedor": "Maria",
  "txId": "ABC",
  "reviewStatus": "REVIEWED",
  "customerId": "uuid",
  "saleId": "uuid",
  "transactionId": "uuid"
}
```

---

## 12) Exemplos fetch

```ts
const res = await fetch('/api/v1/erp/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Produto', price: 10, stock: 5 })
});
const json = await res.json();
```

```ts
const saleRes = await fetch('/api/v1/erp/sales', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId,
    items: [{ productId, quantity: 1, unitPrice: 50 }]
  })
});
```

---

## 13) Observações de negócio
- Upload OCR pode ser conciliado com venda/transação posteriormente.
- `DELETE` em entidades ERP normalmente representa **inativação/arquivamento**, não remoção física.
- Ao confirmar vínculo OCR ↔ venda, o fluxo pode criar transação e atualizar status de match/review.
