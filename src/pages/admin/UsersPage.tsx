import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Plus, Search, Shield, UserPlus, MoreHorizontal, 
  Check, X, Lock, Unlock, Key, Trash2, Edit2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  api, 
  AdminUserData, 
  RoleData, 
  GroupData, 
  PermissionData,
  CreateUserPayload,
  UpdateUserPayload,
  CreateRolePayload,
  UpdateRolePayload
} from '@/lib/api';

const PERMISSION_CATEGORIES: Record<string, string> = {
  orders: 'Zamówienia',
  products: 'Produkty',
  users: 'Użytkownicy',
  finance: 'Finanse',
  production: 'Produkcja',
  settings: 'Ustawienia',
  system: 'System'
};

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  
  const [userDialog, setUserDialog] = useState<{ open: boolean; user?: AdminUserData }>({ open: false });
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; role?: RoleData }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string; name: string }>({ open: false, type: '', id: '', name: '' });
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; userId: string; email: string; password?: string }>({ open: false, userId: '', email: '' });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.getAdminUsers()
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.getRoles()
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => api.getPermissions()
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: () => api.getGroups()
  });

  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserPayload) => api.createAdminUser(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUserDialog({ open: false });
      if (result.tempPassword) {
        setPasswordDialog({ open: true, userId: result.id, email: '', password: result.tempPassword });
      } else {
        toast({ title: 'Użytkownik utworzony' });
      }
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateUserPayload) => api.updateAdminUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUserDialog({ open: false });
      toast({ title: 'Użytkownik zaktualizowany' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const toggleBlockMutation = useMutation({
    mutationFn: (id: string) => api.toggleBlockUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Status zmieniony' });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => api.resetUserPassword(id),
    onSuccess: (result, id) => {
      const user = users.find(u => u.id === id);
      setPasswordDialog({ open: true, userId: id, email: user?.email || '', password: result.temporaryPassword });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.deleteAdminUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteDialog({ open: false, type: '', id: '', name: '' });
      toast({ title: 'Użytkownik usunięty' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const createRoleMutation = useMutation({
    mutationFn: (data: CreateRolePayload) => api.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setRoleDialog({ open: false });
      toast({ title: 'Rola utworzona' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateRolePayload) => api.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setRoleDialog({ open: false });
      toast({ title: 'Rola zaktualizowana' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => api.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setDeleteDialog({ open: false, type: '', id: '', name: '' });
      toast({ title: 'Rola usunięta' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.first_name && u.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.last_name && u.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const permissionsByCategory = permissions.reduce((acc, perm) => {
    const cat = perm.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(perm);
    return acc;
  }, {} as Record<string, PermissionData[]>);

  const handleSaveUser = (formData: any) => {
    if (userDialog.user) {
      updateUserMutation.mutate({ id: userDialog.user.id, ...formData });
    } else {
      createUserMutation.mutate(formData);
    }
  };

  const handleSaveRole = (formData: any) => {
    if (roleDialog.role) {
      updateRoleMutation.mutate({ id: roleDialog.role.id, ...formData });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Użytkownicy i grupy</h1>
          <p className="text-muted-foreground">Zarządzaj użytkownikami, grupami i uprawnieniami</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Użytkownicy ({users.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Grupy ({roles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Szukaj użytkowników..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => setUserDialog({ open: true })} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Dodaj użytkownika
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Użytkownik</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ostatnie logowanie</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {user.first_name || user.last_name 
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                              : user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map(role => (
                            <Badge 
                              key={role.id} 
                              variant={role.name === 'superadmin' ? 'default' : role.name === 'admin' ? 'secondary' : 'outline'}
                            >
                              {role.display_name}
                            </Badge>
                          ))}
                          {user.roles.length === 0 && (
                            <Badge variant="outline">Brak roli</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.is_blocked ? (
                          <Badge variant="destructive" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Zablokowany
                          </Badge>
                        ) : user.is_active ? (
                          <Badge variant="outline" className="border-primary/50 text-primary gap-1">
                            <Check className="h-3 w-3" />
                            Aktywny
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground gap-1">
                            <X className="h-3 w-3" />
                            Nieaktywny
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.last_login_at 
                          ? new Date(user.last_login_at).toLocaleString('pl-PL')
                          : 'Nigdy'
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setUserDialog({ open: true, user })}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edytuj
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => resetPasswordMutation.mutate(user.id)}>
                              <Key className="h-4 w-4 mr-2" />
                              Resetuj hasło
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleBlockMutation.mutate(user.id)}>
                              {user.is_blocked ? (
                                <>
                                  <Unlock className="h-4 w-4 mr-2" />
                                  Odblokuj
                                </>
                              ) : (
                                <>
                                  <Lock className="h-4 w-4 mr-2" />
                                  Zablokuj
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteDialog({ open: true, type: 'user', id: user.id, name: user.email })}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Usuń
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Grupy systemowe</CardTitle>
                <Button onClick={() => setRoleDialog({ open: true })} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Dodaj grupę
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{role.display_name}</h4>
                        {role.is_system && (
                          <Badge variant="secondary" className="text-xs">Systemowa</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">Priorytet: {role.priority}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {role.permissions?.slice(0, 5).map(perm => (
                          <Badge key={perm.id} variant="outline" className="text-xs">
                            {perm.display_name}
                          </Badge>
                        ))}
                        {role.permissions && role.permissions.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 5} więcej
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setRoleDialog({ open: true, role })}
                        disabled={role.name === 'superadmin'}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, type: 'role', id: role.id, name: role.display_name })}
                        disabled={role.is_system}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <UserEditDialog 
        open={userDialog.open}
        user={userDialog.user}
        roles={roles}
        groups={groups}
        onClose={() => setUserDialog({ open: false })}
        onSave={handleSaveUser}
        isLoading={createUserMutation.isPending || updateUserMutation.isPending}
      />

      <RoleEditDialog
        open={roleDialog.open}
        role={roleDialog.role}
        permissions={permissions}
        permissionsByCategory={permissionsByCategory}
        onClose={() => setRoleDialog({ open: false })}
        onSave={handleSaveRole}
        isLoading={createRoleMutation.isPending || updateRoleMutation.isPending}
      />

      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: '', id: '', name: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdź usunięcie</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć {deleteDialog.type === 'user' ? 'użytkownika' : 'rolę'} <strong>{deleteDialog.name}</strong>?
              Tej operacji nie można cofnąć.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, type: '', id: '', name: '' })}>
              Anuluj
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteDialog.type === 'user') {
                  deleteUserMutation.mutate(deleteDialog.id);
                } else if (deleteDialog.type === 'role') {
                  deleteRoleMutation.mutate(deleteDialog.id);
                }
              }}
            >
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialog.open} onOpenChange={(open) => !open && setPasswordDialog({ open: false, userId: '', email: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tymczasowe hasło</DialogTitle>
            <DialogDescription>
              Hasło dla użytkownika <strong>{passwordDialog.email}</strong> zostało zresetowane.
              Przekaż to hasło użytkownikowi - będzie musiał je zmienić przy pierwszym logowaniu.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg font-mono text-center text-lg">
            {passwordDialog.password}
          </div>
          <DialogFooter>
            <Button onClick={() => {
              navigator.clipboard.writeText(passwordDialog.password || '');
              toast({ title: 'Skopiowano do schowka' });
            }}>
              Kopiuj hasło
            </Button>
            <Button variant="outline" onClick={() => setPasswordDialog({ open: false, userId: '', email: '' })}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserEditDialog({ 
  open, 
  user, 
  roles, 
  groups,
  onClose, 
  onSave,
  isLoading 
}: { 
  open: boolean;
  user?: AdminUserData;
  roles: RoleData[];
  groups: GroupData[];
  onClose: () => void;
  onSave: (data: CreateUserPayload | UpdateUserPayload) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    is_active: true,
    is_blocked: false,
    roles: [] as string[],
    groups: [] as string[]
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        password: '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        is_active: user.is_active,
        is_blocked: user.is_blocked,
        roles: user.roles.map(r => r.id),
        groups: user.groups.map(g => g.id)
      });
    } else {
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        is_active: true,
        is_blocked: false,
        roles: [],
        groups: []
      });
    }
  }, [user, open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? 'Edytuj użytkownika' : 'Nowy użytkownik'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Imię</Label>
              <Input 
                value={formData.first_name}
                onChange={(e) => setFormData(f => ({ ...f, first_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Nazwisko</Label>
              <Input 
                value={formData.last_name}
                onChange={(e) => setFormData(f => ({ ...f, last_name: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          {!user && (
            <div className="space-y-2">
              <Label>Hasło (opcjonalnie - jeśli puste, wygenerowane automatycznie)</Label>
              <Input 
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(f => ({ ...f, password: e.target.value }))}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Telefon</Label>
            <Input 
              value={formData.phone}
              onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <div className="flex flex-wrap gap-2">
              {roles.map(role => (
                <Badge 
                  key={role.id}
                  variant={formData.roles.includes(role.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    setFormData(f => ({
                      ...f,
                      roles: f.roles.includes(role.id) 
                        ? f.roles.filter(r => r !== role.id)
                        : [...f.roles, role.id]
                    }));
                  }}
                >
                  {role.display_name}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Grupy</Label>
            <div className="flex flex-wrap gap-2">
              {groups.map(group => (
                <Badge 
                  key={group.id}
                  variant={formData.groups.includes(group.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    setFormData(f => ({
                      ...f,
                      groups: f.groups.includes(group.id) 
                        ? f.groups.filter(g => g !== group.id)
                        : [...f.groups, group.id]
                    }));
                  }}
                >
                  {group.display_name}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_active" 
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(f => ({ ...f, is_active: !!checked }))}
              />
              <Label htmlFor="is_active">Aktywny</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_blocked" 
                checked={formData.is_blocked}
                onCheckedChange={(checked) => setFormData(f => ({ ...f, is_blocked: !!checked }))}
              />
              <Label htmlFor="is_blocked">Zablokowany</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={() => onSave(formData)} disabled={isLoading || !formData.email}>
            {isLoading ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoleEditDialog({ 
  open, 
  role, 
  permissions,
  permissionsByCategory,
  onClose, 
  onSave,
  isLoading 
}: { 
  open: boolean;
  role?: RoleData;
  permissions: PermissionData[];
  permissionsByCategory: Record<string, PermissionData[]>;
  onClose: () => void;
  onSave: (data: CreateRolePayload | UpdateRolePayload) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    priority: 0,
    permissions: [] as string[]
  });

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        display_name: role.display_name,
        description: role.description || '',
        priority: role.priority,
        permissions: role.permissions?.map(p => p.id) || []
      });
    } else {
      setFormData({
        name: '',
        display_name: '',
        description: '',
        priority: 0,
        permissions: []
      });
    }
  }, [role, open]);

  const togglePermission = (permId: string) => {
    setFormData(f => ({
      ...f,
      permissions: f.permissions.includes(permId)
        ? f.permissions.filter(p => p !== permId)
        : [...f.permissions, permId]
    }));
  };

  const toggleCategory = (perms: PermissionData[]) => {
    const allSelected = perms.every(p => formData.permissions.includes(p.id));
    if (allSelected) {
      setFormData(f => ({
        ...f,
        permissions: f.permissions.filter(p => !perms.find(pp => pp.id === p))
      }));
    } else {
      setFormData(f => ({
        ...f,
        permissions: [...new Set([...f.permissions, ...perms.map(p => p.id)])]
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? 'Edytuj rolę' : 'Nowa rola'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nazwa systemowa *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                disabled={!!role}
                placeholder="np. producer"
              />
            </div>
            <div className="space-y-2">
              <Label>Nazwa wyświetlana *</Label>
              <Input 
                value={formData.display_name}
                onChange={(e) => setFormData(f => ({ ...f, display_name: e.target.value }))}
                placeholder="np. Producent"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Opis</Label>
            <Input 
              value={formData.description}
              onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Priorytet (wyższy = ważniejsza rola)</Label>
            <Input 
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
            />
          </div>
          
          <div className="space-y-4">
            <Label>Uprawnienia</Label>
            {Object.entries(permissionsByCategory).map(([category, perms]) => (
              <div key={category} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{PERMISSION_CATEGORIES[category] || category}</h4>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleCategory(perms)}
                  >
                    {perms.every(p => formData.permissions.includes(p.id)) ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {perms.map(perm => (
                    <div key={perm.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={perm.id}
                        checked={formData.permissions.includes(perm.id)}
                        onCheckedChange={() => togglePermission(perm.id)}
                      />
                      <Label htmlFor={perm.id} className="text-sm cursor-pointer">
                        {perm.display_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button 
            onClick={() => onSave(formData)} 
            disabled={isLoading || !formData.name || !formData.display_name}
          >
            {isLoading ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
