# CineTrack - Film & Dizi Takip Sistemi

CineTrack, film ve dizi izleme alışkanlıklarınızı takip etmenizi, listeler oluşturmanızı ve istatistiklerinizi görüntülemenizi sağlayan modern bir web uygulamasıdır.

## 📋 Proje Hakkında

CineTrack, kullanıcıların film ve dizi koleksiyonlarını yönetebilecekleri, izleme durumlarını takip edebilecekleri ve kişisel istatistiklerini görebilecekleri kapsamlı bir platformdur. TMDB API entegrasyonu ile geniş bir film/dizi veritabanına erişim sağlar ve Firebase ile kullanıcı verilerini güvenli bir şekilde saklar.

## 🎯 Özellikler

### Temel Özellikler
- **Film & Dizi Arama**: TMDB API ile geniş kapsamlı arama
- **Liste Yönetimi**: İzlenenler, İzlenecekler, Favoriler listeleri
- **İzleme Durumu Takibi**: İzlendi, İzleniyor, Bırakıldı durumları
- **Dizi İlerleme Takibi**: Sezon ve bölüm bazlı ilerleme
- **Puanlama**: 1-10 arası kişisel puanlama sistemi
- **Tepki Sistemi**: Film/dizilere emoji ile tepki verme

### Kullanıcı Özellikleri
- **Firebase Kimlik Doğrulama**: E-posta ve Google ile giriş
- **Profil Yönetimi**: Avatar seçimi, profil bilgileri düzenleme
- **Hesap Ayarları**: Şifre değiştirme, e-posta güncelleme
- **Profil Sayfası**: Herkese açık profil görüntüleme

### Sosyal Özellikler
- **Yorum Sistemi**: Film/dizilere yorum yapma
- **Spoiler Koruma**: Spoiler içeren yorumları gizleme
- **Beğeni Sistemi**: Yorumları beğenme
- **Yanıtlama**: Yorumlara yanıt verme
- **Şikayet Sistemi**: Uygunsuz içerik bildirme

### İstatistikler ve Analiz
- **İzleme İstatistikleri**: Toplam izleme süresi, film/dizi dağılımı
- **Tür Analizi**: En çok izlenen türler
- **Görsel Grafikler**: Recharts ile interaktif grafikler
- **Haftalık Özet**: Haftalık izleme özeti

### Admin Paneli
- **Kullanıcı Yönetimi**: Kullanıcıları görüntüleme ve engelleme
- **Yorum Moderasyonu**: Yorumları onaylama/reddetme
- **Şikayet Yönetimi**: Şikayetleri inceleme
- **İçerik Kontrolü**: Uygunsuz içerik yönetimi

### Diğer Özellikler
- **Tema Sistemi**: 6 farklı renk teması (Kırmızı, Altın, Yeşil, Mavi, Mor, Pembe)
- **Responsive Tasarım**: Mobil, tablet ve masaüstü uyumlu
- **Bildirim Sistemi**: Gerçek zamanlı bildirimler
- **Akıllı Öneriler**: İzleme geçmişine dayalı öneriler
- **Paylaşım**: Film/dizi paylaşım özellikleri

## 🛠️ Kullanılan Teknolojiler

### Frontend
- **React 19**: UI kütüphanesi
- **Vite**: Build tool ve development server
- **React Router DOM**: Sayfa yönlendirme
- **Lucide React**: İkon kütüphanesi
- **Recharts**: Grafik kütüphanesi
- **Bootstrap 5**: CSS framework

### Backend & Services
- **Firebase**: Kimlik doğrulama ve veritabanı
- **TMDB API**: Film ve dizi verileri
- **Firestore**: NoSQL veritabanı

### Development Tools
- **ESLint**: Kod kalite kontrolü
- **gh-pages**: GitHub Pages deployment

## 📦 Kurulum

### Gereksinimler
- Node.js 18+ 
- npm veya yarn
- Firebase hesabı
- TMDB API anahtarı

### Adım 1: Projeyi Klonlayın
```bash
git clone https://github.com/efefurkan/cinetrack.git
cd cinetrack
```

### Adım 2: Bağımlılıkları Yükleyin
```bash
npm install
```

### Adım 3: Environment Değişkenlerini Ayarlayın
`.env` dosyasını `.env.example` dosyasından kopyalayın ve değerleri doldurun:

```env
VITE_TMDB_API_KEY=your_tmdb_api_key_here
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_firebase_app_id_here
```

### Adım 4: Firebase Kurulumu
1. [Firebase Console](https://console.firebase.google.com/)'da yeni bir proje oluşturun
2. Authentication'ı etkinleştirin (Email/Password ve Google sağlayıcıları)
3. Firestore veritabanı oluşturun
4. Proje ayarlarından config bilgilerini alın
5. `.env` dosyasına yapıştırın

### Adım 5: TMDB API Anahtarı Alın
1. [TMDB](https://www.themoviedb.org/) sitesine kayıt olun
2. API anahtarı oluşturun
3. `.env` dosyasına ekleyin

## 🚀 Çalıştırma

### Development Modu
```bash
npm run dev
```
Uygulama `http://localhost:5173` adresinde çalışacaktır.

### Build Alma
```bash
npm run build
```
Build dosyaları `dist` klasörüne oluşturulacaktır.

### Preview
```bash
npm run preview
```
Build edilmiş uygulamayı yerel olarak test edin.

### Lint
```bash
npm run lint
```
Kod kalitesini kontrol edin.

## 🌐 Deploy

### GitHub Pages
Projeyi GitHub Pages'a deploy etmek için:

```bash
npm run deploy
```

Bu komut:
1. Build alır
2. `dist` klasörünü GitHub Pages'a yükler

**Not**: `package.json` dosyasındaki `homepage` alanını kendi GitHub Pages URL'nizle güncelleyin.

## 📁 Klasör Yapısı

```
cinetrack/
├── public/                 # Statik dosyalar
│   ├── cinetrack-logo.png
│   ├── cinetrack-logo-mark.png
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── components/         # React bileşenleri
│   │   ├── Navbar.jsx
│   │   ├── MovieCard.jsx
│   │   ├── MovieDetailsModal.jsx
│   │   ├── AuthScreen.jsx
│   │   └── ...
│   ├── pages/             # Sayfa bileşenleri
│   │   ├── Home.jsx
│   │   ├── Movies.jsx
│   │   ├── UserProfile.jsx
│   │   └── ...
│   ├── context/           # React Context
│   │   ├── MovieContext.jsx
│   │   └── NotificationContext.jsx
│   ├── services/          # API servisleri
│   │   ├── firebase.js
│   │   ├── tmdb.js
│   │   ├── commentService.js
│   │   └── ...
│   ├── utils/             # Yardımcı fonksiyonlar
│   │   ├── media.js
│   │   ├── dateTime.js
│   │   └── ...
│   ├── styles/            # CSS dosyaları
│   │   ├── global.css
│   │   ├── components/
│   │   └── pages/
│   ├── constants/         # Sabit değerler
│   ├── hooks/             # Custom hooks
│   ├── App.jsx            # Ana uygulama bileşeni
│   └── main.jsx           # Entry point
├── .env.example           # Environment şablonu
├── .gitignore             # Git ignore dosyası
├── eslint.config.js       # ESLint konfigürasyonu
├── index.html             # HTML şablonu
├── package.json           # Proje bağımlılıkları
└── vite.config.js         # Vite konfigürasyonu
```

## 🎨 Ekran Görüntüleri

### Ana Sayfa
- Film ve dizi kartları
- Öne çıkan içerikler
- Kişiselleştirilmiş öneriler

### Profil Sayfası
- Kullanıcı bilgileri
- İzleme istatistikleri
- Favori içerikler

### Admin Paneli
- Kullanıcı yönetimi
- Yorum moderasyonu
- Şikayet yönetimi

## 👨‍💻 Geliştirici

**Ad Soyad**: Efe Furkan Doğrusöz  
**GitHub**: [@efefurkan](https://github.com/efefurkan)  
**Proje**: [CineTrack](https://github.com/efefurkan/cinetrack)

## 📝 Lisans

Bu proje kişisel kullanım için geliştirilmiştir. Tüm hakları saklıdır.

## 🤝 Katkıda Bulunma

Katkıda bulunmak isterseniz:
1. Projeyi fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Branch'inizi push edin (`git push origin feature/AmazingFeature`)
5. Pull Request açın

## 📧 İletişim

Sorularınız ve önerileriniz için: [GitHub Issues](https://github.com/efefurkan/cinetrack/issues)

## ⚠️ Önemli Notlar

- `.env` dosyasını asla GitHub'a yüklemeyin
- Firebase ve TMDB API anahtarlarınızı güvende tutun
- Production ortamında Firebase güvenlik kurallarını doğru yapılandırın
- TMDB API kullanım limitlerine dikkat edin

## 🔄 Güncellemeler

### v1.0.0
- İlk sürüm
- Temel film/dizi takip özellikleri
- Firebase entegrasyonu
- TMDB API entegrasyonu
- Kullanıcı profili ve auth sistemi
- Yorum ve sosyal özellikler
- Admin paneli
- İstatistikler ve grafikler
- Tema sistemi
