import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Sparkles, X, Loader2, Plus } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [customerImage, setCustomerImage] = useState<{ file: File; preview: string } | null>(null);
  const [referenceImages, setReferenceImages] = useState<{ file: File; preview: string }[]>([]);
  const [designPrompt, setDesignPrompt] = useState('');
  const [contextText, setContextText] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  const handleCustomerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomerImage({
        file,
        preview: URL.createObjectURL(file)
      });
    }
  };

  const handleReferenceImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files).map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setReferenceImages(prev => [...prev, ...newImages]);
    }
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const generateDesign = async () => {
    if (!customerImage) {
      setError('Please upload a customer image first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const customerBase64 = await fileToBase64(customerImage.file);
      
      const parts: any[] = [
        {
          inlineData: {
            data: customerBase64,
            mimeType: customerImage.file.type,
          },
        },
        {
          text: `You are an expert fashion designer and image editor. 
The FIRST image provided is the customer. You must edit this customer's clothing.
The subsequent images (if any) are reference materials for the fabric or style.

Design Prompt: ${designPrompt}
Context/Material: ${contextText}

Instructions:
1. Change the clothing of the person in the FIRST image to match the design prompt and context.
2. Use the reference images to guide the texture, pattern, and style of the new clothing.
3. Ensure the new clothing fits the customer naturally and looks highly realistic.
4. Keep the person's face, body, and the background exactly the same.`,
        },
      ];

      for (const ref of referenceImages) {
        const refBase64 = await fileToBase64(ref.file);
        parts.push({
          inlineData: {
            data: refBase64,
            mimeType: ref.file.type,
          },
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          setGeneratedImage(imageUrl);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error('No image generated. Please try again with a different prompt.');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the image.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f5] font-sans selection:bg-[#c2a370] selection:text-black">
      <header className="border-b border-white/10 py-8 px-8 md:px-12 flex flex-col items-center justify-center">
        <h1 className="font-serif text-5xl md:text-6xl tracking-wide font-light">MAANAV</h1>
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 mt-2">The Man Studio</p>
      </header>

      <main className={`mx-auto px-6 py-12 transition-all duration-700 ease-in-out ${isGenerating || generatedImage ? 'max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-12' : 'max-w-2xl'}`}>
        {/* Left Column - Inputs */}
        <div className={`${isGenerating || generatedImage ? 'lg:col-span-5' : ''} space-y-10`}>
          
          {/* Customer Image */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-white/60 mb-4 font-medium">01. Customer Profile</h2>
            <div 
              onClick={() => customerInputRef.current?.click()}
              className={`relative border border-white/20 border-dashed rounded-xl overflow-hidden cursor-pointer hover:border-[#c2a370] transition-colors aspect-[3/4] max-w-sm flex flex-col items-center justify-center bg-white/5 group ${customerImage ? 'border-none' : ''}`}
            >
              {customerImage ? (
                <>
                  <img src={customerImage.preview} alt="Customer" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-sm tracking-widest uppercase">Change Image</p>
                  </div>
                </>
              ) : (
                <div className="text-center p-6">
                  <Upload className="w-8 h-8 mx-auto mb-3 text-white/40 group-hover:text-[#c2a370] transition-colors" />
                  <p className="text-sm text-white/60">Upload Customer Photo</p>
                  <p className="text-xs text-white/40 mt-1">Full body or half body shot</p>
                </div>
              )}
              <input type="file" ref={customerInputRef} onChange={handleCustomerImageUpload} accept="image/*" className="hidden" />
            </div>
          </section>

          {/* Design Details */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-white/60 mb-4 font-medium">02. Design Specifications</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-white/80 mb-2">Design Prompt</label>
                <textarea 
                  value={designPrompt}
                  onChange={e => setDesignPrompt(e.target.value)}
                  placeholder="e.g. A bespoke double-breasted suit with peak lapels..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-sm focus:outline-none focus:border-[#c2a370] transition-colors min-h-[100px] resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-2">Material / Context</label>
                <textarea 
                  value={contextText}
                  onChange={e => setContextText(e.target.value)}
                  placeholder="e.g. Navy blue worsted wool with a subtle pinstripe..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-sm focus:outline-none focus:border-[#c2a370] transition-colors min-h-[100px] resize-none"
                />
              </div>
            </div>
          </section>

          {/* Reference Images */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-widest text-white/60 font-medium">03. Reference Materials</h2>
              <button 
                onClick={() => referenceInputRef.current?.click()}
                className="text-xs text-[#c2a370] hover:text-white transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Image
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {referenceImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                  <img src={img.preview} alt={`Reference ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => removeReferenceImage(idx)}
                    className="absolute top-1 right-1 bg-black/60 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {referenceImages.length === 0 && (
                <div 
                  onClick={() => referenceInputRef.current?.click()}
                  className="aspect-square rounded-lg border border-white/10 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-[#c2a370] transition-colors bg-white/5 col-span-3 py-8"
                >
                  <ImageIcon className="w-6 h-6 text-white/40 mb-2" />
                  <p className="text-xs text-white/50">Upload fabric or style references</p>
                </div>
              )}
            </div>
            <input type="file" ref={referenceInputRef} onChange={handleReferenceImagesUpload} accept="image/*" multiple className="hidden" />
          </section>

          <button 
            onClick={generateDesign}
            disabled={isGenerating || !customerImage}
            className="w-full bg-[#c2a370] hover:bg-[#d4b581] text-black font-medium py-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Crafting Design...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Fitting
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Right Column - Output */}
        {(isGenerating || generatedImage) && (
          <div className="lg:col-span-7">
            <div className="sticky top-12">
              <h2 className="text-xs uppercase tracking-widest text-white/60 mb-4 font-medium">04. Studio Fitting</h2>
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden min-h-[600px] flex items-center justify-center relative">
                {isGenerating ? (
                  <div className="flex flex-col items-center text-center p-8">
                    <div className="w-16 h-16 border-4 border-[#c2a370]/20 border-t-[#c2a370] rounded-full animate-spin mb-6"></div>
                    <p className="font-serif text-2xl text-white/80 italic">Tailoring your vision...</p>
                    <p className="text-sm text-white/40 mt-2 max-w-xs">Our AI artisans are carefully applying the selected fabrics and styles to the customer's profile.</p>
                  </div>
                ) : (
                  <img src={generatedImage!} alt="Generated Fitting" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                )}
              </div>
              
              {generatedImage && (
                <div className="mt-6 flex justify-end">
                  <a 
                    href={generatedImage} 
                    download="maanav-fitting.png"
                    className="text-xs uppercase tracking-widest border border-white/20 px-6 py-3 rounded-full hover:bg-white hover:text-black transition-colors"
                  >
                    Download Fitting
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
