import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ThemeSelector } from '@/features/settings/components/ThemeSelector'

export const ThemeCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>テーマ</CardTitle>
        <CardDescription>アプリの表示モードを切り替えます</CardDescription>
      </CardHeader>
      <CardContent>
        <ThemeSelector />
      </CardContent>
    </Card>
  )
}
