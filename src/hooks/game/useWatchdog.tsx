
import { useEffect, useRef } from 'react';

interface WatchdogOptions {
  timeout: number;         // Time in ms before watchdog triggers
  onTimeout: () => void;   // Function to call when watchdog triggers
  description?: string;    // Description for logging
  enabled?: boolean;       // Whether the watchdog is enabled
}

/**
 * A hook that provides a watchdog timer for detecting stalled components
 * or processes. The watchdog must be "pet" regularly to prevent it from
 * triggering a recovery action.
 */
export const useWatchdog = ({
  timeout,
  onTimeout,
  description = 'Component',
  enabled = true
}: WatchdogOptions) => {
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  // Function to reset/pet the watchdog
  const petWatchdog = () => {
    if (!enabled || !isActiveRef.current) return;

    // Clear existing timer
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
    }

    // Set a new timer
    watchdogTimerRef.current = setTimeout(() => {
      console.warn(`Watchdog triggered for ${description}: No activity detected for ${timeout}ms`);
      onTimeout();
    }, timeout);
  };

  // Start the watchdog when component mounts
  useEffect(() => {
    if (!enabled) return;
    
    isActiveRef.current = true;
    console.log(`Initializing watchdog for ${description} (timeout: ${timeout}ms)`);
    petWatchdog();

    // Clean up when component unmounts
    return () => {
      isActiveRef.current = false;
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    };
  }, [timeout, description, enabled]);

  return { petWatchdog };
};

export default useWatchdog;
