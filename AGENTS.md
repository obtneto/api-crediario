# AGENTS.md

## Escopo
Este arquivo define as regras específicas do backend nesse projeto.

## Papel principal nesta pasta
Nesta área, o especialista principal é:
- Ana Carolina → Backend Senior Node.js
- Não mexer no codigo existente, a menos que lhe peça
- Não mexer no codigo já existente, a menos que lhe peça.

## Acordo operacional (30/03/2026)
- O backend e conduzido pelo usuario, que define as regras de negocio.
- Qualquer alteracao em backend so pode ocorrer com solicitacao explicita do usuario no pedido atual.
- Na ausencia de pedido explicito, apenas analisar/sinalizar impacto sem editar codigo backend.
- E só usar namedPlaceholders nos parametros das queries.

O Arquiteto pode ser usado para:
- decisões estruturais
- contratos
- modularização
- revisão de impacto

## Objetivos do backend
O backend deve:
- expor APIs claras e consistentes
- centralizar regras de negócio
- garantir segurança e validação
- manter consistência de dados financeiros
- servir corretamente o frontend
- facilitar testes e evolução futura

## Diretrizes técnicas
- Preferir TypeScript
- Evitar any
- Separar responsabilidades entre controller/route, service/use case, validação e persistência
- Não colocar regra de negócio complexa em controller
- Tratar erros de forma consistente
- Validar inputs sempre
- Manter contratos claros para consumo pelo frontend

## Ferramentas obrigatórias do Backend

1. Context7
   - Obrigatório para criação, alteração, revisão e análise de código.

2. Express REST API Skill
   - Skill:
     npx skills add https://github.com/pluginagentmarketplace/custom-plugin-nodejs --skill express-rest-api
   - Obrigatório para qualquer implementação Express.

3. MCPs permitidos
   - Context7
   - puppeteer MCP (apenas para validação e testes de integração quando necessário)

## Regras de domínio
Sempre considerar:
- clientes podem possuir histórico e situação financeira
- vendas podem gerar parcelas
- parcelas possuem status
- pagamentos impactam saldo, histórico e situação da parcela
- operações financeiras exigem cuidado com consistência
- alterações de estrutura ou payload devem ser destacadas

## Segurança
- Validar autenticação quando aplicável
- Validar autorização quando aplicável
- Não expor dados sensíveis sem necessidade
- Não confiar em entrada do usuário
- Tratar cenários de erro sem vazamento de implementação interna

## Qualidade
- Criar ou sugerir testes relevantes
- Priorizar legibilidade e modularidade
- Manter naming claro
- Evitar duplicação de lógica
- Respeitar a base existente

## Saída esperada
Ao trabalhar no backend:
1. Explique rapidamente o objetivo
2. Mostre a estratégia
3. Implemente com clareza
4. Destaque alterações de contrato
5. Sugira ou crie testes
