# BrowserRouter + Apache (Sem 404 no F5)

## Objetivo
Evitar erro `404` ao atualizar (`F5`) rotas internas do frontend React com `BrowserRouter`.

## Causa
Com `BrowserRouter`, ao acessar `/tipos-pagamentos` e dar `F5`, o Apache tenta abrir essa rota como arquivo/pasta fisica.  
Sem fallback para `index.html`, retorna `404`.

## Requisitos
1. Build do frontend com `base: "/"` em `frontend/vite.config.js`.
2. Arquivo `.htaccess` no `dist` (origem: `frontend/public/.htaccess`).
3. Apache com `mod_rewrite` ativo.
4. `AllowOverride All` no `DocumentRoot` do site.

## .htaccess (SPA fallback)
Usar este conteudo em `/var/www/html/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  RewriteRule ^index\.html$ - [L]

  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## Configuracao Apache (vhost)
No vhost ativo (ex.: `/etc/apache2/sites-available/000-default.conf`):

```apache
<VirtualHost *:80>
    DocumentRoot /var/www/html

    <Directory /var/www/html>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

## Comandos uteis
```bash
sudo a2enmod rewrite
sudo apache2ctl configtest
sudo systemctl reload apache2
```

## Deploy correto do build
Copiar `dist` incluindo arquivos ocultos:

```bash
sudo cp -a /home/ovidio.neto/Crediario/frontend/dist/. /var/www/html/
```

## Validacao
```bash
curl -I http://localhost/
curl -I http://localhost/tipos-pagamentos
```

Esperado: ambos com `HTTP/1.1 200 OK`.
