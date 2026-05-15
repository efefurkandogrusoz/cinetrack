# 🎬 CineTrack - Film Takip Uygulaması

Modern ve profesyonel bir web uygulaması olarak geliştirilen **CineTrack**, kullanıcıların film arayıp kendi film listelerini oluşturabildiği bir film takip sistemidir.

![CineTrack](https://img.shields.io/badge/CineTrack-Movie%20Tracking%20App-red)
![React](https://img.shields.io/badge/React-19.2.6-blue)
![Vite](https://img.shields.io/badge/Vite-8.0.12-purple)
![Firebase](https://img.shields.io/badge/Firebase-12.13.0-orange)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3.8-success)

---

## 📋 İçindekiler

- [Özellikler](#özellikler)
- [Teknolojiler](#teknolojiler)
- [Kurulum](#kurulum)
- [Kullanım](#kullanım)
- [Proje Yapısı](#proje-yapısı)
- [Bonus Özellikler](#bonus-özellikler)
- [API Entegrasyonları](#api-entegrasyonları)

---

## ✨ Özellikler

### 🔍 Film Arama Sistemi
- **TMDB API** ile gerçek zamanlı film araması
- Film posteri, adı ve yayın yılı görüntüleme
- Arama sonuçlarında rating bilgisi

### ➕ Film Ekleme Sistemi
- Arama sonuçlarından film seçip listelere ekleme
- Otomatik veri depolanması

### 📺 Film Listeleme
- Netflix benzeri kart tasarımı
- Her kartta film posteri, adı, yıl ve aksiyon butonları
- İzlenme durumunu gösterme

### 🎯 Filtreleme Sistemi
- **Tümü**: Tüm eklenen filmler
- **İzlendi**: İzlenmiş filmler
- **İzlenecek**: İzlenecek filmler

### 💾 Veri Kalıcılığı
- **Firebase Firestore** ile bulut veri depolama (birincil)
- **LocalStorage** fallback (çevrimdışı destek)
- Sayfa yenilense bile veriler kaybolmaz

### 🎨 Kullanıcı Arayüzü
- Netflix benzeri dark theme
- Bootstrap 5 responsive tasarım
- Mobil uyumlu (mobile-first)
- Smooth animasyonlar ve geçişler
- Hover efektleri

---

## 🛠️ Teknolojiler

| Teknoloji | Versiyon | Kullanım |
|-----------|---------|---------|
| **React** | 19.2.6 | UI Framework |
| **Vite** | 8.0.12 | Build Tool |
| **Firebase** | 12.13.0 | Backend & Database |
| **Bootstrap** | 5.3.8 | CSS Framework |
| **React Router** | Latest | Routing |
| **TMDB API** | v3 | Film Verileri |

---

## 🚀 Kurulum

### Ön Gereksinimler
- Node.js 16+ ve npm
- TMDB API Key (ücretsiz: https://www.themoviedb.org/settings/api)

### Adım Adım Kurulum

1. **Projeyi klonlayın ya da açın**
```bash
cd "Film Takip"
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
```

3. **TMDB API Key'i ayarlayın**
```bash
# .env.example dosyasını .env olarak kopyalayın
cp .env.example .env
```

4. **.env dosyasını düzenleyin**
```env
VITE_TMDB_API_KEY=your_actual_tmdb_api_key_here
```

5. **Geliştirme sunucusunu başlatın**
```bash
npm run dev
```

6. **Tarayıcıda açın**
```
http://localhost:5173
```

---

## 📖 Kullanım

### 🔍 Film Arama
1. Ana sayfadaki arama kutusuna film adı yazın
2. Otomatik olarak arama sonuçları görüntülenecek
3. İstediğiniz filmi seçin ve **"Ekle"** butonuna tıklayın

### 🎬 Film Yönetimi
- **İzledim**: Film kartındaki ✓ butonuna tıklayın
- **Favorilere Ekle**: ♥ butonuna tıklayın
- **Sil**: 🗑 butonuna tıklayın

### 🔽 Filtreleme
- **Tümü**: Tüm eklenen filmleri göster
- **İzlendi**: Yalnızca izlenen filmleri göster
- **İzlenecek**: Yalnızca izlenecek filmleri göster

---

## 📁 Proje Yapısı

```
Film Takip/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx           # Navigasyon ve filtreler
│   │   ├── Navbar.css
│   │   ├── MovieCard.jsx        # Film kartı bileşeni
│   │   ├── MovieCard.css
│   │   ├── MovieList.jsx        # Film listesi grid'i
│   │   ├── MovieList.css
│   │   ├── MovieSearch.jsx      # Arama bileşeni
│   │   └── MovieSearch.css
│   │
│   ├── pages/
│   │   ├── Home.jsx             # Ana sayfa
│   │   ├── Watched.jsx          # İzlenen filmler
│   │   ├── Watchlist.jsx        # İzlenecek filmler
│   │   └── pages.css
│   │
│   ├── services/
│   │   ├── tmdb.js              # TMDB API entegrasyonu
│   │   ├── firebase.js          # Firebase konfigürasyon
│   │   └── storage.js           # LocalStorage servisi
│   │
│   ├── context/
│   │   └── MovieContext.jsx     # Global state yönetimi
│   │
│   ├── App.jsx                  # Ana uygulama bileşeni
│   ├── App.css                  # Global stiller
│   ├── main.jsx                 # React entry point
│   └── index.css
│
├── .env.example                 # Ortam değişkenleri şablonu
├── package.json
├── vite.config.js
├── index.html
└── README.md
```

---

## 🎁 Bonus Özellikler

### 1. 🔐 Firebase Authentication
- Kullanıcı kayıt ve giriş sistemi
- Per-user film listeleri
- Cloudda senkronizasyon

### 2. ❤️ Favoriler Sistemi
- Filmleri favorilere ekle/çıkar
- Ayrı favoriler sayfası

### 3. 📊 İstatistik Paneli
- Toplam film sayısı
- İzlenen/İzlenecek oranı
- Yüzdelik hesapları
- Navbar'da hızlı görünüm

### 4. 🌓 Dark/Light Mode Toggle
- Tema değiştirme
- LocalStorage'da kayıt

---

## 🔌 API Entegrasyonları

### TMDB API
**Dokumentasyon**: https://developers.themoviedb.org/3/getting-started/introduction

**Kullanılan Endpoints**:
```
GET /search/movie          # Film arama
GET /movie/{id}            # Film detayları
```

**Örnek İstek**:
```
GET https://api.themoviedb.org/3/search/movie?api_key=KEY&query=Inception
```

**Poster URL**:
```
https://image.tmdb.org/t/p/w500/{poster_path}
```

### Firebase Firestore
**Veri Yapısı**:
```javascript
{
  id: Number,              // TMDB film ID'si
  title: String,           // Film adı
  poster: String,          // Poster URL'i
  poster_path: String,     // TMDB poster yolu
  year: Number/String,     // Yayın yılı
  watched: Boolean,        // İzlenme durumu
  favorite: Boolean,       // Favori durumu
  rating: Number,          // TMDB rating'i
  overview: String,        // Film özeti
  created_at: Timestamp,   // Oluşturma tarihi
  updated_at: Timestamp    // Güncelleme tarihi
}
```

---

## 🔧 Geliştirme

### Build Etme
```bash
npm run build
```

### Preview
```bash
npm run preview
```

### Linting
```bash
npm run lint
```

---

## 📝 Lisans
Bu proje MIT lisansı altında yayınlanmıştır.

---

## 🤝 İthaflı Başarılar
Projeyi geliştirirken aşağıdaki araçlar kullanılmıştır:
- **Copilot CLI**: Kod geliştirme ve optimizasyon
- **TMDB**: Film verileri API'si
- **Firebase**: Backend ve veri depolama

---

## 📞 İletişim & Destek
Sorular veya öneriler için:
- GitHub Issues: Repo'da issue açın
- TMDB API: https://www.themoviedb.org/settings/api

---

**Happy Movie Tracking! 🎬🍿**
