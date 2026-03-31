import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';

export interface DataConsentPreferences {
  customerData: boolean;
  productData: boolean;
  geographicData: boolean;
  segmentationData: boolean;
  performanceMetrics: boolean;
}

const DEFAULT_PREFERENCES: DataConsentPreferences = {
  customerData: true,
  productData: true,
  geographicData: true,
  segmentationData: true,
  performanceMetrics: true,
};

/**
 * Hook para manejar el consentimiento de datos en Alliance Market
 * Guarda y recupera las preferencias del usuario por empresa
 */
export function useAllianceMarketConsent() {
  const { currentCompany } = useCompany();
  const [preferences, setPreferences] = useState<DataConsentPreferences>(DEFAULT_PREFERENCES);
  const [hasConsented, setHasConsented] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (!currentCompany?.id) {
      setIsLoading(false);
      return;
    }

    const loadPreferences = async () => {
      const storageKey = `alliance-market-consent-${currentCompany.id}`;
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setPreferences(parsed);
          setHasConsented(true);
          setShowDialog(false);
        } catch (error) {
          console.error('Error loading consent preferences:', error);
          setShowDialog(true);
        }
      } else {
        // First time - show dialog
        setShowDialog(true);
      }

      setIsLoading(false);
    };

    loadPreferences();
  }, [currentCompany?.id]);

  const savePreferences = async (newPreferences: DataConsentPreferences) => {
    if (!currentCompany?.id) return;

    try {
      const storageKey = `alliance-market-consent-${currentCompany.id}`;
      localStorage.setItem(storageKey, JSON.stringify(newPreferences));

      // Also save to Supabase for audit trail if table exists
      try {
        const supabaseClient = supabase as any;
        await supabaseClient
          .from('alliance_market_data_consent')
          .insert({
            company_id: currentCompany.id,
            customer_data: newPreferences.customerData,
            product_data: newPreferences.productData,
            geographic_data: newPreferences.geographicData,
            segmentation_data: newPreferences.segmentationData,
            performance_metrics: newPreferences.performanceMetrics,
            timestamp: new Date().toISOString(),
          });
      } catch (error) {
        // Table doesn't exist, just use localStorage
        console.log('Consent table not available, using localStorage only');
      }

      setPreferences(newPreferences);
      setHasConsented(true);
      setShowDialog(false);
    } catch (error) {
      console.error('Error saving consent preferences:', error);
      throw error;
    }
  };

  const resetConsent = () => {
    if (!currentCompany?.id) return;
    const storageKey = `alliance-market-consent-${currentCompany.id}`;
    localStorage.removeItem(storageKey);
    setHasConsented(false);
    setShowDialog(true);
    setPreferences(DEFAULT_PREFERENCES);
  };

  return {
    preferences,
    hasConsented,
    isLoading,
    showDialog,
    setShowDialog,
    savePreferences,
    resetConsent,
  };
}
