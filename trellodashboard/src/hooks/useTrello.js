import { useState, useEffect } from 'react';
import trelloService from '../services/trelloService';

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
 * Custom hook to fetch complete board data
 */
export const useTrelloBoard = () => {
  const [data, setData] = useState({
    board: null,
    lists: [],
    cards: [],
    labels: [],
    customFields: [],
    members: [],
    actions: [],
    isLoading: true,
    error: null,
  });

  const fetchData = async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const boardData = await trelloService.getCompleteBoardData();
      
      setData({
        ...boardData,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { ...data, refetch: fetchData };
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
