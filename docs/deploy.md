# Nasazení — runbook (obecný, hosting zatím nevybraný)

Stav: **připraveno, nespuštěno.** Hosting ani doména nejsou rozhodnuté (viz `docs/HANDOVER.md` „Otevřená
rozhodnutí“). Struktura převzatá z runbooku martinadamus.cz (`../wordpress-adamus-main/docs/deploy-webglobe.md`);
místa, která závisí na hostingu, jsou označená **TODO (hosting)**. Nic z tohoto souboru neběží bez termínu a
pokynu uživatele.

Podklady: `docs/go-live-requirements.md` (nastavení serveru, položky #1–20 — kontrolní seznam pro výběr hostingu),
`docs/definition-of-done.md` §8 (co se ověřuje po nasazení), `CLAUDE.md`.

## Rozhodnutí a pravidla

- **Nová instalace WordPressu** na novém hostingu (dnešní web běží na Webnode, nic se nepřenáší kromě obsahu,
  který je v repu). Na rozdíl od martinadamus.cz tu není žádná živá databáze, kterou by bylo nutné chránit
  (žádné rezervace, formuláře, analytika).
- **Pipeline je stejná jako lokálně** (`build/rebuild.sh`): obsah se nikdy nepřenáší ručně, vzniká
  `wp tk …` příkazy z vygenerovaných souborů v repu.
- **Kdo co dělá:** příkazy na serveru spouští uživatel (SSH / webová konzole hostingu), blok po bloku, a výstup
  vloží do konverzace. Claude jen čte výstup a řekne „pokračovat“ nebo „stop“. Claude na server nic nespouští.
- Každý blok jde vložit do bashe na serveru tak, jak je; `wp` = WP-CLI s PHP ≥ 8.2 (**TODO (hosting)**: přesný
  binár, např. `php8.2 /usr/local/bin/wp`).
- **⚠️ ověřit** označuje to, co o hostingu zatím nevíme.

Průběh v čase:

| Kdy | Co | Kde |
|---|---|---|
| výběr hostingu | §1 požadavky na hosting (go-live #1–20) | e-mail / web hostingu |
| T−7 až T−2 dny | §3 generálka na lokální kopii stacku hostingu (doporučeno) | lokální PC |
| T−1 den | §4 balík: sestavit, nahrát, rozbalit, předletová kontrola | lokální PC, SSH |
| T0 | §5 instalace + §6 pipeline + §7 ověření na dočasné adrese | SSH, prohlížeč |
| T0 + ověření | §8 přepnutí domény (DNS z Webnode), 301 ze starých URL | registrátor, Webnode |
| T + 14 dní | §9 HSTS navýšit, Search Console, vypnout Webnode | |

---

## 1. Požadavky na hosting / dotazy na podporu

Projít `docs/go-live-requirements.md` položku po položce. Minimum: PHP ≥ 8.2 (web i CLI), MariaDB/MySQL,
**WP-CLI přes SSH**, Apache s `.htaccess` (`mod_rewrite`, `mod_headers`, `mod_mime`, `mod_setenvif`) nebo
LiteSpeed (pak `wp tk cache-setup --mode=php`), brotli/gzip na `text/html`, HTTPS + HTTP/2, zapisovatelné
`wp-content/cache/`, odchozí pošta přes SMTP s SPF/DKIM.

**TODO (hosting):** odpovědi podpory (verze PHP, WP-CLI, `AllowOverride`, komprese, edge cache a jak ji
vyčistit, limity paměti, zálohy, přístup k cronu).

## 2. Konzole a společné proměnné

```bash
# TODO (hosting): cesty a binár WP-CLI
export W=/cesta/k/public_html          # kořen WordPressu
export D=/cesta/mimo/web/deploy        # rozbalený balík (mimo web root)
wp() { php8.2 /usr/local/bin/wp --path="$W" "$@"; }
```

## 3. Generálka (doporučeno)

Lokálně spustit čistou instalaci proti stacku, který se co nejvíc blíží hostingu (verze PHP/MariaDB z §1):
`docker compose down` (bez `-v`!) a v kopii repa s jiným `COMPOSE_PROJECT_NAME`/porty `./build/rebuild.sh` od nuly,
pak `node build/verify.mjs --seo --cache --base=<url kopie>` a `node build/dod.mjs --all --base=<url kopie>`.
Cíl: ověřit, že pipeline na prázdné databázi doběhne bez ručních zásahů.

## 4. Balík pro nasazení

### 4.1 Co v něm je

`node build/generate.mjs` nečte adresu webu: odkazy jsou kořenově relativní, absolutní URL (JSON-LD, `llms.txt`)
skládá téma při požadavku z `home_url()`. Balík vygenerovaný lokálně proto platí pro produkční doménu beze změny.

| Do balíku | Proč |
|---|---|
| `wp-content/themes/tkadlcik/` celé (vč. `data/`, `assets/css/pages/`) | child theme + vygenerovaná data |
| `wp-content/mu-plugins/` **bez `tk-local.php`** | `wp tk …`, page cache, bezpečnostní hlavičky, hardening. `tk-local.php` přesměrovává poštu do Mailpitu — na produkci nikdy |
| `build/pages/*.json`, `build/seo.json`, `build/kit.json` (pokud existuje), `build/media.json` (pokud existuje), `wp-cli.yml` | vstupy `page-upsert`, `seo-setup`, `kit-setup`, `media-import` |
| `client-img/` | zdroje obrázků pro `media-import` (až klient dodá fotky) |
| `REVISION`, `MANIFEST.sha256` | commit a kontrolní součty |

### 4.2 Sestavení (lokálně, kořen repa, commit určený k nasazení)

```bash
git status --porcelain                              # prázdné
node build/generate.mjs && git status --porcelain   # stále prázdné = commit obsahuje vygenerovaný stav
npm test && ./build/rebuild.sh && node build/verify.mjs --seo --cache && node build/interact.mjs all
T=$(mktemp -d)
git -c core.autocrlf=false -c core.eol=lf archive HEAD wp-content/themes/tkadlcik wp-content/mu-plugins build/pages build/seo.json wp-cli.yml client-img \
  | tar -x -C "$T"
rm -f "$T/wp-content/mu-plugins/tk-local.php"
git rev-parse HEAD > "$T/REVISION"
(cd "$T" && find . -type f ! -name MANIFEST.sha256 -print0 | sort -z | xargs -0 sha256sum > MANIFEST.sha256)
mkdir -p backups/deploy && tar czf backups/deploy/tk-deploy.tar.gz -C "$T" . && rm -rf "$T"
tar tzf backups/deploy/tk-deploy.tar.gz | grep -c 'tk-local.php'   # musí být 0
```

### 4.3 Nahrání a rozbalení

**TODO (hosting):** SFTP/FTPS do `$D` (mimo web root). Pozor na webová FTP rozhraní, která `.tar.gz` sama rozbalí
(na Webglobe se to stalo, viz runbook martinadamus §4.3).

```bash
sha256sum $D/tk-deploy.tar.gz                       # stejný součet jako lokálně
rm -rf $D/bundle && mkdir -p $D/bundle && tar xzf $D/tk-deploy.tar.gz -C $D/bundle
cd $D/bundle && sha256sum -c --quiet MANIFEST.sha256 && echo "MANIFEST OK"; cd
test ! -e $D/bundle/wp-content/mu-plugins/tk-local.php && echo "tk-local.php v balíku není (správně)"
ls $D/bundle/build/pages | wc -l                    # 7
```

### 4.4 Předletová kontrola (jen čtení)

```bash
wp --info | grep -E 'PHP version|WP-CLI version'     # PHP ≥ 8.2
php8.2 -m | grep -iE 'gd|imagick|mysqli|zip|intl'    # WebP konverze potřebuje GD nebo Imagick s WebP
curl -sI -H 'Accept-Encoding: br, gzip' https://<dočasná-adresa>/ | grep -i content-encoding
```

## 5. Instalace WordPressu (T0)

```bash
# TODO (hosting): databáze a uživatel (panel hostingu), wp-config.php
wp core download --locale=cs_CZ
wp config create --dbname=… --dbuser=… --dbpass=… --dbhost=… --locale=cs_CZ
wp config set WP_ENVIRONMENT_TYPE production
wp config set WP_CACHE true --raw
wp config set WP_MEMORY_LIMIT 256M
wp config set DISALLOW_FILE_EDIT true --raw
cp -a $D/bundle/wp-content/themes/tkadlcik $W/wp-content/themes/
cp -a $D/bundle/wp-content/mu-plugins/. $W/wp-content/mu-plugins/
```

`wp tk site-setup` instaluje WordPress, pokud ještě není (admin z `wp-secrets.env` — **na produkci jiné, silné
heslo**, nikdy ne lokální), a nastaví češtinu, časové pásmo, permalinky, Hello Elementor + child theme,
Elementor + The SEO Framework. Na ne-lokálním prostředí potřebuje `--allow-non-local`.

## 6. Pipeline (pořadí `build/rebuild.sh`)

```bash
cd $D/bundle
wp tk site-setup --allow-non-local      # ⚠️ ověřit: cesta k wp-secrets.env na serveru (TODO)
wp tk kit-setup
wp tk media-import                      # až budou fotky v client-img/
wp tk page-upsert --dir=$D/bundle/build/pages
wp tk seo-setup
wp tk cache-setup                       # LiteSpeed: --mode=php
wp tk headers-setup
wp elementor flush_css && wp cache flush
wp tk cache-purge && wp tk cache-warm
wp tk doctor
```

Každý `wp tk …` příkaz jde nejdřív spustit s `--dry-run`.

## 7. Ověření na dočasné adrese (před přepnutím DNS)

```bash
# lokálně, proti produkční (dočasné) adrese:
node build/verify.mjs --seo --cache --base=https://<adresa>
node build/interact.mjs all --base=https://<adresa>
node build/dod.mjs --all --jobs=3 --base=https://<adresa> --skip=visual   # vizuální shoda je ověřená lokálně
```

Ručně: Safari na iPhonu (DoD §8), Rich Results Test na jedné stránce, `curl -sI` podle go-live #1–19.

## 8. Přepnutí domény

- **TODO (rozhodnutí):** doména (`dan24.webnode.cz` → vlastní doména?), kdo ji drží, DNS u registrátora.
- 301 ze starých URL Webnode: seznam starých adres → mapa na nové stránky (`/cviceni/`, `/kurzy-a-lekce/`, …).
  Pokud stará doména zůstává na Webnode (subdoména `webnode.cz`), přesměrování 301 nastavit nejde — jen odkazy
  a kanonické URL na novém webu; rozhodnout s klientem (**TODO**).
- Soubory ke stažení, které dnes leží na úložišti Webnode, musí být na novém webu dřív, než se Webnode vypne.
- Po přepnutí: `wp option get home` = produkční doména, `wp tk cache-setup && wp tk cache-purge && wp tk cache-warm`.

## 9. Potom

- Po týdnu bez problémů zvýšit HSTS (`define( 'TK_HSTS_MAX_AGE', 31536000 );` + `wp tk headers-setup`).
- Search Console: ověřit doménu, odeslat `sitemap.xml`.
- Zálohy hostingu ověřit obnovou (**TODO (hosting)**).
- `docs/HANDOVER.md` doplnit o skutečný stav nasazení.

## 10. Rollback

Nový web na nové doméně: rollback = DNS zpět na Webnode (dokud Webnode běží). Proto Webnode vypínat až po
schválení klientem.
