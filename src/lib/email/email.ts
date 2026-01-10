// Email Service for Bank Basha
// Professional email notifications with admin CC

import nodemailer from 'nodemailer';

// Email configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.zoho.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || 'noreply@mail.bankbasha.com';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@mail.bankbasha.com';
const FROM_NAME = process.env.FROM_NAME || 'بنك باشا | Bank Basha';

// Admin emails for CC
const ADMIN_CC_EMAILS = process.env.ADMIN_CC_EMAILS
  ? process.env.ADMIN_CC_EMAILS.split(',').map(email => email.trim())
  : ['bank.basha.25@gmail.com'];

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  bcc?: string | string[];
}

/**
 * Send email with professional template
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Prepare BCC list
    let bccList: string[] = [];

    if (options.bcc) {
      bccList = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
    }

    // Always add admin emails to BCC (hidden copy)
    bccList = [...bccList, ...ADMIN_CC_EMAILS];

    const mailOptions = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to.join(',') : options.to,
      bcc: bccList.length > 0 ? bccList.join(',') : undefined,
      subject: options.subject,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

/**
 * Format amount based on currency
 */
function formatAmount(amount: number, currency: string = 'USD'): string {
  if (currency === 'SYP') {
    return `${Math.floor(amount).toLocaleString('ar-SY')} ل.س`;
  }
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

/**
 * Send transaction receipt email with dual currency support
 */
export async function sendTransactionEmail(params: {
  to: string;
  userName: string;
  transactionType: string;
  amount: number;
  currency?: string;
  referenceNumber: string;
  status: string;
  date: Date;
  recipientName?: string;
  balance?: number;
  balanceSYP?: number;
}) {
  const currency = params.currency || 'USD';
  const typeLabels: Record<string, string> = {
    DEPOSIT: 'إيداع',
    WITHDRAW: 'سحب',
    TRANSFER: 'تحويل',
    QR_PAYMENT: 'دفع QR',
  };

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إشعار معاملة</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F1419; color: #E7E9EA;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F1419; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #D4AF37 0%, #B8960F 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #1F2937; font-size: 28px; font-weight: bold;">بنك باشا</h1>
              <p style="margin: 10px 0 0 0; color: #374151; font-size: 14px;">BANK BASHA</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #D4AF37; font-size: 22px;">مرحباً ${params.userName}</h2>
              <p style="margin: 0 0 30px 0; color: #9CA3AF; font-size: 16px; line-height: 1.6;">
                تم تنفيذ عملية ${typeLabels[params.transactionType] || params.transactionType} بنجاح
              </p>

              <!-- Transaction Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1F2937; border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; border-bottom: 1px solid #374151; padding: 12px 0;">نوع العملية</td>
                        <td style="color: #E7E9EA; font-size: 14px; font-weight: bold; border-bottom: 1px solid #374151; padding: 12px 0; text-align: left;">${typeLabels[params.transactionType]}</td>
                      </tr>
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; border-bottom: 1px solid #374151; padding: 12px 0;">المبلغ</td>
                        <td style="color: ${currency === 'SYP' ? '#3B82F6' : '#10B981'}; font-size: 18px; font-weight: bold; border-bottom: 1px solid #374151; padding: 12px 0; text-align: left;">${formatAmount(params.amount, currency)}</td>
                      </tr>
                      ${params.recipientName ? `
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; border-bottom: 1px solid #374151; padding: 12px 0;">المستلم</td>
                        <td style="color: #E7E9EA; font-size: 14px; border-bottom: 1px solid #374151; padding: 12px 0; text-align: left;">${params.recipientName}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; border-bottom: 1px solid #374151; padding: 12px 0;">رقم المرجع</td>
                        <td style="color: #E7E9EA; font-size: 14px; font-family: monospace; border-bottom: 1px solid #374151; padding: 12px 0; text-align: left;">${params.referenceNumber}</td>
                      </tr>
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; border-bottom: 1px solid #374151; padding: 12px 0;">الحالة</td>
                        <td style="color: #10B981; font-size: 14px; font-weight: bold; border-bottom: 1px solid #374151; padding: 12px 0; text-align: left;">مكتملة ✓</td>
                      </tr>
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; padding: 12px 0;">التاريخ</td>
                        <td style="color: #E7E9EA; font-size: 14px; padding: 12px 0; text-align: left;">${params.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                      ${params.balance !== undefined ? `
                      <tr>
                        <td colspan="2" style="padding-top: 20px; border-top: 2px solid #D4AF37;">
                          <table width="100%">
                            <tr>
                              <td style="color: #9CA3AF; font-size: 14px;">الرصيد الحالي (USD)</td>
                              <td style="color: #10B981; font-size: 20px; font-weight: bold; text-align: left;">${formatAmount(params.balance, 'USD')}</td>
                            </tr>
                            ${params.balanceSYP !== undefined ? `
                            <tr>
                              <td style="color: #9CA3AF; font-size: 14px;">الرصيد الحالي (SYP)</td>
                              <td style="color: #3B82F6; font-size: 18px; font-weight: bold; text-align: left;">${formatAmount(params.balanceSYP, 'SYP')}</td>
                            </tr>
                            ` : ''}
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button
                <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://bankbasha.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8960F 100%); color: #1F2937; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0;">عرض المحفظة</a>
                  </td>
                </tr>
              </table> -->
            

              <!-- Security Notice -->
              <div style="background-color: #7C3AED15; border-right: 4px solid #7C3AED; padding: 15px; border-radius: 8px; margin-top: 30px;">
                <p style="margin: 0; color: #9CA3AF; font-size: 13px; line-height: 1.6;">
                  <strong style="color: #E7E9EA;">🔒 ملاحظة أمنية:</strong> إذا لم تقم بهذه العملية، يرجى التواصل معنا فوراً على support@bankbasha.com
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1F2937; padding: 30px; text-align: center; border-top: 1px solid #374151;">
              <p style="margin: 0 0 10px 0; color: #9CA3AF; font-size: 14px;">بنك باشا - السويداء، سوريا</p>
              <p style="margin: 0 0 15px 0; color: #6B7280; font-size: 12px;">support@bankbasha.com | +963 16 XXX XXXX</p>
              <p style="margin: 0; color: #6B7280; font-size: 11px;">© 2025 Bank Basha. جميع الحقوق محفوظة.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: params.to,
    subject: `بنك باشا - ${typeLabels[params.transactionType]} بمبلغ ${formatAmount(params.amount, currency)}`,
    html,
  });
}

/**
 * Send KYC approval/rejection email
 */
export async function sendKYCStatusEmail(params: {
  to: string;
  userName: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}) {
  const isApproved = params.status === 'approved';

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F1419;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F1419; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, ${isApproved ? '#10B981' : '#EF4444'} 0%, ${isApproved ? '#059669' : '#DC2626'} 100%); padding: 40px; text-align: center;">
              <div style="font-size: 60px; margin-bottom: 10px;">${isApproved ? '✓' : '✗'}</div>
              <h1 style="margin: 0; color: white; font-size: 26px;">${isApproved ? 'تم الموافقة على حسابك!' : 'تم رفض طلبك'}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #D4AF37;">مرحباً ${params.userName}</h2>
              ${isApproved ? `
                <p style="color: #9CA3AF; font-size: 16px; line-height: 1.8;">
                  نهنئك! تم الموافقة على طلب التحقق من الهوية (KYC) الخاص بك. يمكنك الآن تسجيل الدخول واستخدام جميع خدمات بنك باشا.
                </p>
                <!--<table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                  <tr>
                    <td align="center">
                      <a href="https://bankbasha.com/login" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8960F 100%); color: #1F2937; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-weight: bold; font-size: 18px;">تسجيل الدخول الآن</a>
                    </td>
                  </tr>
                </table> -->
              ` : `
                <p style="color: #9CA3AF; font-size: 16px; line-height: 1.8;">
                  للأسف، لم نتمكن من الموافقة على طلبك في الوقت الحالي.
                </p>
                ${params.rejectionReason ? `
                  <div style="background-color: #EF444420; border-right: 4px solid #EF4444; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #E7E9EA; font-size: 14px;"><strong>السبب:</strong> ${params.rejectionReason}</p>
                  </div>
                ` : ''}
                <p style="color: #9CA3AF; font-size: 14px;">
                  يمكنك التواصل معنا على support@bankbasha.com لمزيد من المعلومات.
                </p>
              `}
            </td>
          </tr>
          <tr>
            <td style="background-color: #1F2937; padding: 30px; text-align: center;">
              <p style="margin: 0; color: #6B7280; font-size: 12px;">© 2025 بنك باشا. جميع الحقوق محفوظة.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: params.to,
    subject: `بنك باشا - ${isApproved ? 'تم الموافقة على حسابك ✓' : 'تحديث حول طلبك'}`,
    html,
  });
}

/**
 * Send password reset link email (when admin approves password reset request)
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  userName: string;
  resetToken: string;
  expiresInMinutes?: number;
}) {
  const expiresIn = params.expiresInMinutes || 60;
  const resetLink = `https://bankbasha.com/reset-password?token=${params.resetToken}`;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إعادة تعيين كلمة المرور</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F1419; color: #E7E9EA;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F1419; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); padding: 30px; text-align: center;">
              <div style="font-size: 50px; margin-bottom: 10px;">🔐</div>
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">إعادة تعيين كلمة المرور</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #D4AF37; font-size: 22px;">مرحباً ${params.userName}</h2>
              <p style="margin: 0 0 20px 0; color: #9CA3AF; font-size: 16px; line-height: 1.6;">
                تم الموافقة على طلب إعادة تعيين كلمة المرور الخاص بك. اضغط على الزر أدناه لإنشاء كلمة مرور جديدة.
              </p>

              <!-- Warning Box -->
              <div style="background-color: #F59E0B20; border-right: 4px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #F59E0B; font-size: 14px; line-height: 1.6;">
                  ⚠️ هذا الرابط صالح لمدة <strong>${expiresIn} دقيقة</strong> فقط ويمكن استخدامه مرة واحدة.
                </p>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); color: white; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-weight: bold; font-size: 18px;">
                      إعادة تعيين كلمة المرور
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link Display -->
              <div style="background-color: #1F2937; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #9CA3AF; font-size: 12px;">إذا لم يعمل الزر، انسخ الرابط التالي:</p>
                <p style="margin: 0; color: #D4AF37; font-size: 12px; word-break: break-all; font-family: monospace;">${resetLink}</p>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #EF444420; border-right: 4px solid #EF4444; padding: 15px; border-radius: 8px; margin-top: 30px;">
                <p style="margin: 0; color: #9CA3AF; font-size: 13px; line-height: 1.6;">
                  <strong style="color: #EF4444;">🔒 تنبيه أمني:</strong> إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد والتواصل معنا فوراً.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1F2937; padding: 30px; text-align: center; border-top: 1px solid #374151;">
              <p style="margin: 0 0 10px 0; color: #9CA3AF; font-size: 14px;">بنك باشا - السويداء، سوريا</p>
              <p style="margin: 0; color: #6B7280; font-size: 11px;">© 2025 Bank Basha. جميع الحقوق محفوظة.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: params.to,
    subject: 'بنك باشا - إعادة تعيين كلمة المرور 🔐',
    html,
  });
}

/**
 * Send agent transaction notification email (for both agent and user)
 */
export async function sendAgentTransactionEmail(params: {
  // Agent info
  agentEmail?: string;
  agentName: string;

  // User info  
  userEmail?: string;
  userName: string;
  userPhone: string;

  // Transaction info
  transactionType: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  currency?: string;
  referenceNumber: string;
  fee?: number;
  netAmount?: number;
  date: Date;

  // Balances after transaction
  userBalance?: number;
  agentCredit?: number;
  agentCash?: number;
}) {
  const currency = params.currency || 'USD';
  const isDeposit = params.transactionType === 'DEPOSIT';
  const typeLabel = isDeposit ? 'إيداع' : 'سحب';
  const typeColor = isDeposit ? '#10B981' : '#F59E0B';
  const typeIcon = isDeposit ? '💰' : '💸';

  // Common email template
  const createEmailHtml = (isForAgent: boolean) => `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إشعار عملية ${isForAgent ? 'وكيل' : ''}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F1419; color: #E7E9EA;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F1419; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${typeColor} 0%, ${isDeposit ? '#059669' : '#D97706'} 100%); padding: 30px; text-align: center;">
              <div style="font-size: 50px; margin-bottom: 10px;">${typeIcon}</div>
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">عملية ${typeLabel} ${isForAgent ? '(وكيل)' : ''}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #D4AF37; font-size: 22px;">
                مرحباً ${isForAgent ? params.agentName : params.userName}
              </h2>
              <p style="margin: 0 0 20px 0; color: #9CA3AF; font-size: 16px; line-height: 1.6;">
                ${isForAgent
      ? `تم تنفيذ عملية ${typeLabel} للعميل <strong style="color: #E7E9EA;">${params.userName}</strong> (${params.userPhone})`
      : `تم تنفيذ عملية ${typeLabel} لحسابك من خلال الوكيل <strong style="color: #E7E9EA;">${params.agentName}</strong>`
    }
              </p>

              <!-- Transaction Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1F2937; border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; border-bottom: 1px solid #374151; padding: 12px 0;">نوع العملية</td>
                        <td style="color: ${typeColor}; font-size: 14px; font-weight: bold; border-bottom: 1px solid #374151; padding: 12px 0; text-align: left;">${typeLabel} ${typeIcon}</td>
                      </tr>
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; border-bottom: 1px solid #374151; padding: 12px 0;">المبلغ</td>
                        <td style="color: ${currency === 'SYP' ? '#3B82F6' : '#10B981'}; font-size: 18px; font-weight: bold; border-bottom: 1px solid #374151; padding: 12px 0; text-align: left;">${formatAmount(params.amount, currency)}</td>
                      </tr>
                      ${params.fee ? `
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; border-bottom: 1px solid #374151; padding: 12px 0;">الرسوم</td>
                        <td style="color: #F59E0B; font-size: 14px; border-bottom: 1px solid #374151; padding: 12px 0; text-align: left;">${formatAmount(params.fee, currency)}</td>
                      </tr>
                      ` : ''}
                      ${params.netAmount ? `
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; border-bottom: 1px solid #374151; padding: 12px 0;">المبلغ الصافي</td>
                        <td style="color: #E7E9EA; font-size: 16px; font-weight: bold; border-bottom: 1px solid #374151; padding: 12px 0; text-align: left;">${formatAmount(params.netAmount, currency)}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; border-bottom: 1px solid #374151; padding: 12px 0;">رقم المرجع</td>
                        <td style="color: #E7E9EA; font-size: 14px; font-family: monospace; border-bottom: 1px solid #374151; padding: 12px 0; text-align: left;">${params.referenceNumber}</td>
                      </tr>
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; border-bottom: 1px solid #374151; padding: 12px 0;">التاريخ</td>
                        <td style="color: #E7E9EA; font-size: 14px; padding: 12px 0; text-align: left;">${params.date.toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                      ${!isForAgent ? `
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; padding: 12px 0;">الوكيل</td>
                        <td style="color: #E7E9EA; font-size: 14px; padding: 12px 0; text-align: left;">${params.agentName}</td>
                      </tr>
                      ` : `
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; padding: 12px 0;">العميل</td>
                        <td style="color: #E7E9EA; font-size: 14px; padding: 12px 0; text-align: left;">${params.userName} (${params.userPhone})</td>
                      </tr>
                      `}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Balances Box -->
              ${(isForAgent && (params.agentCredit !== undefined || params.agentCash !== undefined)) || (!isForAgent && params.userBalance !== undefined) ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #D4AF3720 0%, #B8960F10 100%); border-radius: 12px; border: 1px solid #D4AF37;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px 0; color: #D4AF37; font-weight: bold;">الأرصدة بعد العملية:</p>
                    <table width="100%">
                      ${isForAgent && params.agentCredit !== undefined ? `
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; padding: 5px 0;">الرصيد الرقمي</td>
                        <td style="color: #10B981; font-size: 16px; font-weight: bold; text-align: left;">${formatAmount(params.agentCredit, currency)}</td>
                      </tr>
                      ` : ''}
                      ${isForAgent && params.agentCash !== undefined ? `
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; padding: 5px 0;">النقد المحصل</td>
                        <td style="color: #F59E0B; font-size: 16px; font-weight: bold; text-align: left;">${formatAmount(params.agentCash, currency)}</td>
                      </tr>
                      ` : ''}
                      ${!isForAgent && params.userBalance !== undefined ? `
                      <tr>
                        <td style="color: #9CA3AF; font-size: 14px; padding: 5px 0;">رصيد المحفظة</td>
                        <td style="color: #D4AF37; font-size: 20px; font-weight: bold; text-align: left;">${formatAmount(params.userBalance, currency)}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- CTA Button   <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://bankbasha.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8960F 100%); color: #1F2937; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      ${isForAgent ? 'عرض لوحة التحكم' : 'عرض المحفظة'}
                    </a>
                  </td>
                </tr>
              </table> -->
            
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1F2937; padding: 30px; text-align: center; border-top: 1px solid #374151;">
              <p style="margin: 0 0 10px 0; color: #9CA3AF; font-size: 14px;">بنك باشا - السويداء، سوريا</p>
              <p style="margin: 0; color: #6B7280; font-size: 11px;">© 2025 Bank Basha. جميع الحقوق محفوظة.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // Send email to user if email exists
  if (params.userEmail) {
    await sendEmail({
      to: params.userEmail,
      subject: `بنك باشا - ${typeLabel} بمبلغ ${formatAmount(params.amount, currency)} عبر الوكيل`,
      html: createEmailHtml(false),
    });
  }

  // Send email to agent if email exists
  if (params.agentEmail) {
    await sendEmail({
      to: params.agentEmail,
      subject: `بنك باشا - ${typeLabel} للعميل ${params.userName} بمبلغ ${formatAmount(params.amount, currency)}`,
      html: createEmailHtml(true),
    });
  }
}

