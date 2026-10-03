import React from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Table,
  Link,
  Image,
  Paperclip,
} from 'lucide-react';

interface FormattingToolbarProps {
  onInsertMarkdown: (prefix: string, suffix?: string, defaultText?: string) => void;
  onUploadClick?: () => void;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  onInsertMarkdown,
  onUploadClick,
}) => {
  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark overflow-x-auto text-ink-secondary dark:text-ink-darkSecondary">
      {/* Styles */}
      <button
        onClick={() => onInsertMarkdown('**', '**', 'bold text')}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </button>

      <button
        onClick={() => onInsertMarkdown('*', '*', 'italic text')}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        title="Italic (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </button>

      <button
        onClick={() => onInsertMarkdown('~~', '~~', 'strikethrough')}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-4 bg-border-subtle dark:bg-border-darkSubtle mx-1" />

      {/* Headings */}
      <button
        onClick={() => onInsertMarkdown('# ', '', 'Heading 1')}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition text-xs font-bold"
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>

      <button
        onClick={() => onInsertMarkdown('## ', '', 'Heading 2')}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition text-xs font-bold"
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>

      <button
        onClick={() => onInsertMarkdown('### ', '', 'Heading 3')}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition text-xs font-bold"
        title="Heading 3"
      >
        <Heading3 className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-4 bg-border-subtle dark:bg-border-darkSubtle mx-1" />

      {/* Lists */}
      <button
        onClick={() => onInsertMarkdown('- ', '', 'Bullet item')}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        title="Bulleted List"
      >
        <List className="w-4 h-4" />
      </button>

      <button
        onClick={() => onInsertMarkdown('1. ', '', 'Numbered item')}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        title="Numbered List"
      >
        <ListOrdered className="w-4 h-4" />
      </button>

      <button
        onClick={() => onInsertMarkdown('- [ ] ', '', 'Task item')}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition text-brand-primary"
        title="Task Checklist"
      >
        <CheckSquare className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-4 bg-border-subtle dark:bg-border-darkSubtle mx-1" />

      {/* Code, Quote, Table */}
      <button
        onClick={() => onInsertMarkdown('> ', '', 'Quote here')}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        title="Blockquote"
      >
        <Quote className="w-4 h-4" />
      </button>

      <button
        onClick={() => onInsertMarkdown('```\n', '\n```', 'code here')}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        title="Code Block"
      >
        <Code className="w-4 h-4" />
      </button>

      <button
        onClick={() => onInsertMarkdown('\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n')}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        title="Table"
      >
        <Table className="w-4 h-4" />
      </button>

      <button
        onClick={() => onInsertMarkdown('[', '](https://example.com)', 'link text')}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        title="Link (Ctrl+Shift+K)"
      >
        <Link className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-4 bg-border-subtle dark:bg-border-darkSubtle mx-1" />

      {/* Attachments */}
      <button
        onClick={onUploadClick}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition text-brand-primary dark:text-brand-darkPrimary"
        title="Upload Image or Attachment"
      >
        <Image className="w-4 h-4" />
      </button>
      <button
        onClick={onUploadClick}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        title="Attach File"
      >
        <Paperclip className="w-4 h-4" />
      </button>
    </div>
  );
};
