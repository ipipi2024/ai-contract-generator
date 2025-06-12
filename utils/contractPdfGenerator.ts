    // utils/contractPdfGenerator.ts
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Contract } from '@/types/Contract';

export async function generateContractPDF(contract: Contract) {
  // Create a temporary div for PDF content
  const pdfContent = document.createElement('div');
  pdfContent.style.position = 'absolute';
  pdfContent.style.left = '-9999px';
  pdfContent.style.width = '210mm'; // A4 width
  pdfContent.style.padding = '20mm';
  pdfContent.style.backgroundColor = 'white';
  pdfContent.style.color = 'black';
  pdfContent.style.fontFamily = 'Arial, sans-serif';
  
  // Build PDF content
  pdfContent.innerHTML = `
    <div style="margin-bottom: 30px;">
      <h1 style="font-size: 24px; margin-bottom: 20px; color: black;">${contract.title}</h1>
    </div>
    
    <div style="margin-bottom: 40px; line-height: 1.6; color: black;">
      ${contract.content.replace(/\n/g, '<br />')}
    </div>
    
    ${contract.parties.some(p => p.signed) ? `
      <div style="page-break-before: always; margin-top: 50px;">
        <h2 style="font-size: 20px; margin-bottom: 30px; color: black;">Signatures</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
          ${contract.parties.map(party => `
            <div style="margin-bottom: 30px;">
              ${party.signed && party.signatureData ? `
                <div style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 10px; height: 80px;">
                  <img src="${party.signatureData}" style="max-height: 60px; filter: contrast(1.2);" />
                </div>
                <p style="margin: 5px 0; font-weight: bold; color: black;">${party.name}</p>
                <p style="margin: 5px 0; color: #666;">${party.role}</p>
                <p style="margin: 5px 0; color: #666;">Signed on: ${new Date(party.signedAt || '').toLocaleDateString()}</p>
              ` : `
                <div style="border-bottom: 2px solid #ccc; height: 80px; margin-bottom: 10px;">
                  <span style="color: #999; font-size: 14px;">Awaiting signature</span>
                </div>
                <p style="margin: 5px 0; font-weight: bold; color: black;">${party.name}</p>
                <p style="margin: 5px 0; color: #666;">${party.role}</p>
              `}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
  
  document.body.appendChild(pdfContent);
  
  try {
    // Use html2canvas to convert to image, then to PDF
    const canvas = await html2canvas(pdfContent, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Save the PDF
    pdf.save(`${contract.title.replace(/[^a-z0-9]/gi, '_')}_contract.pdf`);
  } finally {
    // Clean up
    document.body.removeChild(pdfContent);
  }
}