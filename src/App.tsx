import { useState, useCallback } from "react";
import EditorComponent from "./components/Editor";
import Toolbar from "./components/Toolbar";
import "./App.css";

function App() {
  const [content, setContent] = useState(`# Welcome to Milktown

一个基于 Milkdown 和 Tauri 的 Markdown 编辑器

## 功能特性

- 🎨 实时预览的 WYSIWYG Markdown 编辑
- 📝 类似 Typora 的编辑体验
- 💾 本地文件的读取和保存
- 🔧 基于 Tauri 的跨平台桌面应用
- ⚡ 快速响应的编辑性能

## 快捷键

- \`Ctrl+N\` - 新建文档
- \`Ctrl+O\` - 打开文档
- \`Ctrl+S\` - 保存文档
- \`Ctrl+Shift+S\` - 另存为

## 开始使用

点击工具栏的按钮来创建、打开或保存你的 Markdown 文档。

> 💡 提示：这个编辑器支持标准的 Markdown 语法，包括表格、代码块、任务列表等。

\`\`\`javascript
// 示例代码块
function hello() {
  console.log("Hello, Milktown!");
}
\`\`\`

### 任务列表示例

- [x] 集成 Milkdown 编辑器
- [x] 添加文件操作功能
- [x] 创建工具栏界面
- [ ] 添加更多编辑功能
- [ ] 优化用户体验

### 测试滚动功能

让我们添加更多内容来测试滚动功能是否正常工作：

1. 第一项内容
2. 第二项内容
3. 第三项内容
4. 第四项内容
5. 第五项内容
6. 第六项内容
7. 第七项内容
8. 第八项内容
9. 第九项内容
10. 第十项内容

## 更多段落

这是一个测试段落。这是一个测试段落。这是一个测试段落。这是一个测试段落。这是一个测试段落。这是一个测试段落。这是一个测试段落。这是一个测试段落。

这是另一个测试段落。这是另一个测试段落。这是另一个测试段落。这是另一个测试段落。这是另一个测试段落。这是另一个测试段落。

## 表格示例

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
| 数据4 | 数据5 | 数据6 |
| 数据7 | 数据8 | 数据9 |

## 更多内容段落

继续添加更多内容来测试滚动...

这是测试段落1。这是测试段落1。这是测试段落1。这是测试段落1。这是测试段落1。这是测试段落1。

这是测试段落2。这是测试段落2。这是测试段落2。这是测试段落2。这是测试段落2。这是测试段落2。

这是测试段落3。这是测试段落3。这是测试段落3。这是测试段落3。这是测试段落3。这是测试段落3。

这是测试段落4。这是测试段落4。这是测试段落4。这是测试段落4。这是测试段落4。这是测试段落4。

这是测试段落5。这是测试段落5。这是测试段落5。这是测试段落5。这是测试段落5。这是测试段落5。

---

**享受你的 Markdown 编写之旅！**

## 最后的段落

这是最后一个段落，用来确保页面有足够的内容来测试滚动功能。如果你能看到这段文字，说明滚动功能已经正常工作了。
`);
  
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const handleContentChange = useCallback((newContent: string) => {
    if (newContent !== content) {
      setContent(newContent);
      setIsDirty(true);
    }
  }, [content]);

  const handleSave = useCallback(() => {
    // 触发工具栏的保存功能
    const saveButton = document.querySelector('.toolbar-button.primary') as HTMLButtonElement;
    if (saveButton) {
      saveButton.click();
    }
  }, []);

  return (
    <div className="app">
      <Toolbar
        content={content}
        onChange={setContent}
        currentFile={currentFile}
        setCurrentFile={setCurrentFile}
        isDirty={isDirty}
        setIsDirty={setIsDirty}
      />
      
      <div className="editor-container">
        <EditorComponent
          content={content}
          onChange={handleContentChange}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

export default App;
