import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ScreenshotData } from '@/shared/types';

interface WorkChangeNotificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onYes: () => void;
  onContinue: () => void;
  onStop: () => void;
  screenshot?: ScreenshotData;
}

export function WorkChangeNotification({
  open,
  onOpenChange,
  onYes,
  onContinue,
  onStop,
  screenshot
}: WorkChangeNotificationProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            현재 작업이 변경되었습니까?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 스크린샷 미리보기 */}
          {screenshot && (
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-2">
                방금 캡처된 화면
              </div>
              <div className="bg-muted rounded-md h-32 flex items-center justify-center">
                <img 
                  src={`file://${screenshot.filePath}`}
                  alt="스크린샷"
                  className="max-h-full max-w-full object-contain rounded"
                />
              </div>
            </Card>
          )}

          {/* 설명 텍스트 */}
          <div className="text-center text-sm text-muted-foreground">
            새로운 작업을 시작하시겠습니까?
          </div>

          {/* 버튼들 */}
          <div className="flex flex-col gap-2">
            <Button 
              onClick={onYes}
              className="w-full"
              size="lg"
            >
              예 - 새 작업 시작
            </Button>
            
            <Button 
              onClick={onContinue}
              variant="outline"
              className="w-full"
              size="lg"
            >
              진행중 - 기존 작업 계속
            </Button>
            
            <Button 
              onClick={onStop}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              종료 - 작업 끝내기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 