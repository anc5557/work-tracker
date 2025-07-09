import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { WorkRecord } from '../../shared/types';
import { useToast } from '../hooks/use-toast';

interface SessionContextType {
  isWorking: boolean;
  currentRecord: WorkRecord | null;
  elapsedTime: number;
  startSession: (record: WorkRecord) => void;
  stopSession: () => void;
  restoreSession: () => Promise<void>;
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

  // 앱 시작시 세션 복원
  useEffect(() => {
    restoreSession();
  }, []);

  // 경과 시간 업데이트
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isWorking && currentRecord) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(currentRecord.startTime).getTime();
        setElapsedTime(now - start);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isWorking, currentRecord]);

  const startSession = (record: WorkRecord) => {
    console.log('Starting session:', record);
    setCurrentRecord(record);
    setIsWorking(true);
    setElapsedTime(0);
  };

  const stopSession = () => {
    console.log('Stopping session');
    setIsWorking(false);
    setCurrentRecord(null);
    setElapsedTime(0);
  };

  const restoreSession = async () => {
    try {
      console.log('Attempting to restore session...');
      const result = await window.electronAPI.invoke('get-active-session');
      
      if (result.success && result.data) {
        const activeSession = result.data;
        console.log('Active session found:', activeSession);
        
        setCurrentRecord(activeSession);
        setIsWorking(true);
        
        // 경과 시간 계산
        const now = new Date().getTime();
        const start = new Date(activeSession.startTime).getTime();
        setElapsedTime(now - start);
        
        toast({
          title: "세션 복원",
          description: `"${activeSession.title}" 작업이 복원되었습니다.`,
        });
      } else {
        console.log('No active session found');
      }
    } catch (error) {
      console.error('Failed to restore active session:', error);
    }
  };

  const value: SessionContextType = {
    isWorking,
    currentRecord,
    elapsedTime,
    startSession,
    stopSession,
    restoreSession
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