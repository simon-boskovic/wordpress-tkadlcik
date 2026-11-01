# Nasazení na Webglobe — runbook (radostvpohybu.cz)

Stav: **připraveno, nespuštěno.** Doména **radostvpohybu.cz**, hosting **Webglobe** (rozhodnuto 2026-11-01).
Generálka na lokální kopii prostředí Webglobe (PHP 8.2, MySQL 5.6.51) prošla 2026-11-01 (§3). Nic z tohoto souboru
neběží bez termínu a pokynu uživatele.

Vzor: runbook martinadamus.cz (`../wordpress-adamus/docs/deploy-webglobe.md`, nasazeno na Webglobe 2026-09-30) a jeho
soupis serveru (`../wordpress-adamus/docs/webglobe-inventar-2026-09-28.md`). Rozdíl: tady je to **nová instalace na nové
doméně**, žádná živá databáze ani starý WordPress k ochraně, takže odpadá úklid, otisk Booknetic i pozdní návrat.

Podklady: `docs/go-live-requirements.md` (nastavení serveru #1–27), `CLAUDE.md`.

## Rozhodnutí a pravidla

- **Kdo co dělá:** příkazy na serveru vkládá uživatel do WebSSH Webglobe, blok po bloku, a výstup vloží do konverzace.
  Claude čte výstup a řekne „pokračovat“ nebo „stop“. Claude na server nic nespouští.
- **Pipeline je stejná jako lokálně** (`build/rebuild.sh`): obsah se nikdy nepřenáší ručně, vzniká z balíku příkazy
  `wp tk …`. Generátor nezná adresu webu (odkazy jsou kořenově relativní, absolutní URL skládá téma z `home_url()`),
  takže lokálně sestavený balík platí pro radostvpohybu.cz beze změny.
- Každý `wp tk …` příkaz jde nejdřív spustit s `--dry-run`.
- Hesla (databáze, správce WordPressu, SMTP) jen ve správci hesel uživatele, nikdy v repu ani v konverzaci.
- **⚠️ ověřit** = co o tomto hostingu zatím nevíme (hodnoty v blocích jsou převzaté z martinadamus.cz na Webglobe).

| Kdy | Co | Kde |
|---|---|---|
| předem | §1 hosting, databáze, WebSSH, FTP, schránka, DNS | administrace Webglobe |
| předem | §2 klient: telefon a obsah (go-live #25) | e-mail |
| T−1 den | §4 balík: sestavit, nahrát, rozbalit, předletová kontrola | lokální PC, FTP, WebSSH |
| T0 | §5 instalace, §6 pipeline, §7 pošta, §8 ověření | WebSSH, wp-admin, prohlížeč |
| T0 + 1 týden | §9 HSTS na rok, Search Console, Site Kit | |

---

## 1. Příprava u Webglobe (administrace, před nasazením)

1. **Hosting pro radostvpohybu.cz** s doménou nasměrovanou na Webglobe (DNS u Webglobe), **bez `www`** jako hlavní
   adresa: `www.radostvpohybu.cz` → 301 na `https://radostvpohybu.cz/` (go-live #17).
2. **HTTPS**: certifikát Let's Encrypt zapnout v administraci a zapnout přesměrování HTTP → HTTPS (na martinadamus.cz
   to dělal blok v `.htaccess` od Webglobe). Ověření v §4.4.
3. **PHP webu 8.2 nebo 8.4** (obojí ověřené: lokální stack 8.4, generálka 8.2). Konzole musí volat **stejnou verzi**
   (`php8.2` / `php8.4`, výchozí `php` v konzoli Webglobe je 7.3 a WordPress ho odmítne).
4. **Databáze MySQL**: vytvořit v administraci; název, uživatel, heslo a **hostitel** (⚠️ ověřit: `localhost`, nebo
   jméno serveru) do správce hesel.
5. **WebSSH** aktivovat (na Webglobe se aktivuje na 1 h; konzole běží ve `fish`, `bash` je k dispozici, vkládá se
   **Shift+Insert**).
6. **FTP účet pro nasazení** `deploy.radostvpohybu.cz` s kořenem **mimo web**: `/home/html/radostvpohybu.cz/deploy`
   (⚠️ ověřit cestu; na martinadamus.cz `/home/html/martinadamus.cz/deploy`). Po nasazení pozastavit.
7. **E-mailová schránka odesílatele** `web@radostvpohybu.cz` (formulář posílá z ní, odpovědi jdou na adresu
   návštěvníka přes `Reply-To`). V DNS Webglobe **SPF** (`v=spf1 a mx include:_spf.webglobe.cz include:_spf.onebit.cz ~all`
   jako na martinadamus.cz, ⚠️ ověřit u podpory), **DKIM** (`default._domainkey`, Webglobe) a **DMARC** (`p=none`)
   (go-live #27).
8. Dotazy na podporu, jen pokud je potřeba: komprese `text/html` (brotli/gzip, go-live #1), zálohy (jak dlouho,
   obnova). Edge purge Webglobe nemá (před webem je nginx, revalidační `Cache-Control` stačí, ověřeno na martinadamus.cz).

## 2. Blokery obsahu (klient)

- **Telefon** `+420 773 287 1113` má 10 číslic (go-live #25). Opravit v `build/content.mjs` `contact`, commit.
  `node build/verify.mjs --golive` musí projít, jinak se nenasazuje.
- Ostatní otevřené body od klienta (termíny akcí, rozvrh, ceny, Zlín, zdroj článků) nasazení neblokují; po doplnění
  jde další balík přes §10.
- Soubory ke stažení z Webnode (leták na Šavli, 10 principů, Wu-ťi) jsou v `client-files/` a nasazují se s balíkem.

## 3. Generálka (hotovo 2026-11-01, opakovat před nasazením)

```bash
./build/rehearsal.sh          # balík z HEAD -> prázdný stack PHP 8.2 + MySQL 5.6.51 -> §5–§6 -> kontroly
./build/rehearsal.sh --down   # smazat stack generálky
```

Stack `docker/rehearsal/` (port 8030) nemá repo připojené: do prázdného WordPressu se instaluje **jen balík**,
příkazy §5–§6 s cestami `W=/var/www/html`, `D=/deploy`, WP-CLI přes `--path` a `--require` jako na serveru, bez
`tk-local.php`.

Výsledek 2026-11-01 (commit `af9bac5`+): PHP 8.2.34, MySQL 5.6.51, WordPress 7.1.2; `site-setup` (Elementor 4.3.5,
TSF 5.2.0, Complianz 7.5.5, Site Kit 1.188.0, cs_CZ), kit `[create]`, 20 souborů `[import]` (15 obrázků → WebP,
5 souborů ke stažení), 13 stránek `[create]`, `consent-setup` 63 změn → `0 to change`, `cache-setup`, `headers-setup`;
`verify.mjs --seo --cache` **All checks passed**, `interact.mjs` 7/8 (`consent` FAIL je očekávaný: bez připojeného
Site Kitu stránka žádný Google tag nemá, go-live #21), `debug.log` prázdný.
Nálezy opravené: Complianz na instalaci jen z WP-CLI nevytvořil tabulku `wp_cmplz_cookies` (`consent-setup` ji teď
vytvoří). Známé: první warm po instalaci vrátí `HIT ×9, STORED ×4` (první render stránek jednou vyprázdní cache),
druhý warm `HIT ×13` — proto §6 hřeje dvakrát.

## 4. Balík

### 4.1 Sestavení (lokálně, Git Bash, kořen repa)

```bash
git status --porcelain                  # prázdné; nasazuje se commit, ne pracovní kopie
node build/verify.mjs --golive          # telefon a zástupné texty (§2) — musí projít
./build/deploy-bundle.sh                # generate (beze změn) + npm test + verify --seo -> backups/deploy/tk-deploy-<sha>.tar.gz
```

Skript balí z commitu (`git archive`, konce řádků LF): `wp-content/themes/tkadlcik/`, `wp-content/mu-plugins/`
**bez `tk-local.php`** (lokální pošta do Mailpitu, nikdy na produkci), `build/pages/`, `build/seo.json`,
`build/media.json`, `client-img/`, `client-files/`, `wp-cli.yml`, k tomu `REVISION`, `local-versions.txt` (verze
lokálního WordPressu a pluginů) a `MANIFEST.sha256`. Vypíše součet SHA-256 balíku.

### 4.2 Nahrání a rozbalení

FileZilla, FTPS, binárně: `backups/deploy/tk-deploy-<sha>.tar.gz` → kořen účtu `deploy.radostvpohybu.cz`.
**Ne přes WebFTP Webglobe** (net2ftp `.tar.gz` sám rozbalí; když se to stane, části přesunout do `$D/bundle` a
pokračovat kontrolou manifestu).

**Blok 0** (WebSSH, jednou; po každém novém připojení `bash` + Enter, pak `. $D/tk-env.sh`):

```bash
bash
mkdir -p /home/html/radostvpohybu.cz/deploy
cat > /home/html/radostvpohybu.cz/deploy/tk-env.sh <<'EOF'
W=/home/html/radostvpohybu.cz/public_html/www
D=/home/html/radostvpohybu.cz/deploy
H=https://radostvpohybu.cz
PHP=php8.2
wp() { $PHP /usr/local/bin/wp --path="$W" --require="$W/wp-content/mu-plugins/tk-build/class-tk-build-command.php" "$@"; }
echo "web=$W  deploy=$D  home=$H"
EOF
. /home/html/radostvpohybu.cz/deploy/tk-env.sh
$PHP -v | head -1; $PHP /usr/local/bin/wp --info | grep -E 'PHP version|WP-CLI version'
```

- `PHP` = verze webu z §1.3. `wp` je funkce (funguje i uvnitř `$( … )`). `--require` načte příkazy `wp tk` ještě
  před WordPressem, aby `site-setup` mohl WordPress nainstalovat; dokud téma a mu-pluginy nejsou nakopírované (§5.2),
  volat `wp` jen pro `core`/`config` příkazy přes `$PHP /usr/local/bin/wp --path="$W"`.
- ⚠️ ověřit `W`: kořen webu domény (na martinadamus.cz `…/public_html/www`). `ls -la $W` ukáže, co tam je.

**Blok 1** (rozbalení):

```bash
. /home/html/radostvpohybu.cz/deploy/tk-env.sh
ls -l $D/*.tar.gz; sha256sum $D/tk-deploy-*.tar.gz      # stejný součet jako lokálně
rm -rf $D/bundle && mkdir -p $D/bundle && tar xzf $D/tk-deploy-*.tar.gz -C $D/bundle
cd $D/bundle && sha256sum -c --quiet MANIFEST.sha256 && echo "MANIFEST OK"; cd
cat $D/bundle/REVISION
test ! -e $D/bundle/wp-content/mu-plugins/tk-local.php && echo "tk-local.php v balíku není (správně)"
ls $D/bundle/build/pages | wc -l                        # 13
```

### 4.3 Soubor se správcem WordPressu (mimo web, jen pro instalaci)

```bash
. /home/html/radostvpohybu.cz/deploy/tk-env.sh
umask 077
cat > $D/wp-secrets.env <<EOF
WP_URL=https://radostvpohybu.cz
WP_ADMIN_USER=spravce-radost
WP_ADMIN_PASSWORD=$(head -c 24 /dev/urandom | base64 | tr -d '/+=' | cut -c1-24)
WP_ADMIN_EMAIL=tkadlcik@centrum.cz
EOF
ls -l $D/wp-secrets.env                                 # -rw------- (jen vlastník)
```

Heslo si uživatel přečte (`cat $D/wp-secrets.env` **mimo konverzaci**), uloží do správce hesel; soubor se smaže v §6.
⚠️ Jméno správce a e-mail potvrdit (jméno nesmí být `admin`; e-mail dostává upozornění WordPressu).

### 4.4 Předletová kontrola (jen čtení)

```bash
. /home/html/radostvpohybu.cz/deploy/tk-env.sh
whoami; ls -la $W; ls -ld $W
$PHP -m | grep -iE '^(gd|imagick|mysqli|zip|intl|curl|mbstring)$'   # WebP: GD nebo Imagick s WebP
$PHP -r 'echo function_exists("imagewebp") ? "GD WebP ano\n" : "GD WebP NE\n";'
curl -sI http://radostvpohybu.cz/ | head -3                          # 301 -> https://radostvpohybu.cz/
curl -sI https://www.radostvpohybu.cz/ | head -3                     # 301 -> https://radostvpohybu.cz/
curl -sI -H 'Accept-Encoding: br, gzip' https://radostvpohybu.cz/ | grep -iE '^(HTTP/|server|content-encoding)'
```

Pokračovat jen když: `$W` je prázdný nebo obsahuje jen výchozí stránku Webglobe (`index.html` apod., odklidí se v §5.1;
cokoli jiného = stop), `whoami` vlastní `$W`, GD s WebP nebo Imagick, HTTP i `www` přesměrují na
`https://radostvpohybu.cz/`.

---

## 5. Instalace WordPressu (T0)

### 5.1 Jádro a `wp-config.php`

```bash
. /home/html/radostvpohybu.cz/deploy/tk-env.sh
mkdir -p $D/stare && for f in $W/index.html $W/index.htm $W/default.html; do [ -e "$f" ] && mv "$f" $D/stare/; done
$PHP /usr/local/bin/wp --path="$W" core download --locale=cs_CZ
$PHP /usr/local/bin/wp --path="$W" config create --dbname=DOPLNIT --dbuser=DOPLNIT --dbhost=DOPLNIT --locale=cs_CZ --prompt=dbpass
```

`--prompt=dbpass` se na heslo databáze zeptá (vložit ze správce hesel, na obrazovce se neukáže). Pak:

```bash
. /home/html/radostvpohybu.cz/deploy/tk-env.sh
c() { $PHP /usr/local/bin/wp --path="$W" config set "$@"; }
c WP_ENVIRONMENT_TYPE production
c WP_CACHE true --raw
c WP_MEMORY_LIMIT 128M
c DISALLOW_FILE_EDIT true --raw
c WP_DEBUG false --raw
c WP_DEBUG_LOG false --raw
c WP_DEBUG_DISPLAY false --raw
grep -nE "DB_NAME|DB_HOST|WP_ENVIRONMENT_TYPE|WP_CACHE|WP_MEMORY_LIMIT|DISALLOW_FILE_EDIT|WP_DEBUG" $W/wp-config.php
$PHP /usr/local/bin/wp --path="$W" db check | tail -1
```

### 5.2 `.htaccess`, téma a mu-pluginy

Nová instalace nemá `.htaccess` a WP-CLI ho sám nenapíše (nezná `mod_rewrite`). Blok WordPressu se zapíše ručně;
`cache-setup` a `headers-setup` vloží své bloky **před** něj.

```bash
. /home/html/radostvpohybu.cz/deploy/tk-env.sh
[ -e $W/.htaccess ] && cp $W/.htaccess $D/stare/htaccess.puvodni && cat $W/.htaccess
cat >> $W/.htaccess <<'EOF'
# BEGIN WordPress
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
RewriteBase /
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
# END WordPress
EOF
mkdir -p $W/wp-content/mu-plugins
cp -a $D/bundle/wp-content/themes/tkadlcik $W/wp-content/themes/
cp -a $D/bundle/wp-content/mu-plugins/. $W/wp-content/mu-plugins/
test ! -e $W/wp-content/mu-plugins/tk-local.php && echo "tk-local.php na serveru není (správně)"
ls $W/wp-content/mu-plugins
```

Pokud `.htaccess` už existoval (blok HTTPS od Webglobe apod.), Claude ho přečte, než se pokračuje.

## 6. Pipeline (pořadí `build/rebuild.sh`, ověřené generálkou)

```bash
. /home/html/radostvpohybu.cz/deploy/tk-env.sh
wp tk site-setup --allow-non-local --secrets=$D/wp-secrets.env
```

Očekává se `wp core install`, Hello Elementor + `tkadlcik`, Elementor 4.3.5, The SEO Framework, Complianz 7.5.5,
Site Kit 1.188.0, čeština, permalinky `/%postname%/`. Hláška `Environment is "production": running because
--allow-non-local was given` je správně (prázdná instalace). Pak:

```bash
. /home/html/radostvpohybu.cz/deploy/tk-env.sh
rm -f $D/wp-secrets.env
wp tk kit-setup
wp tk media-import --dir=$D/bundle/client-img --manifest=$D/bundle/build/media.json --files-dir=$D/bundle/client-files
wp tk site-icon --file=$D/bundle/client-img/site-icon.png
wp tk page-upsert --dir=$D/bundle/build/pages
wp tk seo-setup --file=$D/bundle/build/seo.json
```

Očekává se: kit `[create]`, 20× `[import]` (15 obrázků → WebP, 5 souborů ke stažení), ikona webu, 13× `[create]`,
`SEO meta written for 13 pages`. Pak souhlas s cookies, cache a hlavičky:

```bash
. /home/html/radostvpohybu.cz/deploy/tk-env.sh
wp tk consent-setup                    # ~63 změn, mezi nimi "installed the cookie and service tables"
wp tk consent-setup --dry-run | tail -2   # 0 to change
wp tk cache-setup --dry-run
wp tk cache-setup
wp tk headers-setup
wp elementor flush_css; wp cache flush
wp cron event run --due-now | tail -1
wp tk cache-purge; wp tk cache-warm | tail -1; wp tk cache-warm | tail -1
wp tk doctor
grep -n '^# BEGIN\|^# END' $W/.htaccess
```

- `cache-setup --dry-run`: `[write]` řádky pro volbu `tk_page_cache` (`"mode":"rewrite","host":"radostvpohybu.cz"`),
  `cache/tk-page/.htaccess`, `.ht-stamp`, `advanced-cache.php` a blok v `.htaccess`; žádné „WP_CACHE is not true“.
- Druhý `cache-warm` musí skončit `Warmed 13 URLs. Served back as: HIT ×13` (první může mít `STORED ×4`, viz §3).
  `HIT-PHP ×N` = pravidla `.htaccess` se neuplatnila a web běží přes drop-in (martinadamus.cz: `HIT ×1, HIT-PHP ×27`,
  rychlé a funkční, řešit s podporou později). Chyba „lack the cache headers“ → `wp tk cache-setup --mode=php`
  a znovu warm (go-live #16). `MISS`/`BYPASS (scheme)` = `is_ssl()` neplatí → stop (go-live #17).
- `.htaccess` v pořadí: `TK Security Headers`, `TK Page Cache`, `WordPress`.
- `doctor`: Environment `production`, kit ours, optimized markup active, Consent configured, Page cache rewrite.

**Automatické aktualizace:** WordPress jádro jen bezpečnostní (výchozí). Pluginy **ne** automaticky (Complianz a Site
Kit jsou připnuté kvůli blokování Google tagu, go-live #21; Elementor kvůli CSS subsetu, go-live #26):

```bash
. /home/html/radostvpohybu.cz/deploy/tk-env.sh
wp plugin auto-updates disable --all; wp plugin list --fields=name,version,status,auto_update
```

## 7. Pošta formuláře (wp-admin)

`tk-form.php` posílá přes `wp_mail`; bez SMTP by šla přes PHP `mail()` a na Seznam/Centrum by nedošla
(martinadamus.cz: e-maily se ztrácely, dokud nebyl nainstalovaný WP Mail SMTP).

```bash
. /home/html/radostvpohybu.cz/deploy/tk-env.sh
wp plugin install wp-mail-smtp --activate
```

wp-admin → WP Mail SMTP → Nastavení: mailer **Ostatní SMTP**, server `smtp.onebit.cz`, šifrování **SSL**, port **465**,
autentizace zapnutá, uživatel `web@radostvpohybu.cz`, heslo schránky (⚠️ ověřit server u Webglobe; na martinadamus.cz
tyto hodnoty). Odesílatel `web@radostvpohybu.cz`, jméno „Radost v pohybu“, **vynutit** obojí. Testovací e-mail na
`tkadlcik@centrum.cz` a na vlastní Gmail: v hlavičkách `spf=pass`, `dkim=pass`, `dmarc=pass`.

Pak skutečný formulář: `https://radostvpohybu.cz/kontakt/#formular`, téma „Jiný dotaz“, vlastní e-mail. Zpráva
dorazí na `tkadlcik@centrum.cz` (ne do spamu), *Odpovědět* jde na odesílatele, odesílatel dostane potvrzení
(go-live #27). Upozornit Daniela, že přijde testovací zpráva.

## 8. Ověření (lokálně proti produkci)

```bash
node build/verify.mjs --seo --cache --base=https://radostvpohybu.cz
node build/verify.mjs --golive --base=https://radostvpohybu.cz
node build/interact.mjs all --base=https://radostvpohybu.cz      # consent FAIL do připojení Site Kitu (§9) je v pořádku
node build/css-subset.mjs --check --base=https://radostvpohybu.cz
curl -sI https://radostvpohybu.cz/ | grep -iE '^(HTTP/|x-tk-cache|cache-control|strict-transport|x-frame|x-content-type|referrer|permissions|content-encoding)'
curl -sI https://radostvpohybu.cz/prazdna-stranka/ | head -1       # 410
curl -sI https://radostvpohybu.cz/cviceni-na-akci-s-jirim-ledvinou/ | grep -iE '^(HTTP/|location)'   # 301 -> /seminar-vincent-chu/
curl -s https://radostvpohybu.cz/robots.txt; curl -s https://radostvpohybu.cz/sitemap.xml | grep -c '<loc>'
```

Ručně: iPhone Safari + Android Chrome (menu, dech, videa, mapa, formulář), Rich Results Test na `/` a `/kontakt/`,
cookie lišta v anonymním okně (Odmítnout / Přijmout / „Nastavení cookies“ v patičce).

## 9. Potom

- **Site Kit** (go-live #21): připojit Google účet klienta a GA4 v wp-admin, pak `wp tk consent-setup --dry-run`
  → `0 to change`, `wp tk cache-purge && wp tk cache-warm`, `node build/interact.mjs consent --base=…` → ok.
- **Search Console:** ověřit doménu (DNS TXT u Webglobe), odeslat `https://radostvpohybu.cz/sitemap.xml`.
- **HSTS** po týdnu bez problémů: `wp config set TK_HSTS_MAX_AGE 31536000 --raw && wp tk headers-setup`.
- **Webnode:** `dan24.webnode.cz` je subdoména Webnode, přesměrování 301 tam nastavit nejde. Klient na starý web
  dá odkaz/oznámení „Web se přestěhoval na radostvpohybu.cz“ a starý web vypne, až Google nový web zaindexuje (Search
  Console → Stránky). Do té doby obsah žije na obou adresách; nový web má vlastní canonical.
- FTP účet `deploy.radostvpohybu.cz` pozastavit; `$D/bundle` může zůstat (bez hesel), `$D/stare` po kontrole smazat.
- Zálohy Webglobe ověřit (jak dlouho, co obsahují).

## 10. Další nasazení (změna obsahu nebo kódu)

Lokálně commit → `./build/deploy-bundle.sh` → nahrát → Blok 1 (§4.2) → podle toho, co se změnilo:

```bash
. /home/html/radostvpohybu.cz/deploy/tk-env.sh
cp -a $D/bundle/wp-content/themes/tkadlcik/. $W/wp-content/themes/tkadlcik/
cp -a $D/bundle/wp-content/mu-plugins/. $W/wp-content/mu-plugins/     # balík tk-local.php nemá
wp tk media-import --dir=$D/bundle/client-img --manifest=$D/bundle/build/media.json --files-dir=$D/bundle/client-files --dry-run
wp tk page-upsert --dir=$D/bundle/build/pages --dry-run       # [update] jen u změněných stránek
wp tk page-upsert --dir=$D/bundle/build/pages
wp tk seo-setup --file=$D/bundle/build/seo.json
wp elementor flush_css; wp cache flush; wp tk cache-purge; wp tk cache-warm | tail -1
```

Minulé akce dostanou štítek „Proběhlo“ jen novým buildem (datum se počítá při generování): po termínu akce nový balík.

## 11. Návrat

Nová doména bez předchozího webu: návrat = údržba, ne obnova. Při chybě po spuštění:

```bash
. /home/html/radostvpohybu.cz/deploy/tk-env.sh
echo '<?php $upgrading = time(); ?>' > $W/.maintenance   # platí do smazání (pevný čas by WordPress po 10 min ignoroval)
wp tk cache-purge                                          # jinak by .htaccess dál servíroval uložené stránky
```

Oprava lokálně → nový balík (§10) → `rm $W/.maintenance` → purge + warm. Starý web na Webnode běží, dokud ho klient
nevypne, takže návštěvníci mají kam jít.
