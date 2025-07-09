import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from '../contexts/session-context';

// 페이지 이동 감지를 위한 훅 (Router 안에서만 사용 가능)
export function usePageChangeDetection() {
  const { checkSession } = useSession();
  const location = useLocation(); // Router 컨텍스트 내에서만 사용 가능
  
  useEffect(() => {
    const timer = setTimeout(() => {
      checkSession();
    }, 100); // 페이지 전환 후 잠시 대기

    return () => clearTimeout(timer);
  }, [location.pathname, checkSession]);
} 