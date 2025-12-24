import React, { useRef } from 'react';

const CertificateModal = ({ isOpen, onClose, userName, level, badgeName, date }) => {
    const certificateRef = useRef(null);

    if (!isOpen) return null;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Certificate of Achievement</title>
                    <style>
                        @page { 
                            size: A4 landscape; 
                            margin: 0; 
                        }
                        body { 
                            margin: 0; 
                            padding: 0; 
                            -webkit-print-color-adjust: exact; 
                            background: white;
                        }
                        .certificate-container {
                            width: 297mm;
                            height: 210mm;
                            padding: 15mm;
                            box-sizing: border-box;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            font-family: 'Times New Roman', serif;
                            background: white;
                        }
                        .certificate-border {
                            width: 100%;
                            height: 100%;
                            padding: 10mm;
                            border: 12px double #1e293b;
                            box-sizing: border-box;
                            position: relative;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                        }
                        .corner {
                            position: absolute;
                            width: 20mm;
                            height: 20mm;
                            border-color: #1e293b;
                            border-style: solid;
                        }
                        .top-left { top: 5mm; left: 5mm; border-width: 2mm 0 0 2mm; }
                        .top-right { top: 5mm; right: 5mm; border-width: 2mm 2mm 0 0; }
                        .bottom-left { bottom: 5mm; left: 5mm; border-width: 0 0 2mm 2mm; }
                        .bottom-right { bottom: 5mm; right: 5mm; border-width: 0 2mm 2mm 0; }

                        .header {
                            font-size: 64pt;
                            font-weight: bold;
                            color: #1e293b;
                            margin-bottom: 5mm;
                            text-transform: uppercase;
                            letter-spacing: 8pt;
                        }
                        .sub-header {
                            font-size: 28pt;
                            color: #64748b;
                            margin-bottom: 15mm;
                            font-style: italic;
                        }
                        .certify-text {
                            font-size: 22pt;
                            color: #64748b;
                            margin-bottom: 8mm;
                        }
                        .recipient-name {
                            font-size: 68pt;
                            font-weight: bold;
                            color: #0f172a;
                            margin-bottom: 12mm;
                            border-bottom: 3pt solid #e2e8f0;
                            padding: 0 20mm 5mm 20mm;
                            font-style: italic;
                        }
                        .description {
                            font-size: 20pt;
                            color: #475569;
                            max-width: 80%;
                            line-height: 1.5;
                            margin-bottom: 15mm;
                        }
                        .badge-level {
                            font-size: 42pt;
                            font-weight: bold;
                            color: #1e40af;
                            margin-bottom: 3mm;
                            text-transform: uppercase;
                            letter-spacing: 4pt;
                        }
                        .level-text {
                            font-size: 22pt;
                            color: #64748b;
                            margin-bottom: 20mm;
                        }
                        .footer {
                            width: 85%;
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-end;
                            margin-top: auto;
                            padding-bottom: 10mm;
                        }
                        .signature-block {
                            text-align: center;
                            border-top: 2pt solid #94a3b8;
                            padding-top: 4mm;
                            width: 60mm;
                        }
                        .signature-text {
                            font-size: 18pt;
                            color: #1e293b;
                            font-weight: bold;
                        }
                        .signature-label {
                            font-size: 14pt;
                            color: #64748b;
                            margin-top: 2mm;
                            text-transform: uppercase;
                            letter-spacing: 1pt;
                        }
                        .seal-container {
                            position: relative;
                            width: 40mm;
                            height: 40mm;
                        }
                        .seal {
                            width: 40mm;
                            height: 40mm;
                            border-radius: 50%;
                            background: linear-gradient(135deg, #fde047, #eab308, #ca8a04);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border: 4pt solid #a16207;
                            box-shadow: 0 4pt 8pt rgba(0,0,0,0.2);
                            transform: rotate(-12deg);
                        }
                        .seal-inner {
                            width: 34mm;
                            height: 34mm;
                            border: 2pt dashed rgba(161, 98, 7, 0.4);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                            font-size: 10pt;
                            font-weight: bold;
                            color: #713f12;
                        }
                        .ribbon {
                            position: absolute;
                            bottom: -10mm;
                            left: 50%;
                            transform: translateX(-50%);
                            display: flex;
                            gap: 2mm;
                        }
                        .ribbon-tail {
                            width: 6mm;
                            height: 15mm;
                            background: #dc2626;
                            clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 50% 85%, 0% 100%);
                        }
                    </style>
                </head>
                <body>
                    <div class="certificate-container">
                        <div class="certificate-border">
                            <div class="corner top-left"></div>
                            <div class="corner top-right"></div>
                            <div class="corner bottom-left"></div>
                            <div class="corner bottom-right"></div>
                            
                            <div class="header">Certificate</div>
                            <div class="sub-header">of Achievement</div>
                            
                            <div class="certify-text">This is to certify that</div>
                            <div class="recipient-name">${userName || 'Valued Learner'}</div>
                            
                            <div class="description">
                                Has successfully demonstrated exceptional dedication to safety protocols and professional development by achieving the distinguished level of
                            </div>
                            
                            <div class="badge-level">${badgeName || 'Safety Trainee'}</div>
                            <div class="level-text">Training Level ${level || 1}</div>
                            
                            <div class="footer">
                                <div class="signature-block">
                                    <div class="signature-text">${date}</div>
                                    <div class="signature-label">Date of Issue</div>
                                </div>
                                
                                <div class="seal-container">
                                    <div class="seal">
                                        <div class="seal-inner">
                                            OFFICIAL<br>SMART LINEMAN<br>CERTIFIED
                                        </div>
                                    </div>
                                    <div class="ribbon">
                                        <div class="ribbon-tail"></div>
                                        <div class="ribbon-tail"></div>
                                    </div>
                                </div>
                                
                                <div class="signature-block">
                                    <div class="signature-text">Smart Lineman</div>
                                    <div class="signature-label">Authorized Signature</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
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
                            fontFamily: "'Times New Roman', serif"
                        }}
                    >
                        {/* Decorative Corners */}
                        <div className="absolute top-6 left-6 w-24 h-24 border-t-8 border-l-8 border-slate-800"></div>
                        <div className="absolute top-6 right-6 w-24 h-24 border-t-8 border-r-8 border-slate-800"></div>
                        <div className="absolute bottom-6 left-6 w-24 h-24 border-b-8 border-l-8 border-slate-800"></div>
                        <div className="absolute bottom-6 right-6 w-24 h-24 border-b-8 border-r-8 border-slate-800"></div>

                        {/* Content */}
                        <div className="mb-8">
                            <h1 className="text-7xl font-bold text-slate-800 mb-4 uppercase tracking-[0.2em]">Certificate</h1>
                            <h2 className="text-3xl text-slate-600 italic font-serif">of Achievement</h2>
                        </div>

                        <div className="space-y-6 mb-12">
                            <p className="text-2xl text-slate-500">This is to certify that</p>

                            <div className="text-7xl font-bold text-slate-900 border-b-4 border-slate-300 pb-4 px-12 inline-block min-w-[600px] font-serif italic">
                                {userName || 'Valued Learner'}
                            </div>
                        </div>

                        <div className="max-w-3xl mb-12">
                            <p className="text-2xl text-slate-600 leading-relaxed">
                                Has successfully demonstrated exceptional dedication to safety protocols and professional development by achieving the distinguished level of
                            </p>
                        </div>

                        <div className="mb-16">
                            <div className="text-5xl font-bold text-blue-800 mb-2 uppercase tracking-widest">
                                {badgeName || 'Safety Trainee'}
                            </div>
                            <div className="text-2xl text-slate-500 font-medium">Training Level {level || 1}</div>
                        </div>

                        <div className="w-full flex justify-between items-end px-20 mt-auto pb-10">
                            <div className="text-center w-64">
                                <div className="text-2xl font-serif text-slate-800 border-t-2 border-slate-400 pt-4">{date}</div>
                                <div className="text-lg text-slate-500 mt-2 uppercase tracking-wider">Date of Issue</div>
                            </div>

                            {/* Professional Seal */}
                            <div className="relative group">
                                <div className="w-32 h-32 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-xl border-4 border-yellow-700/50">
                                    <div className="w-28 h-28 border-2 border-dashed border-yellow-800/30 rounded-full flex items-center justify-center text-center">
                                        <div className="text-yellow-900 font-bold text-xs leading-tight transform -rotate-12">
                                            OFFICIAL<br />
                                            <span className="text-[10px]">SMART LINEMAN</span><br />
                                            CERTIFIED
                                        </div>
                                    </div>
                                </div>
                                {/* Ribbon effect */}
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                                    <div
                                        className="w-4 h-12 bg-red-600 shadow-lg"
                                        style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 85%, 0% 100%)' }}
                                    ></div>
                                    <div
                                        className="w-4 h-12 bg-red-600 shadow-lg"
                                        style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 85%, 0% 100%)' }}
                                    ></div>
                                </div>
                            </div>

                            <div className="text-center w-64">
                                <div className="text-2xl font-serif text-slate-800 border-t-2 border-slate-400 pt-4">Smart Lineman</div>
                                <div className="text-lg text-slate-500 mt-2 uppercase tracking-wider">Authorized Signature</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download / Print
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CertificateModal;
