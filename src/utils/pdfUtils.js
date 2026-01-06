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

        // Optimize for PDF 
        element.style.width = '375px';
        element.style.margin = '0';
        element.style.padding = '0';
        element.style.backgroundColor = '#ffffff'; // Force white background

        // Add specific class for PDF styling if needed
        element.classList.add('pdf-mode');

        // Hide decorative elements that cause artifacts
        const elementsToHide = element.querySelectorAll('.pdf-hide');
        elementsToHide.forEach(el => el.style.display = 'none');

        const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: 375,
                scrollY: 0,
                backgroundColor: '#ffffff' // Ensure canvas background is white
            },
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
        element.style.backgroundColor = ''; // Remove forced background

        elementsToHide.forEach(el => el.style.display = '');

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
