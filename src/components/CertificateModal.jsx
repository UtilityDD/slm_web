import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';

const CertificateModal = ({ isOpen, onClose, userName, level, badgeName, date, certificateId }) => {
    const certificateRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

    if (!isOpen) return null;

    const verificationUrl = `${window.location.origin}/#/verify/${certificateId}`;

    const handleDownloadPNG = async () => {
        if (!certificateRef.current) return;

        try {
            setIsDownloading(true);

            // Force wait for all images to load before capturing
            const images = certificateRef.current.querySelectorAll('img');
            const imagePromises = Array.from(images).map(img => {
                if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            });
            
            await Promise.all(imagePromises);
            // Small delay to ensure rendering is committed
            await new Promise(r => setTimeout(r, 100));

            const canvas = await html2canvas(certificateRef.current, {
                scale: 3, // Ultra high quality
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: 1123,
                height: 794
            });

            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `Certificate_${userName?.replace(/\s+/g, '_') || 'Learner'}.png`;
            link.href = image;
            link.click();
        } catch (error) {
            console.error('Error generating PNG:', error);
            alert('Failed to generate PNG. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const origin = window.location.origin;
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Certificate Of Achievement - ${userName}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet" />
                    <style>
                        @page { size: A4 landscape; margin: 0; }
                        body { 
                            margin: 0; padding: 0; 
                            -webkit-print-color-adjust: exact; 
                            background: white;
                            font-family: 'Hind Siliguri', 'Times New Roman', serif;
                        }
                        .certificate-container {
                            width: 297mm; height: 210mm;
                            padding: 10mm; box-sizing: border-box;
                            display: flex; justify-content: center; align-items: center;
                        }
                        .certificate-border {
                            width: 100%; height: 100%;
                            border: 12px double #1e293b;
                            box-sizing: border-box;
                            position: relative;
                            display: flex; flex-direction: column;
                            align-items: center; justify-content: center;
                            text-align: center; background: white;
                        }
                        .header-branding {
                            position: absolute; top: 10mm; left: 10mm; right: 10mm;
                            display: flex; justify-content: space-between; align-items: flex-start;
                        }
                        .logo-left { display: flex; flex-direction: column; align-items: flex-start; gap: 1mm; }
                        .logo-left img { width: 28mm; height: 28mm; object-fit: contain; }
                        .logo-left .brand { font-size: 9pt; font-weight: 900; color: #475569; }
                        
                        .icon-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2mm; }
                        .icon-right img { width: 20mm; height: 20mm; border-radius: 4mm; }
                        .icon-right .label { font-size: 7pt; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1pt; }

                        .title { font-size: 56pt; font-weight: 900; color: #1e293b; letter-spacing: 8pt; margin-top: 10mm; }
                        .sub-title { font-size: 26pt; color: #64748b; font-style: italic; margin-bottom: 8mm; }
                        .certify-text { font-size: 18pt; color: #94a3b8; margin-bottom: 4mm; }
                        .name { font-size: 60pt; font-weight: bold; color: #0f172a; border-bottom: 3pt solid #f1f5f9; padding: 0 20mm 4mm 20mm; margin-bottom: 8mm; font-style: italic; }
                        .desc { font-size: 19pt; color: #475569; max-width: 80%; line-height: 1.5; margin-bottom: 10mm; }
                        .badge { font-size: 42pt; font-weight: 900; color: #ea580c; letter-spacing: 4pt; }
                        .level { font-size: 18pt; color: #64748b; font-weight: bold; margin-bottom: 15mm; }

                        .footer { width: 90%; display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-bottom: 10mm; }
                        .sig-block { text-align: center; border-top: 2pt solid #e2e8f0; padding-top: 4mm; width: 60mm; }
                        .sig-name { font-size: 18pt; color: #1e293b; font-weight: bold; }
                        .sig-label { font-size: 10pt; color: #94a3b8; text-transform: uppercase; letter-spacing: 2pt; margin-top: 1mm; }
                        
                        .seal-container { position: relative; width: 35mm; height: 35mm; }
                        .seal { width: 35mm; height: 35mm; border-radius: 50%; background: linear-gradient(135deg, #fbbf24, #d97706); border: 4pt solid #92400e; display: flex; align-items: center; justify-content: center; transform: rotate(-10deg); box-shadow: 0 4pt 10pt rgba(0,0,0,0.1); }
                        .seal-text { font-size: 9pt; font-weight: 900; color: #451a03; text-align: center; }
                        .ribbon { position: absolute; bottom: -8mm; left: 50%; transform: translateX(-50%); display: flex; gap: 2mm; }
                        .ribbon-part { width: 6mm; height: 15mm; background: #dc2626; clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%); }

                        .verify-qr { position: absolute; bottom: 8mm; left: 8mm; text-align: left; }
                        .qr-img { width: 28mm; height: 28mm; background: white; padding: 1.5mm; border: 1pt solid #f1f5f9; border-radius: 2mm; margin-bottom: 2mm; }
                        .id-tag { font-size: 9pt; color: #94a3b8; font-family: monospace; background: #f8fafc; padding: 1mm 2mm; border-radius: 1mm; border: 1pt solid #f1f5f9; }
                    </style>
                </head>
                <body>
                    <div class="certificate-container">
                        <div class="certificate-border">
                            <div class="header-branding">
                                <div class="logo-left">
                                    <img src="${origin}/icons/logo.png" id="logo_img" />
                                    <div class="brand">SmartLineMan.in</div>
                                </div>
                                <div class="icon-right">
                                    <img src="${origin}/icon-192.png" id="icon_img" />
                                    <div class="label">Official Credential</div>
                                </div>
                            </div>

                            <div class="title">CERTIFICATE</div>
                            <div class="sub-title">of Achievement</div>
                            
                            <div class="certify-text">This is to certify that</div>
                            <div class="name">${userName || 'Valued Learner'}</div>
                            
                            <div class="desc">
                                Has successfully demonstrated exceptional dedication to safety SOPs and professional development by achieving the distinguished level of
                            </div>
                            
                            <div class="badge">${badgeName || 'Safety Trainee'}</div>
                            <div class="level">TRAINING LEVEL ${level || 1}</div>
                            
                            <div class="verify-qr">
                                <div class="qr-img">
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verificationUrl)}" id="qr_img" style="width: 100%; height: 100%;" />
                                </div>
                                <div class="id-tag">ID: ${certificateId}</div>
                            </div>

                            <div class="footer">
                                <div class="sig-block">
                                    <div class="sig-name">${date}</div>
                                    <div class="sig-label">Date of Issue</div>
                                </div>
                                
                                <div class="seal-container">
                                    <div class="seal">
                                        <div class="seal-text">OFFICIAL<br>SMART LINEMAN<br>CERTIFIED</div>
                                    </div>
                                    <div class="ribbon">
                                        <div class="ribbon-part"></div>
                                        <div class="ribbon-part"></div>
                                    </div>
                                </div>
                                
                                <div class="sig-block">
                                    <div class="sig-name">Admin Team</div>
                                    <div class="sig-label">Authorized Signature</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <script>
                        window.onload = () => {
                            // Ensure all images are loaded before printing
                            const imgs = document.getElementsByTagName('img');
                            let loaded = 0;
                            const total = imgs.length;
                            
                            if (total === 0) { window.print(); window.close(); return; }

                            const checkAllLoaded = () => {
                                loaded++;
                                if (loaded >= total) {
                                    setTimeout(() => {
                                        window.print();
                                        window.close();
                                    }, 500);
                                }
                            };

                            Array.from(imgs).forEach(img => {
                                if (img.complete) checkAllLoaded();
                                else {
                                    img.onload = checkAllLoaded;
                                    img.onerror = checkAllLoaded;
                                }
                            });
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="text-2xl">🎓</span> Professional Certificate
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Certificate Preview Area */}
                <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-start sm:justify-center items-start sm:items-center">
                        <div
                            ref={certificateRef}
                            className="bg-white text-slate-900 p-12 shadow-2xl border-[16px] border-double border-slate-800 relative flex flex-col items-center justify-center text-center select-none shrink-0"
                            style={{
                                width: '1123px',
                                height: '794px',
                                fontFamily: "'Hind Siliguri', 'Times New Roman', serif"
                            }}
                        >
                            {/* Professional Bengali Font Import */}
                            <style>
                                {`@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');`}
                            </style>

                            {/* Branded Header Logos */}
                            <div className="absolute top-12 left-12 right-12 flex justify-between items-start pointer-events-none">
                                <div className="flex flex-col items-start gap-1">
                                    <img 
                                        src={`${window.location.origin}/icons/logo.png`} 
                                        alt="Logo" 
                                        crossOrigin="anonymous"
                                        className="w-24 h-24 object-contain" 
                                    />
                                    <div className="text-[10px] font-black tracking-tighter text-slate-400">SmartLineMan<span className="bg-orange-500 text-white px-0.5 ml-0.5 rounded">.in</span></div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <img 
                                        src={`${window.location.origin}/icon-192.png`} 
                                        alt="Icon" 
                                        crossOrigin="anonymous"
                                        className="w-16 h-16 object-contain rounded-2xl shadow-sm" 
                                    />
                                    <div className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Official Credential</div>
                                </div>
                            </div>

                            {/* Decorative Corners */}
                            <div className="absolute top-6 left-6 w-24 h-24 border-t-8 border-l-8 border-slate-800/10"></div>
                            <div className="absolute top-6 right-6 w-24 h-24 border-t-8 border-r-8 border-slate-800/10"></div>
                            <div className="absolute bottom-6 left-6 w-24 h-24 border-b-8 border-l-8 border-slate-800/10"></div>
                            <div className="absolute bottom-6 right-6 w-24 h-24 border-b-8 border-r-8 border-slate-800/10"></div>

                            {/* Verification Block */}
                            <div className="absolute bottom-10 left-10 flex flex-col items-start gap-2">
                                <div className="bg-white p-2 border border-slate-200 shadow-sm rounded-lg">
                                    <QRCodeSVG value={verificationUrl} size={90} />
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono tracking-tighter bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                    VERIFY ID: {certificateId}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="mb-6 mt-16">
                                <h1 className="text-7xl font-bold text-slate-800 mb-2 uppercase tracking-[0.25em]">CERTIFICATE</h1>
                                <h2 className="text-3xl text-slate-500 italic font-serif opacity-80">of Achievement</h2>
                            </div>

                            <div className="space-y-4 mb-8">
                                <p className="text-2xl text-slate-400 font-medium">This is to certify that</p>

                                <div className="text-7xl font-bold text-slate-900 border-b-4 border-slate-300 pb-3 px-12 inline-block min-w-[650px] font-serif italic tracking-tight">
                                    {userName || 'Valued Learner'}
                                </div>
                            </div>

                            <div className="max-w-3xl mb-10">
                                <p className="text-2xl text-slate-600 leading-relaxed font-medium">
                                    Has successfully demonstrated exceptional dedication to safety SOPs and professional development by achieving the distinguished level of
                                </p>
                            </div>

                            <div className="mb-14">
                                <div className="text-5xl font-black text-orange-600 mb-2 uppercase tracking-widest">
                                    {badgeName || 'Safety Trainee'}
                                </div>
                                <div className="text-2xl text-slate-400 font-bold tracking-tight">TRAINING LEVEL {level || 1}</div>
                            </div>

                            <div className="w-full flex justify-between items-end px-20 mt-auto pb-10">
                                <div className="text-center w-64">
                                    <div className="text-2xl font-bold text-slate-700 border-t-2 border-slate-300 pt-4">{date}</div>
                                    <div className="text-xs font-black text-slate-400 mt-2 uppercase tracking-[0.3em]">Date of Issue</div>
                                </div>

                                {/* Professional Seal */}
                                <div className="relative transform hover:scale-105 transition-transform duration-500">
                                    <div className="w-32 h-32 bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-xl border-4 border-yellow-700/30">
                                        <div className="w-28 h-28 border-2 border-dashed border-yellow-900/40 rounded-full flex items-center justify-center text-center">
                                            <div className="text-yellow-950 font-black text-[10px] leading-tight transform -rotate-12 select-none">
                                                OFFICIAL<br />
                                                <span className="text-[9px] tracking-tighter">SMART LINEMAN.IN</span><br />
                                                CERTIFIED
                                            </div>
                                        </div>
                                    </div>
                                    {/* Ribbon effect */}
                                    <div className="absolute -bottom-4 left-1/2 -track-x-1/2 flex gap-1.5 -translate-x-1/2">
                                        <div
                                            className="w-5 h-14 bg-red-600 shadow-lg"
                                            style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 88%, 0% 100%)' }}
                                        ></div>
                                        <div
                                            className="w-5 h-14 bg-red-600 shadow-lg"
                                            style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 88%, 0% 100%)' }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="text-center w-64">
                                    <div className="text-2xl font-bold text-slate-700 border-t-2 border-slate-300 pt-4">Smart Lineman</div>
                                    <div className="text-xs font-black text-slate-400 mt-2 uppercase tracking-[0.3em]">Authorized Signature</div>
                                </div>
                            </div>
                        </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-wrap justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Close
                    </button>

                    <button
                        onClick={handleDownloadPNG}
                        disabled={isDownloading}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                        {isDownloading ? (
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        )}
                        {isDownloading ? 'Generating...' : 'Download PNG'}
                    </button>

                    <button
                        onClick={handlePrint}
                        className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-lg shadow-orange-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print / PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CertificateModal;
