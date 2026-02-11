import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export default function ImageSection({ value, onChange }) {
    let images = [];
    try {
        images = value ? JSON.parse(value) : [];
    } catch (e) {
        images = (typeof value === 'string' && value) ? value.split(',').filter(Boolean).filter(s => s.startsWith('data:')) : [];
    }

    const [fullscreenImg, setFullscreenImg] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const processFiles = (files) => {
        if (!files.length) return;

        let processed = 0;
        const newImages = [...images];

        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                newImages.push(reader.result);
                processed++;
                if (processed === files.length) {
                    onChange(JSON.stringify(newImages));
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleUpload = (e) => {
        const files = Array.from(e.target.files);
        processFiles(files);
        // Reset input
        e.target.value = '';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        processFiles(files);
    };

    const removeImage = (index) => {
        const updatedImages = images.filter((_, i) => i !== index);
        onChange(JSON.stringify(updatedImages));
    };

    return (
        <div className="space-y-4">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4 rounded-xl transition-all duration-300 ${isDragging ? 'bg-primary/10 ring-2 ring-primary ring-dashed scale-[1.02]' : ''}`}
            >
                {images.map((img, idx) => (
                    <div key={idx} className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black shadow-sm cursor-zoom-in">
                        <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onClick={() => setFullscreenImg(img)}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[32px] scale-75 group-hover:scale-100 transition-transform duration-300">fullscreen</span>
                        </div>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                            className="absolute top-2 right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-rose-600 scale-75 group-hover:scale-100 z-10"
                        >
                            <span className="material-symbols-outlined text-[16px] font-bold">close</span>
                        </button>
                    </div>
                ))}

                <label className={`aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group ${isDragging ? 'border-primary bg-primary/20' : 'border-slate-200 dark:border-slate-800'}`}>
                    <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">add_photo_alternate</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">
                        {isDragging ? 'Drop Image here' : 'Add Chart'}
                    </span>
                </label>
            </div>
            {images.length === 0 && !isDragging && (
                <p className="text-[10px] text-slate-500 italic text-center">No screenshots attached for this category yet or drag & drop here.</p>
            )}

            {/* Fullscreen Overlay */}
            {fullscreenImg && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
                    onClick={() => setFullscreenImg(null)}
                >
                    <div className="absolute top-6 right-6 flex gap-4">
                        <button
                            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all active:scale-95"
                            onClick={(e) => {
                                e.stopPropagation();
                                const link = document.createElement('a');
                                link.href = fullscreenImg;
                                link.download = `chart-screenshot-${Date.now()}.png`;
                                link.click();
                            }}
                        >
                            <span className="material-symbols-outlined">download</span>
                        </button>
                        <button
                            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all active:scale-95"
                            onClick={() => setFullscreenImg(null)}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="w-full h-full p-12 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img
                            src={fullscreenImg}
                            alt="Fullscreen Chart"
                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-500 transition-transform"
                            style={{ boxShadow: '0 0 80px -20px rgba(var(--primary-rgb), 0.3)' }}
                        />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
