import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';

import { Card, Button, Switch, Select, LoadingSpinner } from '../../../components/ui';
import { useAuth } from '../../../contexts/AuthContext';
import { Invoice, InvoiceItem, SchoolBranding } from '../../../types/invoice';
import { invoiceService } from '../../../services/invoiceService';
import { invoicePdfGenerator, PdfGenerationOptions } from './InvoicePdfGenerator';

interface PdfPreviewProps {
  invoice: Invoice;
  onClose?: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function PdfPreview({ invoice, onClose }: PdfPreviewProps) {
  const { profile } = useAuth();
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [generatedPdfUri, setGeneratedPdfUri] = useState<string>('');
  const [options, setOptions] = useState<PdfGenerationOptions>({
    watermark: invoice.status === 'draft' ? 'draft' : 
               invoice.status === 'paid' ? 'paid' : 
               invoice.status === 'overdue' ? 'overdue' : undefined,
    includePaymentQR: invoice.status !== 'paid',
    includeFooter: true,
    pageFormat: 'A4',
    orientation: 'portrait',
  });

  // Fetch invoice items
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['invoice-items', invoice.id],
    queryFn: () => invoiceService.getInvoiceItems(invoice.id),
  });

  // Fetch school branding
  const { data: branding, isLoading: brandingLoading } = useQuery({
    queryKey: ['school-branding', profile?.preschool_id],
    queryFn: () => invoiceService.getSchoolBranding(profile!.preschool_id!),
    enabled: !!profile?.preschool_id,
  });

  // Generate PDF mutation
  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      if (!items.length || !branding) {
        throw new Error('Missing required data');
      }
      return await invoicePdfGenerator.generateInvoicePdf(invoice, items, branding, options);
    },
    onSuccess: (pdfUrl) => {
      setGeneratedPdfUri(pdfUrl);
      Alert.alert('Success', 'PDF generated successfully!');
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to generate PDF: ${_error.message}`);
    },
  });

  // Share PDF mutation
  const sharePdfMutation = useMutation({
    mutationFn: async (pdfUri: string) => {
      await invoicePdfGenerator.sharePdf(pdfUri, invoice.invoice_number);
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to share PDF: ${_error.message}`);
    },
  });

  // Generate preview HTML when data is ready
  useEffect(() => {
    const generatePreview = async () => {
      if (items.length > 0 && branding) {
        try {
          // Generate QR code if needed
          let qrCodeDataUrl = '';
          if (options.includePaymentQR) {
            // Use a simple placeholder for preview
            qrCodeDataUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzAwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTAiPlFSIENvZGU8L3RleHQ+PC9zdmc+';
          }

          // Create preview HTML (similar to PDF generator but optimized for mobile)
          const html = await createPreviewHtml(invoice, items, branding, qrCodeDataUrl, options);
          setPreviewHtml(html);
        } catch (_error) {
          console.error('Error generating preview:', _error);
        }
      }
    };

    generatePreview();
  }, [items, branding, options, invoice]);

  const createPreviewHtml = async (
    invoice: Invoice,
    items: InvoiceItem[],
    branding: SchoolBranding,
    qrCodeDataUrl: string,
    options: PdfGenerationOptions
  ) => {
    // This is a simplified version of the PDF HTML for mobile preview
    const {
      primary_color = '#3B82F6',
      secondary_color = '#64748B',
      logo_url,
      footer_text = 'Thank you for your business',
      payment_terms = '30 days',
      tax_number,
      accepted_payment_methods = [],
    } = branding;

    const formatCurrency = (amount: number) => {
      return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    };

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalTax = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unit_price;
      const taxAmount = itemSubtotal * ((item.tax_rate || 0) / 100);
      return sum + taxAmount;
    }, 0);
    const grandTotal = subtotal + totalTax;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #374151; background: #f9fafb; }
        .container { padding: 10px; max-width: 100%; }
        .card { background: white; border-radius: 8px; margin-bottom: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header { background: ${primary_color}; color: white; padding: 20px; text-align: center; }
        .header h1 { font-size: 18px; margin-bottom: 5px; }
        .header p { font-size: 14px; opacity: 0.9; }
        .content { padding: 15px; }
        .section { margin-bottom: 15px; }
        .section h3 { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #1f2937; border-bottom: 1px solid ${secondary_color}; padding-bottom: 3px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .item { background: #f9fafb; padding: 10px; border-radius: 4px; margin-bottom: 5px; }
        .total { background: ${primary_color}; color: white; padding: 10px; text-align: center; font-weight: bold; }
        ${options.watermark ? `
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 48px;
            font-weight: bold;
            color: rgba(0,0,0,0.05);
            z-index: -1;
            pointer-events: none;
        }
        .watermark::before { content: '${options.watermark?.toUpperCase()}'; }
        ` : ''}
    </style>
</head>
<body>
    <div class="container">
        ${options.watermark ? '<div class="watermark"></div>' : ''}
        
        <div class="card">
            <div class="header">
                <h1>INVOICE ${invoice.invoice_number}</h1>
                <p>${invoice.preschool?.name || 'School Name'}</p>
            </div>
        </div>

        <div class="card">
            <div class="content">
                <div class="section">
                    <h3>Bill To</h3>
                    <p><strong>${invoice.student?.parent?.first_name || ''} ${invoice.student?.parent?.last_name || ''}</strong></p>
                    <p>For: ${invoice.student?.first_name || ''} ${invoice.student?.last_name || ''}</p>
                </div>
                
                <div class="section">
                    <h3>Invoice Details</h3>
                    <div class="grid">
                        <div><strong>Date:</strong> ${formatDate(invoice.issue_date)}</div>
                        <div><strong>Due:</strong> ${formatDate(invoice.due_date)}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="content">
                <div class="section">
                    <h3>Items</h3>
                    ${items.map(item => `
                        <div class="item">
                            <strong>${item.description}</strong><br>
                            ${item.quantity} × ${formatCurrency(item.unit_price)} = ${formatCurrency(item.quantity * item.unit_price)}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="total">
                Total: ${formatCurrency(grandTotal)}
            </div>
        </div>

        ${qrCodeDataUrl && options.includePaymentQR ? `
        <div class="card">
            <div class="content" style="text-align: center;">
                <h3>Quick Payment</h3>
                <img src="${qrCodeDataUrl}" width="80" height="80" style="margin: 10px;">
                <p style="font-size: 10px; color: #6b7280;">Scan to pay online</p>
            </div>
        </div>
        ` : ''}
    </div>
</body>
</html>
    `;
  };

  const handleGeneratePdf = () => {
    generatePdfMutation.mutate();
  };

  const handleSharePdf = () => {
    if (generatedPdfUri) {
      sharePdfMutation.mutate(generatedPdfUri);
    } else {
      Alert.alert('Error', 'Please generate PDF first');
    }
  };

  const handleDownloadPdf = async () => {
    if (!generatedPdfUri) {
      Alert.alert('Error', 'Please generate PDF first');
      return;
    }

    try {
      const downloadDir = FileSystem.documentDirectory + 'Downloads/';
      await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      
      const filename = `invoice-${invoice.invoice_number}.pdf`;
      const localUri = downloadDir + filename;
      
      const downloadResult = await FileSystem.downloadAsync(generatedPdfUri, localUri);
      
      if (downloadResult.status === 200) {
        Alert.alert('Success', `PDF downloaded to ${localUri}`);
      } else {
        throw new Error('Download failed');
      }
    } catch (_error) {
      Alert.alert('Error', `Failed to download PDF: ${_error.message}`);
    }
  };

  if (itemsLoading || brandingLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 p-4">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-xl font-bold text-gray-900">PDF Preview</Text>
            <Text className="text-gray-600">Invoice {invoice.invoice_number}</Text>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} className="p-2">
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* PDF Options */}
        <Card className="p-4 mb-4">
          <Text className="font-semibold text-gray-900 mb-3">PDF Options</Text>
          
          <View className="space-y-4">
            {/* Watermark */}
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-700">Watermark</Text>
              <Select
                value={options.watermark || ''}
                onSelect={(value) => setOptions(prev => ({ ...prev, watermark: value as any }))}
                options={[
                  { label: 'None', value: '' },
                  { label: 'Draft', value: 'draft' },
                  { label: 'Paid', value: 'paid' },
                  { label: 'Overdue', value: 'overdue' },
                  { label: 'Cancelled', value: 'cancelled' },
                ]}
              />
            </View>

            {/* Payment QR */}
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-700">Include Payment QR Code</Text>
              <Switch
                value={options.includePaymentQR || false}
                onValueChange={(value) => setOptions(prev => ({ ...prev, includePaymentQR: value }))}
              />
            </View>

            {/* Footer */}
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-700">Include Footer</Text>
              <Switch
                value={options.includeFooter !== false}
                onValueChange={(value) => setOptions(prev => ({ ...prev, includeFooter: value }))}
              />
            </View>

            {/* Page Format */}
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-700">Page Format</Text>
              <Select
                value={options.pageFormat || 'A4'}
                onSelect={(value) => setOptions(prev => ({ ...prev, pageFormat: value as any }))}
                options={[
                  { label: 'A4', value: 'A4' },
                  { label: 'Letter', value: 'Letter' },
                ]}
              />
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View className="flex-row space-x-3">
          <Button
            onPress={handleGeneratePdf}
            loading={generatePdfMutation.isLoading}
            className="flex-1 bg-blue-600"
          >
            <View className="flex-row items-center space-x-2">
              <Ionicons name="document-text" size={16} color="white" />
              <Text className="text-white font-medium">Generate PDF</Text>
            </View>
          </Button>

          <Button
            onPress={handleSharePdf}
            loading={sharePdfMutation.isLoading}
            disabled={!generatedPdfUri}
            variant="outline"
          >
            <Ionicons name="share" size={16} color={generatedPdfUri ? "#3B82F6" : "#9CA3AF"} />
          </Button>

          <Button
            onPress={handleDownloadPdf}
            disabled={!generatedPdfUri}
            variant="outline"
          >
            <Ionicons name="download" size={16} color={generatedPdfUri ? "#3B82F6" : "#9CA3AF"} />
          </Button>
        </View>
      </View>

      {/* Preview */}
      <View className="flex-1">
        {previewHtml ? (
          <WebView
            source={{ html: previewHtml }}
            style={{ flex: 1 }}
            scalesPageToFit={true}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 items-center justify-center p-8">
            <Ionicons name="document-outline" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 text-center mt-4">
              Loading preview...
            </Text>
          </View>
        )}
      </View>

      {/* Status Messages */}
      {generatePdfMutation.isSuccess && (
        <View className="bg-green-100 p-3 border-t border-green-200">
          <View className="flex-row items-center space-x-2">
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text className="text-green-800 font-medium">PDF generated successfully!</Text>
          </View>
        </View>
      )}
    </View>
  );
}