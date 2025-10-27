import { Print } from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import QRCode from 'qrcode';

import { Invoice, InvoiceItem, SchoolBranding } from '../../../types/invoice';
import { supabase } from '../../../lib/supabase';
import { invoiceService } from '../../../services/invoiceService';

export interface PdfGenerationOptions {
  watermark?: 'draft' | 'paid' | 'overdue' | 'cancelled';
  includePaymentQR?: boolean;
  includeFooter?: boolean;
  pageFormat?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export class InvoicePdfGenerator {
  private static instance: InvoicePdfGenerator;

  public static getInstance(): InvoicePdfGenerator {
    if (!InvoicePdfGenerator.instance) {
      InvoicePdfGenerator.instance = new InvoicePdfGenerator();
    }
    return InvoicePdfGenerator.instance;
  }

  /**
   * Generate PDF for an invoice
   */
  async generateInvoicePdf(
    invoice: Invoice,
    items: InvoiceItem[],
    branding: SchoolBranding,
    options: PdfGenerationOptions = { /* TODO: Implement */ }
  ): Promise<string> {
    try {
      // Generate QR code if requested
      let qrCodeDataUrl = '';
      if (options.includePaymentQR) {
        qrCodeDataUrl = await this.generatePaymentQR(invoice);
      }

      // Create HTML template
      const htmlContent = await this.createHtmlTemplate(
        invoice,
        items,
        branding,
        qrCodeDataUrl,
        options
      );

      // Generate PDF
      const pdfResult = await Print.printToFileAsync({
        html: htmlContent,
        width: options.pageFormat === 'Letter' ? 612 : 595,
        height: options.pageFormat === 'Letter' ? 792 : 842,
        base64: false,
      });

      // Upload to Supabase Storage
      const storagePath = await this.uploadPdfToStorage(
        pdfResult.uri,
        invoice.id,
        invoice.preschool_id
      );

      return storagePath;
    } catch (_error) {
      console.error('Error generating PDF:', _error);
      throw new Error(`Failed to generate PDF: ${_error.message}`);
    }
  }

  /**
   * Share PDF via native sharing
   */
  async sharePdf(pdfUri: string, invoiceNumber: string): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share Invoice ${invoiceNumber}`,
      });
    } catch (_error) {
      console.error('Error sharing PDF:', _error);
      throw error;
    }
  }

  /**
   * Generate payment QR code
   */
  private async generatePaymentQR(invoice: Invoice): Promise<string> {
    try {
      // Create payment URL or data for QR code
      const paymentData = {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.total_amount,
        currency: 'ZAR',
        description: `Payment for Invoice ${invoice.invoice_number}`,
        // Add PayFast or other payment gateway specific data
      };

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(paymentData), {
        width: 150,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return qrCodeDataUrl;
    } catch (_error) {
      console.error('Error generating QR code:', _error);
      return '';
    }
  }

  /**
   * Upload PDF to Supabase Storage
   */
  private async uploadPdfToStorage(
    localUri: string,
    invoiceId: string,
    preschoolId: string
  ): Promise<string> {
    try {
      // Read file as base64
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        throw new Error('PDF file does not exist');
      }

      const base64Data = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `invoice-${invoiceId}-${timestamp}.pdf`;
      const storagePath = `invoices/${preschoolId}/${filename}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('invoice-pdfs')
        .upload(storagePath, base64Data, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('invoice-pdfs')
        .getPublicUrl(storagePath);

      return urlData.publicUrl;
    } catch (_error) {
      console.error('Error uploading PDF:', _error);
      throw error;
    }
  }

  /**
   * Create HTML template for PDF
   */
  private async createHtmlTemplate(
    invoice: Invoice,
    items: InvoiceItem[],
    branding: SchoolBranding,
    qrCodeDataUrl: string,
    options: PdfGenerationOptions
  ): Promise<string> {
    const {
      primary_color = '#3B82F6',
      secondary_color = '#64748B',
      logo_url,
      footer_text = 'Thank you for your business',
      payment_terms = '30 days',
      tax_number,
      accepted_payment_methods = [],
    } = branding;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalTax = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unit_price;
      const taxAmount = itemSubtotal * ((item.tax_rate || 0) / 100);
      return sum + taxAmount;
    }, 0);
    const grandTotal = subtotal + totalTax;

    // Format dates
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    };

    // Format currency
    const formatCurrency = (amount: number) => {
      return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Generate watermark CSS based on status
    const getWatermarkStyles = () => {
      if (!options.watermark) return '';
      
      const watermarkText = options.watermark.toUpperCase();
      const watermarkColor = {
        draft: 'rgba(107, 114, 128, 0.1)',
        paid: 'rgba(16, 185, 129, 0.1)',
        overdue: 'rgba(239, 68, 68, 0.1)',
        cancelled: 'rgba(107, 114, 128, 0.2)',
      }[options.watermark];

      return `
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 120px;
          font-weight: bold;
          color: ${watermarkColor};
          z-index: -1;
          pointer-events: none;
        }
        .watermark::before {
          content: '${watermarkText}';
        }
      `;
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice ${invoice.invoice_number}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            color: #374151;
            font-size: 14px;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            position: relative;
        }
        
        ${getWatermarkStyles()}
        
        .invoice-header {
            background: ${primary_color};
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .school-info {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .school-logo {
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
        }
        
        .school-details h1 {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .school-details p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .invoice-title {
            text-align: right;
        }
        
        .invoice-title h2 {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .invoice-title p {
            font-size: 18px;
            opacity: 0.9;
        }
        
        .invoice-body {
            background: white;
            padding: 40px;
            border: 1px solid #e5e7eb;
            border-top: none;
        }
        
        .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        
        .bill-to h3, .invoice-info h3 {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
            border-bottom: 2px solid ${secondary_color};
            padding-bottom: 5px;
        }
        
        .bill-to p, .invoice-info p {
            margin-bottom: 5px;
        }
        
        .invoice-info {
            text-align: right;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        .items-table th {
            background: #f9fafb;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid ${secondary_color};
        }
        
        .items-table th:last-child,
        .items-table td:last-child {
            text-align: right;
        }
        
        .items-table td {
            padding: 15px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .items-table tr:hover {
            background: #f9fafb;
        }
        
        .totals-section {
            float: right;
            width: 300px;
            margin-bottom: 30px;
        }
        
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
        }
        
        .totals-row.subtotal {
            border-top: 1px solid #e5e7eb;
        }
        
        .totals-row.total {
            border-top: 2px solid ${primary_color};
            font-size: 18px;
            font-weight: bold;
            color: ${primary_color};
        }
        
        .payment-info {
            clear: both;
            background: #f9fafb;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        
        .payment-methods {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            align-items: start;
        }
        
        .payment-methods h4 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #1f2937;
        }
        
        .payment-methods ul {
            list-style: none;
        }
        
        .payment-methods li {
            padding: 5px 0;
            color: #6b7280;
        }
        
        .qr-code {
            text-align: center;
        }
        
        .qr-code img {
            border: 2px solid ${secondary_color};
            border-radius: 8px;
            padding: 10px;
            background: white;
        }
        
        .qr-code p {
            margin-top: 10px;
            font-size: 12px;
            color: #6b7280;
        }
        
        .terms-section {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        
        .terms-section h4 {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 10px;
            color: #1f2937;
        }
        
        .terms-section p {
            font-size: 12px;
            color: #6b7280;
            line-height: 1.5;
        }
        
        .invoice-footer {
            text-align: center;
            padding: 30px 0;
            border-top: 1px solid #e5e7eb;
            color: ${secondary_color};
        }
        
        .invoice-footer p {
            margin-bottom: 10px;
        }
        
        .tax-info {
            font-size: 12px;
            color: #9ca3af;
        }
        
        @media print {
            .invoice-container {
                max-width: none;
                margin: 0;
                padding: 20px;
            }
            
            body {
                font-size: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        ${options.watermark ? '<div class="watermark"></div>' : ''}
        
        <!-- Header -->
        <div class="invoice-header">
            <div class="school-info">
                ${logo_url 
                  ? `<img src="${logo_url}" alt="School Logo" class="school-logo" style="width: 80px; height: 80px; object-fit: contain; border-radius: 8px; background: rgba(255,255,255,0.1); padding: 10px;">` 
                  : `<div class="school-logo">LOGO</div>`
                }
                <div class="school-details">
                    <h1>${invoice.preschool?.name || 'School Name'}</h1>
                    <p>Educational Invoice</p>
                </div>
            </div>
            <div class="invoice-title">
                <h2>INVOICE</h2>
                <p>${invoice.invoice_number}</p>
            </div>
        </div>
        
        <!-- Body -->
        <div class="invoice-body">
            <!-- Details -->
            <div class="invoice-details">
                <div class="bill-to">
                    <h3>Bill To:</h3>
                    <p><strong>${invoice.student?.parent?.first_name || ''} ${invoice.student?.parent?.last_name || ''}</strong></p>
                    <p>Parent/Guardian</p>
                    <p><strong>For:</strong> ${invoice.student?.first_name || ''} ${invoice.student?.last_name || ''}</p>
                    ${invoice.student?.parent?.email ? `<p>Email: ${invoice.student.parent.email}</p>` : ''}
                    ${invoice.student?.parent?.phone ? `<p>Phone: ${invoice.student.parent.phone}</p>` : ''}
                </div>
                <div class="invoice-info">
                    <h3>Invoice Information:</h3>
                    <p><strong>Invoice Date:</strong> ${formatDate(invoice.issue_date)}</p>
                    <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
                    <p><strong>Payment Terms:</strong> ${payment_terms}</p>
                    ${invoice.payment_status !== 'paid' 
                      ? `<p><strong>Amount Due:</strong> ${formatCurrency(invoice.total_amount - (invoice.paid_amount || 0))}</p>` 
                      : `<p style="color: #10b981;"><strong>PAID IN FULL</strong></p>`
                    }
                </div>
            </div>
            
            <!-- Items -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Type</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Tax Rate</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => {
                      const itemTotal = item.quantity * item.unit_price;
                      const taxAmount = itemTotal * ((item.tax_rate || 0) / 100);
                      const lineTotal = itemTotal + taxAmount;
                      
                      return `
                        <tr>
                            <td><strong>${item.description}</strong></td>
                            <td>${item.item_type || 'Service'}</td>
                            <td>${item.quantity}</td>
                            <td>${formatCurrency(item.unit_price)}</td>
                            <td>${item.tax_rate || 0}%</td>
                            <td>${formatCurrency(lineTotal)}</td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>
            
            <!-- Totals -->
            <div class="totals-section">
                <div class="totals-row subtotal">
                    <span>Subtotal:</span>
                    <span>${formatCurrency(subtotal)}</span>
                </div>
                ${totalTax > 0 ? `
                <div class="totals-row">
                    <span>VAT (${tax_number ? 'Reg: ' + tax_number : 'Various rates'}):</span>
                    <span>${formatCurrency(totalTax)}</span>
                </div>
                ` : ''}
                <div class="totals-row total">
                    <span>Total Amount:</span>
                    <span>${formatCurrency(grandTotal)}</span>
                </div>
                ${invoice.paid_amount > 0 ? `
                <div class="totals-row" style="color: #10b981;">
                    <span>Paid Amount:</span>
                    <span>-${formatCurrency(invoice.paid_amount)}</span>
                </div>
                <div class="totals-row total" style="color: #ef4444;">
                    <span>Balance Due:</span>
                    <span>${formatCurrency(grandTotal - invoice.paid_amount)}</span>
                </div>
                ` : ''}
            </div>
            
            <!-- Payment Information -->
            ${accepted_payment_methods.length > 0 || qrCodeDataUrl ? `
            <div class="payment-info">
                <h4 style="text-align: center; margin-bottom: 20px;">Payment Information</h4>
                <div class="payment-methods">
                    <div>
                        <h4>Accepted Payment Methods:</h4>
                        <ul>
                            ${accepted_payment_methods.map(method => {
                              const methodNames = {
                                cash: 'Cash payments at school',
                                bank_transfer: 'Bank transfer/EFT',
                                debit_order: 'Debit order',
                                online: 'Online payment (cards)',
                                check: 'Bank cheque',
                                eft: 'Electronic funds transfer',
                              };
                              return `<li>• ${methodNames[method] || method}</li>`;
                            }).join('')}
                        </ul>
                    </div>
                    ${qrCodeDataUrl ? `
                    <div class="qr-code">
                        <img src="${qrCodeDataUrl}" alt="Payment QR Code" width="120" height="120">
                        <p>Scan to pay online</p>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <!-- Terms and Notes -->
            ${payment_terms || invoice.notes ? `
            <div class="terms-section">
                ${payment_terms ? `
                <h4>Payment Terms:</h4>
                <p>${payment_terms}</p>
                ` : ''}
                ${invoice.notes ? `
                <h4>Notes:</h4>
                <p>${invoice.notes}</p>
                ` : ''}
            </div>
            ` : ''}
        </div>
        
        <!-- Footer -->
        ${options.includeFooter !== false ? `
        <div class="invoice-footer">
            ${footer_text ? `<p><em>${footer_text}</em></p>` : ''}
            ${tax_number ? `<p class="tax-info">VAT Registration Number: ${tax_number}</p>` : ''}
            <p class="tax-info">Generated on ${formatDate(new Date().toISOString())} | Invoice ID: ${invoice.id}</p>
        </div>
        ` : ''}
    </div>
</body>
</html>
    `;
  }
}

// Export singleton instance
export const invoicePdfGenerator = InvoicePdfGenerator.getInstance();