'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Users, Search, Coffee, Calendar, Gift, RefreshCw, Trash2 } from 'lucide-react'
import { fetchCustomerDetail, updateCustomerAction, deleteCustomerAction } from '@/lib/supabase/actions'

interface CustomerData {
  id: string
  full_name: string
  email: string
  birth_date: string | null
  created_at: string
  current_stamps: number
}

interface CustomersClientProps {
  customers: CustomerData[]
}

export default function CustomersClient({ customers }: CustomersClientProps) {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CustomerData | null>(null)
  const [editName, setEditName] = useState('')
  const [editBirthDate, setEditBirthDate] = useState('')
  const [detail, setDetail] = useState<{ lifetimeStamps: number; rewardsRedeemed: number } | null>(
    null
  )
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CustomerData | null>(null)

  const intlLocale = locale === 'id' ? 'id-ID' : 'en-US'

  const filteredCustomers = customers.filter((c) => {
    const query = search.toLowerCase()
    return c.full_name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)
  })

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(intlLocale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getAge = (birth: string) => {
    if (!birth) return null
    const b = new Date(birth)
    if (isNaN(b.getTime())) return null
    const now = new Date()
    let age = now.getFullYear() - b.getFullYear()
    const m = now.getMonth() - b.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
    return age >= 0 ? age : null
  }

  const openDetail = async (c: CustomerData) => {
    setSelected(c)
    setEditName(c.full_name)
    setEditBirthDate(c.birth_date ?? '')
    setDetail(null)
    setLoadingDetail(true)
    const res = await fetchCustomerDetail(c.id)
    setLoadingDetail(false)
    if (res.success) {
      setDetail({
        lifetimeStamps: res.lifetimeStamps ?? 0,
        rewardsRedeemed: res.rewardsRedeemed ?? 0,
      })
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !editName.trim()) return
    startTransition(async () => {
      const res = await updateCustomerAction(selected.id, editName, editBirthDate || null)
      if (!res.success) {
        toast.error(res.error || t('common.error'))
        return
      }
      toast.success(t('owner.customerUpdated'))
      setSelected(null)
      router.refresh()
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      const res = await deleteCustomerAction(deleteTarget.id)
      if (!res.success) {
        toast.error(res.error || t('common.error'))
        return
      }
      toast.success(t('owner.customerDeleted'))
      setDeleteTarget(null)
      router.refresh()
    })
  }

  const editAge = getAge(editBirthDate)

  return (
    <div className="animate-in space-y-6 duration-300 fade-in">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-3xl tracking-tight text-foreground">
          <Users className="h-8 w-8 text-accent" />
          <span>{t('owner.customersList')}</span>
        </h1>
        <p className="mt-1 text-muted-foreground">{t('owner.customersListDesc')}</p>
      </div>

      {/* Search + total (same row, total kept on the right) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-accent/40 sm:max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-6 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2 self-end rounded-full border border-border bg-card px-3 py-1.5 shadow-sm sm:self-auto">
          <span className="text-xs text-muted-foreground">{t('owner.totalCustomers')}:</span>
          <Badge className="bg-accent font-extrabold text-accent-foreground">{customers.length}</Badge>
        </div>
      </div>

      {/* Customer Table */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead className="font-bold text-foreground">{t('auth.fullName')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('auth.email')}</TableHead>
                <TableHead className="font-bold text-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {t('auth.birthDate')}
                  </span>
                </TableHead>
                <TableHead className="font-bold text-foreground">
                  <span className="flex items-center gap-1">
                    <Coffee className="h-4 w-4 text-muted-foreground" />
                    {t('owner.stamps')}
                  </span>
                </TableHead>
                <TableHead className="font-bold text-foreground">{t('owner.createdAtCol')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-xs italic text-muted-foreground"
                  >
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c) => (
                  <TableRow
                    key={c.id}
                    onClick={() => openDetail(c)}
                    className="cursor-pointer hover:bg-secondary/40"
                  >
                    <TableCell className="font-semibold text-foreground">{c.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell className="font-mono text-xs text-foreground">
                      {c.birth_date ? formatDate(c.birth_date) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="flex w-fit items-center gap-1 border-accent/40 bg-accent/10 font-bold text-accent"
                      >
                        <Coffee className="h-3 w-3" />
                        <span>
                          {c.current_stamps} {t('owner.stamps')}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(c.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer detail + edit dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                {t('owner.customerDetail')}
              </DialogTitle>
              <DialogDescription>{selected?.email}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Editable fields */}
              <div className="space-y-2">
                <Label htmlFor="editName">{t('auth.fullName')}</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBirthDate">{t('auth.birthDate')}</Label>
                <Input
                  id="editBirthDate"
                  type="date"
                  value={editBirthDate}
                  onChange={(e) => setEditBirthDate(e.target.value)}
                />
                {editAge !== null && (
                  <p className="text-[10px] text-muted-foreground">
                    {t('owner.ageYears', { count: editAge })}
                  </p>
                )}
              </div>

              {/* Read-only stats */}
              <div className="grid grid-cols-2 gap-3">
                <DetailTile
                  icon={<Coffee className="h-4 w-4" />}
                  label={t('owner.currentStampsLabel')}
                  value={String(selected?.current_stamps ?? 0)}
                />
                <DetailTile
                  icon={<Coffee className="h-4 w-4" />}
                  label={t('owner.lifetimeStamps')}
                  value={loadingDetail || !detail ? '…' : String(detail.lifetimeStamps)}
                />
                <DetailTile
                  icon={<Gift className="h-4 w-4" />}
                  label={t('owner.rewardsRedeemedLabel')}
                  value={loadingDetail || !detail ? '…' : String(detail.rewardsRedeemed)}
                />
                <DetailTile
                  icon={<Calendar className="h-4 w-4" />}
                  label={t('owner.joinedOn')}
                  value={selected ? formatDate(selected.created_at) : '-'}
                />
              </div>

              {loadingDetail && (
                <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  {t('common.loading')}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDeleteTarget(selected)
                  setSelected(null)
                }}
                disabled={isPending}
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
              >
                <Trash2 className="h-4 w-4" />
                {t('owner.deleteCustomer')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {t('common.confirmDeleteTitle')}
            </DialogTitle>
            <DialogDescription>{t('common.confirmDelete')}</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
            <p className="font-semibold text-foreground">{deleteTarget?.full_name}</p>
            <p className="text-xs text-muted-foreground">{deleteTarget?.email}</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? t('common.loading') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailTile({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-border bg-secondary/40 p-3 ${className ?? ''}`}>
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
    </div>
  )
}
