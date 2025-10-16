import React from 'react';

export interface Props {
  visible: boolean;
  onClose?: () => void;
  onFallback?: () => void;
}

// Deprecated: replaced by DashVoiceMode
export const RealtimeVoiceOverlay: React.FC<Props> = () => null;
export default RealtimeVoiceOverlay;
