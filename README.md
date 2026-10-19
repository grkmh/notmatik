# Notmatik — Ders Kütüphanesi

Üniversite öğrencilerinin ders notu, çıkmış sınav, özet ve sunum gibi materyalleri
paylaşabildiği bir web uygulaması. Yüklenen her dosya yayımlanmadan önce bir
moderasyon akışından geçer; yayımlanan materyaller herkese açıktır.

> **Durum:** Aktif geliştirme. AI ön incelemesi (`AI_REVIEW`) ve dosya taraması
> altyapı olarak hazır, işçi (worker) tarafı henüz uygulanmadı.

## Özellikler

- **Kayıt ve giriş** — e-posta + şifre, Auth.js (NextAuth v5) credentials sağlayıcısı
- **Materyal yükleme** — PDF, DOCX, PPTX; uzantıya değil dosya imzasına (magic bytes) bakılır
- **Tekrar yükleme koruması** — SHA-256 ile aynı dosyanın ikinci kez yüklenmesi engellenir
- **Moderasyon akışı** — taslak → inceleme → yapay zekâ/yönetici → yayın/ret/düzeltme
- **Rol tabanlı yetkilendirme** — `USER`, `MODERATOR`, `ADMIN`; rol her istekte DB'den okunur
- **Arama ve filtreleme** — ders adı, kodu, başlık ve tür
- **Özel depolama** — dosyalar herkese açık olmayan R2 bucket'ında, karantina önekiyle durur
- **Karanlık tema** desteği

## Teknolojiler

| Katman | Teknoloji |
| --- | --- |
| Çatı | Next.js 16 (App Router, Server Actions, Turbopack) |
| Arayüz | React 19, Tailwind CSS 4, TypeScript |
| Veritabanı | PostgreSQL + Prisma 6 |
| Kimlik doğrulama | Auth.js (NextAuth v5), bcryptjs |
| Doğrulama | Zod |
| Dosya depolama | Cloudflare R2 / S3 uyumlu (AWS SDK v3) |

## Kurulum

Gereksinimler: **Node.js 20+** ve bir **PostgreSQL** veritabanı (yerel, Neon,
Supabase vb.). Dosya depolama için R2 zorunlu değildir; boş bırakılırsa
geliştirme sırasında `.local-storage/` kullanılır.

```bash
git clone https://github.com/grkmh/notmatik.git
cd notmatik
npm install

cp .env.example .env        # Windows: copy .env.example .env
# .env içindeki DATABASE_URL ve AUTH_SECRET değerlerini doldur

npx prisma migrate deploy   # mevcut migration'ları uygular
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde açılır.

Yeni bir şema değişikliği geliştirirken migration üretmek için:

```bash
npx prisma migrate dev --name degisiklik_adi
```

## Ortam değişkenleri

| Değişken | Zorunlu | Açıklama |
| --- | --- | --- |
| `DATABASE_URL` | Evet | PostgreSQL bağlantı adresi |
| `AUTH_SECRET` | Evet | Oturum imzası; `openssl rand -base64 32` ile üretin |
| `R2_ENDPOINT` | Hayır | Boşsa dosyalar `.local-storage/` altına yazılır |
| `R2_ACCESS_KEY_ID` | Hayır | R2 erişim anahtarı |
| `R2_SECRET_ACCESS_KEY` | Hayır | R2 gizli anahtarı |
| `R2_BUCKET` | Hayır | Bucket adı (varsayılan: `edu-private`) |
| `MAX_UPLOAD_BYTES` | Hayır | Yükleme sınırı, bayt (varsayılan: 25 MB) |
| `AI_REVIEW_ENABLED` | Hayır | `true` ise içerikler önce AI incelemesine gider |

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm run start` | Üretim sunucusu |
| `npm run lint` | ESLint kontrolü |
| `npm run typecheck` | TypeScript tip kontrolü |
| `npm run db:migrate` | Migration'ları uygular (`prisma migrate deploy`) |
| `npm run db:studio` | Prisma Studio |

## Roller ve moderasyon akışı

| Rol | Yetkiler |
| --- | --- |
| `USER` | Materyal yükleme |
| `MODERATOR` | Yükleme + inceleme (onay, ret, düzeltme isteme) |
| `ADMIN` | Tümü + yayından kaldırma (`UNPUBLISH`) |

Akış, `src/lib/moderation/state-machine.ts` içinde tanımlıdır:

```text
DRAFT ──► PENDING_REVIEW ──► AI_REVIEW ──┐
              │                          ├──► ADMIN_REVIEW ──► PUBLISHED
              └──────────────────────────┘                    ├──► REJECTED
                                                               └──► NEEDS_CHANGES ──► PENDING_REVIEW
PUBLISHED ──► UNPUBLISHED ──► ADMIN_REVIEW
```

Her geçiş `ModerationEvent` olarak, her yönetici kararı ayrıca
`ModerationDecision` olarak kaydedilir. Geçişler işlem (transaction) içinde ve
durum koşuluyla (`updateMany`) yapılır; eşzamanlı kararlar çakışmaz.

İlk yöneticiyi atamak için Prisma Studio'dan ilgili `User` kaydının `role`
alanını `ADMIN` yapın.

## Proje yapısı

```text
prisma/
  schema.prisma          Veri modeli (User, Material, MaterialFile, ...)
  migrations/            SQL migration'ları
src/
  auth.ts                Auth.js yapılandırması
  app/
    page.tsx             Yayımlanmış materyallerin listesi ve araması
    giris|kayit/         Giriş ve kayıt sayfaları (server action)
    yukle/               Materyal yükleme formu
    admin/               İnceleme paneli
    api/                 Materyal, indirme, gönderme ve karar uç noktaları
  components/Shell.tsx   Ortak üst menü / yerleşim
  lib/
    auth/                Oturum ve yetki yardımcıları
    moderation/          Durum makinesi ve geçiş fonksiyonu
    uploads/validate.ts  Dosya doğrulama (magic bytes, boyut, SHA-256)
    storage.ts           R2 veya yerel depolama
    labels.ts            Türkçe etiketler
```

## Güvenlik notları

- `.env` ve `.env.local` **asla** commit edilmez (`.gitignore` ile korunur).
- Dosyalar `quarantine/<kullanıcı>/` önekiyle özel bucket'a yazılır; indirme
  bağlantısı 5 dakika geçerlidir.
- Yetki kontrolü yalnızca API katmanında (`requirePermission`) yapılır; arayüz
  yalnızca butonları gizler.
- Dosya türü uzantıya göre değil, ilk baytlara göre doğrulanır.

## Lisans

Bu depo için henüz bir lisans belirtilmemiştir.
