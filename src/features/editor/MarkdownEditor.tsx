import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, undo as cmUndo, redo as cmRedo } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { generateAttachmentFilename } from '../../lib/id';
import { db } from '../../db/db';
import { AttachmentRecord } from '../../types';
import { syncEngine } from '../sync/syncEngine';

export interface MarkdownEditorRef {
  insertText: (prefix: string, suffix?: string, defaultText?: string) => void;
  openFilePicker: () => void;
  undo?: () => void;
  redo?: () => void;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  notebookId: string;
  isDark?: boolean;
  onUploadProgress?: (status: { uploading: boolean; filename?: string; progress?: number }) => void;
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(({
  value,
  onChange,
  onScroll,
  notebookId,
  isDark = false,
  onUploadProgress,
}, ref) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useImperativeHandle(ref, () => ({
    insertText: (prefix: string, suffix: string = '', defaultText: string = '') => {
      const view = viewRef.current;
      if (!view) return;
      const sel = view.state.selection.main;
      const selectedText = view.state.sliceDoc(sel.from, sel.to) || defaultText;
      const replacement = `${prefix}${selectedText}${suffix}`;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: replacement },
        selection: { anchor: sel.from + prefix.length, head: sel.from + prefix.length + selectedText.length },
      });
      view.focus();
    },
    openFilePicker: () => {
      fileInputRef.current?.click();
    },
    undo: () => {
      if (viewRef.current) {
        cmUndo(viewRef.current);
      }
    },
    redo: () => {
      if (viewRef.current) {
        cmRedo(viewRef.current);
      }
    },
  }));

  useEffect(() => {
    if (!editorContainerRef.current) return;

    const customTheme = EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '14.5px',
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        backgroundColor: 'transparent',
      },
      '.cm-content': {
        padding: '20px 24px',
        lineHeight: '1.7',
      },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        borderRight: '1px solid transparent',
        color: isDark ? '#64748b' : '#94a3b8',
        paddingRight: '10px',
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: isDark ? '#818cf8' : '#4f46e5',
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(79, 70, 229, 0.15)',
      },
      '.cm-line': {
        padding: '0 4px',
      },
    });

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const text = update.state.doc.toString();
        onChangeRef.current(text);
      }
    });

    const scrollListener = EditorView.domEventHandlers({
      scroll: (_event, view) => {
        if (onScroll) {
          const dom = view.scrollDOM;
          onScroll(dom.scrollTop, dom.scrollHeight, dom.clientHeight);
        }
      },
      paste: (event, view) => {
        const files = event.clipboardData?.files;
        if (files && files.length > 0) {
          handleFileInsert(files[0], view);
        }
      },
      drop: (event, view) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          event.preventDefault();
          handleFileInsert(files[0], view);
        }
      },
    });

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      EditorView.lineWrapping,
      markdown(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      customTheme,
      updateListener,
      scrollListener,
    ];

    if (isDark) {
      extensions.push(oneDark);
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorContainerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [isDark]);

  // Sync external value changes into editor
  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  // File / Image Attachment handler
  const handleFileInsert = async (file: File, view?: EditorView | null) => {
    const targetView = view || viewRef.current;
    if (!notebookId || !targetView) return;

    if (onUploadProgress) {
      onUploadProgress({ uploading: true, filename: file.name, progress: 30 });
    }

    try {
      const generatedName = generateAttachmentFilename(file.name);
      const relativePath = `../_attachments/${generatedName}`;
      const attId = generatedName;

      const attRecord: AttachmentRecord = {
        id: attId,
        notebookId,
        filename: generatedName,
        relativePath,
        mimeType: file.type || 'application/octet-stream',
        blob: file,
        size: file.size,
        created: new Date().toISOString(),
        localDirty: true,
      };

      await db.attachments.put(attRecord);
      await syncEngine.queueOutbox('upload_attachment', attId, notebookId, undefined, {
        filename: generatedName,
      });

      if (onUploadProgress) {
        onUploadProgress({ uploading: true, filename: file.name, progress: 100 });
        setTimeout(() => onUploadProgress({ uploading: false }), 800);
      }

      // Insert markdown link
      const isImg = file.type.startsWith('image/');
      const linkMarkdown = isImg ? `![${file.name}](${relativePath})` : `[${file.name}](${relativePath})`;

      const sel = targetView.state.selection.main;
      targetView.dispatch({
        changes: { from: sel.from, to: sel.to, insert: linkMarkdown },
        selection: { anchor: sel.from + linkMarkdown.length },
      });
    } catch (err) {
      console.error('Attachment upload failed:', err);
      if (onUploadProgress) {
        onUploadProgress({ uploading: false });
      }
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileInsert(files[0]);
    }
    e.target.value = '';
  };

  return (
    <div className="h-full w-full overflow-hidden relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileInputChange}
        className="hidden"
      />
      <div ref={editorContainerRef} className="h-full w-full overflow-hidden" />
    </div>
  );
});

MarkdownEditor.displayName = 'MarkdownEditor';
