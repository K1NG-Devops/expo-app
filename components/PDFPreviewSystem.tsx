/**
 * PDF Preview System
 * 
 * Comprehensive PDF preview component with zoom, page navigation,
 * annotation capabilities, and real-time editing support.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
  Alert,
  Modal,
  TextInput,
  StyleSheet
} from 'react-native';
import {
  PanGestureHandler,
  PinchGestureHandler,
  State
} from 'react-native-gesture-handler';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { enhancedPDFEngine, type PDFDocument, type PDFPreviewOptions } from '@/lib/services/EnhancedPDFEngine';
import { trackAssistantEvent, generateCorrelationId } from '@/lib/monitoring';

// ====================================================================
// TYPES & INTERFACES
// ====================================================================

export interface PDFAnnotation {
  id: string;
  type: 'highlight' | 'note' | 'drawing' | 'stamp';
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color: string;
  author: string;
  createdAt: number;
  modifiedAt?: number;
}

export interface PDFPreviewProps {
  document: PDFDocument;
  uri?: string;
  initialPage?: number;
  initialZoom?: number;
  allowAnnotations?: boolean;
  allowEditing?: boolean;
  onAnnotationAdd?: (annotation: PDFAnnotation) => void;
  onAnnotationUpdate?: (annotation: PDFAnnotation) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  onDocumentChange?: (document: PDFDocument) => void;
  onError?: (error: string) => void;
}

export interface PDFViewState {
  currentPage: number;
  totalPages: number;
  scale: number;
  isLoading: boolean;
  error?: string;
  annotations: PDFAnnotation[];
  selectedAnnotation?: string;
  editMode: boolean;
}

// ====================================================================
// PDF PREVIEW COMPONENT
// ====================================================================

export const PDFPreviewSystem: React.FC<PDFPreviewProps> = ({
  document,
  uri,
  initialPage = 1,
  initialZoom = 1.0,
  allowAnnotations = true,
  allowEditing = false,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  onDocumentChange,
  onError
}) => {
  const [viewState, setViewState] = useState<PDFViewState>({
    currentPage: initialPage,
    totalPages: 1,
    scale: initialZoom,
    isLoading: true,
    annotations: [],
    editMode: false
  });

  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Partial<PDFAnnotation>>({});
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [previewUri, setPreviewUri] = useState<string | null>(uri || null);

  const webViewRef = useRef<WebView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const correlationId = useRef(generateCorrelationId());

  // ====================================================================
  // INITIALIZATION & EFFECTS
  // ====================================================================

  useEffect(() => {
    initializePreview();
    
    trackAssistantEvent('pdf.preview.open', {
      correlation_id: correlationId.current,
      document_id: document.id,
      allow_annotations: allowAnnotations,
      allow_editing: allowEditing
    });

    return () => {
      trackAssistantEvent('pdf.preview.close', {
        correlation_id: correlationId.current,
        duration: Date.now() - document.metadata.createdAt
      });
    };
  }, [document]);

  const initializePreview = async () => {
    try {
      setViewState(prev => ({ ...prev, isLoading: true, error: undefined }));

      let pdfUri = previewUri;
      
      if (!pdfUri) {
        // Generate PDF if no URI provided
        const result = await enhancedPDFEngine.generatePDF(document, {
          preview: true,
          saveToFile: false
        });
        pdfUri = result.uri;
        setPreviewUri(pdfUri);
        setViewState(prev => ({ ...prev, totalPages: result.pages }));
      }

      // Load existing annotations
      await loadAnnotations();

      setViewState(prev => ({ 
        ...prev, 
        isLoading: false 
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load PDF preview';
      setViewState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  };

  const loadAnnotations = async () => {
    try {
      // Load annotations from storage or document metadata
      const annotations: PDFAnnotation[] = []; // TODO: Implement storage
      setViewState(prev => ({ ...prev, annotations }));
    } catch (error) {
      console.warn('Failed to load annotations:', error);
    }
  };

  // ====================================================================
  // NAVIGATION CONTROLS
  // ====================================================================

  const goToPage = (page: number) => {
    if (page >= 1 && page <= viewState.totalPages) {
      setViewState(prev => ({ ...prev, currentPage: page }));
      
      // Inject JavaScript to scroll to page
      webViewRef.current?.injectJavaScript(`
        window.scrollTo(0, (${page - 1}) * window.innerHeight);
      `);

      trackAssistantEvent('pdf.preview.navigate', {
        correlation_id: correlationId.current,
        page: page,
        total_pages: viewState.totalPages
      });
    }
  };

  const nextPage = () => goToPage(viewState.currentPage + 1);
  const prevPage = () => goToPage(viewState.currentPage - 1);

  // ====================================================================
  // ZOOM CONTROLS
  // ====================================================================

  const setZoom = (newScale: number) => {
    const clampedScale = Math.max(0.5, Math.min(3.0, newScale));
    setViewState(prev => ({ ...prev, scale: clampedScale }));
    
    webViewRef.current?.injectJavaScript(`
      document.body.style.zoom = "${clampedScale}";
    `);

    trackAssistantEvent('pdf.preview.zoom', {
      correlation_id: correlationId.current,
      scale: clampedScale
    });
  };

  const zoomIn = () => setZoom(viewState.scale + 0.25);
  const zoomOut = () => setZoom(viewState.scale - 0.25);
  const resetZoom = () => setZoom(1.0);

  // ====================================================================
  // ANNOTATION SYSTEM
  // ====================================================================

  const addAnnotation = (type: PDFAnnotation['type'], x: number, y: number) => {
    if (!allowAnnotations) return;

    const annotation: PDFAnnotation = {
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      page: viewState.currentPage,
      x,
      y,
      color: '#ff0000',
      author: 'Current User', // TODO: Get from user context
      createdAt: Date.now()
    };

    setCurrentAnnotation(annotation);
    setShowAnnotationModal(true);
  };

  const saveAnnotation = () => {
    if (!currentAnnotation.id) return;

    const annotation = currentAnnotation as PDFAnnotation;
    
    setViewState(prev => ({
      ...prev,
      annotations: [...prev.annotations, annotation]
    }));

    onAnnotationAdd?.(annotation);
    setShowAnnotationModal(false);
    setCurrentAnnotation({});

    trackAssistantEvent('pdf.annotation.add', {
      correlation_id: correlationId.current,
      annotation_type: annotation.type,
      page: annotation.page
    });
  };

  const deleteAnnotation = (annotationId: string) => {
    Alert.alert(
      'Delete Annotation',
      'Are you sure you want to delete this annotation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setViewState(prev => ({
              ...prev,
              annotations: prev.annotations.filter(a => a.id !== annotationId)
            }));
            onAnnotationDelete?.(annotationId);
          }
        }
      ]
    );
  };

  // ====================================================================
  // RENDERING METHODS
  // ====================================================================

  const renderToolbar = () => (
    <View style={styles.toolbar}>
      {/* Navigation Controls */}
      <View style={styles.toolbarSection}>
        <TouchableOpacity 
          style={[styles.toolbarButton, { opacity: viewState.currentPage <= 1 ? 0.5 : 1 }]}
          onPress={prevPage}
          disabled={viewState.currentPage <= 1}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.pageInfo}>
          {viewState.currentPage} / {viewState.totalPages}
        </Text>
        
        <TouchableOpacity 
          style={[styles.toolbarButton, { opacity: viewState.currentPage >= viewState.totalPages ? 0.5 : 1 }]}
          onPress={nextPage}
          disabled={viewState.currentPage >= viewState.totalPages}
        >
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Zoom Controls */}
      <View style={styles.toolbarSection}>
        <TouchableOpacity style={styles.toolbarButton} onPress={zoomOut}>
          <Ionicons name="remove" size={20} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.zoomButton} onPress={resetZoom}>
          <Text style={styles.zoomText}>{Math.round(viewState.scale * 100)}%</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.toolbarButton} onPress={zoomIn}>
          <Ionicons name="add" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Annotation Tools */}
      {allowAnnotations && (
        <View style={styles.toolbarSection}>
          <TouchableOpacity 
            style={styles.toolbarButton}
            onPress={() => addAnnotation('highlight', 0, 0)}
          >
            <FontAwesome name="paint-brush" size={18} color="#333" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolbarButton}
            onPress={() => addAnnotation('note', 0, 0)}
          >
            <MaterialIcons name="note-add" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Mode Toggle */}
      {allowEditing && (
        <TouchableOpacity 
          style={[styles.toolbarButton, viewState.editMode && styles.activeButton]}
          onPress={() => setViewState(prev => ({ ...prev, editMode: !prev.editMode }))}
        >
          <MaterialIcons name="edit" size={20} color={viewState.editMode ? "#fff" : "#333"} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderAnnotationModal = () => (
    <Modal
      visible={showAnnotationModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAnnotationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.annotationModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Annotation</Text>
            <TouchableOpacity
              onPress={() => setShowAnnotationModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* Annotation Type */}
            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeSelector}>
              {(['highlight', 'note', 'drawing', 'stamp'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    currentAnnotation.type === type && styles.selectedType
                  ]}
                  onPress={() => setCurrentAnnotation(prev => ({ ...prev, type }))}
                >
                  <Text style={[
                    styles.typeText,
                    currentAnnotation.type === type && styles.selectedTypeText
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Content */}
            {(currentAnnotation.type === 'note' || currentAnnotation.type === 'stamp') && (
              <>
                <Text style={styles.fieldLabel}>Content</Text>
                <TextInput
                  style={styles.contentInput}
                  placeholder="Enter annotation content..."
                  value={currentAnnotation.content || ''}
                  onChangeText={(content) => setCurrentAnnotation(prev => ({ ...prev, content }))}
                  multiline={true}
                  numberOfLines={3}
                />
              </>
            )}

            {/* Color Picker */}
            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorPicker}>
              {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    currentAnnotation.color === color && styles.selectedColor
                  ]}
                  onPress={() => setCurrentAnnotation(prev => ({ ...prev, color }))}
                />
              ))}
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAnnotationModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveAnnotation}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderLoadingState = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.loadingText}>Loading PDF Preview...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="document-text-outline" size={48} color="#666" />
      <Text style={styles.errorText}>{viewState.error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={initializePreview}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // ====================================================================
  // MAIN RENDER
  // ====================================================================

  if (viewState.isLoading) return renderLoadingState();
  if (viewState.error) return renderErrorState();

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      {toolbarVisible && renderToolbar()}

      {/* PDF Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {previewUri && (
          <WebView
            ref={webViewRef}
            source={{ uri: previewUri }}
            style={styles.webview}
            onLoadEnd={() => setViewState(prev => ({ ...prev, isLoading: false }))}
            onError={() => setViewState(prev => ({ 
              ...prev, 
              error: 'Failed to load PDF content' 
            }))}
            scalesPageToFit={true}
            startInLoadingState={true}
          />
        )}
      </ScrollView>

      {/* Annotation Overlays */}
      {allowAnnotations && (
        <View style={styles.annotationLayer}>
          {viewState.annotations
            .filter(annotation => annotation.page === viewState.currentPage)
            .map(annotation => (
              <TouchableOpacity
                key={annotation.id}
                style={[
                  styles.annotationMarker,
                  {
                    left: annotation.x,
                    top: annotation.y,
                    backgroundColor: annotation.color,
                  }
                ]}
                onPress={() => setViewState(prev => ({ 
                  ...prev, 
                  selectedAnnotation: annotation.id 
                }))}
                onLongPress={() => deleteAnnotation(annotation.id)}
              />
            ))
          }
        </View>
      )}

      {/* Annotation Modal */}
      {renderAnnotationModal()}
    </View>
  );
};

// ====================================================================
// STYLES
// ====================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toolbarSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarButton: {
    padding: 8,
    marginHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  activeButton: {
    backgroundColor: '#007bff',
  },
  pageInfo: {
    marginHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  zoomButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#e9ecef',
  },
  zoomText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  contentContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    minHeight: Dimensions.get('window').height - 100,
  },
  annotationLayer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  annotationMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    opacity: 0.8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  annotationModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 0,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedType: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  typeText: {
    fontSize: 14,
    color: '#666',
  },
  selectedTypeText: {
    color: '#fff',
  },
  contentInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 12,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedColor: {
    borderColor: '#333',
    borderWidth: 3,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#007bff',
  },
  saveButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
});

export default PDFPreviewSystem;