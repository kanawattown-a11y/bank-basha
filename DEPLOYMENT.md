# 🚀 خطوات النشر على Lightsail - من البداية للنهاية

---

## 📋 قبل البدء - تأكد من:

- [ ] أكملت إعداد AWS (`AWS-SETUP.md`)
- [ ] عندك: DATABASE_URL, AWS Keys, Lightsail IP
- [ ] رفعت الكود لـ GitHub

---

## 1️⃣ رفع الكود لـ GitHub

### على جهازك المحلي:

```bash
# انتقل لمجلد المشروع
cd "C:\Users\Dell\Desktop\Bank Basha"

# تهيئة Git (إذا لم يكن موجود)
git init

# إضافة remote
git remote add origin https://github.com/YOUR_USERNAME/bank-basha.git

# إضافة الملفات
git add .

# Commit
git commit -m "Initial production release"

# Push
git push -u origin main
```

⚠️ **تأكد أن هذه الملفات ليست في الـ repo:**
- `.env`
- `prisma/dev.db`
- `firebase-service-account.json`

---

## 2️⃣ الاتصال بـ Lightsail

### من Windows (PowerShell):

```powershell
# تحميل المفتاح من Lightsail Console:
# Lightsail → Account → SSH keys → Download

# الاتصال:
ssh -i "C:\Users\Dell\Downloads\LightsailDefaultKey.pem" ubuntu@YOUR_LIGHTSAIL_IP
```

### أو من Lightsail Console مباشرة:
```
Lightsail → Click on instance → Connect using SSH
```

---

## 3️⃣ إعداد الخادم (مرة واحدة فقط)

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# تثبيت أدوات إضافية
sudo apt install -y nginx git postgresql-client

# تثبيت PM2
sudo npm install -g pm2

# التحقق
node -v    # يجب: v20.x.x
npm -v     # يجب: 10.x.x
```

---

## 4️⃣ جلب الكود

```bash
# الانتقال للمجلد الرئيسي
cd /home/ubuntu

# Clone المشروع
git clone https://github.com/YOUR_USERNAME/bank-basha.git app

# الدخول للمجلد
cd app
```

---

## 5️⃣ إعداد Environment Variables

```bash
# إنشاء ملف .env
nano .env
```

### الصق المحتوى التالي (عدّل القيم):

```env
# Database
DATABASE_URL="postgresql://bankbasha_admin:YOUR_PASSWORD@bankbasha-db.xxxxx.eu-north-1.rds.amazonaws.com:5432/bankbasha"

# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_APP_NAME="Bank Basha"

# JWT
JWT_SECRET=your-very-long-secret-key-here-make-it-64-chars
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=another-very-long-secret-key-here
REFRESH_TOKEN_EXPIRES_IN=30d

# S3
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=bankbasha-uploads-prod

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**حفظ:** `Ctrl+O` → `Enter` → `Ctrl+X`

---

## 6️⃣ تثبيت وبناء

```bash
# تثبيت Dependencies
npm ci

# Generate Prisma Client
npx prisma generate

# Push Schema لقاعدة البيانات
npx prisma db push

# بناء التطبيق (يأخذ 2-5 دقائق)
npm run build
```

---

## 7️⃣ تشغيل التطبيق

```bash
# تشغيل بـ PM2
pm2 start npm --name "bankbasha" -- start

# حفظ الإعدادات
pm2 save

# تشغيل تلقائي عند إعادة التشغيل
pm2 startup
# ⚠️ سيطبع أمر - انسخه وشغّله!
```

### التحقق:
```bash
pm2 status
# يجب أن يظهر: bankbasha | online

# اختبار محلي
curl http://localhost:3000/api/health
# يجب: {"status":"healthy"...}
```

---

## 8️⃣ إعداد Nginx

```bash
# نسخ الإعدادات
sudo cp scripts/nginx.conf /etc/nginx/sites-available/bankbasha

# تعديل الدومين
sudo nano /etc/nginx/sites-available/bankbasha
# غيّر: server_name yourdomain.com → server_name YOUR_ACTUAL_DOMAIN

# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/bankbasha /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# اختبار الإعدادات
sudo nginx -t

# إعادة تشغيل
sudo systemctl restart nginx
```

---

## 9️⃣ SSL Certificate (HTTPS)

```bash
# تثبيت Certbot
sudo apt install -y certbot python3-certbot-nginx

# الحصول على شهادة
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# اختبار التجديد التلقائي
sudo certbot renew --dry-run
```

---

## 🔟 DNS

### في موقع مزود الدومين (Namecheap, GoDaddy, etc):

```
Type: A
Name: @
Value: YOUR_LIGHTSAIL_IP
TTL: 300

Type: A
Name: www
Value: YOUR_LIGHTSAIL_IP
TTL: 300
```

---

## ✅ اختبار نهائي

```bash
# من المتصفح:
https://yourdomain.com
https://yourdomain.com/login
https://yourdomain.com/api/health
```

---

## 📞 أوامر مفيدة

```bash
# عرض حالة التطبيق
pm2 status

# عرض اللوغات
pm2 logs bankbasha

# عرض آخر 100 سطر
pm2 logs bankbasha --lines 100

# إعادة تشغيل
pm2 restart bankbasha

# إيقاف
pm2 stop bankbasha
```

---

## 🔄 تحديث الكود لاحقاً

```bash
cd /home/ubuntu/app
git pull
npm ci
npm run build
pm2 restart bankbasha
```

---

## 🆘 حل المشاكل

### التطبيق لا يعمل:
```bash
pm2 logs bankbasha --lines 50
```

### خطأ في قاعدة البيانات:
```bash
# اختبار الاتصال
psql "$DATABASE_URL" -c "SELECT 1"
```

### خطأ في Nginx:
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### خطأ في S3:
```bash
# تأكد من المتغيرات
echo $AWS_ACCESS_KEY_ID
echo $AWS_S3_BUCKET
```

---

**🎉 مبروك! التطبيق شغّال!**
