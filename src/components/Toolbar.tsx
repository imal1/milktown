import { useState, useEffect } from 'react';
import './Toolbar.css';

interface ToolbarProps {
  content: string;
  onChange: (content: string) => void;
  currentFile: string | null;
  setCurrentFile: (file: string | null) => void;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
}

export const Toolbar = ({ 
  content, 
  onChange, 
  currentFile, 
  setCurrentFile, 
  isDirty, 
  setIsDirty 
}: ToolbarProps) => {
  const [isLoading, setIsLoading] = useState(false);

  // 模拟文件操作（在依赖安装完成前）
  const handleNew = () => {
    if (isDirty) {
      const confirmed = window.confirm('当前文档未保存，是否继续创建新文档？');
      if (!confirmed) return;
    }
    
    onChange('# 新文档\n\n开始编写你的Markdown内容...');
    setCurrentFile(null);
    setIsDirty(false);
  };

  const handleOpen = async () => {
    try {
      setIsLoading(true);
      
      // 创建一个隐藏的 input 元素来选择文件
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md,.markdown,.txt';
      
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            const content = e.target.result;
            onChange(content);
            setCurrentFile(file.name);
            setIsDirty(false);
          };
          reader.readAsText(file);
        }
        setIsLoading(false);
      };
      
      input.click();
    } catch (error) {
      console.error('打开文件时出错:', error);
      alert('打开文件失败');
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // 创建并下载文件
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentFile || 'document.md';
      a.click();
      URL.revokeObjectURL(url);
      
      setIsDirty(false);
      console.log('文件已保存');
    } catch (error) {
      console.error('保存文件时出错:', error);
      alert('保存文件失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAs = async () => {
    try {
      setIsLoading(true);
      
      const fileName = prompt('请输入文件名:', 'document.md');
      if (fileName) {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        
        setCurrentFile(fileName);
        setIsDirty(false);
        console.log('文件已另存为:', fileName);
      }
    } catch (error) {
      console.error('另存为文件时出错:', error);
      alert('另存为文件失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            handleNew();
            break;
          case 'o':
            e.preventDefault();
            handleOpen();
            break;
          case 's':
            e.preventDefault();
            if (e.shiftKey) {
              handleSaveAs();
            } else {
              handleSave();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentFile, content, isDirty]);

  const getFileName = () => {
    if (!currentFile) return '未命名文档';
    return currentFile;
  };

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button 
          className="toolbar-button" 
          onClick={handleNew}
          disabled={isLoading}
          title="新建文档 (Ctrl+N)"
        >
          📄 新建
        </button>
        
        <button 
          className="toolbar-button" 
          onClick={handleOpen}
          disabled={isLoading}
          title="打开文档 (Ctrl+O)"
        >
          📂 打开
        </button>
        
        <button 
          className="toolbar-button primary" 
          onClick={handleSave}
          disabled={isLoading}
          title="保存文档 (Ctrl+S)"
        >
          💾 保存
        </button>
        
        <button 
          className="toolbar-button" 
          onClick={handleSaveAs}
          disabled={isLoading}
          title="另存为 (Ctrl+Shift+S)"
        >
          📝 另存为
        </button>
      </div>
      
      <div className="toolbar-section file-info">
        <span className="file-name">
          {getFileName()}
          {isDirty && ' *'}
        </span>
      </div>
      
      <div className="toolbar-section">
        {isLoading && <span className="loading-indicator">⏳</span>}
        <span className="app-title">Milktown</span>
      </div>
    </div>
  );
};

export default Toolbar;
