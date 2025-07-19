import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '../../hooks/use-toast';
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  Edit3, 
  Save, 
  X, 
  Camera, 
  Folder, 
  ExternalLink,
  ZoomIn,
  Download,
  Trash2,
  Play,
  CheckCircle2,
  Image as ImageIcon,
  Timer
} from 'lucide-react';
import type { WorkRecord } from '../../../shared/types';

interface Screenshot {
  id: string;
  filename: string;
  path: string;
  timestamp: string;
}

export function SessionDetails() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [session, setSession] = useState<WorkRecord | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

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
        setEditTitle(sessionResult.data.title);
        setEditDescription(sessionResult.data.description || '');
      } else {
        toast({
          title: "오류",
          description: "세션 정보를 불러올 수 없습니다.",
          variant: "destructive",
        });
        navigate('/calendar');
        return;
      }
      
      // 스크린샷 정보 로드
      const screenshotsResult = await window.electronAPI.invoke('get-session-screenshots', { sessionId: id });
      if (screenshotsResult.success) {
        setScreenshots(screenshotsResult.data);
      }
    } catch (error) {
      console.error('Failed to load session details:', error);
      toast({
        title: "오류",
        description: "데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!session || !editTitle.trim()) return;
    
    try {
      const updatedSession: WorkRecord = {
        ...session,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      };
      
      const result = await window.electronAPI.invoke('save-work-record', updatedSession);
      if (result.success) {
        setSession(updatedSession);
        setIsEditing(false);
        toast({
          title: "저장 완료",
          description: "세션 정보가 업데이트되었습니다.",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to save session:', error);
      toast({
        title: "저장 실패",
        description: "세션 정보 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleOpenScreenshot = async (screenshot: Screenshot) => {
    try {
      await window.electronAPI.invoke('open-screenshot', { path: screenshot.path });
    } catch (error) {
      console.error('Failed to open screenshot:', error);
      toast({
        title: "오류",
        description: "스크린샷을 열 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const handleShowInFolder = async (screenshot: Screenshot) => {
    try {
      await window.electronAPI.showItemInFolder(screenshot.path);
    } catch (error) {
      console.error('Failed to show in folder:', error);
      toast({
        title: "오류",
        description: "폴더를 열 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const openImageDialog = (screenshot: Screenshot) => {
    setSelectedScreenshot(screenshot);
    setIsImageDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (start: string, end?: string) => {
    if (!end) return '진행 중';
    
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const duration = endTime - startTime;
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  };

  const getStatusBadge = () => {
    if (!session) return null;
    
    if (session.isActive) {
      return (
        <Badge variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1">
          <Play className="w-3 h-3" />
          진행 중
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          완료
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">세션 정보를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <p className="text-lg text-muted-foreground">세션을 찾을 수 없습니다</p>
              <Button onClick={() => navigate('/calendar')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                캘린더로 돌아가기
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/calendar')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              뒤로 가기
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">세션 상세</h1>
              {getStatusBadge()}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                편집
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(session.title);
                    setEditDescription(session.description || '');
                  }}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  저장
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Session Info */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border/50">
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Timer className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">세션 정보</h2>
                <p className="text-sm text-muted-foreground font-normal">
                  {session.isActive ? '현재 진행 중인 세션입니다' : '완료된 세션입니다'}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Title */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">제목</label>
              {isEditing ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="세션 제목을 입력하세요"
                  className="text-lg font-medium"
                />
              ) : (
                <div className="pl-1">
                  <h2 className="text-lg font-semibold text-foreground">{session.title}</h2>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">설명</label>
              {isEditing ? (
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="세션 설명을 입력하세요 (선택사항)"
                  className="w-full min-h-[100px] px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
              ) : (
                <div className="pl-1 min-h-[60px] flex items-start py-2">
                  <p className="text-foreground leading-relaxed">
                    {session.description || (
                      <span className="text-muted-foreground italic">업무 내용 미입력</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Time Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="space-y-2 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                <div className="flex items-center gap-2 text-sm text-primary font-medium">
                  <Calendar className="w-4 h-4" />
                  시작 시간
                </div>
                <p className="font-semibold text-foreground text-base">{formatDate(session.startTime)}</p>
              </div>
              
              <div className="space-y-2 p-4 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl border border-secondary/20">
                <div className="flex items-center gap-2 text-sm text-secondary-foreground font-medium">
                  <Calendar className="w-4 h-4" />
                  종료 시간
                </div>
                <p className="font-semibold text-foreground text-base">
                  {session.endTime ? formatDate(session.endTime) : (
                    <span className="text-primary flex items-center gap-1">
                      <Play className="w-4 h-4" />
                      진행 중
                    </span>
                  )}
                </p>
              </div>
              
              <div className="space-y-2 p-4 bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl border border-accent/20">
                <div className="flex items-center gap-2 text-sm text-accent-foreground font-medium">
                  <Clock className="w-4 h-4" />
                  소요 시간
                </div>
                <p className="font-semibold text-foreground text-base">{formatDuration(session.startTime, session.endTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Screenshots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                스크린샷 ({screenshots.length}개)
              </div>
              {screenshots.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  시간순으로 정렬됨
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {screenshots.length > 0 ? (
              <div className="space-y-6">
                {/* Screenshot Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {screenshots.map((screenshot, index) => (
                    <div 
                      key={screenshot.id}
                      className="group relative bg-card rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 hover:shadow-lg transition-all duration-200 border border-border/50"
                    >
                      {/* Preview placeholder */}
                      <div className="aspect-video bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 flex items-center justify-center relative">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/70" />
                        
                        {/* Decorative pattern */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-background/5 to-background/10"></div>
                      </div>
                      
                      {/* Overlay with actions */}
                      <div className="absolute inset-0 bg-background/95 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openImageDialog(screenshot)}
                            className="h-8 w-8 p-0 shadow-lg"
                            title="큰 이미지로 보기"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenScreenshot(screenshot)}
                            className="h-8 w-8 p-0 shadow-lg"
                            title="외부 앱으로 열기"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowInFolder(screenshot)}
                            className="h-8 w-8 p-0 shadow-lg"
                            title="폴더에서 보기"
                          >
                            <Folder className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Timestamp */}
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-background/95 backdrop-blur-sm text-foreground text-xs px-2 py-1.5 rounded-md border border-border/50 text-center shadow-sm">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(screenshot.timestamp).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                      </div>
                      
                      {/* Index */}
                      <div className="absolute top-2 left-2">
                        <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                          #{index + 1}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Timeline */}
                <div className="pt-6 border-t border-border">
                  <h3 className="text-lg font-medium mb-4 text-foreground flex items-center gap-2">
                    <Timer className="w-5 h-5 text-primary" />
                    활동 타임라인
                  </h3>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {/* Session start */}
                      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 shadow-sm">
                        <div className="w-3 h-3 bg-primary rounded-full shadow-sm"></div>
                        <div className="flex-1">
                          <p className="font-medium text-primary flex items-center gap-2">
                            <Play className="w-4 h-4" />
                            세션 시작
                          </p>
                          <p className="text-sm text-muted-foreground">{formatDate(session.startTime)}</p>
                        </div>
                      </div>

                      {/* Screenshots */}
                      {screenshots.map((screenshot, index) => (
                        <div key={screenshot.id} className="flex items-center gap-3 p-4 bg-gradient-to-r from-secondary/15 to-secondary/5 rounded-xl border border-secondary/25 shadow-sm">
                          <div className="w-3 h-3 bg-secondary rounded-full shadow-sm"></div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground flex items-center gap-2">
                              <Camera className="w-4 h-4" />
                              스크린샷 #{index + 1} 캡처
                            </p>
                            <p className="text-sm text-muted-foreground">{formatDate(screenshot.timestamp)}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openImageDialog(screenshot)}
                            className="text-secondary-foreground hover:text-foreground hover:bg-secondary/20"
                          >
                            보기
                          </Button>
                        </div>
                      ))}

                      {/* Session end */}
                      {session.endTime && (
                        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-muted/50 to-muted/20 rounded-xl border border-border shadow-sm">
                          <div className="w-3 h-3 bg-muted-foreground rounded-full shadow-sm"></div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              세션 종료
                            </p>
                            <p className="text-sm text-muted-foreground">{formatDate(session.endTime)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-muted/50 to-muted/20 rounded-2xl flex items-center justify-center mx-auto border border-border shadow-sm">
                  <Camera className="w-10 h-10 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium text-muted-foreground">스크린샷이 없습니다</p>
                  <p className="text-sm text-muted-foreground">이 세션 동안 캡처된 스크린샷이 없습니다.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xl font-semibold">스크린샷 상세</span>
              </div>
              {selectedScreenshot && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => selectedScreenshot && handleOpenScreenshot(selectedScreenshot)}
                    className="shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    외부 앱으로 열기
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => selectedScreenshot && handleShowInFolder(selectedScreenshot)}
                    className="shadow-sm"
                  >
                    <Folder className="w-4 h-4 mr-2" />
                    폴더에서 보기
                  </Button>
                </div>
              )}
            </DialogTitle>
            {selectedScreenshot && (
              <DialogDescription className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                캡처 시간: {formatDate(selectedScreenshot.timestamp)}
              </DialogDescription>
            )}
          </DialogHeader>
          
          {selectedScreenshot && (
            <div className="space-y-6">
              {/* Image placeholder */}
              <div className="w-full h-96 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl flex items-center justify-center border border-border shadow-inner">
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                    <ImageIcon className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground">스크린샷 미리보기</p>
                    <p className="text-sm text-muted-foreground">{selectedScreenshot.filename}</p>
                  </div>
                </div>
              </div>
              
              {/* Image info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <ImageIcon className="w-4 h-4" />
                      파일명
                    </div>
                    <p className="text-foreground font-mono text-sm break-all">{selectedScreenshot.filename}</p>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl border border-secondary/20">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
                      <Folder className="w-4 h-4" />
                      저장 경로
                    </div>
                    <p className="text-muted-foreground font-mono text-sm break-all">{selectedScreenshot.path}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 