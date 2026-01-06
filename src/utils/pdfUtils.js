import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Utility to generate PDF from an HTML element using html2pdf.js
 * Loads the library dynamically to reduce initial bundle size.
 * 
 * @param {HTMLElement} element - The element to convert to PDF
 * @param {string} filename - The name of the generated PDF file
 */
export const downloadPDF = async (element, filename = 'document.pdf') => {
    if (!element) return;

    try {
        // Dynamically import html2pdf only when needed
        const html2pdf = (await import('html2pdf.js')).default;

        const originalWidth = element.style.width;
        const originalMargin = element.style.margin;
        const originalPadding = element.style.padding;

        // Optimize for PDF 
        element.style.width = '375px';
        element.style.margin = '0';
        element.style.padding = '0';
        // Add specific class for PDF styling if needed
        element.classList.add('pdf-mode');

        const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 375, scrollY: 0 },
            jsPDF: { unit: 'px', format: [375, 812], orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        if (Capacitor.isNativePlatform()) {
            // Android/iOS: Generate Base64, Write to File, then Share
            const pdfWorker = html2pdf().set(opt).from(element);
            const pdfBase64 = await pdfWorker.outputPdf('datauristring');

            // Remove the data:application/pdf;base64, prefix
            const base64Data = pdfBase64.split(',')[1];

            const savedFile = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache
            });

            await Share.share({
                title: 'Download PDF',
                text: 'Here is your PDF guide.',
                url: savedFile.uri,
                dialogTitle: 'Download PDF'
            });

        } else {
            // Web: Standard download
            await html2pdf().set(opt).from(element).save();
        }

        // Restore original styles
        element.classList.remove('pdf-mode');
        element.style.width = originalWidth;
        element.style.margin = originalMargin;
        element.style.padding = originalPadding;

        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        // Clean up styles even if error occurs
        element.classList.remove('pdf-mode');
        if (element.style.width === '375px') {
            element.style.width = '';
            element.style.margin = '';
            element.style.padding = '';
        }
        throw error;
    }
};
