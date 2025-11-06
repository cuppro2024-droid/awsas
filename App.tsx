import React, { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultGrid } from './components/ResultGrid';
import { generateImageVariation, generateProductPoseImage, generateProductPosePrompts, generateBaseMockup, applyDesignToMockup } from './services/geminiService';
import { POSES, BACKGROUND_OPTIONS, MOCKUP_TEMPLATES, SCENE_PRESETS, PLACEMENT_OPTIONS, DESIGN_SIZE_OPTIONS, LIGHTING_OPTIONS, CUSTOM_OPTION_VALUE } from './constants';
import type { GeneratedImage, ModelImage } from './types';

// --- Helper Components ---

const BackgroundRain: React.FC = () => {
    const renderRain = () => Array.from({ length: 60 }).map((_, i) => {
        const style = {
            left: `${Math.random() * 100}%`, '--tw-translate-x': `${Math.random() * -100}px`,
            animationDelay: `${Math.random() * 2}s`, animationDuration: `${Math.random() * 0.5 + 0.5}s`,
        };
        return <div key={i} className="rain" style={style} />;
    });

    return (
        <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden">
            {renderRain()}
        </div>
    );
};

const ImageModal: React.FC<{ image: GeneratedImage; onClose: () => void; }> = ({ image, onClose }) => {
  if (!image.src || image.src === 'error') return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in-backdrop" onClick={onClose}>
      <div className="relative zoom-in" onClick={e => e.stopPropagation()}>
        <img src={image.src} alt={image.label} className="max-w-[90vw] max-h-[80vh] rounded-lg shadow-2xl object-contain" />
        <p className="text-white text-center mt-3 font-bold text-lg drop-shadow-md">{image.label}</p>
        <button onClick={onClose} className="absolute -top-3 -right-3 w-10 h-10 flex items-center justify-center bg-white/30 text-white rounded-full backdrop-blur-md hover:bg-white/50 transition-colors" aria-label="Close image preview">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};

const NavButton: React.FC<{ text: string; active: boolean; onClick: () => void }> = ({ text, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-6 py-2 rounded-full text-lg font-semibold transition-all duration-300 ${
      active
        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/40'
        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
    }`}
  >
    {text}
  </button>
);


// --- Main App Component ---

const App: React.FC = () => {
  const [mode, setMode] = useState<'portrait' | 'product' | 'mockup'>('portrait');
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [rainEnabled, setRainEnabled] = useState<boolean>(true);

  // --- Shared Settings ---
  const [backgroundSelection, setBackgroundSelection] = useState<string>('Putih Polos');
  const [customBackground, setCustomBackground] = useState<string>('');
  
  // --- Portrait Mode State ---
  const [modelImage, setModelImage] = useState<ModelImage | null>(null);
  const [stylePrompt, setStylePrompt] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // --- Product Mode State ---
  const [faceImage, setFaceImage] = useState<ModelImage | null>(null);
  const [productImage, setProductImage] = useState<ModelImage | null>(null);
  const [productContext, setProductContext] = useState<string>('');
  const [productGeneratedImages, setProductGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGeneratingProduct, setIsGeneratingProduct] = useState<boolean>(false);
  
  // --- Product Mockup State ---
  const [mockupStage, setMockupStage] = useState<'generateBase' | 'applyDesign'>('generateBase');
  const [mockupBaseMode, setMockupBaseMode] = useState<'generate' | 'upload'>('generate');
  const [baseMockupImage, setBaseMockupImage] = useState<ModelImage | null>(null);
  const [designImage, setDesignImage] = useState<ModelImage | null>(null);
  const [removeDesignBackground, setRemoveDesignBackground] = useState<boolean>(true);
  const [mockupTemplate, setMockupTemplate] = useState<string>(MOCKUP_TEMPLATES[0]);
  const [customMockupTemplate, setCustomMockupTemplate] = useState<string>('');
  const [scenePreset, setScenePreset] = useState<string>(SCENE_PRESETS[0]);
  const [customScenePreset, setCustomScenePreset] = useState<string>('');
  const [productColor, setProductColor] = useState<string>('Hitam');
  const [designPlacement, setDesignPlacement] = useState<string>(PLACEMENT_OPTIONS[0]);
  const [customDesignPlacement, setCustomDesignPlacement] = useState<string>('');
  const [designSize, setDesignSize] = useState<string>(DESIGN_SIZE_OPTIONS[1]);
  const [customDesignSize, setCustomDesignSize] = useState<string>('');
  const [lightingStyle, setLightingStyle] = useState<string>(LIGHTING_OPTIONS[0]);
  const [customLightingStyle, setCustomLightingStyle] = useState<string>('');
  const [mockupGeneratedImages, setMockupGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGeneratingMockup, setIsGeneratingMockup] = useState<boolean>(false);

  const downloadImage = useCallback((src: string, filename: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);
  
  const downloadAll = useCallback((images: GeneratedImage[]) => {
    const successfulImages = images.filter(img => img.src && img.src !== 'error');
    successfulImages.forEach((image, index) => {
      setTimeout(() => {
        downloadImage(image.src!, `${image.label.toLowerCase().replace(/\s+/g, '-')}.png`);
      }, index * 250);
    });
  }, [downloadImage]);

  const handleFileUpload = useCallback((file: File, callback: (image: ModelImage) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        const base64String = result.split(',')[1];
        if (base64String) {
          callback({ data: base64String, mimeType: file.type });
          setError(null);
        } else {
          setError("Tidak dapat memproses file gambar yang diunggah.");
        }
      } else {
        setError("Tidak dapat membaca file gambar yang diunggah.");
      }
    };
    reader.onerror = () => {
      setError("Terjadi kesalahan saat membaca file gambar yang diunggah.");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!modelImage) {
      setError('Silakan unggah gambar model terlebih dahulu.');
      return;
    }

    const finalBackground = backgroundSelection === 'custom' ? customBackground : backgroundSelection;
    if (backgroundSelection === 'custom' && !finalBackground) {
        setError('Harap masukkan deskripsi latar belakang kustom.');
        return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImages(POSES.map(pose => ({ src: null, label: pose.label, loading: true })));

    for (const pose of POSES) {
      try {
        const result = await generateImageVariation(modelImage, pose.prompt, stylePrompt, finalBackground);
        setGeneratedImages(prev => prev.map(img => img.label === pose.label ? { ...img, src: `data:image/png;base64,${result}`, loading: false } : img));
      } catch (err) {
        console.error(`Gagal membuat gambar untuk pose: ${pose.label}`, err);
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat gambar.');
        setGeneratedImages(prev => prev.map(img => img.label === pose.label ? { ...img, src: 'error', loading: false } : img));
      }
    }
    setIsGenerating(false);
  }, [modelImage, stylePrompt, backgroundSelection, customBackground]);
  
  const handleGenerateProductPose = useCallback(async () => {
    if (!faceImage || !productImage) {
      setError('Silakan unggah gambar wajah dan produk.');
      return;
    }

    const finalBackground = backgroundSelection === 'custom' ? customBackground : backgroundSelection;
    if (backgroundSelection === 'custom' && !finalBackground) {
        setError('Harap masukkan deskripsi latar belakang kustom.');
        return;
    }

    setIsGeneratingProduct(true);
    setError(null);
    setProductGeneratedImages(Array.from({ length: 9 }, (_, i) => ({ src: null, label: `Pose ${i + 1}`, loading: true })));

    try {
      // Step 1: Generate 9 pose prompts based on the product
      const { poses: posePrompts } = await generateProductPosePrompts(productImage, productContext);
      if (!posePrompts || posePrompts.length < 9) {
          throw new Error('AI tidak dapat menghasilkan set pose yang diharapkan.');
      }
      // Update state with proper labels from AI
      setProductGeneratedImages(posePrompts.slice(0, 9).map(prompt => ({ src: null, label: prompt, loading: true })));

      // Step 2: Generate an image for each prompt
      for (const prompt of posePrompts.slice(0, 9)) {
          try {
              const result = await generateProductPoseImage(faceImage, productImage, prompt, finalBackground);
              setProductGeneratedImages(prev => prev.map(img => 
                  img.label === prompt ? { ...img, src: `data:image/png;base64,${result}`, loading: false } : img
              ));
          } catch (err) {
              console.error(`Gagal membuat gambar untuk pose produk: ${prompt}`, err);
              setProductGeneratedImages(prev => prev.map(img => 
                  img.label === prompt ? { ...img, src: 'error', loading: false } : img
              ));
          }
      }
    } catch(err) {
        console.error('Gagal menghasilkan pose produk', err);
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui.';
        setError(`Pembuatan gagal: ${errorMessage}`);
        setProductGeneratedImages([]); // Clear results on major failure
    } finally {
        setIsGeneratingProduct(false);
    }
  }, [faceImage, productImage, productContext, backgroundSelection, customBackground]);

  // --- MOCKUP WORKFLOW: STEP 1 ---
  const handleGenerateBase = useCallback(async () => {
    setIsGeneratingMockup(true);
    setError(null);
    setMockupGeneratedImages([]);
    setBaseMockupImage(null);

    const finalTemplate = mockupTemplate === CUSTOM_OPTION_VALUE ? customMockupTemplate : mockupTemplate;
    const finalScene = scenePreset === CUSTOM_OPTION_VALUE ? customScenePreset : scenePreset;
    const finalLighting = lightingStyle === CUSTOM_OPTION_VALUE ? customLightingStyle : lightingStyle;
    
    if ((mockupTemplate === CUSTOM_OPTION_VALUE && !finalTemplate) || (scenePreset === CUSTOM_OPTION_VALUE && !finalScene) || (lightingStyle === CUSTOM_OPTION_VALUE && !finalLighting)) {
        setError('Harap isi semua kolom input kustom yang telah Anda pilih.');
        setIsGeneratingMockup(false);
        return;
    }
    
    const prompt = `Buat gambar mockup produk **kosong** yang sangat fotorealistik.
    - Jenis Produk: ${finalTemplate}
    - Warna Produk: ${productColor}
    - Pemandangan/Latar Belakang: ${finalScene}
    - Pencahayaan: ${finalLighting}
    Hasilnya harus bersih, profesional, dan siap untuk ditempeli desain. Jangan tambahkan logo atau teks apa pun.`;

    try {
      const result = await generateBaseMockup(prompt);
      setBaseMockupImage({ data: result, mimeType: 'image/png' });
      setMockupStage('applyDesign');
    } catch(err) {
        console.error('Gagal menghasilkan template mockup dasar', err);
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui.';
        setError(`Pembuatan template gagal: ${errorMessage}`);
    } finally {
        setIsGeneratingMockup(false);
    }
  }, [mockupTemplate, customMockupTemplate, scenePreset, customScenePreset, productColor, lightingStyle, customLightingStyle]);

  // --- MOCKUP WORKFLOW: STEP 2 ---
  const handleApplyDesign = useCallback(async () => {
    if (!designImage) {
      setError('Silakan unggah gambar desain Anda terlebih dahulu.');
      return;
    }
    if (!baseMockupImage) {
        setError('Template mockup dasar tidak ditemukan. Harap hasilkan atau unggah template terlebih dahulu.');
        return;
    }
    
    setIsGeneratingMockup(true);
    setError(null);
    setMockupGeneratedImages([{ src: null, label: 'Product Mockup', loading: true }]);

    const finalSize = designSize === CUSTOM_OPTION_VALUE ? customDesignSize : designSize;
    const finalPlacement = designPlacement === CUSTOM_OPTION_VALUE ? customDesignPlacement : designPlacement;
    const finalTemplateName = mockupTemplate === CUSTOM_OPTION_VALUE ? customMockupTemplate : mockupTemplate;

    if ((designSize === CUSTOM_OPTION_VALUE && !finalSize) || (designPlacement === CUSTOM_OPTION_VALUE && !finalPlacement)) {
        setError('Harap isi semua kolom input kustom yang telah Anda pilih.');
        setIsGeneratingMockup(false);
        return;
    }

    const designInstruction = `Gunakan gambar desain kedua untuk ditempelkan pada produk dalam gambar template pertama.
    ${removeDesignBackground ? 'Abaikan latar belakang putih atau polos pada gambar desain; buat transparan dan padukan desain dengan mulus ke dalam tekstur, lipatan, kontur, dan pencahayaan produk.' : ''}
    - Ukuran Desain: ${finalSize}
    - Penempatan Desain: ${finalPlacement}
    Hasil akhir harus terlihat seperti cetakan yang realistis dan profesional pada produk.`;

    try {
      const result = await applyDesignToMockup(baseMockupImage, designImage, designInstruction);
      setMockupGeneratedImages([{ src: `data:image/png;base64,${result}`, label: `${finalTemplateName} Mockup`, loading: false }]);
    } catch(err) {
        console.error('Gagal menerapkan desain ke mockup', err);
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui.';
        setError(`Penerapan desain gagal: ${errorMessage}`);
        setMockupGeneratedImages([{ src: 'error', label: 'Gagal Membuat', loading: false }]);
    } finally {
        setIsGeneratingMockup(false);
    }
  }, [
    baseMockupImage, designImage, mockupTemplate, customMockupTemplate,
    designPlacement, customDesignPlacement, designSize, customDesignSize, removeDesignBackground
  ]);
  
  const hasSuccessfulImages = generatedImages.some(img => img.src && img.src !== 'error');
  const hasSuccessfulProductImages = productGeneratedImages.some(img => img.src && img.src !== 'error');
  const hasSuccessfulMockupImages = mockupGeneratedImages.some(img => img.src && img.src !== 'error');


  return (
    <div className="relative min-h-screen isolate">
      {rainEnabled && <BackgroundRain />}
      
      <button
        onClick={() => setRainEnabled(!rainEnabled)}
        className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-slate-800/60 text-slate-300 backdrop-blur-md hover:bg-slate-700 hover:text-white transition-all"
        aria-label={rainEnabled ? 'Matikan animasi hujan' : 'Nyalakan animasi hujan'}
        title={rainEnabled ? 'Matikan animasi hujan' : 'Nyalakan animasi hujan'}
      >
        {rainEnabled ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 19v1"/><path d="M8 14v1"/><path d="M12 19v1"/><path d="M12 15v1"/><path d="M16 19v1"/><path d="M16 14v1"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3"/><line x1="1" x2="23" y1="1" y2="23"/></svg>
        )}
      </button>

      {selectedImage && <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} />}
      
      <div className="page-watermark" style={{ left: '1.25rem', transform: 'translateY(-50%)' }}>Created by Sanz</div>
      <div className="page-watermark" style={{ right: '1.25rem', transform: 'translateY(-50%) rotate(180deg)' }}>Created by Sanz</div>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8 font-sans">
        
        <header className="text-center my-10 fade-in-blur relative" style={{ animationDelay: '100ms' }}>
            <h1 className="text-4xl sm:text-6xl font-extrabold bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent pb-2 drop-shadow-sm">AI Pose Generator</h1>
            <p className="text-slate-300 mt-2 text-lg transition-colors">Pilih mode, unggah foto, dan biarkan AI menciptakan pose baru.</p>
        </header>

        <nav className="flex justify-center flex-wrap gap-4 mb-10 fade-in-blur" style={{ animationDelay: '200ms' }}>
          <NavButton text="Portrait Pose" active={mode === 'portrait'} onClick={() => setMode('portrait')} />
          <NavButton text="Product Pose" active={mode === 'product'} onClick={() => setMode('product')} />
          <NavButton text="Product Mockup" active={mode === 'mockup'} onClick={() => { setMode('mockup'); setMockupStage('generateBase'); setBaseMockupImage(null); setMockupGeneratedImages([]); }} />
        </nav>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md relative mb-6 transition-colors fade-in-blur" role="alert" style={{ animationDelay: '200ms' }}>
            <strong className="font-bold">Kesalahan: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {mode === 'portrait' && (
          <div className="max-w-2xl mx-auto flex flex-col gap-8">
            <section className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col gap-6 transition-all duration-500 fade-in-blur" style={{ animationDelay: '300ms' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-200 mb-3 transition-colors">1. Unggah Model</h2>
                        <ImageUploader onImageUpload={(file) => handleFileUpload(file, setModelImage)} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-slate-200 mb-3 flex items-center transition-colors">2. Tambah Gaya <span className="text-sm font-normal text-slate-400 ml-2 transition-colors">(Opsional)</span></h2>
                        <textarea value={stylePrompt} onChange={(e) => setStylePrompt(e.target.value)} placeholder="cth., dengan gaya buku komik, anime, seni fantasi..." className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-transparent border-slate-600 text-slate-100 placeholder-slate-400 transition duration-200 resize-none" disabled={isGenerating} />
                    </div>
                </div>
                 <div>
                    <h2 className="text-xl font-semibold text-slate-200 mb-3">3. Pilih Latar Belakang</h2>
                    <select
                        value={backgroundSelection}
                        onChange={(e) => {
                            setBackgroundSelection(e.target.value);
                            if (e.target.value !== 'custom') setCustomBackground('');
                        }}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-700/80 border-slate-600 text-slate-100 transition duration-200"
                        disabled={isGenerating}
                    >
                        {BACKGROUND_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        <option value="custom">Lainnya... (Ketik di bawah)</option>
                    </select>
                    {backgroundSelection === 'custom' && (
                        <input
                            type="text"
                            value={customBackground}
                            onChange={(e) => setCustomBackground(e.target.value)}
                            placeholder="cth., di puncak gunung, interior pesawat..."
                            className="w-full p-3 mt-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-transparent border-slate-600 text-slate-100 placeholder-slate-400 transition duration-200"
                            disabled={isGenerating}
                        />
                    )}
                </div>
                <button onClick={handleGenerate} disabled={isGenerating || !modelImage} className={`w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-teal-500/40 disabled:shadow-none transform hover:-translate-y-1 active:translate-y-0 disabled:transform-none ${!isGenerating && modelImage ? 'animate-pulse-glow' : ''}`}>
                    {isGenerating ? 'Menghasilkan...' : 'Hasilkan Ekspresi'}
                </button>
            </section>
            <section className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-slate-700 transition-all duration-500 fade-in-blur" style={{ animationDelay: '400ms' }}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-slate-200 transition-colors">Hasil</h2>
                    {hasSuccessfulImages && !isGenerating && (
                        <button onClick={() => downloadAll(generatedImages)} className="flex items-center gap-2 text-sm bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Unduh Semua
                        </button>
                    )}
                </div>
                <ResultGrid images={generatedImages} onImageSelect={setSelectedImage} onDownload={downloadImage} />
            </section>
          </div>
        )}
        
        {mode === 'product' && (
           <div className="max-w-4xl mx-auto flex flex-col gap-8">
            <section className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col gap-6 transition-all duration-500 fade-in-blur" style={{ animationDelay: '300ms' }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-200 mb-3">1. Unggah Wajah</h2>
                        <ImageUploader onImageUpload={(file) => handleFileUpload(file, (img) => setFaceImage(img))} label="Unggah Foto Wajah" description="Klik atau seret file" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-slate-200 mb-3">2. Unggah Produk</h2>
                        <ImageUploader onImageUpload={(file) => handleFileUpload(file, (img) => setProductImage(img))} label="Unggah Foto Produk" description="Klik atau seret file" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-slate-200 mb-3">3. Konteks <span className="text-sm font-normal text-slate-400 ml-2">(Opsional)</span></h2>
                        <textarea value={productContext} onChange={(e) => setProductContext(e.target.value)} placeholder="cth., di gym, gaya hidup sehat, studio profesional..." className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-transparent border-slate-600 text-slate-100 placeholder-slate-400 transition duration-200 resize-none" disabled={isGeneratingProduct} />
                    </div>
                </div>
                 <div>
                    <h2 className="text-xl font-semibold text-slate-200 mb-3">4. Pilih Latar Belakang</h2>
                     <select
                        value={backgroundSelection}
                        onChange={(e) => {
                            setBackgroundSelection(e.target.value);
                            if (e.target.value !== 'custom') setCustomBackground('');
                        }}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-700/80 border-slate-600 text-slate-100 transition duration-200"
                        disabled={isGeneratingProduct}
                    >
                        {BACKGROUND_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        <option value="custom">Lainnya... (Ketik di bawah)</option>
                    </select>
                    {backgroundSelection === 'custom' && (
                        <input
                            type="text"
                            value={customBackground}
                            onChange={(e) => setCustomBackground(e.target.value)}
                            placeholder="cth., di puncak gunung, interior pesawat..."
                            className="w-full p-3 mt-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-transparent border-slate-600 text-slate-100 placeholder-slate-400 transition duration-200"
                            disabled={isGeneratingProduct}
                        />
                    )}
                </div>
                <button onClick={handleGenerateProductPose} disabled={isGeneratingProduct || !faceImage || !productImage} className={`w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-teal-500/40 disabled:shadow-none transform hover:-translate-y-1 active:translate-y-0 disabled:transform-none ${!isGeneratingProduct && faceImage && productImage ? 'animate-pulse-glow' : ''}`}>
                    {isGeneratingProduct ? 'Menghasilkan...' : 'Hasilkan 9 Pose Produk'}
                </button>
            </section>
             <section className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-slate-700 transition-all duration-500 fade-in-blur" style={{ animationDelay: '400ms' }}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-slate-200 transition-colors">Hasil</h2>
                   {hasSuccessfulProductImages && !isGeneratingProduct && (
                        <button onClick={() => downloadAll(productGeneratedImages)} className="flex items-center gap-2 text-sm bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Unduh Semua
                        </button>
                    )}
                </div>
                <ResultGrid images={productGeneratedImages} onImageSelect={setSelectedImage} onDownload={downloadImage} />
            </section>
          </div>
        )}
        
        {mode === 'mockup' && (
          <div className="max-w-5xl mx-auto flex flex-col gap-8">
            {mockupStage === 'generateBase' && (
              <section className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col gap-6 transition-all duration-500 fade-in-blur" style={{ animationDelay: '300ms' }}>
                <h2 className="text-2xl font-bold text-slate-100 text-center">Langkah 1: Siapkan Template Mockup</h2>
                <div className="flex justify-center bg-slate-900/50 p-1 rounded-full w-max mx-auto">
                    <button onClick={() => setMockupBaseMode('generate')} className={`px-4 py-2 rounded-full font-semibold transition-colors ${mockupBaseMode === 'generate' ? 'bg-teal-500 text-white' : 'text-slate-300'}`}>Hasilkan dengan AI</button>
                    <button onClick={() => setMockupBaseMode('upload')} className={`px-4 py-2 rounded-full font-semibold transition-colors ${mockupBaseMode === 'upload' ? 'bg-teal-500 text-white' : 'text-slate-300'}`}>Unggah Produk Sendiri</button>
                </div>

                {mockupBaseMode === 'generate' ? (
                  <>
                    <p className="text-slate-400 text-center -mt-2">Pilih produk, warna, dan pemandangan untuk menghasilkan gambar dasar berkualitas tinggi.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6 items-start">
                      <div>
                        <label className="font-semibold text-slate-300 mb-2 block">Produk</label>
                        <select value={mockupTemplate} onChange={e => setMockupTemplate(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 bg-slate-700/80 border-slate-600 text-slate-100" disabled={isGeneratingMockup}>
                          {MOCKUP_TEMPLATES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          <option value={CUSTOM_OPTION_VALUE}>{CUSTOM_OPTION_VALUE}</option>
                        </select>
                        {mockupTemplate === CUSTOM_OPTION_VALUE && <input type="text" value={customMockupTemplate} onChange={e => setCustomMockupTemplate(e.target.value)} placeholder="Tentukan produk kustom..." className="w-full p-3 mt-2 border rounded-lg focus:ring-2 focus:ring-teal-500 bg-transparent border-slate-600 text-slate-100 placeholder-slate-400" disabled={isGeneratingMockup}/>}
                      </div>
                      <div>
                        <label className="font-semibold text-slate-300 mb-2 block">Warna Produk</label>
                        <input type="text" value={productColor} onChange={e => setProductColor(e.target.value)} placeholder="cth., Hitam, Biru Navy" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 bg-transparent border-slate-600 text-slate-100 placeholder-slate-400" disabled={isGeneratingMockup} />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-300 mb-2 block">Pemandangan</label>
                        <select value={scenePreset} onChange={e => setScenePreset(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 bg-slate-700/80 border-slate-600 text-slate-100" disabled={isGeneratingMockup}>
                          {SCENE_PRESETS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          <option value={CUSTOM_OPTION_VALUE}>{CUSTOM_OPTION_VALUE}</option>
                        </select>
                         {scenePreset === CUSTOM_OPTION_VALUE && <input type="text" value={customScenePreset} onChange={e => setCustomScenePreset(e.target.value)} placeholder="Tentukan pemandangan kustom..." className="w-full p-3 mt-2 border rounded-lg focus:ring-2 focus:ring-teal-500 bg-transparent border-slate-600 text-slate-100 placeholder-slate-400" disabled={isGeneratingMockup}/>}
                      </div>
                      <div className="md:col-span-2 lg:col-span-1">
                        <label className="font-semibold text-slate-300 mb-2 block">Pencahayaan</label>
                        <select value={lightingStyle} onChange={e => setLightingStyle(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 bg-slate-700/80 border-slate-600 text-slate-100" disabled={isGeneratingMockup}>
                          {LIGHTING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                           <option value={CUSTOM_OPTION_VALUE}>{CUSTOM_OPTION_VALUE}</option>
                        </select>
                         {lightingStyle === CUSTOM_OPTION_VALUE && <input type="text" value={customLightingStyle} onChange={e => setCustomLightingStyle(e.target.value)} placeholder="Tentukan pencahayaan kustom..." className="w-full p-3 mt-2 border rounded-lg focus:ring-2 focus:ring-teal-500 bg-transparent border-slate-600 text-slate-100 placeholder-slate-400" disabled={isGeneratingMockup}/>}
                      </div>
                    </div>
                    <button onClick={handleGenerateBase} disabled={isGeneratingMockup} className={`w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-teal-500/40 disabled:shadow-none transform hover:-translate-y-1 active:translate-y-0 disabled:transform-none ${!isGeneratingMockup ? 'animate-pulse-glow' : ''}`}>
                      {isGeneratingMockup ? 'Menghasilkan Template...' : 'Hasilkan Template Mockup'}
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                     <p className="text-slate-400 text-center">Unggah gambar produk kosong Anda. Latar belakang akan dipertahankan.</p>
                     <div className="w-full max-w-sm">
                        <ImageUploader onImageUpload={(file) => handleFileUpload(file, (img) => {
                            setBaseMockupImage(img);
                            setMockupStage('applyDesign');
                        })} />
                     </div>
                  </div>
                )}
              </section>
            )}

            {mockupStage === 'applyDesign' && (
              <>
                 <section className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col gap-6 transition-all duration-500 fade-in-blur" style={{ animationDelay: '300ms' }}>
                   <h2 className="text-2xl font-bold text-slate-100 text-center">Langkah 2: Terapkan Desain Anda</h2>
                    <div className="flex items-center justify-center">
                        <button onClick={() => { setMockupStage('generateBase'); setBaseMockupImage(null); }} className="text-sm text-teal-400 hover:text-teal-300 font-semibold transition-colors">&larr; Kembali untuk mengubah template</button>
                    </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                       <div className="flex flex-col gap-4">
                         <h3 className="text-lg font-semibold text-slate-200">Template Mockup Dasar</h3>
                         {baseMockupImage && <img src={`data:${baseMockupImage.mimeType};base64,${baseMockupImage.data}`} alt="Base Mockup" className="rounded-lg w-full object-contain bg-slate-900/50" />}
                       </div>
                       <div className="flex flex-col gap-4">
                         <h3 className="text-lg font-semibold text-slate-200">Unggah Desain</h3>
                         <ImageUploader onImageUpload={(file) => handleFileUpload(file, setDesignImage)} />
                         <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                           <input type="checkbox" checked={removeDesignBackground} onChange={e => setRemoveDesignBackground(e.target.checked)} className="h-5 w-5 rounded bg-slate-700 border-slate-500 text-teal-500 focus:ring-teal-500" />
                           Coba hapus latar belakang desain
                         </label>
                       </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 items-start">
                       <div>
                        <label className="font-semibold text-slate-300 mb-2 block">Penempatan Desain</label>
                        <select value={designPlacement} onChange={e => setDesignPlacement(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 bg-slate-700/80 border-slate-600 text-slate-100" disabled={isGeneratingMockup}>
                          {PLACEMENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          <option value={CUSTOM_OPTION_VALUE}>{CUSTOM_OPTION_VALUE}</option>
                        </select>
                        {designPlacement === CUSTOM_OPTION_VALUE && <input type="text" value={customDesignPlacement} onChange={e => setCustomDesignPlacement(e.target.value)} placeholder="Tentukan penempatan kustom..." className="w-full p-3 mt-2 border rounded-lg focus:ring-2 focus:ring-teal-500 bg-transparent border-slate-600 text-slate-100 placeholder-slate-400" disabled={isGeneratingMockup}/>}
                      </div>
                       <div>
                        <label className="font-semibold text-slate-300 mb-2 block">Ukuran Desain</label>
                        <select value={designSize} onChange={e => setDesignSize(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 bg-slate-700/80 border-slate-600 text-slate-100" disabled={isGeneratingMockup}>
                          {DESIGN_SIZE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          <option value={CUSTOM_OPTION_VALUE}>{CUSTOM_OPTION_VALUE}</option>
                        </select>
                        {designSize === CUSTOM_OPTION_VALUE && <input type="text" value={customDesignSize} onChange={e => setCustomDesignSize(e.target.value)} placeholder="Tentukan ukuran kustom..." className="w-full p-3 mt-2 border rounded-lg focus:ring-2 focus:ring-teal-500 bg-transparent border-slate-600 text-slate-100 placeholder-slate-400" disabled={isGeneratingMockup}/>}
                      </div>
                   </div>
                    <button onClick={handleApplyDesign} disabled={isGeneratingMockup || !designImage} className={`w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-teal-500/40 disabled:shadow-none transform hover:-translate-y-1 active:translate-y-0 disabled:transform-none ${!isGeneratingMockup && designImage ? 'animate-pulse-glow' : ''}`}>
                      {isGeneratingMockup ? 'Menerapkan Desain...' : 'Hasilkan Mockup Akhir'}
                    </button>
                 </section>

                <section className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-slate-700 transition-all duration-500 fade-in-blur" style={{ animationDelay: '400ms' }}>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-slate-200 transition-colors">Hasil</h2>
                       {hasSuccessfulMockupImages && !isGeneratingMockup && (
                            <button onClick={() => downloadAll(mockupGeneratedImages)} className="flex items-center gap-2 text-sm bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Unduh Semua
                            </button>
                        )}
                    </div>
                    <ResultGrid images={mockupGeneratedImages} onImageSelect={setSelectedImage} onDownload={downloadImage} gridClass="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" />
                </section>
              </>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default App;