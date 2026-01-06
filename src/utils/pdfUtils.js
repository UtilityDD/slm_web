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

        const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 375, scrollY: 0 },
            jsPDF: { unit: 'px', format: [375, 812], orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        element.classList.add('pdf-mode');

        await html2pdf().set(opt).from(element).save();

        // Restore original styles
        element.classList.remove('pdf-mode');
        element.style.width = originalWidth;
        element.style.margin = originalMargin;
        element.style.padding = originalPadding;

        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};
