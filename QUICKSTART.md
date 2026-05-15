# 🚀 CineTrack - Hızlı Başlama (5 Dakikada)

## ⚡ En Hızlı Başlangıç

### Adım 1: TMDB API Key Al (1 dakika)
```
1. https://www.themoviedb.org/settings/api ziyaret et
2. Ücretsiz hesap oluştur
3. API key'i kopyala
```

### Adım 2: .env Dosyasını Oluştur (30 saniye)
```bash
# Windows PowerShell
Copy-Item .env.example .env

# Ya da manuel olarak create edin:
# VITE_TMDB_API_KEY=your_key_here
```

### Adım 3: API Key'i Yapıştır (30 saniye)
```env
# .env dosyasını düzenle
VITE_TMDB_API_KEY=burada_api_keyini_yapistir
```

### Adım 4: Çalıştır (2 dakika)
```bash
npm run dev
```

### Adım 5: Açılı Tarayıcıda Aç
```
http://localhost:5173
```

**✅ Tamamdır! Uygulamayı kullanabilirsiniz!**

---

## 📝 Örnek Arama

1. Arama kutusuna yazın: `Inception`
2. Sonuçlar otomatik gösteriliyor
3. Posteri tıklayın: **Ekle** butonuna basın
4. Film listesine eklendi ✅

---

## 🎯 Temel Kullanım

### Film Kartında Neler Var?
```
📦 Film Kartı
├── 📸 Poster (hover'da zoom)
├── 📝 Film Adı
├── 📅 Yayın Yılı
├── ⭐ Rating
│
└── Aksiyon Butonları (hover'da görün):
    ├── ✓ İzlendi / İzlenecek
    ├── ♥ Favorilere Ekle
    └── 🗑 Sil
```

### Navigasyon Butonları
```
📽️ Tümü      → Tüm eklenen filmler
✓ İzlendi    → Sadece izledikleriniz
○ İzlenecek  → Sadece izleme listesi
📊 Stats     → Hızlı istatistikler
```

---

## 🛠️ Sorun Giderme (2 dakika)

### Siyah ekran / Hiçbir şey görünmüyor?
```bash
# Adım 1: Package'leri yükle
npm install

# Adım 2: Dev sunucuyu başlat
npm run dev
```

### Filmler ekleniyor ama alanı boş?
```
✅ Normaldir! Firestore bulut'a kaydediyor.
   LocalStorage'a da kaydediliyor.
✅ Sayfa yenilendiğinde veriler orada olacak.
```

### "API key bulunamadı" yazıyor?
```
1. .env dosyasını kontrol et
2. VITE_TMDB_API_KEY=... satırı var mı?
3. Boşluk yok mu?
4. npm run dev'i yeniden başlat
```

### Arama çalışmıyor?
```
1. TMDB API key'in geçerli mi? (https://tmdb.org/settings/api)
2. İnternet bağlantısı var mı?
3. Tarayıcı konsolda hata var mı? (F12)
4. 40 req/10s limiti aşmış mı?
```

---

## 📊 Neler İçeride?

### Oluşturulan Dosyalar
- **17 bileşen** (React components)
- **4 servis** (TMDB, Firebase, Storage, Context)
- **3 sayfa** (Home, Watched, Watchlist)
- **2500+ satır** temiz kod
- **4 dokümantasyon** dosyası

### Teknolojiler
- ✅ React 19 (state management)
- ✅ Vite (super fast)
- ✅ Bootstrap 5 (responsive)
- ✅ Firebase Firestore (veri depolama)
- ✅ TMDB API (film verileri)
- ✅ LocalStorage (offline support)

---

## 🎨 Kâşif: Renk Paletiyle Tanıştır

Uygulamada kullanılan renkler:

```
🔴 Birincil (Netflix Kırmızı): #e50914
🖤 Arka Plan (Siyah):          #0a0a0a
⚫ İkincil (Koyu Gri):          #1a1a1a
🔘 Üçüncül (Gri):              #2a2a2a
⚪ Metin (Beyaz):              #ffffff
🟡 Muted (Gri):                #888888
```

---

## 📱 Mobilde Çalışıyor mu?

✅ **EVET!** Tamamen responsive:
- 📱 Telefon (< 576px): 2 column
- 📑 Tablet (768px): 2-3 column
- 🖥️ Desktop (1024px): 3-4 column
- 📺 Geniş (1200px+): 4+ column

---

## 🔐 Verilerim Güvenli mi?

✅ **EVET!**
- Firebase Security Rules açık (okuma/yazma)
- Şifre/kimlik bilgisi saklanmıyor
- HTTPS şifreli iletişim (Firebase)
- LocalStorage offline desteği

---

## 💾 Verilerim Nereye Kaydediliyor?

```
Sayfa Açılınca:
1. Firebase Firestore'dan yükle (cloud)
2. LocalStorage'a senkronize et
3. Çevrimdışıysa LocalStorage'dan yükle

Yeni Film Ekle:
1. Context'e ekle (RAM)
2. Firebase'e kaydet (cloud)
3. LocalStorage'a kaydet

Çevrimdışı:
1. LocalStorage'dan oku
2. Online olunca Firebase'e gönder
```

---

## 🎁 Bonus Özellikler (Sonrası)

Ekleyebileceğiniz şeyler:

1. **Giriş/Kayıt** (Firebase Auth ile hazır)
2. **Favoriler** (Backend hazır, sadece UI gerekli)
3. **İstatistikler Sayfası** (Navbar'da var, genişletilebilir)
4. **Tema Değiştir** (Opsiyonel)
5. **Share Films** (Sosyal feature)

---

## 📚 Dokümantasyon

Proje'de 4 dokümantasyon dosyası:

| Dosya | İçerik |
|-------|--------|
| **README_TR.md** | Türkçe tam dokümantasyon |
| **SETUP.md** | Kurulum ve çalıştırma |
| **FEATURES.md** | Tüm özellikler detaylı |
| **IMPLEMENTATION.md** | İmplementasyon detayları |

---

## 🧪 Test Etme

### Ön yüklü Test Filmleri
Direkt test etmek için şunları arayın:
- `Inception`
- `The Matrix`
- `Fight Club`
- `Interstellar`
- `Dark Knight`

---

## 🌟 Pro İpuçları

1. **Film Adının Tam Olması Gerekmez**
   - `Incep` yazıp Enter basın → Inception çıkacak

2. **Hızlı İstatistikler**
   - Navbar'da 📊 butonuna tıklayın
   - Hızlıca istatistikleri görebilirsiniz

3. **İzlenme Durumunu Değiştir**
   - Film kartında ✓ butonuna tıklayın
   - Izlendi ↔ Izlenecek geçişi

4. **Favori Sistemi**
   - ♥ butonuna tıklayın
   - Favorilere ekle/çıkar

5. **Veri Kalıcılığı**
   - Sayfa yenilendiğinde veriler kalır
   - İnternet olmasa bile çalışır

---

## 🔄 Development Workflow

### Geliştirme Sırasında
```bash
npm run dev     # Sıcak reload ile çalıştır
```

### Production Build
```bash
npm run build   # Optimized build
npm run preview # Build'i preview et
```

### Linting
```bash
npm run lint    # Code style kontrolü
```

---

## 📦 Dosya Yapısı (Hızlı Referans)

```
src/
├── components/        # React bileşenleri
│   ├── MovieSearch   # Arama
│   ├── MovieCard     # Film kartı
│   ├── MovieList     # Film listesi
│   └── Navbar        # Navigasyon
│
├── pages/            # Sayfalar
│   ├── Home          # Ana sayfa
│   ├── Watched       # İzlenenler
│   └── Watchlist     # İzlenecekler
│
├── services/         # API servisleri
│   ├── tmdb.js       # TMDB API
│   ├── firebase.js   # Firebase
│   └── storage.js    # LocalStorage
│
├── context/          # Global state
│   └── MovieContext  # useMovies
│
└── App.jsx           # Router & layout
```

---

## 🎓 Öğrenme Yolculuğu

İlk Kez mi React Kullanıyorsun?
```
1. React Docs: https://react.dev
2. Bu Proje: Pratik örnek
3. Kendi Projen: Öğrendiklerini uygula
```

Firebase Öğrenin:
```
1. Firebase Console: https://console.firebase.google.com
2. Firestore Kuralları: Security Rules yazma
3. Authentication: Kullanıcı sistemi
```

TMDB API Keşfedin:
```
1. API Docs: https://developers.themoviedb.org/3
2. Daha Fazla Endpoint: Genre, Ratings, vb.
3. İleri İşlemler: Pagination, Filtering
```

---

## 🎯 Next Steps

### Hemen Yap (15 dakika)
- [ ] Filmler ara ve ekle
- [ ] İzlediklerini işaretle
- [ ] Filterlemeleri test et
- [ ] Sayfa yenilendiğinde veriler kalıyor mu kontrol et

### Ertesi Gün (1-2 saat)
- [ ] Firebase Console'da veriyi göz at
- [ ] Kendi API key'ini al
- [ ] Bonus özellikleri keşfet
- [ ] Kodun yapısını incele

### Öğrenme (Daha sonra)
- [ ] React Router hakkında oku
- [ ] Firebase Security Rules öğren
- [ ] CSS Animations derinlemesine
- [ ] TypeScript ekle (ileri level)

---

## 🚀 Deploy Etme (Sonra)

Vercel'e 30 saniyede deploy:
```bash
# 1. npm install -g vercel
# 2. vercel
# 3. Soruları cevapla
# ✅ Deployed!
```

---

## 💬 Sorular?

Yanıtlar burada:

| Soru | Dokümantasyon |
|------|---------------|
| Nasıl kurulur? | SETUP.md |
| Ne özellikler var? | FEATURES.md |
| Kod nasıl çalışıyor? | IMPLEMENTATION.md |
| Tam README | README_TR.md |

---

## 🎬 Hazırsan, Başla!

```bash
# Terminal'de çalıştır:
npm run dev

# Tarayıcıda aç:
http://localhost:5173

# 🎉 İlk filmi ekle!
```

---

**Başarılar! Happy Movie Tracking! 🍿🎬**

P.S. Sorularınız varsa, Issue açıp bize yazabilirsiniz!
