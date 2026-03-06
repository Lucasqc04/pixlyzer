# API Pixlyzer ERP (Completa)

## Autenticação
- Privada: cookie JWT `auth-token` (rotas app `/api/v1/erp/*`, `/api/uploads*`).
- Pública OCR: header `x-api-key`.

## Envelope padrão
### Sucesso
```json
{ "success": true, "data": {} }
```
### Erro
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Dados inválidos", "fields": { "email": ["Email inválido"] } } }
```

## Enums de negócio
- `TransactionKind`: `INCOME | EXPENSE`
- `TransactionSource`: `MANUAL | OCR_PIX`
- `Sale.status`: `PENDING | CONFIRMED | CANCELLED`
- `Transaction.status`: `PENDING | CONFIRMED | CANCELLED`
- `Upload.reviewStatus`: `PENDING | REVIEWED | FAILED`

---
## AUTH
### POST `/api/auth/register`
Cria usuário, loja, membership owner e envia código de 6 dígitos.
- body: `{ email, password }`
- erros: `400 VALIDATION_ERROR`, `409 EMAIL_ALREADY_EXISTS`, `500 INTERNAL_ERROR`

### POST `/api/auth/verify-email`
Valida código de 6 dígitos.
- body: `{ email, code }`
- erros: `400 INVALID_CODE | CODE_EXPIRED`, `404 NOT_FOUND`, `429 TOO_MANY_ATTEMPTS`

### POST `/api/auth/resend-verification-code`
Reenvia novo código e reseta tentativas.

curl:
```bash
curl -X POST "$BASE/api/auth/verify-email" -H "Content-Type: application/json" -d '{"email":"user@acme.com","code":"123456"}'
```
fetch:
```ts
await fetch('/api/auth/verify-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,code})})
```

---
## ERP CORE
### GET `/api/v1/erp/dashboard`
KPIs executivos + top produtos/clientes/vendedores + estoque baixo + OCR/revisão + origem das transações.

### GET `/api/v1/erp/all`
Snapshot para telas ERP (produtos, clientes, vendedores, vendas, transações, equipe, convites).

### Produtos
- `GET /api/v1/erp/products`
- `POST /api/v1/erp/products`
- `PATCH /api/v1/erp/products/:id`
- `DELETE /api/v1/erp/products/:id` (arquiva via `active=false`)

Body completo (create/update):
```json
{
  "name": "Coca 2L",
  "sku": "COCA2L",
  "price": 12.9,
  "cost": 8.4,
  "stock": 30,
  "minStock": 8,
  "category": "Bebidas",
  "unit": "UN",
  "description": "Refrigerante",
  "internalNotes": "Fornecedor XPTO",
  "active": true
}
```

### Clientes
- `GET /api/v1/erp/customers`
- `POST /api/v1/erp/customers`
- `PATCH /api/v1/erp/customers/:id`
- `DELETE /api/v1/erp/customers/:id` (inativa)

### Vendedores
- `GET /api/v1/erp/sellers`
- `POST /api/v1/erp/sellers`
- `PATCH /api/v1/erp/sellers/:id`
- `DELETE /api/v1/erp/sellers/:id` (inativa)

### Vendas
- `GET /api/v1/erp/sales`
- `POST /api/v1/erp/sales`
- `PATCH /api/v1/erp/sales/:id`
- `DELETE /api/v1/erp/sales/:id` (status `CANCELLED`)

Create sale (manual/OCR):
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

### Transações
- `GET /api/v1/erp/transactions`
- `POST /api/v1/erp/transactions`
- `PATCH /api/v1/erp/transactions/:id`

Body:
```json
{ "kind":"INCOME", "description":"Recebimento PIX", "amount":100, "category":"SALES", "status":"CONFIRMED", "notes":"", "paidAt":"2026-03-06T12:00:00.000Z" }
```

### Configurações
- `GET/PATCH /api/v1/erp/store`
- `GET/PATCH /api/v1/erp/profile`
- `POST /api/v1/erp/team/invite`
- `POST /api/v1/erp/team/accept`

Erros comuns ERP: `401`, `403`, `404`, `409`, `422`, `500`.

---
## OCR / UPLOADS
- `POST /api/v1/ocr` (API key)
- `GET /api/uploads`
- `GET /api/uploads/:id`
- `PATCH /api/uploads/:id` (revisão + vínculos: `customerId`, `saleId`, `transactionId`, `reviewStatus`)
- `DELETE /api/uploads/:id`

Exemplo PATCH:
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
## Reconciliation & Inbox

### GET `/api/uploads/:id/matches`
Calcula/retorna correspondências possíveis (`PossibleUploadMatch`) com score:
- valor: até 60
- cliente: até 20
- data próxima: até 20

### POST `/api/uploads/:id/confirm-match`
Confirma correspondência e executa:
1. venda -> `PAID`
2. cria transação financeira (se inexistente)
3. vincula upload (`linkedSaleId`, `linkedTransactionId`)
4. marca upload `matchStatus=CONFIRMED`

### GET `/api/uploads?status=PENDING`
Fonte da inbox operacional `/dashboard/inbox` com filtros por status/banco.

### GET `/api/v1/erp/activity?entityType=SALE&entityId=<id>`
Timeline/auditoria por entidade (`AuditLog`).
