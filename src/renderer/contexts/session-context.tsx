import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import type { WorkRecord } from '../../shared/types';
import { useToast } from '../hooks/use-toast';

interface SessionContextType {
  isWorking: boolean;
  currentRecord: WorkRecord | null;
  elapsedTime: number;
  lastEndedSessionId: string | null;
  startSession: (record: WorkRecord) => void;
  stopSession: () => void;
  pauseSession: (record: WorkRecord) => void;
  resumeSession: (record: WorkRecord) => void;
  restoreSession: () => Promise<void>;
  checkSession: () => Promise<void>;
  endCurrentSessionAndStartNew: (newRecord: WorkRecord) => Promise<void>;
  endCurrentSession: () => Promise<void>;
  clearLastEndedSessionId: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<WorkRecord | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastEndedSessionId, setLastEndedSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckingRef = useRef(false);

  // 앱 시작시 세션 복원
  useEffect(() => {
    restoreSession();
  }, []);

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
    
    // 업무 중이고 중지되지 않은 상태일 때만 타이머 실행
    if (isWorking && currentRecord && !currentRecord.isPaused) {
      intervalRef.current = setInterval(() => {
        // timeline을 활용하여 실제 업무 시간 계산
        const calculatedTime = calculateWorkingTime(currentRecord);
        setElapsedTime(calculatedTime);
      }, 1000);
    } else if (isWorking && currentRecord && currentRecord.isPaused) {
      // 일시정지 상태일 때는 마지막 계산된 시간으로 고정
      const calculatedTime = calculateWorkingTime(currentRecord);
      setElapsedTime(calculatedTime);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isWorking, currentRecord, currentRecord?.isPaused]);

  // 실제 업무 시간 계산 함수 (중지된 시간 제외)
  const calculateWorkingTime = useCallback((record: WorkRecord): number => {
    if (!record) return 0;

    const now = new Date().getTime();
    const startTime = new Date(record.startTime).getTime();
    
    if (!record.timeline || record.timeline.length === 0) {
      // timeline이 없으면 기본 계산
      if (record.isPaused) {
        // 일시정지 상태이지만 timeline이 없으면 정확한 계산 불가
        // 안전하게 0을 반환 (실제로는 pause 시 timeline이 생성됨)
        return 0;
      } else {
        // 진행 중이면 시작부터 현재까지
        return now - startTime;
      }
    }

    // timeline을 활용하여 실제 업무 시간 계산
    let totalWorkingTime = 0;
    let lastWorkTime = startTime;
    let currentlyWorking = true; // 시작할 때는 업무 중

    for (const item of record.timeline) {
      const itemTime = new Date(item.timestamp).getTime();
      
      if (item.type === 'pause' || item.type === 'rest') {
        // 중지/휴식 시작: 현재까지의 업무 시간을 누적
        if (currentlyWorking) {
          totalWorkingTime += itemTime - lastWorkTime;
          currentlyWorking = false;
        }
      } else if (item.type === 'resume') {
        // 재개: 재개 시점을 기록
        if (!currentlyWorking) {
          lastWorkTime = itemTime;
          currentlyWorking = true;
        }
      }
    }

    // 현재 상태에 따라 마지막 구간 처리
    if (currentlyWorking && !record.isPaused) {
      // 현재 업무 중이고 일시정지가 아니면 현재 시간까지 누적
      totalWorkingTime += now - lastWorkTime;
    }

    return totalWorkingTime;
  }, []);

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
    console.log('=== startSession START ===');
    console.log('Starting session with record:', record);
    console.log('Previous state - isWorking:', isWorking, 'currentRecord:', currentRecord);
    
    setCurrentRecord(record);
    setIsWorking(true);
    setElapsedTime(0);
    saveSessionToStorage(record, true);
    
    // 메인 프로세스에 세션 상태 변경 알림
    window.electronAPI.invoke('session-status-changed').catch(console.error);
    
    console.log('Session state updated');
    console.log('=== startSession END ===');
  }, [saveSessionToStorage, isWorking, currentRecord]);

  const stopSession = useCallback(() => {
    console.log('=== stopSession START ===');
    console.log('Previous state - isWorking:', isWorking, 'currentRecord:', currentRecord);
    
    setIsWorking(false);
    setCurrentRecord(null);
    setElapsedTime(0);
    saveSessionToStorage(null, false);
    
    // 메인 프로세스에 세션 상태 변경 알림
    window.electronAPI.invoke('session-status-changed').catch(console.error);
    
    console.log('Session state cleared');
    console.log('=== stopSession END ===');
  }, [saveSessionToStorage, isWorking, currentRecord]);

  const pauseSession = useCallback((updatedRecord: WorkRecord) => {
    console.log('=== pauseSession START ===');
    console.log('Pausing session with record:', updatedRecord);
    
    // 즉시 중지 상태로 업데이트
    const pausedRecord = { ...updatedRecord, isPaused: true };
    setCurrentRecord(pausedRecord);
    
    // 중지 상태에서는 경과 시간 고정
    const calculatedTime = calculateWorkingTime(pausedRecord);
    setElapsedTime(calculatedTime);
    
    saveSessionToStorage(pausedRecord, true);
    
    console.log('Session paused');
    console.log('=== pauseSession END ===');
  }, [saveSessionToStorage, calculateWorkingTime]);

  const resumeSession = useCallback((updatedRecord: WorkRecord) => {
    console.log('=== resumeSession START ===');
    console.log('Resuming session with record:', updatedRecord);
    
    // 즉시 재개 상태로 업데이트
    const resumedRecord = { ...updatedRecord, isPaused: false };
    setCurrentRecord(resumedRecord);
    
    saveSessionToStorage(resumedRecord, true);
    
    console.log('Session resumed');
    console.log('=== resumeSession END ===');
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
            
            // 경과 시간 계산 (중지된 시간 제외)
            const calculatedTime = calculateWorkingTime(activeSession);
            setElapsedTime(calculatedTime);
            
            saveSessionToStorage(activeSession, true);
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
          
          const calculatedTime = calculateWorkingTime(storedSession.currentRecord);
          setElapsedTime(calculatedTime);
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
        
        const calculatedTime = calculateWorkingTime(storedSession.currentRecord);
        setElapsedTime(calculatedTime);
      }
      
      // 그 다음 백엔드와 동기화
      await checkSession();
      
    } catch (error) {
      console.error('Failed to restore active session:', error);
    }
  }, [checkSession, loadSessionFromStorage]);

  const endCurrentSessionAndStartNew = useCallback(async (newRecord: WorkRecord) => {
    try {
      console.log('=== endCurrentSessionAndStartNew START ===');
      console.log('Current state - isWorking:', isWorking, 'currentRecord:', currentRecord);
      console.log('New record to start:', newRecord);
      
      // 먼저 백엔드에서 현재 활성 세션 확인
      const activeSessionResult = await window.electronAPI.invoke('get-active-session');
      console.log('Active session check result:', activeSessionResult);
      
      let sessionToStop = null;
      if (activeSessionResult.success && activeSessionResult.data && activeSessionResult.data.isActive) {
        sessionToStop = activeSessionResult.data;
      } else if (currentRecord && isWorking) {
        sessionToStop = currentRecord;
      }
      
      if (sessionToStop) {
        console.log('Stopping session before starting new one:', sessionToStop.id);
        
        // 자동 캡처 중지
        console.log('Stopping auto capture...');
        try {
          const stopAutoCaptureResult = await window.electronAPI.invoke('stop-auto-capture');
          console.log('Stop auto capture result:', stopAutoCaptureResult);
        } catch (autoCaptureError) {
          console.error('Error stopping auto capture:', autoCaptureError);
        }
        
        // 세션 종료
        const stopResult = await window.electronAPI.invoke('stop-work', { id: sessionToStop.id });
        console.log('Stop work result:', stopResult);
        
        if (stopResult.success) {
          toast({
            title: "이전 작업 종료",
            description: `"${sessionToStop.title}" 작업이 종료되었습니다.`,
          });
        } else {
          console.error('Failed to stop current work:', stopResult.error);
        }
      } else {
        console.log('No active session to stop');
      }
      
      // 새 세션 시작
      console.log('Starting new session with data:', {
        title: newRecord.title,
        description: newRecord.description
      });
      const result = await window.electronAPI.invoke('start-work', {
        title: newRecord.title,
        description: newRecord.description
      });
      console.log('Start work result:', result);
      
      if (result.success) {
        console.log('Calling startSession with:', result.data);
        startSession(result.data);
        
        // 자동 캡처 시작 (설정에서 간격 로드)
        console.log('Starting auto capture for new session...');
        try {
          // 설정에서 캡처 간격 로드
          const settingsResult = await window.electronAPI.invoke('load-settings');
          const interval = settingsResult.success ? settingsResult.data.captureInterval : 5;
          
          const autoCaptureResult = await window.electronAPI.invoke('start-auto-capture', {
            sessionId: result.data.id,
            interval: interval
          });
          console.log('Auto capture start result:', autoCaptureResult);
          
          if (autoCaptureResult.success) {
            console.log('Auto capture started successfully');
          } else {
            console.error('Failed to start auto capture:', autoCaptureResult.error);
          }
        } catch (autoCaptureError) {
          console.error('Error starting auto capture:', autoCaptureError);
        }
        
        toast({
          title: "새 작업 시작",
          description: `"${newRecord.title}" 작업을 시작했습니다.`,
        });
        console.log('New session started successfully');
      } else {
        console.error('Failed to start new work:', result.error);
        throw new Error(result.error || '새 세션 시작에 실패했습니다.');
      }
      
      console.log('=== endCurrentSessionAndStartNew END ===');
    } catch (error) {
      console.error('Failed to end current session and start new:', error);
      toast({
        title: "오류",
        description: "세션 변경에 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [currentRecord, isWorking, startSession, toast]);

  const endCurrentSession = useCallback(async () => {
    try {
      console.log('=== endCurrentSession START ===');
      console.log('Current state - isWorking:', isWorking, 'currentRecord:', currentRecord);
      
      // 먼저 백엔드에서 현재 활성 세션 확인
      const activeSessionResult = await window.electronAPI.invoke('get-active-session');
      console.log('Active session check result:', activeSessionResult);
      
      let sessionToStop = null;
      if (activeSessionResult.success && activeSessionResult.data && activeSessionResult.data.isActive) {
        sessionToStop = activeSessionResult.data;
      } else if (currentRecord && isWorking) {
        sessionToStop = currentRecord;
      }
      
      if (sessionToStop) {
        console.log('Stopping session:', sessionToStop.id);
        
        // 자동 캡처 중지
        console.log('Stopping auto capture...');
        try {
          const stopAutoCaptureResult = await window.electronAPI.invoke('stop-auto-capture');
          console.log('Stop auto capture result:', stopAutoCaptureResult);
        } catch (autoCaptureError) {
          console.error('Error stopping auto capture:', autoCaptureError);
        }
        
        // 세션 종료
        const stopResult = await window.electronAPI.invoke('stop-work', { id: sessionToStop.id });
        console.log('Stop work result:', stopResult);
        
        if (stopResult.success) {
          stopSession();
          setLastEndedSessionId(sessionToStop.id); // 종료된 세션 ID 저장
          
          toast({
            title: "작업 종료",
            description: `"${sessionToStop.title}" 작업이 종료되었습니다.`,
          });
          console.log('Session ended successfully');
        } else {
          console.error('Failed to stop work:', stopResult.error);
          throw new Error(stopResult.error || '세션 종료에 실패했습니다.');
        }
      } else {
        console.log('No active session to stop');
      }
      
      console.log('=== endCurrentSession END ===');
    } catch (error) {
      console.error('Failed to end current session:', error);
      toast({
        title: "오류",
        description: "세션 종료에 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [currentRecord, isWorking, stopSession, toast]);

  const clearLastEndedSessionId = useCallback(() => {
    setLastEndedSessionId(null);
  }, []);

  const value: SessionContextType = {
    isWorking,
    currentRecord,
    elapsedTime,
    lastEndedSessionId,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    restoreSession,
    checkSession,
    endCurrentSessionAndStartNew,
    endCurrentSession,
    clearLastEndedSessionId
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