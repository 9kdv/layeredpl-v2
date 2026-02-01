import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Mail, Search, Clock, User, MessageSquare, Send, 
  Tag, AlertCircle, CheckCircle, Archive, MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { messagesApi, Message, MessageTemplate } from '@/lib/adminApi';

const STATUS_CONFIG = {
  new: { label: 'Nowa', color: 'bg-blue-500/10 text-blue-500', icon: Mail },
  in_progress: { label: 'W trakcie', color: 'bg-yellow-500/10 text-yellow-500', icon: Clock },
  closed: { label: 'Zamknięta', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
  spam: { label: 'Spam', color: 'bg-muted text-muted-foreground', icon: Archive },
};

const PRIORITY_CONFIG = {
  low: { label: 'Niski', color: 'text-muted-foreground' },
  normal: { label: 'Normalny', color: 'text-foreground' },
  high: { label: 'Wysoki', color: 'text-orange-500' },
  urgent: { label: 'Pilne', color: 'text-destructive' },
};

export default function MessagesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', statusFilter],
    queryFn: () => messagesApi.getAll(statusFilter !== 'all' ? { status: statusFilter } : undefined)
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['message-templates'],
    queryFn: messagesApi.getTemplates
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => messagesApi.reply(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setReplyContent('');
      toast.success('Odpowiedź wysłana');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Message>) => messagesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Wiadomość zaktualizowana');
    }
  });

  const filteredMessages = messages.filter(m =>
    m.sender_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const newCount = messages.filter(m => m.status === 'new').length;

  const handleSendReply = () => {
    if (!selectedMessage || !replyContent.trim()) return;
    replyMutation.mutate({ id: selectedMessage.id, content: replyContent });
  };

  const handleTemplateSelect = (template: MessageTemplate) => {
    setReplyContent(template.content);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Ładowanie...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wiadomości</h1>
          <p className="text-muted-foreground">Zarządzaj wiadomościami od klientów</p>
        </div>
        {newCount > 0 && (
          <Badge variant="default" className="gap-1">
            <Mail className="h-3 w-3" />
            {newCount} nowych
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = messages.filter(m => m.status === key).length;
          const StatusIcon = config.icon;
          return (
            <Card key={key} className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter(key)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <StatusIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{config.label}</p>
                  <p className="text-xl font-bold">{count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Messages List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {filteredMessages.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  Brak wiadomości
                </div>
              ) : (
                <div className="divide-y">
                  {filteredMessages.map((message) => {
                    const statusConfig = STATUS_CONFIG[message.status];
                    const priorityConfig = PRIORITY_CONFIG[message.priority];
                    return (
                      <div
                        key={message.id}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedMessage?.id === message.id ? 'bg-muted' : ''
                        } ${!message.read_at && message.status === 'new' ? 'border-l-2 border-l-primary' : ''}`}
                        onClick={() => setSelectedMessage(message)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium truncate ${priorityConfig.color}`}>
                                {message.sender_name || message.sender_email}
                              </p>
                              {message.priority === 'urgent' && (
                                <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {message.subject || '(brak tematu)'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(message.created_at).toLocaleString('pl-PL')}
                            </p>
                          </div>
                          <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Detail */}
        <Card className="lg:col-span-2">
          {selectedMessage ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedMessage.subject || '(brak tematu)'}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Od: {selectedMessage.sender_name} &lt;{selectedMessage.sender_email}&gt;
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(selectedMessage.created_at).toLocaleString('pl-PL')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select 
                      value={selectedMessage.status} 
                      onValueChange={(v) => {
                        updateMutation.mutate({ id: selectedMessage.id, status: v as Message['status'] });
                        setSelectedMessage({ ...selectedMessage, status: v as Message['status'] });
                      }}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  <div className="p-4 space-y-4">
                    {/* Original message */}
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                    </div>

                    {/* Thread messages */}
                    {selectedMessage.thread?.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`rounded-lg p-4 ${msg.is_from_customer ? 'bg-muted/50' : 'bg-primary/5 border border-primary/20'}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {msg.is_from_customer ? msg.sender_name || msg.sender_email : 'layered.pl'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleString('pl-PL')}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Reply section */}
                <div className="border-t p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Odpowiedź</Label>
                    {templates.length > 0 && (
                      <Select onValueChange={(id) => {
                        const template = templates.find(t => t.id === id);
                        if (template) handleTemplateSelect(template);
                      }}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Użyj szablonu" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Wpisz odpowiedź..."
                    rows={4}
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSendReply} 
                      disabled={!replyContent.trim() || replyMutation.isPending}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Wyślij odpowiedź
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[500px]">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Wybierz wiadomość z listy</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
