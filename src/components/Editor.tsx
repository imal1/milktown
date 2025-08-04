import { defaultValueCtx, Editor, rootCtx } from '@milkdown/kit/core';
import { MilkdownProvider, Milkdown, useEditor } from '@milkdown/react';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { history } from '@milkdown/kit/plugin/history';
import { cursor } from '@milkdown/kit/plugin/cursor';
import { clipboard } from '@milkdown/kit/plugin/clipboard';
import { indent } from '@milkdown/kit/plugin/indent';
import { upload } from '@milkdown/kit/plugin/upload';
import { nord } from '@milkdown/theme-nord';
import { useState, FC, useRef, useEffect } from 'react';

import '@milkdown/theme-nord/style.css';
import '@milkdown/kit/prose/view/style/prosemirror.css';
import './Editor.css';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
}

const MilkdownEditor: FC<EditorProps> = ({ content, onChange, onSave }) => {
  const [loading, setLoading] = useState(true);
  const editorRef = useRef<any>(null);

  useEditor((root) => {
    setLoading(true);
    
    const editor = Editor
      .make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(cursor)
      .use(clipboard)
      .use(indent)
      .use(upload);

    editor.create().then((createdEditor) => {
      setLoading(false);
      editorRef.current = createdEditor;
      console.log('✅ Milkdown 编辑器创建成功');
      
      // 设置快捷键
      if (onSave) {
        const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            onSave();
          }
        };
        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
          document.removeEventListener('keydown', handleKeyDown);
        };
      }
    }).catch((error) => {
      console.error('❌ 创建编辑器时出错:', error);
      setLoading(false);
    });

    return editor;
  }, [content, onChange, onSave]);

  // 当外部内容变化时更新编辑器
  useEffect(() => {
    if (editorRef.current && content) {
      try {
        editorRef.current.action((ctx: any) => {
          ctx.set(defaultValueCtx, content);
        });
      } catch (error) {
        console.error('更新编辑器内容时出错:', error);
      }
    }
  }, [content]);

  return (
    <div className="milkdown-editor">
      <Milkdown />
      {loading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>正在加载 Milkdown 编辑器...</span>
        </div>
      )}
    </div>
  );
};

export const EditorComponent: FC<EditorProps> = (props) => {
  return (
    <MilkdownProvider>
      <MilkdownEditor {...props} />
    </MilkdownProvider>
  );
};

export default EditorComponent;
