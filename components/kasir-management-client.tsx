'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingCashier, setEditingCashier] = useState<CashierProfile | null>(null)
  const [editName, setEditName] = useState('')

  // Action: Create Cashier
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createCashierAction(formData)

      if (!result.success) {
        toast.error(result.error || 'Gagal menambahkan kasir')
        return
      }

      toast.success('Kasir baru berhasil didaftarkan!')
      setIsAddOpen(false)
      router.refresh()
    })
  }

  // Action: Toggle Active Status
  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const nextStatus = !currentStatus
      const result = await toggleCashierStatusAction(id, nextStatus)

      if (!result.success) {
        toast.error(result.error || 'Gagal memperbarui status kasir')
        return
      }

      toast.success(
        nextStatus ? 'Akun kasir diaktifkan kembali.' : 'Akun kasir telah dinonaktifkan.'
      )
      router.refresh()
    })
  }

  // Action: Edit Cashier Name
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCashier || !editName.trim()) return

    startTransition(async () => {
      const result = await updateCashierNameAction(editingCashier.id, editName)

      if (!result.success) {
        toast.error(result.error || 'Gagal memperbarui nama kasir')
        return
      }

      toast.success('Nama kasir diperbarui!')
      setIsEditOpen(false)
      setEditingCashier(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight">
            {t('owner.kasirManagement')}
          </h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1">
            Kelola akun kasir yang bertugas melakukan scan stempel & reward.
          </p>
        </div>

        {/* Add Cashier Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="bg-amber-500 hover:bg-amber-600 font-semibold text-white gap-2 h-11 px-5 shadow-md shadow-amber-500/10">
              <Plus className="h-4 w-4" />
              <span>{t('owner.addKasir')}</span>
            </Button>
          } />
          <DialogContent className="border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
            <form onSubmit={handleAddSubmit}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-amber-500" />
                  <span>Daftarkan Kasir Baru</span>
                </DialogTitle>
                <DialogDescription>
                  Kasir baru dapat langsung masuk menggunakan email dan password yang Anda tentukan di bawah ini.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nama Lengkap</Label>
                  <Input id="fullName" name="fullName" placeholder="Nama Kasir" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="kasir@cafe.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password Sementara</Label>
                  <Input id="password" name="password" type="password" placeholder="Minimal 6 karakter" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isPending} className="bg-amber-500 hover:bg-amber-600 text-white">
                  {isPending ? t('common.loading') : 'Daftarkan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cashiers Table */}
      <Card className="border-stone-200/60 shadow-sm dark:border-stone-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-stone-50/50 dark:bg-stone-900/30">
              <TableRow>
                <TableHead className="font-bold text-stone-700 dark:text-stone-300">Nama</TableHead>
                <TableHead className="font-bold text-stone-700 dark:text-stone-300">Email</TableHead>
                <TableHead className="font-bold text-stone-700 dark:text-stone-300">Status</TableHead>
                <TableHead className="font-bold text-stone-700 dark:text-stone-300">Tanggal Dibuat</TableHead>
                <TableHead className="w-20 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-xs text-stone-400 italic">
                    Belum ada kasir yang terdaftar.
                  </TableCell>
                </TableRow>
              ) : (
                cashiers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/20">
                    <TableCell className="font-semibold text-stone-950 dark:text-stone-100">
                      {c.full_name}
                    </TableCell>
                    <TableCell className="text-stone-500">{c.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={c.is_active ? 'default' : 'secondary'}
                        className={c.is_active ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'}
                      >
                        {c.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-stone-400 text-xs">
                      {new Date(c.created_at).toLocaleDateString('id-ID', {
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
                          className="h-8 w-8 text-stone-500 hover:text-stone-950"
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
        <DialogContent className="border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-amber-500" />
                <span>Ubah Nama Kasir</span>
              </DialogTitle>
              <DialogDescription>
                Perbarui nama kasir ({editingCashier?.email}) untuk tampilan di audit log.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Nama Lengkap</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nama Baru Kasir"
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
                Batal
              </Button>
              <Button type="submit" disabled={isPending} className="bg-amber-500 hover:bg-amber-600 text-white">
                {isPending ? t('common.loading') : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
