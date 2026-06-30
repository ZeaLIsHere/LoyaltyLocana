'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { createCashierAction, toggleCashierStatusAction, updateCashierNameAction } from '@/lib/supabase/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CashierProfile {
  id: string
  full_name: string
  email: string
  is_active: boolean
  created_at: string
}

interface KasirManagementClientProps {
  cashiers: CashierProfile[]
}

export default function KasirManagementClient({ cashiers }: KasirManagementClientProps) {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingCashier, setEditingCashier] = useState<CashierProfile | null>(null)
  const [editName, setEditName] = useState('')

  const intlLocale = locale === 'id' ? 'id-ID' : 'en-US'

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createCashierAction(formData)
      if (!result.success) {
        toast.error(result.error || t('owner.createKasirError'))
        return
      }
      toast.success(t('owner.kasirCreated'))
      setIsAddOpen(false)
      router.refresh()
    })
  }

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const nextStatus = !currentStatus
      const result = await toggleCashierStatusAction(id, nextStatus)
      if (!result.success) {
        toast.error(result.error || t('common.error'))
        return
      }
      toast.success(nextStatus ? t('owner.kasirActivated') : t('owner.kasirDeactivated'))
      router.refresh()
    })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCashier || !editName.trim()) return

    startTransition(async () => {
      const result = await updateCashierNameAction(editingCashier.id, editName)
      if (!result.success) {
        toast.error(result.error || t('common.error'))
        return
      }
      toast.success(t('owner.kasirNameUpdated'))
      setIsEditOpen(false)
      setEditingCashier(null)
      router.refresh()
    })
  }

  return (
    <div className="animate-in space-y-6 duration-300 fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">{t('owner.kasirManagement')}</h1>
          <p className="mt-1 text-muted-foreground">{t('owner.kasirManagementSubtitle')}</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger
            render={
              <Button className="h-11 gap-2 px-5 font-semibold">
                <Plus className="h-4 w-4" />
                <span>{t('owner.addKasir')}</span>
              </Button>
            }
          />
          <DialogContent>
            <form onSubmit={handleAddSubmit}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-accent" />
                  <span>{t('owner.registerKasirTitle')}</span>
                </DialogTitle>
                <DialogDescription>{t('owner.registerKasirDesc')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                  <Input id="fullName" name="fullName" placeholder={t('owner.kasirNamePlaceholder')} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input id="email" name="email" type="email" placeholder={t('auth.emailPlaceholder')} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('owner.tempPasswordLabel')}</Label>
                  <Input id="password" name="password" type="password" placeholder={t('owner.minCharsHint')} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? t('common.loading') : t('owner.registerSubmit')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cashiers Table */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead className="font-bold text-foreground">{t('auth.fullName')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('auth.email')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('owner.status')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('owner.createdAtCol')}</TableHead>
                <TableHead className="w-20 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-xs italic text-muted-foreground">
                    {t('owner.noKasir')}
                  </TableCell>
                </TableRow>
              ) : (
                cashiers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-secondary/40">
                    <TableCell className="font-semibold text-foreground">{c.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={c.is_active ? 'default' : 'secondary'}
                        className={cn(
                          c.is_active
                            ? 'bg-success/15 text-success'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {c.is_active ? t('owner.active') : t('owner.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString(intlLocale, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Switch
                          checked={c.is_active}
                          onCheckedChange={() => handleToggleStatus(c.id, c.is_active)}
                          disabled={isPending}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCashier(c)
                            setEditName(c.full_name)
                            setIsEditOpen(true)
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label={t('owner.editKasir')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Cashier Name Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-accent" />
                <span>{t('owner.editKasirNameTitle')}</span>
              </DialogTitle>
              <DialogDescription>
                {t('owner.editKasirNameDesc', { email: editingCashier?.email ?? '' })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">{t('auth.fullName')}</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('owner.newKasirNamePlaceholder')}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false)
                  setEditingCashier(null)
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
