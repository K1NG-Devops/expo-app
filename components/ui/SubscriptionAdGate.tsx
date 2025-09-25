import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface SubscriptionAdGateProps {
  children: React.ReactNode;
  /** Override the default subscription check */
  forceShow?: boolean;
  /** Hide instead of show when subscription is active */
  inverseLogic?: boolean;
}

/**
 * SubscriptionAdGate - Only shows children when user has free tier (or conditions are met)
 * Used to conditionally display ads based on subscription status
 */
const SubscriptionAdGate: React.FC<SubscriptionAdGateProps> = ({
  children,
  forceShow = false,
  inverseLogic = false,
}) => {
  const { tier, ready: subscriptionReady } = useSubscription();

  // Force show for testing/debug purposes
  if (forceShow) {
    return <>{children}</>;
  }

  // Don't render anything until subscription status is loaded
  if (!subscriptionReady) {
    return null;
  }

  const shouldShowAds = tier === 'free';
  const shouldRender = inverseLogic ? !shouldShowAds : shouldShowAds;

  if (!shouldRender) {
    return null;
  }

  return <>{children}</>;
};

export default SubscriptionAdGate;