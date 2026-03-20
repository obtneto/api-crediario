# Crediario Backend - Hardening Checklist

## 1. Acertos principais

- `express` + `helmet` + `cors` configurados.
- Organização modular: `routes` → `controller` → `model` (DAO).
- Autenticação JWT + cookie httpOnly + renovação de token em `AuthSession`.
- Senhas com `scrypt` e compatibilidade legacy em `Criptografia.js`.
- Transações DB (`Begin/Commit/RollBack`) em operações de gravação.
- Controle de entidade via `x-entidade-negocio` no middleware.

## 2. Riscos identificados

- Uso de concatenação em queries com `LIKE '%${pesq}%'` (SQL injection potencial).
- Validação de parâmetros implementada em controllers, mas não centralizada em esquema padrão.
- `SENHA_RESET_PADRAO` hardcoded no código.
- Logout não revoga JWT server-side (falta blacklist/expiração forçada).
- Não há testes automatizados para validações/acl/DB.

## 3. Ações de hardening (prioridade alta)

1. Padronizar queries com parameters/placeholder em todos controllers.
2. Implementar validação com schema (Zod ou Joi) para `body`, `query`, `params`.
3. Mover segredos para `.env`:
   - `AUTH_JWT_SECRET`, `AUTH_PASSWORD_SECRET`, `SENHA_RESET_PADRAO`.
4. Suportar revogação de token (blacklist, cookie+header) no logout e refresh.
5. Ajustar CORS para ambiente de produção e desabilitar headers extras (e.g., `x-powered-by`).
6. Adicionar testes (unit/integration) para auth, controle de entidade, DAO e transações.

## 4. Sugestão de próxima etapa

- Criar issue trackers:
  - `sec: sql-parametrization`
  - `sec: input-schema-validation`
  - `sec: secret-management`
  - `sec: jwt-revocation`
  - `sec: cors-hardening`
  - `test: backend-integration`

- Documentar em `docs/security.md` ou `README` com procedimentos de deployment em produção.