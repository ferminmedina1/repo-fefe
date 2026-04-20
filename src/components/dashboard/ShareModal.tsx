import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Share2, Copy, Check } from "lucide-react";
import { useCreateShareLink, generateShareUrl } from "@/hooks/dashboard";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  layoutId: string;
}

export function ShareModal({ layoutId }: ShareModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const createShareLink = useCreateShareLink();

  const handleCreateShare = async () => {
    try {
      const result = await createShareLink.mutateAsync(layoutId);
      const shareUrl = generateShareUrl(result.share_token);

      navigator.clipboard.writeText(shareUrl);
      setCopied(true);

      setTimeout(() => setCopied(false), 2000);

      toast({
        title: "✓ Share link copied",
        description: "Ready to share with others",
      });
    } catch (error) {
      toast({
        title: "Failed to create share link",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartir Panel de Control</DialogTitle>
          <DialogDescription>
            Create a shareable link to your dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Anyone with this link can view your dashboard in read-only mode.
          </p>

          <Button
            onClick={handleCreateShare}
            disabled={createShareLink.isPending}
            className="w-full"
          >
            {createShareLink.isPending ? "Creating..." : "Generate Share Link"}
          </Button>

          {createShareLink.data && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2">Share Link:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generateShareUrl(createShareLink.data.share_token)}
                  className="flex-1 bg-white border rounded px-3 py-2 text-sm font-mono truncate"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      generateShareUrl(createShareLink.data.share_token)
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
