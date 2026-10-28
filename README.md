# Calculadora ClariACE

Abra `index.html` em um navegador moderno ou execute `python -m http.server 8765` nesta pasta e acesse `http://localhost:8765`. É um site estático, sem servidor de dados ou instalação de dependências.

As tabelas em `data.js` foram extraídas das três planilhas fornecidas pelo script `build_data.py` (Python e openpyxl são necessários apenas para regenerar os dados). O resultado mostra a planilha e a célula de origem. As faixas são interpretadas literalmente: até 80 kg e acima de 81 kg; os valores intermediários não têm resultado quando a tabela usa essas faixas. Para músculos com injetora, a tabela não contém valor acima de 80 kg. Para a concentração 370, os limites registrados são verificados e, quando ultrapassados, o cálculo é sinalizado para revisão, sem aplicar um limite automaticamente. As tabelas com injetora também registram 1,80 m na coluna de altura, cuja aplicação precisa ser confirmada.

Antes do uso assistencial, a equipe clínica responsável deve validar as tabelas, seus limites, as lacunas de peso, o significado da altura e a adequação dos cálculos ao protocolo da instituição.
