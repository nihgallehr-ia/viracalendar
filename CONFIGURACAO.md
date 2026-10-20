# Configuração do ViraCalendar — cloud privado

Esta configuração é necessária para acessar os vídeos tanto do computador quanto do celular. GitHub Pages, sozinho, não armazena vídeos nem contas.

## 1. Criar projeto de armazenamento independente

1. Acesse https://supabase.com/dashboard e crie um **novo projeto**, separado dos seus outros sistemas, conforme as opções e custos mostrados pelo Supabase.
2. No projeto, abra **SQL Editor → New query**.
3. Cole todo o conteúdo de [supabase/setup.sql](supabase/setup.sql) e clique **Run**.
4. Confira que existe a tabela `viracalendar_videos` e, em Storage, o bucket **viracalendar-videos** está **Private**.
5. Em **Authentication → Providers → Email**, deixe login por email habilitado. Se a confirmação de email estiver ativada, você receberá um link de confirmação ao cadastrar uma conta.

## 2. Conectar o aplicativo ao banco

No painel do Supabase, em **Project Settings → API Keys** (ou **Connect**), copie:
- **Project URL**, formato `https://SEU-PROJETO.supabase.co`
- **Publishable key**, começa com `sb_publishable_` (ou a chave legacy `anon`)

Abra o ViraCalendar, clique em **Conectar a nuvem**, insira os dois valores e salve; depois cadastre-se com seu próprio email e senha.

⚠️ NUNCA insira chave `sb_secret_`, `service_role`, senha de banco de dados ou token administrativo no navegador, em mensagens ou no GitHub.

Opcional para evitar configurar novamente no celular: altere **public/cloud-config.json** neste repositório com a URL e a *publishable key*. Esses dois dados são públicos por design: os vídeos continuam privados com login + políticas RLS. NÃO adicione segredos. Após o commit, o GitHub fará novo deploy. Na ausência desse arquivo configurado, a opção Conectar a nuvem permite informar os dados uma vez **por dispositivo**.

## 3. Publicar gratuitamente no GitHub Pages

1. Abra https://github.com/nihgallehr-ia/viracalendar/settings/pages
2. Em **Build and deployment → Source**, escolha **GitHub Actions**.
3. Se não publicar automaticamente, execute **Publicar ViraCalendar** em https://github.com/nihgallehr-ia/viracalendar/actions
4. O endereço esperado é https://nihgallehr-ia.github.io/viracalendar/

**Observação:** a integração do ChatGPT pode enviar código mas, sem privilégios para configurar Pages, você precisará ativá-lo manualmente.

## 4. Usar no dia a dia

- Computador: clique em **Adicionar vídeos**, selecione vários arquivos, escolha a data de cada um e envie.
- Celular: abra o mesmo link do site, entre com o **mesmo email e senha**, toque na data para ver seus vídeos e escolha **Baixar**. No iPhone, pode ser necessário **Compartilhar → Salvar em Arquivos**.
- Clique **Marcar postado** após publicar no TikTok Shop.

**Limites:** no Supabase Free cada arquivo não pode ultrapassar 50 MB (verifique a cota de armazenamento total do seu projeto). Upload, vídeo e download consomem recursos/cotas do plano e não são ilimitados. O banco guarda os metadados e o bucket privado guarda os MP4s. Mantenha também um backup dos seus vídeos originais. Se o projeto gratuito ficar pausado por inatividade, reative-o pelo dashboard.

Nenhum vídeo é público. O link do GitHub Pages é público, mas os arquivos e registros só ficam acessíveis depois do login, sujeitos às políticas RLS.
