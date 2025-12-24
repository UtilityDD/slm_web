import React, { useRef } from 'react';

const CertificateModal = ({ isOpen, onClose, userName, level, badgeName, date }) => {
    const certificateRef = useRef(null);

    if (!isOpen) return null;

    const handlePrint = () => {
        const printContent = certificateRef.current;
        const windowUrl = 'about:blank';
        const uniqueName = new Date();
        const windowName = 'Print' + uniqueName.getTime();
        const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Certificate of Achievement</title>
                    <style>
                        @page { size: landscape; margin: 0; }
                        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                        .certificate-container {
                            width: 100%;
                            height: 100vh;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            background-color: #f8fafc;
                            font-family: 'Times New Roman', serif;
                        }
                        .certificate-border {
                            width: 90%;
                            height: 85%;
                            padding: 20px;
                            border: 10px solid #1e293b;
                            position: relative;
                            background-color: white;
                            box-shadow: 0 0 20px rgba(0,0,0,0.1);
                        }
                        .certificate-inner-border {
                            width: 100%;
                            height: 100%;
                            border: 2px solid #cbd5e1;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            position: relative;
                        }
                        .header {
                            font-size: 48px;
                            font-weight: bold;
                            color: #1e293b;
                            margin-bottom: 20px;
                            text-transform: uppercase;
                            letter-spacing: 4px;
                        }
                        .sub-header {
                            font-size: 24px;
                            color: #64748b;
                            margin-bottom: 40px;
                            font-style: italic;
                        }
                        .recipient-name {
                            font-size: 56px;
                            font-weight: bold;
                            color: #0f172a;
                            margin: 20px 0;
                            border-bottom: 2px solid #e2e8f0;
                            padding: 0 40px 10px 40px;
                            font-family: 'Great Vibes', cursive, serif;
                        }
                        .description {
                            font-size: 20px;
                            color: #475569;
                            text-align: center;
                            max-width: 80%;
                            line-height: 1.6;
                            margin-bottom: 40px;
                        }
                        .badge-level {
                            font-size: 32px;
                            font-weight: bold;
                            color: #2563eb;
                            margin-bottom: 10px;
                        }
                        .footer {
                            width: 80%;
                            display: flex;
                            justify-content: space-between;
                            margin-top: 60px;
                        }
                        .signature-block {
                            text-align: center;
                            border-top: 1px solid #94a3b8;
                            padding-top: 10px;
                            width: 200px;
                        }
                        .signature-text {
                            font-size: 16px;
                            color: #64748b;
                        }
                        .seal {
                            position: absolute;
                            bottom: 40px;
                            right: 40px;
                            width: 100px;
                            height: 100px;
                            border-radius: 50%;
                            background: #e2e8f0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #1e293b;
                            font-weight: bold;
                            border: 4px double #1e293b;
                            transform: rotate(-15deg);
                        }
                    </style>
                </head>
                <body>
                    <div class="certificate-container">
                        <div class="certificate-border">
                            <div class="certificate-inner-border">
                                <div class="header">Certificate of Achievement</div>
                                <div class="sub-header">This is to certify that</div>
                                <div class="recipient-name">${userName || 'Valued Learner'}</div>
                                <div class="description">
                                    Has successfully demonstrated dedication to safety and professional development by achieving the level of
                                </div>
                                <div class="badge-level">${badgeName || 'Safety Trainee'}</div>
                                <div class="description">
                                    Level ${level || 1}
                                </div>
                                <div class="footer">
                                    <div class="signature-block">
                                        <div class="signature-text">Date: ${date}</div>
                                    </div>
                                    <div class="signature-block">
                                        <div class="signature-text">Authorized Signature</div>
                                    </div>
                                </div>
                                <div class="seal">OFFICIAL</div>
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
        }, 250);
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
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
                    <div ref={certificateRef} className="bg-white text-slate-900 p-8 shadow-lg border-8 border-double border-slate-800 w-full max-w-3xl aspect-[1.414/1] relative flex flex-col items-center justify-center text-center select-none transform transition-transform hover:scale-[1.01] duration-300">
                        {/* Decorative Corners */}
                        <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-slate-800"></div>
                        <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-slate-800"></div>
                        <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-slate-800"></div>
                        <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-slate-800"></div>

                        {/* Content */}
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-800 mb-2 uppercase tracking-widest">Certificate</h1>
                        <h2 className="text-xl md:text-2xl font-serif text-slate-600 mb-8 italic">of Achievement</h2>

                        <p className="text-lg text-slate-500 mb-4">This is to certify that</p>

                        <div className="text-3xl md:text-5xl font-serif font-bold text-slate-900 mb-6 border-b-2 border-slate-300 pb-2 px-8 min-w-[300px]">
                            {userName || 'Valued Learner'}
                        </div>

                        <p className="text-lg text-slate-500 mb-6 max-w-xl">
                            Has successfully demonstrated dedication to safety and professional development by achieving the level of
                        </p>

                        <div className="text-2xl md:text-4xl font-bold text-blue-700 mb-2 uppercase tracking-wide">
                            {badgeName || 'Safety Trainee'}
                        </div>
                        <div className="text-lg text-slate-600 mb-12">Level {level || 1}</div>

                        <div className="w-full flex justify-between items-end px-12 mt-auto">
                            <div className="text-center">
                                <div className="text-lg font-serif text-slate-700 border-t border-slate-400 pt-2 px-4 min-w-[150px]">{date}</div>
                                <div className="text-sm text-slate-500 mt-1">Date</div>
                            </div>

                            {/* Gold Seal */}
                            <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center shadow-inner border-4 border-yellow-600 relative">
                                <div className="w-20 h-20 border-2 border-dashed border-yellow-700 rounded-full flex items-center justify-center">
                                    <span className="text-yellow-800 font-bold text-xs transform -rotate-12">OFFICIAL<br />CERTIFIED</span>
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="text-lg font-serif text-slate-700 border-t border-slate-400 pt-2 px-4 min-w-[150px]">Safety Hub</div>
                                <div className="text-sm text-slate-500 mt-1">Authorized Signature</div>
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
