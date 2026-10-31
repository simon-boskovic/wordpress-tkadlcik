# Obrázky ze starého webu dan24.webnode.cz: výběr

Stav k 31. 10. 2026. Prošel jsem 14 stránek: 11 je prolinkovaných z menu (`/`, `/home/`, `/o-mne/`, `/cviceni/`, `/cviceni-ve-zline/`, `/cviceni-na-horach/`, `/akce/`, `/clanky/`, `/videogalerie/`, `/kontakt/`, `/prazdna-stranka2/`) a 3 jsou jen v `sitemap.xml` (`/reference/`, `/prazdna-stranka/`, `/cviceni-na-akci-s-jirim-ledvinou/`). Fotogalerii starý web nemá. Videogalerie obsahuje jen náhled YouTube 480×360, který už je v `client-img/yt-1nFm6-XwGpU.jpg`.

**Starý web obsahuje jen 4 unikátní obrázky** (všechny Webnode varianty 450/700/WebP jsem porovnal a ponechal největší originál). Na stránkách `/cviceni-na-horach/`, `/akce/`, `/cviceni/` a dalších nejsou kromě loga žádné fotky. Fotky z Krkonoš, z lekcí, z prostor ani s Vincentem Chu na starém webu **nejsou**.

| Soubor | px | Lidé | Kvalita | Co to je |
|---|---|---|---|---|
| `daniel-portret-1.jpg` | 1440×1920 | jen Daniel | použitelná | Neformální portrét z mobilu, blesk, interiér |
| `louka-strom-slunce-pixabay.jpg` | 1920×1221 | nikdo | dobrá | Fotobanka Pixabay č. 276014, generická louka |
| `logo-postava-kresba.jpg` | 200×200 | nikdo | slabá | Staré logo (linková kresba postavy) |
| `letak-seminar-savle-vincent-chu.jpg` | 1587×2245 | Gin Soon Chu (třetí strana) | dobrá (dokument) | Leták semináře se šavlí, shodný s `client-files/letak-savle.jpg` |

## Doporučení pro jednotlivé placeholdery

| Stránka / sekce | Placeholder | Obrázek | Ořez / ohnisko | Alt (cs) | GDPR |
|---|---|---|---|---|---|
| **O mně** – hero vpravo (`o-mne.mjs` ř. 20, `OMne.dc.html` ř. 62) | 4 / 5 na výšku | `daniel-portret-1.jpg` | Ze 3:4 na 4:5 odříznout ~120 px nahoře (tmavý strop) → 1440×1800. Ohnisko obličej ≈ x 56 %, y 38 %. Vlevo dole překrývá štítek „od roku 1997“, ten zakryje jen kuchyňskou linku, obličej zůstane volný. | „Daniel Tkadlčík, lektor tchaj-ťi“ | V pořádku, je na ní jen Daniel. |
| **Domů** – bento karta vlevo (`domu.mjs` ř. 29, `Main.dc.html` ř. 69) | min-height 440 px, šířka karty ≥ 320 px, tedy zhruba **čtverec až mírně na výšku** (desktop ≈ 420×440, mobil ≈ 358×440) | Prozatím `louka-strom-slunce-pixabay.jpg` | Čtverec 1221×1221 vyříznutý z x ≈ 300–1520, aby v něm zůstalo slunce vlevo nahoře, kvetoucí louka a kmen vpravo. `object-position: 45% 60%`. | Dekorativní, tedy `alt=""`. Jinak „Rozkvetlá jarní louka u stromu v ranním slunci“. | Bez osob. Licence Pixabay dovoluje komerční užití bez uvedení autora. |
| **Akce** – `#hory` Cvičení na horách v Krkonoších (`akce.mjs` ř. 97, `Seminare.dc.html` ř. 114) | 4 / 3 na šířku | **Na starém webu nic vhodného není.** Ponechat placeholder a vyžádat od klienta fotky ze Strážného nebo Krkonoš. | – | – | – |

### Náhradní varianty
- **Domů – karta:** `daniel-portret-1.jpg`, ořez na čtverec y ≈ 250–1690 (obličej nahoře, ruce dole). Nevýhoda: stejná fotka by byla dvakrát (Domů i O mně) a je neformální, není na ní cvičení.
- **Akce – hory (nouzově):** `louka-strom-slunce-pixabay.jpg` ořezaná na 4:3 (1628×1221, x 0–1628). Pozor: **nejsou to Krkonoše.** U nadpisu „v Krkonoších“ by fotka působila zavádějícím dojmem, proto ji nedoporučuji. Kdyby přesto byla potřeba, jen s `alt=""` a jen dočasně. Stejnou fotobankovou fotku navíc nepoužívat na dvou místech.

## Nepoužívat

| Soubor | Důvod |
|---|---|
| `logo-postava-kresba.jpg` | Jen 200×200 px a Webnode větší originál nemá. Nový web má vlastní taiji logo (`client-img/site-icon.png`). Pouze archiv. |
| `letak-seminar-savle-vincent-chu.jpg` | Je to dokument, ne fotka. Už je ke stažení jako `client-files/letak-savle.jpg` (bajtově shodný). Fotka mistra Gin Soon Chu na letáku je od třetí strany (sken), proto ji z letáku nevyřezávat. Leták navíc obsahuje datum akce bez roku a překlepy. |
| Náhledy YouTube (`img.youtube.com/.../hqdefault.jpg`) | Duplikát `client-img/yt-*.jpg` (480×360). Nestahováno znovu. |
| WebP a 450/700 px varianty | Duplikáty stejných fotek, uložen vždy největší originál. |

## GDPR
- Žádná stažená fotografie **nezobrazuje identifikovatelné studenty ani jiné účastníky**. Portrét ukazuje jen Daniela, který je klient a fotku sám zveřejnil.
- `letak-seminar-savle-vincent-chu.jpg` (`people: group/others`) obsahuje fotografii mistra Gin Soon Chu, tedy třetí osoby. Fotka pochází z publikace a práva k ní nejsou klientova. Leták už se na starém webu veřejně šíří a nový web ho jen přebírá ke stažení, ale **nepoužívat ho jako samostatnou fotku** a ověřit s klientem, že má svolení.
- Až klient dodá fotky z lekcí nebo z Krkonoš, je u každé fotky, na které jsou rozpoznatelní cvičenci, potřeba **jejich souhlas** se zveřejněním.

## og:image
Současný `client-img/og-default.png` (1200×630, typografická karta „Radost v pohybu“) je lepší než cokoli ze starého webu. **Doporučuji ho ponechat.** Případná alternativa pro stránku O mně: `daniel-portret-1.jpg` s ořezem 1440×756 (y ≈ 300–1056, obličej uprostřed) zmenšeným na 1200×630. Fotka s bleskem je ale v náhledu na sociálních sítích slabší než značková karta.

## Co od klienta vyžádat
1. Fotky z cvičení na horách (Strážné, Krkonoše), na šířku, ≥ 1600 px. Ideálně krajina nebo skupina zezadu či zdálky, kvůli GDPR.
2. Lepší portrét při cvičení (O mně / Domů), denní světlo, ≥ 1600 px na výšku.
3. Případně fotku s mistrem Vincentem Chu (sekce „Cesta k tchaj-ťi“). Na starém webu žádná není.

## Poznámka k importu
`wp tk media-import` bez `media.json` čte jen soubory přímo v `/project/client-img` (`scandir`, bez rekurze). Podsložka `webnode/` se tedy automaticky neimportuje. Vybrané soubory je potřeba zkopírovat do `client-img/` nebo je zapsat do `build/media.json`.
