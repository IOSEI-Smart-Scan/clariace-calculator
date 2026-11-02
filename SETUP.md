# Configuração inicial do ClariACE

## 1. URLs de autenticação

No painel do Supabase, abra **Authentication → URL Configuration** e configure:

- **Site URL:** `https://clariace-calculator.iosei.co/`
- **Redirect URLs adicionais:** `https://clariace-calculator.iosei.co/` e `http://localhost:8765/`

Isso permite que a confirmação de e-mail volte à página certa no ambiente publicado e no computador de desenvolvimento.
O botão **Esqueci minha senha** também redireciona para a página inicial do endereço atual; mantenha os dois endereços acima na lista de redirecionamentos permitidos.

## 2. Criar a primeira conta administradora global da plataforma

Essa função administra toda a plataforma ClariACE: instituições, operadores e relatórios. Ela não pertence a uma clínica. O formulário **Solicitar acesso** da calculadora é destinado somente a operadores.

1. No Supabase, abra **Authentication → Users → Add user → Send invitation** e convide o e-mail individual da pessoa administradora da plataforma. O convite permite confirmar o endereço e definir uma senha própria.
2. Depois que o usuário aparecer em **Authentication → Users**, abra o **SQL Editor** do projeto. Substitua `admin@empresa.com` pelo e-mail convidado e execute:

```sql
UPDATE public.profiles
SET role = 'admin', is_active = true, institution_id = NULL, requested_institution = NULL
WHERE email = lower('admin@empresa.com')
RETURNING user_id, email, role, is_active;
```

3. Confira se o retorno mostra `role = admin` e `is_active = true`. A conta fica com `institution_id = NULL`, portanto é administradora global. Saia e entre novamente na calculadora; ela terá acesso ao painel de gestão de todas as instituições.

Não há uma senha inicial no código ou no banco. A pessoa convidada define a própria senha ao aceitar o convite.

Execute essa promoção somente para uma conta individual controlada por uma pessoa autorizada a administrar a plataforma ClariACE. Para adicionar outro administrador global, envie um convite separado e repita o `UPDATE` com o e-mail dele. Não compartilhe contas ou senhas do Supabase, nem use a chave `service_role` no site.

## 3. Aprovar operadores

O operador solicita acesso com nome, instituição, e-mail e senha. Depois da confirmação do e-mail, a conta aparece no painel administrativo. O administrador escolhe a instituição e marca **Liberado**. O usuário poderá entrar após a aprovação.

## 4. Banco de dados e regras

O schema, as políticas de acesso, as funções de cálculo e as regras clínicas são mantidos no projeto Supabase e geridos separadamente deste repositório público. As migrações SQL e os dados derivados das planilhas não são distribuídos aqui. Para criar ou alterar um ambiente, solicite o procedimento privado à equipe responsável pelo ClariACE; não copie as regras para o frontend nem execute SQL de outra instância sem revisão.

O frontend carrega os exames permitidos pela função autenticada `list_calculator_options()` e solicita os cálculos às funções do banco. O banco de produção já está configurado; estas instruções não recriam o schema.

## 5. Publicar

O artefato de GitHub Pages deve conter somente o frontend e seus assets; a Action publica `site/`. Em **Settings → Pages**, use **GitHub Actions** como fonte de publicação. Gere o artefato com `npm run build` antes de publicar alterações. A URL e a chave publishable presentes em `app.js` são destinadas ao navegador; nunca inclua uma chave `service_role` no site ou no repositório público.

**Atenção ao histórico:** este repositório já foi público e possui versões antigas de `data.js` e casos de auditoria. A remoção dos arquivos da versão atual não apaga cópias em commits anteriores, forks ou caches. A equipe ClariACE deve avaliar a limpeza do histórico ou a migração para um repositório novo/privado. Antes de mudar a visibilidade, confira o plano da organização: em organizações no GitHub Free, tornar o repositório privado despublica o GitHub Pages; e o site Pages pode continuar público mesmo que o repositório seja privado. Preserve e revise o DNS do domínio personalizado durante a migração.

