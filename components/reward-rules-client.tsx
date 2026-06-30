'use client'

import { useRef, useState, useTransition } from 'react'
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
import { cn } from '@/lib/utils'

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
  const submittingRef = useRef(false)

  const [isOpen, setIsOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RewardRule | null>(null)

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
      toast.error(t('owner.ruleValidationError'))
      return
    }
    // Guard against rapid double-submits creating duplicate rules.
    if (submittingRef.current) return
    submittingRef.current = true

    startTransition(async () => {
      try {
        const result = await upsertRewardRuleAction(
          editingRule ? editingRule.id : null,
          name,
          targetStamps,
          description.trim() || null,
          isActive
        )

        if (!result.success) {
          toast.error(result.error || t('common.error'))
          return
        }

        toast.success(editingRule ? t('owner.ruleUpdated') : t('owner.ruleCreated'))
        setIsOpen(false)
        router.refresh()
      } finally {
        submittingRef.current = false
      }
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
        toast.error(result.error || t('common.error'))
        return
      }

      toast.success(rule.is_active ? t('owner.ruleDeactivated') : t('owner.ruleActivated'))
      router.refresh()
    })
  }

  return (
    <div className="animate-in space-y-6 duration-300 fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl tracking-tight text-foreground">{t('owner.rewardRules')}</h1>
          <p className="mt-1 text-muted-foreground">{t('owner.rewardRulesSubtitle')}</p>
        </div>

        <Button onClick={openAddDialog} className="h-11 gap-2 px-5 font-semibold">
          <Plus className="h-4 w-4" />
          <span>{t('owner.addRewardRule')}</span>
        </Button>
      </div>

      {/* Rules Table */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead className="font-bold text-foreground">{t('owner.rewardName')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('owner.description')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('owner.targetStamps')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('owner.status')}</TableHead>
                <TableHead className="w-20 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-xs italic text-muted-foreground">
                    {t('owner.noRules')}
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id} className="hover:bg-secondary/40">
                    <TableCell className="font-semibold text-foreground">{rule.name}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {rule.description || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-foreground">
                      {rule.target_stamps} {t('owner.stamps')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={rule.is_active ? 'default' : 'secondary'}
                        className={cn(
                          rule.is_active
                            ? 'bg-success/15 text-success'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {rule.is_active ? t('owner.active') : t('owner.inactive')}
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
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label={t('owner.editRewardRule')}
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
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-accent" />
                <span>{editingRule ? t('owner.editRewardRule') : t('owner.addRewardRule')}</span>
              </DialogTitle>
              <DialogDescription>{t('owner.ruleDialogDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('owner.rewardName')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('owner.rewardNamePlaceholder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetStamps">{t('owner.targetStampLabel')}</Label>
                <Input
                  id="targetStamps"
                  type="number"
                  min={1}
                  value={targetStamps}
                  onChange={(e) => setTargetStamps(parseInt(e.target.value) || 0)}
                  placeholder={t('owner.targetStampsPlaceholder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('owner.descriptionOptional')}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('owner.descriptionPlaceholder')}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="isActive">{t('owner.activeStatusLabel')}</Label>
                  <span className="text-[10px] text-muted-foreground">{t('owner.activeStatusHint')}</span>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} id="isActive" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
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
