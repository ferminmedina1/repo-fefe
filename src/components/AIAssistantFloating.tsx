import { useState, useRef, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useSSEStream } from "@/hooks/useSSEStream";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sparkles, Loader2, Send, StopCircle, Bot, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const AIAssistantFloating = () => {
  const { currentCompany } = useCompany();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { text: streamingText, isStreaming, error: streamError, startStream, stopStream } = useSSEStream({
    onComplete: (fullText) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return [...prev.slice(0, -1), { role: "assistant", content: fullText }];
        }
        return [...prev, { role: "assistant", content: fullText }];
      });
    },
    onError: (error) => {
      toast.error(error || "Error al procesar tu consulta");
      setMessages((prev) => prev.filter((m) => !(m.role === "assistant" && m.content === "")));
    },
  });

  useEffect(() => {
    if (isStreaming && streamingText) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return [...prev.slice(0, -1), { role: "assistant", content: streamingText }];
        }
        return prev;
      });
    }
  }, [streamingText, isStreaming]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleQuery = async (text?: string) => {
    const finalQuery = (text || query).trim();
    if (!finalQuery) return;
    if (isStreaming) { stopStream(); return; }

    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: finalQuery }]);

    const lq = finalQuery.toLowerCase();
    const type = lq.includes("empleado") || lq.includes("comision") || lq.includes("rrhh") ? "hr-analysis"
      : lq.includes("banco") || lq.includes("tesorería") || lq.includes("saldo") ? "treasury"
      : lq.includes("oportunidad") || lq.includes("pipeline") || lq.includes("crm") ? "crm-pipeline"
      : lq.includes("cuenta corriente") || lq.includes("vencido") || lq.includes("cobro") ? "accounts-analysis"
      : lq.includes("compra") || lq.includes("proveedor") ? "procurement"
      : lq.includes("ticket") || lq.includes("soporte") ? "support-analysis"
      : lq.includes("stock") || lq.includes("inventario") ? "stock-analysis"
      : lq.includes("predicción") || lq.includes("proyección") ? "sales-prediction"
      : lq.includes("cliente") || lq.includes("vip") ? "customer-insights"
      : lq.includes("financ") || lq.includes("margen") || lq.includes("gasto") ? "financial-summary"
      : lq.includes("suger") || lq.includes("recomend") ? "suggestion"
      : lq.includes("por qué") || lq.includes("explica") ? "report"
      : "search";

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    await startStream("ai-assistant-stream", {
      query: finalQuery, type, companyId: currentCompany?.id,
      context: type === "report" ? finalQuery : undefined,
    });
  };

  const exampleQueries = [
    "¿Cuáles son los productos más vendidos?",
    "Dame sugerencias para mejorar las ventas",
    "¿Qué productos necesito reponer?",
    "¿Cuánto pagué en comisiones este mes?",
    "Resumen financiero del mes",
    "¿Cuántas oportunidades abiertas tengo?",
  ];

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-20 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-10 p-0"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-base leading-tight">Asistente IA</SheetTitle>
                <SheetDescription className="text-xs leading-tight">Pregunta sobre tu negocio</SheetDescription>
              </div>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground" onClick={() => setMessages([])}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {isEmpty && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center py-2">
                Hola, soy tu asistente. Puedo analizar tus datos de negocio.
              </p>
              <div className="grid gap-2">
                {exampleQueries.map((example, i) => (
                  <button key={i} onClick={() => handleQuery(example)} disabled={isStreaming}
                    className="w-full text-left text-sm px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                    <span>{example}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2 items-start", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div className={cn(
                "rounded-2xl px-3.5 py-2.5 text-sm max-w-[85%] leading-relaxed break-words",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              )}>
                {msg.role === "assistant" && msg.content === "" && isStreaming && i === messages.length - 1 ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs">Analizando...</span>
                  </span>
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
                {msg.role === "assistant" && isStreaming && i === messages.length - 1 && msg.content !== "" && (
                  <span className="inline-block w-1.5 h-3.5 bg-primary/60 animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            </div>
          ))}

          {streamError && (
            <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{streamError}</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 border-t bg-background px-4 py-3">
          <div className="flex gap-2">
            <Input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe tu consulta..."
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleQuery()}
              disabled={isStreaming} className="flex-1 h-10 text-sm" />
            <Button onClick={() => isStreaming ? stopStream() : handleQuery()} size="icon"
              className="h-10 w-10 shrink-0" variant={isStreaming ? "destructive" : "default"}>
              {isStreaming ? <StopCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
