import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
    hashPassword,
    sanitizePhoneNumber,
    isValidSyrianPhone,
    getSecurityHeaders
} from '@/lib/auth/security';
import { uploadToS3 } from '@/lib/storage/s3';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Zod schema for validation
const registerSchema = z.object({
    fullName: z.string().min(3, 'Full name is required'),
    phone: z.string().min(9, 'Phone number is required'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    dateOfBirth: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        // Extract and validate fields
        const rawData = {
            fullName: formData.get('fullName') as string,
            phone: formData.get('phone') as string,
            email: formData.get('email') as string,
            password: formData.get('password') as string,
            dateOfBirth: formData.get('dateOfBirth') as string,
        };

        const validation = registerSchema.safeParse(rawData);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { fullName, phone, email, password, dateOfBirth } = validation.data;

        // Files
        const idPhoto = formData.get('idPhoto') as File | null;
        const selfie = formData.get('selfie') as File | null;

        // Sanitize and validate phone
        const sanitizedPhone = sanitizePhoneNumber(phone);
        if (!isValidSyrianPhone(sanitizedPhone)) {
            return NextResponse.json(
                { error: 'Invalid Syrian phone number' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Check existing user
        const existingUser = await prisma.user.findUnique({
            where: { phone: sanitizedPhone },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'Phone number already registered' },
                { status: 409, headers: getSecurityHeaders() }
            );
        }

        // Check email if provided
        if (email) {
            const existingEmail = await prisma.user.findUnique({
                where: { email },
            });
            if (existingEmail) {
                return NextResponse.json(
                    { error: 'Email already registered' },
                    { status: 409, headers: getSecurityHeaders() }
                );
            }
        }

        // 1. Generate User ID
        const userId = uuidv4();

        // 2. Hash password
        const passwordHash = await hashPassword(password);

        // 3. Upload files to S3
        let idPhotoUrl = null;
        let selfiePhotoUrl = null;

        if (idPhoto) {
            const uploadResult = await uploadToS3(idPhoto, 'kyc/id', userId);
            if (!uploadResult.success) {
                return NextResponse.json(
                    { error: 'Failed to upload ID photo: ' + uploadResult.error },
                    { status: 500, headers: getSecurityHeaders() }
                );
            }
            idPhotoUrl = uploadResult.url;
        }

        if (selfie) {
            const uploadResult = await uploadToS3(selfie, 'kyc/selfie', userId);
            if (!uploadResult.success) {
                return NextResponse.json(
                    { error: 'Failed to upload selfie: ' + uploadResult.error },
                    { status: 500, headers: getSecurityHeaders() }
                );
            }
            selfiePhotoUrl = uploadResult.url;
        }

        // 4. Create user in DB
        const user = await prisma.$transaction(async (tx) => {
            // Create user
            const newUser = await tx.user.create({
                data: {
                    id: userId, // Use pre-generated ID
                    phone: sanitizedPhone,
                    email: email || null,
                    passwordHash,
                    fullName,
                    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                    userType: 'USER',
                    status: 'PENDING',
                    isActive: false, // User is inactive until admin approval
                    kycStatus: idPhotoUrl && selfiePhotoUrl ? 'PENDING' : 'NOT_SUBMITTED',
                    idPhotoUrl,     // S3 URL
                    selfiePhotoUrl, // S3 URL
                    kycSubmittedAt: idPhotoUrl && selfiePhotoUrl ? new Date() : null,
                },
            });

            // Create wallet (inactive until KYC approval)
            await tx.wallet.create({
                data: {
                    userId: newUser.id,
                    balance: 0,
                    frozenBalance: 0,
                    currency: 'USD',
                    isActive: false,
                },
            });

            return newUser;
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'USER_REGISTERED',
                entity: 'User',
                entityId: user.id,
                ipAddress: request.headers.get('x-forwarded-for') || undefined,
                userAgent: request.headers.get('user-agent') || undefined,
            },
        });

        // Don't create session - user must wait for approval
        return NextResponse.json(
            {
                success: true,
                message: 'Registration successful. Please wait for admin approval.',
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    phone: user.phone,
                    kycStatus: user.kycStatus,
                },
            },
            { status: 201, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
