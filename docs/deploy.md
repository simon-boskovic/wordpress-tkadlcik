# Nasazení na Webglobe — radostvpohybu.cz

**Stav: nasazeno 2026-11-01** (balík `3178334`, opravy `7d0254f`, `f838fda`, obsah z PDF + „Napište mi“ + validace formuláře `df268d4`; 2026-11-02 `8180285`: seminář 21.–22. 11. 2026 s letákem, zvětšování obrázků, dechové kolečko, pole událostí). Web běží na
https://radostvpohybu.cz/ ve stávající instalaci WordPressu od Webglobe.

## Server (zjištěno 2026-11-01)

| | |
|---|---|
| SSH | `ssh -p 20001 ssh-891334@wp005.nameserver.sk` (přihlášení klíčem; WebSSH v administraci taky). Přihlašovací shell je **fish**: příkazy posílat jako `bash -s <<'EOF' … EOF`. |
| Cesty | web `W=/home/html/radostvpohybu.cz/public_html`, nasazení `D=/home/html/radostvpohybu.cz/deploy` (700, mimo web) |
| Web | nginx → **LiteSpeed**, **PHP 8.4.27** (SAPI litespeed), HTTPS (Let's Encrypt), brotli/gzip dělá server |
| Konzole | WP-CLI 2.12 jako `php8.4 /usr/local/bin/wp` (výchozí `php` je starší) |
| Databáze | **MariaDB 11.8.8** na `db.wp005.nameserver.sk`, prefix `wp_` |
| Původní stav | čistý WordPress 7.1.4 od Webglobe: Twenty Twenty-Five, LiteSpeed Cache, MonsterInsights, Wordfence, Webglobe Welcome; `WP_HOME`/`WP_SITEURL` v `wp-config.php` z hlavičky `Host` |

## Skripty (`deploy/webglobe/`, jsou v balíku)

| Skript | Co dělá |
|---|---|
| `tk-env.sh` | proměnné (`W`, `D`, `H`, `PHP=php8.4`, `B=$D/backup`), funkce `wp`, `ls_cache_off`, `ls_cache_purge` |
| `00-inventar.sh` | soupis serveru a WordPressu, kolize s balíkem — **jen čte** |
| `01-zaloha.sh` | plná záloha do `$B` (DB, `wp-content`, `wp-config.php`, `.htaccess`, kořen webu, soupis, SHA-256); nepřepíše existující |
| `02-migrace.sh [--dry-run]` | první nasazení do stávajícího WordPressu (pod údržbou, viz níže) |
| `03-kontrola.sh` | kontrola po nasazení: každá stránka `HIT`/`HIT-PHP` s kompresí, 301/410/404, sitemap, hlavičky — jen čte |
| `04-aktualizace.sh` | další nasazení: šablona, mu-pluginy, obrázky, stránky, SEO, cache (bez údržby, idempotentní) |
| `09-navrat.sh --ano` | návrat ze zálohy 01: DB, `wp-content`, `wp-config.php`, `.htaccess`, kořen webu; smaže tabulky přidané později |

`02-migrace.sh` v pořadí: kontroly (balík, záloha, PHP ≥ 8.2, `WP_HOME` z `Host` → pevně `H`, kolize slugů) → údržba →
vypnout LiteSpeed Cache a MonsterInsights (+ bloky LSCACHE z `.htaccess`, cizí `advanced-cache.php` do zálohy) →
`wp-config.php` (`WP_ENVIRONMENT_TYPE`, `WP_CACHE`, `DISALLOW_FILE_EDIT`, `WP_MEMORY_LIMIT`; **až po vypnutí LiteSpeed
Cache**, ta při vypnutí přepisuje `WP_CACHE`) → šablona + mu-pluginy → blok WordPressu v `.htaccess` → `wp tk site-setup`
(Hello Elementor, Elementor, The SEO Framework, Complianz 7.5.5, Site Kit 1.188.0, čeština) → kit, obrázky, ikona,
stránky, SEO → starý obsah do konceptu → statické `robots.txt`/`llms.txt`/`sitemap.xml` do zálohy → Complianz, LiteSpeed
cache off, page cache **`--mode=php`**, hlavičky → konec údržby, purge, 2× warm.

## Postup

Lokálně (Git Bash, kořen repa, čistý strom):

```bash
./build/rehearsal.sh            # generálka: PHP 8.4 + MariaDB 11.8, WordPress jako u Webglobe, 00→01→02→03→09→02→03
./build/deploy-bundle.sh        # backups/deploy/tk-deploy-<sha>.tar.gz
scp -P 20001 backups/deploy/tk-deploy-<sha>.tar.gz ssh-891334@wp005.nameserver.sk:deploy/
```

Na serveru:

```bash
ssh -p 20001 ssh-891334@wp005.nameserver.sk bash -s <<'EOF'
cd ~/deploy && rm -rf bundle && mkdir bundle && tar xzf tk-deploy-<sha>.tar.gz -C bundle && cat bundle/REVISION
bash ~/deploy/bundle/deploy/webglobe/04-aktualizace.sh
bash ~/deploy/bundle/deploy/webglobe/03-kontrola.sh
EOF
```

(první nasazení: `00`, `01`, zálohu stáhnout na PC, `02 --dry-run`, `02`, `03`).

Zvenku: `node build/interact.mjs all --base=https://radostvpohybu.cz`. `verify.mjs` z tohoto PC proti HTTPS neprojde
(Avast Web Shield podvrhuje certifikát a Node ho nepřijme); serverové `03-kontrola.sh` běží bez Avastu.

## Poučení z nasazení 2026-11-01

- **LiteSpeed a `.htaccess`:** LiteSpeed ignoruje `Header`/`AddEncoding` v `wp-content/cache/tk-page/.htaccess`
  (go-live #16) a **změny `.htaccess` načítá se zpožděním** (po odebrání bloku `TK Page Cache` servíroval soubory
  z cache dál staticky, bez hlaviček). Proto `--mode=php` hned v `02` a nikdy `rewrite`. Na produkci je kvůli tomu
  `define( 'TK_PAGE_CACHE_DIR', '…/wp-content/cache/tk-page-php' )` ve `wp-config.php` a stará složka `tk-page` je
  smazaná: starý přepis tak nenajde žádný soubor.
- **Serverová cache LiteSpeedu** po vypnutí pluginu dál vracela starou hlavní stránku: blok `TK LiteSpeed Cache off`
  na začátku `.htaccess` (`CacheLookup off`) a purge hlavičkou `X-LiteSpeed-Purge: *` (`ls_cache_off`, `ls_cache_purge`).
- **`WP_HOME` z hlavičky `Host`** (Webglobe): web odpovídal na `www` bez přesměrování a WP-CLI vidělo adresu `http:`.
  Nahrazeno pevnou `https://radostvpohybu.cz`; `www` teď 301.
- **Complianz** na instalaci jen z WP-CLI nevytvořil tabulku `wp_cmplz_cookies`; `consent-setup` ji vytvoří.
- První warm po instalaci může mít několik `STORED` (první render jednou vyprázdní cache); proto 2× warm.

## Zálohy

- Stav před migrací: na serveru `~/deploy/backup/` a na PC `backups/radostvpohybu-pred-migraci-2026-11-01/`
  (SHA-256 ověřené). `09-navrat.sh --ano` z ní obnoví původní web (ověřeno generálkou).
- `~/deploy/backup/htaccess.po-migraci`, `wp-config.pred-tk-page-php`: mezistavy z 2026-11-01.

## Zbývá

- **Site Kit**: připojit Google účet klienta a GA4 (wp-admin), pak `wp tk consent-setup --dry-run` → 0 změn, purge + warm
  (go-live #21). Do té doby web Google Analytics nemá (MonsterInsights je vypnutý: měřil bez souhlasu).
- **Pošta formuláře**: WP Mail SMTP + schránka na doméně, SPF/DKIM/DMARC (go-live #27). Bez toho mohou zprávy
  z formuláře končit ve spamu nebo se ztrácet. Otestovat odeslání.
- **Zásady ochrany osobních údajů**: 5× `[doplnit …]` (lhůty, hosting …) od klienta.
- **HSTS** po týdnu bez problémů na rok: `wp config set TK_HSTS_MAX_AGE 31536000 --raw && wp tk headers-setup`.
- **Search Console**: ověřit doménu, odeslat `sitemap.xml`. Webnode (`dan24.webnode.cz`): odkaz na nový web, pak vypnout.
- **Přístup**: SSH klíč `claude-radostvpohybu-2026-11` smazán 2026-11-02 (na serveru i lokálně; `authorized_keys` je prázdný, přihlášení heslem). Pro další nasazení přes Claude vytvořit nový klíč a po práci ho zase smazat.
- Wordfence zůstává (ochrana přihlášení); Webglobe Welcome zůstává. LiteSpeed Cache a MonsterInsights jsou vypnuté,
  nesmazané.
