import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Underline as UnderlineIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LyricsEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function LyricsEditor({ value, onChange, disabled = false, placeholder }: LyricsEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "Verse 1\n...\n\nChorus\n...",
      }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class: "tiptap min-h-[100px] max-h-[300px] overflow-y-auto outline-none text-sm leading-relaxed px-3 py-2",
        "data-testid": "input-lyrics",
      },
    },
  });

  const canUnderline = editor?.can().toggleMark("underline") ?? false;

  const ToolbarBtn = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        "rounded p-1.5 transition-colors",
        active
          ? "bg-primary/20 text-primary"
          : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex items-center gap-0.5 border-b border-input px-2 py-1">
        <ToolbarBtn
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={!!editor?.isActive("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={!!editor?.isActive("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        {canUnderline && (
          <ToolbarBtn
            onClick={() => editor?.chain().focus().toggleMark("underline").run()}
            active={!!editor?.isActive("underline")}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarBtn>
        )}
      </div>

      <EditorContent editor={editor} />
      <p className="px-3 pb-2 pt-1 text-[11px] text-muted-foreground/50 select-none">
        Press <kbd className="rounded border border-muted-foreground/20 bg-muted/40 px-1 py-px font-mono text-[10px]">Enter</kbd> twice to add a blank line between sections
      </p>
    </div>
  );
}
