import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { WorkRecord } from '../../shared/types';
import { useToast } from '../hooks/use-toast';

interface SessionContextType {
  isWorking: boolean;
  currentRecord: WorkRecord | null;
  elapsedTime: number;
  startSession: (record: WorkRecord) => void;
  stopSession: () => void;
  restoreSession: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<WorkRecord | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const { toast } = useToast();
  const location = useLocation();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckingRef = useRef(false);

  // 앱 시작시 세션 복원
  useEffect(() => {
    restoreSession();
  }, []);

  // 페이지 이동시 세션 상태 확인
  useEffect(() => {
    const timer = setTimeout(() => {
      checkSession();
    }, 100); // 페이지 전환 후 잠시 대기

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Window focus시 세션 상태 확인
  useEffect(() => {
    const handleFocus = () => {
      checkSession();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSession();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 경과 시간 업데이트
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (isWorking && currentRecord) {
      intervalRef.current = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(currentRecord.startTime).getTime();
        setElapsedTime(now - start);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isWorking, currentRecord]);

  // 주기적 동기화 (3분마다)
  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      if (!sessionCheckingRef.current) {
        checkSession();
      }
    }, 3 * 60 * 1000); // 3분

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // localStorage와 동기화
  const saveSessionToStorage = useCallback((record: WorkRecord | null, working: boolean) => {
    try {
      const sessionData = {
        isWorking: working,
        currentRecord: record,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('work-tracker-session', JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to save session to localStorage:', error);
    }
  }, []);

  const loadSessionFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem('work-tracker-session');
      if (stored) {
        const sessionData = JSON.parse(stored);
        // 1시간 이내의 데이터만 사용
        const timestamp = new Date(sessionData.timestamp).getTime();
        const now = new Date().getTime();
        if (now - timestamp < 60 * 60 * 1000) { // 1시간
          return sessionData;
        }
      }
    } catch (error) {
      console.error('Failed to load session from localStorage:', error);
    }
    return null;
  }, []);

  const startSession = useCallback((record: WorkRecord) => {
    console.log('Starting session:', record);
    setCurrentRecord(record);
    setIsWorking(true);
    setElapsedTime(0);
    saveSessionToStorage(record, true);
  }, [saveSessionToStorage]);

  const stopSession = useCallback(() => {
    console.log('Stopping session');
    setIsWorking(false);
    setCurrentRecord(null);
    setElapsedTime(0);
    saveSessionToStorage(null, false);
  }, [saveSessionToStorage]);

  const checkSession = useCallback(async () => {
    if (sessionCheckingRef.current) return;
    
    sessionCheckingRef.current = true;
    try {
      console.log('Checking session status...');
      const result = await window.electronAPI.invoke('get-active-session');
      
      if (result.success) {
        const activeSession = result.data;
        
        if (activeSession && activeSession.isActive) {
          // 백엔드에 활성 세션이 있음
          if (!isWorking || !currentRecord || currentRecord.id !== activeSession.id) {
            console.log('Restoring session from backend:', activeSession);
            setCurrentRecord(activeSession);
            setIsWorking(true);
            
            // 경과 시간 계산
            const now = new Date().getTime();
            const start = new Date(activeSession.startTime).getTime();
            setElapsedTime(now - start);
            
            saveSessionToStorage(activeSession, true);
            
            toast({
              title: "세션 복원",
              description: `"${activeSession.title}" 작업이 복원되었습니다.`,
            });
          }
        } else {
          // 백엔드에 활성 세션이 없음
          if (isWorking) {
            console.log('No active session in backend, stopping frontend session');
            setIsWorking(false);
            setCurrentRecord(null);
            setElapsedTime(0);
            saveSessionToStorage(null, false);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check session:', error);
      
      // 백엔드 확인 실패시 localStorage에서 복원 시도
      const storedSession = loadSessionFromStorage();
      if (storedSession && storedSession.isWorking && storedSession.currentRecord) {
        if (!isWorking || !currentRecord) {
          console.log('Restoring session from localStorage:', storedSession.currentRecord);
          setCurrentRecord(storedSession.currentRecord);
          setIsWorking(true);
          
          const now = new Date().getTime();
          const start = new Date(storedSession.currentRecord.startTime).getTime();
          setElapsedTime(now - start);
        }
      }
    } finally {
      sessionCheckingRef.current = false;
    }
  }, [isWorking, currentRecord, toast, saveSessionToStorage, loadSessionFromStorage]);

  const restoreSession = useCallback(async () => {
    try {
      console.log('Attempting to restore session...');
      
      // 먼저 localStorage에서 확인
      const storedSession = loadSessionFromStorage();
      if (storedSession && storedSession.isWorking && storedSession.currentRecord) {
        setCurrentRecord(storedSession.currentRecord);
        setIsWorking(true);
        
        const now = new Date().getTime();
        const start = new Date(storedSession.currentRecord.startTime).getTime();
        setElapsedTime(now - start);
      }
      
      // 그 다음 백엔드와 동기화
      await checkSession();
      
    } catch (error) {
      console.error('Failed to restore active session:', error);
    }
  }, [checkSession, loadSessionFromStorage]);

  const value: SessionContextType = {
    isWorking,
    currentRecord,
    elapsedTime,
    startSession,
    stopSession,
    restoreSession,
    checkSession
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
} 