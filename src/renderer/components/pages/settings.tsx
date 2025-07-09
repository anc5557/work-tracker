import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '../../hooks/use-toast';

export function Settings() {
  const [captureInterval, setCaptureInterval] = useState('5 minutes');
  const [storagePath, setStoragePath] = useState('/Users/username/work-tracker');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const { toast } = useToast();

  const handleSaveChanges = () => {
    // Settings 저장 로직
    toast({
      title: "설정 저장됨",
      description: "모든 설정이 성공적으로 저장되었습니다.",
    });
  };

  const handleBrowseFolder = async () => {
    try {
      // 폴더 선택 다이얼로그
      const result = await window.electronAPI.invoke('open-folder-dialog');
      if (result.success && result.data) {
        setStoragePath(result.data);
      }
    } catch (error) {
      console.error('Failed to open folder dialog:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-semibold">Settings</h1>
        
        {/* Screenshot Capture Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-medium">Screenshot Capture</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Capture Interval</label>
              <div className="relative">
                <select 
                  value={captureInterval}
                  onChange={(e) => setCaptureInterval(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="1 minute">1 minute</option>
                  <option value="5 minutes">5 minutes</option>
                  <option value="10 minutes">10 minutes</option>
                  <option value="15 minutes">15 minutes</option>
                  <option value="30 minutes">30 minutes</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Storage Path Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-medium">Storage Path</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex space-x-2">
                <Input
                  value={storagePath}
                  onChange={(e) => setStoragePath(e.target.value)}
                  className="flex-1 bg-gray-800 border-gray-700 text-white"
                  placeholder="Select storage path..."
                />
                <Button 
                  onClick={handleBrowseFolder}
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Browse
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-medium">Theme</h2>
          
          <div className="flex space-x-4">
            <Button
              onClick={() => setTheme('light')}
              variant={theme === 'light' ? 'default' : 'outline'}
              className={theme === 'light' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'border-gray-700 text-gray-300 hover:bg-gray-800'
              }
            >
              Light
            </Button>
            <Button
              onClick={() => setTheme('dark')}
              variant={theme === 'dark' ? 'default' : 'outline'}
              className={theme === 'dark' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'border-gray-700 text-gray-300 hover:bg-gray-800'
              }
            >
              Dark
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6">
          <Button 
            onClick={handleSaveChanges}
            className="bg-blue-600 hover:bg-blue-700 px-8"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
} 