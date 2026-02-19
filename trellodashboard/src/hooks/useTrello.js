import { useState, useEffect, useCallback, useRef } from 'react';
import trelloService from '../services/trelloService';
import dataProcessor from '../utils/dataProcessor';

/**
 * Custom hook to test Trello API connection
 */
export const useTrelloConnection = () => {
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    isLoading: true,
    error: null,
    board: null,
  });

  useEffect(() => {
    const testConnection = async () => {
      setConnectionStatus(prev => ({ ...prev, isLoading: true }));
      
      const result = await trelloService.testConnection();
      
      setConnectionStatus({
        isConnected: result.success,
        isLoading: false,
        error: result.success ? null : result.error,
        board: result.board || null,
      });
    };

    testConnection();
  }, []);

  return connectionStatus;
};

/**
 * Custom hook to fetch complete board data with normalization
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoRefresh - Enable automatic refresh (default: false)
 * @param {number} options.refreshInterval - Refresh interval in milliseconds (default: 5 minutes)
 * @param {boolean} options.normalize - Return normalized data (default: true)
 */
export const useTrelloBoard = (options = {}) => {
  const {
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000, // 5 minutes
    normalize = true,
  } = options;

  const [data, setData] = useState({
    // Raw data
    board: null,
    lists: [],
    cards: [],
    labels: [],
    customFields: [],
    members: [],
    
    // Normalized data
    normalizedData: null,
    
    // State
    isLoading: true,
    error: null,
    lastFetch: null,
  });

  const intervalRef = useRef(null);
  const hasInitialFetch = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const boardData = await trelloService.getCompleteBoardData();
      
      // Normalize data if requested
      const normalizedData = normalize 
        ? dataProcessor.normalizeBoardData(boardData)
        : null;
      
      setData({
        ...boardData,
        normalizedData,
        isLoading: false,
        error: null,
        lastFetch: new Date(),
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
    }
  }, [normalize]);

  // Initial fetch - guaranteed to run only once on mount
  useEffect(() => {
    if (!hasInitialFetch.current) {
      hasInitialFetch.current = true;
      fetchData();
    }
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        console.log('Auto-refreshing Trello data...');
        fetchData();
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchData]);

  return { 
    ...data, 
    refetch: fetchData,
    isAutoRefreshEnabled: autoRefresh,
  };
};

/**
 * Custom hook to fetch only cards
 */
export const useTrelloCards = () => {
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCards = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const cardsData = await trelloService.getCards();
      setCards(cardsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  return { cards, isLoading, error, refetch: fetchCards };
};

export default {
  useTrelloConnection,
  useTrelloBoard,
  useTrelloCards,
};
