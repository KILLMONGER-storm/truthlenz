import { useState, useRef } from 'react';
import { FileText, Link, Image, Video, Upload, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { GlowCard } from '@/components/ui/spotlight-card';
import type { VerificationType, VerificationInput } from '@/types/verification';

interface InputSectionProps {
  onVerify: (input: VerificationInput) => void;
  isLoading: boolean;
}

const inputTypes: { type: VerificationType; icon: typeof FileText; label: string; description: string }[] = [
  { type: 'text', icon: FileText, label: 'Text', description: 'Paste news article or message' },
  { type: 'url', icon: Link, label: 'URL', description: 'Enter news link' },
  { type: 'image', icon: Image, label: 'Image', description: 'Upload image to verify' },
  { type: 'video', icon: Video, label: 'Video', description: 'Upload video to analyze' },
];

export function InputSection({ onVerify, isLoading }: InputSectionProps) {
  const [activeType, setActiveType] = useState<VerificationType>('text');
  const [textContent, setTextContent] = useState('');
  const [urlContent, setUrlContent] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mediaDescription, setMediaDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };
  
  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleSubmit = () => {
    let content = '';
    let file: File | undefined;
    
    switch (activeType) {
      case 'text':
        content = textContent;
        break;
      case 'url':
        content = urlContent;
        break;
      case 'image':
      case 'video':
        content = mediaDescription || `Uploaded ${activeType}: ${uploadedFile?.name}`;
        file = uploadedFile || undefined;
        break;
    }
    
    if (!content.trim() && !file) return;
    
    onVerify({ type: activeType, content, file });
  };
  
  const isValid = () => {
    switch (activeType) {
      case 'text':
        return textContent.trim().length > 0;
      case 'url':
        return urlContent.trim().length > 0;
      case 'image':
      case 'video':
        return uploadedFile !== null;
    }
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Input Type Selector */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {inputTypes.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all duration-200 ${
              activeType === type
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      
      {/* Input Area with GlowCard */}
      <GlowCard 
        customSize 
        glowColor="blue" 
        className="w-full !aspect-auto !grid-rows-1"
      >
        <div className="relative z-10">
          {activeType === 'text' && (
            <Textarea
              placeholder="Paste news article, forwarded message, or any text you want to verify..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="min-h-[180px] resize-none border-0 bg-transparent text-base focus-visible:ring-0 placeholder:text-muted-foreground/60"
            />
          )}
          
          {activeType === 'url' && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  type="url"
                  placeholder="https://example.com/news-article"
                  value={urlContent}
                  onChange={(e) => setUrlContent(e.target.value)}
                  className="border-0 bg-transparent text-base h-12 focus-visible:ring-0 placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
          )}
          
          {(activeType === 'image' || activeType === 'video') && (
            <div className="space-y-4">
              {!uploadedFile ? (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload {activeType}
                  </span>
                  <span className="text-xs text-muted-foreground/60 mt-1">
                    {activeType === 'image' ? 'PNG, JPG, WEBP up to 10MB' : 'MP4, MOV up to 50MB'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={activeType === 'image' ? 'image/*' : 'video/*'}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {activeType === 'image' ? (
                      <Image className="w-8 h-8 text-primary" />
                    ) : (
                      <Video className="w-8 h-8 text-primary" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="p-2 hover:bg-background/50 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <Textarea
                placeholder="Add context or describe the claim associated with this media (optional)..."
                value={mediaDescription}
                onChange={(e) => setMediaDescription(e.target.value)}
                className="min-h-[80px] resize-none border-0 bg-transparent text-base focus-visible:ring-0 placeholder:text-muted-foreground/60"
              />
            </div>
          )}
        </div>
      </GlowCard>
      
      {/* Submit Button */}
      <div className="mt-6 flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={!isValid() || isLoading}
          size="lg"
          className="px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" />
              Verify Content
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
