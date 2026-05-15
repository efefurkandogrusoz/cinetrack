# Styles

Bu klasor uygulamanin CSS dosyalarini tek yerde toplar.

- `global.css`: reset, tema degiskenleri, ortak yardimci siniflar.
- `components/`: tek bir component'e ait stiller.
- `pages/`: sayfa yerlesimi ve page-level stiller.

Yeni component eklerken CSS dosyasini `components/ComponentName.css` olarak ekleyip component icinden import et.
Sayfalar arasinda paylasilan layout stilleri `pages/` altinda kalmali.
