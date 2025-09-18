import React, { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { Invoice } from '../../../types/invoice';
import { InvoiceCard } from './InvoiceCard';

interface InvoiceListProps {
  invoices: Invoice[];
  loading: boolean;
  selectedInvoices: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onInvoicePress: (invoice: Invoice) => void;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  loadingMore?: boolean;
}

export function InvoiceList({
  invoices,
  loading,
  selectedInvoices,
  onSelectionChange,
  onInvoicePress,
  onLoadMore,
  hasNextPage = false,
  loadingMore = false,
}: InvoiceListProps) {
  const [selectionMode, setSelectionMode] = useState(false);

  const toggleInvoiceSelection = (invoiceId: string) => {
    const isSelected = selectedInvoices.includes(invoiceId);
    let newSelection: string[];

    if (isSelected) {
      newSelection = selectedInvoices.filter(id => id !== invoiceId);
    } else {
      newSelection = [...selectedInvoices, invoiceId];
    }

    onSelectionChange(newSelection);

    // Exit selection mode if no items selected
    if (newSelection.length === 0) {
      setSelectionMode(false);
    }
  };

  const handleInvoicePress = (invoice: Invoice) => {
    if (selectionMode) {
      toggleInvoiceSelection(invoice.id);
    } else {
      onInvoicePress(invoice);
    }
  };

  const handleInvoiceLongPress = (invoice: Invoice) => {
    if (!selectionMode) {
      setSelectionMode(true);
      onSelectionChange([invoice.id]);
    }
  };

  const selectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      // Deselect all
      onSelectionChange([]);
      setSelectionMode(false);
    } else {
      // Select all
      onSelectionChange(invoices.map(invoice => invoice.id));
    }
  };

  const renderInvoice = ({ item: invoice, index }: { item: Invoice; index: number }) => {
    const isSelected = selectedInvoices.includes(invoice.id);
    
    return (
      <InvoiceCard
        invoice={invoice}
        selected={isSelected}
        selectionMode={selectionMode}
        onPress={() => handleInvoicePress(invoice)}
        onLongPress={() => handleInvoiceLongPress(invoice)}
        index={index}
      />
    );
  };

  const renderLoadingFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text className="text-gray-500 text-sm mt-2">Loading more invoices...</Text>
      </View>
    );
  };

  const renderEmptyComponent = () => {
    if (loading) {
      return (
        <View className="flex-1 items-center justify-center py-8">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-500 mt-4">Loading invoices...</Text>
        </View>
      );
    }

    return null; // Empty state is handled in parent component
  };

  const handleEndReached = () => {
    if (hasNextPage && !loadingMore && onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <View className="flex-1">
      {/* Selection Header */}
      {selectionMode && (
        <View className="flex-row items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <View>
            <Text className="text-blue-900 font-semibold">
              {selectedInvoices.length} of {invoices.length} selected
            </Text>
            <Text className="text-blue-700 text-sm">
              Tap invoices to select, or tap actions below
            </Text>
          </View>
          <View className="flex-row space-x-2">
            <Text
              onPress={selectAll}
              className="text-blue-600 font-medium px-3 py-2 bg-white rounded-lg border border-blue-300"
            >
              {selectedInvoices.length === invoices.length ? 'Deselect All' : 'Select All'}
            </Text>
            <Text
              onPress={() => {
                setSelectionMode(false);
                onSelectionChange([]);
              }}
              className="text-gray-600 font-medium px-3 py-2 bg-white rounded-lg border border-gray-300"
            >
              Cancel
            </Text>
          </View>
        </View>
      )}

      {/* Invoice List */}
      <FlashList
        data={invoices}
        renderItem={renderInvoice}
        estimatedItemSize={120} // Approximate height of InvoiceCard
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderLoadingFooter}
        ListEmptyComponent={renderEmptyComponent}
        refreshing={loading}
        extraData={selectedInvoices} // Ensure re-render when selection changes
        getItemType={() => 'invoice'} // All items are the same type
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={15}
        windowSize={10}
      />

      {/* Selection Mode Hint */}
      {!selectionMode && invoices.length > 0 && (
        <View className="mt-4 p-3 bg-gray-50 rounded-lg">
          <Text className="text-gray-600 text-center text-sm">
            💡 Long press any invoice to enter selection mode for bulk actions
          </Text>
        </View>
      )}
    </View>
  );
}