'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Globe, LogOut, Mail, Check, Pencil, X } from 'lucide-react'
import { updateProfileName } from '@/lib/supabase/actions'

interface SettingsClientProps {
  fullName: string
  email: string
  initialLocale: string
  signOutAction: () => Promise<void>
}

export default function SettingsClient({
  fullName,
  email,
  initialLocale,
  signOutAction,
}: SettingsClientProps) {
  const t = useTranslations()
  const [currentLocale, setCurrentLocale] = useState(initialLocale)
  const [name, setName] = useState(fullName)
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(fullName)
  const [isPending, startTransition] = useTransition()

  const handleLanguageChange = (checked: boolean) => {
    const nextLocale = checked ? 'en' : 'id'
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`
    setCurrentLocale(nextLocale)
    window.location.reload()
  }

  const handleSaveName = () => {
    const trimmed = draftName.trim()
    if (!trimmed) {
      toast.error(t('customer.nameEmpty'))
      return
    }
    startTransition(async () => {
      const result = await updateProfileName(trimmed)
      if (!result.success) {
        toast.error(result.error || t('common.error'))
        return
      }
      setName(trimmed)
      setEditing(false)
      toast.success(t('customer.nameUpdated'))
    })
  }

  const getInitials = (value: string) =>
    value
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()

  return (
    <div className="flex animate-in flex-col gap-6 p-5 duration-300 fade-in">
      <div>
        <h1 className="text-2xl tracking-tight text-foreground">{t('customer.settings')}</h1>
        <p className="text-xs text-muted-foreground">{t('customer.settingsSubtitle')}</p>
      </div>

      {/* Profile Card */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm font-bold text-card-foreground">
            {t('customer.profile')}
            {!editing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraftName(name)
                  setEditing(true)
                }}
                className="h-7 gap-1.5 text-accent hover:text-accent"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('customer.editName')}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border border-border">
            <AvatarFallback className="bg-primary text-lg font-extrabold text-primary-foreground">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="h-9"
                  autoFocus
                  disabled={isPending}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleSaveName}
                  disabled={isPending}
                  aria-label={t('common.save')}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setEditing(false)}
                  disabled={isPending}
                  aria-label={t('common.cancel')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <span className="block truncate text-sm font-bold text-foreground">{name}</span>
            )}
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate text-xs text-muted-foreground">{email}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Preferences */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-card-foreground">
            <Globe className="h-4 w-4 text-accent" />
            {t('common.language')}
          </CardTitle>
          <CardDescription>{t('customer.languageDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              {currentLocale === 'en' ? t('common.english') : t('common.indonesian')}
            </span>
            <Switch checked={currentLocale === 'en'} onCheckedChange={handleLanguageChange} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Button
        onClick={() => signOutAction()}
        variant="outline"
        className="h-11 w-full justify-center gap-2 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4 w-4" />
        <span>{t('auth.logout')}</span>
      </Button>
    </div>
  )
}
