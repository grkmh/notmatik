# Ders Kütüphanesi

Öğrencilerin ders notu, PDF, konu özeti, sunum, çalışma kâğıdı ve soru çözümü paylaşabildiği, **moderasyonlu** bir eğitim içerik platformu. Herkes yayımlanmış materyalleri görüp indirebilir; kayıtlı kullanıcılar materyal yükler; yüklenen her içerik yayımlanmadan önce yönetici incelemesinden geçer.

> Bu belge, geliştirme ekibinin ortak çalışma belgesidir. Teknik özet, ekip kararları, açık sorular ve artı/eksi değerlendirmelerini bir arada tutar. "Ders Kütüphanesi" çalışma adıdır, değişebilir.

## İçindekiler

1. [Durum](#durum)
2. [Roller ve yetkiler](#roller-ve-yetkiler)
3. [İçerik durumları ve akış](#içerik-durumları-ve-akış)
4. [Teknoloji yığını](#teknoloji-yığını)
5. [Proje yapısı](#proje-yapısı)
6. [Kurulum](#kurulum)
7. [Yol haritası](#yol-haritası)
8. [Ekip kararları](#ekip-kararları)
9. [Açık sorular ve artı/eksi değerlendirmeleri](#açık-sorular-ve-artıeksi-değerlendirmeleri)
10. [Hukuki notlar](#hukuki-notlar)
11. [Canlıya çıkış kontrol listesi](#canlıya-çıkış-kontrol-listesi)
12. [Bilinen eksikler](#bilinen-eksikler)

## Durum

Faz 1'in çekirdeği yerel ortamda çalışıyor: kayıt/giriş, materyal yükleme, inceleme kuyruğu, yönetici paneli (onay, ret, düzeltme isteme, yayından kaldırma), herkese açık kütüphane, arama ve tür filtresi. Proje henüz internete açık değil. Canlıya çıkmadan önce yapılması gerekenler [Canlıya çıkış kontrol listesinde](#canlıya-çıkış-kontrol-listesi).

## Roller ve yetkiler

| Rol | Yapabilecekleri |
| --- | --- |
| **Ziyaretçi** | Yayımlanmış içerikleri görür, arar, filtreler, indirir. |
| **Kayıtlı kullanıcı** | Giriş yapar, materyal yükler, yüklemelerinin durumunu takip eder, favori ekler. |
| **Moderatör** | Bekleyen içerikleri inceler, açıklama yazar, onay/ret/düzeltme kararı verir. |
| **Yönetici** | Moderatörün her şeyini yapar; ayrıca yayından kaldırır, kullanıcı rollerini ve temel verileri (kategori, ders) yönetir. |

Yetki kontrolü yalnızca arayüzde değil **sunucu tarafında** (`src/lib/auth/policy.ts`) yapılır. Arayüz sadece düğmeleri gizler.

**Kullanıcı onayı:** Siteden kayıt olan herkes `approved = false` ile açılır ve yönetici
onaylayana kadar **giriş yapamaz**. Yönetici, `/admin/kullanicilar` sayfasından bekleyen
hesapları onaylar/reddeder ve dilerse elle yeni kullanıcı ekler (eklenen hesap doğrudan onaylıdır).

## İçerik durumları ve akış

Ekip kararıyla "Yapay zekâ kontrolünde" durumu listeden çıkarıldı. Güncel durumlar:

| Durum | Anlamı |
| --- | --- |
| Taslak | Yüklendi, henüz incelemeye gönderilmedi. |
| İnceleme bekliyor | Gönderildi, otomatik kontrollerden geçiyor. |
| Yönetici incelemesi bekliyor | Yönetici/moderatör kararını bekliyor. |
| Düzeltme gerekli | İncelemeci düzeltme istedi; yazar düzeltip tekrar gönderir. |
| Onaylandı ve yayımlandı | Herkese açık kütüphanede görünür. |
| Reddedildi | Yayımlanmadı. |
| Yayından kaldırıldı | Önceden yayındaydı, kaldırıldı. |

```
Taslak ──► İnceleme bekliyor ──► Yönetici incelemesi bekliyor ──┬──► Onaylandı ve yayımlandı ──► Yayından kaldırıldı
                ▲                                               ├──► Reddedildi
                └──────────── Düzeltme gerekli ◄────────────────┘
```

Her durum geçişi, kim yaptı/ne zaman/neden bilgisiyle `ModerationEvent` tablosuna yazılır. İnsan kararları ayrıca `ModerationDecision` tablosunda tutulur. İçerik, sunucuda tanımlı geçiş kurallarına (`state-machine.ts`) uymadıkça durum değiştiremez; örneğin "Taslak" doğrudan "Yayımlandı"ya geçemez.

## Teknoloji yığını

| Katman | Seçim | Not |
| --- | --- | --- |
| Uygulama | Next.js (TypeScript, App Router) | Sayfalar ve API aynı projede |
| Veritabanı | PostgreSQL (Neon) + Prisma | İlişkisel veri, moderasyon geçmişi |
| Giriş | Auth.js (e-posta + şifre, `bcryptjs`) | Rol her istekte veritabanından okunur |
| Dosya depolama | Cloudflare R2 (S3 uyumlu), geliştirmede yerel klasör | Alternatif: Google Cloud Storage / Firebase, bkz. [Soru 3](#soru-3-dosya-depolama-cloudflare-r2-mi-firebase-mi) |
| Doğrulama | Zod | Tüm girdiler sunucuda doğrulanır |

## Proje yapısı

```
edu/
├─ .env                        veritabanı ve depolama ayarları (gizli, paylaşma)
├─ .env.local                  AUTH_SECRET oturum anahtarı (gizli)
├─ .local-storage/             yüklenen dosyalar, yalnızca geliştirmede
├─ next.config.ts              Next.js ayarları
├─ package.json
├─ prisma/
│  ├─ schema.prisma            veri modeli: kullanıcı, içerik, dosya, moderasyon
│  └─ migrations/              veritabanı sürüm geçmişi
└─ src/
   ├─ auth.ts                  giriş sistemi (e-posta + şifre)
   ├─ types/
   │  └─ next-auth.d.ts        oturumda kullanıcı kimliği tipi
   ├─ components/
   │  └─ Shell.tsx             üst menü ve sayfa iskeleti
   ├─ lib/
   │  ├─ db.ts                 veritabanı bağlantısı
   │  ├─ http.ts               hata yönetimi
   │  ├─ labels.ts             Türkçe tür ve durum adları
   │  ├─ ui.ts                 ortak stil sınıfları
   │  ├─ storage.ts            dosya depolama (R2 ya da yerel)
   │  ├─ auth/
   │  │  ├─ policy.ts          rol ve yetki kuralları
   │  │  └─ session.ts         giriş yapan kullanıcıyı bulur
   │  ├─ moderation/
   │  │  ├─ state-machine.ts   hangi durumdan hangisine geçilebilir
   │  │  └─ transition.ts      geçişi uygular, denetim kaydı yazar
   │  └─ uploads/
   │     └─ validate.ts        dosya türü, boyut ve özet kontrolü
   └─ app/
      ├─ layout.tsx            genel sayfa kabuğu (Next.js'in)
      ├─ page.tsx              ana sayfa: kütüphane, arama, filtre
      ├─ giris/page.tsx        giriş sayfası
      ├─ kayit/page.tsx        kayıt sayfası
      ├─ yukle/
      │  ├─ page.tsx           yükleme sayfası (giriş şart)
      │  └─ UploadForm.tsx     yükleme formu
      ├─ admin/
      │  ├─ page.tsx           inceleme paneli (moderatör ve yönetici)
      │  └─ DecisionButtons.tsx  onayla, düzeltme iste, reddet düğmeleri
      └─ api/
         ├─ auth/[...nextauth]/route.ts   giriş uç noktası
         ├─ register/route.ts             kayıt
         ├─ materials/
         │  ├─ route.ts                   materyal yükleme
         │  └─ [id]/
         │     ├─ submit/route.ts         incelemeye gönderme
         │     └─ download/route.ts       indirme (yayında değilse yetki ister)
         └─ admin/materials/[id]/decision/route.ts   yönetici kararı
```

**Akış:** öğrenci `yukle` sayfasından dosyayı gönderir. `materials/route.ts` dosyayı doğrular, depoya yazar ve içeriği taslak olarak kaydeder. `submit` onu yönetici kuyruğuna alır. Yönetici `admin` sayfasından karar verir; karar `decision/route.ts` üzerinden `state-machine.ts` kurallarına göre uygulanır. Onaylanan içerik ana sayfadaki kütüphanede görünür.

## Kurulum

Gereksinimler: Node.js 20 veya üstü, bir PostgreSQL veritabanı (Neon ücretsiz katmanı yeterli).

```bash
npm install
npx auth secret                  # .env.local içine AUTH_SECRET yazar
cp .env.example .env             # Windows'ta: copy .env.example .env
# .env içindeki DATABASE_URL'yi doldur
npx prisma migrate dev --name init
npm run dev                      # http://localhost:3000
```

İlk yönetici hesabı: siteden kayıt ol, ardından `npx prisma studio` ile `User` tablosunda kendi satırının `role` alanını `ADMIN` yap. Sonraki kullanıcıları `/admin/kullanicilar` sayfasından onaylayabilir veya elle ekleyebilirsin.

### Ortam değişkenleri

| Değişken | Açıklama |
| --- | --- |
| `DATABASE_URL` | PostgreSQL bağlantı adresi. **Asla paylaşma ve depoya ekleme.** |
| `AUTH_SECRET` | Oturum imzalama anahtarı (`.env.local`). Canlı için ayrıca üretilmeli. |
| `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Dosya deposu. `R2_ENDPOINT` boşsa dosyalar yerel `.local-storage` klasörüne yazılır (yalnızca geliştirme). |
| `MAX_UPLOAD_BYTES` | En büyük dosya boyutu (varsayılan 25 MB). |
| `AI_REVIEW_ENABLED` | Eski yapay zekâ anahtarı; [ekip kararı](#ekip-kararları) gereği kaldırılacak. |

`.env`, `.env.local` ve `.local-storage/` Git'e **eklenmemelidir** (`.gitignore` içinde olmalı).

## Yol haritası

**Faz 1 (MVP)**
- [x] Kayıt ve giriş
- [x] Materyal yükleme, dosya doğrulama, tekrar tespiti (SHA-256)
- [x] İnceleme kuyruğu ve yönetici paneli (onay, ret, düzeltme)
- [x] Herkese açık kütüphane, arama ve tür filtresi
- [ ] Akademik yılın zorunlu hale getirilmesi
- [ ] Hukuki metinler: KVKK aydınlatma metni, kullanım koşulları, telif/kaldırma bildirimi formu
- [ ] Yükleme sırasında sorumluluk onayı metninin hukuki olarak netleştirilmesi (kutu var, metin taslak)
- [ ] "Yüklemelerim" sayfası (kullanıcı kendi içeriklerinin durumunu görür)
- [ ] Düzeltme istenen içeriğin yazar tarafından düzenlenip yeniden gönderilmesi
- [ ] E-posta doğrulama ve hız sınırlama (canlıdan önce şart)

**Faz 2**
- [ ] Favoriler, bildirimler, profil
- [ ] İçerik düzenleme ve kaldırma talebi
- [ ] Moderatör rolünün arayüzde kullanıma açılması (rol ve yetki kodda hazır)
- [ ] Kategori ve ders yönetimi

**Faz 3**
- [ ] Zararlı dosya taraması
- [ ] Kural tabanlı ön kontrol (yapay zekâ ön kontrolünün yerine, bkz. [Soru 2](#soru-2-kural-tabanlı-kontrol-neyi-kontrol-eder-onayı-kim-verir))
- [ ] OCR (değerlendirilecek, bkz. [Soru 1](#soru-1-ocr-nedir-ve-ne-için-kullanırız))
- [ ] İstatistikler

Öneri: Kural tabanlı ön kontrolün basit hali ucuz ve faydalı olduğu için Faz 3'ü beklemeden Faz 2'ye alınabilir.

## Ekip kararları

Aşağıdaki kararlar ekip notlarından (Görkem) alındı. "Kodda durum" sütunu, kararın kod tarafına yansıyıp yansımadığını gösterir.

| Karar | Kodda durum |
| --- | --- |
| **Akademik yıl zorunlu olacak.** | Yapılmadı. Şu an isteğe bağlı (veritabanı alanı `String?`, formda "isteğe bağlı" etiketi, sunucu doğrulamasında opsiyonel). |
| **Yapay zekâ/bot kullanılmayacak; içerik kontrolü elle yazılmış kural tabanlı algoritmayla yapılacak.** | Yapılmadı. `AI_REVIEW` durumu, `AiReview` tablosu ve `AI_REVIEW_ENABLED` ayarı kodda duruyor, kaldırılacak. |
| **"Yapay zekâ kontrolünde" durumu listeden çıkarıldı.** | Yapılmadı. Durum `ContentStatus` listesinde ve durum makinesinde duruyor. |
| **Telif/kaldırma bildirimi formu, yükleme sorumluluk onayı ve KVKK metinleri MVP'ye dahil.** | Kısmen. Onay kutusu var; form ve metinler yok. |

## Açık sorular ve artı/eksi değerlendirmeleri

### Soru 1: OCR nedir ve ne için kullanırız?

**OCR (Optik Karakter Tanıma)**, bir görüntüdeki yazıyı bilgisayarın okuyabileceği metne çevirir. Taranmış bir PDF ya da fotoğraftan çekilmiş bir ders notu bilgisayar için "resim"dir; içindeki kelimeleri aratamazsınız. OCR bu resimden metin çıkarır.

Bizim için olası kullanımlar:

- **İçerik içinde arama:** Kullanıcı "integral" yazınca notların içinde geçen yerler de bulunur, sadece başlık ve etiketler değil.
- **Kural tabanlı kontroller:** Dosya boş mu, ders konusuyla alakasız mı, daha önce yüklenmiş bir notun kopyası mı, bunları anlamak için metne ihtiyaç var.
- **Erişilebilirlik:** Ekran okuyucu kullanan öğrenciler metne erişebilir.

Bilinmesi gerekenler:

- Zaten dijital olarak üretilmiş PDF'lerde (Word'den ya da PowerPoint'ten dışa aktarılmış) metin doğrudan çıkarılabilir, OCR gerekmez.
- OCR yalnızca taranmış ve fotoğraflanmış dosyalarda gerekir. **El yazısı notlarda başarısı düşüktür**, özellikle Türkçe karakterlerde.
- Ek maliyet ve işlem süresi getirir.

**Öneri:** MVP'de OCR olmadan başla. Önce dijital PDF'lerden metin çıkarmayı (OCR'sız) ekle; taranmış dosya oranı yüksek çıkarsa OCR'a dön.

### Soru 2: Kural tabanlı kontrol neyi kontrol eder, onayı kim verir?

Notlardaki ifade ("not kontrolü ve onayı için elle yazılmış bir algoritma yeterli") iki şekilde okunabilir ve **ekibin netleştirmesi gerekiyor**:

- **Seçenek A:** Algoritma bir ön kontrol yapar ve yöneticiye uyarı bayrakları gösterir; son karar insanda kalır.
- **Seçenek B:** Algoritma belirli koşullarda içeriği otomatik onaylar.

**Öneri: A.** Proje sahibinin başlangıçtaki hedefi her içeriğin yönetici onayından geçmesiydi. Otomatik onay, hukuki sorumluluk açısından da riskli: telifli bir içerik hiçbir insan görmeden yayına çıkabilir. Güven oluştuktan sonra, düşük riskli durumlar (örneğin güvenilir, geçmişi temiz kullanıcılar) için B kademeli olarak eklenebilir.

Kural tabanlı ön kontrolde bakılabilecekler (öneri listesi):

| Kontrol | Amaç |
| --- | --- |
| Dosya imzası, tür ve boyut | Gerçekten PDF/DOCX/PPTX mi (kodda var) |
| SHA-256 özeti | Aynı dosyanın tekrarı (kodda var) |
| Zorunlu alanların doluluğu | Eksik bilgili yüklemeleri baştan elemek |
| Başlık/açıklama kalitesi | Çok kısa, anlamsız ya da tekrar eden metin; yasaklı kelime listesi |
| PDF açılabiliyor mu, kaç sayfa | Bozuk, boş ya da şifreli dosya |
| Çıkarılan metnin benzerliği | Yakın kopya tespiti |
| Kullanıcı hızı | Kısa sürede çok sayıda yükleme (spam) |

Sonuç, yönetici panelinde "uyarı bayrakları" olarak görünür. Bayrak çıkması içeriği otomatik reddetmez.

### Soru 3: Dosya depolama: Cloudflare R2 mi, Firebase mi?

Ekip notlarında "veri depolama için Google Firebase bir opsiyon" yazıyor. Burada iki ayrı şey karışmasın:

- **Veritabanı** (kullanıcılar, içerik kayıtları, moderasyon geçmişi): PostgreSQL'de kalır. Firebase'in veritabanı (Firestore) farklı bir modeldir ve geçmek veri modelinin baştan yazılması demektir. Önerilmez.
- **Dosya deposu** (PDF'ler): Burada Firebase'in *Cloud Storage for Firebase* bileşeni gerçekten bir seçenek.

| | Cloudflare R2 (şu an kodda) | Cloud Storage for Firebase |
| --- | --- | --- |
| Artı | S3 uyumlu, mevcut kod buna göre yazılı. Cloudflare indirme trafiği için çıkış ücreti almadığını duyurur (güncel koşulları kontrol et). | Google altyapısı, Firebase konsolu ve güvenlik kuralları. Ekipte Firebase deneyimi varsa tanıdık. |
| Eksi | Cloudflare hesabı ve bucket kurulumu gerekir. | Resmi dokümana göre proje **Blaze (kullandıkça öde)** planında olmalı; fatura hesabı bağlanmadan bucket açılmaz. Ücretsiz kota (Always Free) belirli ABD bölgeleriyle sınırlı. İndirme trafiği ücretlidir. |
| Kod etkisi | Yok | `src/lib/storage.ts` dosyasının yeniden yazılması (depolama katmanı tek dosyada olduğu için sınırlı iş) |

Bir başka konu: Vercel'e yayınlanırsa dosya yükleme tarayıcıdan **doğrudan depoya** gitmelidir (Vercel fonksiyonlarında istek gövdesi 4,5 MB ile sınırlı). Bu ihtiyaç R2 için de Firebase için de geçerlidir, depo seçimini etkilemez.

**Öneri:** Karar acil değil. Depolama tek dosyada soyutlandığı için sonradan değiştirmek kolay. Maliyet ve ekibin aşinalığı belirleyici olmalı; ödeme yöntemi bağlamak istenmiyorsa R2'nin güncel koşullarına ve ücretsiz kotasına bakılmalı.

### Soru 4: "Sınav tarzı soru çözümleri" önerisi telif sorununu çözer mi?

Öneri: Çıkmış sınavları o isim ve formatta yüklemek yerine "sınav tarzı soru çözümleri" formatında yüklemek.

**Neyi çözer, neyi çözmez?** Telif sorunu, bir içeriğe verdiğimiz isimden değil, içeriğin **ne olduğundan** doğar:

- Öğrencilerin **kendi hazırladığı** sınav tarzı sorular ve çözümleri gerçekten telif riskini azaltır, çünkü ortada kopyalanmış bir sınav yoktur.
- Gerçek sınav sorularının aynen ya da yakın biçimde kopyalanıp **yalnızca etiketi değiştirilmesi** riski ortadan kaldırmaz. Aynı içerik farklı adla durur. Etiket oyunu ayrıca kötü niyet izlenimi verebilir ve bir kaldırma talebinde aleyhe sayılabilir.

**Öneri:** Fikri benimseyip gerçek içerik politikasına dönüştürmek:

1. Tür adı "Sınav tarzı soru ve çözümleri" olsun; yükleme koşulu "kendi hazırladığım, gerçek sınavdan birebir kopyalamadığım içerik" olsun.
2. Yükleme sırasındaki sorumluluk onayı bunu açıkça belirtsin.
3. Yönetici inceleme kontrol listesine "Gerçek bir sınavın kopyası görünüyor mu?" maddesi eklensin.
4. Telif/kaldırma bildirimi formu ve hızlı yayından kaldırma süreci hazır olsun.

Kodda etkisi: `PAST_EXAM` (çıkmış sınav), `MIDTERM` (vize), `FINAL`, `MAKEUP` (bütünleme) türleri bu karardan etkilenir; yeniden adlandırılması ya da birleştirilmesi gerekir.

## Hukuki notlar

- Bu bölüm hukuki tavsiye değildir. Canlıya çıkmadan önce telif ve KVKK konusunda bir hukukçudan görüş alınması önerilir.
- MVP'de bulunması gerekenler: **telif/kaldırma bildirimi formu**, **yükleme sırasında sorumluluk onayı** ve **KVKK aydınlatma metni** ile kullanım koşulları.
- Çıkmış sınavlar ve ders sunumları telif sorunu çıkarabilecek içeriklerdir (bkz. [Soru 4](#soru-4-sınav-tarzı-soru-çözümleri-önerisi-telif-sorununu-çözer-mi)).
- Platform, kullanıcı içeriği barındırdığı için "bildirim ve kaldırma" sürecinin işleyen, kayıt tutan ve hızlı olması önemlidir. Yayından kaldırma ve moderasyon geçmişi bu amaçla zaten tutuluyor.

## Canlıya çıkış kontrol listesi

1. **Yükleme mimarisi:** Vercel'de fonksiyon istek gövdesi 4,5 MB ile sınırlı olduğundan, 25 MB'a kadar dosya için tarayıcıdan doğrudan depoya yükleme (imzalı adres) gerekir. Alternatif: sürekli çalışan bir sunucuda barındırmak (Railway, Render, Fly.io, VPS).
2. **Dosya deposu:** Özel (herkese kapalı) bir bucket. Yerel depolama canlıda çalışmaz.
3. **Veritabanı:** Canlı için ayrı veritabanı; `npx prisma migrate deploy`. Bağlantı şifresi hiçbir zaman sohbet, e-posta ya da Git'te paylaşılmamalı; paylaşıldıysa yenilenmeli.
4. **Gizli anahtarlar:** Canlı için yeni `AUTH_SECRET`; tüm değişkenler barındırma panelinden girilir.
5. **E-posta doğrulama ve hız sınırlama.**
6. **Hukuki metinler** ve telif bildirimi formu.
7. **İlk yönetici hesabı** ve alan adı bağlama.
8. **Önerilen strateji:** Önce davetli kapalı beta (az sayıda kişi), izle, sonra herkese aç.

## Bilinen eksikler

- Zararlı dosya taraması yok. Tek koruma yönetici incelemesidir; yönetici dosyayı açarken dikkatli olmalıdır.
- DOCX/PPTX dosyalarında yalnızca dosya imzası (zip) kontrol edilir; iç yapı doğrulaması yoktur.
- İçerik detay sayfası, favoriler, bildirimler, profil ve kullanıcı yönetimi arayüzü yok.
- Yönetici panelinde moderasyon geçmişi yalnızca son 3 karar olarak görünür; tam geçmiş ekranı yok.
- Otomatik test yok.
