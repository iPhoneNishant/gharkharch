/**
 * React Hook for SMS Auto-Detection
 * 
 * Provides easy-to-use hook for automatic transaction detection from SMS
 * 
 * Example usage:
 * ```tsx
 * const { processSms, isProcessing, result } = useSmsAutoDetection();
 * 
 * const handleProcess = async () => {
 *   await processSms({ limit: 50 });
 * };
 * ```
 */

import { useState, useCallback } from 'react';
import {
  autoDetectTransactions,
  AutoTransactionResult,
  AutoTransactionOptions,
} from '../services/smsAutoTransactionService';

export interface UseSmsAutoDetectionReturn {
  /** Process SMS and create transactions */
  processSms: (options?: AutoTransactionOptions) => Promise<AutoTransactionResult>;
  /** Whether processing is in progress */
  isProcessing: boolean;
  /** Last processing result */
  result: AutoTransactionResult | null;
  /** Error message if any */
  error: string | null;
  /** Clear error state */
  clearError: () => void;
}

export function useSmsAutoDetection(): UseSmsAutoDetectionReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AutoTransactionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processSms = useCallback(async (options?: AutoTransactionOptions) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await autoDetectTransactions(options);
      setResult(result);
      
      if (!result.success && result.errors && result.errors.length > 0) {
        setError(result.errors.join(', '));
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setResult({
        success: false,
        processedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        errors: [errorMessage],
      });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    processSms,
    isProcessing,
    result,
    error,
    clearError,
  };
}
