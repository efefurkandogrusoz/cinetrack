# 🚀 CineTrack Kurulum & Başlama Rehberi

## Hızlı Başlangıç (5 dakika)

### 1️⃣ TMDB API Key Alın
1. https://www.themoviedb.org/settings/api ziyaret edin
2. Ücretsiz hesap oluşturun
3. API key'inizi kopyalayın

### 2️⃣ Proje Dosyasını Hazırlayın
```bash
# .env.example dosyasını .env olarak kopyalayın
cp .env.example .env

# Windows PowerShell için:
Copy-Item .env.example .env
```

### 3️⃣ .env Dosyasını Düzenleyin
```.env
VITE_TMDB_API_KEY=your_actual_api_key_here
```

### 4️⃣ Projeyi Çalıştırın
```bash
# Bağımlılıklar zaten yüklü (npm install edilmiş)
npm run dev
```

### 5️⃣ Tarayıcıda Açın
```
http://localhost:5173
```

---

## 📦 Proje Yapılandırması

### Yüklü Bağımlılıklar
```json
{
  "react": "^19.2.6",
  "react-dom": "^19.2.6",
  "bootstrap": "^5.3.8",
  "firebase": "^12.13.0",
  "react-router-dom": "^6.x"
}
```

### Dosya Yapısı
```
src/
├── components/          # React bileşenleri
│   ├── Navbar          # Navigasyon (Tümü/İzlendi/İzlenecek)
│   ├── MovieSearch     # TMDB arama bileşeni
│   ├── MovieCard       # Film kartı
│   └── MovieList       # Film grid'i
├── pages/              # Sayfa bileşenleri
│   ├── Home            # Ana sayfa (tümü)
│   ├── Watched         # İzlenen filmler
│   └── Watchlist       # İzlenecek filmler
├── services/           # API & veri servisleri
│   ├── tmdb.js         # TMDB API
│   ├── firebase.js     # Firebase Firestore
│   └── storage.js      # LocalStorage
├── context/            # Global state
│   └── MovieContext    # useMovies hook
├── App.jsx             # Router & main layout
└── main.jsx            # React entry point
```

---

## 🎬 Özellikler & Kullanım

### Film Arama
1. Ana sayfada arama kutusuna film adı yazın
2. Sonuçlar otomatik görünecek
3. "Ekle" butonuna tıklayarak listeye ekleyin

### Film Yönetimi
- **✓ İzlendi**: Filmi izlendi olarak işaretle
- **♥ Favori**: Filmi favori olarak işaretle
- **🗑 Sil**: Filmi listeden sil

### Filtreleme
- **📽️ Tümü**: Tüm eklenen filmler
- **✓ İzlendi**: Yalnızca izlenen filmler
- **○ İzlenecek**: Yalnızca izlenecek filmler

---

## 🔧 Geliştirme Komutları

```bash
# Geliştirme sunucusunu başlat
npm run dev

# Production build oluştur
npm run build

# Build'i preview et
npm run preview

# ESLint ile kontrol et
npm run lint
```

---

## 🌐 Firebase Entegrasyonu

Uygulama **Firebase Firestore** ile bütünleştirilmiştir:

### Otomatik Özellikler
- ✅ Veri bulut'ta kaydedilir
- ✅ Çevrimdışıyken localStorage'dan yükle
- ✅ Çevrimiçi olunca bulut'a senkronize et

### Firebase Koleksiyonu
```
Database: film-takip-d93f9
Collection: movies
```

---

## 🎨 Dark Theme Özellikleri

- **Netflix benzeri tasarım**
- **Hover efektleri** ve animasyonlar
- **Responsive mobil tasarım**
- **Bootstrap 5** ile oluşturulmuş
- **CSS özel kütüphanesi** ile extended

### Tema Renkleri
- Birincil: #e50914 (Netflix Kırmızı)
- Arka plan: #0a0a0a (Siyah)
- İkincil: #1a1a1a (Koyu Gri)
- Metin: #ffffff (Beyaz)

---

## 🐛 Sorun Giderme

### "TMDB API key bulunamadı" uyarısı
**Çözüm**: 
- .env dosyasını oluşturduğunuzdan emin olun
- VITE_TMDB_API_KEY=... satırını ekleyin
- npm run dev'i yeniden başlatın

### Firebase bağlantı hatası
**Çözüm**:
- İnternet bağlantınızı kontrol edin
- Firebase konsolda projinizi doğrulayın
- LocalStorage fallback otomatik kullanılacak

### Filmler yüklenmeme
**Çözüm**:
- TMDB API key'in geçerli olduğunu kontrol edin
- Tarayıcı konsolda hata mesajlarını kontrol edin
- API rate limit'ini kontrol edin (40 req/10s)

---

## 📝 Ek Bilgiler

### TMDB API Limits
- 40 requests per 10 seconds (free tier)
- Search sonuçları maksimum 20 film

### Firebase Pricing
- Kullanmak **ücretsizdir** (free tier)
- Dokuman: https://firebase.google.com/docs

### Browser Uyumluluğu
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## 🎓 Öğrenme Kaynakları

- **React**: https://react.dev
- **Vite**: https://vite.dev
- **Firebase**: https://firebase.google.com/docs
- **Bootstrap**: https://getbootstrap.com/docs
- **TMDB API**: https://developers.themoviedb.org/3

---

## ✨ İpuçları

1. **Film adının tam olması gerekmiyor** - "Inception" yerine "Incepti" yazabilirsiniz
2. **Rating yıldızları** - TMDB'den gelen gerçek kullanıcı rating'leri
3. **İstatistikler** - Navbar'daki 📊 butonuna tıklayarak hızlıca görebilirsiniz
4. **Mobil uyumlu** - Telefonda da tam çalışıyor!

---

**Sorular mı var? GitHub Issues'de soru açabilirsiniz! 🎬**
