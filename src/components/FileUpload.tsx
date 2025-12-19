'use client';

import { useState, useRef } from 'react';
import { CloudArrowUpIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

interface FileUploadProps {
    label: string;
    accept?: string;
    maxSize?: number; // in MB
    onFileSelect: (file: File | null) => void;
    preview?: string;
    error?: string;
}

export default function FileUpload({
    label,
    accept = 'image/jpeg,image/jpg,image/png,image/webp',
    maxSize = 5,
    onFileSelect,
    preview,
    error,
}: FileUploadProps) {
    const t = useTranslations();
    const [isDragging, setIsDragging] = useState(false);
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleFile = (file: File) => {
        // Validate file size
        if (file.size > maxSize * 1024 * 1024) {
            onFileSelect(null);
            return;
        }

        // Validate file type
        const acceptedTypes = accept.split(',').map(t => t.trim());
        if (!acceptedTypes.includes(file.type)) {
            onFileSelect(null);
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setLocalPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        onFileSelect(file);
    };

    const handleRemove = () => {
        setLocalPreview(null);
        onFileSelect(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const displayPreview = preview || localPreview;

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-300">{label}</label>

            {!displayPreview ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging
                        ? 'border-primary-500 bg-primary-500/10'
                        : error
                            ? 'border-red-500 bg-red-500/5'
                            : 'border-dark-700 hover:border-dark-600 bg-dark-800/50'
                        }`}
                >
                    <CloudArrowUpIcon className={`w-12 h-12 mx-auto mb-3 ${error ? 'text-red-500' : 'text-dark-400'}`} />
                    <p className="text-dark-300 mb-1">{t('common.upload.dragDrop')}</p>
                    <p className="text-dark-500 text-xs">
                        {t('common.upload.formats', { maxSize })}
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={accept}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>
            ) : (
                <div className="relative group">
                    <img
                        src={displayPreview}
                        alt={label}
                        className="w-full h-48 object-cover rounded-xl border-2 border-dark-700"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="btn-ghost btn-icon bg-red-500/20 text-red-500"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                        <CheckCircleIcon className="w-5 h-5" />
                    </div>
                </div>
            )}

            {error && (
                <p className="text-red-500 text-sm">{error}</p>
            )}
        </div>
    );
}
