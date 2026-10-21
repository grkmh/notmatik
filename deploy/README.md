# Linux sunucuda 7/24 çalıştırma

Uygulama, kendi Linux bilgisayarında/sunucunda çalışır; veritabanı Neon'da (bulut),
dosyalar yerel diskte (`.local-storage/`) kalır. Dışarıya açmak için Tailscale Funnel
kullanılır: ücretsiz, kalıcı `https://...ts.net` adresi verir, port yönlendirme/firewall
açmayı gerektirmez.

## 1) Gereksinimler

```bash
sudo apt update && sudo apt install -y git curl
# Node.js 20+ (nvm veya NodeSource ile)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20+ olmalı
```

## 2) Projeyi al ve kur

```bash
git clone https://github.com/grkmh/notmatik.git edu
cd edu
npm ci
```

`.env` dosyasını oluştur (Neon bağlantısı + oturum anahtarı; R2 boş = yerel depolama):

```bash
cat > .env <<'EOF'
DATABASE_URL="postgresql://KULLANICI:SIFRE@HOST/neondb?sslmode=require"
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=edu-private
MAX_UPLOAD_BYTES=26214400
AI_REVIEW_ENABLED=false
EOF

cat > .env.local <<'EOF'
AUTH_SECRET=BURAYA_RASTGELE_BIR_DEGER
EOF
```

`AUTH_SECRET` üretmek için: `openssl rand -base64 32`

## 3) Veritabanı ve derleme

```bash
npx prisma migrate deploy
npx prisma generate
npm run build
```

## 4) systemd ile 7/24 çalıştır

```bash
sudo cp deploy/notmatik.service /etc/systemd/system/notmatik.service
# Dosyayı aç, WorkingDirectory ve User alanlarını kendi yolunla değiştir:
sudo nano /etc/systemd/system/notmatik.service
sudo systemctl daemon-reload
sudo systemctl enable --now notmatik
sudo systemctl status notmatik   # çalışıyor mu
```

Güncelleme:

```bash
git pull
npm ci
npx prisma migrate deploy
npm run build
sudo systemctl restart notmatik
```

## 5) İnternete aç (Tailscale Funnel)

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Tarayıcıda çıkan linkle cihazı hesabına bağla

sudo tailscale funnel --bg 3000
```

Adres: `https://<bilgisayar-adı>.<tailnet-adı>.ts.net`

Not: Funnel'ı ilk kullanımda Tailscale yönetim panelinden (Machines → cihaz → Funnel)
etkinleştirmen istenebilir. Kapatmak için: `sudo tailscale funnel --bg off`.

## Notlar

- Neon veritabanı zaten bulutta; Linux PC kapansa bile veri durur.
- Dosyalar `.local-storage/` altında; bu klasörü yedekle.
- `.env`, `.env.local`, `.local-storage/` Git'e girmez.
