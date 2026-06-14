import { useEffect, useState } from "react";
import { brokerApi } from "@/lib/broker-api";
import { MessageSquare, Mail, MapPin, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function BrokerInquiries() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    brokerApi.getInquiries()
      .then(setInquiries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60)    return "Just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24">
      <header className="px-5 pt-7 pb-4 sticky top-0 bg-background/95 backdrop-blur-xl z-10 border-b border-border/40">
        <h1 className="text-2xl font-bold">Inquiries</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{inquiries.length} total from interested renters & buyers</p>
      </header>

      <main className="flex-1 px-5 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : inquiries.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center gap-3">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30" />
            <div>
              <h3 className="text-lg font-bold">No inquiries yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Inquiries from renters and buyers will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {inquiries.map((inq, i) => (
              <motion.div
                key={inq.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-xs">
                        {inq.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{inq.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-2.5 h-2.5" />{inq.email}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                    <Clock className="w-2.5 h-2.5" />{formatDate(inq.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary font-medium mb-2 bg-primary/5 px-2 py-1 rounded-lg w-fit">
                  <MapPin className="w-2.5 h-2.5" />{inq.listingAddress}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{inq.message}</p>
                <div className="flex gap-2 mt-3">
                  <a href={`mailto:${inq.email}`}
                    className="flex-1 text-center text-xs font-semibold py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition"
                  >
                    Reply via Email
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
