# Calculadora ClariACE

Calculadora web estática publicada no GitHub Pages, com autenticação, histórico detalhado e painel de gestão no Supabase.

## Desenvolvimento

1. Instale Node.js 20 ou superior.
2. Execute `npm install`.
3. Execute `npm run build` para gerar o cliente Supabase e montar o frontend público em `site/`.
4. Inicie um servidor local com `python -m http.server 8765` e abra `http://localhost:8765`.

O site continua sem servidor de aplicação próprio. O endereço do projeto e a chave publishable ficam no código do navegador; nenhuma chave `service_role` é usada no frontend. As tabelas e funções limitam as operações por autenticação e RLS.

## Preparar o Supabase

Veja [SETUP.md](SETUP.md) para permitir o retorno de autenticação, criar a primeira conta administradora global da plataforma e liberar operadores vinculados às clínicas.

## Dados e retenção

- Um cálculo registrado contém ID do paciente, concentração, canais, injetora, exame, peso, volume calculado, fluxo, referência de Jelco, célula de origem, operador, instituição e data/hora.
- Nome, CPF e prontuário do paciente não são solicitados nem armazenados.
- Detalhes do cálculo são ocultados após 60 dias e removidos pelo processo automático do banco. O processo roda de hora em hora.
- Após a remoção, permanecem totais mensais agrupados por instituição: quantidade de cálculos, quantidade de resultados que pediram revisão e volume calculado. Esses totais não contêm ID do paciente, peso, operador ou data/hora individual.
- O volume agregado representa o que a calculadora calculou, não confirmação de que o contraste foi administrado.
- O ID do paciente é exibido sem censura ao operador nos próprios cálculos e aos administradores globais nos relatórios. Operadores consultam apenas os registros autorizados da própria conta/instituição.

As regras e observações das planilhas ficam no schema privado do Supabase; o navegador recebe somente os nomes dos exames disponíveis por uma RPC autenticada e envia os parâmetros para outra função segura calcular. A Action de GitHub Pages publica apenas `site/`, que contém o frontend e seus assets. Dados derivados das planilhas, casos de auditoria e migrações do banco são mantidos fora deste repositório público. O provisionamento do banco é gerido separadamente pela equipe ClariACE. Valide mudanças das regras com a equipe clínica responsável antes de uso assistencial.

