# ☁️ دليل إعداد AWS - Bank Basha

---

## 📋 قائمة الخدمات المطلوبة

| الخدمة | الوظيفة | التكلفة الشهرية |
|--------|---------|-----------------|
| RDS PostgreSQL | قاعدة البيانات | ~$14 |
| S3 Bucket | تخزين الملفات | ~$3 |
| Lightsail | الخادم | $12 |
| IAM User | صلاحيات S3 | مجاني |
| **الإجمالي** | | **~$29/شهر** |

---

# 1️⃣ إنشاء RDS PostgreSQL

## الخطوة 1.1: الدخول للـ RDS Console

1. افتح: https://console.aws.amazon.com/rds
2. تأكد من اختيار Region قريب (مثل: `eu-north-1` Stockholm)

## الخطوة 1.2: Create Database

1. اضغط **Create database**
2. اختر **Easy create**

## الخطوة 1.3: الإعدادات

| الحقل | القيمة |
|-------|--------|
| Engine type | **PostgreSQL** |
| DB instance size | **Sandbox** (db.t4g.micro) |
| DB instance identifier | `bankbasha-db` |
| Master username | `bankbasha_admin` |
| Credentials management | **Self managed** |
| Auto generate password | ❌ **أزل العلامة** |
| Master password | `اكتب كلمة مرور قوية` |

⚠️ **احفظ كلمة المرور في مكان آمن!**

## الخطوة 1.4: Create

1. اضغط **Create database**
2. انتظر 5-10 دقائق حتى تصبح الحالة **Available**

## الخطوة 1.5: الحصول على Endpoint

1. اضغط على اسم الـ Database
2. في قسم **Connectivity & security**
3. انسخ **Endpoint** (مثال):
   ```
   bankbasha-db.xxxxxx.eu-north-1.rds.amazonaws.com
   ```

## الخطوة 1.6: إعداد Security Group

⚠️ **مهم جداً** - بدون هذا لن تستطيع الاتصال!

1. في صفحة الـ Database، قسم **Connectivity & security**
2. اضغط على **VPC security groups** (الرابط الأزرق)
3. اضغط على Security Group ID
4. اذهب لـ **Inbound rules** → **Edit inbound rules**
5. اضغط **Add rule**:
   ```
   Type: PostgreSQL
   Port: 5432
   Source: Anywhere-IPv4 (0.0.0.0/0)  ← للتجربة فقط!
   ```
6. اضغط **Save rules**

## الخطوة 1.7: إنشاء Database

RDS ينشئ فقط الـ instance، تحتاج إنشاء database:

```bash
# من أي terminal (محلي أو Lightsail)
# ثبت PostgreSQL client أولاً:
# Windows: choco install postgresql
# Mac: brew install postgresql
# Linux: sudo apt install postgresql-client

psql -h bankbasha-db.xxxxxx.eu-north-1.rds.amazonaws.com -U bankbasha_admin -d postgres

# داخل psql:
CREATE DATABASE bankbasha;
\q
```

## ✅ النتيجة النهائية

```env
DATABASE_URL="postgresql://bankbasha_admin:YOUR_PASSWORD@bankbasha-db.xxxxxx.eu-north-1.rds.amazonaws.com:5432/bankbasha"
```

---

# 2️⃣ إنشاء S3 Bucket

## الخطوة 2.1: الدخول للـ S3 Console

1. افتح: https://console.aws.amazon.com/s3
2. اضغط **Create bucket**

## الخطوة 2.2: الإعدادات

| الحقل | القيمة |
|-------|--------|
| Bucket name | `bankbasha-uploads-prod` |
| AWS Region | نفس region الـ RDS |
| Object Ownership | ACLs disabled |
| Block Public Access | ✅ **Block all** |
| Bucket Versioning | Enable |
| Default encryption | SSE-S3 |

## الخطوة 2.3: Create

اضغط **Create bucket**

## الخطوة 2.4: CORS Configuration

1. اضغط على الـ Bucket
2. اذهب لـ **Permissions** tab
3. انزل لـ **Cross-origin resource sharing (CORS)**
4. اضغط **Edit**
5. الصق:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

6. اضغط **Save changes**

---

# 3️⃣ إنشاء IAM User للـ S3

## الخطوة 3.1: الدخول للـ IAM Console

1. افتح: https://console.aws.amazon.com/iam
2. من القائمة الجانبية: **Users**
3. اضغط **Create user**

## الخطوة 3.2: User details

| الحقل | القيمة |
|-------|--------|
| User name | `bankbasha-s3-user` |
| Access to AWS Console | ❌ لا تفعّل |

## الخطوة 3.3: Permissions

1. اختر **Attach policies directly**
2. اضغط **Create policy** (سيفتح tab جديد)

### إنشاء Policy:

1. اختر **JSON** tab
2. الصق:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::bankbasha-uploads-prod",
        "arn:aws:s3:::bankbasha-uploads-prod/*"
      ]
    }
  ]
}
```

3. اضغط **Next**
4. Policy name: `BankBasha-S3-Access`
5. اضغط **Create policy**

### العودة لإنشاء User:

1. ارجع للـ tab السابق
2. اضغط refresh 🔄
3. ابحث عن `BankBasha-S3-Access`
4. ✅ اختره
5. اضغط **Next** → **Create user**

## الخطوة 3.4: إنشاء Access Key

1. اضغط على اسم الـ User
2. اذهب لـ **Security credentials** tab
3. انزل لـ **Access keys**
4. اضغط **Create access key**
5. اختر **Application running outside AWS**
6. اضغط **Next** → **Create access key**

⚠️ **احفظ الآن!**
```
Access key ID: AKIA...
Secret access key: ...
```

**لن تستطيع رؤية Secret مرة أخرى!**

---

# 4️⃣ إنشاء Lightsail Instance

## الخطوة 4.1: الدخول للـ Lightsail Console

1. افتح: https://lightsail.aws.amazon.com
2. اضغط **Create instance**

## الخطوة 4.2: الإعدادات

| الحقل | القيمة |
|-------|--------|
| Instance location | نفس Region |
| Platform | Linux/Unix |
| Blueprint | OS Only → **Ubuntu 22.04 LTS** |
| Instance plan | **$12** (2GB RAM, 60GB SSD) |
| Instance name | `bankbasha-app` |

## الخطوة 4.3: Create

اضغط **Create instance**

## الخطوة 4.4: Static IP

1. اذهب لـ **Networking** tab
2. اضغط **Create static IP**
3. Attach to: `bankbasha-app`
4. Name: `bankbasha-ip`
5. اضغط **Create**

**احفظ الـ IP!** (مثال: `13.48.xxx.xxx`)

## الخطوة 4.5: Firewall

1. اضغط على Instance
2. اذهب لـ **Networking** tab
3. تأكد من وجود:
   - SSH (22) ✅
   - HTTP (80) ✅
   - HTTPS (443) ✅

---

# 5️⃣ ملخص ما تحتاج حفظه

```env
# RDS
DATABASE_URL="postgresql://bankbasha_admin:YOUR_PASSWORD@bankbasha-db.xxxxxx.eu-north-1.rds.amazonaws.com:5432/bankbasha"

# S3
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=bankbasha-uploads-prod

# Lightsail
SERVER_IP=13.48.xxx.xxx
```

---

# 6️⃣ الترقية للإنتاج لاحقاً

## RDS:
```
Database → Modify → DB instance class → اختر أكبر → Apply immediately
```

## Lightsail → ECS:
```
1. بناء Docker image
2. Push لـ ECR
3. إنشاء ECS Cluster
4. نفس DATABASE_URL ونفس S3!
```

---

**✅ انتهى إعداد AWS!**

الخطوة التالية: انتقل لملف `DEPLOYMENT.md` لنشر التطبيق.
