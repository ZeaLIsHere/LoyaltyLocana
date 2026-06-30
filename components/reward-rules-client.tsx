'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { upsertRewardRuleAction } from '@/lib/supabase/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Award } from 'lucide-react'

interface RewardRule {
  id: string
  name: string
  description: string | null
  target_stamps: number
  is_active: boolean
  created_at: string
}

interface RewardRulesClientProps {
  rules: RewardRule[]
}

export default function RewardRulesClient({ rules }: RewardRulesClientProps) {
  const t = useTranslations()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form Dialog States
  const [isOpen, setIsOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RewardRule | null>(null)

  // Form Inputs
  const [name, setName] = useState('')
  const [targetStamps, setTargetStamps] = useState(5)
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  const openAddDialog = () => {
    setEditingRule(null)
    setName('')
    setTargetStamps(5)
    setDescription('')
    setIsActive(true)
    setIsOpen(true)
  }

  const openEditDialog = (rule: RewardRule) => {
    setEditingRule(rule)
    setName(rule.name)
    setTargetStamps(rule.target_stamps)
    setDescription(rule.description || '')
    setIsActive(rule.is_active)
    setIsOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || targetStamps <= 0) {
      toast.error('Nama dan target stamp wajib diisi dengan benar')
      return
    }

    startTransition(async () => {
      const result = await upsertRewardRuleAction(
        editingRule ? editingRule.id : null,
        name,
        targetStamps,
        description.trim() || null,
        isActive
      )

      if (!result.success) {
        toast.error(result.error || 'Gagal menyimpan aturan')
        return
      }

      toast.success(editingRule ? 'Aturan reward berhasil diperbarui!' : 'Aturan reward baru ditambahkan!')
      setIsOpen(false)
      router.refresh()
    })
  }

  const handleToggleActive = (rule: RewardRule) => {
    startTransition(async () => {
      const result = await upsertRewardRuleAction(
        rule.id,
        rule.name,
        rule.target_stamps,
        rule.description,
        !rule.is_active
      )

      if (!result.success) {
        toast.error(result.error || 'Gagal mengubah status aktif')
        return
      }

      toast.success(rule.is_active ? 'Aturan dinonaktifkan.' : 'Aturan diaktifkan kembali.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight">
            {t('owner.rewardRules')}
          </h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1">
            Tentukan jenis reward dan stempel target untuk memicu penukaran bagi customer.
          </p>
        </div>

        <Button
          onClick={openAddDialog}
          className="bg-amber-500 hover:bg-amber-600 font-semibold text-white gap-2 h-11 px-5 shadow-md shadow-amber-500/10"
        >
          <Plus className="h-4 w-4" />
          <span>{t('owner.addRewardRule')}</span>
        </Button>
      </div>

      {/* Rules Table */}
      <Card className="border-stone-200/60 shadow-sm dark:border-stone-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-stone-50/50 dark:bg-stone-900/30">
              <TableRow>
                <TableHead className="font-bold text-stone-700 dark:text-stone-300">Nama Reward</TableHead>
                <TableHead className="font-bold text-stone-700 dark:text-stone-300">Deskripsi</TableHead>
                <TableHead className="font-bold text-stone-700 dark:text-stone-300">Target Stamp</TableHead>
                <TableHead className="font-bold text-stone-700 dark:text-stone-300">Status</TableHead>
                <TableHead className="w-20 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-xs text-stone-400 italic">
                    Belum ada aturan reward yang dibuat.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/20">
                    <TableCell className="font-semibold text-stone-950 dark:text-stone-100">
                      {rule.name}
                    </TableCell>
                    <TableCell className="text-stone-500 text-xs max-w-xs truncate">
                      {rule.description || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold">
                      {rule.target_stamps} Stamp
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={rule.is_active ? 'default' : 'secondary'}
                        className={rule.is_active ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'}
                      >
                        {rule.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => handleToggleActive(rule)}
                          disabled={isPending}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(rule)}
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

      {/* Upsert Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                <span>{editingRule ? 'Edit Aturan Reward' : 'Tambah Aturan Reward'}</span>
              </DialogTitle>
              <DialogDescription>
                Tentukan parameter untuk program loyalty cafe Anda. Target stamp akan memicu pencetusan reward ini ketika customer melakukan pemindaian.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Reward</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kopi Gratis / Diskon 20%"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetStamps">Target Stempel</Label>
                <Input
                  id="targetStamps"
                  type="number"
                  min={1}
                  value={targetStamps}
                  onChange={(e) => setTargetStamps(parseInt(e.target.value) || 0)}
                  placeholder="Jumlah stamp untuk memicu reward"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi (Opsional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Berlaku untuk semua jenis minuman..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="isActive">Status Aktif</Label>
                  <span className="text-[10px] text-stone-400">Pilih untuk menayangkan reward ke customer</span>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} id="isActive" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
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
