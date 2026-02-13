import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ImageSection({ value, onChange, category = "UNSPECIFIED" }) {
    let images = [];
    try {
        images = value ? JSON.parse(value) : [];
    } catch (e) {
        images = (typeof value === 'string' && value) ? value.split(',').filter(Boolean).filter(s => s.startsWith('data:')) : [];
    }

    const [fullscreenImg, setFullscreenImg] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const processFiles = (files) => {
        if (!files.length) return;
        setUploading(true);

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
                    setUploading(false);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleUpload = (e) => {
        const files = Array.from(e.target.files);
        processFiles(files);
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
                className={`grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-3xl transition-all duration-500 relative ${isDragging ? 'bg-primary/10 ring-2 ring-primary ring-dashed' : ''}`}
            >
                {/* Visual Scanner effect during drag */}
                {isDragging && (
                    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-3xl pointer-events-none">
                        <div className="w-full h-1 bg-primary/40 absolute top-0 animate-[scan_2s_linear_infinite]" />
                    </div>
                )}

                {images.map((img, idx) => (
                    <div
                        key={idx}
                        className="relative group aspect-video rounded-2xl overflow-hidden border border-white/5 bg-black/40 shadow-2xl cursor-zoom-in backdrop-blur-md"
                    >
                        <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            onClick={() => setFullscreenImg(img)}
                        />

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Image Meta Information */}
                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">INTEL #{idx + 1}</span>
                                <span className="text-[7px] text-white/50 uppercase font-mono">{category}</span>
                            </div>
                            <div className="flex gap-1.5">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setFullscreenImg(img); }}
                                    className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/10 transition-all"
                                >
                                    <span className="material-symbols-outlined text-xs">fullscreen</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                    className="w-6 h-6 rounded-lg bg-rose-500/80 hover:bg-rose-600 flex items-center justify-center backdrop-blur-md transition-all shadow-lg"
                                >
                                    <span className="material-symbols-outlined text-xs text-white">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Scanlines Effect */}
                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%]" />
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2.5 transition-all duration-500 group relative overflow-hidden
                        ${isDragging ? 'border-primary bg-primary/20 scale-105' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/20 hover:border-solid shadow-inner'}`}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        accept="image/*"
                        onChange={handleUpload}
                        className="hidden"
                    />

                    {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest animate-pulse">Processing...</span>
                        </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center transition-all duration-500 group-hover:bg-primary/20 group-hover:border-primary/30 group-hover:shadow-[0_0_20px_rgba(124,58,237,0.2)]">
                                <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors text-2xl">add_photo_alternate</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-[10px] font-black text-slate-400 group-hover:text-white transition-colors uppercase tracking-[0.2em] mb-0.5">
                                    {isDragging ? 'Release to Scan' : 'Add Intelligence'}
                                </span>
                                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest group-hover:text-primary/60 transition-colors italic">Dossier Attachment</span>
                            </div>
                        </>
                    )}

                    {/* Background Detail */}
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r border-b border-white/10 rounded-br-2xl group-hover:border-primary/40 transition-colors" />
                </button>
            </div>

            {/* Pagination / Count for power users */}
            {images.length > 0 && (
                <div className="flex items-center justify-center gap-3 mt-2">
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">{images.length} UNITS ATTACHED</span>
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                </div>
            )}

            {/* Custom Scan Animation */}
            <style>{`
                @keyframes scan {
                    from { transform: translateY(0); opacity: 0; }
                    50% { opacity: 1; }
                    to { transform: translateY(100px); opacity: 0; }
                }
            `}</style>

            {/* Fullscreen Overlay */}
            {fullscreenImg && createPortal(
                <div
                    className="fixed inset-0 z-[1001] flex items-center justify-center bg-[#020617]/95 backdrop-blur-3xl animate-in fade-in duration-300"
                    onClick={() => setFullscreenImg(null)}
                >
                    <div className="absolute top-8 left-8 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary">zoom_in</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Visual Intelligence Preview</h3>
                            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.25em]">Tactical Dossier Asset</p>
                        </div>
                    </div>

                    <div className="absolute top-8 right-8 flex gap-3">
                        <button
                            className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all active:scale-90"
                            onClick={(e) => {
                                e.stopPropagation();
                                const link = document.createElement('a');
                                link.href = fullscreenImg;
                                link.download = `core-intel-${Date.now()}.png`;
                                link.click();
                            }}
                        >
                            <span className="material-symbols-outlined">download</span>
                        </button>
                        <button
                            className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95"
                            onClick={() => setFullscreenImg(null)}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="w-full h-full p-24 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img
                            src={fullscreenImg}
                            alt="Fullscreen Intelligence"
                            className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5 animate-in zoom-in-95 duration-500"
                        />
                    </div>

                    {/* Aesthetic Corner Details */}
                    <div className="absolute bottom-8 right-8 p-4 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-md">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">IMAGE RESOLUTION</div>
                        <div className="text-xs font-mono text-primary">SCANNED & VERIFIED</div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
