import type { WorkRecord } from '../../shared/types';

export interface ExportData {
  dateRange: string;
  workSessions: WorkRecord[];
  totalDuration: number;
  totalSessions: number;
}

/**
 * 워크세션 데이터를 마크다운 형태로 변환
 */
export function convertToMarkdown(data: ExportData): string {
  const { dateRange, workSessions, totalDuration, totalSessions } = data;
  
  let markdown = `# 업무 기록 - ${dateRange}\n\n`;
  
  // 요약 정보
  markdown += `## 📊 요약\n\n`;
  markdown += `- **총 세션 수**: ${totalSessions}개\n`;
  markdown += `- **총 작업 시간**: ${formatDurationForMarkdown(totalDuration)}\n`;
  markdown += `- **기간**: ${dateRange}\n\n`;
  
  if (workSessions.length === 0) {
    markdown += `## 📝 업무 세션\n\n`;
    markdown += `선택된 기간에 업무 기록이 없습니다.\n`;
    return markdown;
  }
  
  // 날짜별로 그룹화
  const sessionsByDate = workSessions.reduce((acc, session) => {
    const sessionDate = (session as any).displayDate || formatDateToLocalString(new Date(session.startTime));
    if (!acc[sessionDate]) {
      acc[sessionDate] = [];
    }
    acc[sessionDate].push(session);
    return acc;
  }, {} as Record<string, WorkRecord[]>);
  
  const sortedDates = Object.keys(sessionsByDate).sort();
  
  markdown += `## 📝 업무 세션\n\n`;
  
  sortedDates.forEach((dateString, index) => {
    const sessions = sessionsByDate[dateString];
    const formattedDate = new Date(dateString + 'T00:00:00').toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
    
    markdown += `### ${formattedDate}\n\n`;
    
    sessions.forEach((session, sessionIndex) => {
      const startTime = formatTime(session.startTime);
      const endTime = session.endTime ? formatTime(session.endTime) : '진행 중';
      const duration = session.duration ? formatDurationForMarkdown(session.duration) : '';
      
      markdown += `#### ${sessionIndex + 1}. ${session.title}\n\n`;
      markdown += `- **시간**: ${startTime} - ${endTime}`;
      if (duration) {
        markdown += ` (${duration})`;
      }
      markdown += `\n`;
      
      if (session.description) {
        markdown += `- **설명**: ${session.description}\n`;
      }
      
      if (session.tags && session.tags.length > 0) {
        markdown += `- **태그**: ${session.tags.map(tag => `\`${tag}\``).join(', ')}\n`;
      }
      
      markdown += `\n`;
    });
    
    markdown += `---\n\n`;
  });
  
  return markdown;
}

/**
 * 워크세션 데이터를 CSV 형태로 변환
 */
export function convertToCSV(data: ExportData): string {
  const { workSessions } = data;
  
  // CSV 헤더
  let csv = 'Date,Title,Description,Start Time,End Time,Duration (minutes),Tags,Status\n';
  
  if (workSessions.length === 0) {
    return csv; // 헤더만 반환
  }
  
  workSessions.forEach(session => {
    const sessionDate = (session as any).displayDate || formatDateToLocalString(new Date(session.startTime));
    const startTime = formatTime(session.startTime);
    const endTime = session.endTime ? formatTime(session.endTime) : '';
    const durationMinutes = session.duration ? Math.round(session.duration / (1000 * 60)) : '';
    const tags = session.tags ? session.tags.join(';') : '';
    const status = session.endTime ? 'Completed' : 'In Progress';
    
    // CSV 필드를 쉼표로 구분하되, 내용에 쉼표가 있으면 따옴표로 감쌈
    const fields = [
      sessionDate,
      escapeCSVField(session.title),
      escapeCSVField(session.description || ''),
      startTime,
      endTime,
      durationMinutes.toString(),
      escapeCSVField(tags),
      status
    ];
    
    csv += fields.join(',') + '\n';
  });
  
  return csv;
}

/**
 * 클립보드에 텍스트 복사
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // 폴백: 임시 textarea 사용
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
  } catch (error) {
    console.error('클립보드 복사 실패:', error);
    throw new Error('클립보드에 복사할 수 없습니다');
  }
}

// 헬퍼 함수들
function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('ko-KR', { 
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
  });
}

function formatDurationForMarkdown(ms: number): string {
  if (!ms || isNaN(ms) || ms < 0) {
    return '0분';
  }
  
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  return `${minutes}분`;
}

function escapeCSVField(field: string): string {
  // CSV 필드에 쉼표, 따옴표, 줄바꿈이 있으면 따옴표로 감싸고 내부 따옴표는 더블로 처리
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * 날짜 범위를 사람이 읽기 쉬운 형태로 포맷
 */
export function formatDateRange(dates: Date[]): string {
  if (dates.length === 0) return '';
  if (dates.length === 1) {
    return dates[0].toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  }
  
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  
  return `${firstDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })} - ${lastDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  })}`;
} 