'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getAvatarColor } from '@/lib/constants';

interface ImageUploadProps {
  participantId: string;
  participantName: string;
  currentUrl: string | null;
  index: number;
  onUpload: (url: string) => void;
}

export function ImageUpload({
  participantId,
  participantName,
  currentUrl,
  index,
  onUpload,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = participantName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const bgColor = getAvatarColor(index);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    setUploading(true);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${participantId}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      onUpload(publicUrl);
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative group">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-transparent hover:border-[var(--primary)] transition-all"
        title="Click to upload photo"
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={participantName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-bold text-white text-lg"
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </div>
        )}
        
        {/* Upload overlay */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <span className="text-white text-xs">⏳</span>
          ) : (
            <span className="text-white text-xs">📷</span>
          )}
        </div>
      </button>
    </div>
  );
}

