# 📋 Rotas de Comissões - Frontend Integration Guide

## Base URL
```
http://localhost:3000/comissoes
```

---

## 🔍 **1. Listar Comissões do Cobrador**

**Método:** `GET`  
**Rota:** `/listar/:id_cobrador`  
**Autenticação:** ✅ Requerida (Session Middleware)

### Query Parameters
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|------------|-----------|
| `dt_ini` | string (YYYY-MM-DD) | ✅ Sim | Data inicial do filtro |
| `dt_fim` | string (YYYY-MM-DD) | ✅ Sim | Data final do filtro |
| `page` | number | ❌ Não | Página (padrão: 1) |
| `limit` | number | ❌ Não | Itens por página, máx 200 (padrão: 50) |

### Request Example
```javascript
fetch('http://localhost:3000/comissoes/listar/5?dt_ini=2026-01-01&dt_fim=2026-03-20&page=1&limit=50', {
  method: 'GET',
  headers: {
    'x-entidade-negocio': '1',
    'Authorization': 'Bearer {token}'
  }
})
```

### Response Success (200)
```json
{
  "err": 0,
  "status": 200,
  "msg": "",
  "data": {
    "comissoes": [
      {
        "num_recibo": "202601001001",
        "dt_recibo": "2026-01-15",
        "tp_recibo": "MENSAL",
        "vl_recibo": 1500.00,
        "vl_adiant": 500.00,
        "vl_comissao": 1000.00,
        "nom_cobrador": "João Silva"
      },
      {
        "num_recibo": "202602001002",
        "dt_recibo": "2026-02-15",
        "tp_recibo": "MENSAL",
        "vl_recibo": 1800.00,
        "vl_adiant": 600.00,
        "vl_comissao": 1200.00,
        "nom_cobrador": "João Silva"
      }
    ],
    "paginacao": {
      "page": 1,
      "limit": 50,
      "total": 2,
      "total_pages": 1
    }
  }
}
```

### Response Errors
- **400**: ID inválido / Datas inválidas / Intervalo > 45 dias
- **500**: Erro no servidor

---

## 📄 **2. Consultar Recibo Específico**

**Método:** `GET`  
**Rota:** `/consultar/:num_recibo`  
**Autenticação:** ✅ Requerida

### Request Example
```javascript
fetch('http://localhost:3000/comissoes/consultar/202601001001', {
  method: 'GET',
  headers: {
    'x-entidade-negocio': '1',
    'Authorization': 'Bearer {token}'
  }
})
```

### Response Success (200)
```json
{
  "err": 0,
  "status": 200,
  "msg": "",
  "data": {
    "num_recibo": "202601001001",
    "dt_recibo": "2026-01-15",
    "tp_recibo": "MENSAL",
    "vl_recibo": 1500.00,
    "vl_adiant": 500.00,
    "id_colaborador": 5,
    "entidade_negocio": 1
  }
}
```

### Response Errors
- **400**: Número de recibo inválido
- **404**: Recibo não encontrado
- **500**: Erro no servidor

---

## 💾 **3. Salvar/Atualizar Recibo**

**Método:** `POST`  
**Rota:** `/salvar`  
**Autenticação:** ✅ Requerida

### Request Body
```json
{
  "num_recibo": "202601001001",  // Omitir para INSERT (nova comissão)
  "id_cobrador": 5,
  "dt_recibo": "2026-01-15",
  "tp_recibo": "MENSAL",
  "vl_recibo": 1500.00,
  "vl_adiant": 500.00
}
```

### Request Example
```javascript
fetch('http://localhost:3000/comissoes/salvar', {
  method: 'POST',
  headers: {
    'x-entidade-negocio': '1',
    'Authorization': 'Bearer {token}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id_cobrador: 5,
    dt_recibo: '2026-01-15',
    tp_recibo: 'MENSAL',
    vl_recibo: 1500.00,
    vl_adiant: 500.00
  })
})
```

### Response Success (200)
```json
{
  "err": 0,
  "status": 200,
  "msg": "Comissao registrada com sucesso.",
  "data": {
    "num_recibo": "202601001001",
    "id_cobrador": 5
  }
}
```

### Response Errors
- **400**: Id invalid / Data inválida / Valor inválido
- **500**: Erro no servidor

---

## 🗑️ **4. Excluir Recibo**

**Método:** `DELETE`  
**Rota:** `/excluir/:num_recibo`  
**Autenticação:** ✅ Requerida

### Request Example
```javascript
fetch('http://localhost:3000/comissoes/excluir/202601001001', {
  method: 'DELETE',
  headers: {
    'x-entidade-negocio': '1',
    'Authorization': 'Bearer {token}'
  }
})
```

### Response Success (200)
```json
{
  "err": 0,
  "status": 200,
  "msg": "Recibo excluido com sucesso.",
  "data": []
}
```

### Response Errors
- **400**: Número de recibo inválido
- **404**: Recibo não encontrado
- **500**: Erro no servidor

---

## 📊 **Validações Backend**

| Campo | Validação |
|-------|-----------|
| `id_cobrador` | Número > 0 |
| `dt_recibo` | Formato válido (YYYY-MM-DD) |
| `tp_recibo` | String não vazia |
| `vl_recibo` | Número > 0 |
| `vl_adiant` | Número >= 0 |
| `dt_ini` / `dt_fim` | YYYY-MM-DD válido |
| Intervalo datas | Mínimo 45 dias |

---

## 🔐 **Headers Obrigatórios**

```
x-entidade-negocio: {numero_entidade}  // Ex: 1, 2, 3
Authorization: Bearer {token}           // JWT token da sessão
Content-Type: application/json          // Para POST
```

---

## 📱 **Recomendações Frontend**

✅ **Usar Paginação**: Máximo 200 registros por requisição  
✅ **Cache de Dados**: Implementar localStorage para filtros recentes  
✅ **Validação Client-Side**: Antes de enviar ao servidor  
✅ **Tratamento de Erros**: Mensagens user-friendly  
✅ **Loading States**: Indicadores visuais durante requisições  

---

## 🎨 **Sugestões de Telas**

1. **Lista de Comissões**: Tabela com filtro por data, paginação e ações (editar/deletar)
2. **Modal de Edição**: Formulário para criar/editar recibo
3. **Visualização**: Detalhe do recibo com valores calculados
4. **Relatório**: Exportação em PDF (integração futura)

---

Pronto, Gustavo! Bora!  🚀
