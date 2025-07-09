import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { WorkRecord } from '../../../shared/types';

interface Screenshot {
  id: string;
  filename: string;
  path: string;
  timestamp: string;
}

export function SessionDetails() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<WorkRecord | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      loadSessionDetails(sessionId);
    }
  }, [sessionId]);

  const loadSessionDetails = async (id: string) => {
    try {
      setLoading(true);
      
      // 세션 정보 로드
      const sessionResult = await window.electronAPI.invoke('get-work-record', { id });
      if (sessionResult.success) {
        setSession(sessionResult.data);
      }
      
      // 스크린샷 정보 로드
      const screenshotsResult = await window.electronAPI.invoke('get-session-screenshots', { sessionId: id });
      if (screenshotsResult.success) {
        setScreenshots(screenshotsResult.data);
      }
    } catch (error) {
      console.error('Failed to load session details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'In Progress';
    
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const duration = endTime - startTime;
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">Session not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Work Session Details</h1>
          <div className="text-sm text-gray-400">
            Session ID: {session.id}
          </div>
        </div>

        {/* Session Summary */}
        <div className="space-y-6">
          <h2 className="text-2xl font-medium">Session Summary</h2>
          
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-sm text-gray-400 mb-1">Start Time</div>
                <div className="text-lg">{formatDate(session.startTime)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">End Time</div>
                <div className="text-lg">
                  {session.endTime ? formatDate(session.endTime) : 'In Progress'}
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400 mb-1">Duration</div>
              <div className="text-lg">{formatDuration(session.startTime, session.endTime)}</div>
            </div>
          </div>
        </div>

        {/* Work Summary */}
        <div className="space-y-6">
          <h2 className="text-2xl font-medium">Work Summary</h2>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-lg font-medium mb-4">{session.title}</div>
            <div className="text-gray-300 leading-relaxed">
              {session.description || 'No description provided for this session.'}
            </div>
          </div>
        </div>

        {/* Screenshots */}
        <div className="space-y-6">
          <h2 className="text-2xl font-medium">Screenshots</h2>
          
          {screenshots.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {screenshots.map((screenshot, index) => (
                <div 
                  key={screenshot.id}
                  className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                >
                  <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <div className="text-4xl opacity-50">🖼️</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
              이 세션에 캡처된 스크린샷이 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 